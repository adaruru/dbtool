package types

import "time"

// ConnectionType represents the type of database connection
type ConnectionType string

const (
	ConnectionTypeMSSQL    ConnectionType = "mssql"
	ConnectionTypePostgres ConnectionType = "postgres"
)

// ConnectionConfig holds database connection configuration
type ConnectionConfig struct {
	ID               string         `json:"id" db:"id"`
	Name             string         `json:"name" db:"name"`
	Type             ConnectionType `json:"type" db:"type"`
	ConnectionString string         `json:"connectionString" db:"connection_string"`
	Database         string         `json:"database" db:"database_name"`
	CreatedAt        time.Time      `json:"createdAt" db:"created_at"`
	LastUsedAt       *time.Time     `json:"lastUsedAt,omitempty" db:"last_used_at"`
	DeletedAt        *time.Time     `json:"-" db:"deleted_at"`
}

// ConnectionTestResult represents the result of a connection test
type ConnectionTestResult struct {
	Success       bool     `json:"success"`
	Message       string   `json:"message"`
	ServerVersion string   `json:"serverVersion,omitempty"`
	Databases     []string `json:"databases,omitempty"`
}

// TableInfo represents metadata about a database table
type TableInfo struct {
	Schema      string       `json:"schema"`
	Name        string       `json:"name"`
	RowCount    int64        `json:"rowCount"`
	Columns     []ColumnInfo `json:"columns"`
	PrimaryKey  []string     `json:"primaryKey"`
	ForeignKeys []ForeignKey `json:"foreignKeys"`
	Indexes     []IndexInfo  `json:"indexes"`
}

// ColumnInfo represents metadata about a database column
type ColumnInfo struct {
	Name         string  `json:"name"`
	DataType     string  `json:"dataType"`
	MaxLength    int     `json:"maxLength"`
	Precision    int     `json:"precision"`
	Scale        int     `json:"scale"`
	IsNullable   bool    `json:"isNullable"`
	IsIdentity   bool    `json:"isIdentity"`
	DefaultValue *string `json:"defaultValue"`
	IsPrimaryKey bool    `json:"isPrimaryKey"`
}

// ForeignKey represents a foreign key constraint
type ForeignKey struct {
	Name              string   `json:"name"`
	Columns           []string `json:"columns"`
	ReferencedSchema  string   `json:"referencedSchema"`
	ReferencedTable   string   `json:"referencedTable"`
	ReferencedColumns []string `json:"referencedColumns"`
	OnDelete          string   `json:"onDelete"`
	OnUpdate          string   `json:"onUpdate"`
}

// IndexInfo represents an index on a table
type IndexInfo struct {
	Name        string   `json:"name"`
	Columns     []string `json:"columns"`
	IsUnique    bool     `json:"isUnique"`
	IsClustered bool     `json:"isClustered"`
}

// ViewInfo represents a database view
type ViewInfo struct {
	Schema     string `json:"schema"`
	Name       string `json:"name"`
	Definition string `json:"definition"`
}

// StoredProcedureInfo represents a stored procedure
type StoredProcedureInfo struct {
	Schema     string          `json:"schema"`
	Name       string          `json:"name"`
	Definition string          `json:"definition"`
	Parameters []ParameterInfo `json:"parameters"`
}

// FunctionInfo represents a database function
type FunctionInfo struct {
	Schema     string          `json:"schema"`
	Name       string          `json:"name"`
	Definition string          `json:"definition"`
	ReturnType string          `json:"returnType"`
	Parameters []ParameterInfo `json:"parameters"`
}

// TriggerInfo represents a database trigger
type TriggerInfo struct {
	Schema     string   `json:"schema"`
	Name       string   `json:"name"`
	TableName  string   `json:"tableName"`
	Definition string   `json:"definition"`
	Timing     string   `json:"timing"` // BEFORE, AFTER, INSTEAD OF
	Events     []string `json:"events"` // INSERT, UPDATE, DELETE
}

// ParameterInfo represents a parameter for a stored procedure or function
type ParameterInfo struct {
	Name       string `json:"name"`
	DataType   string `json:"dataType"`
	Direction  string `json:"direction"` // IN, OUT, INOUT
	HasDefault bool   `json:"hasDefault"`
}

// SchemaInfo represents the complete schema of a database
type SchemaInfo struct {
	Tables           []TableInfo           `json:"tables"`
	Views            []ViewInfo            `json:"views"`
	StoredProcedures []StoredProcedureInfo `json:"storedProcedures"`
	Functions        []FunctionInfo        `json:"functions"`
	Triggers         []TriggerInfo         `json:"triggers"`
}

// MigrationStatus represents the status of a migration
type MigrationStatus string

const (
	MigrationStatusPending   MigrationStatus = "pending"
	MigrationStatusRunning   MigrationStatus = "running"
	MigrationStatusPaused    MigrationStatus = "paused"
	MigrationStatusCompleted MigrationStatus = "completed"
	MigrationStatusFailed    MigrationStatus = "failed"
	MigrationStatusCancelled MigrationStatus = "cancelled"
)

// MigrationConfig holds configuration for a migration job
type MigrationConfig struct {
	SourceConnectionString string   `json:"sourceConnectionString"`
	TargetConnectionString string   `json:"targetConnectionString"`
	SourceDatabase         string   `json:"sourceDatabase"`
	TargetDatabase         string   `json:"targetDatabase"`
	IncludeSchema          bool     `json:"includeSchema"`
	IncludeData            bool     `json:"includeData"`
	IncludeTables          []string `json:"includeTables,omitempty"` // Empty means all tables
	ExcludeTables          []string `json:"excludeTables,omitempty"`
	IncludeViews           bool     `json:"includeViews"`
	IncludeProcedures      bool     `json:"includeProcedures"`
	IncludeFunctions       bool     `json:"includeFunctions"`
	IncludeTriggers        bool     `json:"includeTriggers"`
	BatchSize              int      `json:"batchSize"`
	ParallelTables         int      `json:"parallelTables"`
	DropTargetIfExists     bool     `json:"dropTargetIfExists"`
}

// MigrationRecord represents a migration job record
type MigrationRecord struct {
	ID                 string          `json:"id" db:"id"`
	Name               string          `json:"name" db:"name"`
	SourceConnectionID string          `json:"sourceConnectionId" db:"source_connection_id"`
	TargetConnectionID string          `json:"targetConnectionId" db:"target_connection_id"`
	SourceDatabase     string          `json:"sourceDatabase" db:"source_database"`
	TargetDatabase     string          `json:"targetDatabase" db:"target_database"`
	Status             MigrationStatus `json:"status" db:"status"`
	Config             string          `json:"config" db:"config_json"` // JSON encoded MigrationConfig
	StartedAt          *time.Time      `json:"startedAt" db:"started_at"`
	CompletedAt        *time.Time      `json:"completedAt" db:"completed_at"`
	CreatedAt          time.Time       `json:"createdAt" db:"created_at"`
	TotalTables        int             `json:"totalTables" db:"total_tables"`
	CompletedTables    int             `json:"completedTables" db:"completed_tables"`
	TotalRows          int64           `json:"totalRows" db:"total_rows"`
	MigratedRows       int64           `json:"migratedRows" db:"migrated_rows"`
}

// TableMigrationState represents the migration state of a single table
type TableMigrationState struct {
	ID             int64           `json:"id" db:"id"`
	MigrationID    string          `json:"migrationId" db:"migration_id"`
	TableName      string          `json:"tableName" db:"table_name"`
	SchemaName     string          `json:"schemaName" db:"schema_name"`
	Status         MigrationStatus `json:"status" db:"status"`
	TotalRows      int64           `json:"totalRows" db:"total_rows"`
	MigratedRows   int64           `json:"migratedRows" db:"migrated_rows"`
	LastCheckpoint string          `json:"lastCheckpoint" db:"last_checkpoint"` // JSON
	StartedAt      *time.Time      `json:"startedAt" db:"started_at"`
	CompletedAt    *time.Time      `json:"completedAt" db:"completed_at"`
	ErrorMessage   string          `json:"errorMessage" db:"error_message"`
}

// LogLevel represents the log level
type LogLevel string

const (
	LogLevelDebug LogLevel = "debug"
	LogLevelInfo  LogLevel = "info"
	LogLevelWarn  LogLevel = "warn"
	LogLevelError LogLevel = "error"
)

// LogEntry represents a log entry
type LogEntry struct {
	ID          int64     `json:"id" db:"id"`
	MigrationID string    `json:"migrationId" db:"migration_id"`
	Level       LogLevel  `json:"level" db:"level"`
	Message     string    `json:"message" db:"message"`
	TableName   string    `json:"tableName" db:"table_name"`
	Details     string    `json:"details" db:"details_json"` // JSON
	CreatedAt   time.Time `json:"createdAt" db:"created_at"`
}

// ProgressUpdate represents a real-time progress update
type ProgressUpdate struct {
	MigrationID   string  `json:"migrationId"`
	Table         string  `json:"table"`
	Phase         string  `json:"phase"`
	TotalRows     int64   `json:"totalRows"`
	ProcessedRows int64   `json:"processedRows"`
	Percentage    float64 `json:"percentage"`
	Speed         float64 `json:"speed"` // rows per second
	ETA           string  `json:"eta"`
}

// ValidationConfig holds configuration for data validation
type ValidationConfig struct {
	MigrationID        string   `json:"migrationId"`
	RowCountValidation bool     `json:"rowCountValidation"`
	ChecksumValidation bool     `json:"checksumValidation"`
	SampleComparison   bool     `json:"sampleComparison"`
	SampleSize         int      `json:"sampleSize"`
	Tables             []string `json:"tables,omitempty"` // Empty means all tables
}

// ValidationResult represents the result of validating a table
type ValidationResult struct {
	TableName        string           `json:"tableName"`
	RowCountMatch    bool             `json:"rowCountMatch"`
	SourceRowCount   int64            `json:"sourceRowCount"`
	TargetRowCount   int64            `json:"targetRowCount"`
	ChecksumMatch    bool             `json:"checksumMatch"`
	SourceChecksum   string           `json:"sourceChecksum"`
	TargetChecksum   string           `json:"targetChecksum"`
	SampleMatches    int              `json:"sampleMatches"`
	SampleMismatches int              `json:"sampleMismatches"`
	MismatchedRows   []MismatchDetail `json:"mismatchedRows,omitempty"`
	Status           string           `json:"status"`
	Duration         string           `json:"duration"`
}

// MismatchDetail represents details about a mismatched row
type MismatchDetail struct {
	PrimaryKey        interface{}        `json:"primaryKey"`
	Type              string             `json:"type"` // missing, value_diff
	ColumnDifferences []ColumnDifference `json:"columnDifferences,omitempty"`
}

// ColumnDifference represents a difference in a column value
type ColumnDifference struct {
	Column      string `json:"column"`
	SourceValue string `json:"sourceValue"`
	TargetValue string `json:"targetValue"`
}

// ValidationReport represents a complete validation report
type ValidationReport struct {
	ID          string             `json:"id" db:"id"`
	MigrationID string             `json:"migrationId" db:"migration_id"`
	Status      string             `json:"status" db:"status"`
	Config      string             `json:"config" db:"config_json"`
	Results     []ValidationResult `json:"results"`
	StartedAt   time.Time          `json:"startedAt" db:"started_at"`
	CompletedAt *time.Time         `json:"completedAt" db:"completed_at"`
}
