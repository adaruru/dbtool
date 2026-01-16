package connection

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"mssql-to-postgresql/internal/types"

	_ "github.com/microsoft/go-mssqldb"
)

// MSSQLConnection represents a connection to Microsoft SQL Server
type MSSQLConnection struct {
	db           *sql.DB
	connString   string
	databaseName string
}

// NewMSSQLConnection creates a new MSSQL connection
func NewMSSQLConnection(connString string) *MSSQLConnection {
	return &MSSQLConnection{
		connString: connString,
	}
}

// Connect establishes a connection to the database
func (c *MSSQLConnection) Connect(ctx context.Context) error {
	db, err := sql.Open("sqlserver", c.connString)
	if err != nil {
		return fmt.Errorf("failed to open connection: %w", err)
	}

	if err := db.PingContext(ctx); err != nil {
		db.Close()
		return fmt.Errorf("failed to ping database: %w", err)
	}

	c.db = db
	return nil
}

// Close closes the database connection
func (c *MSSQLConnection) Close() error {
	if c.db != nil {
		return c.db.Close()
	}
	return nil
}

// DB returns the underlying database connection
func (c *MSSQLConnection) DB() *sql.DB {
	return c.db
}

// SetDatabase sets the current database
func (c *MSSQLConnection) SetDatabase(database string) error {
	c.databaseName = database
	_, err := c.db.Exec(fmt.Sprintf("USE [%s]", database))
	return err
}

// Test tests the connection and returns connection info
func (c *MSSQLConnection) Test(ctx context.Context) (*types.ConnectionTestResult, error) {
	result := &types.ConnectionTestResult{}

	db, err := sql.Open("sqlserver", c.connString)
	if err != nil {
		result.Success = false
		result.Message = fmt.Sprintf("Failed to open connection: %v", err)
		return result, nil
	}
	defer db.Close()

	if err := db.PingContext(ctx); err != nil {
		result.Success = false
		result.Message = fmt.Sprintf("Failed to connect: %v", err)
		return result, nil
	}

	// Get server version
	var version string
	err = db.QueryRowContext(ctx, "SELECT @@VERSION").Scan(&version)
	if err != nil {
		result.Success = false
		result.Message = fmt.Sprintf("Failed to get server version: %v", err)
		return result, nil
	}

	// Extract first line of version
	if idx := strings.Index(version, "\n"); idx > 0 {
		version = version[:idx]
	}
	result.ServerVersion = strings.TrimSpace(version)

	// Get list of databases
	rows, err := db.QueryContext(ctx, "SELECT name FROM sys.databases WHERE state = 0 ORDER BY name")
	if err != nil {
		result.Success = false
		result.Message = fmt.Sprintf("Failed to list databases: %v", err)
		return result, nil
	}
	defer rows.Close()

	for rows.Next() {
		var dbName string
		if err := rows.Scan(&dbName); err != nil {
			continue
		}
		result.Databases = append(result.Databases, dbName)
	}

	result.Success = true
	result.Message = "Connection successful"
	return result, nil
}

// GetTables retrieves all tables in the current database
func (c *MSSQLConnection) GetTables(ctx context.Context) ([]types.TableInfo, error) {
	query := `
		SELECT
			s.name AS schema_name,
			t.name AS table_name,
			p.rows AS row_count
		FROM sys.tables t
		INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
		INNER JOIN sys.partitions p ON t.object_id = p.object_id AND p.index_id IN (0, 1)
		WHERE t.type = 'U'
		ORDER BY s.name, t.name
	`

	rows, err := c.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query tables: %w", err)
	}
	defer rows.Close()

	var tables []types.TableInfo
	for rows.Next() {
		var table types.TableInfo
		if err := rows.Scan(&table.Schema, &table.Name, &table.RowCount); err != nil {
			return nil, fmt.Errorf("failed to scan table row: %w", err)
		}
		tables = append(tables, table)
	}

	return tables, nil
}

// GetTableDetails retrieves detailed information about a specific table
func (c *MSSQLConnection) GetTableDetails(ctx context.Context, schema, tableName string) (*types.TableInfo, error) {
	table := &types.TableInfo{
		Schema: schema,
		Name:   tableName,
	}

	// Get columns
	columns, err := c.getTableColumns(ctx, schema, tableName)
	if err != nil {
		return nil, err
	}
	table.Columns = columns

	// Get primary key
	pk, err := c.getTablePrimaryKey(ctx, schema, tableName)
	if err != nil {
		return nil, err
	}
	table.PrimaryKey = pk

	// Mark primary key columns
	for i := range table.Columns {
		for _, pkCol := range pk {
			if table.Columns[i].Name == pkCol {
				table.Columns[i].IsPrimaryKey = true
				break
			}
		}
	}

	// Get foreign keys
	fks, err := c.getTableForeignKeys(ctx, schema, tableName)
	if err != nil {
		return nil, err
	}
	table.ForeignKeys = fks

	// Get indexes
	indexes, err := c.getTableIndexes(ctx, schema, tableName)
	if err != nil {
		return nil, err
	}
	table.Indexes = indexes

	// Get row count
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM [%s].[%s]", schema, tableName)
	err = c.db.QueryRowContext(ctx, countQuery).Scan(&table.RowCount)
	if err != nil {
		// Non-fatal, just log
		table.RowCount = -1
	}

	return table, nil
}

func (c *MSSQLConnection) getTableColumns(ctx context.Context, schema, tableName string) ([]types.ColumnInfo, error) {
	query := `
		SELECT
			c.name AS column_name,
			t.name AS data_type,
			c.max_length,
			c.precision,
			c.scale,
			c.is_nullable,
			c.is_identity,
			dc.definition AS default_value
		FROM sys.columns c
		INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
		INNER JOIN sys.tables tb ON c.object_id = tb.object_id
		INNER JOIN sys.schemas s ON tb.schema_id = s.schema_id
		LEFT JOIN sys.default_constraints dc ON c.default_object_id = dc.object_id
		WHERE s.name = @schema AND tb.name = @table
		ORDER BY c.column_id
	`

	rows, err := c.db.QueryContext(ctx, query,
		sql.Named("schema", schema),
		sql.Named("table", tableName))
	if err != nil {
		return nil, fmt.Errorf("failed to query columns: %w", err)
	}
	defer rows.Close()

	var columns []types.ColumnInfo
	for rows.Next() {
		var col types.ColumnInfo
		var defaultVal sql.NullString
		if err := rows.Scan(
			&col.Name,
			&col.DataType,
			&col.MaxLength,
			&col.Precision,
			&col.Scale,
			&col.IsNullable,
			&col.IsIdentity,
			&defaultVal,
		); err != nil {
			return nil, fmt.Errorf("failed to scan column: %w", err)
		}
		if defaultVal.Valid {
			col.DefaultValue = &defaultVal.String
		}
		columns = append(columns, col)
	}

	return columns, nil
}

func (c *MSSQLConnection) getTablePrimaryKey(ctx context.Context, schema, tableName string) ([]string, error) {
	query := `
		SELECT col.name
		FROM sys.indexes idx
		INNER JOIN sys.index_columns ic ON idx.object_id = ic.object_id AND idx.index_id = ic.index_id
		INNER JOIN sys.columns col ON ic.object_id = col.object_id AND ic.column_id = col.column_id
		INNER JOIN sys.tables t ON idx.object_id = t.object_id
		INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
		WHERE idx.is_primary_key = 1 AND s.name = @schema AND t.name = @table
		ORDER BY ic.key_ordinal
	`

	rows, err := c.db.QueryContext(ctx, query,
		sql.Named("schema", schema),
		sql.Named("table", tableName))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var columns []string
	for rows.Next() {
		var col string
		if err := rows.Scan(&col); err != nil {
			return nil, err
		}
		columns = append(columns, col)
	}

	return columns, nil
}

func (c *MSSQLConnection) getTableForeignKeys(ctx context.Context, schema, tableName string) ([]types.ForeignKey, error) {
	query := `
		SELECT
			fk.name AS fk_name,
			COL_NAME(fkc.parent_object_id, fkc.parent_column_id) AS column_name,
			OBJECT_SCHEMA_NAME(fk.referenced_object_id) AS ref_schema,
			OBJECT_NAME(fk.referenced_object_id) AS ref_table,
			COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) AS ref_column,
			fk.delete_referential_action_desc,
			fk.update_referential_action_desc
		FROM sys.foreign_keys fk
		INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
		INNER JOIN sys.tables t ON fk.parent_object_id = t.object_id
		INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
		WHERE s.name = @schema AND t.name = @table
		ORDER BY fk.name, fkc.constraint_column_id
	`

	rows, err := c.db.QueryContext(ctx, query,
		sql.Named("schema", schema),
		sql.Named("table", tableName))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	fkMap := make(map[string]*types.ForeignKey)
	for rows.Next() {
		var fkName, colName, refSchema, refTable, refCol, onDelete, onUpdate string
		if err := rows.Scan(&fkName, &colName, &refSchema, &refTable, &refCol, &onDelete, &onUpdate); err != nil {
			return nil, err
		}

		if fk, exists := fkMap[fkName]; exists {
			fk.Columns = append(fk.Columns, colName)
			fk.ReferencedColumns = append(fk.ReferencedColumns, refCol)
		} else {
			fkMap[fkName] = &types.ForeignKey{
				Name:              fkName,
				Columns:           []string{colName},
				ReferencedSchema:  refSchema,
				ReferencedTable:   refTable,
				ReferencedColumns: []string{refCol},
				OnDelete:          onDelete,
				OnUpdate:          onUpdate,
			}
		}
	}

	var fks []types.ForeignKey
	for _, fk := range fkMap {
		fks = append(fks, *fk)
	}
	return fks, nil
}

func (c *MSSQLConnection) getTableIndexes(ctx context.Context, schema, tableName string) ([]types.IndexInfo, error) {
	query := `
		SELECT
			idx.name AS index_name,
			col.name AS column_name,
			idx.is_unique,
			idx.type_desc
		FROM sys.indexes idx
		INNER JOIN sys.index_columns ic ON idx.object_id = ic.object_id AND idx.index_id = ic.index_id
		INNER JOIN sys.columns col ON ic.object_id = col.object_id AND ic.column_id = col.column_id
		INNER JOIN sys.tables t ON idx.object_id = t.object_id
		INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
		WHERE idx.is_primary_key = 0 AND idx.type > 0
			AND s.name = @schema AND t.name = @table
		ORDER BY idx.name, ic.key_ordinal
	`

	rows, err := c.db.QueryContext(ctx, query,
		sql.Named("schema", schema),
		sql.Named("table", tableName))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	indexMap := make(map[string]*types.IndexInfo)
	for rows.Next() {
		var idxName, colName, typeDesc string
		var isUnique bool
		if err := rows.Scan(&idxName, &colName, &isUnique, &typeDesc); err != nil {
			return nil, err
		}

		if idx, exists := indexMap[idxName]; exists {
			idx.Columns = append(idx.Columns, colName)
		} else {
			indexMap[idxName] = &types.IndexInfo{
				Name:        idxName,
				Columns:     []string{colName},
				IsUnique:    isUnique,
				IsClustered: typeDesc == "CLUSTERED",
			}
		}
	}

	var indexes []types.IndexInfo
	for _, idx := range indexMap {
		indexes = append(indexes, *idx)
	}
	return indexes, nil
}

// GetViews retrieves all views in the current database
func (c *MSSQLConnection) GetViews(ctx context.Context) ([]types.ViewInfo, error) {
	query := `
		SELECT
			s.name AS schema_name,
			v.name AS view_name,
			m.definition
		FROM sys.views v
		INNER JOIN sys.schemas s ON v.schema_id = s.schema_id
		INNER JOIN sys.sql_modules m ON v.object_id = m.object_id
		ORDER BY s.name, v.name
	`

	rows, err := c.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var views []types.ViewInfo
	for rows.Next() {
		var view types.ViewInfo
		var definition sql.NullString
		if err := rows.Scan(&view.Schema, &view.Name, &definition); err != nil {
			return nil, err
		}
		if definition.Valid {
			view.Definition = definition.String
		}
		views = append(views, view)
	}

	return views, nil
}

// GetStoredProcedures retrieves all stored procedures
func (c *MSSQLConnection) GetStoredProcedures(ctx context.Context) ([]types.StoredProcedureInfo, error) {
	query := `
		SELECT
			s.name AS schema_name,
			p.name AS procedure_name,
			m.definition
		FROM sys.procedures p
		INNER JOIN sys.schemas s ON p.schema_id = s.schema_id
		INNER JOIN sys.sql_modules m ON p.object_id = m.object_id
		ORDER BY s.name, p.name
	`

	rows, err := c.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var procs []types.StoredProcedureInfo
	for rows.Next() {
		var proc types.StoredProcedureInfo
		var definition sql.NullString
		if err := rows.Scan(&proc.Schema, &proc.Name, &definition); err != nil {
			return nil, err
		}
		if definition.Valid {
			proc.Definition = definition.String
		}
		procs = append(procs, proc)
	}

	return procs, nil
}

// GetFunctions retrieves all functions
func (c *MSSQLConnection) GetFunctions(ctx context.Context) ([]types.FunctionInfo, error) {
	query := `
		SELECT
			s.name AS schema_name,
			o.name AS function_name,
			m.definition,
			CASE o.type
				WHEN 'FN' THEN 'SCALAR'
				WHEN 'IF' THEN 'INLINE TABLE'
				WHEN 'TF' THEN 'TABLE'
				ELSE o.type
			END AS return_type
		FROM sys.objects o
		INNER JOIN sys.schemas s ON o.schema_id = s.schema_id
		INNER JOIN sys.sql_modules m ON o.object_id = m.object_id
		WHERE o.type IN ('FN', 'IF', 'TF')
		ORDER BY s.name, o.name
	`

	rows, err := c.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var funcs []types.FunctionInfo
	for rows.Next() {
		var fn types.FunctionInfo
		var definition sql.NullString
		if err := rows.Scan(&fn.Schema, &fn.Name, &definition, &fn.ReturnType); err != nil {
			return nil, err
		}
		if definition.Valid {
			fn.Definition = definition.String
		}
		funcs = append(funcs, fn)
	}

	return funcs, nil
}

// GetTriggers retrieves all triggers
func (c *MSSQLConnection) GetTriggers(ctx context.Context) ([]types.TriggerInfo, error) {
	query := `
		SELECT
			s.name AS schema_name,
			tr.name AS trigger_name,
			OBJECT_NAME(tr.parent_id) AS table_name,
			m.definition,
			CASE WHEN OBJECTPROPERTY(tr.object_id, 'ExecIsAfterTrigger') = 1 THEN 'AFTER'
				 WHEN OBJECTPROPERTY(tr.object_id, 'ExecIsInsteadOfTrigger') = 1 THEN 'INSTEAD OF'
				 ELSE 'BEFORE'
			END AS timing
		FROM sys.triggers tr
		INNER JOIN sys.sql_modules m ON tr.object_id = m.object_id
		INNER JOIN sys.tables t ON tr.parent_id = t.object_id
		INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
		WHERE tr.type = 'TR'
		ORDER BY s.name, tr.name
	`

	rows, err := c.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var triggers []types.TriggerInfo
	for rows.Next() {
		var trigger types.TriggerInfo
		var definition sql.NullString
		if err := rows.Scan(&trigger.Schema, &trigger.Name, &trigger.TableName, &definition, &trigger.Timing); err != nil {
			return nil, err
		}
		if definition.Valid {
			trigger.Definition = definition.String
		}
		triggers = append(triggers, trigger)
	}

	return triggers, nil
}

// ReadBatch reads a batch of rows from a table
func (c *MSSQLConnection) ReadBatch(ctx context.Context, schema, tableName string, columns []string, orderBy string, offset, limit int) ([][]interface{}, error) {
	colList := strings.Join(columns, ", ")
	query := fmt.Sprintf(`
		SELECT %s
		FROM [%s].[%s]
		ORDER BY %s
		OFFSET %d ROWS FETCH NEXT %d ROWS ONLY
	`, colList, schema, tableName, orderBy, offset, limit)

	rows, err := c.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results [][]interface{}
	colTypes, _ := rows.ColumnTypes()
	numCols := len(colTypes)

	for rows.Next() {
		values := make([]interface{}, numCols)
		valuePtrs := make([]interface{}, numCols)
		for i := range values {
			valuePtrs[i] = &values[i]
		}

		if err := rows.Scan(valuePtrs...); err != nil {
			return nil, err
		}
		results = append(results, values)
	}

	return results, rows.Err()
}
