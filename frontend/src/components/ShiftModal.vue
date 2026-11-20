<script setup>
import { ref, computed, watch } from 'vue';
import { X, Play, Lock, Loader2 } from 'lucide-vue-next';
import { api, formatVnd } from '../api.js';

const props = defineProps({
  show: Boolean,
  currentShift: Object,
  refreshing: Boolean
});

const emit = defineEmits(['close', 'updated', 'refresh']);

const SHIFT_PRESETS = ['Ca sáng', 'Ca chiều', 'Ca tối'];

// Open shift form
const shiftName = ref('Ca sáng');
const openedBy = ref('');
const openingCash = ref(0);

// Close shift form
const closedBy = ref('');
const actualCash = ref('');
const closeError = ref('');
const note = ref('');
const submitting = ref(false);

const isClosing = computed(() => Boolean(props.currentShift));

// Reset form khi mở modal hoặc đổi sang ca khác
watch(
  () => [props.show, props.currentShift?.id],
  ([visible]) => {
    if (!visible) return;
    closeError.value = '';
    const shift = props.currentShift;
    if (shift) {
      actualCash.value = '';
      closedBy.value = shift.openedBy || '';
      note.value = '';
    } else {
      const hour = new Date().getHours();
      shiftName.value = hour < 12 ? 'Ca sáng' : hour < 18 ? 'Ca chiều' : 'Ca tối';
      openingCash.value = 0;
    }
  },
  { immediate: true }
);

function closeModal() {
  if (submitting.value) return;
  emit('close');
}

const hasActualCash = computed(() => {
  return actualCash.value !== '' && actualCash.value !== null && actualCash.value !== undefined && !Number.isNaN(Number(actualCash.value));
});

const cashDiff = computed(() => {
  if (!props.currentShift || !hasActualCash.value) return 0;
  return Number(actualCash.value) - (Number(props.currentShift.expectedCash) || 0);
});

const cashSales = computed(() => {
  return Number(props.currentShift?.cashSales ?? props.currentShift?.byPaymentMethod?.['Tiền mặt'] ?? 0);
});

const transferSales = computed(() => {
  return Number(props.currentShift?.byPaymentMethod?.['Chuyển khoản'] || 0);
});

const appSales = computed(() => {
  return Number(props.currentShift?.byPaymentMethod?.['App giao hàng'] || 0);
});

const appBreakdown = computed(() => {
  const byType = props.currentShift?.byOrderType || {};
  return ['Shopee', 'Grab', 'Be', 'Xanh']
    .map((name) => ({ name, amount: Number(byType[name] || 0) }))
    .filter((item) => item.amount > 0);
});

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

async function handleOpenShift() {
  if (submitting.value) return;
  submitting.value = true;
  try {
    const res = await api.openShift({
      shiftName: shiftName.value.trim() || 'Ca sáng',
      openedBy: openedBy.value.trim(),
      openingCash: Number(openingCash.value) || 0
    });
    emit('updated', res.shift);
    emit('close');
  } catch (err) {
    alert(err.message);
    // VD: máy khác đã mở ca → tải lại trạng thái để chuyển sang chế độ chốt ca
    emit('refresh');
  } finally {
    submitting.value = false;
  }
}

async function handleCloseShift() {
  if (submitting.value || props.refreshing || !props.currentShift) return;
  closeError.value = '';
  if (!hasActualCash.value || Number(actualCash.value) < 0) {
    closeError.value = 'Vui lòng nhập số tiền mặt thực tế đếm được trong két';
    return;
  }
  if (!confirm(`Xác nhận chốt và đóng "${props.currentShift.shiftName}"?`)) return;
  submitting.value = true;
  try {
    await api.closeShift({
      id: props.currentShift.id,
      closedBy: closedBy.value.trim(),
      actualCash: Number(actualCash.value),
      note: note.value.trim()
    });
    emit('updated', null);
    emit('close');
  } catch (err) {
    closeError.value = err.message;
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div v-if="show" class="modal-backdrop" @click.self="closeModal">
    <div class="modal" style="max-width: 480px; width: 95%">
      <div class="modal-header">
        <h3>{{ isClosing ? `Chốt ca: ${currentShift.shiftName}` : 'Mở ca làm việc' }}</h3>
        <button class="btn btn-outline btn-sm" :disabled="submitting" @click="closeModal">
          <X :size="16" />
        </button>
      </div>

      <!-- OPEN SHIFT MODE -->
      <div v-if="!isClosing" style="display: flex; flex-direction: column; gap: 14px; padding-top: 8px">
        <div>
          <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px">Tên ca</label>
          <div class="cat-pills" style="margin-bottom: 8px">
            <button
              v-for="preset in SHIFT_PRESETS"
              :key="preset"
              type="button"
              class="pill"
              :class="{ active: shiftName === preset }"
              @click="shiftName = preset"
            >
              {{ preset }}
            </button>
          </div>
          <input v-model="shiftName" class="input-sm" placeholder="Hoặc nhập tên ca khác..." />
        </div>

        <div>
          <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px">Nhân viên mở ca (tuỳ chọn)</label>
          <input v-model="openedBy" class="input-sm" placeholder="VD: Lan, Minh..." />
        </div>

        <div>
          <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px">Tiền đầu ca trong két (đ)</label>
          <input v-model.number="openingCash" type="number" min="0" step="1000" class="input-sm" />
        </div>

        <button class="btn btn-primary" :disabled="submitting" @click="handleOpenShift">
          <Loader2 v-if="submitting" :size="16" class="spin" />
          <Play v-else :size="16" />
          {{ submitting ? 'Đang mở ca...' : 'Bắt đầu ca làm' }}
        </button>
      </div>

      <!-- CLOSE SHIFT MODE -->
      <div v-else style="display: flex; flex-direction: column; gap: 12px; padding-top: 8px">
        <div
          v-if="refreshing"
          style="font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 6px"
        >
          <Loader2 :size="14" class="spin" /> Đang cập nhật số liệu mới nhất của ca...
        </div>
        <div
          :class="{ 'is-loading': refreshing }"
          style="background: var(--bg-soft, #f8fafc); border: 1px solid var(--border); border-radius: 10px; padding: 12px; font-size: 13px; display: flex; flex-direction: column; gap: 6px"
        >
          <div class="summary-line">
            <span>Giờ mở ca</span>
            <b>{{ formatTime(currentShift.openedAt) }}</b>
          </div>
          <div v-if="currentShift.openedBy" class="summary-line">
            <span>Người mở ca</span>
            <b>{{ currentShift.openedBy }}</b>
          </div>
          <div class="summary-line">
            <span>Số đơn thành công</span>
            <b>{{ currentShift.totalOrders }} đơn <span v-if="currentShift.cancelledOrders" style="color: var(--text-muted)">(hủy: {{ currentShift.cancelledOrders }})</span></b>
          </div>
          <div class="summary-line" style="font-size: 15px; color: var(--primary)">
            <span>Tổng doanh thu ca</span>
            <b>{{ formatVnd(currentShift.totalRevenue) }}</b>
          </div>
        </div>

        <div style="border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; font-size: 13px; display: flex; flex-direction: column; gap: 6px">
          <div style="font-weight: 600; margin-bottom: 2px">Tiền mặt vào két</div>
          <div class="summary-line">
            <span>Tiền đầu ca</span>
            <span>{{ formatVnd(currentShift.openingCash) }}</span>
          </div>
          <div class="summary-line">
            <span>Mang về · Tiền mặt</span>
            <span>+ {{ formatVnd(cashSales) }}</span>
          </div>
          <div class="summary-line" style="font-weight: 700; border-top: 1px dashed var(--border); padding-top: 6px">
            <span>Tiền mặt dự kiến trong két</span>
            <span style="color: var(--primary)">{{ formatVnd(currentShift.expectedCash) }}</span>
          </div>
        </div>

        <div
          v-if="transferSales > 0 || appSales > 0"
          style="border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; font-size: 13px; display: flex; flex-direction: column; gap: 6px; background: #f8fafc"
        >
          <div style="font-weight: 600; margin-bottom: 2px">Tiền không vào két (đối chiếu)</div>
          <div v-if="transferSales > 0" class="summary-line">
            <span>Mang về · Chuyển khoản</span>
            <b>{{ formatVnd(transferSales) }}</b>
          </div>
          <div v-if="appSales > 0" class="summary-line">
            <span>App giao hàng</span>
            <b>{{ formatVnd(appSales) }}</b>
          </div>
          <div
            v-for="app in appBreakdown"
            :key="app.name"
            class="summary-line"
            style="font-size: 12px; color: var(--text-muted); padding-left: 10px"
          >
            <span>↳ {{ app.name }}</span>
            <span>{{ formatVnd(app.amount) }}</span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px">
          <div>
            <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px">
              Tiền mặt thực tế đếm được <span style="color: #dc2626">*</span>
            </label>
            <input
              v-model.number="actualCash"
              type="number"
              min="0"
              step="1000"
              required
              placeholder="Nhập tiền thực tế..."
              class="input-sm"
              :disabled="submitting"
              @input="closeError = ''"
            />
            <div
              v-if="hasActualCash"
              style="font-size: 12px; margin-top: 4px; font-weight: 600"
              :style="{ color: cashDiff === 0 ? '#16a34a' : cashDiff > 0 ? '#0284c7' : '#dc2626' }"
            >
              Chênh lệch: {{ cashDiff > 0 ? '+' : '' }}{{ formatVnd(cashDiff) }}
            </div>
            <div v-else style="font-size: 11px; margin-top: 4px; color: var(--text-muted)">
              Bắt buộc nhập trước khi chốt ca
            </div>
          </div>
          <div>
            <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px">Người chốt ca</label>
            <input v-model="closedBy" class="input-sm" placeholder="Tên nhân viên..." />
          </div>
        </div>

        <div v-if="closeError" class="admin-error-box" style="margin: 0">
          {{ closeError }}
        </div>

        <div>
          <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px">Ghi chú bàn giao (tuỳ chọn)</label>
          <input v-model="note" class="input-sm" placeholder="VD: Đã cất tiền két, thiếu đá..." />
        </div>

        <button
          class="btn btn-danger-soft"
          style="font-weight: 700; padding: 10px"
          :disabled="submitting || refreshing"
          @click="handleCloseShift"
        >
          <Loader2 v-if="submitting || refreshing" :size="16" class="spin" />
          <Lock v-else :size="16" />
          {{ submitting ? 'Đang chốt ca...' : refreshing ? 'Đang tải số liệu ca...' : 'Xác nhận chốt & đóng ca' }}
        </button>
      </div>
    </div>
  </div>
</template>
