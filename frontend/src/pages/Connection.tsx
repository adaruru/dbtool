import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useConnectionStore } from '../stores/connectionStore';
import type { ConnectionTestResult, ConnectionHistory } from '../types';

type DatabaseType = 'mssql' | 'postgres';

export default function Connection() {
  const { t } = useTranslation();
  const {
    sourceTestResult,
    connectionHistories,
    loading,
    error,
    testMSSQLConnection,
    testPostgresConnection,
    saveConnectionHistory,
    loadConnectionHistories,
    deleteConnectionHistory,
    clearError,
    clearTestResult,
    updateTestedConnectionDatabase
  } = useConnectionStore();

  const [dbType, setDbType] = useState<DatabaseType>('mssql');
  const [connString, setConnString] = useState('sqlserver://username:password@localhost:1433');
  const [selectedDatabase, setSelectedDatabase] = useState('');

  useEffect(() => {
    loadConnectionHistories();
  }, [loadConnectionHistories]);

  // 切換資料庫類型時更新預設連線字串
  const handleDbTypeChange = (type: DatabaseType) => {
    setDbType(type);
    clearTestResult();
    setSelectedDatabase('');
    if (type === 'mssql') {
      setConnString('sqlserver://username:password@localhost:1433');
    } else {
      setConnString('postgres://username:password@localhost:5432/postgres?sslmode=disable');
    }
  };

  const handleTestConnection = async () => {
    clearError();
    try {
      const result = dbType === 'mssql'
        ? await testMSSQLConnection(connString)
        : await testPostgresConnection(connString);
      if (result.databases && result.databases.length > 0 && !selectedDatabase) {
        setSelectedDatabase(result.databases[0]);
        updateTestedConnectionDatabase(dbType, connString, result.databases[0]);
      }
    } catch {
      // Error handled in store
    }
  };

  const handleKeepConnection = async (result: ConnectionTestResult) => {
    try {
      const connHistory: ConnectionHistory = {
        id: '',
        connectionString: connString,
        connectionType: dbType,
        testResult: result,
        selectedDatabase: selectedDatabase,
        createdAt: new Date().toISOString()
      };
      await saveConnectionHistory(connHistory);
    } catch (error) {
      console.error('Failed to keep connection:', error);
    }
  };

  const getPlaceholder = () => {
    return dbType === 'mssql'
      ? 'sqlserver://username:password@host:port'
      : 'postgres://username:password@host:port/postgres?sslmode=disable';
  };

  const getFormatHint = () => {
    return dbType === 'mssql'
      ? t('connection.sourceFormat')
      : t('connection.targetFormat');
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

      {/* Connection Test Block */}
      <div className="bg-card-bg p-6 rounded-xl shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-text-secondary mb-4">{t('connection.testConnection')}</h2>

        {/* Database Type Selector */}
        <div className="mb-5">
          <label className="block mb-2 font-medium text-text-secondary">{t('connection.databaseType')}</label>
          <select
            value={dbType}
            onChange={(e) => handleDbTypeChange(e.target.value as DatabaseType)}
            className="w-full max-w-xs px-3 py-2 border border-border rounded-md bg-card-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="mssql">SQL Server (MSSQL)</option>
            <option value="postgres">PostgreSQL</option>
          </select>
        </div>

        {/* Connection String */}
        <div className="mb-5">
          <label className="block mb-2 font-medium text-text-secondary">{t('connection.connectionString')}</label>
          <textarea
            value={connString}
            onChange={(e) => setConnString(e.target.value)}
            placeholder={getPlaceholder()}
            rows={3}
            className="w-full px-3 py-2 border border-border rounded-md bg-card-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
          />
        </div>
        <p className="text-xs text-text-muted mb-4">
          {getFormatHint()}
        </p>

        <button
          className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-md text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={handleTestConnection}
          disabled={loading}
        >
          {loading ? t('connection.testing') : t('connection.testConnection')}
        </button>

        {/* Test Result */}
        {sourceTestResult && (
          <div className={`mt-5 p-4 rounded-lg ${sourceTestResult.success ? 'bg-success-bg border border-success-border' : 'bg-error-bg border border-error-border'}`}>
            <div className="font-semibold mb-2 text-text-primary">
              {sourceTestResult.success ? `✓ ${t('connection.success')}` : `✗ ${t('connection.failed')}`}
            </div>
            <div className="text-sm text-text-secondary">{sourceTestResult.message}</div>
            {sourceTestResult.serverVersion && (
              <div className="text-xs text-text-muted mt-2">{t('connection.version')}: {sourceTestResult.serverVersion}</div>
            )}
            {sourceTestResult.databases && sourceTestResult.databases.length > 0 && (
              <div className="mt-3">
                <label className="block text-sm text-text-secondary mb-2">{t('connection.selectDatabase')}</label>
                <select
                  value={selectedDatabase}
                  onChange={(e) => {
                    setSelectedDatabase(e.target.value);
                    updateTestedConnectionDatabase(dbType, connString, e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-border rounded-md bg-card-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  {sourceTestResult.databases.map((db) => (
                    <option key={db} value={db}>
                      {db}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {sourceTestResult.success && (
              <button
                className="mt-3 px-4 py-2 bg-success hover:bg-success-hover text-white rounded-md text-sm font-medium transition-colors"
                onClick={() => handleKeepConnection(sourceTestResult)}
              >
                {t('connection.keep')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Connection Histories */}
      {connectionHistories.length > 0 && (
        <div className="bg-card-bg p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold text-text-secondary mb-4">{t('connection.SavedConnectionHistories')}</h2>
          <div className="flex flex-col gap-4">
            {connectionHistories.map((history) => (
              <div key={history.id} className="p-4 border border-border rounded-lg bg-panel-bg">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    history.connectionType === 'mssql'
                      ? 'bg-blue-500 text-white'
                      : 'bg-emerald-500 text-white'
                  }`}>
                    {history.connectionType.toUpperCase()}
                  </span>
                  <span className="text-xs text-success">
                    {history.testResult.success ? '✓ Success' : '✗ Failed'}
                  </span>
                  <button
                    className="ml-auto px-3 py-1 bg-error hover:bg-error-hover text-white rounded text-xs font-medium transition-colors"
                    onClick={() => deleteConnectionHistory(history.id)}
                  >
                    {t('common.delete')}
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
