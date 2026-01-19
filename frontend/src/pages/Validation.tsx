import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StartValidation } from '../../wailsjs/go/main/App';
import type { ValidationConfig, ValidationResult } from '../types';

export default function Validation() {
  const { t } = useTranslation();
  const [sourceConnString, setSourceConnString] = useState(
    'sqlserver://username:password@localhost:1433?database=mydb'
  );
  const [targetConnString, setTargetConnString] = useState(
    'postgres://username:password@localhost:5432/mydb?sslmode=disable'
  );
  const [config, setConfig] = useState<ValidationConfig>({
    migrationId: '',
    rowCountValidation: true,
    checksumValidation: true,
    sampleComparison: true,
    sampleSize: 100
  });
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartValidation = async () => {
    setLoading(true);
    setError(null);
    try {
      const validationResults = await StartValidation(
        sourceConnString,
        targetConnString,
        config as never
      );
      setResults(validationResults || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Validation failed');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (result: ValidationResult) => {
    if (result.status === 'success') return '✓';
    if (result.status === 'mismatch') return '⚠';
    if (result.status === 'error') return '✗';
    return '?';
  };

  const getStatusClass = (result: ValidationResult) => {
    if (result.status === 'success') return 'success';
    if (result.status === 'mismatch') return 'warning';
    return 'error';
  };

  return (
    <div className="p-8 bg-panel-bg min-h-screen">
      <h1 className="text-2xl font-bold text-text-primary mb-2">{t('validation.title')}</h1>
      <p className="text-text-muted mb-8">{t('validation.subtitle')}</p>

      {error && (
        <div className="bg-error-bg text-error-text px-4 py-3 rounded-lg mb-5 flex justify-between items-center">
          {error}
          <button onClick={() => setError(null)} className="text-error-text hover:text-error text-lg">✕</button>
        </div>
      )}

      {results.length === 0 && (
        <div className="bg-card-bg p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold text-text-secondary mb-4">{t('validation.configTitle')}</h2>

          <div className="mb-5">
            <label className="block mb-2 font-medium text-text-secondary">{t('validation.sourceConnString')}</label>
            <input
              type="text"
              value={sourceConnString}
              onChange={(e) => setSourceConnString(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-card-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="mb-5">
            <label className="block mb-2 font-medium text-text-secondary">{t('validation.targetConnString')}</label>
            <input
              type="text"
              value={targetConnString}
              onChange={(e) => setTargetConnString(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-card-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={config.rowCountValidation}
                onChange={(e) =>
                  setConfig({ ...config, rowCountValidation: e.target.checked })
                }
                className="w-4 h-4"
              />
              {t('validation.rowCountValidation')}
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={config.checksumValidation}
                onChange={(e) =>
                  setConfig({ ...config, checksumValidation: e.target.checked })
                }
                className="w-4 h-4"
              />
              {t('validation.checksumValidation')}
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={config.sampleComparison}
                onChange={(e) =>
                  setConfig({ ...config, sampleComparison: e.target.checked })
                }
                className="w-4 h-4"
              />
              {t('validation.sampleComparison')}
            </label>
          </div>

          {config.sampleComparison && (
            <div className="mb-5">
              <label className="block mb-2 font-medium text-text-secondary">{t('validation.sampleSize')}</label>
              <input
                type="number"
                value={config.sampleSize}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    sampleSize: parseInt(e.target.value) || 100
                  })
                }
                min={10}
                max={10000}
                className="w-48 px-3 py-2 border border-border rounded-md bg-card-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          )}

          <button
            className="px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-md text-base font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={handleStartValidation}
            disabled={loading}
          >
            {loading ? t('validation.validating') : t('validation.startValidation')}
          </button>
        </div>
      )}

      {results.length > 0 && (
        <div className="bg-card-bg p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold text-text-secondary mb-4">{t('validation.resultsTitle')}</h2>

          <div className="flex gap-5 mb-8">
            <div className="flex-1 p-5 rounded-xl text-center bg-success-bg">
              <span className="block text-3xl font-bold text-success">
                {results.filter((r) => r.status === 'success').length}
              </span>
              <span className="text-text-secondary text-sm">{t('validation.passed')}</span>
            </div>
            <div className="flex-1 p-5 rounded-xl text-center bg-warning-bg">
              <span className="block text-3xl font-bold text-warning">
                {results.filter((r) => r.status === 'mismatch').length}
              </span>
              <span className="text-text-secondary text-sm">{t('validation.mismatch')}</span>
            </div>
            <div className="flex-1 p-5 rounded-xl text-center bg-error-bg">
              <span className="block text-3xl font-bold text-error">
                {results.filter((r) => r.status === 'error').length}
              </span>
              <span className="text-text-secondary text-sm">{t('validation.error')}</span>
            </div>
          </div>

          <div className="overflow-x-auto mb-5">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="px-3 py-3 text-left bg-panel-bg font-semibold text-text-secondary border-b border-border-light">{t('validation.status')}</th>
                  <th className="px-3 py-3 text-left bg-panel-bg font-semibold text-text-secondary border-b border-border-light">{t('validation.tableName')}</th>
                  <th className="px-3 py-3 text-left bg-panel-bg font-semibold text-text-secondary border-b border-border-light">{t('validation.sourceRows')}</th>
                  <th className="px-3 py-3 text-left bg-panel-bg font-semibold text-text-secondary border-b border-border-light">{t('validation.targetRows')}</th>
                  <th className="px-3 py-3 text-left bg-panel-bg font-semibold text-text-secondary border-b border-border-light">{t('validation.rowCountMatch')}</th>
                  <th className="px-3 py-3 text-left bg-panel-bg font-semibold text-text-secondary border-b border-border-light">{t('validation.checksumMatch')}</th>
                  <th className="px-3 py-3 text-left bg-panel-bg font-semibold text-text-secondary border-b border-border-light">{t('validation.sampleResult')}</th>
                  <th className="px-3 py-3 text-left bg-panel-bg font-semibold text-text-secondary border-b border-border-light">{t('validation.duration')}</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.tableName} className={
                    result.status === 'success' ? 'bg-success-bg' :
                    result.status === 'mismatch' ? 'bg-warning-bg' : 'bg-error-bg'
                  }>
                    <td className="px-3 py-3 border-b border-border-light text-text-primary">
                      <span className={`status-icon ${getStatusClass(result)}`}>
                        {getStatusIcon(result)}
                      </span>
                    </td>
                    <td className="px-3 py-3 border-b border-border-light text-text-primary">{result.tableName}</td>
                    <td className="px-3 py-3 border-b border-border-light text-text-primary">{result.sourceRowCount.toLocaleString()}</td>
                    <td className="px-3 py-3 border-b border-border-light text-text-primary">{result.targetRowCount.toLocaleString()}</td>
                    <td className="px-3 py-3 border-b border-border-light text-text-primary">{result.rowCountMatch ? '✓' : '✗'}</td>
                    <td className="px-3 py-3 border-b border-border-light text-text-primary">{result.checksumMatch ? '✓' : '✗'}</td>
                    <td className="px-3 py-3 border-b border-border-light text-text-primary">
                      {result.sampleMatches}/{result.sampleMatches + result.sampleMismatches}
                    </td>
                    <td className="px-3 py-3 border-b border-border-light text-text-primary">{result.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button className="px-5 py-2.5 bg-gray-500 hover:bg-gray-600 text-white rounded-md text-sm font-medium transition-colors" onClick={() => setResults([])}>
            {t('validation.revalidate')}
          </button>
        </div>
      )}
    </div>
  );
}
