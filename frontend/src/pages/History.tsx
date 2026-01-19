import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMigrationStore } from '../stores/migrationStore';

export default function History() {
  const { t, i18n } = useTranslation();
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
        return t('history.statusCompleted');
      case 'failed':
        return t('history.statusFailed');
      case 'running':
        return t('history.statusRunning');
      case 'paused':
        return t('history.statusPaused');
      case 'cancelled':
        return t('history.statusCancelled');
      case 'pending':
        return t('history.statusPending');
      default:
        return status;
    }
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString(i18n.language === 'zh-TW' ? 'zh-TW' : 'en-US');
  };

  return (
    <div className="history-page">
      <h1>{t('history.title')}</h1>

      <div className="history-container">
        {/* Migration List */}
        <div className="migration-list">
          <h2>{t('history.migrationRecords')}</h2>
          {history.length === 0 ? (
            <div className="empty-state">
              <p>{t('history.noRecords')}</p>
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
                    <span className="name">{migration.name || t('history.unnamed')}</span>
                    <span className={`status ${getStatusClass(migration.status)}`}>
                      {getStatusText(migration.status)}
                    </span>
                  </div>
                  <div className="migration-info">
                    <span>{migration.sourceDatabase} → {migration.targetDatabase}</span>
                  </div>
                  <div className="migration-stats">
                    <span>
                      {migration.completedTables}/{migration.totalTables} {t('history.tables')}
                    </span>
                    <span>
                      {migration.migratedRows.toLocaleString()}/{migration.totalRows.toLocaleString()} {t('history.rows')}
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
          <h2>{t('history.detailLogs')}</h2>
          {!selectedMigration ? (
            <div className="empty-state">
              <p>{t('history.selectToViewLogs')}</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="empty-state">
              <p>{t('history.noLogs')}</p>
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
