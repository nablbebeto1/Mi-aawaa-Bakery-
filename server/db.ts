import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const PROD_DB_PATH = path.join(DATA_DIR, 'miaawaa.db');
const DEMO_DB_PATH = path.join(DATA_DIR, 'miaawaa_demo.db');

export const prodDb = new DatabaseSync(PROD_DB_PATH);
prodDb.exec('PRAGMA journal_mode = WAL;');
prodDb.exec('PRAGMA foreign_keys = ON;');
prodDb.exec('PRAGMA busy_timeout = 5000;');

export let demoDbInstance: DatabaseSync | null = null;
let currentMode: 'production' | 'demo' = 'production';

export function getDemoDb(): DatabaseSync {
  if (!demoDbInstance) {
    demoDbInstance = new DatabaseSync(DEMO_DB_PATH);
    demoDbInstance.exec('PRAGMA journal_mode = WAL;');
    demoDbInstance.exec('PRAGMA foreign_keys = ON;');
    demoDbInstance.exec('PRAGMA busy_timeout = 5000;');
    initDatabaseSchema(demoDbInstance, true);
  }
  return demoDbInstance;
}

export function getActiveDb(): DatabaseSync {
  return currentMode === 'demo' ? getDemoDb() : prodDb;
}

export function getCurrentMode(): 'production' | 'demo' {
  return currentMode;
}

export function setSystemMode(mode: 'production' | 'demo'): void {
  currentMode = mode;
  try {
    prodDb.prepare('INSERT OR REPLACE INTO settings (key, value_json) VALUES (?, ?)').run('system_mode', JSON.stringify({ mode }));
  } catch (err) {
    console.error('Failed to persist system mode in prod database:', err);
  }
}

// Dynamic transparent Proxy so that `db.prepare`, `db.exec`, etc. seamlessly target the active database
export const db = new Proxy({} as DatabaseSync, {
  get(_target, prop, receiver) {
    const active = getActiveDb();
    const val = (active as any)[prop];
    if (typeof val === 'function') {
      return val.bind(active);
    }
    return val;
  }
});

export function initDatabase() {
  // 1. Initialize schema in production DB
  initDatabaseSchema(prodDb, false);

  // 2. Read persisted system mode if available
  try {
    const modeRow = prodDb.prepare('SELECT value_json FROM settings WHERE key = ?').get('system_mode') as any;
    if (modeRow) {
      const parsed = JSON.parse(modeRow.value_json);
      if (parsed && (parsed.mode === 'demo' || parsed.mode === 'production')) {
        currentMode = parsed.mode;
      }
    }
  } catch (e) {
    console.warn('Could not read system mode setting, defaulting to production:', e);
  }

  // 3. Pre-initialize demo database schema and demo sample dataset so it is immediately ready
  getDemoDb();
}

export function initDatabaseSchema(targetDb: DatabaseSync, isDemo: boolean) {
  targetDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role TEXT NOT NULL,
      branch TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      last_login_at TEXT,
      must_change_password INTEGER NOT NULL DEFAULT 0,
      failed_login_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      name_en TEXT NOT NULL,
      name_om TEXT NOT NULL,
      name_am TEXT NOT NULL,
      unit_price REAL NOT NULL,
      unit TEXT NOT NULL,
      expected_yield REAL,
      recipe_id TEXT,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS ingredients (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      name_en TEXT NOT NULL,
      name_om TEXT NOT NULL,
      name_am TEXT NOT NULL,
      unit TEXT NOT NULL,
      current_stock REAL NOT NULL,
      min_stock_alert REAL NOT NULL,
      unit_cost REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      name TEXT NOT NULL,
      ingredients_json TEXT NOT NULL,
      packaging_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS production_batches (
      id TEXT PRIMARY KEY,
      batch_number TEXT UNIQUE NOT NULL,
      date TEXT NOT NULL,
      product_id TEXT NOT NULL,
      total_produced REAL NOT NULL,
      rejected_qty REAL NOT NULL,
      saleable_qty REAL NOT NULL,
      ingredients_used_json TEXT NOT NULL,
      status TEXT NOT NULL,
      notes TEXT,
      created_by TEXT NOT NULL,
      creator_name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS deliveries (
      id TEXT PRIMARY KEY,
      delivery_number TEXT UNIQUE NOT NULL,
      date TEXT NOT NULL,
      dispatch_time TEXT NOT NULL,
      batch_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      from_branch TEXT NOT NULL,
      to_branch TEXT NOT NULL,
      dispatch_qty REAL NOT NULL,
      received_qty REAL,
      damaged_missing_qty REAL,
      status TEXT NOT NULL,
      dispatched_by TEXT NOT NULL,
      dispatcher_name TEXT NOT NULL,
      received_by TEXT,
      receiver_name TEXT,
      received_at TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      sale_number TEXT UNIQUE NOT NULL,
      date TEXT NOT NULL,
      branch TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      discount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      payment_status TEXT NOT NULL,
      amount_paid REAL NOT NULL,
      remaining_balance REAL NOT NULL,
      customer_name TEXT,
      customer_phone TEXT,
      notes TEXT,
      recorded_by TEXT NOT NULL,
      recorder_name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sale_payments (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      branch TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      date TEXT NOT NULL,
      recorded_by TEXT NOT NULL,
      recorder_name TEXT NOT NULL,
      type TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS daily_closings (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      branch TEXT NOT NULL,
      stock_items_json TEXT NOT NULL,
      cash_json TEXT NOT NULL,
      status TEXT NOT NULL,
      submitted_by TEXT NOT NULL,
      submitter_name TEXT NOT NULL,
      submitted_at TEXT NOT NULL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS cash_handovers (
      id TEXT PRIMARY KEY,
      closing_id TEXT NOT NULL,
      date TEXT NOT NULL,
      branch TEXT NOT NULL,
      amount_counted REAL NOT NULL,
      amount_collected REAL NOT NULL DEFAULT 0,
      amount_confirmed REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL,
      sales_staff_id TEXT NOT NULL,
      sales_staff_name TEXT NOT NULL,
      collected_by_staff_id TEXT,
      collected_by_staff_name TEXT,
      collected_at TEXT,
      confirmed_by_manager_id TEXT,
      confirmed_by_manager_name TEXT,
      confirmed_at TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      invoice_number TEXT UNIQUE NOT NULL,
      date TEXT NOT NULL,
      supplier_id TEXT NOT NULL,
      supplier_name TEXT NOT NULL,
      items_json TEXT NOT NULL,
      total_amount REAL NOT NULL,
      payment_status TEXT NOT NULL,
      recorded_by TEXT NOT NULL,
      recorder_name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      supplies_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      expense_number TEXT UNIQUE NOT NULL,
      date TEXT NOT NULL,
      branch TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      description TEXT NOT NULL,
      recorded_by TEXT NOT NULL,
      recorder_name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      details TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS diagnostics (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      level TEXT NOT NULL,
      category TEXT NOT NULL,
      message TEXT NOT NULL,
      details_json TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_sales_branch ON sales(branch);
    CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
    CREATE INDEX IF NOT EXISTS idx_sale_payments_sale_id ON sale_payments(sale_id);
    CREATE INDEX IF NOT EXISTS idx_deliveries_branch ON deliveries(to_branch);
    CREATE INDEX IF NOT EXISTS idx_production_batches_date ON production_batches(date);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
  `);

  // Ensure migrations on users table
  try {
    targetDb.exec('ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0;');
  } catch (e) {}
  try {
    targetDb.exec('ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0;');
  } catch (e) {}
  try {
    targetDb.exec('ALTER TABLE users ADD COLUMN locked_until TEXT;');
  } catch (e) {}

  if (isDemo) {
    seedDemoData(targetDb);
  } else {
    seedProductionData(targetDb);
  }
}

function seedProductionData(targetDb: DatabaseSync) {
  // Idempotent initial Admin check: ensure 'admin' exists with installation credentials
  const adminRow = targetDb.prepare("SELECT * FROM users WHERE LOWER(username) = 'admin'").get() as any;
  if (!adminRow) {
    targetDb.prepare(`
      INSERT INTO users (id, username, display_name, password_hash, salt, role, branch, status, created_at, must_change_password)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `).run(
      'usr_admin_init',
      'admin',
      'System Administrator (Admin)',
      'a717b2c1993da0dc951b0a9cecc309a84930ab36cfeb9d43ac819df2ff989873', // sha256 of "admin:c0ka_salt_admin_init"
      'c0ka_salt_admin_init',
      'owner',
      'both',
      '2026-10-03T08:00:00Z',
      1 // MUST CHANGE PASSWORD on first login!
    );
    console.log('Seeded initial admin account with mandatory password change.');
  }

  const userCount = targetDb.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count <= 1) {
    console.log('Seeding initial production users and baseline catalog...');

    const insertUser = targetDb.prepare(`
      INSERT INTO users (id, username, display_name, password_hash, salt, role, branch, status, created_at, last_login_at, must_change_password)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const initialUsers = [
      ['usr_owner_1', 'owner', 'Alemayehu Tadesse (Owner)', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'c0ka_salt_owner_99', 'owner', 'both', 'active', '2026-09-01T08:00:00Z', '2026-10-03T07:00:00Z', 0],
      ['usr_manager_1', 'manager', 'Birhanu Bekele (Manager)', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'c0ka_salt_mgr_88', 'manager', 'both', 'active', '2026-09-01T08:30:00Z', '2026-10-03T06:40:00Z', 0],
      ['usr_baker_1', 'baker_coka', 'Derartu Gemechu (Night Baker)', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'c0ka_salt_bkr_77', 'production', 'coka', 'active', '2026-09-02T06:00:00Z', '2026-10-03T04:20:00Z', 0],
      ['usr_sales_coka', 'sales_coka', 'Chaltu Negash (Coka Sales)', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'c0ka_salt_scoka_66', 'sales', 'coka', 'active', '2026-09-02T06:30:00Z', '2026-10-03T07:10:00Z', 0],
      ['usr_sales_mizan', 'sales_mizan', 'Tolosa Dibaba (Mizan Sales)', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'c0ka_salt_smizan_55', 'sales', 'mizan', 'active', '2026-09-02T07:00:00Z', '2026-10-03T06:45:00Z', 0]
    ];

    for (const u of initialUsers) {
      try {
        insertUser.run(...u);
      } catch (e) {}
    }
  }

  // Ensure the 9 official default products exist
  const prodCount = targetDb.prepare('SELECT COUNT(*) as count FROM products WHERE active = 1').get() as { count: number };
  if (prodCount.count === 0) {
    const insertProduct = targetDb.prepare(`
      INSERT OR REPLACE INTO products (id, code, name_en, name_om, name_am, unit_price, unit, expected_yield, recipe_id, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const initialProducts = [
      ['prod_bread_10', 'PRD-BRD-10', '10 Birr Bread', 'Daabboo qarshii 10', 'ዳቦ ባለ 10 ብር', 10, 'piece', 500, 'rec_bread_10', 1],
      ['prod_bread_15', 'PRD-BRD-15', '15 Birr Bread', 'Daabboo qarshii 15', 'ዳቦ ባለ 15 ብር', 15, 'piece', 340, 'rec_bread_15', 1],
      ['prod_bread_25', 'PRD-BRD-25', '25 Birr Bread', 'Daabboo qarshii 25', 'ዳቦ ባለ 25 ብር', 25, 'piece', 240, 'rec_bread_25', 1],
      ['prod_bread_160', 'PRD-BRD-160', '160 Birr Bread', 'Daabboo qarshii 160', 'ዳቦ ባለ 160 ብር', 160, 'piece', 40, 'rec_bread_160', 1],
      ['prod_cookies_1kg', 'PRD-COK-800', 'Cookies 1kg', 'Kuukii kiiloo 1 qarshii 800', 'ኵኪስ 1 ኪሎ 800 ብር', 800, 'kg', 20, 'rec_cookies_1kg', 1],
      ['prod_cake_1kg', 'PRD-CAK-1000', 'Cake 1kg', 'Keekii kiiloo 1 qarshii 1,000', 'ኬክ 1 ኪሎ 1000 ብር', 1000, 'kg', 15, 'rec_cake_1kg', 1],
      ['prod_biscuit_35', 'PRD-BSC-35', 'Biscuit 35 Birr', 'Biskuutii qarshii 35', 'ብስኩት 35 ብር', 35, 'piece', 160, 'rec_biscuit_35', 1],
      ['prod_bombolino_35', 'PRD-BMB-35', 'Bombolino 35 Birr', 'Bomboliinoo qarshii 35', 'ቦንቦሊኖ 35 ብር', 35, 'piece', 150, 'rec_bombolino_35', 1],
      ['prod_donut_70', 'PRD-DNT-70', 'Donut 70 Birr', 'Doonaatii qarshii 70', 'ዶናት 70 ብር', 70, 'piece', 100, 'rec_donut_70', 1]
    ];

    for (const p of initialProducts) {
      insertProduct.run(...p);
    }
  }

  // Ensure default ingredients exist
  const ingCount = targetDb.prepare('SELECT COUNT(*) as count FROM ingredients').get() as { count: number };
  if (ingCount.count === 0) {
    const insertIngredient = targetDb.prepare(`
      INSERT OR REPLACE INTO ingredients (id, code, name_en, name_om, name_am, unit, current_stock, min_stock_alert, unit_cost)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const initialIngredients = [
      ['ing_flour', 'ING-FLOUR', 'Premium Wheat Flour (Daakuu)', 'Daakuu Qamadii Qulqulluu', 'ጥራት ያለው የስንዴ ዱቄት', 'kg', 2450, 500, 110],
      ['ing_yeast', 'ING-YEAST', 'Dry Instant Yeast (Raacitii)', 'Raacitii Daabboo', 'ደረቅ እርሾ', 'kg', 35.5, 10, 450],
      ['ing_sugar', 'ING-SUGAR', 'Refined White Sugar (Sukkaara)', 'Sukkaara Adii', 'ነጭ ስኳር', 'kg', 210, 50, 130],
      ['ing_oil', 'ING-OIL', 'Pure Vegetable Cooking Oil (Zayitii)', 'Zayitii Nyaataa Qulqulluu', 'የምግብ ዘይት', 'liters', 280, 60, 190],
      ['ing_cake_mix', 'ING-CAKE', 'Cake Ingredients & Vanilla Essence', 'Meeshaalee Keekii fi Vaanilaa', 'የኬክ ግብዓቶችና ቫኒላ', 'kg', 65, 20, 320],
      ['ing_bags', 'ING-BAGS', 'Paper & Plastic Packaging Bags (Kiisii)', 'Waraqaa fi Kiisii Saamsamaa', 'የወረቀትና ፌስታል ማሸጊያዎች', 'kg', 115, 30, 160]
    ];

    for (const ing of initialIngredients) {
      insertIngredient.run(...ing);
    }
  }

  // Ensure default recipes exist
  const recCount = targetDb.prepare('SELECT COUNT(*) as count FROM recipes').get() as { count: number };
  if (recCount.count === 0) {
    const insertRecipe = targetDb.prepare(`
      INSERT OR REPLACE INTO recipes (id, product_id, name, ingredients_json, packaging_json)
      VALUES (?, ?, ?, ?, ?)
    `);

    insertRecipe.run(
      'rec_bread_25',
      'prod_bread_25',
      '25 Birr Bread 50kg Batch Recipe',
      JSON.stringify([
        { ingredientId: 'ing_flour', quantity: 50, unit: 'kg' },
        { ingredientId: 'ing_yeast', quantity: 0.5, unit: 'kg' },
        { ingredientId: 'ing_sugar', quantity: 3, unit: 'kg' },
        { ingredientId: 'ing_oil', quantity: 5, unit: 'liters' }
      ]),
      JSON.stringify([{ ingredientId: 'ing_bags', quantity: 2, unit: 'kg' }])
    );

    insertRecipe.run(
      'rec_bread_10',
      'prod_bread_10',
      '10 Birr Bread 50kg Batch Recipe',
      JSON.stringify([
        { ingredientId: 'ing_flour', quantity: 50, unit: 'kg' },
        { ingredientId: 'ing_yeast', quantity: 0.5, unit: 'kg' },
        { ingredientId: 'ing_sugar', quantity: 2, unit: 'kg' },
        { ingredientId: 'ing_oil', quantity: 3, unit: 'liters' }
      ]),
      JSON.stringify([{ ingredientId: 'ing_bags', quantity: 2, unit: 'kg' }])
    );
  }
}

function seedDemoData(targetDb: DatabaseSync) {
  const userCount = targetDb.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count > 0) return;

  console.log('Seeding separate DEMO MODE database (miaawaa_demo.db)...');

  // Copy users from production DB or seed standard test accounts so any role can explore Demo Mode
  const insertUser = targetDb.prepare(`
    INSERT INTO users (id, username, display_name, password_hash, salt, role, branch, status, created_at, last_login_at, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const demoUsers = [
    ['usr_admin_demo', 'admin', 'System Administrator (Admin - Demo)', 'a717b2c1993da0dc951b0a9cecc309a84930ab36cfeb9d43ac819df2ff989873', 'c0ka_salt_admin_init', 'owner', 'both', 'active', '2026-10-03T08:00:00Z', null, 0],
    ['usr_owner_demo', 'owner', 'Alemayehu Tadesse (Owner - Demo)', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'c0ka_salt_owner_99', 'owner', 'both', 'active', '2026-09-01T08:00:00Z', '2026-10-03T07:00:00Z', 0],
    ['usr_manager_demo', 'manager', 'Birhanu Bekele (Manager - Demo)', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'c0ka_salt_mgr_88', 'manager', 'both', 'active', '2026-09-01T08:30:00Z', '2026-10-03T06:40:00Z', 0],
    ['usr_baker_demo', 'baker_coka', 'Derartu Gemechu (Baker - Demo)', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'c0ka_salt_bkr_77', 'production', 'coka', 'active', '2026-09-02T06:00:00Z', '2026-10-03T04:20:00Z', 0],
    ['usr_sales_coka_demo', 'sales_coka', 'Chaltu Negash (Coka Sales - Demo)', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'c0ka_salt_scoka_66', 'sales', 'coka', 'active', '2026-09-02T06:30:00Z', '2026-10-03T07:10:00Z', 0],
    ['usr_sales_mizan_demo', 'sales_mizan', 'Tolosa Dibaba (Mizan Sales - Demo)', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'c0ka_salt_smizan_55', 'sales', 'mizan', 'active', '2026-09-02T07:00:00Z', '2026-10-03T06:45:00Z', 0]
  ];

  for (const u of demoUsers) {
    insertUser.run(...u);
  }

  // Demo Products with explicit [DEMO] labeling
  const insertProduct = targetDb.prepare(`
    INSERT INTO products (id, code, name_en, name_om, name_am, unit_price, unit, expected_yield, recipe_id, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const demoProducts = [
    ['prod_bread_10', 'DEMO-BRD-10', '[DEMO] 10 Birr Bread', '[DEMO] Daabboo qarshii 10', '[የሙከራ] ዳቦ ባለ 10 ብር', 10, 'piece', 500, 'rec_bread_10', 1],
    ['prod_bread_15', 'DEMO-BRD-15', '[DEMO] 15 Birr Bread', '[DEMO] Daabboo qarshii 15', '[የሙከራ] ዳቦ ባለ 15 ብር', 15, 'piece', 340, 'rec_bread_15', 1],
    ['prod_bread_25', 'DEMO-BRD-25', '[DEMO] 25 Birr Bread', '[DEMO] Daabboo qarshii 25', '[የሙከራ] ዳቦ ባለ 25 ብር', 25, 'piece', 240, 'rec_bread_25', 1],
    ['prod_bread_160', 'DEMO-BRD-160', '[DEMO] 160 Birr Bread', '[DEMO] Daabboo qarshii 160', '[የሙከራ] ዳቦ ባለ 160 ብር', 160, 'piece', 40, 'rec_bread_160', 1],
    ['prod_cookies_1kg', 'DEMO-COK-800', '[DEMO] Cookies 1kg', '[DEMO] Kuukii kiiloo 1 qarshii 800', '[የሙከራ] ኵኪስ 1 ኪሎ 800 ብር', 800, 'kg', 20, 'rec_cookies_1kg', 1],
    ['prod_cake_1kg', 'DEMO-CAK-1000', '[DEMO] Cake 1kg', '[DEMO] Keekii kiiloo 1 qarshii 1,000', '[የሙከራ] ኬክ 1 ኪሎ 1000 ብር', 1000, 'kg', 15, 'rec_cake_1kg', 1],
    ['prod_biscuit_35', 'DEMO-BSC-35', '[DEMO] Biscuit 35 Birr', '[DEMO] Biskuutii qarshii 35', '[የሙከራ] ብስኩት 35 ብር', 35, 'piece', 160, 'rec_biscuit_35', 1],
    ['prod_bombolino_35', 'DEMO-BMB-35', '[DEMO] Bombolino 35 Birr', '[DEMO] Bomboliinoo qarshii 35', '[የሙከራ] ቦንቦሊኖ 35 ብር', 35, 'piece', 150, 'rec_bombolino_35', 1],
    ['prod_donut_70', 'DEMO-DNT-70', '[DEMO] Donut 70 Birr', '[DEMO] Doonaatii qarshii 70', '[የሙከራ] ዶናት 70 ብር', 70, 'piece', 100, 'rec_donut_70', 1]
  ];

  for (const p of demoProducts) {
    insertProduct.run(...p);
  }

  // Demo Ingredients
  const insertIngredient = targetDb.prepare(`
    INSERT INTO ingredients (id, code, name_en, name_om, name_am, unit, current_stock, min_stock_alert, unit_cost)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const demoIngredients = [
    ['ing_flour', 'DEMO-FLOUR', '[DEMO] Wheat Flour (Daakuu)', '[DEMO] Daakuu Qamadii', '[የሙከራ] የስንዴ ዱቄት', 'kg', 1500, 300, 110],
    ['ing_yeast', 'DEMO-YEAST', '[DEMO] Instant Yeast (Raacitii)', '[DEMO] Raacitii Daabboo', '[የሙከራ] ደረቅ እርሾ', 'kg', 25.0, 5, 450],
    ['ing_sugar', 'DEMO-SUGAR', '[DEMO] White Sugar (Sukkaara)', '[DEMO] Sukkaara Adii', '[የሙከራ] ነጭ ስኳር', 'kg', 120, 25, 130],
    ['ing_oil', 'DEMO-OIL', '[DEMO] Cooking Oil (Zayitii)', '[DEMO] Zayitii Nyaataa', '[የሙከራ] የምግብ ዘይት', 'liters', 150, 30, 190],
    ['ing_cake_mix', 'DEMO-CAKE', '[DEMO] Cake Mix & Flavor', '[DEMO] Meeshaalee Keekii', '[የሙከራ] የኬክ ግብዓቶች', 'kg', 40, 10, 320],
    ['ing_bags', 'DEMO-BAGS', '[DEMO] Packaging Bags', '[DEMO] Waraqaa Saamsamaa', '[የሙከራ] ማሸጊያ ከረጢቶች', 'kg', 80, 20, 160]
  ];

  for (const ing of demoIngredients) {
    insertIngredient.run(...ing);
  }

  // Demo Recipes
  const insertRecipe = targetDb.prepare(`
    INSERT INTO recipes (id, product_id, name, ingredients_json, packaging_json)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertRecipe.run(
    'rec_bread_25',
    'prod_bread_25',
    '[DEMO] 25 Birr Bread Batch Recipe',
    JSON.stringify([
      { ingredientId: 'ing_flour', quantity: 50, unit: 'kg' },
      { ingredientId: 'ing_yeast', quantity: 0.5, unit: 'kg' },
      { ingredientId: 'ing_sugar', quantity: 3, unit: 'kg' },
      { ingredientId: 'ing_oil', quantity: 5, unit: 'liters' }
    ]),
    JSON.stringify([{ ingredientId: 'ing_bags', quantity: 2, unit: 'kg' }])
  );

  // Demo Sales with down payments (ቀብድ), subsequent payments, and credit balances
  const insertSale = targetDb.prepare(`
    INSERT INTO sales (id, sale_number, date, branch, product_id, quantity, unit_price, discount, total_amount, payment_method, payment_status, amount_paid, remaining_balance, customer_name, customer_phone, notes, recorded_by, recorder_name, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPayment = targetDb.prepare(`
    INSERT INTO sale_payments (id, sale_id, customer_name, branch, amount, payment_method, date, recorded_by, recorder_name, type, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Demo Sale 1: Fully Paid
  insertSale.run(
    'sal_demo_01',
    'SL-DEMO-1001',
    '2026-10-03',
    'coka',
    'prod_bread_25',
    40,
    25,
    0,
    1000,
    'cash',
    'paid',
    1000,
    0,
    '[DEMO] Walk-in Retail Customer',
    '',
    'Sample fully paid transaction for demonstration',
    'usr_sales_coka_demo',
    'Chaltu Negash (Coka Sales - Demo)',
    '2026-10-03T08:15:00Z'
  );

  insertPayment.run(
    'pmt_demo_01',
    'sal_demo_01',
    '[DEMO] Walk-in Retail Customer',
    'coka',
    1000,
    'cash',
    '2026-10-03',
    'usr_sales_coka_demo',
    'Chaltu Negash (Coka Sales - Demo)',
    'full_payment',
    'Cash receipt',
    '2026-10-03T08:15:00Z'
  );

  // Demo Sale 2: Down payment (ቀብድ) with remaining balance
  insertSale.run(
    'sal_demo_02',
    'SL-DEMO-1002',
    '2026-10-03',
    'coka',
    'prod_bread_25',
    100,
    25,
    0,
    2500,
    'cash',
    'partial',
    1000,
    1500,
    '[DEMO] Solomon Tesfaye',
    '0911002233',
    'Sample partial down payment (ቀብድ) with outstanding receivables',
    'usr_sales_coka_demo',
    'Chaltu Negash (Coka Sales - Demo)',
    '2026-10-03T09:00:00Z'
  );

  insertPayment.run(
    'pmt_demo_02',
    'sal_demo_02',
    '[DEMO] Solomon Tesfaye',
    'coka',
    1000,
    'cash',
    '2026-10-03',
    'usr_sales_coka_demo',
    'Chaltu Negash (Coka Sales - Demo)',
    'initial_down_payment',
    'Initial down payment (ቀብድ)',
    '2026-10-03T09:00:00Z'
  );

  // Demo Sale 3: Unpaid credit sale
  insertSale.run(
    'sal_demo_03',
    'SL-DEMO-1003',
    '2026-10-03',
    'mizan',
    'prod_bread_160',
    10,
    160,
    0,
    1600,
    'digital',
    'unpaid',
    0,
    1600,
    '[DEMO] Almaz Kebede',
    '0922334455',
    'Sample unpaid wholesale bread order',
    'usr_sales_mizan_demo',
    'Tolosa Dibaba (Mizan Sales - Demo)',
    '2026-10-03T09:30:00Z'
  );

  // Demo Audit Log
  const insertAudit = targetDb.prepare(`
    INSERT INTO audit_logs (id, timestamp, actor_id, actor_name, actor_role, action, target_type, target_id, details)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAudit.run('aud_demo_01', '2026-10-03T08:00:00Z', 'usr_admin_demo', 'System Administrator', 'owner', 'TOGGLE_DEMO_MODE', 'SystemConfiguration', 'system_mode', 'Initialized isolated demonstration data environment.');
}
