import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMigrationStore } from '../stores/migrationStore';
import { useConnectionStore } from '../stores/connectionStore';
import type { MigrationConfig } from '../types';

export default function Migration() {
  const { t } = useTranslation();
  const {
    tables,
    selectedTables,
    status,
    logs,
    loading,
    error,
    loadTables,
    startMigration,
    pauseMigration,
    resumeMigration,
    cancelMigration,
    toggleTableSelection,
    selectAllTables,
    deselectAllTables,
    clearError
  } = useMigrationStore();

  const { sourceTestResult, targetTestResult } = useConnectionStore();

  const [migrationName, setMigrationName] = useState('');
  const [sourceConnString, setSourceConnString] = useState(
    'sqlserver://username:password@localhost:1433?database=mydb'
  );
  const [targetConnString, setTargetConnString] = useState(
    'postgres://username:password@localhost:5432/mydb?sslmode=disable'
  );
  const [sourceDatabase, setSourceDatabase] = useState('');
  const [targetDatabase, setTargetDatabase] = useState('');
  const [options, setOptions] = useState({
    includeSchema: true,
    includeData: true,
    includeViews: false,
    includeProcedures: false,
    includeFunctions: false,
    includeTriggers: false,
    dropTargetIfExists: false,
    batchSize: 10000
  });

  useEffect(() => {
    if (sourceTestResult?.databases && sourceTestResult.databases.length > 0) {
      setSourceDatabase(sourceTestResult.databases[0]);
    }
    if (targetTestResult?.databases && targetTestResult.databases.length > 0) {
      setTargetDatabase(targetTestResult.databases[0]);
    }
  }, [sourceTestResult, targetTestResult]);

  const handleLoadTables = async () => {
    if (!sourceDatabase) {
      alert(t('migration.alertSelectSource'));
      return;
    }
    try {
      await loadTables(sourceConnString, sourceDatabase);
    } catch {
      // Error handled in store
    }
  };

  const handleStartMigration = async () => {
    if (!migrationName.trim()) {
      alert(t('migration.alertEnterName'));
      return;
    }
    if (selectedTables.length === 0) {
      alert(t('migration.alertSelectTable'));
      return;
    }

    const config: MigrationConfig = {
      sourceConnectionString: sourceConnString,
      targetConnectionString: targetConnString,
      sourceDatabase,
      targetDatabase,
      includeSchema: options.includeSchema,
      includeData: options.includeData,
      includeTables: selectedTables,
      includeViews: options.includeViews,
      includeProcedures: options.includeProcedures,
      includeFunctions: options.includeFunctions,
      includeTriggers: options.includeTriggers,
      batchSize: options.batchSize,
      parallelTables: 1,
      dropTargetIfExists: options.dropTargetIfExists
    };

    try {
      await startMigration(config, migrationName);
    } catch {
      // Error handled in store
    }
  };

  const isRunning = status?.Status === 'running';
  const isPaused = status?.Status === 'paused';
  const isCompleted = status?.Status === 'completed';
  const isFailed = status?.Status === 'failed';

  const overallProgress =
    status && status.TotalRows > 0
      ? (status.MigratedRows / status.TotalRows) * 100
      : 0;

  return (
    <div className="migration-page">
      <h1>{t('migration.title')}</h1>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={clearError}>✕</button>
        </div>
      )}

      {!status && (
        <>
          {/* Configuration Section */}
          <div className="config-section">
            <h2>{t('migration.configTitle')}</h2>

            <div className="form-row">
              <div className="form-group">
                <label>{t('migration.migrationName')}</label>
                <input
                  type="text"
                  value={migrationName}
                  onChange={(e) => setMigrationName(e.target.value)}
                  placeholder={t('migration.migrationNamePlaceholder')}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>{t('migration.sourceConnString')}</label>
                <input
                  type="text"
                  value={sourceConnString}
                  onChange={(e) => setSourceConnString(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>{t('migration.sourceDatabase')}</label>
                <input
                  type="text"
                  value={sourceDatabase}
                  onChange={(e) => setSourceDatabase(e.target.value)}
                  placeholder={t('migration.databasePlaceholder')}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>{t('migration.targetConnString')}</label>
                <input
                  type="text"
                  value={targetConnString}
                  onChange={(e) => setTargetConnString(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>{t('migration.targetDatabase')}</label>
                <input
                  type="text"
                  value={targetDatabase}
                  onChange={(e) => setTargetDatabase(e.target.value)}
                  placeholder={t('migration.databasePlaceholder')}
                />
              </div>
            </div>

            <div className="options-grid">
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={options.includeSchema}
                  onChange={(e) =>
                    setOptions({ ...options, includeSchema: e.target.checked })
                  }
                />
                {t('migration.includeSchema')}
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={options.includeData}
                  onChange={(e) =>
                    setOptions({ ...options, includeData: e.target.checked })
                  }
                />
                {t('migration.includeData')}
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={options.includeViews}
                  onChange={(e) =>
                    setOptions({ ...options, includeViews: e.target.checked })
                  }
                />
                {t('migration.includeViews')}
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={options.includeProcedures}
                  onChange={(e) =>
                    setOptions({ ...options, includeProcedures: e.target.checked })
                  }
                />
                {t('migration.includeProcedures')}
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={options.includeFunctions}
                  onChange={(e) =>
                    setOptions({ ...options, includeFunctions: e.target.checked })
                  }
                />
                {t('migration.includeFunctions')}
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={options.dropTargetIfExists}
                  onChange={(e) =>
                    setOptions({ ...options, dropTargetIfExists: e.target.checked })
                  }
                />
                {t('migration.dropTargetIfExists')}
              </label>
            </div>

            <div className="form-group">
              <label>{t('migration.batchSize')}</label>
              <input
                type="number"
                value={options.batchSize}
                onChange={(e) =>
                  setOptions({ ...options, batchSize: parseInt(e.target.value) || 10000 })
                }
                min={100}
                max={100000}
              />
            </div>

            <button
              className="btn primary"
              onClick={handleLoadTables}
              disabled={loading}
            >
              {loading ? t('migration.loading') : t('migration.loadTables')}
            </button>
          </div>

          {/* Table Selection Section */}
          {tables.length > 0 && (
            <div className="tables-section">
              <h2>{t('migration.selectTables')}</h2>
              <div className="table-actions">
                <button className="btn small" onClick={selectAllTables}>
                  {t('migration.selectAll')}
                </button>
                <button className="btn small" onClick={deselectAllTables}>
                  {t('migration.deselectAll')}
                </button>
                <span className="selection-count">
                  {t('migration.selectedCount', { selected: selectedTables.length, total: tables.length })}
                </span>
              </div>

              <div className="tables-list">
                {tables.map((table) => {
                  const fullName = `${table.schema}.${table.name}`;
                  const isSelected = selectedTables.includes(fullName);
                  return (
                    <div
                      key={fullName}
                      className={`table-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleTableSelection(fullName)}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleTableSelection(fullName)}
                      />
                      <span className="table-name">{fullName}</span>
                      <span className="row-count">
                        {table.rowCount.toLocaleString()} {t('migration.rows')}
                      </span>
                    </div>
                  );
                })}
              </div>

              <button
                className="btn success large"
                onClick={handleStartMigration}
                disabled={loading || selectedTables.length === 0}
              >
                {t('migration.startMigration')}
              </button>
            </div>
          )}
        </>
      )}

      {/* Migration Progress Section */}
      {status && (
        <div className="progress-section">
          <h2>{t('migration.progressTitle')}</h2>

          <div className="status-bar">
            <span className={`status-badge ${status.Status}`}>
              {status.Status === 'running' && t('migration.statusRunning')}
              {status.Status === 'paused' && t('migration.statusPaused')}
              {status.Status === 'completed' && t('migration.statusCompleted')}
              {status.Status === 'failed' && t('migration.statusFailed')}
              {status.Status === 'cancelled' && t('migration.statusCancelled')}
            </span>
            <span className="current-table">
              {status.CurrentTable && t('migration.processing', { table: status.CurrentTable })}
            </span>
          </div>

          <div className="progress-bar-container">
            <div
              className="progress-bar"
              style={{ width: `${overallProgress}%` }}
            />
            <span className="progress-text">{overallProgress.toFixed(1)}%</span>
          </div>

          <div className="progress-stats">
            <div className="stat">
              <label>{t('migration.tables')}</label>
              <span>
                {status.CompletedTables} / {status.TotalTables}
              </span>
            </div>
            <div className="stat">
              <label>{t('migration.dataRows')}</label>
              <span>
                {status.MigratedRows.toLocaleString()} /{' '}
                {status.TotalRows.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="migration-controls">
            {isRunning && (
              <button className="btn warning" onClick={pauseMigration}>
                {t('migration.pause')}
              </button>
            )}
            {isPaused && (
              <button className="btn primary" onClick={resumeMigration}>
                {t('migration.resume')}
              </button>
            )}
            {(isRunning || isPaused) && (
              <button className="btn danger" onClick={cancelMigration}>
                {t('migration.cancel')}
              </button>
            )}
            {(isCompleted || isFailed) && (
              <a href="#/validation" className="btn primary">
                {t('migration.goToValidation')}
              </a>
            )}
          </div>

          {/* Logs */}
          <div className="logs-section">
            <h3>{t('migration.logs')}</h3>
            <div className="logs-container">
              {logs.slice(0, 50).map((log) => (
                <div key={log.id} className={`log-entry ${log.level}`}>
                  <span className="time">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </span>
                  <span className="level">[{log.level.toUpperCase()}]</span>
                  <span className="message">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
