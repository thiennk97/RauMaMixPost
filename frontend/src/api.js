const BASE = '/api';
const DEFAULT_GAS_URL =
  'https://script.google.com/macros/s/AKfycbzo5nHeL2tvEesp0GJQSOmY2CWCSPDL2sWxwizFtwHQvaZyzWL_U_hmYJccKASHGP3P/exec';

export function getGasUrl() {
  const saved = (localStorage.getItem('gasUrl') || import.meta.env.VITE_GAS_URL || '').trim();
  if (saved) return saved;
  if (typeof window !== 'undefined' && /github\.io|vercel\.app|pages\.dev/.test(window.location.hostname)) {
    return DEFAULT_GAS_URL;
  }
  return '';
}

export function setGasUrl(url) {
  const clean = String(url || '').trim();
  if (clean) {
    localStorage.setItem('gasUrl', clean);
  } else {
    localStorage.removeItem('gasUrl');
  }
}

async function requestLocal(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Lỗi máy chủ (${res.status})`);
  }
  return data;
}

async function gasGet(params) {
  const url = new URL(getGasUrl());
  Object.entries(params).forEach(([k, v]) => {
    if (v != null) url.searchParams.set(k, String(v));
  });
  const res = await fetch(url.toString());
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(data.error || `Lỗi Google Sheet (${res.status})`);
  }
  return data;
}

async function gasPost(payload) {
  const res = await fetch(getGasUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(data.error || `Lỗi Google Sheet (${res.status})`);
  }
  return data;
}

export const api = {
  getMenu: () => (getGasUrl() ? gasGet({ action: 'menu' }) : requestLocal('/menu')),
  createCategory: (name) =>
    getGasUrl()
      ? gasPost({ action: 'createCategory', name })
      : requestLocal('/categories', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteCategory: (id) =>
    getGasUrl()
      ? gasPost({ action: 'deleteCategory', id })
      : requestLocal(`/categories/${id}`, { method: 'DELETE' }),
  createProduct: (payload) =>
    getGasUrl()
      ? gasPost({ action: 'createProduct', ...payload })
      : requestLocal('/products', { method: 'POST', body: JSON.stringify(payload) }),
  updateProduct: (id, payload) =>
    getGasUrl()
      ? gasPost({ action: 'updateProduct', id, ...payload })
      : requestLocal(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteProduct: (id) =>
    getGasUrl()
      ? gasPost({ action: 'deleteProduct', id })
      : requestLocal(`/products/${id}`, { method: 'DELETE' }),
  createOrder: (payload) =>
    getGasUrl()
      ? gasPost({ action: 'createOrder', ...payload })
      : requestLocal('/orders', { method: 'POST', body: JSON.stringify(payload) }),
  cancelOrder: (id) =>
    getGasUrl()
      ? gasPost({ action: 'cancelOrder', id })
      : requestLocal(`/orders/${id}/cancel`, { method: 'PATCH' }),
  getRevenue: (from, to) => {
    if (getGasUrl()) {
      return gasGet({ action: 'revenue', from, to });
    }
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return requestLocal(`/revenue?${params.toString()}`);
  }
};

export function formatVnd(amount) {
  return new Intl.NumberFormat('vi-VN').format(Number(amount) || 0) + 'đ';
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
