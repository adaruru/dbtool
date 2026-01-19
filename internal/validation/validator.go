package validation

import (
	"context"
	"crypto/md5"
	"database/sql"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	"adaru-db-tool/internal/connection"
	"adaru-db-tool/internal/storage"
	"adaru-db-tool/internal/types"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// Validator performs data validation between source and target databases
type Validator struct {
	ctx        context.Context
	sourceConn *connection.MSSQLConnection
	targetConn *connection.PostgresConnection
	storage    *storage.Storage
	config     *types.ValidationConfig
}

// NewValidator creates a new Validator
func NewValidator(ctx context.Context, storage *storage.Storage) *Validator {
	return &Validator{
		ctx:     ctx,
		storage: storage,
	}
}

// Configure sets up the validation configuration
func (v *Validator) Configure(sourceConnString, targetConnString string, config *types.ValidationConfig) error {
	v.config = config

	// Connect to source
	v.sourceConn = connection.NewMSSQLConnection(sourceConnString)
	if err := v.sourceConn.Connect(v.ctx); err != nil {
		return fmt.Errorf("failed to connect to source: %w", err)
	}

	// Connect to target
	v.targetConn = connection.NewPostgresConnection(targetConnString)
	if err := v.targetConn.Connect(v.ctx); err != nil {
		return fmt.Errorf("failed to connect to target: %w", err)
	}

	return nil
}

// Close closes database connections
func (v *Validator) Close() {
	if v.sourceConn != nil {
		v.sourceConn.Close()
	}
	if v.targetConn != nil {
		v.targetConn.Close()
	}
}

// Validate performs validation and returns results
func (v *Validator) Validate(ctx context.Context) ([]types.ValidationResult, error) {
	var results []types.ValidationResult

	// Get tables to validate
	tables, err := v.getTablesToValidate(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get tables: %w", err)
	}

	for _, table := range tables {
		select {
		case <-ctx.Done():
			return results, ctx.Err()
		default:
		}

		result, err := v.validateTable(ctx, table)
		if err != nil {
			result = &types.ValidationResult{
				TableName: fmt.Sprintf("%s.%s", table.Schema, table.Name),
				Status:    "error",
			}
		}
		results = append(results, *result)

		// Emit progress event
		v.emitEvent("validation:progress", map[string]interface{}{
			"table":  fmt.Sprintf("%s.%s", table.Schema, table.Name),
			"result": result,
		})
	}

	return results, nil
}

// getTablesToValidate returns the list of tables to validate
func (v *Validator) getTablesToValidate(ctx context.Context) ([]types.TableInfo, error) {
	allTables, err := v.sourceConn.GetTables(ctx)
	if err != nil {
		return nil, err
	}

	// Filter based on config
	if len(v.config.Tables) == 0 {
		return allTables, nil
	}

	var tables []types.TableInfo
	for _, table := range allTables {
		fullName := table.Schema + "." + table.Name
		for _, configTable := range v.config.Tables {
			if configTable == fullName || configTable == table.Name {
				tables = append(tables, table)
				break
			}
		}
	}

	return tables, nil
}

// validateTable validates a single table
func (v *Validator) validateTable(ctx context.Context, table types.TableInfo) (*types.ValidationResult, error) {
	tableName := fmt.Sprintf("%s.%s", table.Schema, table.Name)
	startTime := time.Now()

	result := &types.ValidationResult{
		TableName: tableName,
		Status:    "success",
	}

	// Get table details for columns
	tableDetails, err := v.sourceConn.GetTableDetails(ctx, table.Schema, table.Name)
	if err != nil {
		result.Status = "error"
		return result, err
	}

	// 1. Row count validation
	if v.config.RowCountValidation {
		if err := v.validateRowCount(ctx, table, result); err != nil {
			result.Status = "warning"
		}
	}

	// 2. Checksum validation
	if v.config.ChecksumValidation {
		if err := v.validateChecksum(ctx, tableDetails, result); err != nil {
			// Checksum validation may fail due to data type differences, log but continue
			result.Status = "warning"
		}
	}

	// 3. Sample data comparison
	if v.config.SampleComparison {
		if err := v.validateSampleData(ctx, tableDetails, result); err != nil {
			result.Status = "warning"
		}
	}

	// Determine final status
	if !result.RowCountMatch || !result.ChecksumMatch || result.SampleMismatches > 0 {
		result.Status = "mismatch"
	}

	result.Duration = time.Since(startTime).String()
	return result, nil
}

// validateRowCount compares row counts between source and target
func (v *Validator) validateRowCount(ctx context.Context, table types.TableInfo, result *types.ValidationResult) error {
	// Get source row count
	query := fmt.Sprintf("SELECT COUNT(*) FROM [%s].[%s]", table.Schema, table.Name)
	var sourceCount int64
	if err := v.sourceConn.DB().QueryRowContext(ctx, query).Scan(&sourceCount); err != nil {
		return err
	}
	result.SourceRowCount = sourceCount

	// Get target row count
	targetCount, err := v.targetConn.GetRowCount(ctx, table.Schema, table.Name)
	if err != nil {
		return err
	}
	result.TargetRowCount = targetCount

	result.RowCountMatch = sourceCount == targetCount
	return nil
}

// validateChecksum compares checksums between source and target
func (v *Validator) validateChecksum(ctx context.Context, table *types.TableInfo, result *types.ValidationResult) error {
	// Get column list (excluding non-comparable types)
	var columns []string
	var orderByCol string
	for _, col := range table.Columns {
		// Skip binary/blob types that are hard to compare
		dataType := strings.ToLower(col.DataType)
		if dataType == "image" || dataType == "varbinary" || dataType == "binary" || dataType == "text" || dataType == "ntext" {
			continue
		}
		columns = append(columns, col.Name)
		if col.IsPrimaryKey && orderByCol == "" {
			orderByCol = col.Name
		}
	}

	if len(columns) == 0 {
		return fmt.Errorf("no comparable columns found")
	}
	if orderByCol == "" {
		orderByCol = columns[0]
	}

	// Calculate source checksum (simplified - in production would use table-level checksum)
	sourceChecksum, err := v.calculateSourceChecksum(ctx, table.Schema, table.Name, columns, orderByCol)
	if err != nil {
		return err
	}
	result.SourceChecksum = sourceChecksum

	// Calculate target checksum
	targetChecksum, err := v.targetConn.GetTableChecksum(ctx, table.Schema, table.Name, columns, orderByCol)
	if err != nil {
		return err
	}
	result.TargetChecksum = targetChecksum

	result.ChecksumMatch = sourceChecksum == targetChecksum
	return nil
}

// calculateSourceChecksum calculates checksum for MSSQL table
func (v *Validator) calculateSourceChecksum(ctx context.Context, schema, tableName string, columns []string, orderBy string) (string, error) {
	// Use a simpler checksum approach that's compatible between databases
	// In production, you might want a more sophisticated approach
	colList := make([]string, len(columns))
	for i, col := range columns {
		colList[i] = fmt.Sprintf("ISNULL(CAST([%s] AS NVARCHAR(MAX)), '')", col)
	}

	query := fmt.Sprintf(`
		SELECT HASHBYTES('SHA2_256',
			STRING_AGG(
				HASHBYTES('MD5', CONCAT(%s)),
				','
			) WITHIN GROUP (ORDER BY [%s])
		)
		FROM [%s].[%s]
	`, strings.Join(colList, ", '+', "), orderBy, schema, tableName)

	var checksumBytes []byte
	if err := v.sourceConn.DB().QueryRowContext(ctx, query).Scan(&checksumBytes); err != nil {
		// Fallback to row count based hash if advanced features not available
		return v.calculateSimpleChecksum(ctx, schema, tableName, columns, orderBy)
	}

	return hex.EncodeToString(checksumBytes), nil
}

// calculateSimpleChecksum calculates a simple checksum by hashing row data
func (v *Validator) calculateSimpleChecksum(ctx context.Context, schema, tableName string, columns []string, orderBy string) (string, error) {
	colList := make([]string, len(columns))
	for i, col := range columns {
		colList[i] = fmt.Sprintf("[%s]", col)
	}

	query := fmt.Sprintf(`
		SELECT %s FROM [%s].[%s] ORDER BY [%s]
	`, strings.Join(colList, ", "), schema, tableName, orderBy)

	rows, err := v.sourceConn.DB().QueryContext(ctx, query)
	if err != nil {
		return "", err
	}
	defer rows.Close()

	hasher := md5.New()
	for rows.Next() {
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}

		if err := rows.Scan(valuePtrs...); err != nil {
			return "", err
		}

		// Hash the row values
		rowStr := fmt.Sprintf("%v", values)
		hasher.Write([]byte(rowStr))
	}

	return hex.EncodeToString(hasher.Sum(nil)), nil
}

// validateSampleData compares sample rows between source and target
func (v *Validator) validateSampleData(ctx context.Context, table *types.TableInfo, result *types.ValidationResult) error {
	sampleSize := v.config.SampleSize
	if sampleSize <= 0 {
		sampleSize = 100
	}

	// Get column names and primary key
	var columns []string
	var pkColumns []string
	for _, col := range table.Columns {
		columns = append(columns, col.Name)
		if col.IsPrimaryKey {
			pkColumns = append(pkColumns, col.Name)
		}
	}

	if len(pkColumns) == 0 {
		pkColumns = append(pkColumns, columns[0])
	}

	// Get sample primary keys from source
	pkList := make([]string, len(pkColumns))
	for i, pk := range pkColumns {
		pkList[i] = fmt.Sprintf("[%s]", pk)
	}

	query := fmt.Sprintf(`
		SELECT TOP %d %s FROM [%s].[%s] ORDER BY %s
	`, sampleSize, strings.Join(pkList, ", "), table.Schema, table.Name, pkList[0])

	rows, err := v.sourceConn.DB().QueryContext(ctx, query)
	if err != nil {
		return err
	}
	defer rows.Close()

	var sampleKeys [][]interface{}
	for rows.Next() {
		keyValues := make([]interface{}, len(pkColumns))
		keyPtrs := make([]interface{}, len(pkColumns))
		for i := range keyValues {
			keyPtrs[i] = &keyValues[i]
		}
		if err := rows.Scan(keyPtrs...); err != nil {
			return err
		}
		sampleKeys = append(sampleKeys, keyValues)
	}

	// Compare each sample row
	matches := 0
	mismatches := 0
	var mismatchDetails []types.MismatchDetail

	for _, keyValues := range sampleKeys {
		match, detail := v.compareRow(ctx, table, columns, pkColumns, keyValues)
		if match {
			matches++
		} else {
			mismatches++
			if detail != nil {
				mismatchDetails = append(mismatchDetails, *detail)
			}
		}
	}

	result.SampleMatches = matches
	result.SampleMismatches = mismatches
	if len(mismatchDetails) > 10 {
		result.MismatchedRows = mismatchDetails[:10] // Limit to first 10
	} else {
		result.MismatchedRows = mismatchDetails
	}

	return nil
}

// compareRow compares a single row between source and target
func (v *Validator) compareRow(ctx context.Context, table *types.TableInfo, columns, pkColumns []string, keyValues []interface{}) (bool, *types.MismatchDetail) {
	// Build WHERE clause
	whereParts := make([]string, len(pkColumns))
	for i, pk := range pkColumns {
		whereParts[i] = fmt.Sprintf("[%s] = @p%d", pk, i)
	}

	// Get source row
	colList := make([]string, len(columns))
	for i, col := range columns {
		colList[i] = fmt.Sprintf("[%s]", col)
	}

	sourceQuery := fmt.Sprintf(`
		SELECT %s FROM [%s].[%s] WHERE %s
	`, strings.Join(colList, ", "), table.Schema, table.Name, strings.Join(whereParts, " AND "))

	// Create named parameters
	args := make([]interface{}, len(keyValues))
	for i, val := range keyValues {
		args[i] = sql.Named(fmt.Sprintf("p%d", i), val)
	}

	sourceValues := make([]interface{}, len(columns))
	sourcePtrs := make([]interface{}, len(columns))
	for i := range sourceValues {
		sourcePtrs[i] = &sourceValues[i]
	}

	if err := v.sourceConn.DB().QueryRowContext(ctx, sourceQuery, args...).Scan(sourcePtrs...); err != nil {
		return false, &types.MismatchDetail{
			PrimaryKey: keyValues,
			Type:       "source_error",
		}
	}

	// Get target row
	targetQuery := v.buildPostgresQuery(table.Schema, table.Name, columns, pkColumns, keyValues)
	targetValues := make([]interface{}, len(columns))
	targetPtrs := make([]interface{}, len(columns))
	for i := range targetValues {
		targetPtrs[i] = &targetValues[i]
	}

	if err := v.targetConn.Pool().QueryRow(ctx, targetQuery, keyValues...).Scan(targetPtrs...); err != nil {
		return false, &types.MismatchDetail{
			PrimaryKey: keyValues,
			Type:       "missing",
		}
	}

	// Compare values
	var diffs []types.ColumnDifference
	for i, col := range columns {
		if !v.valuesEqual(sourceValues[i], targetValues[i]) {
			diffs = append(diffs, types.ColumnDifference{
				Column:      col,
				SourceValue: fmt.Sprintf("%v", sourceValues[i]),
				TargetValue: fmt.Sprintf("%v", targetValues[i]),
			})
		}
	}

	if len(diffs) > 0 {
		return false, &types.MismatchDetail{
			PrimaryKey:        keyValues,
			Type:              "value_diff",
			ColumnDifferences: diffs,
		}
	}

	return true, nil
}

// buildPostgresQuery builds a SELECT query for PostgreSQL
func (v *Validator) buildPostgresQuery(schema, tableName string, columns, pkColumns []string, keyValues []interface{}) string {
	whereParts := make([]string, len(pkColumns))
	for i, pk := range pkColumns {
		whereParts[i] = fmt.Sprintf("\"%s\" = $%d", pk, i+1)
	}

	colList := make([]string, len(columns))
	for i, col := range columns {
		colList[i] = fmt.Sprintf("\"%s\"", col)
	}

	return fmt.Sprintf(`
		SELECT %s FROM "%s"."%s" WHERE %s
	`, strings.Join(colList, ", "), schema, tableName, strings.Join(whereParts, " AND "))
}

// valuesEqual compares two values, handling type differences
func (v *Validator) valuesEqual(a, b interface{}) bool {
	// Handle nil values
	if a == nil && b == nil {
		return true
	}
	if a == nil || b == nil {
		return false
	}

	// Convert to strings for comparison (handles most type differences)
	aStr := fmt.Sprintf("%v", a)
	bStr := fmt.Sprintf("%v", b)

	// Handle common type conversions
	// Boolean: MSSQL uses 0/1, PostgreSQL uses true/false
	if aStr == "true" && bStr == "1" {
		return true
	}
	if aStr == "false" && bStr == "0" {
		return true
	}
	if aStr == "1" && bStr == "true" {
		return true
	}
	if aStr == "0" && bStr == "false" {
		return true
	}

	return aStr == bStr
}

// emitEvent emits an event to the frontend
func (v *Validator) emitEvent(eventName string, data interface{}) {
	runtime.EventsEmit(v.ctx, eventName, data)
}
