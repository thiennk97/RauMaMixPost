const BASE = '/api';

function isAdminPortal() {
  if (typeof window === 'undefined') return false;
  const p = window.location.pathname || '/';
  const h = window.location.hash || '';
  return p === '/admin' || p.startsWith('/admin/') || h === '#/admin' || h.startsWith('#/admin/');
}

function getTokenKey() {
  return isAdminPortal() ? 'raumamix_admin_token' : 'raumamix_pos_token';
}

function getUserKey() {
  return isAdminPortal() ? 'raumamix_admin_user' : 'raumamix_pos_user';
}

export function getGasUrl() {
  return '';
}

export function setGasUrl() {
  // Đã chuyển sang gọi qua Backend (/api) để bảo mật URL & API_SECRET của Google Sheet
}

export function getAdminToken() {
  try {
    return localStorage.getItem(getTokenKey()) || '';
  } catch {
    return '';
  }
}

export function setAdminToken(token) {
  try {
    if (token) {
      localStorage.setItem(getTokenKey(), String(token));
    } else {
      localStorage.removeItem(getTokenKey());
    }
  } catch {
    // ignore storage errors
  }
}

export function getSavedUser() {
  try {
    if (!getAdminToken()) return null;
    const raw = localStorage.getItem(getUserKey());
    if (!raw) return null;
    const user = JSON.parse(raw);
    if (isAdminPortal() && user?.role === 'staff') return null;
    if (!isAdminPortal() && user?.role !== 'staff') return null;
    return user;
  } catch {
    return null;
  }
}

export function setSavedUser(user) {
  try {
    if (user) {
      localStorage.setItem(getUserKey(), JSON.stringify(user));
    } else {
      localStorage.removeItem(getUserKey());
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
  login: (username, password, portal = '') =>
    requestApi('/login', { method: 'POST', body: JSON.stringify({ username, password, ...(portal ? { portal } : {}) }) }),
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
  deleteStore: (id) => requestApi(`/stores/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  getUsers: () => requestApi('/users'),
  createUser: (payload) => requestApi('/users', { method: 'POST', body: JSON.stringify(payload) }),
  updateUser: (username, payload) =>
    requestApi(`/users/${encodeURIComponent(username)}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  getEmployees: ({ storeId = '', includeInactive = false } = {}) => {
    const params = new URLSearchParams();
    if (storeId) params.set('storeId', storeId);
    if (includeInactive) params.set('includeInactive', '1');
    const q = params.toString();
    return requestApi(`/employees${q ? `?${q}` : ''}`);
  },
  createEmployee: (payload) =>
    requestApi('/employees', { method: 'POST', body: JSON.stringify(payload) }),
  updateEmployee: (id, payload) =>
    requestApi(`/employees/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteEmployee: (id, storeId = '') => {
    const q = storeId ? `?storeId=${encodeURIComponent(storeId)}` : '';
    return requestApi(`/employees/${encodeURIComponent(id)}${q}`, { method: 'DELETE' });
  },
  getTimeLogs: ({ month = '', storeId = '', employeeId = '' } = {}) => {
    const params = new URLSearchParams();
    if (month) params.set('month', month);
    if (storeId) params.set('storeId', storeId);
    if (employeeId) params.set('employeeId', employeeId);
    return requestApi(`/timelogs?${params.toString()}`);
  },
  createTimeLog: (payload) =>
    requestApi('/timelogs', { method: 'POST', body: JSON.stringify(payload) }),
  updateTimeLog: (id, payload) =>
    requestApi(`/timelogs/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteTimeLog: (id, storeId = '') => {
    const q = storeId ? `?storeId=${encodeURIComponent(storeId)}` : '';
    return requestApi(`/timelogs/${encodeURIComponent(id)}${q}`, { method: 'DELETE' });
  }
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
