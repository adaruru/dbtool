# Migration Rerun 設計方案

## 決策日期
2026-02-02

## 背景
用戶想要重現（Rerun）特定歷史遷移記錄時，需要決定使用新頁面還是現有頁面。

## 決策結果
**繼續使用 Migration.tsx**（複用現有頁面）

---

## 設計模式：Template-Based Creation

```
History.tsx                    Migration.tsx
┌─────────────────┐           ┌─────────────────┐
│  歷史記錄列表    │           │  遷移配置表單    │
│                 │  ──────>  │                 │
│  [重跑] 按鈕    │  帶參數    │  自動載入配置   │
└─────────────────┘           └─────────────────┘
```

---

## 核心理由

**Rerun 本質上是「用歷史配置預填表單」，不是新流程**

---

## 方案比較

| 考量 | 新頁面 MigrationRerun.tsx | 複用 Migration.tsx |
|------|---------------------------|---------------------|
| 代碼重複 | 高（80%+ 邏輯相同） | 無 |
| 維護成本 | 雙倍 | 單一 |
| 用戶學習 | 需學兩個介面 | 一致體驗 |
| 靈活性 | 只能原樣重跑 | 可修改後再跑 |

---

## 實作方式

### 1. History.tsx - 觸發重跑

```typescript
// 方式一：使用 location state
navigate('/migration', { state: { rerunId: migration.id } });

// 方式二：使用 URL 參數
navigate(`/migration?rerun=${migration.id}`);
```

### 2. Migration.tsx - 檢測並載入

```typescript
useEffect(() => {
  const rerunId = location.state?.rerunId || searchParams.get('rerun');
  if (rerunId) {
    loadMigrationConfig(rerunId); // 從 config_json + migration_tables 載入
  }
}, []);
```

### 3. 載入配置來源

| 資料 | 來源 |
|------|------|
| 連線設定 | `migrations.config_json` → `sourceConnectionId`, `targetConnectionId` |
| 選項設定 | `migrations.config_json` → `includeSchema`, `includeData`, `batchSize` 等 |
| 表格清單 | `migration_tables` → 依 `migrate_order` 排序 |

### 4. UI 提示（Rerun 模式）與多語系

- **所有 Rerun 相關 UI 文字必須走 i18n**，不可寫死中文或英文。
- 在 `frontend/src/locales/zh-TW.json` 與 `en.json` 新增 key，例如：
  - `migration.rerunBanner`：橫幅說明（如「正在重跑歷史遷移」）
  - `migration.rerunClear`：按鈕文字（如「清除並重新設定」）
- 使用方式：`t('migration.rerunBanner')`、`t('migration.rerunClear')`。

```typescript
const isRerunMode = !!rerunId;

return (
  <div>
    {isRerunMode && (
      <div className="bg-blue-50 p-3 rounded mb-4">
        {t('migration.rerunBanner')}: {originalMigrationName}
        <button onClick={clearRerun}>{t('migration.rerunClear')}</button>
      </div>
    )}
    {/* 現有表單... */}
  </div>
);
```

---

## 關注點分離：避免 Migration.tsx 過大

Rerun 的「檢測參數 → 載入配置 → 填入表單」若全寫在 Migration.tsx，會讓頁面元件職責過多、難以維護。建議**分化內容、分離關注點**如下。

### 方案：自訂 Hook + 輕量 UI 元件

| 職責 | 放置位置 | 說明 |
|------|-----------|------|
| Rerun 參數解析與載入邏輯 | `useRerunMigration(id)` | 從 URL/state 取 rerunId、呼叫 API、回傳 config + tables + loading/error |
| 將歷史配置套用到表單 | 同上或 `Migration.tsx` 內 | Hook 回傳 `applyConfig(config)`，頁面在 useEffect 呼叫一次 |
| Rerun 橫幅 UI | `RerunBanner.tsx` | 僅負責「正在重跑：{name}」+「清除」按鈕，文字用 `t()` |
| 頁面組合 | `Migration.tsx` | 只做：用 `useRerunMigration()`、渲染 `<RerunBanner />`、渲染既有的配置/表單區塊 |

### 建議目錄與檔案

```
frontend/src/
├── hooks/
│   └── useRerunMigration.ts   # 輸入：rerunId；輸出：config, tables, load, apply, clear
├── components/
│   └── migration/
│       └── RerunBanner.tsx    # 僅 Rerun 模式橫幅，多語系用 t()
└── pages/
    └── Migration.tsx          # 薄頁面：用 hook + RerunBanner + 既有表單
```

### useRerunMigration 介面（建議）

```typescript
// useRerunMigration.ts
function useRerunMigration(rerunId: string | null): {
  isRerunMode: boolean;
  originalName: string | null;
  isLoading: boolean;
  error: string | null;
  applyConfig: (config: MigrationConfig, tables: string[]) => void;
  clearRerun: () => void;
} {
  // 檢測 rerunId、呼叫 GetMigration + GetMigrationTables、解析 config_json
  // applyConfig 供 Migration 在載入完成後填入表單
  // clearRerun 清除 URL/state 並重置表單相關 state
}
```

### Migration.tsx 使用方式（精簡）

```typescript
// Migration.tsx 僅負責組合，不塞入大量載入邏輯
const rerunId = searchParams.get('rerun') ?? location.state?.rerunId ?? null;
const rerun = useRerunMigration(rerunId);

useEffect(() => {
  if (rerun.isRerunMode && rerun.config && rerun.tables) {
    rerun.applyConfig(rerun.config, rerun.tables);
  }
}, [rerun.isRerunMode, rerun.config, rerun.tables]);

return (
  <>
    {rerun.isRerunMode && (
      <RerunBanner name={rerun.originalName} onClear={rerun.clearRerun} />
    )}
    {/* 既有表單與按鈕 */}
  </>
);
```

- **效果**：Rerun 的「如何載入、如何套用」集中在 hook，「如何顯示橫幅」集中在 RerunBanner，Migration.tsx 維持薄層、易讀易測。

---

## 資料流程

```
┌─────────────────────────────────────────────────────────────┐
│ History.tsx                                                  │
│   點擊 [重跑] → navigate('/migration?rerun=xxx')            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Migration.tsx                                                │
│   1. 檢測 rerunId 參數                                       │
│   2. 呼叫 API 取得歷史配置                                   │
│      - GET /api/migrations/{id} → config_json               │
│      - GET /api/migrations/{id}/tables → migration_tables   │
│   3. 填入表單                                                │
│      - 根據 sourceConnectionId 選擇來源連線                  │
│      - 根據 targetConnectionId 選擇目標連線                  │
│      - 載入表格清單（依 migrate_order 排序）                 │
│      - 載入選項設定                                          │
│   4. 用戶可修改配置後執行，或直接執行                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 業界參考

此設計模式常見於：
- GitHub Actions：「Re-run workflow」
- Jenkins：「Rebuild with same parameters」
- GitLab CI：「Retry」

---

## 範圍評估：可否一次實作完成？

**結論：可以一次完成。** 規模屬中小型，約 2 個後端方法、2 個新檔案、4 個修改檔案，預估總變更約 200 行內。

| 區塊 | 項目 | 預估 | 備註 |
|------|------|------|------|
| 後端 | app.go 暴露 GetMigration(id)、GetMigrationTables(id) | ~15 行 | Storage 已有實作，僅包一層 |
| 前端 | hooks/useRerunMigration.ts | ~80–100 行 | 呼叫 Wails API、回傳 config/tables/clearRerun |
| 前端 | components/migration/RerunBanner.tsx | ~25 行 | 橫幅 + 清除按鈕，i18n |
| 前端 | Migration.tsx 整合 | ~40 行 | 取 rerunId、用 hook、useEffect 套用、渲染 RerunBanner |
| 前端 | History.tsx 重跑按鈕 | ~15 行 | 按鈕 + navigate 帶參數 |
| 前端 | locales zh-TW.json / en.json | 各 2 key | migration.rerunBanner、rerunClear、history.rerun |

**依賴關係：** 後端 API → hook 呼叫 → Migration/History 使用；無循環依賴，可單一 PR 完成。

**若希望分階段：**
- **Phase 1**：後端 API + History 按鈕 + Migration 用 URL 參數載入（邏輯先寫在 Migration，約 50 行），可先跑通流程。
- **Phase 2**：抽 useRerunMigration、RerunBanner、i18n，重構為目前設計。

---

## 待實作項目

### 後端
- [ ] app.go 暴露 GetMigration(id)（內部呼叫 storage.GetMigration，回傳含 config_json 的 MigrationRecord）
- [ ] app.go 暴露 GetMigrationTables(id)（內部呼叫 storage.GetTableMigrations）
- [ ] 執行 `wails generate` 更新前端綁定

### 前端 - 關注點分離
- [ ] 新增 `hooks/useRerunMigration.ts`：解析 rerunId、呼叫 GetMigration + GetMigrationTables、回傳 config / tables / originalName / clearRerun
- [ ] 新增 `components/migration/RerunBanner.tsx`：僅負責 Rerun 橫幅 UI（多語系 t()）
- [ ] Migration.tsx 整合：從 URL/state 取 rerunId、使用 hook、useEffect 套用 config/tables 到表單、渲染 RerunBanner

### 前端 - 多語系
- [ ] zh-TW.json / en.json 新增 key：`migration.rerunBanner`、`migration.rerunClear`、`history.rerun`
- [ ] RerunBanner 及 History「重跑」按鈕文字一律使用 `t()`

### 前端 - 流程
- [ ] History.tsx 新增「重跑」按鈕（t('history.rerun')），navigate 帶 rerun 參數
- [ ] 套用 config 時：依 sourceConnectionId / targetConnectionId 設定連線選單；依 migration_tables 與 migrate_order 還原表格清單
