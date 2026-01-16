package converter

import (
	"fmt"
	"strings"

	"mssql-to-postgresql/internal/types"
)

// TypeMapper handles MSSQL to PostgreSQL data type mapping
type TypeMapper struct {
	warnings []string
}

// NewTypeMapper creates a new TypeMapper
func NewTypeMapper() *TypeMapper {
	return &TypeMapper{
		warnings: make([]string, 0),
	}
}

// GetWarnings returns accumulated warnings
func (tm *TypeMapper) GetWarnings() []string {
	return tm.warnings
}

// ClearWarnings clears accumulated warnings
func (tm *TypeMapper) ClearWarnings() {
	tm.warnings = make([]string, 0)
}

// MapType maps a MSSQL data type to PostgreSQL
func (tm *TypeMapper) MapType(col types.ColumnInfo) string {
	dataType := strings.ToLower(col.DataType)

	switch dataType {
	// Exact Numeric Types
	case "bigint":
		if col.IsIdentity {
			return "BIGSERIAL"
		}
		return "BIGINT"

	case "int":
		if col.IsIdentity {
			return "SERIAL"
		}
		return "INTEGER"

	case "smallint":
		if col.IsIdentity {
			return "SMALLSERIAL"
		}
		return "SMALLINT"

	case "tinyint":
		// PostgreSQL has no TINYINT, use SMALLINT
		if col.IsIdentity {
			return "SMALLSERIAL"
		}
		return "SMALLINT"

	case "bit":
		return "BOOLEAN"

	case "decimal", "numeric":
		if col.Precision > 0 {
			return fmt.Sprintf("NUMERIC(%d,%d)", col.Precision, col.Scale)
		}
		return "NUMERIC"

	case "money":
		return "NUMERIC(19,4)"

	case "smallmoney":
		return "NUMERIC(10,4)"

	// Approximate Numeric Types
	case "float":
		if col.Precision <= 24 {
			return "REAL"
		}
		return "DOUBLE PRECISION"

	case "real":
		return "REAL"

	// Date and Time Types
	case "date":
		return "DATE"

	case "time":
		if col.Scale > 0 && col.Scale <= 6 {
			return fmt.Sprintf("TIME(%d)", col.Scale)
		}
		return "TIME"

	case "datetime":
		return "TIMESTAMP(3)"

	case "datetime2":
		precision := col.Scale
		if precision > 6 {
			tm.warnings = append(tm.warnings,
				fmt.Sprintf("Column %s: datetime2(%d) precision truncated to 6 (PostgreSQL max)", col.Name, precision))
			precision = 6
		}
		return fmt.Sprintf("TIMESTAMP(%d)", precision)

	case "smalldatetime":
		return "TIMESTAMP(0)"

	case "datetimeoffset":
		precision := col.Scale
		if precision > 6 {
			tm.warnings = append(tm.warnings,
				fmt.Sprintf("Column %s: datetimeoffset(%d) precision truncated to 6", col.Name, precision))
			precision = 6
		}
		return fmt.Sprintf("TIMESTAMPTZ(%d)", precision)

	// Character String Types
	case "char":
		if col.MaxLength > 0 {
			return fmt.Sprintf("CHAR(%d)", col.MaxLength)
		}
		return "CHAR(1)"

	case "varchar":
		if col.MaxLength == -1 {
			// VARCHAR(MAX)
			return "TEXT"
		}
		if col.MaxLength > 0 {
			return fmt.Sprintf("VARCHAR(%d)", col.MaxLength)
		}
		return "VARCHAR"

	case "text":
		return "TEXT"

	// Unicode Character Types
	case "nchar":
		// NCHAR stores 2 bytes per character in MSSQL
		length := col.MaxLength / 2
		if length > 0 {
			return fmt.Sprintf("CHAR(%d)", length)
		}
		return "CHAR(1)"

	case "nvarchar":
		if col.MaxLength == -1 {
			// NVARCHAR(MAX)
			return "TEXT"
		}
		// NVARCHAR stores 2 bytes per character in MSSQL
		length := col.MaxLength / 2
		if length > 0 {
			return fmt.Sprintf("VARCHAR(%d)", length)
		}
		return "VARCHAR"

	case "ntext":
		return "TEXT"

	// Binary Types
	case "binary":
		return "BYTEA"

	case "varbinary":
		return "BYTEA"

	case "image":
		return "BYTEA"

	// Other Types
	case "uniqueidentifier":
		return "UUID"

	case "xml":
		return "XML"

	case "sql_variant":
		tm.warnings = append(tm.warnings,
			fmt.Sprintf("Column %s: sql_variant converted to TEXT (lossy conversion)", col.Name))
		return "TEXT"

	case "hierarchyid":
		tm.warnings = append(tm.warnings,
			fmt.Sprintf("Column %s: hierarchyid converted to TEXT (custom handling may be needed)", col.Name))
		return "TEXT"

	case "geography":
		tm.warnings = append(tm.warnings,
			fmt.Sprintf("Column %s: geography type requires PostGIS extension", col.Name))
		return "GEOGRAPHY"

	case "geometry":
		tm.warnings = append(tm.warnings,
			fmt.Sprintf("Column %s: geometry type requires PostGIS extension", col.Name))
		return "GEOMETRY"

	case "timestamp", "rowversion":
		// MSSQL timestamp is not a real timestamp, it's a binary row version
		return "BYTEA"

	case "sysname":
		return "VARCHAR(128)"

	default:
		tm.warnings = append(tm.warnings,
			fmt.Sprintf("Column %s: unknown type '%s' defaulting to TEXT", col.Name, dataType))
		return "TEXT"
	}
}

// MapDefaultValue converts MSSQL default value to PostgreSQL syntax
func (tm *TypeMapper) MapDefaultValue(defaultValue string, dataType string) string {
	if defaultValue == "" {
		return ""
	}

	// Remove outer parentheses often present in MSSQL defaults
	defaultValue = strings.TrimPrefix(defaultValue, "(")
	defaultValue = strings.TrimSuffix(defaultValue, ")")
	defaultValue = strings.TrimPrefix(defaultValue, "(")
	defaultValue = strings.TrimSuffix(defaultValue, ")")

	lower := strings.ToLower(defaultValue)

	// Convert common MSSQL functions to PostgreSQL equivalents
	switch {
	case lower == "getdate()" || lower == "current_timestamp":
		return "CURRENT_TIMESTAMP"

	case lower == "getutcdate()":
		return "CURRENT_TIMESTAMP AT TIME ZONE 'UTC'"

	case lower == "newid()":
		return "gen_random_uuid()"

	case lower == "newsequentialid()":
		return "gen_random_uuid()"

	case lower == "sysdatetime()":
		return "CURRENT_TIMESTAMP"

	case lower == "sysutcdatetime()":
		return "CURRENT_TIMESTAMP AT TIME ZONE 'UTC'"

	case strings.HasPrefix(lower, "convert("):
		// CONVERT functions need manual review
		tm.warnings = append(tm.warnings,
			fmt.Sprintf("Default value '%s' uses CONVERT - may need manual conversion", defaultValue))
		return ""

	case strings.HasPrefix(lower, "cast("):
		// CAST functions need manual review
		tm.warnings = append(tm.warnings,
			fmt.Sprintf("Default value '%s' uses CAST - may need manual conversion", defaultValue))
		return ""
	}

	// Handle NULL
	if lower == "null" {
		return "NULL"
	}

	// Handle boolean conversion for BIT type
	if strings.ToLower(dataType) == "bit" {
		if defaultValue == "1" || lower == "'1'" {
			return "TRUE"
		}
		if defaultValue == "0" || lower == "'0'" {
			return "FALSE"
		}
	}

	// Handle numeric defaults
	if _, err := fmt.Sscanf(defaultValue, "%f", new(float64)); err == nil {
		return defaultValue
	}

	// Handle string defaults (ensure they're properly quoted)
	if strings.HasPrefix(defaultValue, "N'") {
		// Unicode string literal
		return strings.TrimPrefix(defaultValue, "N")
	}

	return defaultValue
}

// GenerateColumnDDL generates the PostgreSQL column definition
func (tm *TypeMapper) GenerateColumnDDL(col types.ColumnInfo) string {
	var parts []string

	// Column name (quoted to preserve case and handle reserved words)
	parts = append(parts, fmt.Sprintf("\"%s\"", col.Name))

	// Data type
	pgType := tm.MapType(col)
	parts = append(parts, pgType)

	// NOT NULL constraint (skip for SERIAL types as they're implicitly NOT NULL)
	isSerial := strings.HasSuffix(pgType, "SERIAL")
	if !col.IsNullable && !isSerial {
		parts = append(parts, "NOT NULL")
	}

	// Default value (skip for SERIAL types)
	if col.DefaultValue != nil && !isSerial {
		defaultVal := tm.MapDefaultValue(*col.DefaultValue, col.DataType)
		if defaultVal != "" {
			parts = append(parts, "DEFAULT", defaultVal)
		}
	}

	return strings.Join(parts, " ")
}

// GenerateCreateTableDDL generates a CREATE TABLE statement
func (tm *TypeMapper) GenerateCreateTableDDL(table types.TableInfo) string {
	var sb strings.Builder

	sb.WriteString(fmt.Sprintf("CREATE TABLE \"%s\".\"%s\" (\n", table.Schema, table.Name))

	// Columns
	var columnDefs []string
	for _, col := range table.Columns {
		columnDefs = append(columnDefs, "    "+tm.GenerateColumnDDL(col))
	}

	// Primary key
	if len(table.PrimaryKey) > 0 {
		pkCols := make([]string, len(table.PrimaryKey))
		for i, col := range table.PrimaryKey {
			pkCols[i] = fmt.Sprintf("\"%s\"", col)
		}
		columnDefs = append(columnDefs,
			fmt.Sprintf("    PRIMARY KEY (%s)", strings.Join(pkCols, ", ")))
	}

	sb.WriteString(strings.Join(columnDefs, ",\n"))
	sb.WriteString("\n)")

	return sb.String()
}

// GenerateIndexDDL generates a CREATE INDEX statement
func (tm *TypeMapper) GenerateIndexDDL(table types.TableInfo, index types.IndexInfo) string {
	var sb strings.Builder

	if index.IsUnique {
		sb.WriteString("CREATE UNIQUE INDEX ")
	} else {
		sb.WriteString("CREATE INDEX ")
	}

	// Index name
	sb.WriteString(fmt.Sprintf("\"%s\" ON \"%s\".\"%s\" (", index.Name, table.Schema, table.Name))

	// Columns
	cols := make([]string, len(index.Columns))
	for i, col := range index.Columns {
		cols[i] = fmt.Sprintf("\"%s\"", col)
	}
	sb.WriteString(strings.Join(cols, ", "))
	sb.WriteString(")")

	return sb.String()
}

// GenerateForeignKeyDDL generates an ALTER TABLE ADD FOREIGN KEY statement
func (tm *TypeMapper) GenerateForeignKeyDDL(table types.TableInfo, fk types.ForeignKey) string {
	var sb strings.Builder

	sb.WriteString(fmt.Sprintf("ALTER TABLE \"%s\".\"%s\" ADD CONSTRAINT \"%s\" FOREIGN KEY (",
		table.Schema, table.Name, fk.Name))

	// Source columns
	cols := make([]string, len(fk.Columns))
	for i, col := range fk.Columns {
		cols[i] = fmt.Sprintf("\"%s\"", col)
	}
	sb.WriteString(strings.Join(cols, ", "))

	sb.WriteString(fmt.Sprintf(") REFERENCES \"%s\".\"%s\" (", fk.ReferencedSchema, fk.ReferencedTable))

	// Referenced columns
	refCols := make([]string, len(fk.ReferencedColumns))
	for i, col := range fk.ReferencedColumns {
		refCols[i] = fmt.Sprintf("\"%s\"", col)
	}
	sb.WriteString(strings.Join(refCols, ", "))
	sb.WriteString(")")

	// ON DELETE action
	if fk.OnDelete != "" && fk.OnDelete != "NO_ACTION" {
		sb.WriteString(" ON DELETE ")
		sb.WriteString(strings.ReplaceAll(fk.OnDelete, "_", " "))
	}

	// ON UPDATE action
	if fk.OnUpdate != "" && fk.OnUpdate != "NO_ACTION" {
		sb.WriteString(" ON UPDATE ")
		sb.WriteString(strings.ReplaceAll(fk.OnUpdate, "_", " "))
	}

	return sb.String()
}
