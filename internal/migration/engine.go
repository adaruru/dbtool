package migration

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"adaru-db-tool/internal/connection"
	"adaru-db-tool/internal/schema/converter"
	"adaru-db-tool/internal/storage"
	"adaru-db-tool/internal/types"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// Engine orchestrates the database migration process
type Engine struct {
	ctx         context.Context
	sourceConn  *connection.MSSQLConnection
	targetConn  *connection.PostgresConnection
	storage     *storage.Storage
	typeMapper  *converter.TypeMapper
	config      *types.MigrationConfig
	migrationID string
	state       *MigrationState
	mu          sync.RWMutex
	cancelFunc  context.CancelFunc
	paused      bool
	pauseCh     chan struct{}
	resumeCh    chan struct{}
}

// MigrationState tracks the current state of a migration
type MigrationState struct {
	Status          types.MigrationStatus
	StartTime       time.Time
	TotalTables     int
	CompletedTables int
	TotalRows       int64
	MigratedRows    int64
	CurrentTable    string
	Tables          map[string]*TableState
	Errors          []string
}

// TableState tracks the state of a single table migration
type TableState struct {
	Name         string
	Schema       string
	Status       types.MigrationStatus
	TotalRows    int64
	MigratedRows int64
	StartTime    time.Time
	EndTime      time.Time
	Error        string
}

// NewEngine creates a new migration engine
func NewEngine(ctx context.Context, storage *storage.Storage) *Engine {
	return &Engine{
		ctx:        ctx,
		storage:    storage,
		typeMapper: converter.NewTypeMapper(),
		pauseCh:    make(chan struct{}),
		resumeCh:   make(chan struct{}),
	}
}

// Configure sets up the migration configuration
func (e *Engine) Configure(config *types.MigrationConfig) error {
	if config.BatchSize <= 0 {
		config.BatchSize = 10000
	}
	if config.ParallelTables <= 0 {
		config.ParallelTables = 1
	}
	e.config = config
	return nil
}

// Start begins the migration process
func (e *Engine) Start(migrationID string) error {
	e.migrationID = migrationID
	ctx, cancel := context.WithCancel(e.ctx)
	e.cancelFunc = cancel

	// Initialize state
	e.state = &MigrationState{
		Status:    types.MigrationStatusRunning,
		StartTime: time.Now(),
		Tables:    make(map[string]*TableState),
	}

	// Update migration status
	if err := e.storage.UpdateMigrationStatus(migrationID, types.MigrationStatusRunning); err != nil {
		return fmt.Errorf("failed to update migration status: %w", err)
	}

	// Connect to source
	e.sourceConn = connection.NewMSSQLConnection(e.config.SourceConnectionString)
	if err := e.sourceConn.Connect(ctx); err != nil {
		e.fail("Failed to connect to source: " + err.Error())
		return err
	}

	// Set source database
	if err := e.sourceConn.SetDatabase(e.config.SourceDatabase); err != nil {
		e.fail("Failed to set source database: " + err.Error())
		return err
	}

	// Connect to target
	e.targetConn = connection.NewPostgresConnection(e.config.TargetConnectionString)
	if err := e.targetConn.Connect(ctx); err != nil {
		e.fail("Failed to connect to target: " + err.Error())
		return err
	}

	// Run migration in goroutine
	go e.runMigration(ctx)

	return nil
}

// runMigration executes the migration workflow
func (e *Engine) runMigration(ctx context.Context) {
	defer e.cleanup()

	// Get tables to migrate
	tables, err := e.getTablestoMigrate(ctx)
	if err != nil {
		e.fail("Failed to get tables: " + err.Error())
		return
	}

	e.mu.Lock()
	e.state.TotalTables = len(tables)
	e.mu.Unlock()

	e.log(types.LogLevelInfo, fmt.Sprintf("Starting migration of %d tables", len(tables)))

	// Phase 1: Schema migration
	if e.config.IncludeSchema {
		e.log(types.LogLevelInfo, "Phase 1: Migrating schema...")
		if err := e.migrateSchema(ctx, tables); err != nil {
			e.fail("Schema migration failed: " + err.Error())
			return
		}
	}

	// Phase 2: Data migration
	if e.config.IncludeData {
		e.log(types.LogLevelInfo, "Phase 2: Migrating data...")
		if err := e.migrateData(ctx, tables); err != nil {
			e.fail("Data migration failed: " + err.Error())
			return
		}
	}

	// Phase 3: Foreign keys and constraints
	if e.config.IncludeSchema {
		e.log(types.LogLevelInfo, "Phase 3: Creating foreign keys...")
		if err := e.createForeignKeys(ctx, tables); err != nil {
			e.log(types.LogLevelWarn, "Some foreign keys failed: "+err.Error())
		}
	}

	// Phase 4: Views, procedures, functions (if requested)
	if e.config.IncludeViews || e.config.IncludeProcedures || e.config.IncludeFunctions {
		e.log(types.LogLevelInfo, "Phase 4: Migrating programmable objects...")
		e.migrateProgrammableObjects(ctx)
	}

	// Mark as completed
	e.mu.Lock()
	e.state.Status = types.MigrationStatusCompleted
	e.mu.Unlock()

	e.storage.UpdateMigrationStatus(e.migrationID, types.MigrationStatusCompleted)
	e.emitEvent("migration:complete", map[string]interface{}{
		"migrationId": e.migrationID,
	})
	e.log(types.LogLevelInfo, "Migration completed successfully")
}

// getTablestoMigrate returns the list of tables to migrate
func (e *Engine) getTablestoMigrate(ctx context.Context) ([]types.TableInfo, error) {
	allTables, err := e.sourceConn.GetTables(ctx)
	if err != nil {
		return nil, err
	}

	// Filter tables based on config
	var tables []types.TableInfo
	for _, table := range allTables {
		fullName := table.Schema + "." + table.Name

		// Check exclude list
		excluded := false
		for _, excl := range e.config.ExcludeTables {
			if excl == fullName || excl == table.Name {
				excluded = true
				break
			}
		}
		if excluded {
			continue
		}

		// Check include list (if specified)
		if len(e.config.IncludeTables) > 0 {
			included := false
			for _, incl := range e.config.IncludeTables {
				if incl == fullName || incl == table.Name {
					included = true
					break
				}
			}
			if !included {
				continue
			}
		}

		tables = append(tables, table)
	}

	return tables, nil
}

// migrateSchema creates tables in the target database
func (e *Engine) migrateSchema(ctx context.Context, tables []types.TableInfo) error {
	for _, table := range tables {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		e.checkPaused()

		// Get detailed table info
		tableDetails, err := e.sourceConn.GetTableDetails(ctx, table.Schema, table.Name)
		if err != nil {
			e.log(types.LogLevelError, fmt.Sprintf("Failed to get details for %s.%s: %v", table.Schema, table.Name, err))
			continue
		}

		// Create schema if needed
		if err := e.targetConn.CreateSchema(ctx, table.Schema); err != nil {
			e.log(types.LogLevelWarn, fmt.Sprintf("Failed to create schema %s: %v", table.Schema, err))
		}

		// Drop table if requested
		if e.config.DropTargetIfExists {
			if err := e.targetConn.DropTableIfExists(ctx, table.Schema, table.Name); err != nil {
				e.log(types.LogLevelWarn, fmt.Sprintf("Failed to drop table %s.%s: %v", table.Schema, table.Name, err))
			}
		}

		// Generate and execute CREATE TABLE
		createDDL := e.typeMapper.GenerateCreateTableDDL(*tableDetails)
		if err := e.targetConn.ExecuteDDL(ctx, createDDL); err != nil {
			e.log(types.LogLevelError, fmt.Sprintf("Failed to create table %s.%s: %v", table.Schema, table.Name, err))
			continue
		}

		// Create indexes
		for _, idx := range tableDetails.Indexes {
			indexDDL := e.typeMapper.GenerateIndexDDL(*tableDetails, idx)
			if err := e.targetConn.ExecuteDDL(ctx, indexDDL); err != nil {
				e.log(types.LogLevelWarn, fmt.Sprintf("Failed to create index %s: %v", idx.Name, err))
			}
		}

		e.log(types.LogLevelInfo, fmt.Sprintf("Created table %s.%s", table.Schema, table.Name))

		// Log type mapper warnings
		for _, warn := range e.typeMapper.GetWarnings() {
			e.log(types.LogLevelWarn, warn)
		}
		e.typeMapper.ClearWarnings()
	}

	return nil
}

// migrateData migrates data for all tables
func (e *Engine) migrateData(ctx context.Context, tables []types.TableInfo) error {
	// Calculate total rows
	var totalRows int64
	for _, table := range tables {
		totalRows += table.RowCount
	}

	e.mu.Lock()
	e.state.TotalRows = totalRows
	e.mu.Unlock()

	// Migrate tables (could be parallelized with e.config.ParallelTables)
	for _, table := range tables {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		e.checkPaused()

		if err := e.migrateTableData(ctx, table); err != nil {
			e.log(types.LogLevelError, fmt.Sprintf("Failed to migrate data for %s.%s: %v", table.Schema, table.Name, err))
			// Continue with other tables
		}

		e.mu.Lock()
		e.state.CompletedTables++
		e.mu.Unlock()

		e.updateProgress()
	}

	return nil
}

// migrateTableData migrates data for a single table
func (e *Engine) migrateTableData(ctx context.Context, table types.TableInfo) error {
	tableName := fmt.Sprintf("%s.%s", table.Schema, table.Name)
	e.log(types.LogLevelInfo, fmt.Sprintf("Migrating data for %s (%d rows)", tableName, table.RowCount))

	e.mu.Lock()
	e.state.CurrentTable = tableName
	e.state.Tables[tableName] = &TableState{
		Name:      table.Name,
		Schema:    table.Schema,
		Status:    types.MigrationStatusRunning,
		TotalRows: table.RowCount,
		StartTime: time.Now(),
	}
	e.mu.Unlock()

	// Get table details for column info
	tableDetails, err := e.sourceConn.GetTableDetails(ctx, table.Schema, table.Name)
	if err != nil {
		return err
	}

	// Prepare column list
	var columns []string
	var orderByCol string
	for _, col := range tableDetails.Columns {
		columns = append(columns, fmt.Sprintf("[%s]", col.Name))
		if col.IsPrimaryKey && orderByCol == "" {
			orderByCol = fmt.Sprintf("[%s]", col.Name)
		}
	}

	// Default order by first column if no primary key
	if orderByCol == "" && len(columns) > 0 {
		orderByCol = columns[0]
	}

	// Disable triggers for faster insert
	if err := e.targetConn.DisableTriggers(ctx, table.Schema, table.Name); err != nil {
		e.log(types.LogLevelWarn, fmt.Sprintf("Failed to disable triggers for %s: %v", tableName, err))
	}

	// Migrate in batches
	var migratedRows int64
	offset := 0

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		e.checkPaused()

		// Read batch from source
		rows, err := e.sourceConn.ReadBatch(ctx, table.Schema, table.Name, columns, orderByCol, offset, e.config.BatchSize)
		if err != nil {
			return fmt.Errorf("failed to read batch at offset %d: %w", offset, err)
		}

		if len(rows) == 0 {
			break
		}

		// Get column names without brackets for PostgreSQL
		pgColumns := make([]string, len(tableDetails.Columns))
		for i, col := range tableDetails.Columns {
			pgColumns[i] = col.Name
		}

		// Insert batch using COPY protocol
		_, err = e.targetConn.CopyFrom(ctx, table.Schema, table.Name, pgColumns, rows)
		if err != nil {
			return fmt.Errorf("failed to insert batch at offset %d: %w", offset, err)
		}

		migratedRows += int64(len(rows))
		offset += len(rows)

		// Update progress
		e.mu.Lock()
		e.state.MigratedRows += int64(len(rows))
		if ts, ok := e.state.Tables[tableName]; ok {
			ts.MigratedRows = migratedRows
		}
		e.mu.Unlock()

		e.emitProgress(tableName, table.RowCount, migratedRows)
	}

	// Re-enable triggers
	if err := e.targetConn.EnableTriggers(ctx, table.Schema, table.Name); err != nil {
		e.log(types.LogLevelWarn, fmt.Sprintf("Failed to enable triggers for %s: %v", tableName, err))
	}

	// Sync sequences for identity columns
	for _, col := range tableDetails.Columns {
		if col.IsIdentity {
			if err := e.targetConn.SyncSequence(ctx, table.Schema, table.Name, col.Name); err != nil {
				e.log(types.LogLevelWarn, fmt.Sprintf("Failed to sync sequence for %s.%s: %v", tableName, col.Name, err))
			}
		}
	}

	// Mark table as completed
	e.mu.Lock()
	if ts, ok := e.state.Tables[tableName]; ok {
		ts.Status = types.MigrationStatusCompleted
		ts.EndTime = time.Now()
	}
	e.mu.Unlock()

	e.emitEvent("migration:table-complete", map[string]interface{}{
		"migrationId":  e.migrationID,
		"table":        tableName,
		"rowsMigrated": migratedRows,
	})

	e.log(types.LogLevelInfo, fmt.Sprintf("Completed %s: %d rows migrated", tableName, migratedRows))
	return nil
}

// createForeignKeys creates foreign key constraints
func (e *Engine) createForeignKeys(ctx context.Context, tables []types.TableInfo) error {
	for _, table := range tables {
		tableDetails, err := e.sourceConn.GetTableDetails(ctx, table.Schema, table.Name)
		if err != nil {
			continue
		}

		for _, fk := range tableDetails.ForeignKeys {
			fkDDL := e.typeMapper.GenerateForeignKeyDDL(*tableDetails, fk)
			if err := e.targetConn.ExecuteDDL(ctx, fkDDL); err != nil {
				e.log(types.LogLevelWarn, fmt.Sprintf("Failed to create foreign key %s: %v", fk.Name, err))
			}
		}
	}
	return nil
}

// migrateProgrammableObjects migrates views, procedures, and functions
func (e *Engine) migrateProgrammableObjects(ctx context.Context) {
	if e.config.IncludeViews {
		views, err := e.sourceConn.GetViews(ctx)
		if err != nil {
			e.log(types.LogLevelWarn, "Failed to get views: "+err.Error())
		} else {
			for _, view := range views {
				e.log(types.LogLevelWarn, fmt.Sprintf("View %s.%s: Manual conversion required", view.Schema, view.Name))
			}
		}
	}

	if e.config.IncludeProcedures {
		procs, err := e.sourceConn.GetStoredProcedures(ctx)
		if err != nil {
			e.log(types.LogLevelWarn, "Failed to get stored procedures: "+err.Error())
		} else {
			for _, proc := range procs {
				e.log(types.LogLevelWarn, fmt.Sprintf("Stored procedure %s.%s: Manual conversion to PL/pgSQL required", proc.Schema, proc.Name))
			}
		}
	}

	if e.config.IncludeFunctions {
		funcs, err := e.sourceConn.GetFunctions(ctx)
		if err != nil {
			e.log(types.LogLevelWarn, "Failed to get functions: "+err.Error())
		} else {
			for _, fn := range funcs {
				e.log(types.LogLevelWarn, fmt.Sprintf("Function %s.%s: Manual conversion to PL/pgSQL required", fn.Schema, fn.Name))
			}
		}
	}
}

// Pause pauses the migration
func (e *Engine) Pause() {
	e.mu.Lock()
	e.paused = true
	e.state.Status = types.MigrationStatusPaused
	e.mu.Unlock()
	e.storage.UpdateMigrationStatus(e.migrationID, types.MigrationStatusPaused)
	e.log(types.LogLevelInfo, "Migration paused")
}

// Resume resumes the migration
func (e *Engine) Resume() {
	e.mu.Lock()
	e.paused = false
	e.state.Status = types.MigrationStatusRunning
	e.mu.Unlock()
	e.storage.UpdateMigrationStatus(e.migrationID, types.MigrationStatusRunning)
	close(e.resumeCh)
	e.resumeCh = make(chan struct{})
	e.log(types.LogLevelInfo, "Migration resumed")
}

// Cancel cancels the migration
func (e *Engine) Cancel() {
	if e.cancelFunc != nil {
		e.cancelFunc()
	}
	e.mu.Lock()
	e.state.Status = types.MigrationStatusCancelled
	e.mu.Unlock()
	e.storage.UpdateMigrationStatus(e.migrationID, types.MigrationStatusCancelled)
	e.log(types.LogLevelInfo, "Migration cancelled")
}

// GetStatus returns the current migration status
func (e *Engine) GetStatus() *MigrationState {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return e.state
}

// checkPaused blocks if migration is paused
func (e *Engine) checkPaused() {
	e.mu.RLock()
	paused := e.paused
	e.mu.RUnlock()

	if paused {
		<-e.resumeCh
	}
}

// fail marks the migration as failed
func (e *Engine) fail(message string) {
	e.mu.Lock()
	e.state.Status = types.MigrationStatusFailed
	e.state.Errors = append(e.state.Errors, message)
	e.mu.Unlock()

	e.storage.UpdateMigrationStatus(e.migrationID, types.MigrationStatusFailed)
	e.log(types.LogLevelError, message)
	e.emitEvent("migration:error", map[string]interface{}{
		"migrationId": e.migrationID,
		"error":       message,
	})
}

// cleanup releases resources
func (e *Engine) cleanup() {
	if e.sourceConn != nil {
		e.sourceConn.Close()
	}
	if e.targetConn != nil {
		e.targetConn.Close()
	}
}

// log writes a log entry
func (e *Engine) log(level types.LogLevel, message string) {
	entry := &types.LogEntry{
		MigrationID: e.migrationID,
		Level:       level,
		Message:     message,
	}
	e.storage.AddLog(entry)

	e.emitEvent("migration:log", map[string]interface{}{
		"migrationId": e.migrationID,
		"level":       string(level),
		"message":     message,
		"timestamp":   time.Now().Format(time.RFC3339),
	})
}

// emitEvent emits an event to the frontend
func (e *Engine) emitEvent(eventName string, data interface{}) {
	runtime.EventsEmit(e.ctx, eventName, data)
}

// emitProgress emits a progress update
func (e *Engine) emitProgress(tableName string, totalRows, processedRows int64) {
	percentage := float64(0)
	if totalRows > 0 {
		percentage = float64(processedRows) / float64(totalRows) * 100
	}

	e.emitEvent("migration:progress", map[string]interface{}{
		"migrationId":   e.migrationID,
		"table":         tableName,
		"totalRows":     totalRows,
		"processedRows": processedRows,
		"percentage":    percentage,
	})
}

// updateProgress updates overall migration progress
func (e *Engine) updateProgress() {
	e.mu.RLock()
	totalTables := e.state.TotalTables
	completedTables := e.state.CompletedTables
	totalRows := e.state.TotalRows
	migratedRows := e.state.MigratedRows
	e.mu.RUnlock()

	if err := e.storage.UpdateMigrationProgress(e.migrationID, totalTables, completedTables, totalRows, migratedRows); err != nil {
		e.log(types.LogLevelWarn, "Failed to update progress: "+err.Error())
	}
}

// CreateMigrationRecord creates a new migration record
func (e *Engine) CreateMigrationRecord(name string) (string, error) {
	configJSON, err := json.Marshal(e.config)
	if err != nil {
		return "", err
	}

	record := &types.MigrationRecord{
		Name:           name,
		SourceDatabase: e.config.SourceDatabase,
		TargetDatabase: e.config.TargetDatabase,
		Config:         string(configJSON),
	}

	if err := e.storage.CreateMigration(record); err != nil {
		return "", err
	}

	return record.ID, nil
}
