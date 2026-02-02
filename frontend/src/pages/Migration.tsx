import { useState, useEffect, useMemo } from 'react';
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
    reorderTables,
    moveTableToTop,
    moveTableToBottom,
    clearError
  } = useMigrationStore();

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const {
    connections,
    loadConnections
  } = useConnectionStore();

  const [migrationName, setMigrationName] = useState('');
  const [sourceConnString, setSourceConnString] = useState(
    'sqlserver://username:password@localhost:1433'
  );
  const [targetConnString, setTargetConnString] = useState(
    'postgres://username:password@localhost:5432?sslmode=disable'
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
  const [sourceSelectionId, setSourceSelectionId] = useState('');
  const [targetSelectionId, setTargetSelectionId] = useState('');

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  const sourceOptions = useMemo(() => {
    return connections.filter((conn) => conn.connectionType === 'mssql');
  }, [connections]);

  const targetOptions = useMemo(() => {
    return connections.filter((conn) => conn.connectionType === 'postgres');
  }, [connections]);

  const handleSelectSourceConnection = (id: string) => {
    setSourceSelectionId(id);
    if (!id) {
      setSourceConnString('');
      setSourceDatabase('');
      return;
    }
    const conn = connections.find((c) => c.id === id);
    if (conn) {
      setSourceConnString(conn.connectionString);
      setSourceDatabase(conn.selectedDatabase || conn.testResult.databases?.[0] || '');
    }
  };

  const handleSelectTargetConnection = (id: string) => {
    setTargetSelectionId(id);
    if (!id) {
      setTargetConnString('');
      setTargetDatabase('');
      return;
    }
    const conn = connections.find((c) => c.id === id);
    if (conn) {
      setTargetConnString(conn.connectionString);
      setTargetDatabase(conn.selectedDatabase || conn.testResult.databases?.[0] || '');
    }
  };

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

  // Drag handlers
  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      reorderTables(dragIndex, dragOverIndex);
    }
    setDragIndex(null);
    setDragOverIndex(null);
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

    // 按照 tables 的順序（拖曳後順序）排列 selectedTables
    const orderedTables = tables
      .map(t => `${t.schema}.${t.name}`)
      .filter(name => selectedTables.includes(name));

    const config: MigrationConfig = {
      sourceConnectionString: sourceConnString,
      targetConnectionString: targetConnString,
      sourceDatabase,
      targetDatabase,
      includeSchema: options.includeSchema,
      includeData: options.includeData,
      includeTables: orderedTables,
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
    <div className="p-8 bg-panel-bg min-h-screen">
      <h1 className="text-2xl font-bold text-text-primary mb-6">{t('migration.title')}</h1>

      {error && (
        <div className="bg-error-bg text-error-text px-4 py-3 rounded-lg mb-5 flex justify-between items-center">
          {error}
          <button onClick={clearError} className="text-error-text hover:text-error text-lg">✕</button>
        </div>
      )}

      {/* Configuration Section */}
          <div className="bg-card-bg p-6 rounded-xl shadow-sm mb-5">
            <h2 className="text-lg font-semibold text-text-secondary mb-4">{t('migration.configTitle')}</h2>

            <div className="mb-5">
              <label className="block mb-2 font-medium text-text-secondary">{t('migration.migrationName')}</label>
              <input
                type="text"
                value={migrationName}
                onChange={(e) => setMigrationName(e.target.value)}
                placeholder={t('migration.migrationNamePlaceholder')}
                className="w-full px-3 py-2 border border-border rounded-md bg-card-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
              <div>
                <label className="block mb-2 font-medium text-text-secondary">
                  {t('migration.sourceConnString')}
                </label>
                <select
                  value={sourceSelectionId}
                  onChange={(e) => handleSelectSourceConnection(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-card-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="">-- 從成功連線挑選來源 --</option>
                  {sourceOptions.map((conn) => (
                    <option key={conn.id} value={conn.id}>
                      {`${conn.selectedDatabase || '(未選資料庫)'} : ${conn.connectionString}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-2 font-medium text-text-secondary">
                  {t('migration.targetConnString')}
                </label>
                <select
                  value={targetSelectionId}
                  onChange={(e) => handleSelectTargetConnection(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-card-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="">-- 從成功連線挑選目標 --</option>
                  {targetOptions.map((conn) => (
                    <option key={conn.id} value={conn.id}>
                      {`${conn.selectedDatabase || '(未選資料庫)'} : ${conn.connectionString}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={options.includeSchema}
                  onChange={(e) =>
                    setOptions({ ...options, includeSchema: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                {t('migration.includeSchema')}
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={options.includeData}
                  onChange={(e) =>
                    setOptions({ ...options, includeData: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                {t('migration.includeData')}
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={options.includeViews}
                  onChange={(e) =>
                    setOptions({ ...options, includeViews: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                {t('migration.includeViews')}
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={options.includeProcedures}
                  onChange={(e) =>
                    setOptions({ ...options, includeProcedures: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                {t('migration.includeProcedures')}
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={options.includeFunctions}
                  onChange={(e) =>
                    setOptions({ ...options, includeFunctions: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                {t('migration.includeFunctions')}
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={options.dropTargetIfExists}
                  onChange={(e) =>
                    setOptions({ ...options, dropTargetIfExists: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                {t('migration.dropTargetIfExists')}
              </label>
            </div>

            <div className="mb-5">
              <label className="block mb-2 font-medium text-text-secondary">{t('migration.batchSize')}</label>
              <input
                type="number"
                value={options.batchSize}
                onChange={(e) =>
                  setOptions({ ...options, batchSize: parseInt(e.target.value) || 10000 })
                }
                min={100}
                max={100000}
                className="w-48 px-3 py-2 border border-border rounded-md bg-card-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <button
              className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-md text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={handleLoadTables}
              disabled={loading}
            >
              {loading ? t('migration.loading') : t('migration.loadTables')}
            </button>
          </div>

          {/* Table Selection Section */}
          {tables.length > 0 && (
            <div className="bg-card-bg p-6 rounded-xl shadow-sm mb-5">
              <h2 className="text-lg font-semibold text-text-secondary mb-2">{t('migration.selectTables')}</h2>
              <p className="text-sm text-text-muted mb-4">拖曳 ☰ 調整遷移順序</p>
              <div className="flex gap-3 items-center mb-4">
                <button className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded text-xs font-medium transition-colors" onClick={selectAllTables}>
                  {t('migration.selectAll')}
                </button>
                <button className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded text-xs font-medium transition-colors" onClick={deselectAllTables}>
                  {t('migration.deselectAll')}
                </button>
                <span className="ml-auto text-sm text-text-muted">
                  {t('migration.selectedCount', { selected: selectedTables.length, total: tables.length })}
                </span>
              </div>

              <div className="max-h-96 overflow-y-auto border border-border-light rounded-lg mb-5">
                {tables.map((table, index) => {
                  const fullName = `${table.schema}.${table.name}`;
                  const isSelected = selectedTables.includes(fullName);
                  const isDragging = dragIndex === index;
                  const isDragOver = dragOverIndex === index;
                  return (
                    <div
                      key={fullName}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center px-4 py-3 border-b border-border-light cursor-grab transition-all
                        ${isSelected ? 'bg-accent-light' : 'hover:bg-accent-light'}
                        ${isDragging ? 'opacity-50 bg-gray-200' : ''}
                        ${isDragOver ? 'border-t-2 border-t-accent' : ''}
                      `}
                    >
                      <span className="mr-1 text-text-muted cursor-grab select-none">☰</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); moveTableToTop(index); }}
                        disabled={index === 0}
                        className="px-1.5 py-0.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        title="移至最上"
                      >
                        ⬆
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); moveTableToBottom(index); }}
                        disabled={index === tables.length - 1}
                        className="px-1.5 py-0.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed mr-2"
                        title="移至最下"
                      >
                        ⬇
                      </button>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleTableSelection(fullName)}
                        onClick={(e) => e.stopPropagation()}
                        className="mr-3 w-4 h-4 cursor-pointer"
                      />
                      <span
                        className="flex-1 font-mono text-text-primary cursor-pointer"
                        onClick={() => toggleTableSelection(fullName)}
                      >
                        {fullName}
                      </span>
                      <span className="text-text-muted text-sm mr-3">
                        #{index + 1}
                      </span>
                      <span className="text-text-muted text-sm">
                        {table.rowCount.toLocaleString()} {t('migration.rows')}
                      </span>
                    </div>
                  );
                })}
              </div>

              <button
                className="px-6 py-3 bg-success hover:bg-success-hover text-white rounded-md text-base font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={handleStartMigration}
                disabled={loading || selectedTables.length === 0}
              >
                {t('migration.startMigration')}
              </button>
            </div>
          )}

      {/* Migration Progress Section */}
      {status && (
        <div className="bg-card-bg p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold text-text-secondary mb-4">{t('migration.progressTitle')}</h2>

          <div className="flex items-center gap-4 mb-5">
            <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
              status.Status === 'running' ? 'bg-accent-light text-accent' :
              status.Status === 'paused' ? 'bg-warning-bg text-warning' :
              status.Status === 'completed' ? 'bg-success-bg text-success' :
              status.Status === 'failed' ? 'bg-error-bg text-error' : ''
            }`}>
              {status.Status === 'running' && t('migration.statusRunning')}
              {status.Status === 'paused' && t('migration.statusPaused')}
              {status.Status === 'completed' && t('migration.statusCompleted')}
              {status.Status === 'failed' && t('migration.statusFailed')}
              {status.Status === 'cancelled' && t('migration.statusCancelled')}
            </span>
            <span className="text-text-muted">
              {status.CurrentTable && t('migration.processing', { table: status.CurrentTable })}
            </span>
          </div>

          <div className="h-6 bg-border-light rounded-xl overflow-hidden relative mb-5">
            <div
              className="progress-bar"
              style={{ width: `${overallProgress}%` }}
            />
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-semibold text-text-primary">{overallProgress.toFixed(1)}%</span>
          </div>

          <div className="flex gap-10 mb-5">
            <div>
              <label className="block text-xs text-text-muted mb-1">{t('migration.tables')}</label>
              <span className="text-lg font-semibold text-text-primary">
                {status.CompletedTables} / {status.TotalTables}
              </span>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">{t('migration.dataRows')}</label>
              <span className="text-lg font-semibold text-text-primary">
                {status.MigratedRows.toLocaleString()} / {status.TotalRows.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex gap-3 mb-8">
            {isRunning && (
              <button className="px-5 py-2.5 bg-warning hover:bg-warning-hover text-white rounded-md text-sm font-medium transition-colors" onClick={pauseMigration}>
                {t('migration.pause')}
              </button>
            )}
            {isPaused && (
              <button className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-md text-sm font-medium transition-colors" onClick={resumeMigration}>
                {t('migration.resume')}
              </button>
            )}
            {(isRunning || isPaused) && (
              <button className="px-5 py-2.5 bg-error hover:bg-error-hover text-white rounded-md text-sm font-medium transition-colors" onClick={cancelMigration}>
                {t('migration.cancel')}
              </button>
            )}
            {(isCompleted || isFailed) && (
              <a href="#/validation" className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-md text-sm font-medium transition-colors inline-block">
                {t('migration.goToValidation')}
              </a>
            )}
          </div>

          {/* Logs */}
          <div>
            <h3 className="text-base font-medium text-text-secondary mb-3">{t('migration.logs')}</h3>
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
