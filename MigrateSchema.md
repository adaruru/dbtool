# Migrate Schema & Migrate Data 完整流程

## 前端觸發流程

```
┌─────────────────────────────────────────────────────────────────┐
│ 使用者點擊「開始遷移」按鈕                                        │
│ Migration.tsx:130-167  handleStartMigration()                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 組裝 MigrationConfig                                            │
│ Migration.tsx:145-160                                           │
│ ├── includeSchema: options.includeSchema     (line 150)         │
│ ├── includeData: options.includeData         (line 151)         │
│ └── includeTables: orderedTables             (line 152)         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 呼叫 Store                                                       │
│ Migration.tsx:163  await startMigration(config, migrationName)  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Zustand Store 處理                                               │
│ migrationStore.ts:80-94  startMigration()                       │
│ ├── 設定事件監聽器        (line 84)                              │
│ └── 呼叫 Wails API        (line 86)                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Wails API (Go 後端)                                              │
│ app.go:219-240  StartMigration()                                │
│ ├── 建立 Engine           (line 221)                             │
│ ├── 設定 Config           (line 224)                             │
│ ├── 建立遷移記錄          (line 229)                             │
│ └── 啟動遷移              (line 235)                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    （進入後端遷移流程）
```

### 前端檔案索引

| 功能 | 檔案 | 行數 | 說明 |
|------|------|------|------|
| 開始遷移按鈕 | Migration.tsx | 130-167 | `handleStartMigration()` |
| 組裝 Config | Migration.tsx | 145-160 | 建立 `MigrationConfig` 物件 |
| Include Schema 選項 | Migration.tsx | 47-48 | `options.includeSchema` 預設 true |
| Include Data 選項 | Migration.tsx | 48-49 | `options.includeData` 預設 true |
| 表格順序處理 | Migration.tsx | 141-143 | `orderedTables` 按拖曳順序 |
| Store startMigration | migrationStore.ts | 80-94 | 呼叫 Wails API |
| 事件監聽設定 | migrationStore.ts | 217-255 | `setupEventListeners()` |
| Wails API 入口 | app.go | 219-240 | `StartMigration()` |

### 前端選項對應後端 Config

| 前端選項 | Migration.tsx 行數 | Config 屬性 | 後端判斷位置 |
|----------|-------------------|-------------|--------------|
| ☑ Include Schema | 47, 150 | `IncludeSchema` | engine.go:145 |
| ☑ Include Data | 48, 151 | `IncludeData` | engine.go:154 |
| ☑ Drop Target If Exists | 54, 159 | `DropTargetIfExists` | engine.go:274 |
| Batch Size | 55, 157 | `BatchSize` | engine.go:73-74 |

---

## 後端流程總覽

```
┌─────────────────────────────────────────────────────────────────┐
│                        開始遷移                                  │
│                    engine.go:84-125                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. 連線來源 MSSQL          engine.go:102-112                   │
│  2. 連線目標 PostgreSQL     engine.go:115-119                   │
│  3. 取得遷移表格清單        engine.go:132, 188-247              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Phase 1: Schema Migration   engine.go:145-151                   │
│ ☑ Include Schema                                                │
│ 建立表格結構、索引                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ （依序執行，Phase 1 完成後才執行 Phase 2）
┌─────────────────────────────────────────────────────────────────┐
│ Phase 2: Data Migration     engine.go:154-160                   │
│ ☑ Include Data                                                  │
│ 批次遷移資料（COPY 協議）                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ （依序執行，Phase 2 完成後才執行 Phase 3）
┌─────────────────────────────────────────────────────────────────┐
│ Phase 3: Foreign Keys       engine.go:163-168                   │
│ ☑ Include Schema                                                │
│ 建立外鍵約束                                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        遷移完成                                  │
│                    engine.go:177-185                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Migrate Schema（勾選 Include Schema）

### 主流程：`migrateSchema()`
**檔案**：`internal/migration/engine.go:250-305`

```
對每個表格執行：
├── 1. 取得表格詳細資訊    engine.go:262-266
├── 2. 建立 Schema         engine.go:269-271
├── 3. 刪除目標表（選填）  engine.go:274-278
├── 4. 建立表格            engine.go:281-285
└── 5. 建立索引            engine.go:288-293
```

### 詳細步驟

#### Step 1: 取得表格詳細資訊
| 行數 | 檔案 | 說明 |
|------|------|------|
| 262-266 | engine.go | 呼叫 `sourceConn.GetTableDetails()` |
| | mssql.go | 從 MSSQL 取得欄位、主鍵、索引、外鍵資訊 |

#### Step 2: 建立 Schema（如不存在）
| 行數 | 檔案 | 說明 |
|------|------|------|
| 269-271 | engine.go | 呼叫 `targetConn.CreateSchema()` |
| 106-108 | postgres.go | 執行 `CREATE SCHEMA IF NOT EXISTS` |

#### Step 3: 刪除目標表（如勾選 dropTargetIfExists）
| 行數 | 檔案 | 說明 |
|------|------|------|
| 274-278 | engine.go | 呼叫 `targetConn.DropTableIfExists()` |
| 271-276 | postgres.go | 執行 `DROP TABLE IF EXISTS ... CASCADE` |

#### Step 4: 建立表格
| 行數 | 檔案 | 說明 |
|------|------|------|
| 281 | engine.go | 呼叫 `typeMapper.GenerateCreateTableDDL()` |
| 321-347 | type_mapper.go | 產生 `CREATE TABLE` DDL |
| 33-215 | type_mapper.go | `MapType()` - MSSQL → PostgreSQL 類型映射 |
| 293-319 | type_mapper.go | `GenerateColumnDDL()` - 產生欄位定義 |
| 282-285 | engine.go | 呼叫 `targetConn.ExecuteDDL()` 執行 DDL |
| 112-114 | postgres.go | 執行 DDL 語句 |

#### Step 5: 建立索引
| 行數 | 檔案 | 說明 |
|------|------|------|
| 288-293 | engine.go | 迴圈處理每個索引 |
| 289 | engine.go | 呼叫 `typeMapper.GenerateIndexDDL()` |
| 349-371 | type_mapper.go | 產生 `CREATE INDEX` DDL |
| 290-292 | engine.go | 執行索引 DDL |

---

## Phase 2: Migrate Data（勾選 Include Data）

### 主流程：`migrateData()`
**檔案**：`internal/migration/engine.go:307-342`

```
├── 1. 計算總行數          engine.go:309-317
└── 2. 對每個表格執行 migrateTableData()
        engine.go:320-339
```

### 單表資料遷移：`migrateTableData()`
**檔案**：`internal/migration/engine.go:344-465`

```
├── 1. 初始化表格狀態      engine.go:349-358
├── 2. 取得表格詳細資訊    engine.go:361-364
├── 3. 準備欄位清單        engine.go:367-379
├── 4. 停用觸發器          engine.go:382-384
├── 5. 批次遷移迴圈        engine.go:390-433
│      ├── 從來源讀取批次  engine.go:400-403
│      ├── 使用 COPY 插入  engine.go:416-419
│      └── 更新進度        engine.go:425-432
├── 6. 啟用觸發器          engine.go:436-438
├── 7. 同步 Sequence       engine.go:441-447
└── 8. 標記完成            engine.go:450-463
```

### 詳細步驟

#### Step 1: 初始化表格狀態
| 行數 | 檔案 | 說明 |
|------|------|------|
| 349-358 | engine.go | 設定 CurrentTable、建立 TableState |

#### Step 2: 取得表格詳細資訊
| 行數 | 檔案 | 說明 |
|------|------|------|
| 361-364 | engine.go | 呼叫 `sourceConn.GetTableDetails()` |

#### Step 3: 準備欄位清單
| 行數 | 檔案 | 說明 |
|------|------|------|
| 367-374 | engine.go | 建立欄位清單（含 `[]` 括號）|
| 371-373 | engine.go | 找出主鍵欄位作為排序依據 |
| 377-379 | engine.go | 如無主鍵，用第一欄排序 |

#### Step 4: 停用觸發器
| 行數 | 檔案 | 說明 |
|------|------|------|
| 382-384 | engine.go | 呼叫 `targetConn.DisableTriggers()` |
| 150-157 | postgres.go | 執行 `ALTER TABLE ... DISABLE TRIGGER ALL` |

#### Step 5: 批次遷移迴圈
| 行數 | 檔案 | 說明 |
|------|------|------|
| 390-433 | engine.go | 無限迴圈直到資料讀完 |
| 400-403 | engine.go | 呼叫 `sourceConn.ReadBatch()` 讀取批次 |
| 405-407 | engine.go | 如無資料則跳出迴圈 |
| 410-413 | engine.go | 準備 PostgreSQL 欄位名稱（無括號）|
| **416-419** | **engine.go** | **呼叫 `targetConn.CopyFrom()` 插入資料** |
| 134-148 | postgres.go | **使用 PostgreSQL COPY 協議高效插入** |
| 421-422 | engine.go | 更新已遷移行數 |
| 425-430 | engine.go | 更新狀態 |
| 432 | engine.go | 發送進度事件 |

#### Step 6: 啟用觸發器
| 行數 | 檔案 | 說明 |
|------|------|------|
| 436-438 | engine.go | 呼叫 `targetConn.EnableTriggers()` |
| 159-166 | postgres.go | 執行 `ALTER TABLE ... ENABLE TRIGGER ALL` |

#### Step 7: 同步 Sequence（Identity 欄位）
| 行數 | 檔案 | 說明 |
|------|------|------|
| 441-447 | engine.go | 對每個 Identity 欄位呼叫 `SyncSequence()` |
| 180-197 | postgres.go | 執行 `setval(pg_get_serial_sequence(...))` |

#### Step 8: 標記完成
| 行數 | 檔案 | 說明 |
|------|------|------|
| 450-455 | engine.go | 更新 TableState 狀態為 Completed |
| 457-461 | engine.go | 發送 `migration:table-complete` 事件 |
| 463 | engine.go | 記錄完成日誌 |

---

## Phase 3: Create Foreign Keys

### 主流程：`createForeignKeys()`
**檔案**：`internal/migration/engine.go:467-483`

| 行數 | 檔案 | 說明 |
|------|------|------|
| 469-472 | engine.go | 取得表格詳細資訊 |
| 475-480 | engine.go | 對每個 FK 產生並執行 DDL |
| 476 | engine.go | 呼叫 `typeMapper.GenerateForeignKeyDDL()` |
| 373-410 | type_mapper.go | 產生 `ALTER TABLE ADD CONSTRAINT FOREIGN KEY` |
| 477-479 | engine.go | 執行 FK DDL |

---

## 類型映射速查

**檔案**：`internal/schema/converter/type_mapper.go:33-215`

| MSSQL | PostgreSQL | 行數 |
|-------|------------|------|
| bigint | BIGINT / BIGSERIAL | 38-42 |
| int | INTEGER / SERIAL | 44-48 |
| smallint | SMALLINT / SMALLSERIAL | 50-54 |
| tinyint | SMALLINT | 56-61 |
| bit | BOOLEAN | 63-64 |
| decimal, numeric | NUMERIC(p,s) | 66-70 |
| money | NUMERIC(19,4) | 72-73 |
| float | REAL / DOUBLE PRECISION | 79-83 |
| date | DATE | 89-90 |
| datetime | TIMESTAMP(3) | 98-99 |
| datetime2(n) | TIMESTAMP(n) max 6 | 101-108 |
| varchar(n) | VARCHAR(n) | 129-137 |
| varchar(max) | TEXT | 130-133 |
| nvarchar(n) | VARCHAR(n/2) | 151-161 |
| nvarchar(max) | TEXT | 152-155 |
| uniqueidentifier | UUID | 177-178 |
| varbinary | BYTEA | 170-171 |
| xml | XML | 180-181 |

---

## 關鍵函數索引

| 函數 | 檔案 | 行數 | 說明 |
|------|------|------|------|
| `Start()` | engine.go | 84-125 | 開始遷移 |
| `runMigration()` | engine.go | 128-186 | 執行遷移流程 |
| `getTablestoMigrate()` | engine.go | 188-247 | 取得遷移表格（按順序）|
| `migrateSchema()` | engine.go | 250-305 | Schema 遷移 |
| `migrateData()` | engine.go | 307-342 | 資料遷移主流程 |
| `migrateTableData()` | engine.go | 344-465 | 單表資料遷移 |
| `createForeignKeys()` | engine.go | 467-483 | 建立外鍵 |
| `MapType()` | type_mapper.go | 33-215 | 類型映射 |
| `GenerateCreateTableDDL()` | type_mapper.go | 321-347 | 產生 CREATE TABLE |
| `GenerateIndexDDL()` | type_mapper.go | 349-371 | 產生 CREATE INDEX |
| `GenerateForeignKeyDDL()` | type_mapper.go | 373-410 | 產生 FK DDL |
| `CopyFrom()` | postgres.go | 134-148 | COPY 協議插入 |
| `SyncSequence()` | postgres.go | 180-197 | 同步 Sequence |
