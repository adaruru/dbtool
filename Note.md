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

### 可用的測試連線

Data Source=192.168.100.141,1436;Initial Catalog=LineCRM.CarCareSit;persist security info=True;user id=sa;password=html5!its;MultipleActiveResultSets=True;TrustServerCertificate=True

postgres://itsower:html5!its@localhost:5432/postgres?sslmode=disable

### SQLite CGO

`github.com/mattn/go-sqlite3` 依賴 CGO 進行編譯，當 CGO 被禁用時，它無法編譯，因此不能在無 CGO 環境中使用。


1. CGO_ENABLED=0
2. 交叉編譯（如 Linux → Alpine、Scratch、ARM）
3. 無法安裝系統層 SQLite / gcc（CI、容器、Serverless）

為了解決這個問題，必須使用 **純 Go 的 SQLite 驅動** (不需要 CGO 的套件)`modernc.org/sqlite v1.44.2`。

這個驅動完全不依賴 CGO，與 `database/sql` 相容，可直接替換原本的 SQLite 驅動，並且在任何環境下（包括容器化或交叉編譯）都能穩定運行。安裝方式只需在專案中加入依賴 `modernc.org/sqlite v1.44.2`，原本的 SQL 操作邏輯不需要修改。

### SSMS export Wizard

Driver={PostgreSQL Unicode};server=localhost;port=5432;database=LineCRM.CarCare;uid=itsower;pwd=html5!its

![image-20260120115201342](.attach/.Note/image-20260120115201342.png)

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



```sql
CREATE DATABASE "CRMTest2"
    WITH
    OWNER = itsower
    TEMPLATE = template0
    ENCODING = 'UTF8'
    LC_COLLATE = 'C'
    LC_CTYPE = 'C'
    LOCALE_PROVIDER = 'libc'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1
    IS_TEMPLATE = False;
    
CREATE DATABASE "LineCRM.CarCare3"
    WITH
    OWNER = itsower
    TEMPLATE = template0
    ENCODING = 'UTF8'
    LC_COLLATE = 'C'
    LC_CTYPE = 'C'
    LOCALE_PROVIDER = 'libc'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1
    IS_TEMPLATE = False;
```



## Export Order

-- ============================================

-- 第一層：無依賴的基礎資料表（最先匯入）

-- ============================================

1. ProductPlans
2. Tags
3. CarVenders
4. CarColors
5. OilsCarVenders
6. Menus
7. Roles



-- ============================================

-- 第二層：依賴第一層的資料表

-- ============================================

8. CarModels (依賴 CarVenders)
9. OilsCarModels (依賴 OilsCarVenders)
10. CrmStores (需要先有 Users，但形成循環依賴，見下方處理)



-- ============================================

-- 第三層：核心主表

-- ============================================

11. Departments (依賴 ApprovalDatas 和自身，形成循環，見下方處理)
12. ApprovalDatas (依賴 Users，形成循環)
13. Users (依賴 Departments，形成循環)



-- 循環依賴處理方案：

-- 步驟 1: 先建立 Departments（暫時停用 FK）

-- 步驟 2: 建立 ApprovalDatas（暫時停用 FK）

-- 步驟 3: 建立 Users（暫時停用 FK）

-- 步驟 4: 啟用所有 FK 約束



-- ============================================

-- 第四層：依賴 Users 的資料表

-- ============================================

14. --CrmStores (依賴 Users)
15. ActionLog (依賴 Users)
16. Agents (依賴 Users)
17. UserRoles (依賴 Users, Roles)
18. RoleMenus (依賴 Menus, Roles)



-- ============================================

-- 第五層：依賴多個第三/四層的資料表

-- ============================================

19. Stores (依賴 CrmStores, ProductPlans)
20. OilsCarYears (依賴 OilsCarModels)
21. RoleMenuDetails (依賴 RoleMenus)
22. MenuDetails (依賴 Menus)



-- ============================================

-- 第六層：依賴 Stores 的資料表

-- ============================================

23. Customers (依賴 Stores)
24. DeductionDatas (依賴 Stores)
25. Invoices (依賴 Stores)
26. ItemCategories (依賴 Stores)
27. MarketingTemplates (依賴 Stores)
28. NextReservations (依賴 Stores，也依賴 StoreCustomerCars，需二次處理)
29. PlanHistories (依賴 Stores, ProductPlans)
30. SalesDatas (依賴 Stores, ProductPlans, Users)
31. StoreAccounts (依賴 Stores, Users)
32. StoreCustomerCars (依賴 Stores, CarVenders, CarModels, CarColors)
33. StoreRelationTags (依賴 Stores, Tags)
34. StoreTags (依賴 Stores)



-- ============================================

-- 第七層：依賴第六層的資料表

-- ============================================

35. Items (依賴 ItemCategories)
36. ItemCategoryTags (依賴 ItemCategories, Tags)
37. Reservations (依賴 Customers)
38. CrmStoreVisits (依賴 CrmStores)
39. Oils (依賴 OilsCarYears)
40. CustomerCarTags (依賴 StoreCustomerCars, StoreTags)



-- ============================================

-- 第八層：工單系統（最後匯入）

-- ============================================

41. WorkOrders (依賴 StoreCustomerCars, Stores)
42. WorkOrderDetails (依賴 WorkOrders, ItemCategories, Items)



-- ============================================

-- 最後：更新 NextReservations 的 FK

-- ============================================

43. NextReservations (更新 StoreCustomerCarId FK)
