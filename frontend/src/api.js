const BASE = '/api';
const TOKEN_KEY = 'raumamix_token';
const USER_KEY = 'raumamix_user';

export function getGasUrl() {
  return '';
}

export function setGasUrl() {
  // Đã chuyển sang gọi qua Backend (/api) để bảo mật URL & API_SECRET của Google Sheet
}

export function getAdminToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem('raumamix_admin_token') || '';
  } catch {
    return '';
  }
}

export function setAdminToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, String(token));
    } else {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem('raumamix_admin_token');
    }
  } catch {
    // ignore storage errors
  }
}

export function getSavedUser() {
  try {
    if (!getAdminToken()) return null;
    const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem('raumamix_admin_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSavedUser(user) {
  try {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
      sessionStorage.removeItem('raumamix_admin_user');
    }
  } catch {
    // ignore storage errors
  }
}

async function requestApi(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getAdminToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Lỗi máy chủ (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  login: (username, password) =>
    requestApi('/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  me: () => requestApi('/me'),
  getMenu: (storeId = '') => {
    const q = storeId ? `?storeId=${encodeURIComponent(storeId)}` : '';
    return requestApi(`/menu${q}`);
  },
  createCategory: (name, storeId = '') =>
    requestApi('/categories', { method: 'POST', body: JSON.stringify({ name, ...(storeId ? { storeId } : {}) }) }),
  deleteCategory: (id, storeId = '') => {
    const q = storeId ? `?storeId=${encodeURIComponent(storeId)}` : '';
    return requestApi(`/categories/${id}${q}`, { method: 'DELETE' });
  },
  createProduct: (payload) =>
    requestApi('/products', { method: 'POST', body: JSON.stringify(payload) }),
  updateProduct: (id, payload) =>
    requestApi(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteProduct: (id, storeId = '') => {
    const q = storeId ? `?storeId=${encodeURIComponent(storeId)}` : '';
    return requestApi(`/products/${id}${q}`, { method: 'DELETE' });
  },
  createOrder: (payload) =>
    requestApi('/orders', { method: 'POST', body: JSON.stringify(payload) }),
  cancelOrder: (id, storeId = '') => {
    const q = storeId ? `?storeId=${encodeURIComponent(storeId)}` : '';
    return requestApi(`/orders/${id}/cancel${q}`, { method: 'PATCH' });
  },
  getCurrentShift: (storeId = '') => {
    const q = storeId ? `?storeId=${encodeURIComponent(storeId)}` : '';
    return requestApi(`/shifts/current${q}`);
  },
  getShifts: (from, to, { storeId = '' } = {}) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (storeId) params.set('storeId', storeId);
    return requestApi(`/shifts?${params.toString()}`);
  },
  openShift: (payload) =>
    requestApi('/shifts/open', { method: 'POST', body: JSON.stringify(payload) }),
  closeShift: (payload) =>
    requestApi('/shifts/close', { method: 'POST', body: JSON.stringify(payload) }),
  getRevenue: (from, to, shiftId = '', { storeId = '' } = {}) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (shiftId) params.set('shiftId', shiftId);
    if (storeId) params.set('storeId', storeId);
    return requestApi(`/revenue?${params.toString()}`);
  },
  adminLogin: (username, password) =>
    requestApi('/admin/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  adminChangePassword: (username, currentPassword, newPassword) =>
    requestApi(
      '/admin/change-password',
      { method: 'POST', body: JSON.stringify({ username, currentPassword, newPassword }) }
    ),
  getStores: () => requestApi('/stores'),
  createStore: (payload) => requestApi('/stores', { method: 'POST', body: JSON.stringify(payload) }),
  updateStore: (id, payload) => requestApi(`/stores/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  getUsers: () => requestApi('/users'),
  createUser: (payload) => requestApi('/users', { method: 'POST', body: JSON.stringify(payload) }),
  updateUser: (username, payload) =>
    requestApi(`/users/${encodeURIComponent(username)}`, { method: 'PATCH', body: JSON.stringify(payload) })
};

export function formatVnd(amount) {
  return new Intl.NumberFormat('vi-VN').format(Number(amount) || 0) + 'đ';
}

export function groupOrdersByShift(orders = [], shifts = []) {
  const shiftMap = new Map();
  for (const s of shifts || []) {
    if (s.storeId) shiftMap.set(`${s.storeId}::${s.id}`, s);
    if (!shiftMap.has(s.id)) shiftMap.set(s.id, s);
  }

  const groups = new Map();
  for (const o of orders || []) {
    const sid = o.shiftId || '__no_shift__';
    const key = o.storeId ? `${o.storeId}::${sid}` : sid;
    if (!groups.has(key)) {
      const shift = (o.storeId && shiftMap.get(`${o.storeId}::${sid}`)) || shiftMap.get(sid) || null;
      const storeName = o.storeName || shift?.storeName || '';
      groups.set(key, {
        key,
        shiftId: sid,
        shift,
        storeName,
        orders: [],
        completedCount: 0,
        cancelledCount: 0,
        totalRevenue: 0
      });
    }
    const g = groups.get(key);
    g.orders.push(o);
    if (o.status === 'cancelled') {
      g.cancelledCount += 1;
    } else {
      g.completedCount += 1;
      g.totalRevenue += Number(o.total) || 0;
    }
  }

  return Array.from(groups.values());
}

export function getTodayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function shiftDateStr(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
