import { useState } from 'react';
import { useConnectionStore } from '../stores/connectionStore';
import type { ConnectionTestResult } from '../types';

export default function Connection() {
  const {
    sourceTestResult,
    targetTestResult,
    loading,
    error,
    testMSSQLConnection,
    testPostgresConnection,
    clearError
  } = useConnectionStore();

  const [sourceConnString, setSourceConnString] = useState(
    'sqlserver://username:password@localhost:1433?database=mydb'
  );
  const [targetConnString, setTargetConnString] = useState(
    'postgres://username:password@localhost:5432/mydb?sslmode=disable'
  );
  const [sourceDatabase, setSourceDatabase] = useState('');
  const [targetDatabase, setTargetDatabase] = useState('');

  const handleTestSource = async () => {
    clearError();
    try {
      const result = await testMSSQLConnection(sourceConnString);
      if (result.databases && result.databases.length > 0 && !sourceDatabase) {
        setSourceDatabase(result.databases[0]);
      }
    } catch {
      // Error handled in store
    }
  };

  const handleTestTarget = async () => {
    clearError();
    try {
      const result = await testPostgresConnection(targetConnString);
      if (result.databases && result.databases.length > 0 && !targetDatabase) {
        setTargetDatabase(result.databases[0]);
      }
    } catch {
      // Error handled in store
    }
  };

  const renderTestResult = (result: ConnectionTestResult | null, type: 'source' | 'target') => {
    if (!result) return null;

    return (
      <div className={`test-result ${result.success ? 'success' : 'error'}`}>
        <div className="status">
          {result.success ? '✓ 連線成功' : '✗ 連線失敗'}
        </div>
        <div className="message">{result.message}</div>
        {result.serverVersion && (
          <div className="version">版本: {result.serverVersion}</div>
        )}
        {result.databases && result.databases.length > 0 && (
          <div className="databases">
            <label>選擇資料庫:</label>
            <select
              value={type === 'source' ? sourceDatabase : targetDatabase}
              onChange={(e) =>
                type === 'source'
                  ? setSourceDatabase(e.target.value)
                  : setTargetDatabase(e.target.value)
              }
            >
              {result.databases.map((db) => (
                <option key={db} value={db}>
                  {db}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="connection-page">
      <h1>連線設定</h1>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={clearError}>✕</button>
        </div>
      )}

      <div className="connection-panels">
        {/* Source Connection */}
        <div className="connection-panel">
          <h2>來源資料庫 (MSSQL)</h2>
          <div className="form-group">
            <label>連線字串</label>
            <textarea
              value={sourceConnString}
              onChange={(e) => setSourceConnString(e.target.value)}
              placeholder="sqlserver://username:password@host:port?database=dbname"
              rows={3}
            />
          </div>
          <div className="help-text">
            格式: sqlserver://[user]:[password]@[host]:[port]?database=[dbname]
          </div>
          <button
            className="btn primary"
            onClick={handleTestSource}
            disabled={loading}
          >
            {loading ? '測試中...' : '測試連線'}
          </button>
          {renderTestResult(sourceTestResult, 'source')}
        </div>

        {/* Target Connection */}
        <div className="connection-panel">
          <h2>目標資料庫 (PostgreSQL)</h2>
          <div className="form-group">
            <label>連線字串</label>
            <textarea
              value={targetConnString}
              onChange={(e) => setTargetConnString(e.target.value)}
              placeholder="postgres://username:password@host:port/dbname?sslmode=disable"
              rows={3}
            />
          </div>
          <div className="help-text">
            格式: postgres://[user]:[password]@[host]:[port]/[dbname]?sslmode=disable
          </div>
          <button
            className="btn primary"
            onClick={handleTestTarget}
            disabled={loading}
          >
            {loading ? '測試中...' : '測試連線'}
          </button>
          {renderTestResult(targetTestResult, 'target')}
        </div>
      </div>

      {sourceTestResult?.success && targetTestResult?.success && (
        <div className="next-step">
          <p>兩個連線都已成功測試！</p>
          <a href="#/migration" className="btn success">
            前往資料遷移 →
          </a>
        </div>
      )}
    </div>
  );
}
