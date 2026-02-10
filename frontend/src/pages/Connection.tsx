import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useConnectionStore } from '../stores/connectionStore';
import type { ConnectionTestResult, Connection } from '../types';

type DatabaseType = 'mssql' | 'postgres';

export default function Connection() {
  const { t } = useTranslation();
  const {
    sourceTestResult,
    loading,
    error,
    testMSSQLConnection,
    testPostgresConnection,
    saveConnection,
    loadConnections,
    deleteConnection,
    getActiveConnections,
    clearError,
    clearTestResult,
    updateConnectionDatabase
  } = useConnectionStore();

  const [dbType, setDbType] = useState<DatabaseType>('mssql');
  const [connString, setConnString] = useState('Data Source=localhost,1433;User Id=username;Password=password;TrustServerCertificate=True');
  const [selectedDatabase, setSelectedDatabase] = useState('');
  const [connectionName, setConnectionName] = useState('');

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  // 切換資料庫類型時更新預設連線字串
  const handleDbTypeChange = (type: DatabaseType) => {
    setDbType(type);
    clearTestResult();
    setSelectedDatabase('');
    setConnectionName('');
    if (type === 'mssql') {
      setConnString('Data Source=localhost,1433;User Id=username;Password=password;TrustServerCertificate=True');
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
      if (result.databases && result.databases.length > 0) {
        // 優先使用連線字串中已指定的資料庫
        const dbFromConnStr = getDatabaseFromConnectionString(connString, dbType);
        const defaultDb = (dbFromConnStr && result.databases.includes(dbFromConnStr))
          ? dbFromConnStr
          : result.databases[0];
        setSelectedDatabase(defaultDb);
        updateConnectionDatabase(dbType, connString, defaultDb);
      }
    } catch {
      // Error handled in store
    }
  };

  const handleKeepConnection = async (result: ConnectionTestResult) => {
    try {
      const connection: Connection = {
        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: connectionName || undefined,
        connectionString: connString,
        connectionType: dbType,
        testResult: result,
        selectedDatabase: selectedDatabase,
        createdAt: new Date().toISOString()
      };
      await saveConnection(connection);
      setConnectionName(''); // 清空輸入
      console.log('Connection saved successfully');
    } catch (error) {
      console.error('Failed to keep connection:', error);
    }
  };

  const getPlaceholder = () => {
    return dbType === 'mssql'
      ? 'Data Source=host,port;User Id=username;Password=password;TrustServerCertificate=True'
      : 'postgres://username:password@host:port/dbname?sslmode=disable';
  };

  const getFormatHint = () => {
    return dbType === 'mssql'
      ? t('connection.sourceFormat')
      : t('connection.targetFormat');
  };

  // 從連線字串中解析資料庫名稱
  const getDatabaseFromConnectionString = (connStr: string, type: DatabaseType): string | null => {
    if (type === 'mssql') {
      // ADO.NET 格式: Initial Catalog=xxx 或 Database=xxx
      const match = connStr.match(/(?:Initial Catalog|Database)\s*=\s*([^;]+)/i);
      return match ? match[1].trim() : null;
    } else {
      // URI 格式: postgres://user:pass@host:port/dbname?sslmode=disable
      try {
        const url = new URL(connStr);
        const pathParts = url.pathname.split('/');
        return pathParts[1] || null;
      } catch {
        return null;
      }
    }
  };

  // 更新連線字串中的資料庫名稱
  const updateConnectionStringDatabase = (connStr: string, type: DatabaseType, newDb: string): string => {
    if (type === 'mssql') {
      // ADO.NET 格式: 更新或新增 Initial Catalog=xxx
      if (/Initial Catalog\s*=/i.test(connStr)) {
        return connStr.replace(/(Initial Catalog\s*=\s*)[^;]*/i, `$1${newDb}`);
      } else if (/Database\s*=/i.test(connStr)) {
        return connStr.replace(/(Database\s*=\s*)[^;]*/i, `$1${newDb}`);
      } else {
        // 沒有資料庫參數，新增 Initial Catalog
        return connStr.replace(/;?\s*$/, '') + `;Initial Catalog=${newDb}`;
      }
    } else {
      // URI 格式: postgres://user:pass@host:port/dbname?sslmode=disable
      try {
        const url = new URL(connStr);
        const pathParts = url.pathname.split('/');
        pathParts[1] = newDb;
        url.pathname = pathParts.join('/');
        return url.toString();
      } catch {
        return connStr;
      }
    }
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
                    const newDb = e.target.value;
                    setSelectedDatabase(newDb);
                    const updatedConnStr = updateConnectionStringDatabase(connString, dbType, newDb);
                    setConnString(updatedConnStr);
                    updateConnectionDatabase(dbType, updatedConnStr, newDb);
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
              <>
                <div className="mt-3">
                  <label className="block text-sm text-text-secondary mb-2">{t('connection.connectionName')}</label>
                  <input
                    type="text"
                    value={connectionName}
                    onChange={(e) => setConnectionName(e.target.value)}
                    placeholder={t('connection.connectionNamePlaceholder')}
                    className="w-full px-3 py-2 border border-border rounded-md bg-card-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <button
                  className="mt-3 px-4 py-2 bg-success hover:bg-success-hover text-white rounded-md text-sm font-medium transition-colors"
                  onClick={() => handleKeepConnection(sourceTestResult)}
                >
                  {t('connection.keep')}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Saved Connections */}
      {getActiveConnections().length > 0 && (
        <div className="bg-card-bg p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold text-text-secondary mb-4">{t('connection.savedConnections')}</h2>
          <div className="flex flex-col gap-4">
            {getActiveConnections().map((connection) => (
              <div key={connection.id} className="p-4 border border-border rounded-lg bg-panel-bg">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    connection.connectionType === 'mssql'
                      ? 'bg-blue-500 text-white'
                      : 'bg-emerald-500 text-white'
                  }`}>
                    {connection.connectionType.toUpperCase()}
                  </span>
                  <span className="text-sm font-medium text-text-primary">
                    {connection.name || connection.selectedDatabase || (
                      connection.connectionString.slice(0, 30) + (connection.connectionString.length > 30 ? '...' : '')
                    )}
                  </span>
                  <span className="text-xs text-success">
                    {connection.testResult.success ? '✓ Success' : '✗ Failed'}
                  </span>
                  <button
                    className="ml-auto px-3 py-1 bg-error hover:bg-error-hover text-white rounded text-xs font-medium transition-colors"
                    onClick={async () => {
                      try {
                        await deleteConnection(connection.id);
                        console.log('Connection deleted successfully');
                      } catch (error) {
                        console.error('Failed to delete connection:', error);
                      }
                    }}
                  >
                    {t('common.delete')}
                  </button>
                </div>
                <div className="font-mono text-xs text-text-secondary break-all mb-2">{connection.connectionString}</div>
                {connection.selectedDatabase && (
                  <div className="text-xs text-text-muted mb-1">Database: {connection.selectedDatabase}</div>
                )}
                <div className="text-xs text-text-muted mb-1">
                  Saved: {new Date(connection.createdAt).toLocaleString()}
                </div>
                {connection.testResult.serverVersion && (
                  <div className="text-xs text-text-muted">
                    Version: {connection.testResult.serverVersion}
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
