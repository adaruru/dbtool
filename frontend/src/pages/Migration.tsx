import { useState, useEffect } from 'react';
import { useMigrationStore } from '../stores/migrationStore';
import { useConnectionStore } from '../stores/connectionStore';
import type { MigrationConfig } from '../types';

export default function Migration() {
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
      alert('請先選擇來源資料庫');
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
      alert('請輸入遷移名稱');
      return;
    }
    if (selectedTables.length === 0) {
      alert('請至少選擇一個資料表');
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
      <h1>資料遷移</h1>

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
            <h2>遷移設定</h2>

            <div className="form-row">
              <div className="form-group">
                <label>遷移名稱</label>
                <input
                  type="text"
                  value={migrationName}
                  onChange={(e) => setMigrationName(e.target.value)}
                  placeholder="例如：Production DB Migration"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>來源連線字串 (MSSQL)</label>
                <input
                  type="text"
                  value={sourceConnString}
                  onChange={(e) => setSourceConnString(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>來源資料庫</label>
                <input
                  type="text"
                  value={sourceDatabase}
                  onChange={(e) => setSourceDatabase(e.target.value)}
                  placeholder="資料庫名稱"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>目標連線字串 (PostgreSQL)</label>
                <input
                  type="text"
                  value={targetConnString}
                  onChange={(e) => setTargetConnString(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>目標資料庫</label>
                <input
                  type="text"
                  value={targetDatabase}
                  onChange={(e) => setTargetDatabase(e.target.value)}
                  placeholder="資料庫名稱"
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
                遷移 Schema (資料表結構)
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={options.includeData}
                  onChange={(e) =>
                    setOptions({ ...options, includeData: e.target.checked })
                  }
                />
                遷移資料
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={options.includeViews}
                  onChange={(e) =>
                    setOptions({ ...options, includeViews: e.target.checked })
                  }
                />
                包含 Views
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={options.includeProcedures}
                  onChange={(e) =>
                    setOptions({ ...options, includeProcedures: e.target.checked })
                  }
                />
                包含 Stored Procedures
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={options.includeFunctions}
                  onChange={(e) =>
                    setOptions({ ...options, includeFunctions: e.target.checked })
                  }
                />
                包含 Functions
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={options.dropTargetIfExists}
                  onChange={(e) =>
                    setOptions({ ...options, dropTargetIfExists: e.target.checked })
                  }
                />
                如果目標存在則刪除
              </label>
            </div>

            <div className="form-group">
              <label>批次大小 (筆/批)</label>
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
              {loading ? '載入中...' : '載入資料表'}
            </button>
          </div>

          {/* Table Selection Section */}
          {tables.length > 0 && (
            <div className="tables-section">
              <h2>選擇要遷移的資料表</h2>
              <div className="table-actions">
                <button className="btn small" onClick={selectAllTables}>
                  全選
                </button>
                <button className="btn small" onClick={deselectAllTables}>
                  取消全選
                </button>
                <span className="selection-count">
                  已選擇 {selectedTables.length} / {tables.length} 個資料表
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
                        {table.rowCount.toLocaleString()} 筆
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
                開始遷移
              </button>
            </div>
          )}
        </>
      )}

      {/* Migration Progress Section */}
      {status && (
        <div className="progress-section">
          <h2>遷移進度</h2>

          <div className="status-bar">
            <span className={`status-badge ${status.Status}`}>
              {status.Status === 'running' && '執行中'}
              {status.Status === 'paused' && '已暫停'}
              {status.Status === 'completed' && '已完成'}
              {status.Status === 'failed' && '失敗'}
              {status.Status === 'cancelled' && '已取消'}
            </span>
            <span className="current-table">
              {status.CurrentTable && `正在處理: ${status.CurrentTable}`}
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
              <label>資料表</label>
              <span>
                {status.CompletedTables} / {status.TotalTables}
              </span>
            </div>
            <div className="stat">
              <label>資料列</label>
              <span>
                {status.MigratedRows.toLocaleString()} /{' '}
                {status.TotalRows.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="migration-controls">
            {isRunning && (
              <button className="btn warning" onClick={pauseMigration}>
                暫停
              </button>
            )}
            {isPaused && (
              <button className="btn primary" onClick={resumeMigration}>
                繼續
              </button>
            )}
            {(isRunning || isPaused) && (
              <button className="btn danger" onClick={cancelMigration}>
                取消
              </button>
            )}
            {(isCompleted || isFailed) && (
              <a href="#/validation" className="btn primary">
                前往驗證
              </a>
            )}
          </div>

          {/* Logs */}
          <div className="logs-section">
            <h3>日誌</h3>
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
