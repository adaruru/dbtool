package main

import (
	"context"
	"fmt"

	"adaru-db-tool/internal/connection"
	"adaru-db-tool/internal/migration"
	"adaru-db-tool/internal/storage"
	"adaru-db-tool/internal/types"
	"adaru-db-tool/internal/validation"
)

// App struct holds the application state
type App struct {
	ctx             context.Context
	storage         *storage.Storage
	migrationEngine *migration.Engine
	validator       *validation.Validator
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// Initialize storage
	store, err := storage.New()
	if err != nil {
		fmt.Printf("Warning: Failed to initialize storage: %v\n", err)
	}
	a.storage = store
}

// shutdown is called when the app is closing
func (a *App) shutdown(ctx context.Context) {
	if a.storage != nil {
		a.storage.Close()
	}
}

// ========== Connection Methods ==========

// TestMSSQLConnection tests a MSSQL connection
func (a *App) TestMSSQLConnection(connString string) *types.ConnectionTestResult {
	conn := connection.NewMSSQLConnection(connString)
	result, err := conn.Test(a.ctx)
	if err != nil {
		return &types.ConnectionTestResult{
			Success: false,
			Message: fmt.Sprintf("Connection test failed: %v", err),
		}
	}
	return result
}

// TestPostgresConnection tests a PostgreSQL connection
func (a *App) TestPostgresConnection(connString string) *types.ConnectionTestResult {
	conn := connection.NewPostgresConnection(connString)
	result, err := conn.Test(a.ctx)
	if err != nil {
		return &types.ConnectionTestResult{
			Success: false,
			Message: fmt.Sprintf("Connection test failed: %v", err),
		}
	}
	return result
}

// SaveConnection saves a connection configuration
func (a *App) SaveConnection(config *types.ConnectionConfig) error {
	return a.storage.SaveConnection(config)
}

// GetConnectionHistory retrieves saved connections
func (a *App) GetConnectionHistory() ([]types.ConnectionConfig, error) {
	return a.storage.GetAllConnections()
}

// GetMSSQLConnections retrieves saved MSSQL connections
func (a *App) GetMSSQLConnections() ([]types.ConnectionConfig, error) {
	return a.storage.GetConnectionsByType(types.ConnectionTypeMSSQL)
}

// GetPostgresConnections retrieves saved PostgreSQL connections
func (a *App) GetPostgresConnections() ([]types.ConnectionConfig, error) {
	return a.storage.GetConnectionsByType(types.ConnectionTypePostgres)
}

// DeleteConnection deletes a saved connection
func (a *App) DeleteConnection(id string) error {
	return a.storage.DeleteConnection(id)
}

// ========== Schema Methods ==========

// GetTables retrieves tables from the source database
func (a *App) GetTables(connString, database string) ([]types.TableInfo, error) {
	conn := connection.NewMSSQLConnection(connString)
	if err := conn.Connect(a.ctx); err != nil {
		return nil, err
	}
	defer conn.Close()

	if err := conn.SetDatabase(database); err != nil {
		return nil, err
	}

	return conn.GetTables(a.ctx)
}

// GetTableDetails retrieves detailed information about a table
func (a *App) GetTableDetails(connString, database, schema, tableName string) (*types.TableInfo, error) {
	conn := connection.NewMSSQLConnection(connString)
	if err := conn.Connect(a.ctx); err != nil {
		return nil, err
	}
	defer conn.Close()

	if err := conn.SetDatabase(database); err != nil {
		return nil, err
	}

	return conn.GetTableDetails(a.ctx, schema, tableName)
}

// GetViews retrieves views from the source database
func (a *App) GetViews(connString, database string) ([]types.ViewInfo, error) {
	conn := connection.NewMSSQLConnection(connString)
	if err := conn.Connect(a.ctx); err != nil {
		return nil, err
	}
	defer conn.Close()

	if err := conn.SetDatabase(database); err != nil {
		return nil, err
	}

	return conn.GetViews(a.ctx)
}

// GetStoredProcedures retrieves stored procedures from the source database
func (a *App) GetStoredProcedures(connString, database string) ([]types.StoredProcedureInfo, error) {
	conn := connection.NewMSSQLConnection(connString)
	if err := conn.Connect(a.ctx); err != nil {
		return nil, err
	}
	defer conn.Close()

	if err := conn.SetDatabase(database); err != nil {
		return nil, err
	}

	return conn.GetStoredProcedures(a.ctx)
}

// GetFunctions retrieves functions from the source database
func (a *App) GetFunctions(connString, database string) ([]types.FunctionInfo, error) {
	conn := connection.NewMSSQLConnection(connString)
	if err := conn.Connect(a.ctx); err != nil {
		return nil, err
	}
	defer conn.Close()

	if err := conn.SetDatabase(database); err != nil {
		return nil, err
	}

	return conn.GetFunctions(a.ctx)
}

// ========== Migration Methods ==========

// StartMigration starts a new migration
func (a *App) StartMigration(config *types.MigrationConfig, name string) (string, error) {
	// Create migration engine
	a.migrationEngine = migration.NewEngine(a.ctx, a.storage)

	// Configure
	if err := a.migrationEngine.Configure(config); err != nil {
		return "", err
	}

	// Create migration record
	migrationID, err := a.migrationEngine.CreateMigrationRecord(name)
	if err != nil {
		return "", err
	}

	// Start migration
	if err := a.migrationEngine.Start(migrationID); err != nil {
		return "", err
	}

	return migrationID, nil
}

// PauseMigration pauses the current migration
func (a *App) PauseMigration() error {
	if a.migrationEngine == nil {
		return fmt.Errorf("no active migration")
	}
	a.migrationEngine.Pause()
	return nil
}

// ResumeMigration resumes the current migration
func (a *App) ResumeMigration() error {
	if a.migrationEngine == nil {
		return fmt.Errorf("no active migration")
	}
	a.migrationEngine.Resume()
	return nil
}

// CancelMigration cancels the current migration
func (a *App) CancelMigration() error {
	if a.migrationEngine == nil {
		return fmt.Errorf("no active migration")
	}
	a.migrationEngine.Cancel()
	return nil
}

// GetMigrationStatus returns the current migration status
func (a *App) GetMigrationStatus() *migration.MigrationState {
	if a.migrationEngine == nil {
		return nil
	}
	return a.migrationEngine.GetStatus()
}

// GetMigrationHistory retrieves migration history
func (a *App) GetMigrationHistory(limit int) ([]types.MigrationRecord, error) {
	if limit <= 0 {
		limit = 50
	}
	return a.storage.GetMigrationHistory(limit)
}

// GetMigrationLogs retrieves logs for a migration
func (a *App) GetMigrationLogs(migrationID string, limit int) ([]types.LogEntry, error) {
	if limit <= 0 {
		limit = 100
	}
	return a.storage.GetLogs(migrationID, limit)
}

// ========== Validation Methods ==========

// StartValidation starts data validation
func (a *App) StartValidation(sourceConnString, targetConnString string, config *types.ValidationConfig) ([]types.ValidationResult, error) {
	a.validator = validation.NewValidator(a.ctx, a.storage)

	if err := a.validator.Configure(sourceConnString, targetConnString, config); err != nil {
		return nil, err
	}
	defer a.validator.Close()

	return a.validator.Validate(a.ctx)
}

// ========== Utility Methods ==========

// GetAppVersion returns the application version
func (a *App) GetAppVersion() string {
	return "1.0.0"
}
