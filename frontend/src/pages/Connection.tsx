import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useConnectionStore } from '../stores/connectionStore';
import type { ConnectionTestResult, ConnectionHistory } from '../types';

export default function Connection() {
  const { t } = useTranslation();
  const {
    sourceTestResult,
    targetTestResult,
    connectionHistories,
    loading,
    error,
    testMSSQLConnection,
    testPostgresConnection,
    saveConnectionHistory,
    loadConnectionHistories,
    deleteConnectionHistory,
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

  useEffect(() => {
    loadConnectionHistories();
  }, [loadConnectionHistories]);

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

  const handleKeepConnection = async (
    connString: string,
    result: ConnectionTestResult,
    database: string,
    type: 'mssql' | 'postgres'
  ) => {
    try {
      const connHistory: ConnectionHistory = {
        id: '',
        connectionString: connString,
        connectionType: type,
        testResult: result,
        selectedDatabase: database,
        createdAt: new Date().toISOString()
      };
      await saveConnectionHistory(connHistory);
    } catch (error) {
      console.error('Failed to keep connection:', error);
    }
  };

  const renderTestResult = (result: ConnectionTestResult | null, type: 'source' | 'target') => {
    if (!result) return null;

    return (
      <div className={`test-result ${result.success ? 'success' : 'error'}`}>
        <div className="status">
          {result.success ? `✓ ${t('connection.success')}` : `✗ ${t('connection.failed')}`}
        </div>
        <div className="message">{result.message}</div>
        {result.serverVersion && (
          <div className="version">{t('connection.version')}: {result.serverVersion}</div>
        )}
        {result.databases && result.databases.length > 0 && (
          <div className="databases">
            <label>{t('connection.selectDatabase')}</label>
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
        <button
          className="btn secondary keep-btn"
          onClick={() => handleKeepConnection(
            type === 'source' ? sourceConnString : targetConnString,
            result,
            type === 'source' ? sourceDatabase : targetDatabase,
            type === 'source' ? 'mssql' : 'postgres'
          )}
        >
          {t('connection.keep')}
        </button>
      </div>
    );
  };

  return (
    <div className="connection-page">
      <h1>{t('connection.title')}</h1>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={clearError}>✕</button>
        </div>
      )}

      <div className="connection-panels">
        {/* Source Connection */}
        <div className="connection-panel">
          <h2>{t('connection.sourceTitle')}</h2>
          <div className="form-group">
            <label>{t('connection.connectionString')}</label>
            <textarea
              value={sourceConnString}
              onChange={(e) => setSourceConnString(e.target.value)}
              placeholder="sqlserver://username:password@host:port?database=dbname"
              rows={3}
            />
          </div>
          <div className="help-text">
            {t('connection.sourceFormat')}
          </div>
          <button
            className="btn primary"
            onClick={handleTestSource}
            disabled={loading}
          >
            {loading ? t('connection.testing') : t('connection.testConnection')}
          </button>
          {renderTestResult(sourceTestResult, 'source')}
        </div>

        {/* Target Connection */}
        <div className="connection-panel">
          <h2>{t('connection.targetTitle')}</h2>
          <div className="form-group">
            <label>{t('connection.connectionString')}</label>
            <textarea
              value={targetConnString}
              onChange={(e) => setTargetConnString(e.target.value)}
              placeholder="postgres://username:password@host:port/dbname?sslmode=disable"
              rows={3}
            />
          </div>
          <div className="help-text">
            {t('connection.targetFormat')}
          </div>
          <button
            className="btn primary"
            onClick={handleTestTarget}
            disabled={loading}
          >
            {loading ? t('connection.testing') : t('connection.testConnection')}
          </button>
          {renderTestResult(targetTestResult, 'target')}
        </div>
      </div>

      {sourceTestResult?.success && targetTestResult?.success && (
        <div className="next-step">
          <p>{t('connection.bothConnected')}</p>
          <a href="#/migration" className="btn success">
            {t('connection.goToMigration')}
          </a>
        </div>
      )}

      {/* Connection Histories */}
      {connectionHistories.length > 0 && (
        <div className="connection-histories">
          <h2>{t('connection.SavedConnectionHistories')}</h2>
          <div className="histories-list">
            {connectionHistories.map((history) => (
              <div key={history.id} className="history-item">
                <div className="history-header">
                  <span className="connection-type">{history.connectionType.toUpperCase()}</span>
                  <span className="connection-status">
                    {history.testResult.success ? '✓ Success' : '✗ Failed'}
                  </span>
                  <button
                    className="btn danger small"
                    onClick={() => deleteConnectionHistory(history.id)}
                  >
                    Delete
                  </button>
                </div>
                <div className="connection-string">{history.connectionString}</div>
                {history.selectedDatabase && (
                  <div className="selected-database">Database: {history.selectedDatabase}</div>
                )}
                <div className="created-at">
                  Saved: {new Date(history.createdAt).toLocaleString()}
                </div>
                {history.testResult.serverVersion && (
                  <div className="server-version">
                    Version: {history.testResult.serverVersion}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
