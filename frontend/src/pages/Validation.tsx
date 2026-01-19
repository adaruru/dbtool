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
    <div className="validation-page">
      <h1>{t('validation.title')}</h1>
      <p className="subtitle">{t('validation.subtitle')}</p>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {results.length === 0 && (
        <div className="validation-config">
          <h2>{t('validation.configTitle')}</h2>

          <div className="form-row">
            <div className="form-group">
              <label>{t('validation.sourceConnString')}</label>
              <input
                type="text"
                value={sourceConnString}
                onChange={(e) => setSourceConnString(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{t('validation.targetConnString')}</label>
              <input
                type="text"
                value={targetConnString}
                onChange={(e) => setTargetConnString(e.target.value)}
              />
            </div>
          </div>

          <div className="options-grid">
            <label className="checkbox">
              <input
                type="checkbox"
                checked={config.rowCountValidation}
                onChange={(e) =>
                  setConfig({ ...config, rowCountValidation: e.target.checked })
                }
              />
              {t('validation.rowCountValidation')}
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={config.checksumValidation}
                onChange={(e) =>
                  setConfig({ ...config, checksumValidation: e.target.checked })
                }
              />
              {t('validation.checksumValidation')}
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={config.sampleComparison}
                onChange={(e) =>
                  setConfig({ ...config, sampleComparison: e.target.checked })
                }
              />
              {t('validation.sampleComparison')}
            </label>
          </div>

          {config.sampleComparison && (
            <div className="form-group">
              <label>{t('validation.sampleSize')}</label>
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
              />
            </div>
          )}

          <button
            className="btn primary large"
            onClick={handleStartValidation}
            disabled={loading}
          >
            {loading ? t('validation.validating') : t('validation.startValidation')}
          </button>
        </div>
      )}

      {results.length > 0 && (
        <div className="validation-results">
          <h2>{t('validation.resultsTitle')}</h2>

          <div className="summary">
            <div className="summary-item success">
              <span className="count">
                {results.filter((r) => r.status === 'success').length}
              </span>
              <span className="label">{t('validation.passed')}</span>
            </div>
            <div className="summary-item warning">
              <span className="count">
                {results.filter((r) => r.status === 'mismatch').length}
              </span>
              <span className="label">{t('validation.mismatch')}</span>
            </div>
            <div className="summary-item error">
              <span className="count">
                {results.filter((r) => r.status === 'error').length}
              </span>
              <span className="label">{t('validation.error')}</span>
            </div>
          </div>

          <div className="results-table">
            <table>
              <thead>
                <tr>
                  <th>{t('validation.status')}</th>
                  <th>{t('validation.tableName')}</th>
                  <th>{t('validation.sourceRows')}</th>
                  <th>{t('validation.targetRows')}</th>
                  <th>{t('validation.rowCountMatch')}</th>
                  <th>{t('validation.checksumMatch')}</th>
                  <th>{t('validation.sampleResult')}</th>
                  <th>{t('validation.duration')}</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.tableName} className={getStatusClass(result)}>
                    <td className="status-cell">
                      <span className={`status-icon ${getStatusClass(result)}`}>
                        {getStatusIcon(result)}
                      </span>
                    </td>
                    <td>{result.tableName}</td>
                    <td>{result.sourceRowCount.toLocaleString()}</td>
                    <td>{result.targetRowCount.toLocaleString()}</td>
                    <td>{result.rowCountMatch ? '✓' : '✗'}</td>
                    <td>{result.checksumMatch ? '✓' : '✗'}</td>
                    <td>
                      {result.sampleMatches}/{result.sampleMatches + result.sampleMismatches}
                    </td>
                    <td>{result.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button className="btn secondary" onClick={() => setResults([])}>
            {t('validation.revalidate')}
          </button>
        </div>
      )}
    </div>
  );
}
