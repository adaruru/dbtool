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
    
CREATE DATABASE "LineCRM.CarCare1"
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

### 實際 export

ProductPlans	dbo	0
Tags	dbo	1 
CarVenders	dbo	2
CarColors	dbo	3
OilsCarVenders	dbo	4
Menus	dbo	5
Roles	dbo	6
CarModels	dbo	7
OilsCarModels	dbo	8
CrmStores	dbo	9
Departments	dbo	10
Users	dbo	11
ActionLog	dbo	12
Agents	dbo	13
UserRoles	dbo	14
RoleMenus	dbo	15
Stores	dbo	16
OilsCarYears	dbo	17
RoleMenuDetails	dbo	18
MenuDetails	dbo	19
Customers	dbo	20
DeductionDatas	dbo	21
Invoices	dbo	22
ItemCategories	dbo	23
MarketingTemplates	dbo	24
NextReservations	dbo	25
PlanHistories	dbo	26
SalesDatas	dbo	27
StoreAccounts	dbo	28
StoreCustomerCars	dbo	29
StoreRelationTags	dbo	30
StoreTags	dbo	31 	
Items	dbo	32
ItemCategoryTags	dbo	33
Reservations	dbo	34
CrmStoreVisits	dbo	35
Oils	dbo	36
CustomerCarTags	dbo	37
WorkOrders	dbo	38
WorkOrderDetails	dbo	39
BatchLogs	dbo	40
Coupons	dbo	41
CustomerCoupons	dbo	42
NotifyHistory	dbo	43
NotifySettings	dbo	44
ReservationSettings	dbo	45
ReservationStatus	dbo	46
SalesBonusRates	dbo	47
SerialNumbers	dbo	48
Workingdays	dbo	49
ApprovalDatas	dbo	50

### Order script

```sqlite
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'ProductPlans', 'dbo', 0);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'Tags', 'dbo', 1);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'CarVenders', 'dbo', 2);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'CarColors', 'dbo', 3);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'OilsCarVenders', 'dbo', 4);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'Menus', 'dbo', 5);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'Roles', 'dbo', 6);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'CarModels', 'dbo', 7);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'OilsCarModels', 'dbo', 8);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'CrmStores', 'dbo', 9);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'Departments', 'dbo', 10);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'Users', 'dbo', 11);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'ActionLog', 'dbo', 12);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'Agents', 'dbo', 13);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'UserRoles', 'dbo', 14);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'RoleMenus', 'dbo', 15);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'Stores', 'dbo', 16);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'OilsCarYears', 'dbo', 17);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'RoleMenuDetails', 'dbo', 18);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'MenuDetails', 'dbo', 19);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'Customers', 'dbo', 20);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'DeductionDatas', 'dbo', 21);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'Invoices', 'dbo', 22);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'ItemCategories', 'dbo', 23);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'MarketingTemplates', 'dbo', 24);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'NextReservations', 'dbo', 25);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'PlanHistories', 'dbo', 26);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'SalesDatas', 'dbo', 27);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'StoreAccounts', 'dbo', 28);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'StoreCustomerCars', 'dbo', 29);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'StoreRelationTags', 'dbo', 30);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'StoreTags', 'dbo', 31);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'Items', 'dbo', 32);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'ItemCategoryTags', 'dbo', 33);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'Reservations', 'dbo', 34);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'CrmStoreVisits', 'dbo', 35);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'Oils', 'dbo', 36);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'CustomerCarTags', 'dbo', 37);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'WorkOrders', 'dbo', 38);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'WorkOrderDetails', 'dbo', 39);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'BatchLogs', 'dbo', 40);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'Coupons', 'dbo', 41);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'CustomerCoupons', 'dbo', 42);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'NotifyHistory', 'dbo', 43);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'NotifySettings', 'dbo', 44);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'ReservationSettings', 'dbo', 45);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'ReservationStatus', 'dbo', 46);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'SalesBonusRates', 'dbo', 47);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'SerialNumbers', 'dbo', 48);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'Workingdays', 'dbo', 49);
INSERT INTO migration_tables (migration_id, table_name, schema_name, migrate_order) VALUES('e45358cf-7f05-41a4-81e8-73c7560ce5d4', 'ApprovalDatas', 'dbo', 50);
```



### Fail 彙總

Tags	dbo	1  `failed`		

StoreTags	dbo	31  `failed`	

ItemCategoryTags	dbo	33  `failed`		

### 實際 error 

6	e45358cf-7f05-41a4-81e8-73c7560ce5d4	error	Failed to create table dbo.Tags: ERROR: syntax error at or near "," (SQLSTATE 42601)	dbo.Tags	failed			ERROR: syntax error at or near "," (SQLSTATE 42601)	2026-02-11 14:55:29.396487 +0800 CST m=+376.326695901

102	e45358cf-7f05-41a4-81e8-73c7560ce5d4	error	Failed to create table dbo.StoreTags: ERROR: syntax error at or near "," (SQLSTATE 42601)	dbo.StoreTags	failed			ERROR: syntax error at or near "," (SQLSTATE 42601)	2026-02-11 14:55:31.21187 +0800 CST m=+378.141626701

109	e45358cf-7f05-41a4-81e8-73c7560ce5d4	error	Failed to create table dbo.ItemCategoryTags: ERROR: syntax error at or near "," (SQLSTATE 42601)	dbo.ItemCategoryTags	failed			ERROR: syntax error at or near "," (SQLSTATE 42601)	2026-02-11 14:55:31.3318141 +0800 CST m=+378.261541001

173	e45358cf-7f05-41a4-81e8-73c7560ce5d4	error	Failed dbo.Tags: failed to insert batch at offset 0: statement description failed: ERROR: relation "dbo.Tags" does not exist (SQLSTATE 42P01)	dbo.Tags	failed	3	0	failed to insert batch at offset 0: statement description failed: ERROR: relation "dbo.Tags" does not exist (SQLSTATE 42P01)	2026-02-11 14:55:32.3951784 +0800 CST m=+379.324640401

204	e45358cf-7f05-41a4-81e8-73c7560ce5d4	error	Failed dbo.StoreTags: failed to insert batch at offset 0: statement description failed: ERROR: relation "dbo.StoreTags" does not exist (SQLSTATE 42P01)	dbo.StoreTags	failed	3	0	failed to insert batch at offset 0: statement description failed: ERROR: relation "dbo.StoreTags" does not exist (SQLSTATE 42P01)	2026-02-11 14:55:34.8043435 +0800 CST m=+381.733205301

207	e45358cf-7f05-41a4-81e8-73c7560ce5d4	error	Failed dbo.ItemCategoryTags: failed to insert batch at offset 0: statement description failed: ERROR: relation "dbo.ItemCategoryTags" does not exist (SQLSTATE 42P01)	dbo.ItemCategoryTags	failed	5	0	failed to insert batch at offset 0: statement description failed: ERROR: relation "dbo.ItemCategoryTags" does not exist (SQLSTATE 42P01)	2026-02-11 14:55:34.9033391 +0800 CST m=+381.832176301

### trial fix1 failed

結論: 是錯的，即便有這一段，仍然是失敗的，且失敗點甚至沒有任何變化，我先註解掉
顯然是 create 的 sql 有錯，修改再遇到錯誤的時候，寫入本地 log ，有問題的 sql 記錄下來，必須參考專案當前寫 log 的方式

**已做：** CREATE 失敗時會把「有問題的 DDL」寫入本地 log：`~/.adaru-db-tool/create_failed_YYYY-MM-DD.log`（與 app.go 的 error/success log 同目錄、日期檔名、append）。重跑遷移後請打開該檔查看實際送出的 SQL。

**CREATE syntax error at or near "," 可能原因：**
1. **DEFAULT 值**：MSSQL 的 default 定義（如 `CONVERT([bit],(0))`）含逗號，轉成 PG 時若未用括號包成單一運算式，逗號會被當成下一欄位。
2. **MapDefaultValue 未處理的運算式**：若 default 是其他函數/運算式（非 getdate/newid/convert/cast 等已處理項），原樣輸出可能含逗號或 PG 不支援語法。
3. **欄位名或型別**：理論上較少見，但若欄位名含逗號或型別字串被截斷，也可能造成解析錯誤。

Tags	dbo	1  `failed`		

StoreTags	dbo	31  `failed`	

ItemCategoryTags	dbo	33  `failed`		

            // 若預設值含逗號，必須用括號包成單一運算式，否則 PostgreSQL 會把逗號當成下一欄位 → syntax error at or near ","
            if strings.Contains(defaultVal, ",") {
                defaultVal = "(" + defaultVal + ")"
            }****
