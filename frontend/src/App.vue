<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { ShoppingBag, BarChart3, Usb, Printer, Loader2, AlertTriangle, LogOut, ShieldCheck } from 'lucide-vue-next';
import { api, formatVnd, getSavedUser, setSavedUser, setAdminToken } from './api.js';
import { pendingCount, failedCount, resumeOrderQueue, retryFailedOrders } from './orderQueue.js';
import {
  isWebUsbSupported,
  connectUsbPrinter,
  autoReconnectUsbPrinter,
  getConnectedPrinterName,
  printOrderViaUsb,
  printTestLabelUsb,
  printOrderViaRawBt,
  printTestLabelRawBt,
  printOrderViaBridge,
  printTestLabelBridge
} from './usbPrinter.js';
import PosView from './components/PosView.vue';
import RevenueView from './components/RevenueView.vue';
import AdminView from './components/AdminView.vue';
import LabelPrinter from './components/LabelPrinter.vue';
import ShiftModal from './components/ShiftModal.vue';

function checkIsAdminRoute() {
  if (typeof window === 'undefined') return false;
  const p = window.location.pathname || '/';
  const h = window.location.hash || '';
  return p === '/admin' || p.startsWith('/admin/') || h === '#/admin' || h.startsWith('#/admin/');
}

const isAdminPage = ref(checkIsAdminRoute());
const activeTab = ref('pos');
const currentUser = ref(getSavedUser());
const posUsername = ref('');
const posPassword = ref('');
const posLoginLoading = ref(false);
const posLoginError = ref('');

async function handlePosLogin() {
  posLoginError.value = '';
  if (!posUsername.value.trim() || !posPassword.value) {
    posLoginError.value = 'Vui lòng nhập đầy đủ tài khoản và mật khẩu';
    return;
  }
  posLoginLoading.value = true;
  try {
    const res = await api.login(posUsername.value.trim(), posPassword.value);
    if (!res.token) throw new Error('Không nhận được phiên đăng nhập');
    setAdminToken(res.token);
    setSavedUser(res.user);
    currentUser.value = res.user;
    posPassword.value = '';
    loadMenu();
    loadCurrentShift();
    resumeOrderQueue(loadCurrentShift);
  } catch (err) {
    posLoginError.value = err.message || 'Đăng nhập thất bại';
  } finally {
    posLoginLoading.value = false;
  }
}

function handlePosLogout() {
  currentUser.value = null;
  setAdminToken('');
  setSavedUser(null);
  categories.value = [];
  products.value = [];
  toppings.value = [];
  currentShift.value = null;
}

function goAdmin() {
  if (typeof window !== 'undefined') {
    window.history.pushState({}, '', '/admin');
  }
  isAdminPage.value = true;
}

function goPos() {
  if (typeof window !== 'undefined' && window.location.pathname !== '/') {
    window.history.pushState({}, '', '/');
  }
  currentUser.value = getSavedUser();
  isAdminPage.value = false;
  if (currentUser.value) {
    if (!products.value.length) loadMenu();
    loadCurrentShift();
  }
}

function onPopState() {
  const nextAdmin = checkIsAdminRoute();
  currentUser.value = getSavedUser();
  isAdminPage.value = nextAdmin;
  if (!nextAdmin && currentUser.value && !products.value.length) {
    loadMenu();
    loadCurrentShift();
  }
}
const categories = ref([]);
const sizes = ref([]);
const products = ref([]);
const toppings = ref([]);
const currentShift = ref(null);
const showShiftModal = ref(false);
const menuLoading = ref(true);
const shiftLoading = ref(true);
const labelSize = ref(localStorage.getItem('labelSize') || '40x30');

function setLabelSize(sz) {
  labelSize.value = sz;
  localStorage.setItem('labelSize', sz);
}

const activePrintOrder = ref(null);
const showLabelPreview = ref(false);
const usbPrinterName = ref('');
const usbProtocol = ref(localStorage.getItem('usbProtocol') || 'tspl');
const printMode = ref(localStorage.getItem('printMode') || 'bridge');
const rotate180 = ref(localStorage.getItem('usbRotate180') === '1');
const webUsbAvailable = isWebUsbSupported();

function setPrintMode(mode) {
  printMode.value = mode;
  localStorage.setItem('printMode', mode);
}

function setUsbProtocol(val) {
  usbProtocol.value = val;
  localStorage.setItem('usbProtocol', val);
}

function toggleRotate180() {
  rotate180.value = !rotate180.value;
  localStorage.setItem('usbRotate180', rotate180.value ? '1' : '0');
}

function getUsbOpts() {
  return { rotate180: rotate180.value, flipY: false, offsetMm: 34 };
}

async function loadMenu() {
  if (!currentUser.value) return;
  menuLoading.value = true;
  try {
    const res = await api.getMenu();
    categories.value = res.categories || [];
    sizes.value = res.sizes || [];
    products.value = res.products || [];
    toppings.value = res.toppings || [];
  } catch (err) {
    if (err.status === 401) {
      handlePosLogout();
      posLoginError.value = 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại';
    }
    console.error(err);
  } finally {
    menuLoading.value = false;
  }
}

// Chỉ áp dụng kết quả của lần gọi mới nhất, tránh response cũ ghi đè trạng thái mới (VD vừa chốt ca xong)
let shiftRequestSeq = 0;
let shiftPending = 0;

async function loadCurrentShift() {
  const seq = ++shiftRequestSeq;
  shiftPending++;
  shiftLoading.value = true;
  try {
    const res = await api.getCurrentShift();
    if (seq === shiftRequestSeq) currentShift.value = res.shift || null;
  } catch (err) {
    console.error(err);
  } finally {
    shiftPending--;
    if (shiftPending === 0) shiftLoading.value = false;
  }
}

function openShiftModal() {
  showShiftModal.value = true;
  // Chỉ chốt ca mới cần số liệu mới nhất; mở ca chỉ là form nhập
  if (currentShift.value) loadCurrentShift();
}

function handleShiftUpdated(shift) {
  shiftRequestSeq++; // bỏ qua các response đang bay về (dữ liệu cũ)
  currentShift.value = shift || null;
}

async function handleConnectUsb() {
  try {
    await connectUsbPrinter();
    usbPrinterName.value = getConnectedPrinterName();
    alert(`Đã kết nối máy in: ${usbPrinterName.value}`);
  } catch (err) {
    if (err.name !== 'NotFoundError') {
      alert(`Không kết nối được máy in USB: ${err.message}`);
    }
  }
}

async function handleTestPrint() {
  if (printMode.value === 'bridge') {
    try {
      await printTestLabelBridge(labelSize.value, getUsbOpts(), usbProtocol.value);
    } catch (err) {
      alert(`Lỗi APK Bridge: ${err.message}\n(Đảm bảo đã mở app Raumamix Printer trên máy POS)`);
    }
    return;
  }
  if (printMode.value === 'rawbt') {
    printTestLabelRawBt(labelSize.value, getUsbOpts());
    return;
  }
  try {
    await printTestLabelUsb(labelSize.value, usbProtocol.value, getUsbOpts());
  } catch (err) {
    alert(`Lỗi in test: ${err.message}`);
  }
}

async function triggerPrint(order, previewOnly = false) {
  activePrintOrder.value = order;
  if (!previewOnly && printMode.value === 'bridge') {
    try {
      await printOrderViaBridge(order, labelSize.value, getUsbOpts(), usbProtocol.value);
    } catch (err) {
      console.warn('Bỏ qua in APK Bridge (không có máy in):', err.message);
    }
    return;
  }
  if (!previewOnly && printMode.value === 'rawbt') {
    printOrderViaRawBt(order, labelSize.value, getUsbOpts());
    return;
  }
  if (!previewOnly && printMode.value === 'webusb' && usbPrinterName.value) {
    try {
      await printOrderViaUsb(order, labelSize.value, usbProtocol.value, getUsbOpts());
      return;
    } catch (err) {
      console.warn('Bỏ qua in WebUSB (không có máy in):', err.message);
      return;
    }
  }
  showLabelPreview.value = previewOnly;
  if (!previewOnly) {
    await nextTick();
    window.print();
  }
}

function handleOrderCreated({ order, shouldPrint }) {
  // Cập nhật tạm số đơn & doanh thu ca ngay trên giao diện; khi lưu ngầm xong sẽ tự đồng bộ lại từ server
  if (currentShift.value) {
    currentShift.value = {
      ...currentShift.value,
      totalOrders: (Number(currentShift.value.totalOrders) || 0) + 1,
      totalRevenue: (Number(currentShift.value.totalRevenue) || 0) + (Number(order.total) || 0)
    };
  }
  if (shouldPrint) {
    triggerPrint(order, false);
  }
}

function handleReprintOrder(order) {
  triggerPrint(order, true);
}

async function printFromPreview() {
  if (printMode.value === 'bridge' && activePrintOrder.value) {
    try {
      await printOrderViaBridge(activePrintOrder.value, labelSize.value, getUsbOpts(), usbProtocol.value);
      showLabelPreview.value = false;
      return;
    } catch (err) {
      alert(`Lỗi APK Bridge: ${err.message}`);
      return;
    }
  }
  if (printMode.value === 'rawbt' && activePrintOrder.value) {
    printOrderViaRawBt(activePrintOrder.value, labelSize.value, getUsbOpts());
    showLabelPreview.value = false;
    return;
  }
  if (printMode.value === 'webusb' && usbPrinterName.value && activePrintOrder.value) {
    try {
      await printOrderViaUsb(activePrintOrder.value, labelSize.value, usbProtocol.value, getUsbOpts());
      showLabelPreview.value = false;
      return;
    } catch (err) {
      alert(`Lỗi in USB (${err.message}). Chuyển sang in qua Chrome...`);
    }
  }
  await nextTick();
  window.print();
}

onMounted(async () => {
  window.addEventListener('popstate', onPopState);
  window.addEventListener('hashchange', onPopState);
  if (!isAdminPage.value && currentUser.value) {
    loadMenu();
    loadCurrentShift();
    resumeOrderQueue(loadCurrentShift);
    await autoReconnectUsbPrinter();
    usbPrinterName.value = getConnectedPrinterName();
  }
});

onUnmounted(() => {
  window.removeEventListener('popstate', onPopState);
  window.removeEventListener('hashchange', onPopState);
});
</script>

<template>
  <AdminView v-if="isAdminPage" @go-pos="goPos" />

  <div v-else-if="!currentUser" class="admin-login-shell">
    <div class="admin-login-card panel">
      <div class="admin-login-header">
        <div class="brand-badge" style="width: 44px; height: 44px; font-size: 16px">RM</div>
        <div>
          <h2 style="margin: 0; font-size: 19px">Rau Má Mix POS</h2>
          <p style="margin: 2px 0 0; font-size: 13px; color: var(--text-muted)">
            Đăng nhập tài khoản quán để bắt đầu bán hàng
          </p>
        </div>
      </div>

      <form class="admin-login-form" @submit.prevent="handlePosLogin">
        <div>
          <label class="field-label">Tài khoản</label>
          <input
            v-model="posUsername"
            type="text"
            class="input-sm"
            placeholder="Nhập tài khoản (VD: member)"
            autocomplete="username"
            :disabled="posLoginLoading"
          />
        </div>

        <div>
          <label class="field-label">Mật khẩu</label>
          <input
            v-model="posPassword"
            type="password"
            class="input-sm"
            placeholder="Nhập mật khẩu"
            autocomplete="current-password"
            :disabled="posLoginLoading"
          />
        </div>

        <div v-if="posLoginError" class="admin-error-box">
          {{ posLoginError }}
        </div>

        <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center; height: 40px" :disabled="posLoginLoading">
          <Loader2 v-if="posLoginLoading" :size="16" class="spin" />
          <span>{{ posLoginLoading ? 'Đang đăng nhập...' : 'Đăng nhập POS' }}</span>
        </button>
      </form>
    </div>
  </div>

  <template v-else>
  <div class="app-shell">
    <header class="topbar">
      <div class="brand">
        <div class="brand-badge">RM</div>
        <span>Rau Má Mix · {{ currentUser.storeName || 'POS' }}</span>
      </div>

      <nav class="nav-tabs">
        <button class="nav-tab" :class="{ active: activeTab === 'pos' }" @click="activeTab = 'pos'">
          <ShoppingBag :size="16" /> Bấm đơn
        </button>
        <button class="nav-tab" :class="{ active: activeTab === 'revenue' }" @click="activeTab = 'revenue'">
          <BarChart3 :size="16" /> Doanh thu hôm nay
        </button>
      </nav>

      <div class="topbar-right">
        <span
          v-if="pendingCount > 0"
          class="badge badge-ok"
          style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px"
          title="Đang lưu đơn ngầm lên Google Sheet"
        >
          <Loader2 :size="12" class="spin" /> Lưu {{ pendingCount }} đơn...
        </span>
        <button
          v-if="failedCount > 0"
          class="btn btn-danger-soft btn-sm"
          @click="retryFailedOrders"
          title="Có đơn chưa lưu được do mất mạng — bấm để gửi lại"
        >
          <AlertTriangle :size="13" /> Lỗi {{ failedCount }} đơn · Gửi lại
        </button>
        <select
          :value="printMode"
          @change="setPrintMode($event.target.value)"
          class="label-size-select"
          title="Chế độ in tem"
        >
          <option value="bridge">APK Bridge (Android)</option>
          <option value="rawbt">RawBT (Android USB)</option>
          <option value="webusb">WebUSB</option>
          <option value="chrome">In qua Chrome</option>
        </select>
        <a
          v-if="printMode === 'bridge'"
          href="/download/raumamix-printer.apk"
          class="btn btn-outline btn-sm"
          style="text-decoration: none"
          title="Tải file APK cài lên máy FABiBox"
        >
          Tải APK
        </a>
        <button
          v-if="printMode === 'webusb' && webUsbAvailable"
          class="btn btn-sm"
          :class="usbPrinterName ? 'btn-primary' : 'btn-outline'"
          @click="handleConnectUsb"
          title="Kết nối trực tiếp máy in tem USB ITP3300"
        >
          <Usb :size="14" />
          {{ usbPrinterName ? `USB: ${usbPrinterName}` : 'Kết nối máy in USB' }}
        </button>
        <select
          v-if="printMode === 'bridge' || (printMode === 'webusb' && usbPrinterName)"
          :value="usbProtocol"
          @change="setUsbProtocol($event.target.value)"
          class="label-size-select"
          title="Chuẩn lệnh máy in"
        >
          <option value="escpos">ESC/POS (ITP3300)</option>
          <option value="tspl">TSPL (Tem nhãn)</option>
        </select>
        <button
          v-if="printMode === 'bridge' || printMode === 'rawbt' || (printMode === 'webusb' && usbPrinterName)"
          class="btn btn-sm"
          :class="rotate180 ? 'btn-primary' : 'btn-outline'"
          @click="toggleRotate180"
          title="Đảo chiều chữ 180°"
        >
          Xoay 180°
        </button>
        <button
          v-if="printMode === 'bridge' || printMode === 'rawbt' || (printMode === 'webusb' && usbPrinterName)"
          class="btn btn-outline btn-sm"
          @click="handleTestPrint"
          title="In thử 1 tem"
        >
          <Printer :size="14" /> Test
        </button>
        <select :value="labelSize" @change="setLabelSize($event.target.value)" class="label-size-select">
          <option value="40x30">40×30mm</option>
          <option value="50x30">50×30mm</option>
        </select>
        <button
          v-if="currentUser.role === 'admin' || currentUser.role === 'superadmin'"
          class="btn btn-outline btn-sm"
          @click="goAdmin"
          title="Mở trang Quản trị"
        >
          <ShieldCheck :size="14" /> Quản trị
        </button>
        <button
          class="btn btn-danger-soft btn-sm"
          @click="handlePosLogout"
          :title="`Đăng xuất (${currentUser.username})`"
        >
          <LogOut :size="14" /> {{ currentUser.username }}
        </button>
      </div>
    </header>

    <PosView
      v-if="activeTab === 'pos'"
      :categories="categories"
      :sizes="sizes"
      :products="products"
      :toppings="toppings"
      :current-shift="currentShift"
      :menu-loading="menuLoading"
      :shift-loading="shiftLoading && !currentShift"
      @order-created="handleOrderCreated"
      @open-shift="openShiftModal"
    />
    <RevenueView
      v-else
      @reprint-order="handleReprintOrder"
      @order-cancelled="loadCurrentShift"
    />
  </div>

  <ShiftModal
    :show="showShiftModal"
    :current-shift="currentShift"
    :refreshing="shiftLoading"
    @close="showShiftModal = false"
    @updated="handleShiftUpdated"
    @refresh="loadCurrentShift"
  />

  <LabelPrinter
    :order="activePrintOrder"
    :label-size="labelSize"
    :show-preview="showLabelPreview"
    @close="showLabelPreview = false"
    @print="printFromPreview"
  />
  </template>
</template>
