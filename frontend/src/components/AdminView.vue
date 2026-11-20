<script setup>
import { ref, computed, onMounted } from 'vue';
import {
  ShieldCheck,
  LogOut,
  RefreshCw,
  Loader2,
  TrendingUp,
  Award,
  Clock,
  KeyRound,
  Search,
  X,
  Store,
  Users
} from 'lucide-vue-next';
import { api, formatVnd, getTodayStr, shiftDateStr, getAdminToken, setAdminToken, getSavedUser, setSavedUser, groupOrdersByShift } from '../api.js';
import AdminTimekeepingView from './AdminTimekeepingView.vue';

const adminUser = ref(getSavedUser());
const isSuperAdmin = computed(() => adminUser.value?.role === 'superadmin');
const isStaffOnly = computed(() => adminUser.value?.role === 'staff');
const adminTab = ref('revenue'); // 'revenue' | 'timekeeping' | 'manage'

const stores = ref([]);
const usersList = ref([]);
const selectedStoreId = ref('all');
const manageLoading = ref(false);

const newStoreForm = ref({
  name: '',
  spreadsheetId: '',
  staffUsername: '',
  staffPassword: '',
  adminUsername: '',
  adminPassword: ''
});
const storeAccountTouched = ref(false);
const storeCreateLoading = ref(false);
const storeError = ref('');
const storeSuccess = ref('');

function slugifyStoreName(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 20);
}

function onStoreNameInput() {
  if (storeAccountTouched.value) return;
  const slug = slugifyStoreName(newStoreForm.value.name);
  if (slug) {
    newStoreForm.value.staffUsername = `${slug}_member`;
    newStoreForm.value.adminUsername = `${slug}_admin`;
  } else {
    newStoreForm.value.staffUsername = '';
    newStoreForm.value.adminUsername = '';
  }
}

const newUserForm = ref({ username: '', password: '', role: 'staff', storeId: 'default' });
const userCreateLoading = ref(false);
const userError = ref('');

const usernameInput = ref('admin');
const passwordInput = ref('');
const loginLoading = ref(false);
const loginError = ref('');

// Change password modal
const showPwdModal = ref(false);
const pwdForm = ref({ current: '', next: '', confirm: '' });
const pwdLoading = ref(false);
const pwdError = ref('');
const pwdSuccess = ref('');

// Revenue filters
const fromDate = ref(getTodayStr());
const toDate = ref(getTodayStr());
const preset = ref('today');
const selectedShiftId = ref('');
const loading = ref(false);

// Product & Order filters
const productSearch = ref('');
const productSort = ref('quantity'); // 'quantity' | 'revenue'
const orderSearch = ref('');
const orderStatusFilter = ref('all'); // 'all' | 'completed' | 'cancelled'

const data = ref({
  totalRevenue: 0,
  orderCount: 0,
  cancelledCount: 0,
  totalCups: 0,
  avgOrderValue: 0,
  byPaymentMethod: {},
  byOrderType: {},
  topProducts: [],
  dailySeries: [],
  hourlySeries: [],
  orders: [],
  shifts: []
});

let revenueSeq = 0;

function formatDateInput(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function loadManageData() {
  if (!isSuperAdmin.value) return;
  manageLoading.value = true;
  try {
    const [stRes, usRes] = await Promise.all([api.getStores(), api.getUsers()]);
    stores.value = stRes.stores || [];
    usersList.value = usRes.users || [];
    if (stores.value.length && !stores.value.some((s) => s.id === newUserForm.value.storeId)) {
      newUserForm.value.storeId = stores.value[0].id;
    }
  } catch (err) {
    console.error(err);
  } finally {
    manageLoading.value = false;
  }
}

async function handleCreateStore() {
  storeError.value = '';
  storeSuccess.value = '';
  const { name, spreadsheetId, staffUsername, staffPassword, adminUsername, adminPassword } = newStoreForm.value;
  if (!name.trim()) {
    storeError.value = 'Vui lòng nhập tên quán';
    return;
  }
  if (!staffUsername.trim() || staffPassword.length < 4) {
    storeError.value = 'Vui lòng nhập tài khoản nhân viên và mật khẩu (>= 4 ký tự)';
    return;
  }
  if (!adminUsername.trim() || adminPassword.length < 4) {
    storeError.value = 'Vui lòng nhập tài khoản admin quán và mật khẩu (>= 4 ký tự)';
    return;
  }
  if (staffUsername.trim() === adminUsername.trim()) {
    storeError.value = 'Tài khoản nhân viên và admin quán không được trùng nhau';
    return;
  }
  storeCreateLoading.value = true;
  try {
    await api.createStore({
      name: name.trim(),
      spreadsheetId: spreadsheetId.trim(),
      staffUsername: staffUsername.trim(),
      staffPassword,
      adminUsername: adminUsername.trim(),
      adminPassword
    });
    storeSuccess.value = `Đã tạo quán "${name.trim()}" cùng 2 tài khoản (${staffUsername.trim()} / ${adminUsername.trim()}) với menu mặc định từ Nguyễn Chánh!`;
    newStoreForm.value = { name: '', spreadsheetId: '', staffUsername: '', staffPassword: '', adminUsername: '', adminPassword: '' };
    storeAccountTouched.value = false;
    await loadManageData();
  } catch (err) {
    storeError.value = err.message || 'Không tạo được quán';
  } finally {
    storeCreateLoading.value = false;
  }
}

async function toggleStoreActive(st) {
  try {
    await api.updateStore(st.id, { active: !st.active });
    await loadManageData();
  } catch (err) {
    alert(err.message);
  }
}

const deletingStoreId = ref('');

async function handleDeleteStore(st) {
  if (st.id === 'default' || deletingStoreId.value) return;
  if (!confirm(`Xác nhận xóa quán "${st.name}"?\n\nLưu ý: File Google Sheet của quán và các tài khoản liên quan sẽ bị xóa!`)) {
    return;
  }
  deletingStoreId.value = st.id;
  try {
    await api.deleteStore(st.id);
    if (selectedStoreId.value === st.id) {
      selectedStoreId.value = 'all';
    }
    await loadManageData();
  } catch (err) {
    alert(err.message);
  } finally {
    deletingStoreId.value = '';
  }
}

async function handleCreateUser() {
  userError.value = '';
  const { username, password, role, storeId } = newUserForm.value;
  if (!username.trim() || password.length < 4) {
    userError.value = 'Tài khoản không được trống và mật khẩu tối thiểu 4 ký tự';
    return;
  }
  userCreateLoading.value = true;
  try {
    await api.createUser({
      username: username.trim(),
      password,
      role,
      storeId: role === 'superadmin' ? '*' : storeId
    });
    newUserForm.value = { username: '', password: '', role: 'staff', storeId: stores.value[0]?.id || 'default' };
    await loadManageData();
  } catch (err) {
    userError.value = err.message || 'Không tạo được tài khoản';
  } finally {
    userCreateLoading.value = false;
  }
}

async function toggleUserActive(u) {
  if (u.username === adminUser.value?.username) return;
  try {
    await api.updateUser(u.username, { active: !u.active });
    await loadManageData();
  } catch (err) {
    alert(err.message);
  }
}

async function handleLogin() {
  loginError.value = '';
  if (!usernameInput.value.trim() || !passwordInput.value) {
    loginError.value = 'Vui lòng nhập đầy đủ tài khoản và mật khẩu';
    return;
  }
  loginLoading.value = true;
  try {
    const res = await api.login(usernameInput.value.trim(), passwordInput.value, 'admin');
    if (!res.token) throw new Error('Không nhận được phiên đăng nhập từ máy chủ');
    setAdminToken(res.token);
    adminUser.value = res.user || { username: usernameInput.value.trim(), role: 'admin' };
    setSavedUser(adminUser.value);
    passwordInput.value = '';
    if (adminUser.value.role !== 'staff') {
      loadRevenue();
      if (adminUser.value.role === 'superadmin') loadManageData();
    }
  } catch (err) {
    loginError.value = err.message || 'Đăng nhập thất bại';
  } finally {
    loginLoading.value = false;
  }
}

function handleLogout() {
  adminUser.value = null;
  setAdminToken('');
  setSavedUser(null);
  passwordInput.value = '';
  loginError.value = '';
}

function openPwdModal() {
  pwdForm.value = { current: '', next: '', confirm: '' };
  pwdError.value = '';
  pwdSuccess.value = '';
  showPwdModal.value = true;
}

async function handleChangePassword() {
  pwdError.value = '';
  pwdSuccess.value = '';
  if (!pwdForm.value.current || !pwdForm.value.next) {
    pwdError.value = 'Vui lòng nhập đầy đủ thông tin';
    return;
  }
  if (pwdForm.value.next.length < 4) {
    pwdError.value = 'Mật khẩu mới phải có ít nhất 4 ký tự';
    return;
  }
  if (pwdForm.value.next !== pwdForm.value.confirm) {
    pwdError.value = 'Xác nhận mật khẩu mới không khớp';
    return;
  }
  pwdLoading.value = true;
  try {
    await api.adminChangePassword(adminUser.value.username, pwdForm.value.current, pwdForm.value.next);
    pwdSuccess.value = 'Đã đổi mật khẩu thành công!';
    pwdForm.value = { current: '', next: '', confirm: '' };
  } catch (err) {
    pwdError.value = err.message || 'Không đổi được mật khẩu';
  } finally {
    pwdLoading.value = false;
  }
}

async function loadRevenue() {
  if (!adminUser.value || isStaffOnly.value) return;
  const seq = ++revenueSeq;
  loading.value = true;
  try {
    const storeId = isSuperAdmin.value ? selectedStoreId.value : '';
    const res = await api.getRevenue(fromDate.value, toDate.value, selectedShiftId.value, { storeId });
    if (seq === revenueSeq) data.value = res;
  } catch (err) {
    if (seq === revenueSeq) {
      if (err.status === 401) {
        handleLogout();
        loginError.value = 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại';
      } else {
        alert(err.message);
      }
    }
  } finally {
    if (seq === revenueSeq) loading.value = false;
  }
}

function applyPreset(key) {
  if (loading.value) return;
  preset.value = key;
  selectedShiftId.value = '';
  const today = getTodayStr();
  const now = new Date();
  if (key === 'today') {
    fromDate.value = today;
    toDate.value = today;
  } else if (key === 'yesterday') {
    const y = shiftDateStr(-1);
    fromDate.value = y;
    toDate.value = y;
  } else if (key === '7d') {
    fromDate.value = shiftDateStr(-6);
    toDate.value = today;
  } else if (key === '30d') {
    fromDate.value = shiftDateStr(-29);
    toDate.value = today;
  } else if (key === 'thisMonth') {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    fromDate.value = formatDateInput(first);
    toDate.value = today;
  } else if (key === 'lastMonth') {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    fromDate.value = formatDateInput(first);
    toDate.value = formatDateInput(last);
  }
  loadRevenue();
}

function toggleShiftFilter(shiftId) {
  if (loading.value) return;
  selectedShiftId.value = selectedShiftId.value === shiftId ? '' : shiftId;
  loadRevenue();
}

function formatShiftLabel(s) {
  const start = s.openedAt ? new Date(s.openedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
  const end = s.closedAt ? new Date(s.closedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'đang mở';
  return `${s.shiftName} (${s.dateKey} · ${start}-${end}) · ${formatVnd(s.totalRevenue)}`;
}

function formatShortDate(dateKey) {
  const parts = String(dateKey || '').split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : dateKey;
}

function formatShortMoney(val) {
  const n = Number(val) || 0;
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, '')}tr`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
}

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Fallback tính dailySeries / hourlySeries từ orders nếu GAS chưa redeploy bản mới
const dailySeries = computed(() => {
  if (Array.isArray(data.value.dailySeries) && data.value.dailySeries.length) {
    return data.value.dailySeries;
  }
  const map = new Map();
  for (const o of data.value.orders || []) {
    if (o.status === 'cancelled') continue;
    const prev = map.get(o.dateKey) || { date: o.dateKey, revenue: 0, orders: 0, cups: 0 };
    prev.revenue += Number(o.total) || 0;
    prev.orders += 1;
    for (const it of o.items || []) prev.cups += Number(it.quantity) || 1;
    map.set(o.dateKey, prev);
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
});

const maxDailyRevenue = computed(() => {
  return Math.max(...dailySeries.value.map((d) => Number(d.revenue) || 0), 1);
});

const avgDailyRevenue = computed(() => {
  if (!dailySeries.value.length) return 0;
  return Math.round((Number(data.value.totalRevenue) || 0) / dailySeries.value.length);
});

const hourlySeries = computed(() => {
  if (Array.isArray(data.value.hourlySeries) && data.value.hourlySeries.length) {
    return data.value.hourlySeries;
  }
  const map = new Map();
  for (const o of data.value.orders || []) {
    if (o.status === 'cancelled' || !o.createdAt) continue;
    const dt = new Date(o.createdAt);
    if (Number.isNaN(dt.getTime())) continue;
    const h = dt.getHours();
    const prev = map.get(h) || { hour: h, revenue: 0, orders: 0 };
    prev.revenue += Number(o.total) || 0;
    prev.orders += 1;
    map.set(h, prev);
  }
  return Array.from(map.values()).sort((a, b) => a.hour - b.hour);
});

const maxHourlyRevenue = computed(() => {
  return Math.max(...hourlySeries.value.map((h) => Number(h.revenue) || 0), 1);
});

const paymentEntries = computed(() => {
  const total = Number(data.value.totalRevenue) || 0;
  return Object.entries(data.value.byPaymentMethod || {})
    .map(([name, amount]) => ({
      name,
      amount: Number(amount) || 0,
      pct: total > 0 ? Math.round(((Number(amount) || 0) / total) * 100) : 0
    }))
    .sort((a, b) => b.amount - a.amount);
});

const orderTypeEntries = computed(() => {
  const total = Number(data.value.totalRevenue) || 0;
  return Object.entries(data.value.byOrderType || {})
    .map(([name, amount]) => ({
      name,
      amount: Number(amount) || 0,
      pct: total > 0 ? Math.round(((Number(amount) || 0) / total) * 100) : 0
    }))
    .sort((a, b) => b.amount - a.amount);
});

const filteredTopProducts = computed(() => {
  const q = productSearch.value.trim().toLowerCase();
  const totalRev = Number(data.value.totalRevenue) || 0;
  let list = (data.value.topProducts || []).map((p) => ({
    ...p,
    pct: totalRev > 0 ? Math.round(((Number(p.revenue) || 0) / totalRev) * 100) : 0
  }));
  if (q) {
    list = list.filter((p) => String(p.name || '').toLowerCase().includes(q));
  }
  if (productSort.value === 'revenue') {
    list.sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity);
  } else {
    list.sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue);
  }
  return list;
});

const filteredOrders = computed(() => {
  const q = orderSearch.value.trim().toLowerCase();
  return (data.value.orders || []).filter((o) => {
    if (orderStatusFilter.value === 'completed' && o.status === 'cancelled') return false;
    if (orderStatusFilter.value === 'cancelled' && o.status !== 'cancelled') return false;
    if (!q) return true;
    const matchCode = String(o.orderCode || '').toLowerCase().includes(q);
    const matchType = String(o.orderType || '').toLowerCase().includes(q);
    const matchPay = String(o.paymentMethod || '').toLowerCase().includes(q);
    const matchItem = (o.items || []).some((it) => String(it.productName || '').toLowerCase().includes(q));
    return matchCode || matchType || matchPay || matchItem;
  });
});

const groupedFilteredOrders = computed(() => groupOrdersByShift(filteredOrders.value, data.value.shifts));

onMounted(() => {
  if (adminUser.value && !isStaffOnly.value) {
    loadRevenue();
    if (isSuperAdmin.value) loadManageData();
  }
});
</script>

<template>
  <!-- Login Gate -->
  <div v-if="!adminUser" class="admin-login-shell">
    <div class="admin-login-card panel">
      <div class="admin-login-header">
        <div class="brand-badge" style="width: 44px; height: 44px; font-size: 18px">
          <ShieldCheck :size="22" />
        </div>
        <div>
          <h2 style="margin: 0; font-size: 19px">Quản trị Rau Má Mix</h2>
          <p style="margin: 2px 0 0; font-size: 13px; color: var(--text-muted)">
            Đăng nhập để xem báo cáo doanh thu & món bán chạy
          </p>
        </div>
      </div>

      <form class="admin-login-form" @submit.prevent="handleLogin">
        <div>
          <label class="field-label">Tài khoản</label>
          <input
            v-model="usernameInput"
            type="text"
            class="input-sm"
            placeholder="Nhập tài khoản"
            autocomplete="username"
            :disabled="loginLoading"
          />
        </div>

        <div>
          <label class="field-label">Mật khẩu</label>
          <input
            v-model="passwordInput"
            type="password"
            class="input-sm"
            placeholder="Nhập mật khẩu"
            autocomplete="current-password"
            :disabled="loginLoading"
          />
        </div>

        <div v-if="loginError" class="admin-error-box">
          {{ loginError }}
        </div>

        <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center; height: 40px" :disabled="loginLoading">
          <Loader2 v-if="loginLoading" :size="16" class="spin" />
          <span>{{ loginLoading ? 'Đang xác thực...' : 'Đăng nhập Admin' }}</span>
        </button>
      </form>
    </div>
  </div>

  <!-- Staff cannot access Admin -->
  <div v-else-if="isStaffOnly" class="admin-login-shell">
    <div class="admin-login-card panel" style="text-align: center">
      <h2 style="margin: 0 0 8px; font-size: 18px">Không có quyền truy cập</h2>
      <p style="margin: 0 0 16px; font-size: 13px; color: var(--text-muted)">
        Tài khoản bán hàng (<strong>{{ adminUser.username }}</strong>) chỉ dùng cho màn hình POS.
      </p>
      <div style="display: flex; gap: 8px; justify-content: center">
        <button type="button" class="btn btn-primary btn-sm" @click="emit('go-pos')">
          <ArrowLeft :size="14" /> Về trang bán hàng
        </button>
        <button type="button" class="btn btn-danger-soft btn-sm" @click="handleLogout">
          <LogOut :size="14" /> Đổi tài khoản
        </button>
      </div>
    </div>
  </div>

  <!-- Admin Dashboard -->
  <div v-else class="app-shell">
    <header class="topbar admin-topbar">
      <div class="brand">
        <div class="brand-badge"><ShieldCheck :size="18" /></div>
        <span>Rau Má Mix · {{ isSuperAdmin ? 'Super Admin' : adminUser.storeName || 'Admin' }}</span>
      </div>

      <nav class="nav-tabs">
        <button class="nav-tab" :class="{ active: adminTab === 'revenue' }" @click="adminTab = 'revenue'">
          <TrendingUp :size="15" /> Doanh thu
        </button>
        <button class="nav-tab" :class="{ active: adminTab === 'timekeeping' }" @click="adminTab = 'timekeeping'">
          <Clock :size="15" /> Chấm công
        </button>
        <button v-if="isSuperAdmin" class="nav-tab" :class="{ active: adminTab === 'manage' }" @click="adminTab = 'manage'; loadManageData()">
          <Store :size="15" /> Quán & Tài khoản
        </button>
      </nav>

      <div class="topbar-right admin-topbar-actions">
        <span class="badge badge-ok admin-user-badge">
          TK: {{ adminUser.username }}
        </span>
        <button class="btn btn-outline btn-sm" @click="openPwdModal" title="Đổi mật khẩu Admin">
          <KeyRound :size="14" /> Đổi MK
        </button>
        <button class="btn btn-danger-soft btn-sm" @click="handleLogout">
          <LogOut :size="14" /> Đăng xuất
        </button>
      </div>
    </header>

    <!-- Timekeeping & Payroll Summary -->
    <AdminTimekeepingView
      v-if="adminTab === 'timekeeping'"
      :is-super-admin="isSuperAdmin"
      :stores="stores"
      :selected-store-id="selectedStoreId"
    />

    <!-- Super Admin: Stores & Users Management -->
    <div v-else-if="isSuperAdmin && adminTab === 'manage'" class="page-container admin-page-container">
      <div class="two-col">
        <div class="panel card-pad">
          <div class="section-head">
            <h3><Store :size="16" /> Danh sách quán ({{ stores.length }})</h3>
          </div>
          <form class="admin-login-form" style="margin-bottom: 16px" @submit.prevent="handleCreateStore">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px">
              <input v-model="newStoreForm.name" @input="onStoreNameInput" type="text" class="input-sm" placeholder="Tên quán (VD: Cầu Giấy)" :disabled="storeCreateLoading" />
              <input v-model="newStoreForm.spreadsheetId" type="text" class="input-sm" placeholder="Sheet ID (để trống = tự tạo mới)" :disabled="storeCreateLoading" />
              <input v-model="newStoreForm.staffUsername" @input="storeAccountTouched = true" type="text" class="input-sm" placeholder="TK nhân viên (POS)" :disabled="storeCreateLoading" />
              <input v-model="newStoreForm.staffPassword" type="password" class="input-sm" placeholder="MK nhân viên (>= 4 ký tự)" :disabled="storeCreateLoading" />
              <input v-model="newStoreForm.adminUsername" @input="storeAccountTouched = true" type="text" class="input-sm" placeholder="TK admin quán" :disabled="storeCreateLoading" />
              <input v-model="newStoreForm.adminPassword" type="password" class="input-sm" placeholder="MK admin quán (>= 4 ký tự)" :disabled="storeCreateLoading" />
            </div>
            <div style="font-size: 11px; color: var(--text-muted)">
              * Menu, Size & Topping sẽ được copy tự động từ quán Nguyễn Chánh.
            </div>
            <div v-if="storeError" class="admin-error-box">{{ storeError }}</div>
            <div v-if="storeSuccess" style="padding: 8px 10px; border-radius: 8px; background: #ecfdf5; color: #065f46; font-size: 12px">{{ storeSuccess }}</div>
            <button type="submit" class="btn btn-primary btn-sm" :disabled="storeCreateLoading">
              {{ storeCreateLoading ? 'Đang tạo quán & Sheet...' : '+ Thêm quán mới' }}
            </button>
          </form>

          <div style="display: flex; flex-direction: column; gap: 8px">
            <div v-for="st in stores" :key="st.id" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border: 1px solid var(--border); border-radius: 8px">
              <div>
                <div style="font-weight: 600">{{ st.name }} <span style="font-size: 12px; color: var(--text-muted)">({{ st.id }})</span></div>
                <div style="font-size: 11px; color: var(--text-muted); word-break: break-all">Sheet: {{ st.spreadsheetId || 'local' }}</div>
              </div>
              <div style="display: flex; gap: 6px; flex-shrink: 0">
                <button class="btn btn-sm" :class="st.active ? 'btn-primary' : 'btn-outline'" @click="toggleStoreActive(st)">
                  {{ st.active ? 'Đang mở' : 'Tạm ngưng' }}
                </button>
                <button
                  v-if="st.id !== 'default'"
                  class="btn btn-danger-soft btn-sm"
                  :disabled="deletingStoreId === st.id"
                  @click="handleDeleteStore(st)"
                >
                  <Loader2 v-if="deletingStoreId === st.id" :size="13" class="spin" />
                  {{ deletingStoreId === st.id ? 'Đang xóa...' : 'Xóa' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="panel card-pad">
          <div class="section-head">
            <h3><Users :size="16" /> Tài khoản đăng nhập ({{ usersList.length }})</h3>
          </div>
          <form class="admin-login-form" style="margin-bottom: 16px" @submit.prevent="handleCreateUser">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px">
              <input v-model="newUserForm.username" type="text" class="input-sm" placeholder="Tên đăng nhập" :disabled="userCreateLoading" />
              <input v-model="newUserForm.password" type="password" class="input-sm" placeholder="Mật khẩu (>= 4 ký tự)" :disabled="userCreateLoading" />
              <select v-model="newUserForm.role" class="input-sm" :disabled="userCreateLoading">
                <option value="staff">Bán hàng (POS)</option>
                <option value="admin">Quản lý quán (POS + Admin)</option>
                <option value="superadmin">Super Admin (Tất cả quán)</option>
              </select>
              <select v-if="newUserForm.role !== 'superadmin'" v-model="newUserForm.storeId" class="input-sm" :disabled="userCreateLoading">
                <option v-for="st in stores" :key="st.id" :value="st.id">{{ st.name }}</option>
              </select>
            </div>
            <div v-if="userError" class="admin-error-box">{{ userError }}</div>
            <button type="submit" class="btn btn-primary btn-sm" :disabled="userCreateLoading">
              {{ userCreateLoading ? 'Đang tạo...' : '+ Thêm tài khoản' }}
            </button>
          </form>

          <div style="display: flex; flex-direction: column; gap: 8px">
            <div v-for="u in usersList" :key="u.username" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border: 1px solid var(--border); border-radius: 8px">
              <div>
                <div style="font-weight: 600">{{ u.username }} <span class="badge" style="font-size: 11px">{{ u.role }}</span></div>
                <div style="font-size: 12px; color: var(--text-muted)">
                  Quán: {{ u.role === 'superadmin' ? 'Tất cả quán' : (stores.find(s => s.id === u.storeId)?.name || u.storeId) }}
                </div>
              </div>
              <button
                v-if="u.username !== adminUser.username"
                class="btn btn-sm"
                :class="u.active ? 'btn-primary' : 'btn-outline'"
                @click="toggleUserActive(u)"
              >
                {{ u.active ? 'Hoạt động' : 'Đã khóa' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="page-container admin-page-container">
      <!-- Filter Bar -->
      <div class="panel card-pad admin-filter-bar">
        <div class="cat-pills admin-presets">
          <button class="pill" :class="{ active: preset === 'today' }" :disabled="loading" @click="applyPreset('today')">Hôm nay</button>
          <button class="pill" :class="{ active: preset === 'yesterday' }" :disabled="loading" @click="applyPreset('yesterday')">Hôm qua</button>
          <button class="pill" :class="{ active: preset === '7d' }" :disabled="loading" @click="applyPreset('7d')">7 ngày</button>
          <button class="pill" :class="{ active: preset === '30d' }" :disabled="loading" @click="applyPreset('30d')">30 ngày</button>
          <button class="pill" :class="{ active: preset === 'thisMonth' }" :disabled="loading" @click="applyPreset('thisMonth')">Tháng này</button>
          <button class="pill" :class="{ active: preset === 'lastMonth' }" :disabled="loading" @click="applyPreset('lastMonth')">Tháng trước</button>
        </div>

        <div class="admin-date-controls">
          <select v-if="isSuperAdmin" v-model="selectedStoreId" class="input-sm admin-shift-select" :disabled="loading" @change="selectedShiftId = ''; loadRevenue()">
            <option value="all">Tất cả các quán</option>
            <option v-for="st in stores" :key="st.id" :value="st.id">
              {{ st.name }}
            </option>
          </select>
          <select v-model="selectedShiftId" class="input-sm admin-shift-select" :disabled="loading" @change="loadRevenue">
            <option value="">Tất cả các ca</option>
            <option v-for="s in data.shifts || []" :key="s.id" :value="s.id">
              {{ formatShiftLabel(s) }}
            </option>
          </select>
          <div class="admin-date-range">
            <input v-model="fromDate" type="date" class="input-sm" :disabled="loading" @change="preset = 'custom'; selectedShiftId = ''" />
            <span class="date-arrow">→</span>
            <input v-model="toDate" type="date" class="input-sm" :disabled="loading" @change="preset = 'custom'; selectedShiftId = ''" />
          </div>
          <button class="btn btn-primary btn-sm admin-refresh-btn" @click="loadRevenue" :disabled="loading">
            <Loader2 v-if="loading" :size="14" class="spin" />
            <RefreshCw v-else :size="14" />
            {{ loading ? 'Đang tải...' : 'Xem' }}
          </button>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="kpi-grid admin-kpi-grid" :class="{ 'is-loading': loading }">
        <div class="kpi-card">
          <div class="kpi-label">Tổng doanh thu</div>
          <div class="kpi-value green">{{ formatVnd(data.totalRevenue) }}</div>
          <div v-if="dailySeries.length > 1" class="kpi-sub">
            TB {{ formatVnd(avgDailyRevenue) }} / ngày bán
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Đơn thành công</div>
          <div class="kpi-value">
            {{ data.orderCount }}
            <span style="font-size: 13px; color: var(--text-muted)">(hủy: {{ data.cancelledCount }})</span>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Tổng số ly đã bán</div>
          <div class="kpi-value">{{ data.totalCups }} ly</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Trung bình / đơn</div>
          <div class="kpi-value">{{ formatVnd(data.avgOrderValue) }}</div>
        </div>
      </div>

      <!-- Revenue by Store (Super Admin when viewing all stores) -->
      <div v-if="isSuperAdmin && selectedStoreId === 'all' && data.byStore && data.byStore.length" class="panel card-pad" style="margin-bottom: 16px" :class="{ 'is-loading': loading }">
        <div class="section-head">
          <h3><Store :size="16" /> Doanh thu theo từng quán</h3>
        </div>
        <div class="kpi-grid" style="grid-template-columns: repeat(auto-fill, minmax(200px, 1fr))">
          <div v-for="st in data.byStore" :key="st.storeId" class="kpi-card" style="cursor: pointer" @click="selectedStoreId = st.storeId; selectedShiftId = ''; loadRevenue()">
            <div class="kpi-label">{{ st.storeName }}</div>
            <div class="kpi-value green" style="font-size: 18px">{{ formatVnd(st.totalRevenue) }}</div>
            <div class="kpi-sub">{{ st.orderCount }} đơn · {{ st.totalCups }} ly</div>
          </div>
        </div>
      </div>

      <!-- Charts: Daily Revenue + Peak Hours -->
      <div class="two-col" :class="{ 'is-loading': loading }">
        <div class="panel card-pad">
          <div class="section-head">
            <h3><TrendingUp :size="16" /> Doanh thu theo ngày</h3>
            <span style="font-size: 12px; color: var(--text-muted)">{{ dailySeries.length }} ngày có đơn</span>
          </div>
          <div v-if="!dailySeries.length" style="color: var(--text-muted); font-size: 14px; padding: 24px 0; text-align: center">
            Chưa có dữ liệu trong khoảng thời gian này.
          </div>
          <div v-else class="bar-chart-scroll">
            <div class="bar-chart">
              <div
                v-for="d in dailySeries"
                :key="d.date"
                class="bar-col"
                :title="`${d.date}: ${formatVnd(d.revenue)} (${d.orders || 0} đơn, ${d.cups || 0} ly)`"
              >
                <div class="bar-val">{{ formatShortMoney(d.revenue) }}</div>
                <div class="bar-track">
                  <div
                    class="bar-fill"
                    :style="{ height: Math.max(4, Math.round((d.revenue / maxDailyRevenue) * 100)) + '%' }"
                  ></div>
                </div>
                <div class="bar-label">{{ formatShortDate(d.date) }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="panel card-pad">
          <div class="section-head">
            <h3><Clock :size="16" /> Khung giờ bán chạy</h3>
            <span style="font-size: 12px; color: var(--text-muted)">Theo giờ đặt đơn</span>
          </div>
          <div v-if="!hourlySeries.length" style="color: var(--text-muted); font-size: 14px; padding: 24px 0; text-align: center">
            Chưa có dữ liệu theo khung giờ.
          </div>
          <div v-else class="bar-chart-scroll">
            <div class="bar-chart">
              <div
                v-for="h in hourlySeries"
                :key="h.hour"
                class="bar-col"
                :title="`${h.hour}h-${h.hour + 1}h: ${formatVnd(h.revenue)} (${h.orders} đơn)`"
              >
                <div class="bar-val">{{ formatShortMoney(h.revenue) }}</div>
                <div class="bar-track">
                  <div
                    class="bar-fill bar-fill-alt"
                    :style="{ height: Math.max(4, Math.round((h.revenue / maxHourlyRevenue) * 100)) + '%' }"
                  ></div>
                </div>
                <div class="bar-label">{{ h.hour }}h</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Breakdown: Payment & Order Type -->
      <div class="two-col" :class="{ 'is-loading': loading }">
        <div class="panel card-pad">
          <h3 style="margin: 0 0 12px; font-size: 15px">Tỷ trọng theo thanh toán</h3>
          <div v-if="!paymentEntries.length" style="color: var(--text-muted); font-size: 14px">Chưa có dữ liệu.</div>
          <div v-else class="progress-list">
            <div v-for="item in paymentEntries" :key="item.name" class="progress-item">
              <div class="summary-line" style="font-size: 14px">
                <span>{{ item.name === 'Tiền mặt' ? 'Tiền mặt (vào két)' : item.name }} <span style="color: var(--text-muted)">({{ item.pct }}%)</span></span>
                <b>{{ formatVnd(item.amount) }}</b>
              </div>
              <div class="progress-track">
                <div class="progress-fill" :style="{ width: item.pct + '%' }"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="panel card-pad">
          <h3 style="margin: 0 0 12px; font-size: 15px">Tỷ trọng theo kênh bán</h3>
          <div v-if="!orderTypeEntries.length" style="color: var(--text-muted); font-size: 14px">Chưa có dữ liệu.</div>
          <div v-else class="progress-list">
            <div v-for="item in orderTypeEntries" :key="item.name" class="progress-item">
              <div class="summary-line" style="font-size: 14px">
                <span>{{ item.name === 'Tiền mặt' ? 'Tiền mặt (vào két)' : item.name }} <span style="color: var(--text-muted)">({{ item.pct }}%)</span></span>
                <b>{{ formatVnd(item.amount) }}</b>
              </div>
              <div class="progress-track">
                <div class="progress-fill progress-fill-blue" :style="{ width: item.pct + '%' }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Full Top Products Table -->
      <div class="panel card-pad" :class="{ 'is-loading': loading }">
        <div class="section-head admin-section-tools">
          <h3><Award :size="16" /> Thống kê món bán chạy ({{ filteredTopProducts.length }})</h3>
          <div class="admin-tools-group">
            <div class="search-inline">
              <Search :size="14" />
              <input v-model="productSearch" type="text" placeholder="Tìm tên món..." />
            </div>
            <div class="cat-pills">
              <button class="pill" :class="{ active: productSort === 'quantity' }" @click="productSort = 'quantity'">Theo số ly</button>
              <button class="pill" :class="{ active: productSort === 'revenue' }" @click="productSort = 'revenue'">Theo doanh thu</button>
            </div>
          </div>
        </div>

        <div class="table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th style="width: 48px">Hạng</th>
                <th>Tên món</th>
                <th style="width: 84px">Số ly</th>
                <th style="width: 110px">Doanh thu</th>
                <th class="hide-sm" style="width: 170px">Tỷ trọng DT</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!filteredTopProducts.length">
                <td colspan="5" style="text-align: center; color: var(--text-muted)">Chưa có món nào được bán.</td>
              </tr>
              <tr v-for="(p, idx) in filteredTopProducts" :key="p.name">
                <td>
                  <span class="rank-badge" :class="idx < 3 ? `rank-${idx + 1}` : ''">#{{ idx + 1 }}</span>
                </td>
                <td><b>{{ p.name }}</b></td>
                <td><b style="color: var(--primary)">{{ p.quantity }} ly</b></td>
                <td><b>{{ formatVnd(p.revenue) }}</b></td>
                <td class="hide-sm">
                  <div style="display: flex; align-items: center; gap: 8px">
                    <div class="progress-track" style="flex: 1">
                      <div class="progress-fill" :style="{ width: p.pct + '%' }"></div>
                    </div>
                    <span style="font-size: 12px; min-width: 34px; text-align: right">{{ p.pct }}%</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Shifts Table -->
      <div v-if="(data.shifts || []).length" class="panel card-pad" :class="{ 'is-loading': loading }">
        <div class="section-head">
          <h3>Lịch sử ca làm việc ({{ data.shifts.length }})</h3>
          <button v-if="selectedShiftId" class="btn btn-outline btn-sm" @click="toggleShiftFilter(selectedShiftId)">
            Bỏ lọc ca
          </button>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ca</th>
                <th>Ngày / Giờ mở - đóng</th>
                <th>Nhân viên</th>
                <th>Số đơn</th>
                <th>Doanh thu</th>
                <th>Tiền chốt két</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="s in data.shifts"
                :key="s.id"
                style="cursor: pointer"
                :style="selectedShiftId === s.id ? { background: '#f0fdf4' } : {}"
                @click="toggleShiftFilter(s.id)"
                title="Bấm để lọc báo cáo theo ca này"
              >
                <td><b>{{ s.shiftName }}</b></td>
                <td style="font-size: 13px">
                  {{ formatDateTime(s.openedAt) }} → {{ s.closedAt ? formatDateTime(s.closedAt) : 'Đang bán' }}
                </td>
                <td style="font-size: 13px">{{ s.closedBy || s.openedBy || '—' }}</td>
                <td>{{ s.totalOrders }}</td>
                <td><b>{{ formatVnd(s.totalRevenue) }}</b></td>
                <td style="font-size: 13px">
                  <template v-if="s.status === 'closed'">
                    {{ formatVnd(s.actualCash) }} / {{ formatVnd(s.expectedCash) }}
                    <span
                      v-if="s.cashDiff !== 0"
                      :style="{ color: s.cashDiff > 0 ? '#0284c7' : '#dc2626', fontWeight: 600 }"
                    >
                      ({{ s.cashDiff > 0 ? '+' : '' }}{{ formatVnd(s.cashDiff) }})
                    </span>
                  </template>
                  <span v-else style="color: var(--text-muted)">Dự kiến: {{ formatVnd(s.expectedCash) }}</span>
                </td>
                <td>
                  <span class="badge" :class="s.status === 'open' ? 'badge-ok' : ''" :style="s.status === 'closed' ? { background: '#e2e8f0', color: '#334155' } : {}">
                    {{ s.status === 'open' ? 'Đang mở' : 'Đã chốt' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Orders History -->
      <div class="panel card-pad" :class="{ 'is-loading': loading }">
        <div class="section-head admin-section-tools">
          <h3>Chi tiết đơn hàng ({{ filteredOrders.length }})</h3>
          <div class="admin-tools-group">
            <div class="search-inline">
              <Search :size="14" />
              <input v-model="orderSearch" type="text" placeholder="Tìm mã đơn, tên món, kênh..." />
            </div>
            <select v-model="orderStatusFilter" class="input-sm admin-status-select">
              <option value="all">Tất cả trạng thái</option>
              <option value="completed">Hoàn thành</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Thời gian</th>
                <th>Chi tiết món</th>
                <th>Kênh / TT</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!filteredOrders.length">
                <td colspan="6" style="text-align: center; color: var(--text-muted)">Không có đơn hàng nào khớp bộ lọc.</td>
              </tr>
              <template v-for="group in groupedFilteredOrders" :key="group.key">
                <tr style="background: #f8fafc">
                  <td colspan="6" style="padding: 8px 12px; border-top: 2px solid var(--border)">
                    <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px">
                      <div style="display: flex; align-items: center; gap: 8px; font-size: 13px">
                        <span v-if="isSuperAdmin && group.storeName" class="badge" style="background: #e0f2fe; color: #0369a1; font-size: 11px">
                          {{ group.storeName }}
                        </span>
                        <b>{{ group.shift ? group.shift.shiftName : 'Đơn chưa gắn ca' }}</b>
                        <span v-if="group.shift" style="color: var(--text-muted)">
                          ({{ formatDateTime(group.shift.openedAt) }} → {{ group.shift.closedAt ? formatDateTime(group.shift.closedAt) : 'Đang bán' }})
                        </span>
                        <span v-if="group.shift?.closedBy || group.shift?.openedBy" style="color: var(--text-muted)">
                          · NV: {{ group.shift.closedBy || group.shift.openedBy }}
                        </span>
                        <span
                          v-if="group.shift"
                          class="badge"
                          :class="group.shift.status === 'open' ? 'badge-ok' : ''"
                          :style="group.shift.status === 'closed' ? { background: '#e2e8f0', color: '#334155', fontSize: '11px' } : { fontSize: '11px' }"
                        >
                          {{ group.shift.status === 'open' ? 'Đang mở' : 'Đã chốt' }}
                        </span>
                      </div>
                      <div style="font-size: 13px">
                        <span v-if="group.shift" style="color: var(--text-muted); margin-right: 8px">
                          <template v-if="group.shift.status === 'closed'">
                            Két thực tế: <b>{{ formatVnd(group.shift.actualCash) }}</b> / {{ formatVnd(group.shift.expectedCash) }}
                            <span
                              v-if="group.shift.cashDiff !== 0"
                              :style="{ color: group.shift.cashDiff > 0 ? '#0284c7' : '#dc2626', fontWeight: 600 }"
                            >
                              ({{ group.shift.cashDiff > 0 ? '+' : '' }}{{ formatVnd(group.shift.cashDiff) }})
                            </span>
                          </template>
                          <template v-else>
                            Két dự kiến: {{ formatVnd(group.shift.expectedCash) }}
                          </template>
                          ·
                        </span>
                        <span>{{ group.completedCount }} đơn</span>
                        <span v-if="group.cancelledCount" style="color: var(--text-muted)"> (hủy: {{ group.cancelledCount }})</span>
                        · <b style="color: var(--primary)">{{ formatVnd(group.totalRevenue) }}</b>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr v-for="o in group.orders" :key="o.id">
                  <td><b>{{ o.orderCode }}</b></td>
                  <td style="font-size: 13px">{{ formatDateTime(o.createdAt) }}</td>
                  <td>
                    <div v-for="(it, idx) in o.items" :key="idx" style="font-size: 13px">
                      {{ it.quantity }}× {{ it.productName }} ({{ it.size }})
                    </div>
                  </td>
                  <td style="font-size: 13px">{{ o.orderType }} · {{ o.paymentMethod }}</td>
                  <td><b>{{ formatVnd(o.total) }}</b></td>
                  <td>
                    <span class="badge" :class="o.status === 'cancelled' ? 'badge-cancel' : 'badge-ok'">
                      {{ o.status === 'cancelled' ? 'Đã hủy' : 'Hoàn thành' }}
                    </span>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Change Password Modal -->
    <div v-if="showPwdModal" class="modal-backdrop" @click.self="showPwdModal = false">
      <div class="modal-box" style="max-width: 380px">
        <div class="modal-head">
          <h3 style="margin: 0; font-size: 16px">Đổi mật khẩu Admin</h3>
          <button class="icon-btn" @click="showPwdModal = false"><X :size="18" /></button>
        </div>
        <form class="admin-login-form" style="padding: 16px" @submit.prevent="handleChangePassword">
          <div>
            <label class="field-label">Mật khẩu hiện tại</label>
            <input v-model="pwdForm.current" type="password" class="input-sm" :disabled="pwdLoading" />
          </div>
          <div>
            <label class="field-label">Mật khẩu mới</label>
            <input v-model="pwdForm.next" type="password" class="input-sm" :disabled="pwdLoading" />
          </div>
          <div>
            <label class="field-label">Nhập lại mật khẩu mới</label>
            <input v-model="pwdForm.confirm" type="password" class="input-sm" :disabled="pwdLoading" />
          </div>
          <div v-if="pwdError" class="admin-error-box">{{ pwdError }}</div>
          <div v-if="pwdSuccess" class="admin-success-box">{{ pwdSuccess }}</div>
          <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center" :disabled="pwdLoading">
            {{ pwdLoading ? 'Đang lưu...' : 'Lưu mật khẩu mới' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
