// Connection types
export type ConnectionType = 'mssql' | 'postgres';

export interface ConnectionConfig {
  id: string;
  name: string;
  type: ConnectionType;
  connectionString: string;
  database: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  serverVersion?: string;
  databases?: string[];
}

// Table types
export interface TableInfo {
  schema: string;
  name: string;
  rowCount: number;
  columns?: ColumnInfo[];
  primaryKey?: string[];
  foreignKeys?: ForeignKey[];
  indexes?: IndexInfo[];
}

export interface ColumnInfo {
  name: string;
  dataType: string;
  maxLength: number;
  precision: number;
  scale: number;
  isNullable: boolean;
  isIdentity: boolean;
  defaultValue?: string;
  isPrimaryKey: boolean;
}

export interface ForeignKey {
  name: string;
  columns: string[];
  referencedSchema: string;
  referencedTable: string;
  referencedColumns: string[];
  onDelete: string;
  onUpdate: string;
}

export interface IndexInfo {
  name: string;
  columns: string[];
  isUnique: boolean;
  isClustered: boolean;
}

// Migration types
export type MigrationStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface MigrationConfig {
  sourceConnectionString: string;
  targetConnectionString: string;
  sourceDatabase: string;
  targetDatabase: string;
  includeSchema: boolean;
  includeData: boolean;
  includeTables?: string[];
  excludeTables?: string[];
  includeViews: boolean;
  includeProcedures: boolean;
  includeFunctions: boolean;
  includeTriggers: boolean;
  batchSize: number;
  parallelTables: number;
  dropTargetIfExists: boolean;
}

export interface MigrationRecord {
  id: string;
  name: string;
  sourceConnectionId: string;
  targetConnectionId: string;
  sourceDatabase: string;
  targetDatabase: string;
  status: MigrationStatus;
  config: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  totalTables: number;
  completedTables: number;
  totalRows: number;
  migratedRows: number;
}

export interface MigrationState {
  Status: MigrationStatus;
  StartTime: string;
  TotalTables: number;
  CompletedTables: number;
  TotalRows: number;
  MigratedRows: number;
  CurrentTable: string;
  Tables: Record<string, TableState>;
  Errors: string[];
}

export interface TableState {
  Name: string;
  Schema: string;
  Status: MigrationStatus;
  TotalRows: number;
  MigratedRows: number;
  StartTime: string;
  EndTime: string;
  Error: string;
}

// Log types
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  id: number;
  migrationId: string;
  level: LogLevel;
  message: string;
  tableName: string;
  details: string;
  createdAt: string;
}

// Validation types
export interface ValidationConfig {
  migrationId: string;
  rowCountValidation: boolean;
  checksumValidation: boolean;
  sampleComparison: boolean;
  sampleSize: number;
  tables?: string[];
}

export interface ValidationResult {
  tableName: string;
  rowCountMatch: boolean;
  sourceRowCount: number;
  targetRowCount: number;
  checksumMatch: boolean;
  sourceChecksum: string;
  targetChecksum: string;
  sampleMatches: number;
  sampleMismatches: number;
  mismatchedRows?: MismatchDetail[];
  status: string;
  duration: string;
}

export interface MismatchDetail {
  primaryKey: unknown;
  type: string;
  columnDifferences?: ColumnDifference[];
}

export interface ColumnDifference {
  column: string;
  sourceValue: string;
  targetValue: string;
}

// View types
export interface ViewInfo {
  schema: string;
  name: string;
  definition: string;
}

export interface StoredProcedureInfo {
  schema: string;
  name: string;
  definition: string;
  parameters: ParameterInfo[];
}

export interface FunctionInfo {
  schema: string;
  name: string;
  definition: string;
  returnType: string;
  parameters: ParameterInfo[];
}

export interface ParameterInfo {
  name: string;
  dataType: string;
  direction: string;
  hasDefault: boolean;
}

// Progress event types
export interface ProgressEvent {
  migrationId: string;
  table: string;
  totalRows: number;
  processedRows: number;
  percentage: number;
}

export interface LogEvent {
  migrationId: string;
  level: string;
  message: string;
  timestamp: string;
}
