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
      <div className={`mt-5 p-4 rounded-lg ${result.success ? 'bg-success-bg border border-success-border' : 'bg-error-bg border border-error-border'}`}>
        <div className="font-semibold mb-2 text-text-primary">
          {result.success ? `✓ ${t('connection.success')}` : `✗ ${t('connection.failed')}`}
        </div>
        <div className="text-sm text-text-secondary">{result.message}</div>
        {result.serverVersion && (
          <div className="text-xs text-text-muted mt-2">{t('connection.version')}: {result.serverVersion}</div>
        )}
        {result.databases && result.databases.length > 0 && (
          <div className="mt-3">
            <label className="block text-sm text-text-secondary mb-2">{t('connection.selectDatabase')}</label>
            <select
              value={type === 'source' ? sourceDatabase : targetDatabase}
              onChange={(e) =>
                type === 'source'
                  ? setSourceDatabase(e.target.value)
                  : setTargetDatabase(e.target.value)
              }
              className="w-full px-3 py-2 border border-border rounded-md bg-card-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
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
          className="mt-3 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md text-sm font-medium transition-colors"
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
    <div className="p-8 bg-panel-bg min-h-screen">
      <h1 className="text-2xl font-bold text-text-primary mb-6">{t('connection.title')}</h1>

      {error && (
        <div className="bg-error-bg text-error-text px-4 py-3 rounded-lg mb-5 flex justify-between items-center">
          {error}
          <button onClick={clearError} className="text-error-text hover:text-error text-lg">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Source Connection */}
        <div className="bg-card-bg p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold text-text-secondary mb-4">{t('connection.sourceTitle')}</h2>
          <div className="mb-5">
            <label className="block mb-2 font-medium text-text-secondary">{t('connection.connectionString')}</label>
            <textarea
              value={sourceConnString}
              onChange={(e) => setSourceConnString(e.target.value)}
              placeholder="sqlserver://username:password@host:port?database=dbname"
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-md bg-card-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
          </div>
          <p className="text-xs text-text-muted mb-4">
            {t('connection.sourceFormat')}
          </p>
          <button
            className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-md text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={handleTestSource}
            disabled={loading}
          >
            {loading ? t('connection.testing') : t('connection.testConnection')}
          </button>
          {renderTestResult(sourceTestResult, 'source')}
        </div>

        {/* Target Connection */}
        <div className="bg-card-bg p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold text-text-secondary mb-4">{t('connection.targetTitle')}</h2>
          <div className="mb-5">
            <label className="block mb-2 font-medium text-text-secondary">{t('connection.connectionString')}</label>
            <textarea
              value={targetConnString}
              onChange={(e) => setTargetConnString(e.target.value)}
              placeholder="postgres://username:password@host:port/dbname?sslmode=disable"
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-md bg-card-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
          </div>
          <p className="text-xs text-text-muted mb-4">
            {t('connection.targetFormat')}
          </p>
          <button
            className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-md text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={handleTestTarget}
            disabled={loading}
          >
            {loading ? t('connection.testing') : t('connection.testConnection')}
          </button>
          {renderTestResult(targetTestResult, 'target')}
        </div>
      </div>

      {sourceTestResult?.success && targetTestResult?.success && (
        <div className="bg-accent-light p-5 rounded-xl text-center mb-8">
          <p className="text-accent mb-4">{t('connection.bothConnected')}</p>
          <a href="#/migration" className="inline-block px-5 py-2.5 bg-success hover:bg-success-hover text-white rounded-md text-sm font-medium transition-colors">
            {t('connection.goToMigration')}
          </a>
        </div>
      )}

      {/* Connection Histories */}
      {connectionHistories.length > 0 && (
        <div className="bg-card-bg p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold text-text-secondary mb-4">{t('connection.SavedConnectionHistories')}</h2>
          <div className="flex flex-col gap-4">
            {connectionHistories.map((history) => (
              <div key={history.id} className="p-4 border border-border rounded-lg bg-panel-bg">
                <div className="flex items-center gap-3 mb-2">
                  <span className="bg-accent text-white px-2 py-0.5 rounded text-xs font-semibold">{history.connectionType.toUpperCase()}</span>
                  <span className="text-xs text-success">
                    {history.testResult.success ? '✓ Success' : '✗ Failed'}
                  </span>
                  <button
                    className="ml-auto px-3 py-1 bg-error hover:bg-error-hover text-white rounded text-xs font-medium transition-colors"
                    onClick={() => deleteConnectionHistory(history.id)}
                  >
                    Delete
                  </button>
                </div>
                <div className="font-mono text-xs text-text-secondary break-all mb-2">{history.connectionString}</div>
                {history.selectedDatabase && (
                  <div className="text-xs text-text-muted mb-1">Database: {history.selectedDatabase}</div>
                )}
                <div className="text-xs text-text-muted mb-1">
                  Saved: {new Date(history.createdAt).toLocaleString()}
                </div>
                {history.testResult.serverVersion && (
                  <div className="text-xs text-text-muted">
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
