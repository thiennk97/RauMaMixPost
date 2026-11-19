<script setup>
import { ref, computed, onMounted } from 'vue';
import { Printer, RefreshCw, Ban, Loader2 } from 'lucide-vue-next';
import { api, formatVnd, getTodayStr, shiftDateStr } from '../api.js';

const emit = defineEmits(['reprint-order', 'order-cancelled']);

const fromDate = ref(getTodayStr());
const toDate = ref(getTodayStr());
const preset = ref('today');
const selectedShiftId = ref('');
const loading = ref(false);
const cancellingId = ref('');
const busy = computed(() => loading.value || Boolean(cancellingId.value));
const data = ref({
  totalRevenue: 0,
  orderCount: 0,
  cancelledCount: 0,
  totalCups: 0,
  avgOrderValue: 0,
  byPaymentMethod: {},
  byOrderType: {},
  topProducts: [],
  orders: [],
  shifts: []
});

// Chỉ áp dụng kết quả của lần lọc mới nhất
let revenueSeq = 0;

async function loadRevenue() {
  const seq = ++revenueSeq;
  loading.value = true;
  try {
    const res = await api.getRevenue(fromDate.value, toDate.value, selectedShiftId.value);
    if (seq === revenueSeq) data.value = res;
  } catch (err) {
    if (seq === revenueSeq) alert(err.message);
  } finally {
    if (seq === revenueSeq) loading.value = false;
  }
}

function applyPreset(key) {
  if (busy.value) return;
  preset.value = key;
  selectedShiftId.value = '';
  const today = getTodayStr();
  if (key === 'today') {
    fromDate.value = today;
    toDate.value = today;
  } else if (key === '7d') {
    fromDate.value = shiftDateStr(-6);
    toDate.value = today;
  } else if (key === '30d') {
    fromDate.value = shiftDateStr(-29);
    toDate.value = today;
  }
  loadRevenue();
}

function toggleShiftFilter(shiftId) {
  if (busy.value) return;
  selectedShiftId.value = selectedShiftId.value === shiftId ? '' : shiftId;
  loadRevenue();
}

function formatShiftLabel(s) {
  const start = s.openedAt ? new Date(s.openedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
  const end = s.closedAt ? new Date(s.closedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'đang mở';
  return `${s.shiftName} (${s.dateKey} · ${start}-${end}) · ${formatVnd(s.totalRevenue)}`;
}

async function cancelOrder(order) {
  if (busy.value) return;
  if (!confirm(`Xác nhận hủy đơn ${order.orderCode} (${formatVnd(order.total)})?`)) return;
  cancellingId.value = order.id;
  try {
    await api.cancelOrder(order.id);
    // Cập nhật ngay trên giao diện, tránh bấm hủy lần 2 trong lúc tải lại
    order.status = 'cancelled';
    emit('order-cancelled');
  } catch (err) {
    alert(err.message);
  } finally {
    cancellingId.value = '';
  }
  await loadRevenue();
}

function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

onMounted(loadRevenue);
</script>

<template>
  <div class="page-container">
    <!-- Filter Bar -->
    <div class="panel card-pad" style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: space-between; align-items: center">
      <div class="cat-pills">
        <button class="pill" :class="{ active: preset === 'today' }" :disabled="busy" @click="applyPreset('today')">Hôm nay</button>
        <button class="pill" :class="{ active: preset === '7d' }" :disabled="busy" @click="applyPreset('7d')">7 ngày</button>
        <button class="pill" :class="{ active: preset === '30d' }" :disabled="busy" @click="applyPreset('30d')">30 ngày</button>
      </div>

      <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center">
        <select v-model="selectedShiftId" class="input-sm" style="width: auto; max-width: 260px" :disabled="busy" @change="loadRevenue">
          <option value="">Tất cả các ca (cả ngày)</option>
          <option v-for="s in data.shifts || []" :key="s.id" :value="s.id">
            {{ formatShiftLabel(s) }}
          </option>
        </select>
        <input v-model="fromDate" type="date" class="input-sm" style="width: auto" :disabled="busy" @change="preset = 'custom'; selectedShiftId = ''" />
        <span>→</span>
        <input v-model="toDate" type="date" class="input-sm" style="width: auto" :disabled="busy" @change="preset = 'custom'; selectedShiftId = ''" />
        <button class="btn btn-primary btn-sm" @click="loadRevenue" :disabled="busy">
          <Loader2 v-if="loading" :size="14" class="spin" />
          <RefreshCw v-else :size="14" />
          {{ loading ? 'Đang tải...' : 'Xem' }}
        </button>
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="kpi-grid" :class="{ 'is-loading': loading }">
      <div class="kpi-card">
        <div class="kpi-label">Tổng doanh thu</div>
        <div class="kpi-value green">{{ formatVnd(data.totalRevenue) }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Số đơn thành công</div>
        <div class="kpi-value">{{ data.orderCount }} <span style="font-size: 13px; color: var(--text-muted)">(hủy: {{ data.cancelledCount }})</span></div>
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

    <!-- Breakdown -->
    <div class="two-col" :class="{ 'is-loading': loading }">
      <div class="panel card-pad">
        <h3 style="margin: 0 0 12px; font-size: 15px">Theo thanh toán & kênh bán</h3>
        <div style="display: flex; flex-direction: column; gap: 8px; font-size: 14px">
          <div v-for="(val, key) in data.byPaymentMethod" :key="key" class="summary-line">
            <span>{{ key }}</span>
            <b>{{ formatVnd(val) }}</b>
          </div>
          <hr style="border: none; border-top: 1px solid var(--border); margin: 4px 0" />
          <div v-for="(val, key) in data.byOrderType" :key="key" class="summary-line">
            <span>{{ key }}</span>
            <b>{{ formatVnd(val) }}</b>
          </div>
          <div v-if="!data.orderCount" style="color: var(--text-muted)">Chưa có dữ liệu trong khoảng ngày này.</div>
        </div>
      </div>

      <div class="panel card-pad">
        <h3 style="margin: 0 0 12px; font-size: 15px">Top món bán chạy</h3>
        <div v-if="!data.topProducts.length" style="color: var(--text-muted); font-size: 14px">
          Chưa có món nào được bán.
        </div>
        <div v-else style="display: flex; flex-direction: column; gap: 8px; font-size: 14px">
          <div v-for="p in data.topProducts.slice(0, 6)" :key="p.name" class="summary-line">
            <span>{{ p.name }} <b style="color: var(--primary)">({{ p.quantity }} ly)</b></span>
            <b>{{ formatVnd(p.revenue) }}</b>
          </div>
        </div>
      </div>
    </div>

    <!-- Shifts Summary Table -->
    <div v-if="(data.shifts || []).length" class="panel card-pad" :class="{ 'is-loading': busy }">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
        <h3 style="margin: 0; font-size: 15px">Ca làm việc ({{ data.shifts.length }})</h3>
        <button v-if="selectedShiftId" class="btn btn-outline btn-sm" @click="toggleShiftFilter(selectedShiftId)">
          Xem tất cả ca
        </button>
      </div>
      <div class="table-wrap" :style="loading ? { opacity: 0.55 } : {}">
        <table>
          <thead>
            <tr>
              <th>Ca</th>
              <th>Giờ mở - đóng</th>
              <th>Nhân viên</th>
              <th>Số đơn</th>
              <th>Doanh thu</th>
              <th>Tiền mặt thực / dự kiến</th>
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
              title="Bấm để lọc doanh thu theo ca này"
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

    <!-- Orders Table -->
    <div class="panel card-pad">
      <h3 style="margin: 0 0 12px; font-size: 15px">Danh sách đơn hàng ({{ data.orders.length }})</h3>
      <div class="table-wrap" :style="loading ? { opacity: 0.55 } : {}">
        <table>
          <thead>
            <tr>
              <th>Mã đơn</th>
              <th>Thời gian</th>
              <th>Chi tiết món</th>
              <th>Kênh / TT</th>
              <th>Tổng tiền</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!data.orders.length">
              <td colspan="7" style="text-align: center; color: var(--text-muted)">Chưa có đơn hàng nào.</td>
            </tr>
            <tr v-for="o in data.orders" :key="o.id">
              <td><b>{{ o.orderCode }}</b></td>
              <td>{{ formatDateTime(o.createdAt) }}</td>
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
              <td>
                <div style="display: flex; gap: 6px">
                  <button class="btn btn-outline btn-sm" @click="emit('reprint-order', o)" title="Xem & In lại tem">
                    <Printer :size="14" /> Tem
                  </button>
                  <button
                    v-if="o.status !== 'cancelled'"
                    class="btn btn-danger-soft btn-sm"
                    :disabled="busy"
                    @click="cancelOrder(o)"
                    title="Hủy đơn (không tính vào doanh thu)"
                  >
                    <Loader2 v-if="cancellingId === o.id" :size="14" class="spin" />
                    <Ban v-else :size="14" />
                    {{ cancellingId === o.id ? 'Đang hủy...' : 'Hủy đơn' }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
