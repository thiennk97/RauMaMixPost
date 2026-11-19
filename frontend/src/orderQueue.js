import { ref } from 'vue';
import { api, getTodayStr } from './api.js';

const QUEUE_KEY = 'raumamix_pending_orders';
const SEQ_PREFIX = 'raumamix_order_seq_';
const MAX_AUTO_RETRIES = 5;

export const pendingCount = ref(0);
export const failedCount = ref(0);

let isProcessing = false;
let retryTimer = null;
let syncedCallback = null;

function loadQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveQueue(queue) {
  try {
    if (queue.length) {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } else {
      localStorage.removeItem(QUEUE_KEY);
    }
  } catch {
    // ignore storage quota errors
  }
  pendingCount.value = queue.filter((q) => !q.failed).length;
  failedCount.value = queue.filter((q) => q.failed).length;
}

export function generateClientOrderId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `ord-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nextClientOrderCode(currentShift) {
  const today = getTodayStr();
  const key = `${SEQ_PREFIX}${today}`;
  let localSeq = 0;
  try {
    localSeq = Number(localStorage.getItem(key)) || 0;
  } catch {
    localSeq = 0;
  }
  const shiftCount =
    currentShift && currentShift.dateKey === today
      ? (Number(currentShift.totalOrders) || 0) + (Number(currentShift.cancelledOrders) || 0)
      : 0;
  const next = Math.max(localSeq, shiftCount) + 1;
  try {
    localStorage.setItem(key, String(next));
  } catch {
    // ignore
  }
  return `#${String(next).padStart(3, '0')}`;
}

async function processQueue() {
  if (isProcessing) return;
  const queue = loadQueue();
  saveQueue(queue);
  const nextIdx = queue.findIndex((item) => !item.failed);
  if (nextIdx === -1) return;

  isProcessing = true;
  clearTimeout(retryTimer);

  try {
    const item = queue[nextIdx];
    await api.createOrder(item.payload);

    // Xóa đơn đã lưu thành công khỏi hàng đợi
    const latest = loadQueue().filter((q) => q.payload.id !== item.payload.id);
    saveQueue(latest);

    if (typeof syncedCallback === 'function') {
      syncedCallback();
    }
  } catch (err) {
    console.warn('Lưu đơn ngầm lỗi:', err.message);
    const latest = loadQueue();
    const target = latest.find((q) => q.payload.id === queue[nextIdx].payload.id);
    if (target) {
      target.attempts = (target.attempts || 0) + 1;
      target.lastError = err.message || 'Lỗi kết nối';
      // Lỗi nghiệp vụ 400 (VD chưa mở ca) hoặc vượt quá số lần retry → đánh dấu failed để bấm thử lại
      if (err.status === 400 || target.attempts >= MAX_AUTO_RETRIES) {
        target.failed = true;
      }
      saveQueue(latest);
    }

    isProcessing = false;
    const stillPending = loadQueue().some((q) => !q.failed);
    if (stillPending) {
      const delay = Math.min(15000, 2500 * ((target?.attempts || 1)));
      retryTimer = setTimeout(processQueue, delay);
    }
    return;
  }

  isProcessing = false;
  // Tiếp tục đơn kế tiếp nếu còn trong hàng đợi
  if (loadQueue().some((q) => !q.failed)) {
    processQueue();
  }
}

export function enqueueOrder(payload, onSynced) {
  if (typeof onSynced === 'function') syncedCallback = onSynced;
  const queue = loadQueue();
  queue.push({
    payload,
    attempts: 0,
    failed: false,
    lastError: '',
    queuedAt: Date.now()
  });
  saveQueue(queue);
  processQueue();
}

export function retryFailedOrders() {
  const queue = loadQueue().map((q) => ({ ...q, failed: false, attempts: 0 }));
  saveQueue(queue);
  processQueue();
}

export function resumeOrderQueue(onSynced) {
  if (typeof onSynced === 'function') syncedCallback = onSynced;
  const queue = loadQueue();
  saveQueue(queue);
  if (queue.some((q) => !q.failed)) {
    processQueue();
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    const queue = loadQueue();
    if (queue.length) {
      retryFailedOrders();
    }
  });
}
