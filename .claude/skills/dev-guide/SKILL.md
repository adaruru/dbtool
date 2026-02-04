---
name: dev-guide
description: 資料庫遷移工具的通用開發指南。提供專案架構、開發命令、關鍵程式碼位置、常見任務步驟。當使用者詢問如何開發、修改功能時使用。各目標 DB 的專屬指引請參考對應的 skill（postgresql、mysql、oracle 等）。
---

# 資料庫遷移工具 - 通用開發指引

## 專案技術棧

| 層級 | 技術 |
|------|------|
| 桌面框架 | Wails v2 |
| 後端 | Go |
| 前端 | React 19 + TypeScript + Zustand |
| 本地儲存 | SQLite (modernc.org/sqlite) |

## 開發命令

```bash
# 建置（含 debug）
wails build -debug -o AdaruDbTool.exe

# 前端開發
cd frontend && npm run dev
```

## 關鍵程式碼位置

| 功能 | 檔案 |
|------|------|
| Wails API | `app.go` |
| 遷移引擎 | `internal/migration/engine.go` |
| MSSQL 連線（來源） | `internal/connection/mssql.go` |
| 類型映射 | `internal/schema/converter/type_mapper.go` |
| SQLite 儲存 | `internal/storage/sqlite.go` |
| 遷移頁面 | `frontend/src/pages/Migration.tsx` |
| 狀態管理 | `frontend/src/stores/migrationStore.ts` |

## 常見任務

### 新增 Go API 方法

1. 在 `app.go` 新增方法（首字母大寫才會暴露給前端）
2. 執行 `wails build` 自動生成 TypeScript 綁定
3. 前端從 `wailsjs/go/main/App` 導入使用

### 修改遷移邏輯

1. 核心邏輯在 `internal/migration/engine.go`
2. `getTablestoMigrate()` — 取得遷移表格（按 IncludeTables 順序）
3. `migrateTableData()` — 單表資料遷移

### 修改前端 UI

1. 頁面在 `frontend/src/pages/`
2. 狀態管理用 Zustand，在 `frontend/src/stores/`
3. 類型定義在 `frontend/src/types/index.ts`

## 設計原則

1. **遷移順序**：按前端 UI 拖曳順序執行
2. **連線字串**：統一 URI 格式
3. **SQLite**：使用純 Go 版本，避免 CGO
4. **錯誤處理**：非關鍵錯誤記錄警告但不中斷
