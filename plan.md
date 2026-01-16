# MSSQL to PostgreSQL 資料庫遷移工具 - 實作計畫

## 專案概述

建立一個桌面應用程式，用於將 MSSQL 資料庫遷移到 PostgreSQL，包含完整的 schema 轉換、資料遷移和驗證功能。

## 技術選型

| 層級     | 技術                   | 說明                                          |
| -------- | ---------------------- | --------------------------------------------- |
| 桌面框架 | **Wails v2**           | Go 原生支援，自動生成 JS 綁定，編譯檔案約 8MB |
| 後端     | **Go**                 | 高效能資料庫操作，單一執行檔部署              |
| 前端     | **Vue 3 + TypeScript** | 響應式 UI，Pinia 狀態管理                     |
| 本地儲存 | **SQLite**             | 儲存遷移歷史、日誌、檢查點                    |

## 專案結構

```
MssqlToPostgresql/
├── build/                          # Wails 編譯輸出
├── frontend/                       # Vue.js 應用
│   ├── src/
│   │   ├── components/
│   │   │   ├── connection/         # 連線管理元件
│   │   │   ├── migration/          # 遷移操作元件
│   │   │   └── validation/         # 驗證結果元件
│   │   ├── views/                  # 頁面視圖
│   │   ├── stores/                 # Pinia stores
│   │   └── types/                  # TypeScript 類型
│   └── wailsjs/                    # 自動生成的 Go 綁定
├── internal/                       # Go 內部套件
│   ├── connection/                 # 資料庫連線管理
│   │   ├── mssql.go
│   │   └── postgres.go
│   ├── schema/                     # Schema 提取與轉換
│   │   ├── extractor/              # MSSQL schema 提取
│   │   ├── converter/              # 類型映射與 DDL 轉換
│   │   └── generator/              # PostgreSQL DDL 生成
│   ├── migration/                  # 資料遷移引擎
│   │   ├── engine.go               # 遷移協調器
│   │   ├── batch_processor.go      # 批次處理
│   │   └── rollback.go             # 回滾處理
│   ├── validation/                 # 資料驗證
│   │   ├── validator.go            # 驗證協調器
│   │   ├── checksum.go             # Checksum 驗證
│   │   └── row_comparison.go       # 逐筆比對
│   └── storage/                    # SQLite 儲存層
├── app.go                          # Wails 主應用 (暴露給前端的方法)
├── main.go                         # 程式進入點
├── go.mod
└── wails.json
```

## 核心功能模組

### 1. 連線管理

- 輸入 MSSQL 和 PostgreSQL 連線字串
- 連線測試功能
- 儲存連線歷史（加密儲存）

### 2. Schema 遷移（完整支援）

- **Tables**: 結構、主鍵、約束條件
- **Indexes**: 索引轉換
- **Views**: 視圖定義轉換
- **Stored Procedures**: T-SQL → PL/pgSQL 轉換（部分需人工審查）
- **Functions**: 函數轉換
- **Triggers**: 觸發器轉換

### 3. 資料類型映射

| MSSQL              | PostgreSQL             |
| ------------------ | ---------------------- |
| `int`              | `INTEGER`              |
| `bigint`           | `BIGINT`               |
| `bit`              | `BOOLEAN`              |
| `datetime`         | `TIMESTAMP(3)`         |
| `datetime2(n)`     | `TIMESTAMP(n)` (max 6) |
| `varchar(n)`       | `VARCHAR(n)`           |
| `varchar(max)`     | `TEXT`                 |
| `nvarchar(n)`      | `VARCHAR(n)`           |
| `uniqueidentifier` | `UUID`                 |
| `money`            | `NUMERIC(19,4)`        |
| `varbinary`        | `BYTEA`                |
| `int identity`     | `SERIAL`               |

### 4. 資料遷移引擎

- 批次處理（預設 10,000 筆/批）
- PostgreSQL COPY 協議（高效能批量插入）
- 檢查點機制（支援中斷續傳）
- 多表並行遷移
- 即時進度追蹤

### 5. 完整驗證功能

- **筆數驗證**: 來源與目標資料列數比對
- **Checksum 驗證**: 表級別 hash 比對
- **逐筆比對**: 抽樣資料詳細比較
- **Schema 比對**: 結構一致性檢查
- 驗證報告生成

## Go 依賴套件



```go
// 資料庫驅動
github.com/denisenkom/go-mssqldb    // MSSQL
github.com/jackc/pgx/v5              // PostgreSQL (高效能)
github.com/mattn/go-sqlite3          // SQLite

// 框架與工具
github.com/wailsapp/wails/v2         // 桌面框架
github.com/jmoiron/sqlx              // SQL 擴展
github.com/sirupsen/logrus           // 日誌
```

## 實作階段

### 階段 1: 專案初始化

-  初始化 Wails 專案 (`wails init`)
-  設定 Vue 3 + TypeScript 前端
-  建立 Go 專案結構
-  實作 SQLite 儲存層

### 階段 2: 連線管理

-  MSSQL 連線實作
-  PostgreSQL 連線實作
-  連線測試 API
-  前端連線表單 UI

### 階段 3: Schema 遷移

-  MSSQL schema 提取器
-  資料類型映射器
-  PostgreSQL DDL 生成器
-  Schema 預覽 UI

### 階段 4: 資料遷移

-  批次處理器（COPY 協議）
-  進度追蹤與事件發送
-  檢查點/續傳機制
-  遷移進度 UI

### 階段 5: 複雜物件轉換

-  View 遷移
-  Index 遷移
-  Trigger 轉換
-  Stored Procedure 轉換框架

### 階段 6: 驗證功能

-  筆數驗證
-  Checksum 驗證
-  抽樣比對
-  驗證報告 UI

## 關鍵檔案

| 檔案                                       | 說明                                 |
| ------------------------------------------ | ------------------------------------ |
| `app.go`                                   | Wails 主應用，暴露所有 Go 方法給前端 |
| `internal/schema/converter/type_mapper.go` | MSSQL → PostgreSQL 類型映射核心      |
| `internal/migration/batch_processor.go`    | 批次資料處理引擎                     |
| `internal/validation/validator.go`         | 驗證協調器                           |
| `internal/storage/sqlite.go`               | 本地儲存層                           |

## 驗證方式

1. **單元測試**: 類型映射、DDL 生成
2. **整合測試**: 使用 Docker 啟動 MSSQL 和 PostgreSQL 測試容器
3. **手動測試**:
   - 建立測試資料庫並執行完整遷移流程
   - 驗證 schema 正確性
   - 驗證資料一致性

## 注意事項

- **T-SQL 轉換限制**: 複雜的 Stored Procedures（含 GOTO、MERGE、動態 SQL）需要人工審查
- **DATETIME2(7)**: PostgreSQL TIMESTAMP 最大精度為 6，會自動截斷並警告
- **Spatial 類型**: 需要 PostGIS 擴展
- **Identity 欄位**: 遷移後需同步 Sequence 值

User approved the plan

計畫已通過！讓我開始實作。首先建立 todo 清單來追蹤進度。

**Update Todos**

- 初始化 Wails 專案 (wails init)
- 建立 Go 專案結構 (internal 目錄)
- 實作 SQLite 儲存層
- 實作資料庫連線管理 (MSSQL/PostgreSQL)
- 實作 Schema 提取與類型映射
- 實作資料遷移引擎
- 實作驗證功能
- 建立前端 UI 元件