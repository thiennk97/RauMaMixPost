<script setup>
import { ref, computed } from 'vue';
import { Search, Plus, Minus, Trash2, Printer, CheckCircle2, X, Play, Lock, Loader2 } from 'lucide-vue-next';
import { formatVnd } from '../api.js';
import { enqueueOrder, generateClientOrderId, nextClientOrderCode } from '../orderQueue.js';

const props = defineProps({
  categories: { type: Array, default: () => [] },
  sizes: { type: Array, default: () => [] },
  products: { type: Array, default: () => [] },
  toppings: { type: Array, default: () => [] },
  currentShift: { type: Object, default: null },
  menuLoading: { type: Boolean, default: false },
  shiftLoading: { type: Boolean, default: false }
});

const emit = defineEmits(['order-created', 'open-shift']);

function formatShortK(amount) {
  const n = Number(amount) || 0;
  if (n >= 1000) {
    const k = n / 1000;
    return `${Number.isInteger(k) ? k : k.toFixed(1).replace(/\.0$/, '')}K`;
  }
  return `${n}đ`;
}

const CHANNELS = [
  { id: 'Mang về', label: 'Mang về', color: '#15803d' },
  { id: 'Shopee', label: 'Shopee', color: '#ee4d2d' },
  { id: 'Grab', label: 'Grab', color: '#00b14f' },
  { id: 'Be', label: 'Be', color: '#eab308' },
  { id: 'Xanh', label: 'Xanh', color: '#0284c7' }
];

const search = ref('');
const selectedCategory = ref('Tất cả');
const orderType = ref('Mang về');
const cartsByChannel = ref({
  'Mang về': [],
  Shopee: [],
  Grab: [],
  Be: [],
  Xanh: []
});
const cart = computed({
  get: () => cartsByChannel.value[orderType.value],
  set: (val) => {
    cartsByChannel.value[orderType.value] = val;
  }
});
const paymentMethod = ref('Tiền mặt');
const cashReceived = ref(0);
const submitting = ref(false);
const toast = ref('');

// Customize modal state
const editingProduct = ref(null);
const optSizeObj = ref(null);
const optSugar = ref('100%');
const optIce = ref('100%');
const optToppings = ref([]);
const optQty = ref(1);
const optNote = ref('');

const SUGAR_OPTS = ['100%', '70%', '50%', '30%', '0%'];
const ICE_OPTS = ['100%', '70%', '50%', '30%', '0%'];

const availableSizes = computed(() =>
  props.sizes.length
    ? props.sizes
    : [
        { id: 'sz-m', name: 'Size M', shortName: 'M', extraPrice: 0 },
        { id: 'sz-l', name: 'Size L', shortName: 'L', extraPrice: 7000 }
      ]
);

const categoryTabs = computed(() => {
  const fromCfg = props.categories.map((c) => c.name);
  const fromProds = props.products.filter((p) => p.active).map((p) => p.category);
  const merged = Array.from(new Set([...fromCfg, ...fromProds]));
  return ['Tất cả', ...merged];
});

const groupedProducts = computed(() => {
  const q = search.value.trim().toLowerCase();
  const activeList = props.products.filter((p) => {
    if (!p.active) return false;
    if (selectedCategory.value !== 'Tất cả' && p.category !== selectedCategory.value) return false;
    if (q && !p.name.toLowerCase().includes(q)) return false;
    return true;
  });

  const orderNames = props.categories.map((c) => c.name);
  const map = new Map();
  for (const catName of orderNames) {
    map.set(catName, []);
  }
  for (const p of activeList) {
    if (!map.has(p.category)) map.set(p.category, []);
    map.get(p.category).push(p);
  }

  return Array.from(map.entries())
    .filter(([, items]) => items.length > 0)
    .map(([category, items]) => ({ category, items }));
});

const cartTotal = computed(() =>
  cart.value.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
);

const totalCups = computed(() =>
  cart.value.reduce((sum, item) => sum + item.quantity, 0)
);

const changeAmount = computed(() => {
  if (paymentMethod.value !== 'Tiền mặt') return 0;
  return Math.max(0, (Number(cashReceived.value) || 0) - cartTotal.value);
});

function isDefaultSizeL(product) {
  if (!product) return false;
  const name = (product.name || '').toLowerCase();
  const cat = (product.category || '').toLowerCase();
  return /\(\s*l\s*\)/i.test(name) || cat.includes('trà bí đao') || name.includes('trà bí đao');
}

const modalSizes = computed(() => {
  if (isDefaultSizeL(editingProduct.value)) {
    return [{ id: 'sz-l-default', name: 'Size L (Mặc định)', shortName: 'L', extraPrice: 0, locked: true }];
  }
  return availableSizes.value;
});

function openCustomize(product) {
  editingProduct.value = product;
  optSizeObj.value = modalSizes.value[0];
  optSugar.value = '100%';
  optIce.value = '100%';
  optToppings.value = [];
  optQty.value = 1;
  optNote.value = '';
}

function toggleTopping(tp) {
  const idx = optToppings.value.findIndex((t) => t.id === tp.id);
  if (idx >= 0) {
    optToppings.value.splice(idx, 1);
  } else {
    optToppings.value.push({ id: tp.id, name: tp.name, price: tp.price });
  }
}

function getProductPrice(product, channel = orderType.value) {
  if (!product) return 0;
  const chPrice = product.channelPrices?.[channel];
  return Number(chPrice != null ? chPrice : product.price || 0);
}

const modalUnitPrice = computed(() => {
  if (!editingProduct.value) return 0;
  const base = getProductPrice(editingProduct.value);
  const sizeExtra = Number(optSizeObj.value?.extraPrice || 0);
  const tpSum = optToppings.value.reduce((s, t) => s + Number(t.price || 0), 0);
  return base + sizeExtra + tpSum;
});

function addCustomizedToCart() {
  if (!editingProduct.value || submitting.value) return;
  const sz = optSizeObj.value || availableSizes.value[0];
  const tpSorted = [...optToppings.value].sort((a, b) => a.id.localeCompare(b.id));
  const key = [
    editingProduct.value.id,
    sz.shortName || sz.name,
    optSugar.value,
    optIce.value,
    tpSorted.map((t) => t.id).join(','),
    optNote.value.trim()
  ].join('|');

  const existing = cart.value.find((c) => c.key === key);
  if (existing) {
    existing.quantity += optQty.value;
  } else {
    cart.value.push({
      key,
      productId: editingProduct.value.id,
      productName: editingProduct.value.name,
      size: sz.shortName || sz.name,
      sizeExtra: Number(sz.extraPrice || 0),
      sugar: optSugar.value,
      ice: optIce.value,
      toppings: tpSorted,
      note: optNote.value.trim(),
      unitPrice: modalUnitPrice.value,
      quantity: optQty.value
    });
  }
  editingProduct.value = null;
}

function changeQty(idx, delta) {
  if (submitting.value) return;
  const item = cart.value[idx];
  item.quantity += delta;
  if (item.quantity <= 0) {
    cart.value.splice(idx, 1);
  }
}

function clearCart() {
  if (submitting.value) return;
  cart.value = [];
  cashReceived.value = 0;
}

function submitOrder(shouldPrint = true) {
  if (!cart.value.length || submitting.value || props.shiftLoading) return;
  if (!props.currentShift) {
    emit('open-shift');
    return;
  }
  submitting.value = true;
  const channel = orderType.value;
  const submittedItems = cart.value.map((it) => ({ ...it }));
  const total = cartTotal.value;
  const pm = paymentMethod.value;
  const cash = pm === 'Tiền mặt' && cashReceived.value > 0 ? cashReceived.value : total;
  const nowIso = new Date().toISOString();

  const order = {
    id: generateClientOrderId(),
    orderCode: nextClientOrderCode(props.currentShift),
    createdAt: nowIso,
    orderType: channel,
    paymentMethod: pm,
    items: submittedItems,
    total,
    cashReceived: cash,
    status: 'completed',
    shiftId: props.currentShift.id
  };

  // Xóa giỏ & in tem ngay lập tức, không chờ Google Sheet
  cartsByChannel.value[channel] = [];
  if (channel === orderType.value) cashReceived.value = 0;
  toast.value = `Đã tạo đơn ${order.orderCode} (${formatVnd(order.total)})`;
  setTimeout(() => { toast.value = ''; }, 3000);
  emit('order-created', { order, shouldPrint });

  // Lưu ngầm lên Backend / Google Sheet (có tự động thử lại nếu lỗi mạng)
  enqueueOrder({
    id: order.id,
    orderCode: order.orderCode,
    createdAt: order.createdAt,
    items: submittedItems,
    orderType: channel,
    paymentMethod: pm,
    cashReceived: cash
  });

  // Chống chạm đúp cảm ứng (300ms)
  setTimeout(() => { submitting.value = false; }, 300);
}
</script>

<template>
  <div class="pos-layout">
    <!-- Menu Grouped by Category -->
    <section class="panel menu-panel">
      <!-- Sales Channels Bar -->
      <div class="channel-bar">
        <button
          v-for="ch in CHANNELS"
          :key="ch.id"
          class="channel-tab"
          :class="{ active: orderType === ch.id }"
          :style="orderType === ch.id ? { background: ch.color, borderColor: ch.color, color: ch.id === 'Be' ? '#111' : '#fff' } : {}"
          @click="orderType = ch.id"
        >
          <span>{{ ch.label }}</span>
          <span
            v-if="cartsByChannel[ch.id].length"
            class="channel-badge"
          >
            {{ cartsByChannel[ch.id].reduce((s, i) => s + i.quantity, 0) }}
          </span>
        </button>
      </div>

      <div class="menu-toolbar">
        <div class="cat-pills">
          <button
            v-for="cat in categoryTabs"
            :key="cat"
            class="pill"
            :class="{ active: selectedCategory === cat }"
            @click="selectedCategory = cat"
          >
            {{ cat }}
          </button>
        </div>

        <div class="search-box">
          <Search :size="16" class="search-icon" />
          <input v-model="search" type="text" placeholder="Tìm món nhanh..." />
        </div>
      </div>

      <div v-if="toast" class="badge badge-ok" style="padding: 8px 12px; font-size: 13px">
        <CheckCircle2 :size="14" style="vertical-align: middle; margin-right: 4px" />
        {{ toast }}
      </div>

      <div v-if="menuLoading && !products.length" class="cart-empty">
        <Loader2 :size="20" class="spin" style="vertical-align: middle; margin-right: 6px" />
        Đang tải menu...
      </div>

      <div v-else-if="!groupedProducts.length" class="cart-empty">
        Không tìm thấy món nào phù hợp.
      </div>

      <div v-else class="category-groups">
        <div v-for="group in groupedProducts" :key="group.category">
          <h3 class="category-section-title">
            <span>{{ group.category }}</span>
            <span class="category-count">{{ group.items.length }}</span>
          </h3>

          <div class="product-grid">
            <button
              v-for="product in group.items"
              :key="product.id"
              class="product-card"
              @click="openCustomize(product)"
            >
              <div>
                <div class="product-name">{{ product.name }}</div>
              </div>
              <div class="product-prices">
                <span>{{ formatVnd(getProductPrice(product)) }}</span>
                <span class="qty-btn" title="Chọn Size & Topping">
                  <Plus :size="14" />
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- Khoảng đệm bottom giúp vuốt cuộn xem hết món trên máy POS -->
      <div style="height: 100px; flex-shrink: 0;" aria-hidden="true"></div>
    </section>

    <!-- Cart Panel -->
    <aside class="panel cart-panel">
      <div
        style="padding: 10px 14px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; gap: 8px"
        :style="currentShift ? { background: '#f0fdf4' } : { background: '#fef3c7' }"
      >
        <div style="font-size: 13px; font-weight: 600" :style="currentShift ? { color: '#166534' } : { color: '#92400e' }">
          <template v-if="shiftLoading && !currentShift">
            <Loader2 :size="14" class="spin" style="vertical-align: middle; margin-right: 4px" />
            Đang kiểm tra ca...
          </template>
          <template v-else-if="currentShift">
            {{ currentShift.shiftName }} · {{ formatVnd(currentShift.totalRevenue) }} ({{ currentShift.totalOrders }} đơn)
          </template>
          <template v-else>
            Chưa mở ca làm việc
          </template>
        </div>
        <button
          v-if="!currentShift"
          class="btn btn-primary btn-sm"
          :disabled="shiftLoading"
          @click="emit('open-shift')"
        >
          <Play :size="14" /> Mở ca
        </button>
        <button
          v-else
          class="btn btn-danger-soft btn-sm"
          :disabled="submitting"
          :title="submitting ? 'Đang gửi đơn, vui lòng chờ...' : ''"
          @click="emit('open-shift')"
        >
          <Lock :size="14" /> Chốt ca
        </button>
      </div>

      <div class="cart-header">
        <h2>Đơn {{ orderType }} ({{ totalCups }} ly)</h2>
        <button v-if="cart.length" class="btn btn-outline btn-sm" :disabled="submitting" @click="clearCart">
          Xóa hết
        </button>
      </div>

      <div class="cart-footer" style="border-top: none; border-bottom: 1px solid var(--border)">
        <div class="summary-line">
          <span>Tổng cộng</span>
          <span class="summary-total">{{ formatVnd(cartTotal) }}</span>
        </div>

        <button
          class="btn btn-primary"
          style="width: 100%; padding: 13px 16px; font-size: 16px"
          :disabled="!cart.length || submitting || shiftLoading"
          @click="submitOrder(true)"
        >
          <Loader2 v-if="submitting" :size="20" class="spin" />
          <Printer v-else :size="20" />
          {{ submitting ? 'Đang tạo đơn...' : currentShift ? 'Thanh toán & In tem' : 'Mở ca để thanh toán' }}
        </button>
      </div>

      <div v-if="!cart.length" class="cart-empty">
        Chưa có món nào.<br />Bấm vào món bên trái để chọn Size & Topping.
      </div>

      <div class="cart-items" :class="{ 'is-loading': submitting }" v-if="cart.length">
        <div v-for="(item, idx) in cart" :key="item.key" class="cart-item">
          <div class="cart-item-top">
            <div>
              <div class="cart-item-title">{{ item.productName }} ({{ item.size }})</div>
              <div class="cart-item-meta">
                {{ item.sugar }} đường · {{ item.ice }} đá
                <span v-if="item.toppings.length">
                  · + {{ item.toppings.map((t) => t.name).join(', ') }}
                </span>
                <span v-if="item.note"> · "{{ item.note }}"</span>
              </div>
            </div>
            <button class="qty-btn" @click="cart.splice(idx, 1)" title="Xóa">
              <Trash2 :size="13" />
            </button>
          </div>

          <div class="cart-item-bottom">
            <div class="qty-control">
              <button class="qty-btn" @click="changeQty(idx, -1)"><Minus :size="13" /></button>
              <b>{{ item.quantity }}</b>
              <button class="qty-btn" @click="changeQty(idx, 1)"><Plus :size="13" /></button>
            </div>
            <b>{{ formatVnd(item.unitPrice * item.quantity) }}</b>
          </div>
        </div>
      </div>
    </aside>
  </div>

  <!-- Customize Drink Modal: Size (as modifier) + Topping -->
  <div v-if="editingProduct" class="modal-backdrop" @click.self="editingProduct = null">
    <div class="modal customize-modal">
      <div class="modal-header">
        <div>
          <h3>{{ editingProduct.name }}</h3>
          <div style="font-size: 13.5px; color: var(--text-muted); margin-top: 2px">
            Giá ({{ orderType }}): <b>{{ formatVnd(getProductPrice(editingProduct)) }}</b> · {{ editingProduct.category }}
          </div>
        </div>
        <button class="btn btn-outline customize-close-btn" @click="editingProduct = null">
          <X :size="20" />
        </button>
      </div>

      <div class="option-section">
        <h4>{{ modalSizes[0]?.locked ? 'Size mặc định' : 'Chọn Size' }}</h4>
        <div class="option-chips size-chips">
          <button
            v-for="sz in modalSizes"
            :key="sz.id"
            class="chip"
            :class="{ active: optSizeObj?.id === sz.id }"
            @click="!sz.locked && (optSizeObj = sz)"
          >
            {{ sz.name }} ({{ sz.extraPrice ? '+' + formatShortK(sz.extraPrice) : '+0' }})
          </button>
        </div>
      </div>

      <div class="option-section">
        <h4>Topping thêm</h4>
        <div class="option-chips topping-chips">
          <button
            v-for="tp in toppings"
            :key="tp.id"
            class="chip"
            :class="{ active: optToppings.some((t) => t.id === tp.id) }"
            @click="toggleTopping(tp)"
          >
            {{ tp.name }} (+{{ formatShortK(tp.price) }})
          </button>
        </div>
      </div>

      <div class="option-section">
        <h4>Độ ngọt</h4>
        <div class="option-chips level-chips">
          <button
            v-for="s in SUGAR_OPTS"
            :key="s"
            class="chip"
            :class="{ active: optSugar === s }"
            @click="optSugar = s"
          >
            {{ s }}
          </button>
        </div>
      </div>

      <div class="option-section">
        <h4>Lượng đá</h4>
        <div class="option-chips level-chips">
          <button
            v-for="ice in ICE_OPTS"
            :key="ice"
            class="chip"
            :class="{ active: optIce === ice }"
            @click="optIce = ice"
          >
            {{ ice }}
          </button>
        </div>
      </div>

      <div class="option-section note-section">
        <h4>Ghi chú trên tem</h4>
        <input v-model="optNote" type="text" class="input-sm" placeholder="VD: Ít sữa, để riêng đá..." />
      </div>

      <div class="customize-footer">
        <div class="qty-control customize-qty">
          <button class="qty-btn" @click="optQty = Math.max(1, optQty - 1)"><Minus :size="18" /></button>
          <b style="min-width: 34px; text-align: center; font-size: 18px">{{ optQty }}</b>
          <button class="qty-btn" @click="optQty++"><Plus :size="18" /></button>
        </div>
        <button class="btn btn-primary customize-submit-btn" :disabled="submitting" @click="addCustomizedToCart">
          <template v-if="submitting">
            <Loader2 :size="16" class="spin" /> Đang gửi đơn trước...
          </template>
          <template v-else>Thêm · {{ formatVnd(modalUnitPrice * optQty) }}</template>
        </button>
      </div>
    </div>
  </div>
</template>
