<script setup>
import { ref, computed, onMounted } from 'vue';
import { Printer, RefreshCw, Ban, Loader2, Calendar } from 'lucide-vue-next';
import { api, formatVnd, getTodayStr, groupOrdersByShift } from '../api.js';

const emit = defineEmits(['reprint-order', 'order-cancelled']);

const todayStr = ref(getTodayStr());
const selectedShiftId = ref('');
const loading = ref(false);
const cancellingId = ref('');
const busy = computed(() => loading.value || Boolean(cancellingId.value));
const todayDisplay = computed(() => {
  const [y, m, d] = todayStr.value.split('-');
  return `${d}/${m}/${y}`;
});
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
  todayStr.value = getTodayStr();
  loading.value = true;
  try {
    const res = await api.getRevenue(todayStr.value, todayStr.value, selectedShiftId.value);
    if (seq === revenueSeq) data.value = res;
  } catch (err) {
    if (seq === revenueSeq) alert(err.message);
  } finally {
    if (seq === revenueSeq) loading.value = false;
  }
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

const groupedOrders = computed(() => groupOrdersByShift(data.value.orders, data.value.shifts));

onMounted(loadRevenue);
</script>

<template>
  <div class="page-container">
    <!-- Filter Bar (Chỉ xem trong ngày) -->
    <div class="panel card-pad" style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: space-between; align-items: center">
      <div style="display: flex; align-items: center; gap: 8px">
        <span class="pill active" style="display: inline-flex; align-items: center; gap: 6px; cursor: default">
          <Calendar :size="14" /> Doanh thu hôm nay · {{ todayDisplay }}
        </span>
      </div>

      <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center">
        <select v-model="selectedShiftId" class="input-sm" style="width: auto; max-width: 260px" :disabled="busy" @change="loadRevenue">
          <option value="">Tất cả các ca hôm nay</option>
          <option v-for="s in data.shifts || []" :key="s.id" :value="s.id">
            {{ formatShiftLabel(s) }}
          </option>
        </select>
        <button class="btn btn-primary btn-sm" @click="loadRevenue" :disabled="busy">
          <Loader2 v-if="loading" :size="14" class="spin" />
          <RefreshCw v-else :size="14" />
          {{ loading ? 'Đang tải...' : 'Làm mới' }}
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
            <template v-for="group in groupedOrders" :key="group.key">
              <tr style="background: #f8fafc">
                <td colspan="7" style="padding: 8px 12px; border-top: 2px solid var(--border)">
                  <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px">
                    <div style="display: flex; align-items: center; gap: 8px; font-size: 13px">
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
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Khoảng đệm bottom giúp vuốt cuộn xem hết báo cáo & đơn hàng trên máy POS -->
    <div style="height: 120px; flex-shrink: 0;" aria-hidden="true"></div>
  </div>
</template>
