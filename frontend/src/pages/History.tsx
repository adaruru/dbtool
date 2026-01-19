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
        return 'bg-success-bg text-success';
      case 'failed':
        return 'bg-error-bg text-error';
      case 'running':
        return 'bg-accent-light text-accent';
      case 'paused':
        return 'bg-warning-bg text-warning';
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
    <div className="p-8 bg-panel-bg min-h-screen">
      <h1 className="text-2xl font-bold text-text-primary mb-6">{t('history.title')}</h1>

      <div className="grid grid-cols-[350px_1fr] gap-5 h-[calc(100vh-120px)]">
        {/* Migration List */}
        <div className="bg-card-bg rounded-xl shadow-sm overflow-hidden flex flex-col">
          <h2 className="text-lg font-semibold text-text-secondary p-5 border-b border-border-light m-0">{t('history.migrationRecords')}</h2>
          {history.length === 0 ? (
            <div className="p-10 text-center text-text-muted">
              <p>{t('history.noRecords')}</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {history.map((migration) => (
                <div
                  key={migration.id}
                  className={`px-5 py-4 border-b border-border-light cursor-pointer transition-colors hover:bg-accent-light ${selectedMigration === migration.id ? 'bg-accent-light' : ''}`}
                  onClick={() => handleSelectMigration(migration.id)}
                >
                  <div className="flex justify-between mb-2">
                    <span className="font-semibold text-text-primary">{migration.name || t('history.unnamed')}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-lg ${getStatusClass(migration.status)}`}>
                      {getStatusText(migration.status)}
                    </span>
                  </div>
                  <div className="text-sm text-text-muted mb-1">
                    <span>{migration.sourceDatabase} → {migration.targetDatabase}</span>
                  </div>
                  <div className="flex gap-4 text-sm text-text-muted mb-1">
                    <span>
                      {migration.completedTables}/{migration.totalTables} {t('history.tables')}
                    </span>
                    <span>
                      {migration.migratedRows.toLocaleString()}/{migration.totalRows.toLocaleString()} {t('history.rows')}
                    </span>
                  </div>
                  <div className="text-sm text-text-muted">
                    {formatDate(migration.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Log Detail */}
        <div className="bg-card-bg rounded-xl shadow-sm overflow-hidden flex flex-col">
          <h2 className="text-lg font-semibold text-text-secondary p-5 border-b border-border-light m-0">{t('history.detailLogs')}</h2>
          {!selectedMigration ? (
            <div className="p-10 text-center text-text-muted">
              <p>{t('history.selectToViewLogs')}</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-10 text-center text-text-muted">
              <p>{t('history.noLogs')}</p>
            </div>
          ) : (
            <div className="flex-1 m-5 logs-list">
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
