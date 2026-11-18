<script setup>
import { computed } from 'vue';
import { Printer, X } from 'lucide-vue-next';

const props = defineProps({
  order: { type: Object, default: null },
  labelSize: { type: String, default: '50x30' },
  showPreview: { type: Boolean, default: false }
});

const emit = defineEmits(['close', 'print']);

const stickers = computed(() => {
  if (!props.order) return [];
  const list = [];
  for (const item of props.order.items || []) {
    const qty = Number(item.quantity) || 1;
    for (let i = 0; i < qty; i++) {
      list.push({
        productName: item.productName,
        size: item.size,
        sugar: item.sugar,
        ice: item.ice,
        toppings: item.toppings || [],
        note: item.note || ''
      });
    }
  }
  const total = list.length;
  return list.map((s, idx) => ({
    ...s,
    indexText: `${idx + 1}/${total}`
  }));
});

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}
</script>

<template>
  <!-- Hidden print-only DOM -->
  <Teleport to="body">
    <div id="print-area" v-if="order">
      <div
        v-for="(st, idx) in stickers"
        :key="idx"
        class="sticker-label"
        :class="{ 'size-40x30': labelSize === '40x30' }"
      >
        <div class="st-head">
          <span>RAU MÁ MIX</span>
          <span>{{ order.orderCode }} ({{ st.indexText }})</span>
        </div>
        <div class="st-name">{{ st.productName }} ({{ st.size }})</div>
        <div class="st-opts">
          <div>{{ st.sugar }} đường · {{ st.ice }} đá</div>
          <div v-if="st.toppings.length">+ {{ st.toppings.map((t) => t.name).join(', ') }}</div>
          <div v-if="st.note">Ghi chú: {{ st.note }}</div>
        </div>
        <div class="st-foot">
          <span>{{ order.orderType }}</span>
          <span>{{ formatTime(order.createdAt) }}</span>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Preview Modal -->
  <div v-if="showPreview && order" class="modal-backdrop" @click.self="emit('close')">
    <div class="modal" style="max-width: 560px">
      <div class="modal-header">
        <h3>Xem trước tem ({{ order.orderCode }} · {{ stickers.length }} tem)</h3>
        <button class="btn btn-outline btn-sm" @click="emit('close')">
          <X :size="16" />
        </button>
      </div>

      <div class="sticker-preview-list">
        <div
          v-for="(st, idx) in stickers"
          :key="idx"
          class="sticker-label"
          :class="{ 'size-40x30': labelSize === '40x30' }"
        >
          <div class="st-head">
            <span>RAU MÁ MIX</span>
            <span>{{ order.orderCode }} ({{ st.indexText }})</span>
          </div>
          <div class="st-name">{{ st.productName }} ({{ st.size }})</div>
          <div class="st-opts">
            <div>{{ st.sugar }} đường · {{ st.ice }} đá</div>
            <div v-if="st.toppings.length">+ {{ st.toppings.map((t) => t.name).join(', ') }}</div>
            <div v-if="st.note">Ghi chú: {{ st.note }}</div>
          </div>
          <div class="st-foot">
            <span>{{ order.orderType }}</span>
            <span>{{ formatTime(order.createdAt) }}</span>
          </div>
        </div>
      </div>

      <div style="font-size: 12px; color: var(--text-muted)">
        Mẹo: Khi bấm in trên Chrome, chọn máy in tem, khổ giấy <b>{{ labelSize }}mm</b> và tắt lề (Margins: None).
      </div>

      <div style="display: flex; gap: 10px; justify-content: flex-end">
        <button class="btn btn-outline" @click="emit('close')">Đóng</button>
        <button class="btn btn-primary" @click="emit('print')">
          <Printer :size="16" /> In {{ stickers.length }} tem ngay
        </button>
      </div>
    </div>
  </div>
</template>
