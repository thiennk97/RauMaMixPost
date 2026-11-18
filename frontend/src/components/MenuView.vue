<script setup>
import { ref, watch } from 'vue';
import { Plus, Trash2, X } from 'lucide-vue-next';
import { api, formatVnd, getGasUrl, setGasUrl } from '../api.js';

const props = defineProps({
  categories: { type: Array, default: () => [] },
  products: { type: Array, default: () => [] }
});

const emit = defineEmits(['refresh']);

const gasUrlInput = ref(getGasUrl());
const newCatName = ref('');
const name = ref('');
const category = ref('');
const price = ref(25000);
const saving = ref(false);

function saveGasConnection() {
  setGasUrl(gasUrlInput.value);
  emit('refresh');
  alert(gasUrlInput.value.trim() ? 'Đã nối sang Google Sheet!' : 'Đã chuyển về DB local!');
}

watch(
  () => props.categories,
  (cats) => {
    if (!category.value && cats.length) {
      category.value = cats[0].name;
    }
  },
  { immediate: true }
);

async function addCategory() {
  if (!newCatName.value.trim()) return;
  try {
    await api.createCategory(newCatName.value.trim());
    newCatName.value = '';
    emit('refresh');
  } catch (err) {
    alert(err.message);
  }
}

async function removeCategory(cat) {
  if (!confirm(`Xóa nhóm "${cat.name}"?`)) return;
  try {
    await api.deleteCategory(cat.id);
    emit('refresh');
  } catch (err) {
    alert(err.message);
  }
}

async function addProduct() {
  if (!name.value.trim() || saving.value) return;
  saving.value = true;
  try {
    await api.createProduct({
      name: name.value,
      category: category.value || 'Rau Má Mix',
      price: price.value
    });
    name.value = '';
    emit('refresh');
  } catch (err) {
    alert(err.message);
  } finally {
    saving.value = false;
  }
}

async function toggleActive(p) {
  try {
    await api.updateProduct(p.id, { active: !p.active });
    emit('refresh');
  } catch (err) {
    alert(err.message);
  }
}

async function removeProduct(p) {
  if (!confirm(`Xóa món "${p.name}"?`)) return;
  try {
    await api.deleteProduct(p.id);
    emit('refresh');
  } catch (err) {
    alert(err.message);
  }
}
</script>

<template>
  <div class="page-container">
    <!-- Google Sheet DB Config -->
    <div class="panel card-pad">
      <h3 style="margin: 0 0 8px; font-size: 16px">Kết nối Database Google Sheet (Free vĩnh viễn)</h3>
      <div style="font-size: 12.5px; color: var(--text-muted); margin-bottom: 10px">
        Dán link Web App Google Apps Script vào đây để lưu đơn & doanh thu lên Google Sheet (để trống = dùng DB local).
      </div>
      <form @submit.prevent="saveGasConnection" style="display: flex; gap: 8px; flex-wrap: wrap">
        <input
          v-model="gasUrlInput"
          class="input-sm"
          style="flex: 1; min-width: 240px"
          placeholder="https://script.google.com/macros/s/.../exec"
        />
        <button type="submit" class="btn btn-primary btn-sm">Lưu kết nối</button>
      </form>
    </div>

    <!-- Category Manager -->
    <div class="panel card-pad">
      <h3 style="margin: 0 0 12px; font-size: 16px">Nhóm món (Category)</h3>
      <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px">
        <span
          v-for="cat in categories"
          :key="cat.id"
          class="chip active"
          style="display: inline-flex; align-items: center; gap: 6px"
        >
          {{ cat.name }}
          <button
            type="button"
            style="border: none; background: transparent; padding: 0; color: inherit; display: grid"
            @click="removeCategory(cat)"
            title="Xóa nhóm"
          >
            <X :size="13" />
          </button>
        </span>
      </div>
      <form @submit.prevent="addCategory" style="display: flex; gap: 8px; max-width: 360px">
        <input v-model="newCatName" class="input-sm" placeholder="Tên nhóm mới (VD: Đồ Ăn Vặt)" />
        <button type="submit" class="btn btn-outline btn-sm" style="white-space: nowrap">
          <Plus :size="14" /> Thêm nhóm
        </button>
      </form>
    </div>

    <!-- Add Product -->
    <div class="panel card-pad">
      <h3 style="margin: 0 0 12px; font-size: 16px">Thêm món mới</h3>
      <form
        @submit.prevent="addProduct"
        class="add-product-form"
      >
        <div>
          <label style="font-size: 12px; color: var(--text-muted)">Tên món</label>
          <input v-model="name" class="input-sm" placeholder="VD: Rau Má Bơ Sữa" required />
        </div>
        <div>
          <label style="font-size: 12px; color: var(--text-muted)">Nhóm món</label>
          <select v-model="category" class="input-sm">
            <option v-for="cat in categories" :key="cat.id" :value="cat.name">{{ cat.name }}</option>
          </select>
        </div>
        <div>
          <label style="font-size: 12px; color: var(--text-muted)">Giá gốc (Size M)</label>
          <input v-model.number="price" type="number" step="1000" class="input-sm" required />
        </div>
        <button type="submit" class="btn btn-primary btn-sm" style="height: 35px" :disabled="saving">
          <Plus :size="15" /> Thêm
        </button>
      </form>
    </div>

    <!-- Product List -->
    <div class="panel card-pad">
      <h3 style="margin: 0 0 12px; font-size: 16px">Danh sách món ({{ products.length }})</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tên món</th>
              <th>Nhóm</th>
              <th>Giá gốc</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in products" :key="p.id">
              <td><b>{{ p.name }}</b></td>
              <td>{{ p.category }}</td>
              <td>{{ formatVnd(p.price) }}</td>
              <td>
                <button
                  class="badge"
                  :class="p.active ? 'badge-ok' : 'badge-cancel'"
                  style="border: none"
                  @click="toggleActive(p)"
                >
                  {{ p.active ? 'Đang bán' : 'Tạm ẩn' }}
                </button>
              </td>
              <td>
                <button class="btn btn-danger-soft btn-sm" @click="removeProduct(p)">
                  <Trash2 :size="14" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
