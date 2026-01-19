import React from 'react';
import { useThemeStore } from '../stores/themeStore';

const ThemeTest: React.FC = () => {
  const { mode, effectiveTheme, setMode } = useThemeStore();

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-bold text-text-primary">主題測試</h2>
      
      <div className="space-y-2">
        <p className="text-text-primary">
          當前模式: <strong>{mode}</strong>
        </p>
        <p className="text-text-primary">
          有效主題: <strong>{effectiveTheme}</strong>
        </p>
        <p className="text-text-primary">
          HTML classes: <strong>{document.documentElement.className || '無'}</strong>
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setMode('light')}
          className={`px-4 py-2 rounded text-sidebar-text-active ${
            mode === 'light' 
              ? 'bg-accent hover:bg-accent-hover' 
              : 'bg-text-muted hover:bg-text-secondary'
          }`}
        >
          亮色
        </button>
        <button
          onClick={() => setMode('dark')}
          className={`px-4 py-2 rounded text-sidebar-text-active ${
            mode === 'dark' 
              ? 'bg-accent hover:bg-accent-hover' 
              : 'bg-text-muted hover:bg-text-secondary'
          }`}
        >
          暗色
        </button>
        <button
          onClick={() => setMode('system')}
          className={`px-4 py-2 rounded text-sidebar-text-active ${
            mode === 'system' 
              ? 'bg-accent hover:bg-accent-hover' 
              : 'bg-text-muted hover:bg-text-secondary'
          }`}
        >
          跟隨系統
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-card-bg border border-border rounded">
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            卡片示例
          </h3>
          <p className="text-text-secondary">
            這是一個測試卡片，用來檢查顏色在不同主題下的顯示。
          </p>
        </div>

        <div className="p-4 bg-panel-bg border border-border rounded">
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            面板示例
          </h3>
          <p className="text-text-muted">
            這是一個面板示例，顯示次要文本顏色。
          </p>
        </div>
      </div>

      <div className="p-4 bg-success-bg border border-success-border rounded">
        <p className="text-success">成功樣式測試</p>
      </div>

      <div className="p-4 bg-error-bg border border-error-border rounded">
        <p className="text-error">錯誤樣式測試</p>
      </div>
    </div>
  );
};

export default ThemeTest;