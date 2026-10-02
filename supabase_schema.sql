-- ==============================================================================
-- MI'AAWAA BAKERY MANAGEMENT SYSTEM
-- PostgreSQL / Supabase Schema with Row Level Security (RLS)
-- Coka Main Branch & Mizan Retail Branch
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
CREATE TYPE user_role AS ENUM ('owner', 'manager', 'production', 'sales');
CREATE TYPE branch_id AS ENUM ('coka', 'mizan');
CREATE TYPE branch_scope AS ENUM ('coka', 'mizan', 'both');
CREATE TYPE delivery_status AS ENUM ('dispatched', 'received', 'discrepancy');
CREATE TYPE cash_handover_status AS ENUM ('counted', 'collected_in_transit', 'confirmed_by_manager');
CREATE TYPE payment_method AS ENUM ('cash', 'digital');
CREATE TYPE expense_category AS ENUM ('transport', 'utilities', 'maintenance', 'packaging', 'ingredients', 'other');

-- 3. BRANCHES TABLE
CREATE TABLE IF NOT EXISTS branches (
    id branch_id PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    is_main_center BOOLEAN DEFAULT FALSE,
    address TEXT,
    phone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO branches (id, name, is_main_center, address, phone) VALUES
('coka', 'Coka Branch (Main Center)', TRUE, 'Coka Center, Oromia', '+251 22 110 0001'),
('mizan', 'Mizan Branch (Retail Point)', FALSE, 'Mizan Commercial District', '+251 22 110 0002')
ON CONFLICT (id) DO NOTHING;

-- 4. USER PROFILES (EMAIL-FREE USERNAME AUTHENTICATION)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(64) NOT NULL,
    role user_role NOT NULL,
    branch branch_scope NOT NULL DEFAULT 'both',
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. APP SETTINGS & BRANDING
CREATE TABLE IF NOT EXISTS app_settings (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'global',
    bakery_name VARCHAR(150) NOT NULL DEFAULT 'Mi''aawaa Bakery',
    logo_url TEXT,
    default_language VARCHAR(10) NOT NULL DEFAULT 'en',
    supported_languages TEXT[] DEFAULT ARRAY['en', 'om', 'am'],
    business_timezone VARCHAR(50) DEFAULT 'Africa/Addis_Ababa',
    currency VARCHAR(10) DEFAULT 'ETB',
    business_date DATE DEFAULT CURRENT_DATE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. INGREDIENTS TABLE
CREATE TABLE IF NOT EXISTS ingredients (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    name_om VARCHAR(100) NOT NULL,
    name_am VARCHAR(100) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    current_stock NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    min_stock_alert NUMERIC(12, 2) NOT NULL DEFAULT 10,
    unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price > 0),
    expected_yield INT NOT NULL DEFAULT 200,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. PRODUCT TRANSLATIONS
CREATE TABLE IF NOT EXISTS product_translations (
    product_id VARCHAR(50) REFERENCES products(id) ON DELETE CASCADE,
    language_code VARCHAR(10) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    PRIMARY KEY (product_id, language_code)
);

-- 9. RECIPES & RECIPE INGREDIENTS
CREATE TABLE IF NOT EXISTS recipes (
    id VARCHAR(50) PRIMARY KEY,
    product_id VARCHAR(50) REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id VARCHAR(50) REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_id VARCHAR(50) REFERENCES ingredients(id),
    quantity NUMERIC(10, 3) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    is_packaging BOOLEAN DEFAULT FALSE
);

-- 10. PRODUCTION BATCHES & ITEMS
CREATE TABLE IF NOT EXISTS production_batches (
    id VARCHAR(50) PRIMARY KEY,
    batch_number VARCHAR(100) UNIQUE NOT NULL,
    production_date DATE NOT NULL DEFAULT CURRENT_DATE,
    product_id VARCHAR(50) REFERENCES products(id),
    total_produced INT NOT NULL CHECK (total_produced >= 0),
    rejected_qty INT NOT NULL DEFAULT 0 CHECK (rejected_qty >= 0),
    saleable_qty INT GENERATED ALWAYS AS (total_produced - rejected_qty) STORED,
    status VARCHAR(20) DEFAULT 'completed',
    notes TEXT,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id VARCHAR(50) REFERENCES production_batches(id) ON DELETE CASCADE,
    ingredient_id VARCHAR(50) REFERENCES ingredients(id),
    quantity_used NUMERIC(10, 3) NOT NULL,
    unit VARCHAR(20) NOT NULL
);

-- 11. DELIVERIES & DISPATCH
CREATE TABLE IF NOT EXISTS deliveries (
    id VARCHAR(50) PRIMARY KEY,
    delivery_number VARCHAR(100) UNIQUE NOT NULL,
    delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
    dispatch_time VARCHAR(20) NOT NULL,
    batch_id VARCHAR(50) REFERENCES production_batches(id),
    product_id VARCHAR(50) REFERENCES products(id),
    from_branch branch_id NOT NULL DEFAULT 'coka',
    to_branch branch_id NOT NULL,
    dispatch_qty INT NOT NULL CHECK (dispatch_qty > 0),
    received_qty INT,
    damaged_missing_qty INT DEFAULT 0,
    status delivery_status NOT NULL DEFAULT 'dispatched',
    dispatched_by UUID REFERENCES user_profiles(id),
    received_by UUID REFERENCES user_profiles(id),
    received_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. SALES TRANSACTIONS
CREATE TABLE IF NOT EXISTS sales (
    id VARCHAR(50) PRIMARY KEY,
    sale_number VARCHAR(100) UNIQUE NOT NULL,
    sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
    branch branch_id NOT NULL,
    product_id VARCHAR(50) REFERENCES products(id),
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL,
    discount NUMERIC(10, 2) DEFAULT 0,
    total_amount NUMERIC(10, 2) NOT NULL,
    payment_method payment_method NOT NULL DEFAULT 'cash',
    recorded_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. DAILY CLOSINGS
CREATE TABLE IF NOT EXISTS daily_closings (
    id VARCHAR(50) PRIMARY KEY,
    closing_date DATE NOT NULL DEFAULT CURRENT_DATE,
    branch branch_id NOT NULL,
    opening_cash NUMERIC(12, 2) DEFAULT 0,
    cash_sales NUMERIC(12, 2) DEFAULT 0,
    other_cash_receipts NUMERIC(12, 2) DEFAULT 0,
    authorized_cash_expenses NUMERIC(12, 2) DEFAULT 0,
    authorized_cash_refunds NUMERIC(12, 2) DEFAULT 0,
    expected_cash NUMERIC(12, 2) NOT NULL,
    actual_cash_counted NUMERIC(12, 2) NOT NULL,
    cash_discrepancy NUMERIC(12, 2) NOT NULL,
    cash_discrepancy_reason TEXT,
    digital_payments_total NUMERIC(12, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'submitted',
    submitted_by UUID REFERENCES user_profiles(id),
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

CREATE TABLE IF NOT EXISTS closing_stock_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    closing_id VARCHAR(50) REFERENCES daily_closings(id) ON DELETE CASCADE,
    product_id VARCHAR(50) REFERENCES products(id),
    opening_stock INT NOT NULL DEFAULT 0,
    deliveries_received INT NOT NULL DEFAULT 0,
    quantity_sold INT NOT NULL DEFAULT 0,
    unsold_bread INT NOT NULL DEFAULT 0,
    damaged_wasted INT NOT NULL DEFAULT 0,
    expected_stock INT NOT NULL,
    physical_count INT NOT NULL,
    discrepancy INT NOT NULL,
    discrepancy_reason TEXT
);

-- 14. CASH HANDOVER & AUDIT CHAIN
CREATE TABLE IF NOT EXISTS cash_handovers (
    id VARCHAR(50) PRIMARY KEY,
    closing_id VARCHAR(50) REFERENCES daily_closings(id),
    handover_date DATE NOT NULL DEFAULT CURRENT_DATE,
    branch branch_id NOT NULL,
    amount_counted NUMERIC(12, 2) NOT NULL,
    amount_collected NUMERIC(12, 2) DEFAULT 0,
    amount_confirmed NUMERIC(12, 2) DEFAULT 0,
    status cash_handover_status NOT NULL DEFAULT 'counted',
    sales_staff_id UUID REFERENCES user_profiles(id),
    collected_by_staff_id UUID REFERENCES user_profiles(id),
    collected_at TIMESTAMPTZ,
    confirmed_by_manager_id UUID REFERENCES user_profiles(id),
    confirmed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. SUPPLIERS & PURCHASES
CREATE TABLE IF NOT EXISTS suppliers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(100),
    address TEXT,
    supplies TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchases (
    id VARCHAR(50) PRIMARY KEY,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    supplier_id VARCHAR(50) REFERENCES suppliers(id),
    total_amount NUMERIC(12, 2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'paid',
    recorded_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id VARCHAR(50) REFERENCES purchases(id) ON DELETE CASCADE,
    ingredient_id VARCHAR(50) REFERENCES ingredients(id),
    quantity NUMERIC(10, 3) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    unit_cost NUMERIC(10, 2) NOT NULL,
    total_cost NUMERIC(12, 2) NOT NULL
);

-- 16. OPERATING EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(50) PRIMARY KEY,
    expense_number VARCHAR(100) UNIQUE NOT NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    branch branch_scope NOT NULL DEFAULT 'both',
    category expense_category NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_method payment_method NOT NULL DEFAULT 'cash',
    description TEXT,
    recorded_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES user_profiles(id),
    actor_name VARCHAR(100) NOT NULL,
    actor_role user_role NOT NULL,
    action VARCHAR(50) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(100) NOT NULL,
    details TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- OWNER ACCESS: Full access to all tables
CREATE POLICY owner_all_access ON user_profiles FOR ALL USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'owner'
);

-- MANAGER ACCESS: Cannot manage user_profiles or change branding!
CREATE POLICY manager_cannot_touch_users ON user_profiles FOR SELECT USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('owner', 'manager')
);

CREATE POLICY manager_operational_access ON daily_closings FOR ALL USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('owner', 'manager')
);

-- SALES STAFF BRANCH ISOLATION:
CREATE POLICY sales_staff_branch_sales ON sales FOR ALL USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('owner', 'manager')
    OR (
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'sales'
        AND branch = (SELECT branch::text::branch_id FROM user_profiles WHERE id = auth.uid())
    )
);

CREATE POLICY sales_staff_branch_deliveries ON deliveries FOR ALL USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('owner', 'manager', 'production')
    OR (
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'sales'
        AND to_branch = (SELECT branch::text::branch_id FROM user_profiles WHERE id = auth.uid())
    )
);
