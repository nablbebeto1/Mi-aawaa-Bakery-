import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'node:crypto';
import { db, prodDb, getDemoDb, initDatabase, getCurrentMode, setSystemMode } from './server/db.js';
import { realtimeHub } from './server/realtime.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite database and seed defaults if empty
initDatabase();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Body parser
app.use(express.json({ limit: '10mb' }));

// Helper to log technical diagnostics safely
function logDiag(level: 'info' | 'warn' | 'error', category: string, message: string, details?: any) {
  try {
    const id = 'diag_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    db.prepare(`
      INSERT INTO diagnostics (id, timestamp, level, category, message, details_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, new Date().toISOString(), level, category, message, details ? JSON.stringify(details) : null);
  } catch (err) {
    console.error('Failed to write diagnostic:', err);
  }
}

// Audit log helper
function recordAudit(actorId: string, actorName: string, actorRole: string, action: string, targetType: string, targetId: string, details: string) {
  try {
    const id = 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, actor_id, actor_name, actor_role, action, target_type, target_id, details)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, new Date().toISOString(), actorId, actorName, actorRole, action, targetType, targetId, details);
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

// ----------------------------------------------------------------------
// 1. REALTIME SSE STREAM
// ----------------------------------------------------------------------
app.get('/api/realtime/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering

  const clientId = realtimeHub.registerClient(res);

  req.on('close', () => {
    realtimeHub.removeClient(clientId);
  });
});

// ----------------------------------------------------------------------
// 2. HEALTH & DIAGNOSTICS
// ----------------------------------------------------------------------
app.get('/api/health', (req: Request, res: Response) => {
  try {
    const count = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
    const clients = realtimeHub.getConnectedClientsCount();
    res.json({
      status: 'ok',
      database: 'connected',
      connectedClients: clients,
      userCount: count.c,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

app.get('/api/diagnostics', (req: Request, res: Response) => {
  try {
    const rows = db.prepare('SELECT * FROM diagnostics ORDER BY timestamp DESC LIMIT 100').all();
    const stats = {
      users: (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c,
      products: (db.prepare('SELECT COUNT(*) as c FROM products').get() as any).c,
      sales: (db.prepare('SELECT COUNT(*) as c FROM sales').get() as any).c,
      payments: (db.prepare('SELECT COUNT(*) as c FROM sale_payments').get() as any).c,
      batches: (db.prepare('SELECT COUNT(*) as c FROM production_batches').get() as any).c,
      deliveries: (db.prepare('SELECT COUNT(*) as c FROM deliveries').get() as any).c,
      closings: (db.prepare('SELECT COUNT(*) as c FROM daily_closings').get() as any).c,
      handovers: (db.prepare('SELECT COUNT(*) as c FROM cash_handovers').get() as any).c,
      auditLogs: (db.prepare('SELECT COUNT(*) as c FROM audit_logs').get() as any).c,
      activeClients: realtimeHub.getConnectedClientsCount()
    };
    res.json({ logs: rows, stats });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sync/all', (req: Request, res: Response) => {
  try {
    const users = db.prepare('SELECT id, username, display_name as displayName, role, branch, status, created_at as createdAt, last_login_at as lastLoginAt, salt FROM users ORDER BY created_at ASC').all();
    
    const prodRows = db.prepare('SELECT * FROM products ORDER BY unit_price ASC').all() as any[];
    const products = prodRows.map(r => ({
      id: r.id,
      code: r.code,
      name: { en: r.name_en, om: r.name_om, am: r.name_am },
      unitPrice: r.unit_price,
      unit: r.unit,
      expectedYield: r.expected_yield,
      recipeId: r.recipe_id,
      active: Boolean(r.active)
    }));

    const ingRows = db.prepare('SELECT * FROM ingredients ORDER BY code ASC').all() as any[];
    const ingredients = ingRows.map(r => ({
      id: r.id,
      code: r.code,
      name: { en: r.name_en, om: r.name_om, am: r.name_am },
      unit: r.unit,
      currentStock: r.current_stock,
      minStockAlert: r.min_stock_alert,
      unitCost: r.unit_cost
    }));

    const recRows = db.prepare('SELECT * FROM recipes').all() as any[];
    const recipes = recRows.map(r => ({
      id: r.id,
      productId: r.product_id,
      name: r.name,
      ingredients: JSON.parse(r.ingredients_json),
      packaging: JSON.parse(r.packaging_json)
    }));

    const batchRows = db.prepare('SELECT * FROM production_batches ORDER BY date DESC, created_at DESC').all() as any[];
    const productionBatches = batchRows.map(r => ({
      id: r.id,
      batchNumber: r.batch_number,
      date: r.date,
      productId: r.product_id,
      totalProduced: r.total_produced,
      rejectedQty: r.rejected_qty,
      saleableQty: r.saleable_qty,
      ingredientsUsed: JSON.parse(r.ingredients_used_json),
      status: r.status,
      notes: r.notes,
      createdBy: r.created_by,
      creatorName: r.creator_name,
      createdAt: r.created_at
    }));

    const delRows = db.prepare('SELECT * FROM deliveries ORDER BY date DESC, dispatch_time DESC').all() as any[];
    const deliveries = delRows.map(r => ({
      id: r.id,
      deliveryNumber: r.delivery_number,
      date: r.date,
      dispatchTime: r.dispatch_time,
      batchId: r.batch_id,
      productId: r.product_id,
      fromBranch: r.from_branch,
      toBranch: r.to_branch,
      dispatchQty: r.dispatch_qty,
      receivedQty: r.received_qty,
      damagedMissingQty: r.damaged_missing_qty,
      status: r.status,
      dispatchedBy: r.dispatched_by,
      dispatcherName: r.dispatcher_name,
      receivedBy: r.received_by,
      receiverName: r.receiver_name,
      receivedAt: r.received_at,
      notes: r.notes
    }));

    const paymentsRows = db.prepare('SELECT * FROM sale_payments ORDER BY created_at ASC').all() as any[];
    const paymentsBySaleId: Record<string, any[]> = {};
    for (const p of paymentsRows) {
      if (!paymentsBySaleId[p.sale_id]) paymentsBySaleId[p.sale_id] = [];
      paymentsBySaleId[p.sale_id].push({
        id: p.id,
        saleId: p.sale_id,
        customerName: p.customer_name,
        branch: p.branch,
        amount: p.amount,
        paymentMethod: p.payment_method,
        date: p.date,
        recordedBy: p.recorded_by,
        recorderName: p.recorder_name,
        type: p.type,
        notes: p.notes,
        createdAt: p.created_at
      });
    }

    const salesRows = db.prepare('SELECT * FROM sales ORDER BY created_at DESC').all() as any[];
    const sales = salesRows.map(s => ({
      id: s.id,
      saleNumber: s.sale_number,
      date: s.date,
      branch: s.branch,
      productId: s.product_id,
      quantity: s.quantity,
      unitPrice: s.unit_price,
      discount: s.discount,
      totalAmount: s.total_amount,
      paymentMethod: s.payment_method,
      paymentStatus: s.payment_status,
      amountPaid: s.amount_paid,
      remainingBalance: s.remaining_balance,
      customerName: s.customer_name,
      customerPhone: s.customer_phone,
      notes: s.notes,
      recordedBy: s.recorded_by,
      recorderName: s.recorder_name,
      createdAt: s.created_at,
      payments: paymentsBySaleId[s.id] || []
    }));

    const closingRows = db.prepare('SELECT * FROM daily_closings ORDER BY date DESC, submitted_at DESC').all() as any[];
    const dailyClosings = closingRows.map(r => ({
      id: r.id,
      date: r.date,
      branch: r.branch,
      stockItems: JSON.parse(r.stock_items_json),
      cash: JSON.parse(r.cash_json),
      status: r.status,
      submittedBy: r.submitted_by,
      submitterName: r.submitter_name,
      submittedAt: r.submitted_at,
      notes: r.notes
    }));

    const handoverRows = db.prepare('SELECT * FROM cash_handovers ORDER BY date DESC').all() as any[];
    const cashHandovers = handoverRows.map(r => ({
      id: r.id,
      closingId: r.closing_id,
      date: r.date,
      branch: r.branch,
      amountCounted: r.amount_counted,
      amountCollected: r.amount_collected,
      amountConfirmed: r.amount_confirmed,
      status: r.status,
      salesStaffId: r.sales_staff_id,
      salesStaffName: r.sales_staff_name,
      collectedByStaffId: r.collected_by_staff_id,
      collectedByStaffName: r.collected_by_staff_name,
      collectedAt: r.collected_at,
      confirmedByManagerId: r.confirmed_by_manager_id,
      confirmedByManagerName: r.confirmed_by_manager_name,
      confirmedAt: r.confirmed_at,
      notes: r.notes
    }));

    const purRows = db.prepare('SELECT * FROM purchases ORDER BY date DESC').all() as any[];
    const purchases = purRows.map(r => ({
      id: r.id,
      invoiceNumber: r.invoice_number,
      date: r.date,
      supplierId: r.supplier_id,
      supplierName: r.supplier_name,
      items: JSON.parse(r.items_json),
      totalAmount: r.total_amount,
      paymentStatus: r.payment_status,
      recordedBy: r.recorded_by,
      recorderName: r.recorder_name,
      createdAt: r.created_at
    }));

    const supRows = db.prepare('SELECT * FROM suppliers').all() as any[];
    const suppliers = supRows.map(r => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      email: r.email,
      address: r.address,
      supplies: JSON.parse(r.supplies_json)
    }));

    const expRows = db.prepare('SELECT * FROM expenses ORDER BY date DESC').all() as any[];
    const expenses = expRows.map(r => ({
      id: r.id,
      expenseNumber: r.expense_number,
      date: r.date,
      branch: r.branch,
      category: r.category,
      amount: r.amount,
      paymentMethod: r.payment_method,
      description: r.description,
      recordedBy: r.recorded_by,
      recorderName: r.recorder_name,
      createdAt: r.created_at
    }));

    const auditLogs = db.prepare('SELECT id, timestamp, actor_id as actorId, actor_name as actorName, actor_role as actorRole, action, target_type as targetType, target_id as targetId, details FROM audit_logs ORDER BY timestamp DESC LIMIT 500').all();

    const setRow = db.prepare('SELECT value_json FROM settings WHERE key = ?').get('global') as any;
    const settings = setRow ? JSON.parse(setRow.value_json) : {
      bakeryName: "Mi'aawaa Bakery",
      logoUrl: null,
      defaultLanguage: 'om',
      supportedLanguages: ['en', 'om', 'am'],
      businessTimezone: 'Africa/Addis_Ababa',
      currency: 'ETB',
      businessDate: '2026-10-03'
    };

    res.json({
      timestamp: new Date().toISOString(),
      mode: getCurrentMode(),
      isDemoMode: getCurrentMode() === 'demo',
      users,
      products,
      ingredients,
      recipes,
      productionBatches,
      deliveries,
      sales,
      dailyClosings,
      cashHandovers,
      purchases,
      suppliers,
      expenses,
      auditLogs,
      settings
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch sync state: ' + err.message });
  }
});

// ----------------------------------------------------------------------
// SYSTEM CONFIGURATION & DEMO MODE
// ----------------------------------------------------------------------
app.get('/api/system/mode', (req: Request, res: Response) => {
  const mode = getCurrentMode();
  res.json({ mode, isDemoMode: mode === 'demo' });
});

app.post('/api/admin/demo-mode', (req: Request, res: Response) => {
  const { enabled, actorId } = req.body;
  if (!actorId) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const actor = db.prepare('SELECT * FROM users WHERE id = ?').get(actorId) as any;
  if (!actor || (actor.role !== 'owner' && actor.role !== 'admin')) {
    return res.status(403).json({ error: 'Unauthorized: Only the System Administrator can enable or disable Demo Mode.' });
  }

  const oldMode = getCurrentMode();
  const newMode = enabled ? 'demo' : 'production';

  if (oldMode === newMode) {
    return res.json({ success: true, mode: newMode, isDemoMode: enabled });
  }

  setSystemMode(newMode);

  // Log in both databases for an unalterable audit trail
  const details = `System environment switched from ${oldMode.toUpperCase()} to ${newMode.toUpperCase()} by ${actor.display_name} (${actor.username})`;
  recordAudit(actor.id, actor.display_name, actor.role, 'TOGGLE_DEMO_MODE', 'SystemConfiguration', 'system_mode', details);
  try {
    const otherDb = newMode === 'demo' ? prodDb : getDemoDb();
    const id = 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    otherDb.prepare(`
      INSERT INTO audit_logs (id, timestamp, actor_id, actor_name, actor_role, action, target_type, target_id, details)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, new Date().toISOString(), actor.id, actor.display_name, actor.role, 'TOGGLE_DEMO_MODE', 'SystemConfiguration', 'system_mode', details);
  } catch (e) {}

  realtimeHub.broadcast('mode_change', {
    mode: newMode,
    isDemoMode: enabled,
    actorName: actor.display_name
  });

  res.json({ success: true, mode: newMode, isDemoMode: enabled });
});

// ----------------------------------------------------------------------
// 3. AUTHENTICATION & USERS
// ----------------------------------------------------------------------
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password, passwordHash } = req.body;
  if (!username || (!password && !passwordHash)) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const cleanUser = String(username).trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE LOWER(username) = ?').get(cleanUser) as any;

  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  // Rate-limiting / lockout enforcement
  if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
    const remainingMins = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
    return res.status(429).json({
      error: `Account is temporarily locked due to multiple failed login attempts. Please wait ${remainingMins} minute(s) before retrying.`
    });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ error: 'This account is deactivated. Please contact the Owner.' });
  }

  // Calculate hash if plaintext password was provided
  let isMatch = false;
  if (password) {
    const computed = crypto.createHash('sha256').update(password + ':' + user.salt).digest('hex');
    isMatch = computed === user.password_hash;
  }
  if (!isMatch && passwordHash) {
    isMatch = passwordHash === user.password_hash;
  }

  if (!isMatch) {
    const failedAttempts = (user.failed_login_attempts || 0) + 1;
    let lockedUntil: string | null = null;
    if (failedAttempts >= 5) {
      lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    }
    db.prepare('UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?')
      .run(failedAttempts, lockedUntil, user.id);

    if (failedAttempts >= 5) {
      return res.status(429).json({
        error: 'Too many failed login attempts. Account is temporarily locked for 15 minutes.'
      });
    }
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  // Successful login: reset failed attempts
  const now = new Date().toISOString();
  db.prepare('UPDATE users SET last_login_at = ?, failed_login_attempts = 0, locked_until = NULL WHERE id = ?')
    .run(now, user.id);

  const safeUser = {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    role: user.role,
    branch: user.branch,
    status: user.status,
    createdAt: user.created_at,
    lastLoginAt: now,
    mustChangePassword: Boolean(user.must_change_password)
  };

  res.json({ user: safeUser });
});

app.post('/api/auth/change-initial-password', (req: Request, res: Response) => {
  const { username, currentPassword, newPassword, confirmPassword } = req.body;
  if (!username || !currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ error: 'All password fields are required.' });
  }

  const cleanUser = String(username).trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE LOWER(username) = ?').get(cleanUser) as any;
  if (!user) {
    return res.status(404).json({ error: 'Account not found.' });
  }

  // Verify current password
  const currHash = crypto.createHash('sha256').update(currentPassword + ':' + user.salt).digest('hex');
  if (currHash !== user.password_hash && currentPassword !== user.password_hash) {
    return res.status(400).json({ error: 'Current password does not match.' });
  }

  // Strong password policy: at least 12 characters
  if (newPassword.length < 12) {
    return res.status(400).json({ error: 'Security policy requires a strong password of at least 12 characters.' });
  }

  if (newPassword.toLowerCase() === 'admin' || newPassword === currentPassword) {
    return res.status(400).json({ error: 'New password cannot be the installation default or current password.' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'New password and confirmation password do not match.' });
  }

  const newSalt = crypto.randomBytes(16).toString('hex');
  const newHash = crypto.createHash('sha256').update(newPassword + ':' + newSalt).digest('hex');

  // Update in both production and demo database
  prodDb.prepare('UPDATE users SET password_hash = ?, salt = ?, must_change_password = 0, failed_login_attempts = 0, locked_until = NULL WHERE LOWER(username) = ?')
    .run(newHash, newSalt, cleanUser);
  try {
    getDemoDb().prepare('UPDATE users SET password_hash = ?, salt = ?, must_change_password = 0, failed_login_attempts = 0, locked_until = NULL WHERE LOWER(username) = ?')
      .run(newHash, newSalt, cleanUser);
  } catch (e) {}

  recordAudit(user.id, user.display_name, user.role, 'CHANGE_INITIAL_ADMIN_PASSWORD', 'User', user.id, 'Mandatory initial Admin password change successfully completed.');

  const safeUser = {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    role: user.role,
    branch: user.branch,
    status: user.status,
    createdAt: user.created_at,
    lastLoginAt: new Date().toISOString(),
    mustChangePassword: false
  };

  res.json({ success: true, user: safeUser });
});

app.post('/api/auth/change-password', (req: Request, res: Response) => {
  const { actorId, currentPassword, newPassword, confirmPassword } = req.body;
  if (!actorId || !currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ error: 'All password fields are required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(actorId) as any;
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const currHash = crypto.createHash('sha256').update(currentPassword + ':' + user.salt).digest('hex');
  if (currHash !== user.password_hash) {
    return res.status(400).json({ error: 'Current password does not match.' });
  }

  if (newPassword.length < 12) {
    return res.status(400).json({ error: 'Password policy requires at least 12 characters.' });
  }

  if (newPassword === currentPassword) {
    return res.status(400).json({ error: 'New password cannot be the same as your current password.' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'New password and confirmation do not match.' });
  }

  const newSalt = crypto.randomBytes(16).toString('hex');
  const newHash = crypto.createHash('sha256').update(newPassword + ':' + newSalt).digest('hex');

  prodDb.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?').run(newHash, newSalt, user.id);
  try {
    getDemoDb().prepare('UPDATE users SET password_hash = ?, salt = ? WHERE LOWER(username) = ?').run(newHash, newSalt, user.username.toLowerCase());
  } catch (e) {}

  recordAudit(user.id, user.display_name, user.role, 'CHANGE_ADMIN_PASSWORD', 'User', user.id, 'User password updated successfully via Admin Profile.');

  res.json({ success: true });
});

app.get('/api/users', (req: Request, res: Response) => {
  const users = db.prepare('SELECT id, username, display_name as displayName, role, branch, status, created_at as createdAt, last_login_at as lastLoginAt, salt FROM users ORDER BY created_at ASC').all();
  res.json(users);
});

app.post('/api/users', (req: Request, res: Response) => {
  const { username, displayName, passwordHash, salt, role, branch, actorId } = req.body;
  const actor = db.prepare('SELECT * FROM users WHERE id = ?').get(actorId) as any;
  if (!actor || actor.role !== 'owner') {
    return res.status(403).json({ error: 'Unauthorized: Only Owner / Administrator can create user accounts.' });
  }

  const clean = String(username).trim().toLowerCase();
  if (!clean || clean.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(username) = ?').get(clean);
  if (existing) {
    return res.status(400).json({ error: `Username "${clean}" is already taken.` });
  }

  const id = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, username, display_name, password_hash, salt, role, branch, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)
  `).run(id, clean, displayName, passwordHash, salt, role, branch, now);

  recordAudit(actor.id, actor.display_name, actor.role, 'CREATE_USER', 'User', id, `Created account ${clean} (${role})`);
  realtimeHub.broadcast('sync', { entity: 'users', action: 'CREATE_USER' });

  res.json({ id, username: clean, displayName, role, branch, status: 'active', createdAt: now });
});

app.put('/api/users/:id', (req: Request, res: Response) => {
  const { displayName, role, branch, status, actorId } = req.body;
  const actor = db.prepare('SELECT * FROM users WHERE id = ?').get(actorId) as any;
  if (!actor || actor.role !== 'owner') {
    return res.status(403).json({ error: 'Unauthorized: Only Owner can edit user accounts.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as any;
  if (!user) return res.status(404).json({ error: 'User not found.' });

  // Prevent owner from deactivating themselves
  if (user.id === actor.id && status === 'inactive') {
    return res.status(400).json({ error: 'Security restriction: You cannot deactivate your own Owner account.' });
  }

  db.prepare(`
    UPDATE users SET display_name = ?, role = ?, branch = ?, status = ? WHERE id = ?
  `).run(displayName || user.display_name, role || user.role, branch || user.branch, status || user.status, user.id);

  recordAudit(actor.id, actor.display_name, actor.role, 'EDIT_USER', 'User', user.id, `Updated user ${user.username}`);
  realtimeHub.broadcast('sync', { entity: 'users', action: 'EDIT_USER' });

  res.json({ success: true });
});

app.post('/api/users/:id/reset-password', (req: Request, res: Response) => {
  const { newPasswordHash, newSalt, actorId } = req.body;
  const actor = db.prepare('SELECT * FROM users WHERE id = ?').get(actorId) as any;
  if (!actor || actor.role !== 'owner') {
    return res.status(403).json({ error: 'Unauthorized: Only Owner can reset passwords.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as any;
  if (!user) return res.status(404).json({ error: 'User not found.' });

  db.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?').run(newPasswordHash, newSalt, user.id);

  recordAudit(actor.id, actor.display_name, actor.role, 'RESET_PASSWORD', 'User', user.id, `Reset password for ${user.username}`);
  res.json({ success: true });
});

// ----------------------------------------------------------------------
// 4. PRODUCTS & RECIPES
// ----------------------------------------------------------------------
app.get('/api/products', (req: Request, res: Response) => {
  const includeAll = req.query.all === 'true';
  const query = includeAll ? 'SELECT * FROM products ORDER BY unit_price ASC' : 'SELECT * FROM products WHERE active = 1 ORDER BY unit_price ASC';
  const rows = db.prepare(query).all() as any[];

  const formatted = rows.map(r => ({
    id: r.id,
    code: r.code,
    name: {
      en: r.name_en,
      om: r.name_om,
      am: r.name_am
    },
    unitPrice: r.unit_price,
    unit: r.unit,
    expectedYield: r.expected_yield,
    recipeId: r.recipe_id,
    active: Boolean(r.active)
  }));

  res.json(formatted);
});

app.put('/api/products/:id/price', (req: Request, res: Response) => {
  const { unitPrice, actorId } = req.body;
  const actor = db.prepare('SELECT * FROM users WHERE id = ?').get(actorId) as any;
  if (!actor || (actor.role !== 'owner' && actor.role !== 'manager')) {
    return res.status(403).json({ error: 'Unauthorized: Only Owner or Manager can change product prices.' });
  }

  const price = Number(unitPrice);
  if (isNaN(price) || price <= 0) {
    return res.status(400).json({ error: 'Price must be greater than zero.' });
  }

  const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id) as any;
  if (!prod) return res.status(404).json({ error: 'Product not found.' });

  db.prepare('UPDATE products SET unit_price = ? WHERE id = ?').run(price, prod.id);

  recordAudit(actor.id, actor.display_name, actor.role, 'UPDATE_PRODUCT_PRICE', 'Product', prod.id, `Updated price of ${prod.name_en} from ${prod.unit_price} to ${price} ETB`);
  realtimeHub.broadcast('sync', { entity: 'products', action: 'UPDATE_PRODUCT_PRICE' });

  res.json({ success: true, newPrice: price });
});

app.get('/api/recipes', (req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM recipes').all() as any[];
  const formatted = rows.map(r => ({
    id: r.id,
    productId: r.product_id,
    name: r.name,
    ingredients: JSON.parse(r.ingredients_json),
    packaging: JSON.parse(r.packaging_json)
  }));
  res.json(formatted);
});

// ----------------------------------------------------------------------
// 5. INGREDIENTS & INVENTORY
// ----------------------------------------------------------------------
app.get('/api/ingredients', (req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM ingredients ORDER BY code ASC').all() as any[];
  const formatted = rows.map(r => ({
    id: r.id,
    code: r.code,
    name: {
      en: r.name_en,
      om: r.name_om,
      am: r.name_am
    },
    unit: r.unit,
    currentStock: r.current_stock,
    minStockAlert: r.min_stock_alert,
    unitCost: r.unit_cost
  }));
  res.json(formatted);
});

app.put('/api/ingredients/:id/stock', (req: Request, res: Response) => {
  const { newStock, reason, actorId } = req.body;
  const actor = db.prepare('SELECT * FROM users WHERE id = ?').get(actorId) as any;
  if (!actor || (actor.role !== 'owner' && actor.role !== 'manager')) {
    return res.status(403).json({ error: 'Unauthorized: Only Owner or Manager can adjust stock.' });
  }

  const stock = Math.max(0, Number(newStock));
  const ing = db.prepare('SELECT * FROM ingredients WHERE id = ?').get(req.params.id) as any;
  if (!ing) return res.status(404).json({ error: 'Ingredient not found.' });

  db.prepare('UPDATE ingredients SET current_stock = ? WHERE id = ?').run(stock, ing.id);

  recordAudit(actor.id, actor.display_name, actor.role, 'ADJUST_STOCK', 'Ingredient', ing.id, `Stock adjusted from ${ing.current_stock} to ${stock} ${ing.unit}. Reason: ${reason}`);
  realtimeHub.broadcast('sync', { entity: 'ingredients', action: 'ADJUST_STOCK' });

  res.json({ success: true, currentStock: stock });
});

// ----------------------------------------------------------------------
// 6. PRODUCTION BATCHES (Atomic with ingredient deduction)
// ----------------------------------------------------------------------
app.get('/api/production-batches', (req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM production_batches ORDER BY date DESC, created_at DESC').all() as any[];
  const formatted = rows.map(r => ({
    id: r.id,
    batchNumber: r.batch_number,
    date: r.date,
    productId: r.product_id,
    totalProduced: r.total_produced,
    rejectedQty: r.rejected_qty,
    saleableQty: r.saleable_qty,
    ingredientsUsed: JSON.parse(r.ingredients_used_json),
    status: r.status,
    notes: r.notes,
    createdBy: r.created_by,
    creatorName: r.creator_name,
    createdAt: r.created_at
  }));
  res.json(formatted);
});

app.post('/api/production-batches', (req: Request, res: Response) => {
  const { productId, totalProduced, rejectedQty, ingredientsUsed, notes, actorId } = req.body;
  const actor = db.prepare('SELECT * FROM users WHERE id = ?').get(actorId) as any;
  if (!actor || (actor.role !== 'production' && actor.role !== 'owner' && actor.role !== 'manager')) {
    return res.status(403).json({ error: 'Unauthorized to record production.' });
  }

  const total = Number(totalProduced);
  const rejected = Number(rejectedQty || 0);
  if (total <= 0) return res.status(400).json({ error: 'Total produced must be greater than zero.' });
  if (rejected < 0 || rejected > total) return res.status(400).json({ error: 'Invalid rejected quantity.' });

  const saleable = total - rejected;
  const id = 'bat_' + Date.now();
  const dateStr = new Date().toISOString().slice(0, 10);
  const count = (db.prepare('SELECT COUNT(*) as c FROM production_batches').get() as any).c;
  const batchNumber = `BATCH-${dateStr.replace(/-/g, '')}-${String(count + 1).padStart(3, '0')}`;
  const now = new Date().toISOString();

  // ATOMIC TRANSACTION: Insert batch AND deduct ingredient stocks
  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    db.prepare(`
      INSERT INTO production_batches (id, batch_number, date, product_id, total_produced, rejected_qty, saleable_qty, ingredients_used_json, status, notes, created_by, creator_name, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?)
    `).run(id, batchNumber, dateStr, productId, total, rejected, saleable, JSON.stringify(ingredientsUsed || []), notes || '', actor.id, actor.display_name, now);

    if (Array.isArray(ingredientsUsed)) {
      const updateIng = db.prepare('UPDATE ingredients SET current_stock = MAX(0, current_stock - ?) WHERE id = ?');
      for (const item of ingredientsUsed) {
        updateIng.run(item.quantity, item.ingredientId);
      }
    }

    db.exec('COMMIT;');
  } catch (err: any) {
    db.exec('ROLLBACK;');
    return res.status(500).json({ error: 'Database transaction failed: ' + err.message });
  }

  recordAudit(actor.id, actor.display_name, actor.role, 'RECORD_PRODUCTION', 'ProductionBatch', id, `Batch ${batchNumber}: ${total} produced, ${rejected} rejected`);
  realtimeHub.broadcast('sync', { entity: 'production', action: 'RECORD_PRODUCTION' });
  realtimeHub.broadcast('sync', { entity: 'ingredients', action: 'DEDUCT_USAGE' });

  res.json({ id, batchNumber, date: dateStr, productId, totalProduced: total, rejectedQty: rejected, saleableQty: saleable, status: 'completed' });
});

// ----------------------------------------------------------------------
// 7. DELIVERIES & DISTRIBUTION
// ----------------------------------------------------------------------
app.get('/api/deliveries', (req: Request, res: Response) => {
  const branch = req.query.branch as string;
  let query = 'SELECT * FROM deliveries';
  const params: any[] = [];
  if (branch && branch !== 'all') {
    query += ' WHERE to_branch = ?';
    params.push(branch);
  }
  query += ' ORDER BY date DESC, dispatch_time DESC';
  const rows = db.prepare(query).all(...params) as any[];

  const formatted = rows.map(r => ({
    id: r.id,
    deliveryNumber: r.delivery_number,
    date: r.date,
    dispatchTime: r.dispatch_time,
    batchId: r.batch_id,
    productId: r.product_id,
    fromBranch: r.from_branch,
    toBranch: r.to_branch,
    dispatchQty: r.dispatch_qty,
    receivedQty: r.received_qty,
    damagedMissingQty: r.damaged_missing_qty,
    status: r.status,
    dispatchedBy: r.dispatched_by,
    dispatcherName: r.dispatcher_name,
    receivedBy: r.received_by,
    receiverName: r.receiver_name,
    receivedAt: r.received_at,
    notes: r.notes
  }));

  res.json(formatted);
});

app.post('/api/deliveries', (req: Request, res: Response) => {
  const { batchId, productId, toBranch, dispatchQty, notes, actorId } = req.body;
  const actor = db.prepare('SELECT * FROM users WHERE id = ?').get(actorId) as any;
  if (!actor || (actor.role !== 'production' && actor.role !== 'owner' && actor.role !== 'manager')) {
    return res.status(403).json({ error: 'Unauthorized to dispatch deliveries.' });
  }

  const qty = Number(dispatchQty);
  if (qty <= 0) return res.status(400).json({ error: 'Dispatch quantity must be greater than zero.' });

  const id = 'del_' + Date.now();
  const dateStr = new Date().toISOString().slice(0, 10);
  const count = (db.prepare('SELECT COUNT(*) as c FROM deliveries').get() as any).c;
  const deliveryNumber = `DISP-${dateStr.replace(/-/g, '')}-${String(count + 1).padStart(3, '0')}`;
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  db.prepare(`
    INSERT INTO deliveries (id, delivery_number, date, dispatch_time, batch_id, product_id, from_branch, to_branch, dispatch_qty, status, dispatched_by, dispatcher_name, notes)
    VALUES (?, ?, ?, ?, ?, ?, 'coka', ?, ?, 'dispatched', ?, ?, ?)
  `).run(id, deliveryNumber, dateStr, now, batchId || '', productId, toBranch, qty, actor.id, actor.display_name, notes || '');

  recordAudit(actor.id, actor.display_name, actor.role, 'DISPATCH_BREAD', 'Delivery', id, `Dispatched ${qty} loaves to ${toBranch}`);
  realtimeHub.broadcast('sync', { entity: 'deliveries', action: 'DISPATCH_BREAD' });

  res.json({ id, deliveryNumber, status: 'dispatched' });
});

app.put('/api/deliveries/:id/confirm', (req: Request, res: Response) => {
  const { receivedQty, damagedMissingQty, notes, actorId } = req.body;
  const actor = db.prepare('SELECT * FROM users WHERE id = ?').get(actorId) as any;
  if (!actor) return res.status(401).json({ error: 'Unauthorized' });

  const delivery = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(req.params.id) as any;
  if (!delivery) return res.status(404).json({ error: 'Delivery not found.' });

  if (actor.role === 'sales' && actor.branch !== delivery.to_branch) {
    return res.status(403).json({ error: `Unauthorized: You cannot confirm deliveries for branch ${delivery.to_branch}.` });
  }

  const recQty = Number(receivedQty);
  const damQty = Number(damagedMissingQty || 0);
  const now = new Date().toISOString();
  const status = damQty > 0 || recQty !== delivery.dispatch_qty ? 'discrepancy' : 'received';

  db.prepare(`
    UPDATE deliveries SET received_qty = ?, damaged_missing_qty = ?, status = ?, received_by = ?, receiver_name = ?, received_at = ?, notes = notes || ' | ' || ?
    WHERE id = ?
  `).run(recQty, damQty, status, actor.id, actor.display_name, now, notes || '', delivery.id);

  recordAudit(actor.id, actor.display_name, actor.role, 'CONFIRM_DELIVERY', 'Delivery', delivery.id, `Confirmed delivery ${delivery.delivery_number} at ${delivery.to_branch}: received ${recQty}, damaged/missing ${damQty}`);
  realtimeHub.broadcast('sync', { entity: 'deliveries', action: 'CONFIRM_DELIVERY' });

  res.json({ success: true, status });
});

// ----------------------------------------------------------------------
// 8. SALES & DOWN PAYMENTS (ቀብድ) (Atomic transaction)
// ----------------------------------------------------------------------
app.get('/api/sales', (req: Request, res: Response) => {
  const branch = req.query.branch as string;
  let query = 'SELECT * FROM sales';
  const params: any[] = [];
  if (branch && branch !== 'all') {
    query += ' WHERE branch = ?';
    params.push(branch);
  }
  query += ' ORDER BY created_at DESC';
  const salesRows = db.prepare(query).all(...params) as any[];

  // Fetch all payments mapped by sale_id
  const paymentsRows = db.prepare('SELECT * FROM sale_payments ORDER BY created_at ASC').all() as any[];
  const paymentsBySaleId: Record<string, any[]> = {};
  for (const p of paymentsRows) {
    if (!paymentsBySaleId[p.sale_id]) paymentsBySaleId[p.sale_id] = [];
    paymentsBySaleId[p.sale_id].push({
      id: p.id,
      saleId: p.sale_id,
      customerName: p.customer_name,
      branch: p.branch,
      amount: p.amount,
      paymentMethod: p.payment_method,
      date: p.date,
      recordedBy: p.recorded_by,
      recorderName: p.recorder_name,
      type: p.type,
      notes: p.notes,
      createdAt: p.created_at
    });
  }

  const formatted = salesRows.map(s => ({
    id: s.id,
    saleNumber: s.sale_number,
    date: s.date,
    branch: s.branch,
    productId: s.product_id,
    quantity: s.quantity,
    unitPrice: s.unit_price,
    discount: s.discount,
    totalAmount: s.total_amount,
    paymentMethod: s.payment_method,
    paymentStatus: s.payment_status,
    amountPaid: s.amount_paid,
    remainingBalance: s.remaining_balance,
    customerName: s.customer_name,
    customerPhone: s.customer_phone,
    notes: s.notes,
    recordedBy: s.recorded_by,
    recorderName: s.recorder_name,
    createdAt: s.created_at,
    payments: paymentsBySaleId[s.id] || []
  }));

  res.json(formatted);
});

app.post('/api/sales', (req: Request, res: Response) => {
  const { branch, productId, quantity, unitPrice, discount, paymentMethod, paymentType, initialAmountPaid, customerName, customerPhone, notes, actorId } = req.body;
  const actor = db.prepare('SELECT * FROM users WHERE id = ?').get(actorId) as any;
  if (!actor) return res.status(401).json({ error: 'Unauthorized' });

  if (actor.role === 'sales' && actor.branch !== branch) {
    return res.status(403).json({ error: `Unauthorized: You cannot record sales for branch ${branch}.` });
  }

  const qty = Number(quantity);
  const price = Number(unitPrice);
  const disc = Number(discount || 0);
  if (qty <= 0) return res.status(400).json({ error: 'Quantity must be greater than zero.' });

  const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(productId) as any;
  if (!prod) return res.status(404).json({ error: 'Product not found.' });

  if (prod.unit === 'piece' && !Number.isInteger(qty)) {
    return res.status(400).json({ error: 'Piece-based products must use whole-number quantities.' });
  }

  const totalAmount = Math.max(0, qty * price - disc);
  const pType = paymentType || 'full';

  let paymentStatus = 'paid';
  let amountPaid = 0;
  let remainingBalance = 0;
  let initPaymentRecord: any = null;

  const saleId = 'sal_' + Date.now();
  const dateStr = new Date().toISOString().slice(0, 10);
  const branchPrefix = branch === 'coka' ? 'COKA' : 'MIZ';
  const saleNumber = `SL-${branchPrefix}-${Date.now().toString().slice(-6)}`;
  const now = new Date().toISOString();

  if (pType === 'down_payment') {
    if (!customerName || !String(customerName).trim()) {
      return res.status(400).json({ error: 'Customer name is required for down payments.' });
    }
    if (!customerPhone || !String(customerPhone).trim()) {
      return res.status(400).json({ error: 'Customer phone number is required for down payments.' });
    }
    const initAmt = Number(initialAmountPaid);
    if (isNaN(initAmt) || initAmt <= 0) {
      return res.status(400).json({ error: 'Down payment amount must be greater than zero.' });
    }
    if (initAmt > totalAmount) {
      return res.status(400).json({ error: 'Payment cannot exceed total sale amount.' });
    }

    amountPaid = initAmt;
    remainingBalance = totalAmount - initAmt;
    paymentStatus = remainingBalance === 0 ? 'paid' : 'partial';

    initPaymentRecord = {
      id: 'pmt_' + Date.now() + '_1',
      saleId,
      customerName: customerName.trim(),
      branch,
      amount: initAmt,
      paymentMethod,
      date: dateStr,
      recordedBy: actor.id,
      recorderName: actor.display_name,
      type: 'initial_down_payment',
      notes: notes || 'Initial down payment (ቀብድ)',
      createdAt: now
    };
  } else if (pType === 'unpaid') {
    if (!customerName || !String(customerName).trim()) {
      return res.status(400).json({ error: 'Customer name is required for credit sales.' });
    }
    amountPaid = 0;
    remainingBalance = totalAmount;
    paymentStatus = 'unpaid';
  } else {
    // Full payment
    amountPaid = totalAmount;
    remainingBalance = 0;
    paymentStatus = 'paid';

    initPaymentRecord = {
      id: 'pmt_' + Date.now() + '_1',
      saleId,
      customerName: customerName ? customerName.trim() : 'Walk-in Customer',
      branch,
      amount: totalAmount,
      paymentMethod,
      date: dateStr,
      recordedBy: actor.id,
      recorderName: actor.display_name,
      type: 'full_payment',
      notes: notes || '',
      createdAt: now
    };
  }

  // ATOMIC DATABASE TRANSACTION
  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    db.prepare(`
      INSERT INTO sales (id, sale_number, date, branch, product_id, quantity, unit_price, discount, total_amount, payment_method, payment_status, amount_paid, remaining_balance, customer_name, customer_phone, notes, recorded_by, recorder_name, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(saleId, saleNumber, dateStr, branch, productId, qty, price, disc, totalAmount, paymentMethod, paymentStatus, amountPaid, remainingBalance, customerName ? customerName.trim() : null, customerPhone ? customerPhone.trim() : null, notes || '', actor.id, actor.display_name, now);

    if (initPaymentRecord) {
      db.prepare(`
        INSERT INTO sale_payments (id, sale_id, customer_name, branch, amount, payment_method, date, recorded_by, recorder_name, type, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(initPaymentRecord.id, initPaymentRecord.saleId, initPaymentRecord.customerName, initPaymentRecord.branch, initPaymentRecord.amount, initPaymentRecord.paymentMethod, initPaymentRecord.date, initPaymentRecord.recordedBy, initPaymentRecord.recorderName, initPaymentRecord.type, initPaymentRecord.notes, initPaymentRecord.createdAt);
    }

    db.exec('COMMIT;');
  } catch (err: any) {
    db.exec('ROLLBACK;');
    return res.status(500).json({ error: 'Database transaction failed: ' + err.message });
  }

  recordAudit(actor.id, actor.display_name, actor.role, 'RECORD_SALE', 'Sale', saleId, `Recorded ${paymentStatus} sale ${saleNumber}: ${qty} units for ${totalAmount} ETB (Paid: ${amountPaid} ETB, Balance: ${remainingBalance} ETB)`);
  realtimeHub.broadcast('sync', { entity: 'sales', action: 'RECORD_SALE' });

  res.json({
    id: saleId,
    saleNumber,
    date: dateStr,
    branch,
    productId,
    quantity: qty,
    unitPrice: price,
    discount: disc,
    totalAmount,
    paymentMethod,
    paymentStatus,
    amountPaid,
    remainingBalance,
    customerName,
    customerPhone,
    notes,
    recordedBy: actor.id,
    recorderName: actor.display_name,
    createdAt: now,
    payments: initPaymentRecord ? [initPaymentRecord] : []
  });
});

app.post('/api/sales/:id/payments', (req: Request, res: Response) => {
  const { amount, paymentMethod, notes, actorId } = req.body;
  const actor = db.prepare('SELECT * FROM users WHERE id = ?').get(actorId) as any;
  if (!actor) return res.status(401).json({ error: 'Unauthorized' });

  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id) as any;
  if (!sale) return res.status(404).json({ error: 'Sale record not found.' });

  if (actor.role === 'sales' && actor.branch !== sale.branch) {
    return res.status(403).json({ error: `Unauthorized: You can only record payments for branch ${actor.branch}.` });
  }

  const pmtAmount = Number(amount);
  if (isNaN(pmtAmount) || pmtAmount <= 0) {
    return res.status(400).json({ error: 'Payment amount must be greater than zero.' });
  }

  if (pmtAmount > sale.remaining_balance) {
    return res.status(400).json({ error: `Payment amount (${pmtAmount} ETB) cannot exceed remaining balance (${sale.remaining_balance} ETB).` });
  }

  const newPaid = sale.amount_paid + pmtAmount;
  const newBalance = Math.max(0, sale.remaining_balance - pmtAmount);
  const newStatus = newBalance === 0 ? 'paid' : 'partial';

  const paymentId = 'pmt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();
  const dateStr = now.slice(0, 10);

  // ATOMIC TRANSACTION
  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    db.prepare(`
      UPDATE sales SET amount_paid = ?, remaining_balance = ?, payment_status = ? WHERE id = ?
    `).run(newPaid, newBalance, newStatus, sale.id);

    db.prepare(`
      INSERT INTO sale_payments (id, sale_id, customer_name, branch, amount, payment_method, date, recorded_by, recorder_name, type, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'subsequent_payment', ?, ?)
    `).run(paymentId, sale.id, sale.customer_name || 'Customer', sale.branch, pmtAmount, paymentMethod, dateStr, actor.id, actor.display_name, notes || '', now);

    db.exec('COMMIT;');
  } catch (err: any) {
    db.exec('ROLLBACK;');
    return res.status(500).json({ error: 'Database transaction failed: ' + err.message });
  }

  recordAudit(actor.id, actor.display_name, actor.role, 'RECORD_PAYMENT', 'SalePayment', paymentId, `Subsequent payment of ${pmtAmount} ETB for ${sale.sale_number} (${sale.customer_name}). Remaining balance: ${newBalance} ETB`);
  realtimeHub.broadcast('sync', { entity: 'sales', action: 'RECORD_PAYMENT' });

  res.json({
    success: true,
    amountPaid: newPaid,
    remainingBalance: newBalance,
    paymentStatus: newStatus,
    payment: {
      id: paymentId,
      saleId: sale.id,
      amount: pmtAmount,
      paymentMethod,
      date: dateStr,
      type: 'subsequent_payment',
      createdAt: now
    }
  });
});

// ----------------------------------------------------------------------
// 9. DAILY CLOSING & CASH HANDOVERS
// ----------------------------------------------------------------------
app.get('/api/daily-closings', (req: Request, res: Response) => {
  const branch = req.query.branch as string;
  let query = 'SELECT * FROM daily_closings';
  const params: any[] = [];
  if (branch && branch !== 'all') {
    query += ' WHERE branch = ?';
    params.push(branch);
  }
  query += ' ORDER BY date DESC, submitted_at DESC';
  const rows = db.prepare(query).all(...params) as any[];

  const formatted = rows.map(r => ({
    id: r.id,
    date: r.date,
    branch: r.branch,
    stockItems: JSON.parse(r.stock_items_json),
    cash: JSON.parse(r.cash_json),
    status: r.status,
    submittedBy: r.submitted_by,
    submitterName: r.submitter_name,
    submittedAt: r.submitted_at,
    notes: r.notes
  }));

  res.json(formatted);
});

app.post('/api/daily-closings', (req: Request, res: Response) => {
  const { branch, stockItems, cash, notes, actorId } = req.body;
  const actor = db.prepare('SELECT * FROM users WHERE id = ?').get(actorId) as any;
  if (!actor) return res.status(401).json({ error: 'Unauthorized' });

  if (actor.role === 'sales' && actor.branch !== branch) {
    return res.status(403).json({ error: `Unauthorized: You cannot submit closing for branch ${branch}.` });
  }

  // Mandatory discrepancy checks
  if (Array.isArray(stockItems)) {
    for (const item of stockItems) {
      if (item.discrepancy !== 0 && (!item.discrepancyReason || !item.discrepancyReason.trim())) {
        return res.status(400).json({ error: 'Mandatory: An explanation is required for every stock discrepancy.' });
      }
    }
  }

  if (cash && cash.cashDiscrepancy !== 0 && (!cash.cashDiscrepancyReason || !cash.cashDiscrepancyReason.trim())) {
    return res.status(400).json({ error: 'Mandatory: An explanation is required for any cash discrepancy.' });
  }

  const id = 'cls_' + Date.now();
  const dateStr = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();
  const handoverId = 'hnd_' + Date.now();
  const cashCounted = cash ? Number(cash.actualCashCounted || 0) : 0;

  // ATOMIC TRANSACTION: Insert Closing AND Create Cash Handover Entry
  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    db.prepare(`
      INSERT INTO daily_closings (id, date, branch, stock_items_json, cash_json, status, submitted_by, submitter_name, submitted_at, notes)
      VALUES (?, ?, ?, ?, ?, 'submitted', ?, ?, ?, ?)
    `).run(id, dateStr, branch, JSON.stringify(stockItems || []), JSON.stringify(cash || {}), actor.id, actor.display_name, now, notes || '');

    db.prepare(`
      INSERT INTO cash_handovers (id, closing_id, date, branch, amount_counted, amount_collected, amount_confirmed, status, sales_staff_id, sales_staff_name, notes)
      VALUES (?, ?, ?, ?, ?, 0, 0, 'counted', ?, ?, ?)
    `).run(handoverId, id, dateStr, branch, cashCounted, actor.id, actor.display_name, notes || '');

    db.exec('COMMIT;');
  } catch (err: any) {
    db.exec('ROLLBACK;');
    return res.status(500).json({ error: 'Database transaction failed: ' + err.message });
  }

  recordAudit(actor.id, actor.display_name, actor.role, 'SUBMIT_CLOSING', 'DailyClosing', id, `Submitted daily closing for ${branch}: ${cashCounted} ETB counted`);
  realtimeHub.broadcast('sync', { entity: 'closings', action: 'SUBMIT_CLOSING' });
  realtimeHub.broadcast('sync', { entity: 'handovers', action: 'SUBMIT_CLOSING' });

  res.json({ id, date: dateStr, branch, status: 'submitted', handoverId });
});

app.get('/api/cash-handovers', (req: Request, res: Response) => {
  const branch = req.query.branch as string;
  let query = 'SELECT * FROM cash_handovers';
  const params: any[] = [];
  if (branch && branch !== 'all') {
    query += ' WHERE branch = ?';
    params.push(branch);
  }
  query += ' ORDER BY date DESC';
  const rows = db.prepare(query).all(...params) as any[];

  const formatted = rows.map(r => ({
    id: r.id,
    closingId: r.closing_id,
    date: r.date,
    branch: r.branch,
    amountCounted: r.amount_counted,
    amountCollected: r.amount_collected,
    amountConfirmed: r.amount_confirmed,
    status: r.status,
    salesStaffId: r.sales_staff_id,
    salesStaffName: r.sales_staff_name,
    collectedByStaffId: r.collected_by_staff_id,
    collectedByStaffName: r.collected_by_staff_name,
    collectedAt: r.collected_at,
    confirmedByManagerId: r.confirmed_by_manager_id,
    confirmedByManagerName: r.confirmed_by_manager_name,
    confirmedAt: r.confirmed_at,
    notes: r.notes
  }));

  res.json(formatted);
});

app.put('/api/cash-handovers/:id/collect', (req: Request, res: Response) => {
  const { amountCollected, notes, actorId } = req.body;
  const actor = db.prepare('SELECT * FROM users WHERE id = ?').get(actorId) as any;
  if (!actor || (actor.role !== 'production' && actor.role !== 'owner' && actor.role !== 'manager')) {
    return res.status(403).json({ error: 'Unauthorized to collect cash in transit.' });
  }

  const amt = Number(amountCollected);
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE cash_handovers SET amount_collected = ?, status = 'collected_in_transit', collected_by_staff_id = ?, collected_by_staff_name = ?, collected_at = ?, notes = notes || ' | ' || ?
    WHERE id = ?
  `).run(amt, actor.id, actor.display_name, now, notes || '', req.params.id);

  recordAudit(actor.id, actor.display_name, actor.role, 'COLLECT_CASH', 'CashHandover', req.params.id, `Collected ${amt} ETB from Mizan branch`);
  realtimeHub.broadcast('sync', { entity: 'handovers', action: 'COLLECT_CASH' });

  res.json({ success: true });
});

app.put('/api/cash-handovers/:id/confirm', (req: Request, res: Response) => {
  const { amountConfirmed, notes, actorId } = req.body;
  const actor = db.prepare('SELECT * FROM users WHERE id = ?').get(actorId) as any;
  if (!actor || (actor.role !== 'manager' && actor.role !== 'owner')) {
    return res.status(403).json({ error: 'Unauthorized: Only Manager or Owner can confirm cash receipt into vault.' });
  }

  const amt = Number(amountConfirmed);
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE cash_handovers SET amount_confirmed = ?, status = 'confirmed_by_manager', confirmed_by_manager_id = ?, confirmed_by_manager_name = ?, confirmed_at = ?, notes = notes || ' | ' || ?
    WHERE id = ?
  `).run(amt, actor.id, actor.display_name, now, notes || '', req.params.id);

  recordAudit(actor.id, actor.display_name, actor.role, 'CONFIRM_CASH', 'CashHandover', req.params.id, `Manager confirmed ${amt} ETB received in vault`);
  realtimeHub.broadcast('sync', { entity: 'handovers', action: 'CONFIRM_CASH' });

  res.json({ success: true });
});

// ----------------------------------------------------------------------
// 10. PURCHASES & EXPENSES & SUPPLIERS
// ----------------------------------------------------------------------
app.get('/api/purchases', (req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM purchases ORDER BY date DESC').all() as any[];
  const formatted = rows.map(r => ({
    id: r.id,
    invoiceNumber: r.invoice_number,
    date: r.date,
    supplierId: r.supplier_id,
    supplierName: r.supplier_name,
    items: JSON.parse(r.items_json),
    totalAmount: r.total_amount,
    paymentStatus: r.payment_status,
    recordedBy: r.recorded_by,
    recorderName: r.recorder_name,
    createdAt: r.created_at
  }));
  res.json(formatted);
});

app.post('/api/purchases', (req: Request, res: Response) => {
  const { supplierId, supplierName, items, totalAmount, paymentStatus, actorId } = req.body;
  const actor = db.prepare('SELECT * FROM users WHERE id = ?').get(actorId) as any;
  if (!actor || (actor.role !== 'owner' && actor.role !== 'manager')) {
    return res.status(403).json({ error: 'Unauthorized: Only Owner or Manager can record purchases.' });
  }

  const id = 'pur_' + Date.now();
  const dateStr = new Date().toISOString().slice(0, 10);
  const count = (db.prepare('SELECT COUNT(*) as c FROM purchases').get() as any).c;
  const invoiceNumber = `INV-${dateStr.replace(/-/g, '')}-${String(count + 1).padStart(2, '0')}`;
  const now = new Date().toISOString();

  // ATOMIC: Insert Purchase AND Increase Ingredient Stocks
  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    db.prepare(`
      INSERT INTO purchases (id, invoice_number, date, supplier_id, supplier_name, items_json, total_amount, payment_status, recorded_by, recorder_name, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, invoiceNumber, dateStr, supplierId, supplierName, JSON.stringify(items || []), Number(totalAmount), paymentStatus || 'paid', actor.id, actor.display_name, now);

    if (Array.isArray(items)) {
      const addStock = db.prepare('UPDATE ingredients SET current_stock = current_stock + ? WHERE id = ?');
      for (const item of items) {
        addStock.run(item.quantity, item.ingredientId);
      }
    }

    db.exec('COMMIT;');
  } catch (err: any) {
    db.exec('ROLLBACK;');
    return res.status(500).json({ error: 'Database transaction failed: ' + err.message });
  }

  recordAudit(actor.id, actor.display_name, actor.role, 'RECORD_PURCHASE', 'Purchase', id, `Purchase ${invoiceNumber} from ${supplierName} for ${totalAmount} ETB`);
  realtimeHub.broadcast('sync', { entity: 'purchases', action: 'RECORD_PURCHASE' });
  realtimeHub.broadcast('sync', { entity: 'ingredients', action: 'INCREASE_STOCK' });

  res.json({ id, invoiceNumber, success: true });
});

app.get('/api/suppliers', (req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM suppliers').all() as any[];
  const formatted = rows.map(r => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    email: r.email,
    address: r.address,
    supplies: JSON.parse(r.supplies_json || '[]')
  }));
  res.json(formatted);
});

app.post('/api/suppliers', (req: Request, res: Response) => {
  const { name, phone, email, address, supplies, actorId } = req.body;
  const actor = db.prepare('SELECT * FROM users WHERE id = ?').get(actorId) as any;
  if (!actor || (actor.role !== 'owner' && actor.role !== 'manager')) {
    return res.status(403).json({ error: 'Unauthorized.' });
  }

  const id = 'sup_' + Date.now();
  db.prepare(`
    INSERT INTO suppliers (id, name, phone, email, address, supplies_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, name, phone, email, address, JSON.stringify(supplies || []));

  realtimeHub.broadcast('sync', { entity: 'suppliers', action: 'CREATE_SUPPLIER' });
  res.json({ id, name, phone, email, address, supplies });
});

app.get('/api/expenses', (req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM expenses ORDER BY date DESC').all() as any[];
  const formatted = rows.map(r => ({
    id: r.id,
    expenseNumber: r.expense_number,
    date: r.date,
    branch: r.branch,
    category: r.category,
    amount: r.amount,
    paymentMethod: r.payment_method,
    description: r.description,
    recordedBy: r.recorded_by,
    recorderName: r.recorder_name,
    createdAt: r.created_at
  }));
  res.json(formatted);
});

app.post('/api/expenses', (req: Request, res: Response) => {
  const { branch, category, amount, paymentMethod, description, actorId } = req.body;
  const actor = db.prepare('SELECT * FROM users WHERE id = ?').get(actorId) as any;
  if (!actor || (actor.role !== 'owner' && actor.role !== 'manager')) {
    return res.status(403).json({ error: 'Unauthorized to record operating expenses.' });
  }

  const amt = Number(amount);
  if (amt <= 0) return res.status(400).json({ error: 'Expense amount must be greater than zero.' });

  const id = 'exp_' + Date.now();
  const dateStr = new Date().toISOString().slice(0, 10);
  const count = (db.prepare('SELECT COUNT(*) as c FROM expenses').get() as any).c;
  const expenseNumber = `EXP-${dateStr.replace(/-/g, '')}-${String(count + 1).padStart(2, '0')}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO expenses (id, expense_number, date, branch, category, amount, payment_method, description, recorded_by, recorder_name, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, expenseNumber, dateStr, branch, category, amt, paymentMethod, description, actor.id, actor.display_name, now);

  recordAudit(actor.id, actor.display_name, actor.role, 'RECORD_EXPENSE', 'Expense', id, `Expense ${expenseNumber}: ${amt} ETB (${category})`);
  realtimeHub.broadcast('sync', { entity: 'expenses', action: 'RECORD_EXPENSE' });

  res.json({ id, expenseNumber, amount: amt, success: true });
});

// ----------------------------------------------------------------------
// 11. AUDIT LOGS & SETTINGS
// ----------------------------------------------------------------------
app.get('/api/audit-logs', (req: Request, res: Response) => {
  const rows = db.prepare('SELECT id, timestamp, actor_id as actorId, actor_name as actorName, actor_role as actorRole, action, target_type as targetType, target_id as targetId, details FROM audit_logs ORDER BY timestamp DESC LIMIT 500').all();
  res.json(rows);
});

app.get('/api/settings', (req: Request, res: Response) => {
  const row = db.prepare('SELECT value_json FROM settings WHERE key = ?').get('global') as any;
  if (row) {
    res.json(JSON.parse(row.value_json));
  } else {
    res.json({
      bakeryName: "Mi'aawaa Bakery",
      logoUrl: null,
      defaultLanguage: 'om',
      supportedLanguages: ['en', 'om', 'am'],
      businessTimezone: 'Africa/Addis_Ababa',
      currency: 'ETB',
      businessDate: '2026-10-03'
    });
  }
});

app.put('/api/settings', (req: Request, res: Response) => {
  const { settings, actorId } = req.body;
  const actor = db.prepare('SELECT * FROM users WHERE id = ?').get(actorId) as any;
  if (!actor || actor.role !== 'owner') {
    return res.status(403).json({ error: 'Unauthorized: Only Owner can modify bakery settings.' });
  }

  const existingRow = db.prepare('SELECT value_json FROM settings WHERE key = ?').get('global') as any;
  const current = existingRow ? JSON.parse(existingRow.value_json) : {};
  const updated = { ...current, ...settings };

  db.prepare('INSERT OR REPLACE INTO settings (key, value_json) VALUES (?, ?)').run('global', JSON.stringify(updated));

  recordAudit(actor.id, actor.display_name, actor.role, 'UPDATE_SETTINGS', 'AppSettings', 'global', `Updated settings: ${Object.keys(settings).join(', ')}`);
  realtimeHub.broadcast('sync', { entity: 'settings', action: 'UPDATE_SETTINGS' });

  res.json(updated);
});

// ----------------------------------------------------------------------
// 12. VITE MIDDLEWARES IN DEV OR STATIC FILES IN PROD
// ----------------------------------------------------------------------
async function start() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Mi'aawaa Bakery Management System Server running on http://0.0.0.0:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Fatal server startup failure:', err);
  process.exit(1);
});
