import { useState, useEffect } from 'react';
import { useMigrationStore } from '../stores/migrationStore';

export default function History() {
  const { history, logs, loadHistory, loadLogs } = useMigrationStore();
  const [selectedMigration, setSelectedMigration] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSelectMigration = async (id: string) => {
    setSelectedMigration(id);
    await loadLogs(id);
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'running':
        return 'info';
      case 'paused':
        return 'warning';
      default:
        return '';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'failed':
        return '失敗';
      case 'running':
        return '執行中';
      case 'paused':
        return '已暫停';
      case 'cancelled':
        return '已取消';
      case 'pending':
        return '待處理';
      default:
        return status;
    }
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-TW');
  };

  return (
    <div className="history-page">
      <h1>歷史紀錄</h1>

      <div className="history-container">
        {/* Migration List */}
        <div className="migration-list">
          <h2>遷移紀錄</h2>
          {history.length === 0 ? (
            <div className="empty-state">
              <p>尚無遷移紀錄</p>
            </div>
          ) : (
            <div className="list">
              {history.map((migration) => (
                <div
                  key={migration.id}
                  className={`migration-item ${selectedMigration === migration.id ? 'selected' : ''}`}
                  onClick={() => handleSelectMigration(migration.id)}
                >
                  <div className="migration-header">
                    <span className="name">{migration.name || '未命名'}</span>
                    <span className={`status ${getStatusClass(migration.status)}`}>
                      {getStatusText(migration.status)}
                    </span>
                  </div>
                  <div className="migration-info">
                    <span>{migration.sourceDatabase} → {migration.targetDatabase}</span>
                  </div>
                  <div className="migration-stats">
                    <span>
                      {migration.completedTables}/{migration.totalTables} 資料表
                    </span>
                    <span>
                      {migration.migratedRows.toLocaleString()}/{migration.totalRows.toLocaleString()} 筆
                    </span>
                  </div>
                  <div className="migration-time">
                    {formatDate(migration.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Log Detail */}
        <div className="log-detail">
          <h2>詳細日誌</h2>
          {!selectedMigration ? (
            <div className="empty-state">
              <p>選擇一個遷移紀錄以查看日誌</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="empty-state">
              <p>此遷移沒有日誌紀錄</p>
            </div>
          ) : (
            <div className="logs-list">
              {logs.map((log) => (
                <div key={log.id} className={`log-entry ${log.level}`}>
                  <span className="time">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </span>
                  <span className="level">[{log.level.toUpperCase()}]</span>
                  <span className="message">{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
