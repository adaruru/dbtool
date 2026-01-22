# Note

撰寫專案需要的技術說明

## DB 測試連線

Data Source=192.168.100.141,1436;Initial Catalog=LineCRM.CarCareSit;persist security info=True;user id=sa;password=html5!its;MultipleActiveResultSets=True;TrustServerCertificate=True;

postgres://itsower:html5!its@localhost:5432/postgres?sslmode=disable

## 前端 tech stack

- **React 19.2.0** - 主要 UI 框架
- **React DOM 19.2.0** - DOM 渲染
- **React Router DOM 7.12.0** - 路由管理

### 狀態管理

- **Zustand 5.0.10** - 輕量級狀態管理 (替代 Redux)

  Zustand 使用 **store** 來管理狀態，你可以直接從 store 讀取或修改狀態，而 React 元件會自動訂閱相關狀態，當狀態變化時自動更新。

  總結來說，Zustand 是 **簡單、高效、靈活的 React 狀態管理方案**，非常適合中小型專案或希望避免 Redux 繁瑣配置的場景。

### 數據獲取

- **TanStack React Query 5.90.17** - 服務端狀態管理和數據獲取

### 國際化

- **i18next 25.7.4** - 國際化核心
- **React-i18next 16.5.3** - React 的 i18n 整合

## 開發工具鏈

### 建置工具

- **Vite 7.2.4** - 現代前端建置工具 (快速 HMR)
- **TypeScript 5.9.3** - 類型安全的 JavaScript

### 代碼品質

- **ESLint 9.39.1** - 代碼檢查
- **TypeScript ESLint 8.46.4** - TS 專用 lint 規則

## 樣式方案

### CSS 方案

- **原生 CSS** - 沒有使用 UI 框架
- **CSS Variables** - 使用 CSS 自定義屬性做主題
- **自定義樣式系統** - 從 [App.css](vscode-file://vscode-app/c:/Users/AmandaChou/AppData/Local/Programs/Microsoft VS Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html) 看到自製的樣式系統

## 特色

**輕量級選擇**:

- ✅ 沒有使用重量級 UI 框架 (如 Material-UI, Ant Design)
- ✅ 使用 Zustand 而非 Redux (更簡潔)
- ✅ 使用 TanStack Query 做數據管理
- ✅ Vite 提供快速開發體驗

**現代化技術棧**:

- ✅ React 19 (最新版)
- ✅ TypeScript 支援
- ✅ 模組化 CSS
- ✅ 國際化支援

這是一個現代化、輕量級的技術棧，注重性能和開發體驗！

### SQLite CGO

`github.com/mattn/go-sqlite3` 依賴 CGO 進行編譯，當 CGO 被禁用時，它無法編譯，因此不能在無 CGO 環境中使用。


1. CGO_ENABLED=0
2. 交叉編譯（如 Linux → Alpine、Scratch、ARM）
3. 無法安裝系統層 SQLite / gcc（CI、容器、Serverless）

為了解決這個問題，必須使用 **純 Go 的 SQLite 驅動** (不需要 CGO 的套件)`modernc.org/sqlite v1.44.2`。

這個驅動完全不依賴 CGO，與 `database/sql` 相容，可直接替換原本的 SQLite 驅動，並且在任何環境下（包括容器化或交叉編譯）都能穩定運行。安裝方式只需在專案中加入依賴 `modernc.org/sqlite v1.44.2`，原本的 SQL 操作邏輯不需要修改。

Driver={PostgreSQL Unicode};server=localhost;port=5432;database=LineCRM.CarCare;uid=itsower;pwd=html5!its

![image-20260120115201342](.attach/.Note/image-20260120115201342.png)

ProductPlan

| 表               | 欄                   | 原始型別 | PostgreSQL 型別 | 錯誤原因                                   |
| ---------------- | -------------------- | -------- | --------------- | ------------------------------------------ |
| CrmStores        | IsDealed             | boolean  | boolean         | boolean 被當成 integer 傳入                |
| CrmStores        | (未知)               | (未知)   | integer         | 整數欄位被錯誤對應到字串/字元欄位 (Char[]) |
| CarModels        | (未知)               | (未知)   | integer         | 整數欄位被錯誤對應到字串/字元欄位 (Char[]) |
| CarVenders       | (未知)               | (未知)   | integer         | 整數欄位被錯誤對應到字串/字元欄位 (Char[]) |
| ProductPlan      | StartDate            | DateOnly | Date            | DateOnly 無法對應到 ODBC                   |
|                  | EndDate              | DateOnly | Date            |                                            |
| DeductionDatas   | FundTime             | DateOnly | Date            | DateOnly 無法對應到 ODBC                   |
|                  | PeriodStart          | DateOnly | Date            | DateOnly 無法對應到 ODBC                   |
|                  | PeriodEnd            | DateOnly | Date            | DateOnly 無法對應到 ODBC                   |
| NextReservations | NextReservationsDate | DateOnly | Date            | DateOnly 無法對應到 ODBC                   |
| Reservations     | ReservationDate      | DateOnly | Date            | DateOnly 無法對應到 ODBC                   |
| Stores           | PeriodStart          | DateOnly | Date            | DateOnly 無法對應到 ODBC                   |
|                  | PeriodEnd            | DateOnly | Date            | DateOnly 無法對應到 ODBC                   |
| WorkOrderDetails | NextReturnDate       | DateOnly | Date            | DateOnly 無法對應到 ODBC                   |
| WorkOrders       | OrderDate            | DateOnly | Date            | DateOnly 無法對應到 ODBC                   |



