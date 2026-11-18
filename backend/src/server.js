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

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// --- MENU (Categories, Products, Sizes, Toppings) ---
app.get('/api/menu', (_req, res) => {
  const db = readDb();
  res.json({
    categories: db.categories,
    sizes: db.sizes,
    products: db.products,
    toppings: db.toppings
  });
});

app.post('/api/categories', (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Thiếu tên nhóm món' });
  const db = readDb();
  if (db.categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
    return res.status(400).json({ error: 'Nhóm món đã tồn tại' });
  }
  const category = { id: `cat-${crypto.randomBytes(3).toString('hex')}`, name };
  db.categories.push(category);
  writeDb(db);
  res.status(201).json(category);
});

app.delete('/api/categories/:id', (req, res) => {
  const db = readDb();
  const target = db.categories.find((c) => c.id === req.params.id);
  if (!target) return res.status(404).json({ error: 'Không tìm thấy nhóm món' });
  db.categories = db.categories.filter((c) => c.id !== req.params.id);
  writeDb(db);
  res.json({ ok: true });
});

app.post('/api/products', (req, res) => {
  const { name, category, price, priceM, channelPrices } = req.body;
  const basePrice = price ?? priceM;
  if (!name || basePrice == null) {
    return res.status(400).json({ error: 'Thiếu tên món hoặc giá bán' });
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
});

app.patch('/api/products/:id', (req, res) => {
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
});

app.delete('/api/products/:id', (req, res) => {
  const db = readDb();
  const before = db.products.length;
  db.products = db.products.filter((p) => p.id !== req.params.id);
  if (db.products.length === before) {
    return res.status(404).json({ error: 'Không tìm thấy món' });
  }
  writeDb(db);
  res.json({ ok: true });
});

// --- ORDERS ---
app.get('/api/orders', (req, res) => {
  const db = readDb();
  const { from, to } = req.query;
  let orders = [...db.orders];

  if (from) orders = orders.filter((o) => o.dateKey >= String(from));
  if (to) orders = orders.filter((o) => o.dateKey <= String(to));

  orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(orders);
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
app.get('/api/shifts/current', (_req, res) => {
  const db = readDb();
  const openShift = db.shifts.find((s) => s.status === 'open');
  res.json({ shift: openShift ? computeLocalShiftStats(db, openShift) : null });
});

app.get('/api/shifts', (req, res) => {
  const db = readDb();
  const today = getLocalDateKey();
  const from = String(req.query.from || today);
  const to = String(req.query.to || today);
  const shifts = db.shifts
    .filter((s) => s.dateKey >= from && s.dateKey <= to)
    .map((s) => (s.status === 'open' ? computeLocalShiftStats(db, s) : s))
    .sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt));
  res.json({ shifts });
});

app.post('/api/shifts/open', (req, res) => {
  const db = readDb();
  const existing = db.shifts.find((s) => s.status === 'open');
  if (existing) {
    return res.status(400).json({ error: `Đang có ca "${existing.shiftName}" chưa đóng. Vui lòng chốt ca trước khi mở ca mới.` });
  }
  const now = new Date();
  const dateKey = getLocalDateKey(now);
  const todayCount = db.shifts.filter((s) => s.dateKey === dateKey).length;
  const shift = {
    id: `SH-${dateKey.replace(/-/g, '')}-${String(todayCount + 1).padStart(2, '0')}`,
    dateKey,
    shiftName: String(req.body?.shiftName || 'Ca sáng').trim(),
    openedBy: String(req.body?.openedBy || '').trim(),
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
});

app.post('/api/shifts/close', (req, res) => {
  const db = readDb();
  const idx = db.shifts.findIndex((s) => (req.body?.id ? s.id === req.body.id : true) && s.status === 'open');
  if (idx === -1) {
    return res.status(404).json({ error: 'Không tìm thấy ca đang mở để chốt.' });
  }
  const stats = computeLocalShiftStats(db, db.shifts[idx]);
  const actualCash = req.body?.actualCash === '' || req.body?.actualCash === undefined || req.body?.actualCash === null
    ? stats.expectedCash
    : Number(req.body.actualCash);
  const closedShift = {
    ...stats,
    closedBy: String(req.body?.closedBy || '').trim(),
    closedAt: new Date().toISOString(),
    actualCash,
    cashDiff: actualCash - stats.expectedCash,
    note: String(req.body?.note || '').trim(),
    status: 'closed'
  };
  db.shifts[idx] = closedShift;
  writeDb(db);
  res.json({ shift: closedShift });
});

app.post('/api/orders', (req, res) => {
  const { items, orderType, paymentMethod, discount = 0, cashReceived = 0, note = '' } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Đơn hàng phải có ít nhất 1 món' });
  }

  const db = readDb();
  const currentShift = db.shifts.find((s) => s.status === 'open');
  if (!currentShift) {
    return res.status(400).json({ error: 'Chưa mở ca làm việc. Vui lòng bấm "Mở ca" trước khi tạo đơn!' });
  }
  const now = new Date();
  const dateKey = getLocalDateKey(now);
  const subtotal = items.reduce((sum, item) => sum + Number(item.unitPrice) * Number(item.quantity), 0);
  const safeDiscount = Math.max(0, Number(discount) || 0);
  const total = Math.max(0, subtotal - safeDiscount);
  const safeCash = Number(cashReceived) || total;

  const order = {
    id: crypto.randomUUID(),
    orderCode: getNextOrderCode(db.orders, dateKey),
    createdAt: now.toISOString(),
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
});

app.patch('/api/orders/:id/cancel', (req, res) => {
  const db = readDb();
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
  order.status = 'cancelled';
  writeDb(db);
  res.json(order);
});

// --- REVENUE SUMMARY ---
app.get('/api/revenue', (req, res) => {
  const db = readDb();
  const today = getLocalDateKey();
  const from = String(req.query.from || today);
  const to = String(req.query.to || today);
  const shiftId = String(req.query.shiftId || '');

  let rangeOrders = db.orders.filter((o) => o.dateKey >= from && o.dateKey <= to);
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

  for (const order of completedOrders) {
    totalRevenue += order.total;
    byPaymentMethod[order.paymentMethod] = (byPaymentMethod[order.paymentMethod] || 0) + order.total;
    byOrderType[order.orderType] = (byOrderType[order.orderType] || 0) + order.total;
    dailyMap.set(order.dateKey, (dailyMap.get(order.dateKey) || 0) + order.total);

    for (const item of order.items) {
      const qty = Number(item.quantity) || 1;
      totalCups += qty;
      const key = item.productName;
      const prev = productMap.get(key) || { name: key, quantity: 0, revenue: 0 };
      prev.quantity += qty;
      prev.revenue += Number(item.unitPrice) * qty;
      productMap.set(key, prev);
    }
  }

  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue);

  const dailySeries = Array.from(dailyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, revenue]) => ({ date, revenue }));

  const recentOrders = [...rangeOrders]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const shifts = db.shifts
    .filter((s) => s.dateKey >= from && s.dateKey <= to)
    .map((s) => (s.status === 'open' ? computeLocalShiftStats(db, s) : s))
    .sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt));

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
    topProducts,
    dailySeries,
    orders: recentOrders,
    shifts
  });
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
    console.log(`Raumamix POS backend running at http://localhost:${PORT}`);
  });
}

export default app;
