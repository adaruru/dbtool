

### Create Table

```
CREATE TABLE "Stores" (
"StoreId" int4 NOT NULL,
"UniformNo" varchar NOT NULL,
"StoreName" varchar NOT NULL,
"Address" varchar NOT NULL,
"Tel" varchar NOT NULL,
"ProductPlanId" int4,
"PeriodStart" 133,
"PeriodEnd" 133,
"CreditCardNo" varchar,
"OAAccount" varchar,
"MessageApiChannelId" varchar,
"MessageApiChannelToken" varchar,
"MessageApiChannelSecret" varchar,
"LineLoginChannelSecret" varchar,
"ChannelId" varchar,
"LastDeductionTime" timestamptz,
"DeductionDay" int2,
"LastDeductionResult" bool,
"LastDeductionMsg" varchar,
"MerchantOrderNo" varchar,
"PeriodNo" varchar,
"AccessToken" varchar,
"TokenExpired" timestamptz,
"PlanAmount" numeric,
"DiscountAmount" numeric,
"PeriodAmt" numeric,
"CreateUserId" int4,
"CreateUser" varchar,
"CreateDate" timestamptz,
"ModiUserId" int4,
"ModiUser" varchar,
"ModiDate" timestamptz
)
```



### Empty Tables

```sql
-- 1. 刪掉 public schema（連同所有 table, view, sequence 等）
DROP SCHEMA public CASCADE;

-- 2. 重建 public schema
CREATE SCHEMA public;

-- 3. 可選：設定權限回預設
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

### Enum types

```sql

-- LaunchProgram
CREATE TYPE common.launch_program AS ENUM (
    'user_data_import',
    'dept_data_import',
    'test',
    'test_logger',
    'encrypt_tool'
);

-- WorkingDayEnum
CREATE TYPE common.working_day AS ENUM (
    'not_working_day',
    'working_day'
);

-- YesOrNoType
CREATE TYPE common.yes_or_no AS ENUM (
    'no',
    'yes'
);

-- BatchStatus
CREATE TYPE common.batch_status AS ENUM (
    'start',
    'running',
    'success',
    'error'
);

-- FtpType
CREATE TYPE common.ftp_type AS ENUM (
    'ftp',
    'sftp',
    'ftps'
);

-- ScopingType
CREATE TYPE common.scoping_type AS ENUM (
    'user',
    'store',
    'store_account',
    'customer_car'
);

-- ApprovalType
CREATE TYPE common.approval_type AS ENUM (
    'none',
    'insert',
    'update',
    'delete'
);

-- ApprovalStatusEnum
CREATE TYPE common.approval_status AS ENUM (
    'none',
    'wait_approve',
    'approved',
    'reject'
);

-- ReviewerType
CREATE TYPE common.reviewer_type AS ENUM (
    'user',
    'role'
);

-- ApprovalFunctionEnum
CREATE TYPE common.approval_function AS ENUM (
    'asset',
    'department'
);

-- DepartmentType
CREATE TYPE common.department_type AS ENUM (
    'itsower',
    'champion_reseller'
);

-- PlanEnum
CREATE TYPE common.plan_type AS ENUM (
    'free',
    'normal',
    'premium',
    'distributor_pay',
    'inactive'
);

-- PeriodEnum
CREATE TYPE common.period_type AS ENUM (
    'none',
    'monthly',
    'yearly'
);

-- WillingnessEnum
CREATE TYPE common.willingness AS ENUM (
    'unknown',
    'done',
    'low',
    'medium',
    'high'
);

-- VisitEnum
CREATE TYPE common.visit_type AS ENUM (
    'visit',
    'phone_visit'
);

-- TradeStatusEnum
CREATE TYPE common.trade_status AS ENUM (
    'unpaid',
    'payment_successful',
    'payment_failed',
    'payment_cancelled',
    'refunded'
);

-- CloseStatusEnum
CREATE TYPE common.close_status AS ENUM (
    'not_invoiced',
    'awaiting_submission',
    'invoicing_in_progress',
    'invoicing_completed'
);

-- BonusTypeEnum
CREATE TYPE common.bonus_type AS ENUM (
    'first_month_bonus',
    'monthly_bonus'
);

-- PeriodType（藍新）
CREATE TYPE common.period_schedule_type AS ENUM (
    'daily',
    'weekly',
    'monthly',
    'yearly'
);

-- PeriodStartType
CREATE TYPE common.period_start_type AS ENUM (
    'authorize_ten_immediately',
    'authorize_full_amount_immediately',
    'no_authorization'
);

-- AlterType
CREATE TYPE common.alter_type AS ENUM (
    'restart',
    'suspend',
    'terminate'
);

-- StatusEnum（預約狀態）
CREATE TYPE common.reservation_status AS ENUM (
    'waiting',
    'processing',
    'completed',
    'busy',
    'store_cancel',
    'customer_cancel'
);

-- ReservationPeriodEnum
CREATE TYPE common.reservation_period AS ENUM (
    'morning',
    'afternoon',
    'evening'
);

-- ExpandedPeriodEnum
CREATE TYPE common.expanded_period AS ENUM (
    'default',
    'dawn',
    'morning',
    'noon',
    'afternoon',
    'dusk',
    'evening',
    'night'
);

-- AbsorbMissingPeriodDirectionEnum
CREATE TYPE common.absorb_missing_period_direction AS ENUM (
    'default',
    'previous',
    'next'
);

-- WorkingdayHierarchyEnum
CREATE TYPE common.workingday_hierarchy AS ENUM (
    'default',
    'generic',
    'week_days',
    'stores_workingday'
);

-- GasolineType
CREATE TYPE common.gasoline_type AS ENUM (
    'none',
    'petrol',
    'diesel'
);

-- TaxType
CREATE TYPE common.tax_type AS ENUM (
    'none',
    'inclusive',
    'exclusive'
);

-- OilType
CREATE TYPE common.oil_type AS ENUM (
    'none',
    'motor_oil',
    'atf_oil',
    'brake_oil',
    'rear_axle_gear_oil',
    'cooler_oil',
    'intercooler_oil'
);

-- CustomerTelType
CREATE TYPE common.customer_tel_status AS ENUM (
    'none',
    'verified'
);

```

