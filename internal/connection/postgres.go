package connection

import (
	"context"
	"fmt"
	"strings"

	"adaru-db-tool/internal/types"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PostgresConnection represents a connection to PostgreSQL
type PostgresConnection struct {
	pool       *pgxpool.Pool
	connString string
}

// NewPostgresConnection creates a new PostgreSQL connection
func NewPostgresConnection(connString string) *PostgresConnection {
	return &PostgresConnection{
		connString: connString,
	}
}

// Connect establishes a connection pool to the database
func (c *PostgresConnection) Connect(ctx context.Context) error {
	pool, err := pgxpool.New(ctx, c.connString)
	if err != nil {
		return fmt.Errorf("failed to create connection pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return fmt.Errorf("failed to ping database: %w", err)
	}

	c.pool = pool
	return nil
}

// Close closes the connection pool
func (c *PostgresConnection) Close() {
	if c.pool != nil {
		c.pool.Close()
	}
}

// Pool returns the underlying connection pool
func (c *PostgresConnection) Pool() *pgxpool.Pool {
	return c.pool
}

// Test tests the connection and returns connection info
func (c *PostgresConnection) Test(ctx context.Context) (*types.ConnectionTestResult, error) {
	result := &types.ConnectionTestResult{}

	pool, err := pgxpool.New(ctx, c.connString)
	if err != nil {
		result.Success = false
		result.Message = fmt.Sprintf("Failed to create connection: %v", err)
		return result, nil
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		result.Success = false
		result.Message = fmt.Sprintf("Failed to connect: %v", err)
		return result, nil
	}

	// Get server version
	var version string
	err = pool.QueryRow(ctx, "SELECT version()").Scan(&version)
	if err != nil {
		result.Success = false
		result.Message = fmt.Sprintf("Failed to get server version: %v", err)
		return result, nil
	}
	result.ServerVersion = version

	// Get list of databases
	rows, err := pool.Query(ctx, "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname")
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

// CreateSchema creates a schema if it doesn't exist
func (c *PostgresConnection) CreateSchema(ctx context.Context, schemaName string) error {
	_, err := c.pool.Exec(ctx, fmt.Sprintf("CREATE SCHEMA IF NOT EXISTS %s", pgx.Identifier{schemaName}.Sanitize()))
	return err
}

// ExecuteDDL executes a DDL statement
func (c *PostgresConnection) ExecuteDDL(ctx context.Context, ddl string) error {
	_, err := c.pool.Exec(ctx, ddl)
	return err
}

// ExecuteDDLBatch executes multiple DDL statements in a transaction
func (c *PostgresConnection) ExecuteDDLBatch(ctx context.Context, statements []string) error {
	tx, err := c.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	for _, stmt := range statements {
		if _, err := tx.Exec(ctx, stmt); err != nil {
			return fmt.Errorf("failed to execute DDL: %w\nStatement: %s", err, stmt)
		}
	}

	return tx.Commit(ctx)
}

// CopyFrom 使用 PostgreSQL COPY 協議批次插入資料
// COPY 協議是 PostgreSQL 最高效的批次插入方式，比 INSERT 快 5-10 倍
// 參數說明：
//   - schema: 目標 schema 名稱（如 "dbo"）
//   - tableName: 目標表格名稱
//   - columns: 欄位名稱陣列，順序需與 rows 中的資料對應
//   - rows: 二維陣列，每個元素是一筆資料的所有欄位值
//
// 回傳插入的行數和錯誤
func (c *PostgresConnection) CopyFrom(ctx context.Context, schema, tableName string, columns []string, rows [][]interface{}) (int64, error) {
	// 組合 schema.tableName 識別符，pgx 會自動處理引號
	identifier := pgx.Identifier{schema, tableName}

	// 使用 pgx 的 CopyFrom 方法執行 COPY 協議
	// CopyFromSlice 將 Go slice 轉換為 COPY 資料來源
	count, err := c.pool.CopyFrom(
		ctx,
		identifier,
		columns,
		pgx.CopyFromSlice(len(rows), func(i int) ([]interface{}, error) {
			return rows[i], nil // 回傳第 i 筆資料
		}),
	)

	return count, err
}

// DisableTriggers disables triggers on a table
func (c *PostgresConnection) DisableTriggers(ctx context.Context, schema, tableName string) error {
	query := fmt.Sprintf("ALTER TABLE %s.%s DISABLE TRIGGER ALL",
		pgx.Identifier{schema}.Sanitize(),
		pgx.Identifier{tableName}.Sanitize())
	_, err := c.pool.Exec(ctx, query)
	return err
}

// EnableTriggers enables triggers on a table
func (c *PostgresConnection) EnableTriggers(ctx context.Context, schema, tableName string) error {
	query := fmt.Sprintf("ALTER TABLE %s.%s ENABLE TRIGGER ALL",
		pgx.Identifier{schema}.Sanitize(),
		pgx.Identifier{tableName}.Sanitize())
	_, err := c.pool.Exec(ctx, query)
	return err
}

// DisableForeignKeyChecks disables foreign key checks for a session
func (c *PostgresConnection) DisableForeignKeyChecks(ctx context.Context) error {
	_, err := c.pool.Exec(ctx, "SET session_replication_role = 'replica'")
	return err
}

// EnableForeignKeyChecks enables foreign key checks for a session
func (c *PostgresConnection) EnableForeignKeyChecks(ctx context.Context) error {
	_, err := c.pool.Exec(ctx, "SET session_replication_role = 'origin'")
	return err
}

// SyncSequence synchronizes a sequence with the max value in the table
func (c *PostgresConnection) SyncSequence(ctx context.Context, schema, tableName, columnName string) error {
	// pg_get_serial_sequence needs quoted identifiers to preserve case
	qualifiedTable := fmt.Sprintf("%s.%s",
		pgx.Identifier{schema}.Sanitize(),
		pgx.Identifier{tableName}.Sanitize())

	query := fmt.Sprintf(`
		SELECT setval(pg_get_serial_sequence('%s', '%s'),
			COALESCE((SELECT MAX(%s) FROM %s.%s), 1))
	`, qualifiedTable, columnName,
		pgx.Identifier{columnName}.Sanitize(),
		pgx.Identifier{schema}.Sanitize(),
		pgx.Identifier{tableName}.Sanitize())

	_, err := c.pool.Exec(ctx, query)
	return err
}

// GetRowCount gets the row count of a table
func (c *PostgresConnection) GetRowCount(ctx context.Context, schema, tableName string) (int64, error) {
	query := fmt.Sprintf("SELECT COUNT(*) FROM %s.%s",
		pgx.Identifier{schema}.Sanitize(),
		pgx.Identifier{tableName}.Sanitize())

	var count int64
	err := c.pool.QueryRow(ctx, query).Scan(&count)
	return count, err
}

// GetTableChecksum calculates a checksum for a table's data
func (c *PostgresConnection) GetTableChecksum(ctx context.Context, schema, tableName string, columns []string, orderByColumn string) (string, error) {
	colList := strings.Join(columns, ", ")
	query := fmt.Sprintf(`
		SELECT COALESCE(
			ENCODE(SHA256(
				STRING_AGG(
					MD5(ROW(%s)::TEXT)::TEXT,
					',' ORDER BY %s
				)::BYTEA
			), 'hex'),
			''
		) AS table_checksum
		FROM %s.%s
	`, colList, pgx.Identifier{orderByColumn}.Sanitize(),
		pgx.Identifier{schema}.Sanitize(),
		pgx.Identifier{tableName}.Sanitize())

	var checksum string
	err := c.pool.QueryRow(ctx, query).Scan(&checksum)
	return checksum, err
}

// GetSampleRows gets a sample of rows from a table
func (c *PostgresConnection) GetSampleRows(ctx context.Context, schema, tableName string, columns []string, orderByColumn string, limit int) ([]map[string]interface{}, error) {
	colList := strings.Join(columns, ", ")
	query := fmt.Sprintf(`
		SELECT %s
		FROM %s.%s
		ORDER BY %s
		LIMIT %d
	`, colList,
		pgx.Identifier{schema}.Sanitize(),
		pgx.Identifier{tableName}.Sanitize(),
		pgx.Identifier{orderByColumn}.Sanitize(),
		limit)

	rows, err := c.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []map[string]interface{}
	for rows.Next() {
		values, err := rows.Values()
		if err != nil {
			return nil, err
		}

		row := make(map[string]interface{})
		for i, col := range columns {
			row[col] = values[i]
		}
		results = append(results, row)
	}

	return results, rows.Err()
}

// DropTableIfExists drops a table if it exists
func (c *PostgresConnection) DropTableIfExists(ctx context.Context, schema, tableName string) error {
	query := fmt.Sprintf("DROP TABLE IF EXISTS %s.%s CASCADE",
		pgx.Identifier{schema}.Sanitize(),
		pgx.Identifier{tableName}.Sanitize())
	_, err := c.pool.Exec(ctx, query)
	return err
}

// TableExists checks if a table exists
func (c *PostgresConnection) TableExists(ctx context.Context, schema, tableName string) (bool, error) {
	query := `
		SELECT EXISTS (
			SELECT FROM information_schema.tables
			WHERE table_schema = $1 AND table_name = $2
		)
	`
	var exists bool
	err := c.pool.QueryRow(ctx, query, schema, tableName).Scan(&exists)
	return exists, err
}
