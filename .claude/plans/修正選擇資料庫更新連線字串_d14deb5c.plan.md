---
name: 修正選擇資料庫更新連線字串
overview: 修正 bug：當用戶從下拉選單選擇不同資料庫時，連線字串應同步更新以反映新的資料庫選擇。
todos:
  - id: helper-fn
    content: Connection.tsx - 新增 updateConnectionStringDatabase 輔助函數
    status: completed
  - id: onchange
    content: Connection.tsx - 修改資料庫選擇 onChange 更新連線字串
    status: completed
isProject: false
---

# 修正選擇資料庫更新連線字串

## 問題分析

目前當用戶選擇不同資料庫時，只更新了 `selectedDatabase` state，但 `connString` 沒有被修改。這導致儲存的連線字串與實際選擇的資料庫不一致。

## 連線字串格式

- **MSSQL**: `sqlserver://user:pass@host:port?database=xxx`
- **PostgreSQL**: `postgres://user:pass@host:port/dbname?sslmode=disable`

## 修改範圍

只需修改 **1 個檔案**：

### [frontend/src/pages/Connection.tsx](frontend/src/pages/Connection.tsx)

1. **新增輔助函數** `updateConnectionStringDatabase(connStr, dbType, newDatabase)`
  - 解析連線字串
  - MSSQL：更新或新增 `?database=xxx` 參數
  - PostgreSQL：更新路徑中的資料庫名稱 `/dbname`
2. **修改資料庫選擇的 onChange** (第 161-164 行)
  - 呼叫新函數更新 `connString`

## 實作細節

```typescript
// 新增函數
const updateConnectionStringDatabase = (connStr: string, type: DatabaseType, newDb: string): string => {
  if (type === 'mssql') {
    // sqlserver://user:pass@host:port?database=xxx
    const url = new URL(connStr);
    url.searchParams.set('database', newDb);
    return url.toString();
  } else {
    // postgres://user:pass@host:port/dbname?sslmode=disable
    const url = new URL(connStr);
    const pathParts = url.pathname.split('/');
    pathParts[1] = newDb; // 替換資料庫名稱
    url.pathname = pathParts.join('/');
    return url.toString();
  }
};

// 修改 onChange
onChange={(e) => {
  const newDb = e.target.value;
  setSelectedDatabase(newDb);
  const updatedConnStr = updateConnectionStringDatabase(connString, dbType, newDb);
  setConnString(updatedConnStr);
  updateConnectionDatabase(dbType, updatedConnStr, newDb);
}}
```

## 影響評估

- 修改範圍小，僅前端 1 個檔案
- 不影響後端邏輯
- 不影響既有儲存的連線

