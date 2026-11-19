<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { ShoppingBag, BarChart3, Usb, Printer } from 'lucide-vue-next';
import { api, formatVnd } from './api.js';
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
import LabelPrinter from './components/LabelPrinter.vue';
import ShiftModal from './components/ShiftModal.vue';

const activeTab = ref('pos');
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
  menuLoading.value = true;
  try {
    const res = await api.getMenu();
    categories.value = res.categories || [];
    sizes.value = res.sizes || [];
    products.value = res.products || [];
    toppings.value = res.toppings || [];
  } catch (err) {
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
  loadCurrentShift();
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
  loadMenu();
  loadCurrentShift();
  await autoReconnectUsbPrinter();
  usbPrinterName.value = getConnectedPrinterName();
});
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="brand">
        <div class="brand-badge">RM</div>
        <span>Rau Má Mix POS</span>
      </div>

      <nav class="nav-tabs">
        <button class="nav-tab" :class="{ active: activeTab === 'pos' }" @click="activeTab = 'pos'">
          <ShoppingBag :size="16" /> Bấm đơn
        </button>
        <button class="nav-tab" :class="{ active: activeTab === 'revenue' }" @click="activeTab = 'revenue'">
          <BarChart3 :size="16" /> Doanh thu
        </button>
      </nav>

      <div class="topbar-right">
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
