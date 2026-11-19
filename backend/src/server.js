import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readDb, writeDb, getLocalDateKey, getNextOrderCode } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIST = path.join(__dirname, '..', '..', 'frontend', 'dist');
const APK_PATH = path.join(__dirname, '..', '..', 'android-bridge', 'raumamix-printer.apk');

const app = express();
const PORT = process.env.PORT || 3001;

const GAS_URL = (process.env.GAS_URL || '').trim();
const GAS_SECRET = (process.env.GAS_SECRET || '').trim();
const TOKEN_SECRET = (
  process.env.ADMIN_TOKEN_SECRET ||
  GAS_SECRET ||
  'raumamix-local-dev-secret'
).trim();
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

app.use(cors());
app.use(express.json());

function getVnTodayStr() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function signAdminToken(user) {
  const payload = {
    username: user.username,
    role: user.role || 'staff',
    storeId: user.storeId || 'default',
    storeName: user.storeName || 'Nguyễn Chánh',
    spreadsheetId: user.spreadsheetId || '',
    exp: Date.now() + TOKEN_TTL_MS
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function getUserFromReq(req) {
  const auth = String(req.headers.authorization || '');
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  const dot = token.indexOf('.');
  if (dot === -1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(body).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.username || !payload.exp || Date.now() > payload.exp) return null;
    return {
      username: payload.username,
      role: payload.role || 'staff',
      storeId: payload.storeId || 'default',
      storeName: payload.storeName || 'Nguyễn Chánh',
      spreadsheetId: payload.spreadsheetId || ''
    };
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const user = getUserFromReq(req);
  if (!user) {
    return res.status(401).json({ error: 'Vui lòng đăng nhập để tiếp tục' });
  }
  req.user = user;
  next();
}

function requirePos(req, res, next) {
  const user = getUserFromReq(req);
  if (!user) {
    return res.status(401).json({ error: 'Vui lòng đăng nhập để tiếp tục' });
  }
  if (user.role !== 'staff') {
    return res.status(403).json({ error: 'Chỉ tài khoản bán hàng mới được thao tác trên POS' });
  }
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  const user = getUserFromReq(req);
  if (!user) {
    return res.status(401).json({ error: 'Vui lòng đăng nhập Admin' });
  }
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Tài khoản bán hàng không có quyền quản trị' });
  }
  req.user = user;
  req.admin = user;
  next();
}

function requireSuperAdmin(req, res, next) {
  const user = getUserFromReq(req);
  if (!user) {
    return res.status(401).json({ error: 'Vui lòng đăng nhập Super Admin' });
  }
  if (user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Chỉ Super Admin mới có quyền thực hiện thao tác này' });
  }
  req.user = user;
  req.admin = user;
  next();
}

async function fetchAllStores() {
  if (GAS_URL) {
    const data = await gasGet({ action: 'stores' });
    return data.stores || [];
  }
  return readDb().stores || [];
}

async function resolveTargetStore(req) {
  const requestedStoreId = String(req.query?.storeId || req.body?.storeId || '').trim();
  if (req.user.role !== 'superadmin') {
    return {
      storeId: req.user.storeId,
      storeName: req.user.storeName,
      spreadsheetId: req.user.spreadsheetId
    };
  }
  const stores = await fetchAllStores();
  const activeStores = stores.filter((s) => s.active !== false);
  const picked =
    (requestedStoreId && requestedStoreId !== 'all'
      ? stores.find((s) => s.id === requestedStoreId)
      : null) ||
    activeStores[0] ||
    stores[0];
  if (!picked) {
    return {
      storeId: 'default',
      storeName: 'Nguyễn Chánh',
      spreadsheetId: req.user.spreadsheetId || ''
    };
  }
  return {
    storeId: picked.id,
    storeName: picked.name,
    spreadsheetId: picked.spreadsheetId || ''
  };
}

async function gasGet(params) {
  const url = new URL(GAS_URL);
  if (GAS_SECRET) url.searchParams.set('secret', GAS_SECRET);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.set(k, String(v));
    }
  }
  const resp = await fetch(url.toString(), { redirect: 'follow' });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || data.error) {
    const err = new Error(data.error || `Lỗi Google Sheet (${resp.status})`);
    err.status = data.error === 'Unauthorized' ? 401 : 400;
    throw err;
  }
  return data;
}

async function gasPost(payload) {
  const resp = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...payload, ...(GAS_SECRET ? { secret: GAS_SECRET } : {}) }),
    redirect: 'follow'
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || data.error) {
    const err = new Error(data.error || `Lỗi Google Sheet (${resp.status})`);
    err.status = data.error === 'Unauthorized' ? 401 : 400;
    throw err;
  }
  return data;
}

function handleError(res, err) {
  res.status(err.status || 500).json({ error: err.message || 'Lỗi máy chủ' });
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, mode: GAS_URL ? 'google-sheet' : 'local', time: new Date().toISOString() });
});

// --- AUTH ---
function checkPortalAllowed(user, portal) {
  if (portal === 'pos' && user.role !== 'staff') {
    return 'Tài khoản quản trị chỉ dùng cho trang Admin, không đăng nhập vào Bán hàng';
  }
  if (portal === 'admin' && user.role === 'staff') {
    return 'Tài khoản bán hàng chỉ dùng cho trang POS, không có quyền vào Admin';
  }
  return '';
}

async function handleLogin(req, res) {
  try {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');
    const portal = String(req.body?.portal || '').trim();
    if (!username || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ tài khoản và mật khẩu' });
    }

    if (GAS_URL) {
      const data = await gasPost({ action: 'adminLogin', username, password });
      const user = data.user || { username, role: 'staff', storeId: 'default', storeName: 'Nguyễn Chánh' };
      const portalErr = checkPortalAllowed(user, portal);
      if (portalErr) return res.status(403).json({ error: portalErr });
      return res.json({ ok: true, user, token: signAdminToken(user) });
    }

    const db = readDb();
    const found = (db.admins || []).find(
      (a) => String(a.username).trim() === username && String(a.password) === password && a.active !== false
    );
    if (!found) {
      return res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu' });
    }
    const role = found.role || 'admin';
    if (role === 'superadmin') {
      const user = {
        username: found.username,
        role: 'superadmin',
        storeId: '*',
        storeName: 'Tất cả quán',
        spreadsheetId: ''
      };
      const portalErr = checkPortalAllowed(user, portal);
      if (portalErr) return res.status(403).json({ error: portalErr });
      return res.json({ ok: true, user, token: signAdminToken(user) });
    }
    const store = (db.stores || []).find((s) => s.id === (found.storeId || 'default'));
    if (!store || store.active === false) {
      return res.status(403).json({ error: 'Quán của tài khoản này đang tạm ngưng hoặc chưa được cấu hình' });
    }
    const user = {
      username: found.username,
      role,
      storeId: store.id,
      storeName: store.name,
      spreadsheetId: ''
    };
    const portalErr = checkPortalAllowed(user, portal);
    if (portalErr) return res.status(403).json({ error: portalErr });
    res.json({ ok: true, user, token: signAdminToken(user) });
  } catch (err) {
    handleError(res, err);
  }
}

app.post('/api/login', handleLogin);
app.post('/api/admin/login', handleLogin);

app.get('/api/me', requireAuth, async (req, res) => {
  try {
    const stores = req.user.role === 'superadmin' ? await fetchAllStores() : undefined;
    res.json({ user: req.user, ...(stores ? { stores } : {}) });
  } catch (err) {
    handleError(res, err);
  }
});

app.post('/api/admin/change-password', requireAuth, async (req, res) => {
  try {
    const username = req.user.username;
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');
    if (!currentPassword || newPassword.length < 4) {
      return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 4 ký tự' });
    }

    if (GAS_URL) {
      const data = await gasPost({ action: 'adminChangePassword', username, currentPassword, newPassword });
      return res.json(data);
    }

    const db = readDb();
    const target = (db.admins || []).find(
      (a) => String(a.username).trim() === username && String(a.password) === currentPassword
    );
    if (!target) {
      return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng' });
    }
    target.password = newPassword;
    writeDb(db);
    res.json({ ok: true });
  } catch (err) {
    handleError(res, err);
  }
});

// --- STORES & USERS (Super Admin) ---
app.get('/api/stores', requireSuperAdmin, async (_req, res) => {
  try {
    const stores = await fetchAllStores();
    res.json({ stores });
  } catch (err) {
    handleError(res, err);
  }
});

app.post('/api/stores', requireSuperAdmin, async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const id = String(req.body?.id || '').trim();
    const spreadsheetId = String(req.body?.spreadsheetId || '').trim();
    const staffUsername = String(req.body?.staffUsername || '').trim();
    const staffPassword = String(req.body?.staffPassword || '');
    const adminUsername = String(req.body?.adminUsername || '').trim();
    const adminPassword = String(req.body?.adminPassword || '');

    if (!name) return res.status(400).json({ error: 'Vui lòng nhập tên quán' });
    if (!staffUsername || staffPassword.length < 4) {
      return res.status(400).json({ error: 'Vui lòng nhập tài khoản nhân viên và mật khẩu (>= 4 ký tự)' });
    }
    if (!adminUsername || adminPassword.length < 4) {
      return res.status(400).json({ error: 'Vui lòng nhập tài khoản admin quán và mật khẩu (>= 4 ký tự)' });
    }
    if (staffUsername === adminUsername) {
      return res.status(400).json({ error: 'Tài khoản nhân viên và tài khoản admin không được trùng nhau' });
    }

    if (GAS_URL) {
      return res.status(201).json(await gasPost({
        action: 'createStore',
        id,
        name,
        spreadsheetId,
        staffUsername,
        staffPassword,
        adminUsername,
        adminPassword
      }));
    }

    const db = readDb();
    const storeId = id || `store-${crypto.randomBytes(3).toString('hex')}`;
    if ((db.stores || []).some((s) => s.id === storeId)) {
      return res.status(400).json({ error: 'Mã quán đã tồn tại' });
    }
    if ((db.admins || []).some((u) => u.username === staffUsername)) {
      return res.status(400).json({ error: `Tài khoản nhân viên "${staffUsername}" đã tồn tại` });
    }
    if ((db.admins || []).some((u) => u.username === adminUsername)) {
      return res.status(400).json({ error: `Tài khoản admin "${adminUsername}" đã tồn tại` });
    }
    const now = new Date().toISOString();
    const store = { id: storeId, name, spreadsheetId, active: true, createdAt: now };
    const staffUser = { username: staffUsername, password: staffPassword, role: 'staff', storeId, active: true, createdAt: now };
    const adminUser = { username: adminUsername, password: adminPassword, role: 'admin', storeId, active: true, createdAt: now };
    db.stores.push(store);
    db.admins.push(staffUser, adminUser);
    writeDb(db);
    res.status(201).json({
      store,
      users: [
        { username: staffUsername, role: 'staff', storeId, active: true, createdAt: now },
        { username: adminUsername, role: 'admin', storeId, active: true, createdAt: now }
      ]
    });
  } catch (err) {
    handleError(res, err);
  }
});

app.patch('/api/stores/:id', requireSuperAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    if (GAS_URL) {
      return res.json(await gasPost({ action: 'updateStore', id, ...req.body }));
    }
    const db = readDb();
    const store = (db.stores || []).find((s) => s.id === id);
    if (!store) return res.status(404).json({ error: 'Không tìm thấy quán' });
    if (req.body?.name !== undefined) store.name = String(req.body.name).trim();
    if (req.body?.spreadsheetId !== undefined) store.spreadsheetId = String(req.body.spreadsheetId).trim();
    if (req.body?.active !== undefined) store.active = Boolean(req.body.active);
    writeDb(db);
    res.json({ ok: true, store });
  } catch (err) {
    handleError(res, err);
  }
});

app.delete('/api/stores/:id', requireSuperAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    if (id === 'default') {
      return res.status(400).json({ error: 'Không thể xóa quán mặc định' });
    }
    if (GAS_URL) {
      return res.json(await gasPost({ action: 'deleteStore', id }));
    }
    const db = readDb();
    const before = (db.stores || []).length;
    db.stores = (db.stores || []).filter((s) => s.id !== id);
    if (db.stores.length === before) {
      return res.status(404).json({ error: 'Không tìm thấy quán' });
    }
    db.admins = (db.admins || []).filter((u) => u.storeId !== id);
    db.orders = (db.orders || []).filter((o) => o.storeId !== id);
    db.shifts = (db.shifts || []).filter((s) => s.storeId !== id);
    writeDb(db);
    res.json({ ok: true });
  } catch (err) {
    handleError(res, err);
  }
});

app.get('/api/users', requireSuperAdmin, async (_req, res) => {
  try {
    if (GAS_URL) {
      return res.json(await gasGet({ action: 'users' }));
    }
    const db = readDb();
    const users = (db.admins || []).map((u) => ({
      username: u.username,
      role: u.role || 'admin',
      storeId: u.storeId || 'default',
      active: u.active !== false
    }));
    res.json({ users });
  } catch (err) {
    handleError(res, err);
  }
});

app.post('/api/users', requireSuperAdmin, async (req, res) => {
  try {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');
    const role = String(req.body?.role || 'staff').trim();
    const storeId = role === 'superadmin' ? '*' : String(req.body?.storeId || '').trim();
    if (!username || password.length < 4) {
      return res.status(400).json({ error: 'Tài khoản không được trống và mật khẩu tối thiểu 4 ký tự' });
    }
    if (role !== 'superadmin' && !storeId) {
      return res.status(400).json({ error: 'Vui lòng chọn quán cho tài khoản này' });
    }
    if (GAS_URL) {
      return res.status(201).json(await gasPost({ action: 'createUser', username, password, role, storeId }));
    }
    const db = readDb();
    if ((db.admins || []).some((u) => u.username === username)) {
      return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại' });
    }
    const user = { username, password, role, storeId, active: true, createdAt: new Date().toISOString() };
    db.admins.push(user);
    writeDb(db);
    res.status(201).json({ user: { username, role, storeId, active: true } });
  } catch (err) {
    handleError(res, err);
  }
});

app.patch('/api/users/:username', requireSuperAdmin, async (req, res) => {
  try {
    const username = req.params.username;
    if (GAS_URL) {
      return res.json(await gasPost({ action: 'updateUser', username, ...req.body }));
    }
    const db = readDb();
    const user = (db.admins || []).find((u) => u.username === username);
    if (!user) return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
    if (req.body?.password && String(req.body.password).length >= 4) {
      user.password = String(req.body.password);
    }
    if (req.body?.role !== undefined) {
      user.role = String(req.body.role).trim();
      if (user.role === 'superadmin') user.storeId = '*';
    }
    if (req.body?.storeId !== undefined && user.role !== 'superadmin') {
      user.storeId = String(req.body.storeId).trim();
    }
    if (req.body?.active !== undefined) user.active = Boolean(req.body.active);
    writeDb(db);
    res.json({ ok: true });
  } catch (err) {
    handleError(res, err);
  }
});

// --- MENU (Categories, Products, Sizes, Toppings) ---
app.get('/api/menu', requireAuth, async (req, res) => {
  try {
    const store = await resolveTargetStore(req);
    if (GAS_URL) {
      return res.json(await gasGet({ action: 'menu', spreadsheetId: store.spreadsheetId }));
    }
    const db = readDb();
    res.json({
      categories: db.categories,
      sizes: db.sizes,
      products: db.products,
      toppings: db.toppings
    });
  } catch (err) {
    handleError(res, err);
  }
});

app.post('/api/categories', requireAdmin, async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Thiếu tên nhóm món' });
    const store = await resolveTargetStore(req);
    if (GAS_URL) {
      return res.status(201).json(await gasPost({ action: 'createCategory', spreadsheetId: store.spreadsheetId, name }));
    }
    const db = readDb();
    if (db.categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      return res.status(400).json({ error: 'Nhóm món đã tồn tại' });
    }
    const category = { id: `cat-${crypto.randomBytes(3).toString('hex')}`, name };
    db.categories.push(category);
    writeDb(db);
    res.status(201).json(category);
  } catch (err) {
    handleError(res, err);
  }
});

app.delete('/api/categories/:id', requireAdmin, async (req, res) => {
  try {
    const store = await resolveTargetStore(req);
    if (GAS_URL) {
      return res.json(await gasPost({ action: 'deleteCategory', spreadsheetId: store.spreadsheetId, id: req.params.id }));
    }
    const db = readDb();
    const target = db.categories.find((c) => c.id === req.params.id);
    if (!target) return res.status(404).json({ error: 'Không tìm thấy nhóm món' });
    db.categories = db.categories.filter((c) => c.id !== req.params.id);
    writeDb(db);
    res.json({ ok: true });
  } catch (err) {
    handleError(res, err);
  }
});

app.post('/api/products', requireAdmin, async (req, res) => {
  try {
    const { name, category, price, priceM, channelPrices } = req.body;
    const basePrice = price ?? priceM;
    if (!name || basePrice == null) {
      return res.status(400).json({ error: 'Thiếu tên món hoặc giá bán' });
    }
    const store = await resolveTargetStore(req);
    if (GAS_URL) {
      return res.status(201).json(await gasPost({ action: 'createProduct', spreadsheetId: store.spreadsheetId, name, category, price: basePrice, channelPrices }));
    }
    const db = readDb();
    const catName = String(category || db.categories[0]?.name || 'Rau Má Mix').trim();
    if (!db.categories.some((c) => c.name === catName)) {
      db.categories.push({ id: `cat-${crypto.randomBytes(3).toString('hex')}`, name: catName });
    }
    const product = {
      id: `p-${crypto.randomBytes(4).toString('hex')}`,
      name: String(name).trim(),
      category: catName,
      price: Number(basePrice),
      ...(channelPrices && typeof channelPrices === 'object' ? { channelPrices } : {}),
      active: true
    };
    db.products.push(product);
    writeDb(db);
    res.status(201).json(product);
  } catch (err) {
    handleError(res, err);
  }
});

app.patch('/api/products/:id', requireAdmin, async (req, res) => {
  try {
    const store = await resolveTargetStore(req);
    if (GAS_URL) {
      return res.json(await gasPost({ action: 'updateProduct', spreadsheetId: store.spreadsheetId, id: req.params.id, ...req.body }));
    }
    const db = readDb();
    const idx = db.products.findIndex((p) => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Không tìm thấy món' });

    const { name, category, price, channelPrices, active } = req.body;
    const current = db.products[idx];
    db.products[idx] = {
      ...current,
      ...(name !== undefined ? { name: String(name).trim() } : {}),
      ...(category !== undefined ? { category: String(category).trim() } : {}),
      ...(price !== undefined ? { price: Number(price) } : {}),
      ...(channelPrices !== undefined ? { channelPrices } : {}),
      ...(active !== undefined ? { active: Boolean(active) } : {})
    };
    writeDb(db);
    res.json(db.products[idx]);
  } catch (err) {
    handleError(res, err);
  }
});

app.delete('/api/products/:id', requireAdmin, async (req, res) => {
  try {
    const store = await resolveTargetStore(req);
    if (GAS_URL) {
      return res.json(await gasPost({ action: 'deleteProduct', spreadsheetId: store.spreadsheetId, id: req.params.id }));
    }
    const db = readDb();
    const before = db.products.length;
    db.products = db.products.filter((p) => p.id !== req.params.id);
    if (db.products.length === before) {
      return res.status(404).json({ error: 'Không tìm thấy món' });
    }
    writeDb(db);
    res.json({ ok: true });
  } catch (err) {
    handleError(res, err);
  }
});

// --- ORDERS ---
app.get('/api/orders', requireAuth, async (req, res) => {
  try {
    const store = await resolveTargetStore(req);
    const db = readDb();
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    const today = getVnTodayStr();
    const from = isAdmin ? (req.query.from ? String(req.query.from) : '') : today;
    const to = isAdmin ? (req.query.to ? String(req.query.to) : '') : today;
    let orders = (db.orders || []).filter((o) => (o.storeId || 'default') === store.storeId);

    if (from) orders = orders.filter((o) => o.dateKey >= from);
    if (to) orders = orders.filter((o) => o.dateKey <= to);

    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(orders);
  } catch (err) {
    handleError(res, err);
  }
});

function computeLocalShiftStats(db, shift) {
  const shiftOrders = (db.orders || []).filter((o) => o.shiftId === shift.id);
  const completed = shiftOrders.filter((o) => o.status !== 'cancelled');
  const byPaymentMethod = {};
  const byOrderType = {};
  let totalRevenue = 0;

  for (const o of completed) {
    totalRevenue += o.total;
    byPaymentMethod[o.paymentMethod] = (byPaymentMethod[o.paymentMethod] || 0) + o.total;
    byOrderType[o.orderType] = (byOrderType[o.orderType] || 0) + o.total;
  }

  const cashSales = byPaymentMethod['Tiền mặt'] || 0;
  return {
    ...shift,
    totalOrders: completed.length,
    cancelledOrders: shiftOrders.length - completed.length,
    totalRevenue,
    byPaymentMethod,
    byOrderType,
    expectedCash: (Number(shift.openingCash) || 0) + cashSales
  };
}

// --- SHIFTS ---
app.get('/api/shifts/current', requireAuth, async (req, res) => {
  try {
    const store = await resolveTargetStore(req);
    if (GAS_URL) {
      return res.json(await gasGet({ action: 'currentShift', spreadsheetId: store.spreadsheetId }));
    }
    const db = readDb();
    const openShift = db.shifts.find((s) => s.status === 'open' && (s.storeId || 'default') === store.storeId);
    res.json({ shift: openShift ? computeLocalShiftStats(db, openShift) : null });
  } catch (err) {
    handleError(res, err);
  }
});

app.get('/api/shifts', requireAuth, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    const today = getVnTodayStr();
    const from = isAdmin ? String(req.query.from || today) : today;
    const to = isAdmin ? String(req.query.to || today) : today;
    const requestedStoreId = String(req.query.storeId || '').trim();

    if (GAS_URL) {
      if (req.user.role === 'superadmin' && requestedStoreId === 'all') {
        const stores = (await fetchAllStores()).filter((s) => s.active !== false);
        const results = await Promise.all(
          stores.map(async (st) => {
            const data = await gasGet({ action: 'shifts', from, to, spreadsheetId: st.spreadsheetId });
            return (data.shifts || []).map((sh) => ({ ...sh, storeId: st.id, storeName: st.name }));
          })
        );
        const shifts = results.flat().sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt));
        return res.json({ shifts });
      }
      const store = await resolveTargetStore(req);
      return res.json(await gasGet({ action: 'shifts', from, to, spreadsheetId: store.spreadsheetId }));
    }

    const db = readDb();
    const isAll = req.user.role === 'superadmin' && requestedStoreId === 'all';
    const store = isAll ? null : await resolveTargetStore(req);
    const shifts = db.shifts
      .filter((s) => s.dateKey >= from && s.dateKey <= to && (isAll || (s.storeId || 'default') === store.storeId))
      .map((s) => (s.status === 'open' ? computeLocalShiftStats(db, s) : s))
      .sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt));
    res.json({ shifts });
  } catch (err) {
    handleError(res, err);
  }
});

app.post('/api/shifts/open', requirePos, async (req, res) => {
  try {
    const store = await resolveTargetStore(req);
    const openedBy = String(req.body?.openedBy || req.user.username || '').trim();
    if (GAS_URL) {
      return res.status(201).json(await gasPost({
        action: 'openShift',
        spreadsheetId: store.spreadsheetId,
        ...req.body,
        openedBy
      }));
    }
    const db = readDb();
    const existing = db.shifts.find((s) => s.status === 'open' && (s.storeId || 'default') === store.storeId);
    if (existing) {
      return res.status(400).json({ error: `Đang có ca "${existing.shiftName}" chưa đóng. Vui lòng chốt ca trước khi mở ca mới.` });
    }
    const now = new Date();
    const dateKey = getLocalDateKey(now);
    const todayCount = db.shifts.filter((s) => s.dateKey === dateKey && (s.storeId || 'default') === store.storeId).length;
    const shift = {
      id: `SH-${dateKey.replace(/-/g, '')}-${String(todayCount + 1).padStart(2, '0')}`,
      storeId: store.storeId,
      storeName: store.storeName,
      dateKey,
      shiftName: String(req.body?.shiftName || 'Ca sáng').trim(),
      openedBy,
      openedAt: now.toISOString(),
      openingCash: Number(req.body?.openingCash) || 0,
      closedBy: '',
      closedAt: '',
      actualCash: null,
      expectedCash: Number(req.body?.openingCash) || 0,
      cashDiff: 0,
      totalOrders: 0,
      cancelledOrders: 0,
      totalRevenue: 0,
      byPaymentMethod: {},
      byOrderType: {},
      note: '',
      status: 'open'
    };
    db.shifts.push(shift);
    writeDb(db);
    res.status(201).json({ shift });
  } catch (err) {
    handleError(res, err);
  }
});

app.post('/api/shifts/close', requirePos, async (req, res) => {
  try {
    const rawActualCash = req.body?.actualCash;
    if (rawActualCash === '' || rawActualCash === undefined || rawActualCash === null || Number.isNaN(Number(rawActualCash)) || Number(rawActualCash) < 0) {
      return res.status(400).json({ error: 'Vui lòng nhập số tiền mặt thực tế đếm được trong két' });
    }
    const store = await resolveTargetStore(req);
    const closedBy = String(req.body?.closedBy || req.user.username || '').trim();
    if (GAS_URL) {
      return res.json(await gasPost({
        action: 'closeShift',
        spreadsheetId: store.spreadsheetId,
        ...req.body,
        closedBy
      }));
    }
    const db = readDb();
    const idx = db.shifts.findIndex(
      (s) => (req.body?.id ? s.id === req.body.id : true) && s.status === 'open' && (s.storeId || 'default') === store.storeId
    );
    if (idx === -1) {
      return res.status(404).json({ error: 'Không tìm thấy ca đang mở để chốt.' });
    }
    const stats = computeLocalShiftStats(db, db.shifts[idx]);
    const actualCash = req.body?.actualCash === '' || req.body?.actualCash === undefined || req.body?.actualCash === null
      ? stats.expectedCash
      : Number(req.body.actualCash);
    const closedShift = {
      ...stats,
      closedBy,
      closedAt: new Date().toISOString(),
      actualCash,
      cashDiff: actualCash - stats.expectedCash,
      note: String(req.body?.note || '').trim(),
      status: 'closed'
    };
    db.shifts[idx] = closedShift;
    writeDb(db);
    res.json({ shift: closedShift });
  } catch (err) {
    handleError(res, err);
  }
});

app.post('/api/orders', requirePos, async (req, res) => {
  try {
    const store = await resolveTargetStore(req);
    const {
      id: clientId,
      orderCode: clientOrderCode,
      createdAt: clientCreatedAt,
      items,
      orderType,
      paymentMethod,
      discount = 0,
      cashReceived = 0,
      note = ''
    } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Đơn hàng phải có ít nhất 1 món' });
    }
    if (GAS_URL) {
      return res.status(201).json(await gasPost({
        action: 'createOrder',
        spreadsheetId: store.spreadsheetId,
        ...(clientId ? { id: String(clientId) } : {}),
        ...(clientOrderCode ? { orderCode: String(clientOrderCode) } : {}),
        ...(clientCreatedAt ? { createdAt: String(clientCreatedAt) } : {}),
        items,
        orderType,
        paymentMethod,
        discount,
        cashReceived,
        note
      }));
    }

    const db = readDb();
    if (clientId) {
      const existingOrder = db.orders.find((o) => o.id === String(clientId) && (o.storeId || 'default') === store.storeId);
      if (existingOrder) {
        return res.status(200).json(existingOrder);
      }
    }
    const currentShift = db.shifts.find((s) => s.status === 'open' && (s.storeId || 'default') === store.storeId);
    if (!currentShift) {
      return res.status(400).json({ error: 'Chưa mở ca làm việc. Vui lòng bấm "Mở ca" trước khi tạo đơn!' });
    }
    const now = clientCreatedAt ? new Date(clientCreatedAt) : new Date();
    const safeNow = Number.isNaN(now.getTime()) ? new Date() : now;
    const dateKey = getLocalDateKey(safeNow);
    const subtotal = items.reduce((sum, item) => sum + Number(item.unitPrice) * Number(item.quantity), 0);
    const safeDiscount = Math.max(0, Number(discount) || 0);
    const total = Math.max(0, subtotal - safeDiscount);
    const safeCash = Number(cashReceived) || total;

    const storeOrders = db.orders.filter((o) => (o.storeId || 'default') === store.storeId);
    const order = {
      id: clientId ? String(clientId) : crypto.randomUUID(),
      storeId: store.storeId,
      storeName: store.storeName,
      orderCode: clientOrderCode ? String(clientOrderCode) : getNextOrderCode(storeOrders, dateKey),
      createdAt: safeNow.toISOString(),
      dateKey,
      orderType: orderType || 'Tại quán',
      paymentMethod: paymentMethod || 'Tiền mặt',
      items,
      subtotal,
      discount: safeDiscount,
      total,
      cashReceived: paymentMethod === 'Tiền mặt' ? safeCash : total,
      changeAmount: paymentMethod === 'Tiền mặt' ? Math.max(0, safeCash - total) : 0,
      note: String(note || '').trim(),
      status: 'completed',
      shiftId: currentShift.id
    };

    db.orders.push(order);
    writeDb(db);
    res.status(201).json(order);
  } catch (err) {
    handleError(res, err);
  }
});

app.patch('/api/orders/:id/cancel', requirePos, async (req, res) => {
  try {
    const store = await resolveTargetStore(req);
    if (GAS_URL) {
      return res.json(await gasPost({ action: 'cancelOrder', spreadsheetId: store.spreadsheetId, id: req.params.id }));
    }
    const db = readDb();
    const order = db.orders.find((o) => o.id === req.params.id && (o.storeId || 'default') === store.storeId);
    if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    order.status = 'cancelled';
    writeDb(db);
    res.json(order);
  } catch (err) {
    handleError(res, err);
  }
});

function mergeRevenuePayloads(storeResults, from, to, shiftId) {
  let totalRevenue = 0;
  let orderCount = 0;
  let cancelledCount = 0;
  let totalCups = 0;
  const byPaymentMethod = {};
  const byOrderType = {};
  const productMap = new Map();
  const dailyMap = new Map();
  const hourlyMap = new Map();
  const orders = [];
  const shifts = [];
  const byStore = [];

  for (const { store, data } of storeResults) {
    const rev = Number(data.totalRevenue) || 0;
    const cnt = Number(data.orderCount) || 0;
    const canc = Number(data.cancelledCount) || 0;
    const cups = Number(data.totalCups) || 0;
    totalRevenue += rev;
    orderCount += cnt;
    cancelledCount += canc;
    totalCups += cups;
    byStore.push({ storeId: store.id, storeName: store.name, totalRevenue: rev, orderCount: cnt, totalCups: cups });

    for (const [k, v] of Object.entries(data.byPaymentMethod || {})) {
      byPaymentMethod[k] = (byPaymentMethod[k] || 0) + (Number(v) || 0);
    }
    for (const [k, v] of Object.entries(data.byOrderType || {})) {
      byOrderType[k] = (byOrderType[k] || 0) + (Number(v) || 0);
    }
    for (const p of data.topProducts || []) {
      const prev = productMap.get(p.name) || { name: p.name, quantity: 0, revenue: 0 };
      prev.quantity += Number(p.quantity) || 0;
      prev.revenue += Number(p.revenue) || 0;
      productMap.set(p.name, prev);
    }
    for (const d of data.dailySeries || []) {
      const prev = dailyMap.get(d.date) || { date: d.date, revenue: 0, orders: 0, cups: 0 };
      prev.revenue += Number(d.revenue) || 0;
      prev.orders += Number(d.orders) || 0;
      prev.cups += Number(d.cups) || 0;
      dailyMap.set(d.date, prev);
    }
    for (const h of data.hourlySeries || []) {
      const prev = hourlyMap.get(h.hour) || { hour: h.hour, revenue: 0, orders: 0 };
      prev.revenue += Number(h.revenue) || 0;
      prev.orders += Number(h.orders) || 0;
      hourlyMap.set(h.hour, prev);
    }
    for (const o of data.orders || []) {
      orders.push({ ...o, storeId: store.id, storeName: store.name });
    }
    for (const s of data.shifts || []) {
      shifts.push({ ...s, storeId: store.id, storeName: store.name });
    }
  }

  return {
    from,
    to,
    shiftId,
    totalRevenue,
    orderCount,
    cancelledCount,
    totalCups,
    avgOrderValue: orderCount ? Math.round(totalRevenue / orderCount) : 0,
    byPaymentMethod,
    byOrderType,
    byStore: byStore.sort((a, b) => b.totalRevenue - a.totalRevenue),
    topProducts: Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue),
    dailySeries: Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
    hourlySeries: Array.from(hourlyMap.values()).sort((a, b) => a.hour - b.hour),
    orders: orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    shifts: shifts.sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt))
  };
}

// --- REVENUE SUMMARY ---
app.get('/api/revenue', requireAuth, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    const today = getVnTodayStr();
    // Nhân viên POS (staff) chỉ được xem doanh thu ngày hôm nay của quán mình
    const from = isAdmin ? String(req.query.from || today) : today;
    const to = isAdmin ? String(req.query.to || today) : today;
    const shiftId = String(req.query.shiftId || '');
    const requestedStoreId = String(req.query.storeId || '').trim();
    const isAllStores = req.user.role === 'superadmin' && (requestedStoreId === 'all' || !requestedStoreId);

    if (GAS_URL) {
      if (isAllStores) {
        const stores = (await fetchAllStores()).filter((s) => s.active !== false);
        const storeResults = await Promise.all(
          stores.map(async (store) => ({
            store,
            data: await gasGet({ action: 'revenue', from, to, shiftId, spreadsheetId: store.spreadsheetId })
          }))
        );
        return res.json(mergeRevenuePayloads(storeResults, from, to, shiftId));
      }
      const store = await resolveTargetStore(req);
      const data = await gasGet({ action: 'revenue', from, to, shiftId, spreadsheetId: store.spreadsheetId });
      return res.json({ ...data, storeId: store.storeId, storeName: store.storeName });
    }

    const db = readDb();
    const store = isAllStores ? null : await resolveTargetStore(req);
    let rangeOrders = db.orders.filter(
      (o) => o.dateKey >= from && o.dateKey <= to && (isAllStores || (o.storeId || 'default') === store.storeId)
    );
    if (shiftId) {
      rangeOrders = rangeOrders.filter((o) => o.shiftId === shiftId);
    }
    const completedOrders = rangeOrders.filter((o) => o.status !== 'cancelled');
    const cancelledCount = rangeOrders.length - completedOrders.length;

    let totalRevenue = 0;
    let totalCups = 0;
    const byPaymentMethod = {};
    const byOrderType = {};
    const productMap = new Map();
    const dailyMap = new Map();
    const hourlyMap = new Map();

    for (const order of completedOrders) {
      totalRevenue += order.total;
      byPaymentMethod[order.paymentMethod] = (byPaymentMethod[order.paymentMethod] || 0) + order.total;
      byOrderType[order.orderType] = (byOrderType[order.orderType] || 0) + order.total;
      const dayEntry = dailyMap.get(order.dateKey) || { date: order.dateKey, revenue: 0, orders: 0, cups: 0 };
      dayEntry.revenue += order.total;
      dayEntry.orders += 1;
      dailyMap.set(order.dateKey, dayEntry);

      if (order.createdAt) {
        const dt = new Date(order.createdAt);
        if (!Number.isNaN(dt.getTime())) {
          const h = dt.getHours();
          const hourEntry = hourlyMap.get(h) || { hour: h, revenue: 0, orders: 0 };
          hourEntry.revenue += order.total;
          hourEntry.orders += 1;
          hourlyMap.set(h, hourEntry);
        }
      }

      for (const item of order.items) {
        const qty = Number(item.quantity) || 1;
        totalCups += qty;
        dayEntry.cups += qty;
        const key = item.productName;
        const prev = productMap.get(key) || { name: key, quantity: 0, revenue: 0 };
        prev.quantity += qty;
        prev.revenue += Number(item.unitPrice) * qty;
        productMap.set(key, prev);
      }
    }

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue);

    const dailySeries = Array.from(dailyMap.values())
      .sort((a, b) => a.date.localeCompare(b.date));

    const hourlySeries = Array.from(hourlyMap.values())
      .sort((a, b) => a.hour - b.hour);

    const recentOrders = [...rangeOrders]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const shifts = db.shifts
      .filter((s) => s.dateKey >= from && s.dateKey <= to && (isAllStores || (s.storeId || 'default') === store.storeId))
      .map((s) => (s.status === 'open' ? computeLocalShiftStats(db, s) : s))
      .sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt));

    const byStore = isAllStores
      ? Object.values(
          completedOrders.reduce((acc, o) => {
            const sid = o.storeId || 'default';
            if (!acc[sid]) {
              acc[sid] = { storeId: sid, storeName: o.storeName || 'Nguyễn Chánh', totalRevenue: 0, orderCount: 0, totalCups: 0 };
            }
            acc[sid].totalRevenue += o.total;
            acc[sid].orderCount += 1;
            acc[sid].totalCups += (o.items || []).reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);
            return acc;
          }, {})
        ).sort((a, b) => b.totalRevenue - a.totalRevenue)
      : undefined;

    res.json({
      from,
      to,
      shiftId,
      totalRevenue,
      orderCount: completedOrders.length,
      cancelledCount,
      totalCups,
      avgOrderValue: completedOrders.length ? Math.round(totalRevenue / completedOrders.length) : 0,
      byPaymentMethod,
      byOrderType,
      ...(byStore ? { byStore } : {}),
      topProducts,
      dailySeries,
      hourlySeries,
      orders: recentOrders,
      shifts
    });
  } catch (err) {
    handleError(res, err);
  }
});

app.get('/download/raumamix-printer.apk', (_req, res) => {
  if (!fs.existsSync(APK_PATH)) {
    return res.status(404).send('APK not found');
  }
  res.download(APK_PATH, 'raumamix-printer.apk');
});

if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Raumamix POS backend running at http://localhost:${PORT} (${GAS_URL ? 'Google Sheet' : 'Local DB'})`);
  });
}

export default app;
