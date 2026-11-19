import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

const DEFAULT_CATEGORIES = [
  { id: 'cat-1', name: 'Rau má đậu xanh sữa dừa' },
  { id: 'cat-2', name: 'Rau má khoai môn sữa dừa' },
  { id: 'cat-3', name: 'Rau má sầu riêng' },
  { id: 'cat-4', name: 'Combo' },
  { id: 'cat-5', name: 'Nước ép' },
  { id: 'cat-6', name: 'Đồ uống khác' },
  { id: 'cat-7', name: 'Đồ ăn vặt' }
];

const DEFAULT_SIZES = [
  { id: 'sz-m', name: 'Size M', shortName: 'M', extraPrice: 0 },
  { id: 'sz-l', name: 'Size L', shortName: 'L', extraPrice: 5000 }
];

const DEFAULT_STORES = [
  { id: 'default', name: 'Nguyễn Chánh', spreadsheetId: '', active: true, createdAt: new Date().toISOString() }
];

const DEFAULT_ADMINS = [
  { username: 'admin', password: '0912Thien', role: 'superadmin', storeId: '*', active: true },
  { username: 'member', password: '1234JQK@#$', role: 'staff', storeId: 'default', active: true }
];

const DEFAULT_DATA = {
  categories: DEFAULT_CATEGORIES,
  sizes: DEFAULT_SIZES,
  products: [
    // Rau má đậu xanh sữa dừa
    { id: 'ITEM-WLT3', name: 'Rau má đậu xanh sữa dừa', category: 'Rau má đậu xanh sữa dừa', price: 25000, active: true },
    { id: 'ITEM-EAF5', name: 'Rau má đậu xanh sữa dừa thạch lá dứa', category: 'Rau má đậu xanh sữa dừa', price: 33000, active: true },
    { id: 'ITEM-AT86', name: 'Rau má đậu xanh sữa dừa nha đam', category: 'Rau má đậu xanh sữa dừa', price: 33000, active: true },
    { id: 'ITEM-GRLV', name: 'Rau má sữa gạo hạt chia', category: 'Rau má đậu xanh sữa dừa', price: 30000, active: true },

    // Rau má khoai môn sữa dừa
    { id: 'ITEM-WP4C', name: 'Rau má khoai môn sữa dừa', category: 'Rau má khoai môn sữa dừa', price: 28000, active: true },
    { id: 'ITEM-RC4Q', name: 'Rau má khoai môn sữa dừa nha đam', category: 'Rau má khoai môn sữa dừa', price: 35000, active: true },
    { id: 'ITEM-YO0N', name: 'Rau má khoai môn sữa dừa thạch lá dứa', category: 'Rau má khoai môn sữa dừa', price: 35000, active: true },

    // Rau má sầu riêng
    { id: 'ITEM-WGKM', name: 'Rau má đậu xanh sầu riêng', category: 'Rau má sầu riêng', price: 33000, active: true },
    { id: 'ITEM-MQEA', name: 'Rau má sầu riêng sữa dừa tươi', category: 'Rau má sầu riêng', price: 33000, active: true },
    { id: 'ITEM-0T32', name: 'Rau má khoai môn sầu riêng sữa dừa tươi', category: 'Rau má sầu riêng', price: 35000, active: true },
    { id: 'ITEM-9HLB', name: 'Rau má bí đỏ sầu riêng', category: 'Rau má sầu riêng', price: 28000, active: true },

    // Combo
    { id: 'ITEM-2HMH', name: 'Combo 1 rau má đậu xanh sữa dừa nha đam đậu đỏ trân châu', category: 'Combo', price: 38000, active: true },
    { id: 'ITEM-PBRD', name: 'Combo 2 rau má khoai môn sữa dừa nha đam trân châu thạch lá dứa', category: 'Combo', price: 38000, active: true },
    { id: 'ITEM-7ZO8', name: 'Combo 3 rau má bí đỏ sữa dừa', category: 'Combo', price: 35000, active: true },

    // Nước ép
    { id: 'ITEM-J2XT', name: 'Nước ép cam và cà rốt', category: 'Nước ép', price: 35000, active: true },
    { id: 'ITEM-PD0H', name: 'Nước ép ổi', category: 'Nước ép', price: 30000, active: true },
    { id: 'ITEM-FBWL', name: 'Nước ép roi', category: 'Nước ép', price: 35000, active: true },
    { id: 'ITEM-IG7B', name: 'Cam ép nha đam tươi', category: 'Nước ép', price: 35000, active: true },
    { id: 'ITEM-TE7P', name: 'Ép chanh dây', category: 'Nước ép', price: 35000, active: true },

    // Đồ uống khác
    { id: 'ITEM-O6L2', name: 'Yakun xoài', category: 'Đồ uống khác', price: 30000, active: true },
    { id: 'ITEM-762E', name: 'Yakun chanh leo', category: 'Đồ uống khác', price: 30000, active: true },
    { id: 'ITEM-IID4', name: 'Dừa xiêm hạt chia', category: 'Đồ uống khác', price: 47000, active: true },
    { id: 'ITEM-J6L4', name: 'Dừa xiêm nguyên trái', category: 'Đồ uống khác', price: 30000, active: true },
    { id: 'ITEM-LY1K', name: 'Sữa tươi đường đen bánh plan (L)', category: 'Đồ uống khác', price: 40000, active: true },

    // Đồ ăn vặt
    { id: 'ITEM-EY13', name: 'Heo cháy tỏi', category: 'Đồ ăn vặt', price: 30000, active: true }
  ],
  toppings: [
    { id: 'ITEM-YYIE', name: 'TP - Thạch Dừa', price: 8000, active: true },
    { id: 'ITEM-UT0A', name: 'TP - Thạch Lá Dừa', price: 8000, active: true },
    { id: 'ITEM-LPJ9', name: 'TP - Trân Châu Trắng', price: 8000, active: true },
    { id: 'ITEM-HEE4', name: 'TP - Thạch Củ Năng', price: 6000, active: true },
    { id: 'ITEM-EXMV', name: 'TP - Nha Đam Tươi', price: 8000, active: true },
    { id: 'ITEM-0NYC', name: 'TP - Đậu đỏ', price: 8000, active: true }
  ],
  orders: []
};

function ensureDbFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DATA, null, 2), 'utf-8');
  }
}

function normalizeDb(db) {
  if (!Array.isArray(db.categories) || !db.categories.length) {
    db.categories = [...DEFAULT_CATEGORIES];
  }
  if (!Array.isArray(db.sizes) || !db.sizes.length) {
    db.sizes = [...DEFAULT_SIZES];
  }
  if (!Array.isArray(db.shifts)) {
    db.shifts = [];
  }
  if (!Array.isArray(db.stores) || !db.stores.length) {
    db.stores = DEFAULT_STORES.map((s) => ({ ...s }));
  }
  if (!Array.isArray(db.admins) || !db.admins.length) {
    db.admins = DEFAULT_ADMINS.map((a) => ({ ...a }));
  } else {
    db.admins = db.admins.map((a) => {
      const rawRole = a.role || 'admin';
      const rawStoreId = a.storeId || '';
      const role = rawRole === 'admin' && (!rawStoreId || rawStoreId === '*') ? 'superadmin' : rawRole;
      return {
        ...a,
        role,
        storeId: role === 'superadmin' ? '*' : (rawStoreId || 'default')
      };
    });
  }
  db.products = (db.products || []).map((p) => ({
    ...p,
    price: p.price != null ? Number(p.price) : Number(p.priceM || 0)
  }));
  return db;
}

export function readDb() {
  ensureDbFile();
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  return normalizeDb(JSON.parse(raw));
}

export function writeDb(data) {
  ensureDbFile();
  const tmpPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpPath, DB_PATH);
}

export function getLocalDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getNextOrderCode(orders, dateKey) {
  const todayCount = orders.filter((o) => o.dateKey === dateKey).length;
  return `#${String(todayCount + 1).padStart(3, '0')}`;
}
