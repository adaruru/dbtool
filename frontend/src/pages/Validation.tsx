import { useState } from 'react';
import { StartValidation } from '../../wailsjs/go/main/App';
import type { ValidationConfig, ValidationResult } from '../types';

export default function Validation() {
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
      <h1>資料驗證</h1>
      <p className="subtitle">驗證遷移後的資料完整性</p>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {results.length === 0 && (
        <div className="validation-config">
          <h2>驗證設定</h2>

          <div className="form-row">
            <div className="form-group">
              <label>來源連線字串 (MSSQL)</label>
              <input
                type="text"
                value={sourceConnString}
                onChange={(e) => setSourceConnString(e.target.value)}
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
              筆數驗證 (比對資料列數)
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={config.checksumValidation}
                onChange={(e) =>
                  setConfig({ ...config, checksumValidation: e.target.checked })
                }
              />
              Checksum 驗證 (表級別 hash)
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={config.sampleComparison}
                onChange={(e) =>
                  setConfig({ ...config, sampleComparison: e.target.checked })
                }
              />
              抽樣比對 (逐筆驗證)
            </label>
          </div>

          {config.sampleComparison && (
            <div className="form-group">
              <label>抽樣數量</label>
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
            {loading ? '驗證中...' : '開始驗證'}
          </button>
        </div>
      )}

      {results.length > 0 && (
        <div className="validation-results">
          <h2>驗證結果</h2>

          <div className="summary">
            <div className="summary-item success">
              <span className="count">
                {results.filter((r) => r.status === 'success').length}
              </span>
              <span className="label">通過</span>
            </div>
            <div className="summary-item warning">
              <span className="count">
                {results.filter((r) => r.status === 'mismatch').length}
              </span>
              <span className="label">不一致</span>
            </div>
            <div className="summary-item error">
              <span className="count">
                {results.filter((r) => r.status === 'error').length}
              </span>
              <span className="label">錯誤</span>
            </div>
          </div>

          <div className="results-table">
            <table>
              <thead>
                <tr>
                  <th>狀態</th>
                  <th>資料表</th>
                  <th>來源筆數</th>
                  <th>目標筆數</th>
                  <th>筆數一致</th>
                  <th>Checksum 一致</th>
                  <th>抽樣結果</th>
                  <th>耗時</th>
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
            重新驗證
          </button>
        </div>
      )}
    </div>
  );
}
