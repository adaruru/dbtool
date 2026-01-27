package storage

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"adaru-db-tool/internal/types"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite"
)

// Storage provides SQLite storage for migration data
type Storage struct {
	db *sqlx.DB
}

// New creates a new Storage instance
func New() (*Storage, error) {
	// Get user data directory
	dataDir, err := getDataDir()
	if err != nil {
		return nil, fmt.Errorf("failed to get data directory: %w", err)
	}

	// Ensure directory exists
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create data directory: %w", err)
	}

	// 根據環境設定不同的資料庫檔名
	// 正式環境: adaru-db-tool.db
	// 測試環境: adaru-db-tool-dev.db
	dbFilename := "adaru-db-tool.db"
	if os.Getenv("DEBUG") == "1" || os.Getenv("ENVIRONMENT") == "development" {
		dbFilename = "adaru-db-tool-dev.db"
	}

	dbPath := filepath.Join(dataDir, dbFilename)
	db, err := sqlx.Open("sqlite", dbPath+"?_foreign_keys=on")
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	s := &Storage{db: db}
	if err := s.migrate(); err != nil {
		return nil, fmt.Errorf("failed to run migrations: %w", err)
	}

	return s, nil
}

// getDataDir returns the application data directory
func getDataDir() (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}

	// 直接使用 .adaru-db-tool 目錄
	baseDir := filepath.Join(homeDir, ".adaru-db-tool")
	return baseDir, nil
}

// migrate runs database migrations
func (s *Storage) migrate() error {
	migrations := []string{
		`CREATE TABLE IF NOT EXISTS connections (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			type TEXT NOT NULL CHECK (type IN ('mssql', 'postgres')),
			connection_string TEXT NOT NULL,
			database_name TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			last_used_at DATETIME,
			deleted_at DATETIME
		)`,
		`CREATE TABLE IF NOT EXISTS migrations (
			id TEXT PRIMARY KEY,
			name TEXT,
			source_connection_id TEXT,
			target_connection_id TEXT,
			source_database TEXT NOT NULL,
			target_database TEXT NOT NULL,
			status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed', 'cancelled')),
			config_json TEXT,
			total_tables INTEGER DEFAULT 0,
			completed_tables INTEGER DEFAULT 0,
			total_rows INTEGER DEFAULT 0,
			migrated_rows INTEGER DEFAULT 0,
			started_at DATETIME,
			completed_at DATETIME,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (source_connection_id) REFERENCES connections(id),
			FOREIGN KEY (target_connection_id) REFERENCES connections(id)
		)`,
		`CREATE TABLE IF NOT EXISTS migration_tables (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			migration_id TEXT NOT NULL,
			table_name TEXT NOT NULL,
			schema_name TEXT,
			status TEXT NOT NULL,
			total_rows INTEGER DEFAULT 0,
			migrated_rows INTEGER DEFAULT 0,
			last_checkpoint TEXT,
			started_at DATETIME,
			completed_at DATETIME,
			error_message TEXT,
			FOREIGN KEY (migration_id) REFERENCES migrations(id)
		)`,
		`CREATE TABLE IF NOT EXISTS migration_logs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			migration_id TEXT NOT NULL,
			level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
			message TEXT NOT NULL,
			table_name TEXT,
			details_json TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (migration_id) REFERENCES migrations(id)
		)`,
		`CREATE TABLE IF NOT EXISTS validations (
			id TEXT PRIMARY KEY,
			migration_id TEXT NOT NULL,
			status TEXT NOT NULL,
			config_json TEXT,
			results_json TEXT,
			started_at DATETIME,
			completed_at DATETIME,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (migration_id) REFERENCES migrations(id)
		)`,
		`CREATE INDEX IF NOT EXISTS idx_migrations_status ON migrations(status)`,
		`CREATE INDEX IF NOT EXISTS idx_migration_tables_migration_id ON migration_tables(migration_id)`,
		`CREATE INDEX IF NOT EXISTS idx_migration_logs_migration_id ON migration_logs(migration_id)`,
		`CREATE INDEX IF NOT EXISTS idx_migration_logs_level ON migration_logs(level)`,
		`CREATE INDEX IF NOT EXISTS idx_connections_type ON connections(type)`,
		`CREATE INDEX IF NOT EXISTS idx_connections_deleted ON connections(deleted_at)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_connections_unique ON connections(type, connection_string, database_name) WHERE deleted_at IS NULL`,
	}

	for _, migration := range migrations {
		if _, err := s.db.Exec(migration); err != nil {
			return fmt.Errorf("migration failed: %w", err)
		}
	}

	return nil
}

// Close closes the database connection
func (s *Storage) Close() error {
	return s.db.Close()
}

// Connection methods

// SaveConnection saves a connection configuration
func (s *Storage) SaveConnection(conn *types.ConnectionConfig) error {
	// Check if connection already exists based on type, connection_string, and database
	var existingConn types.ConnectionConfig
	err := s.db.Get(&existingConn, `
		SELECT * FROM connections 
		WHERE type = ? AND connection_string = ? AND database_name = ? AND deleted_at IS NULL
	`, conn.Type, conn.ConnectionString, conn.Database)

	if err == nil {
		// Connection exists, update it
		conn.ID = existingConn.ID
		conn.CreatedAt = existingConn.CreatedAt
		_, err := s.db.NamedExec(`
			UPDATE connections 
			SET name = :name,
				last_used_at = :last_used_at
			WHERE id = :id
		`, conn)
		return err
	} else if err != sql.ErrNoRows {
		// Database error
		return err
	}

	// Connection doesn't exist, insert new one
	if conn.ID == "" {
		conn.ID = uuid.New().String()
	}
	conn.CreatedAt = time.Now()

	_, err = s.db.NamedExec(`
		INSERT INTO connections (id, name, type, connection_string, database_name, created_at, last_used_at)
		VALUES (:id, :name, :type, :connection_string, :database_name, :created_at, :last_used_at)
	`, conn)
	return err
}

// GetConnection retrieves an active (non-deleted) connection by ID
func (s *Storage) GetConnection(id string) (*types.ConnectionConfig, error) {
	var conn types.ConnectionConfig
	err := s.db.Get(&conn, "SELECT * FROM connections WHERE id = ? AND deleted_at IS NULL", id)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &conn, err
}

// GetConnectionsByType retrieves all active (non-deleted) connections of a specific type
func (s *Storage) GetConnectionsByType(connType types.ConnectionType) ([]types.ConnectionConfig, error) {
	var conns []types.ConnectionConfig
	err := s.db.Select(&conns, "SELECT * FROM connections WHERE type = ? AND deleted_at IS NULL ORDER BY last_used_at DESC", connType)
	if err != nil {
		return []types.ConnectionConfig{}, err
	}
	if conns == nil {
		return []types.ConnectionConfig{}, nil
	}
	return conns, nil
}

// GetAllConnections retrieves all active (non-deleted) connections
func (s *Storage) GetAllConnections() ([]types.ConnectionConfig, error) {
	var conns []types.ConnectionConfig
	err := s.db.Select(&conns, "SELECT * FROM connections WHERE deleted_at IS NULL ORDER BY last_used_at DESC")
	if err != nil {
		return []types.ConnectionConfig{}, err
	}
	if conns == nil {
		return []types.ConnectionConfig{}, nil
	}
	return conns, nil
}

// UpdateConnectionLastUsed updates the last_used_at timestamp
func (s *Storage) UpdateConnectionLastUsed(id string) error {
	_, err := s.db.Exec("UPDATE connections SET last_used_at = ? WHERE id = ?", time.Now(), id)
	return err
}

// DeleteConnection soft-deletes a connection by ID
func (s *Storage) DeleteConnection(id string) error {
	_, err := s.db.Exec("UPDATE connections SET deleted_at = ? WHERE id = ?", time.Now(), id)
	return err
}

// Migration methods

// CreateMigration creates a new migration record
func (s *Storage) CreateMigration(record *types.MigrationRecord) error {
	if record.ID == "" {
		record.ID = uuid.New().String()
	}
	record.Status = types.MigrationStatusPending
	record.CreatedAt = time.Now()

	_, err := s.db.NamedExec(`
		INSERT INTO migrations (id, name, source_connection_id, target_connection_id, source_database, target_database, status, config_json, created_at)
		VALUES (:id, :name, :source_connection_id, :target_connection_id, :source_database, :target_database, :status, :config_json, :created_at)
	`, record)
	return err
}

// GetMigration retrieves a migration by ID
func (s *Storage) GetMigration(id string) (*types.MigrationRecord, error) {
	var record types.MigrationRecord
	err := s.db.Get(&record, "SELECT * FROM migrations WHERE id = ?", id)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &record, err
}

// GetMigrationHistory retrieves migration history
func (s *Storage) GetMigrationHistory(limit int) ([]types.MigrationRecord, error) {
	var records []types.MigrationRecord
	err := s.db.Select(&records, "SELECT * FROM migrations ORDER BY created_at DESC LIMIT ?", limit)
	return records, err
}

// UpdateMigrationStatus updates the status of a migration
func (s *Storage) UpdateMigrationStatus(id string, status types.MigrationStatus) error {
	now := time.Now()
	query := "UPDATE migrations SET status = ?"
	args := []interface{}{status}

	if status == types.MigrationStatusRunning {
		query += ", started_at = ?"
		args = append(args, now)
	} else if status == types.MigrationStatusCompleted || status == types.MigrationStatusFailed || status == types.MigrationStatusCancelled {
		query += ", completed_at = ?"
		args = append(args, now)
	}

	query += " WHERE id = ?"
	args = append(args, id)

	_, err := s.db.Exec(query, args...)
	return err
}

// UpdateMigrationProgress updates migration progress
func (s *Storage) UpdateMigrationProgress(id string, totalTables, completedTables int, totalRows, migratedRows int64) error {
	_, err := s.db.Exec(`
		UPDATE migrations
		SET total_tables = ?, completed_tables = ?, total_rows = ?, migrated_rows = ?
		WHERE id = ?
	`, totalTables, completedTables, totalRows, migratedRows, id)
	return err
}

// Table migration methods

// CreateTableMigration creates a table migration record
func (s *Storage) CreateTableMigration(state *types.TableMigrationState) error {
	state.Status = types.MigrationStatusPending
	result, err := s.db.NamedExec(`
		INSERT INTO migration_tables (migration_id, table_name, schema_name, status, total_rows)
		VALUES (:migration_id, :table_name, :schema_name, :status, :total_rows)
	`, state)
	if err != nil {
		return err
	}
	id, _ := result.LastInsertId()
	state.ID = id
	return nil
}

// UpdateTableMigrationProgress updates table migration progress
func (s *Storage) UpdateTableMigrationProgress(id int64, migratedRows int64, checkpoint string) error {
	_, err := s.db.Exec(`
		UPDATE migration_tables
		SET migrated_rows = ?, last_checkpoint = ?
		WHERE id = ?
	`, migratedRows, checkpoint, id)
	return err
}

// UpdateTableMigrationStatus updates table migration status
func (s *Storage) UpdateTableMigrationStatus(id int64, status types.MigrationStatus, errorMsg string) error {
	now := time.Now()
	query := "UPDATE migration_tables SET status = ?"
	args := []interface{}{status}

	if status == types.MigrationStatusRunning {
		query += ", started_at = ?"
		args = append(args, now)
	} else if status == types.MigrationStatusCompleted || status == types.MigrationStatusFailed {
		query += ", completed_at = ?"
		args = append(args, now)
	}

	if errorMsg != "" {
		query += ", error_message = ?"
		args = append(args, errorMsg)
	}

	query += " WHERE id = ?"
	args = append(args, id)

	_, err := s.db.Exec(query, args...)
	return err
}

// GetTableMigrations retrieves table migrations for a migration
func (s *Storage) GetTableMigrations(migrationID string) ([]types.TableMigrationState, error) {
	var states []types.TableMigrationState
	err := s.db.Select(&states, "SELECT * FROM migration_tables WHERE migration_id = ?", migrationID)
	return states, err
}

// Log methods

// AddLog adds a log entry
func (s *Storage) AddLog(entry *types.LogEntry) error {
	entry.CreatedAt = time.Now()
	_, err := s.db.NamedExec(`
		INSERT INTO migration_logs (migration_id, level, message, table_name, details_json, created_at)
		VALUES (:migration_id, :level, :message, :table_name, :details_json, :created_at)
	`, entry)
	return err
}

// GetLogs retrieves logs for a migration
func (s *Storage) GetLogs(migrationID string, limit int) ([]types.LogEntry, error) {
	var logs []types.LogEntry
	err := s.db.Select(&logs, `
		SELECT * FROM migration_logs
		WHERE migration_id = ?
		ORDER BY created_at DESC
		LIMIT ?
	`, migrationID, limit)
	return logs, err
}

// GetLogsByLevel retrieves logs filtered by level
func (s *Storage) GetLogsByLevel(migrationID string, level types.LogLevel, limit int) ([]types.LogEntry, error) {
	var logs []types.LogEntry
	err := s.db.Select(&logs, `
		SELECT * FROM migration_logs
		WHERE migration_id = ? AND level = ?
		ORDER BY created_at DESC
		LIMIT ?
	`, migrationID, level, limit)
	return logs, err
}

// Validation methods

// CreateValidation creates a validation record
func (s *Storage) CreateValidation(report *types.ValidationReport) error {
	if report.ID == "" {
		report.ID = uuid.New().String()
	}
	report.StartedAt = time.Now()

	configJSON, err := json.Marshal(report.Config)
	if err != nil {
		return err
	}

	_, err = s.db.Exec(`
		INSERT INTO validations (id, migration_id, status, config_json, started_at)
		VALUES (?, ?, ?, ?, ?)
	`, report.ID, report.MigrationID, report.Status, string(configJSON), report.StartedAt)
	return err
}

// UpdateValidation updates a validation record
func (s *Storage) UpdateValidation(report *types.ValidationReport) error {
	resultsJSON, err := json.Marshal(report.Results)
	if err != nil {
		return err
	}

	_, err = s.db.Exec(`
		UPDATE validations
		SET status = ?, results_json = ?, completed_at = ?
		WHERE id = ?
	`, report.Status, string(resultsJSON), report.CompletedAt, report.ID)
	return err
}

// GetValidation retrieves a validation by ID
func (s *Storage) GetValidation(id string) (*types.ValidationReport, error) {
	var report types.ValidationReport
	var resultsJSON sql.NullString

	err := s.db.QueryRow(`
		SELECT id, migration_id, status, config_json, results_json, started_at, completed_at
		FROM validations WHERE id = ?
	`, id).Scan(&report.ID, &report.MigrationID, &report.Status, &report.Config, &resultsJSON, &report.StartedAt, &report.CompletedAt)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	if resultsJSON.Valid {
		if err := json.Unmarshal([]byte(resultsJSON.String), &report.Results); err != nil {
			return nil, err
		}
	}

	return &report, nil
}
