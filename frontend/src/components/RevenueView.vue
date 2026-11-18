<script setup>
import { ref, onMounted } from 'vue';
import { Printer, RefreshCw, Ban } from 'lucide-vue-next';
import { api, formatVnd, getTodayStr, shiftDateStr } from '../api.js';

const emit = defineEmits(['reprint-order']);

const fromDate = ref(getTodayStr());
const toDate = ref(getTodayStr());
const preset = ref('today');
const loading = ref(false);
const data = ref({
  totalRevenue: 0,
  orderCount: 0,
  cancelledCount: 0,
  totalCups: 0,
  avgOrderValue: 0,
  byPaymentMethod: {},
  byOrderType: {},
  topProducts: [],
  orders: []
});

async function loadRevenue() {
  loading.value = true;
  try {
    data.value = await api.getRevenue(fromDate.value, toDate.value);
  } catch (err) {
    alert(err.message);
  } finally {
    loading.value = false;
  }
}

function applyPreset(key) {
  preset.value = key;
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

async function cancelOrder(order) {
  if (!confirm(`Xác nhận hủy đơn ${order.orderCode} (${formatVnd(order.total)})?`)) return;
  try {
    await api.cancelOrder(order.id);
    await loadRevenue();
  } catch (err) {
    alert(err.message);
  }
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
        <button class="pill" :class="{ active: preset === 'today' }" @click="applyPreset('today')">Hôm nay</button>
        <button class="pill" :class="{ active: preset === '7d' }" @click="applyPreset('7d')">7 ngày</button>
        <button class="pill" :class="{ active: preset === '30d' }" @click="applyPreset('30d')">30 ngày</button>
      </div>

      <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center">
        <input v-model="fromDate" type="date" class="input-sm" style="width: auto" @change="preset = 'custom'" />
        <span>→</span>
        <input v-model="toDate" type="date" class="input-sm" style="width: auto" @change="preset = 'custom'" />
        <button class="btn btn-primary btn-sm" @click="loadRevenue" :disabled="loading">
          <RefreshCw :size="14" /> Xem
        </button>
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="kpi-grid">
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
    <div class="two-col">
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

    <!-- Orders Table -->
    <div class="panel card-pad">
      <h3 style="margin: 0 0 12px; font-size: 15px">Danh sách đơn hàng ({{ data.orders.length }})</h3>
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
                    @click="cancelOrder(o)"
                    title="Hủy đơn"
                  >
                    <Ban :size="14" />
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
