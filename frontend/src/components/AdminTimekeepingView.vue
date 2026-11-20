<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { Users, Clock, Plus, Pencil, Trash2, RefreshCw, Download, Loader2, UserPlus, X } from 'lucide-vue-next';
import { api, getTodayStr, formatVnd } from '../api.js';

const props = defineProps({
  isSuperAdmin: Boolean,
  stores: { type: Array, default: () => [] },
  selectedStoreId: { type: String, default: '' }
});

const todayStr = getTodayStr();
const selectedMonth = ref(todayStr.slice(0, 7));
const localStoreId = ref(props.selectedStoreId || 'default');
const hourlyRate = ref(0);

const employees = ref([]);
const logs = ref([]);
const loading = ref(false);
const deletingLogId = ref('');
const filterEmployeeId = ref('');
const filterDate = ref('');

// Thêm nhân viên
const newEmpName = ref('');
const empLoading = ref(false);
const togglingEmpId = ref('');
const deletingEmpId = ref('');
const empError = ref('');

// Thêm / Sửa chấm công
const showLogModal = ref(false);
const editingLogId = ref('');
const editingStoreId = ref('');
const logEmpId = ref('');
const logDate = ref(todayStr);
const logStart = ref('08:00');
const logEnd = ref('17:00');
const logNote = ref('');
const logSaving = ref(false);
const logError = ref('');

const activeEmployees = computed(() => employees.value.filter((e) => e.active !== false));

watch(
  () => props.selectedStoreId,
  (val) => {
    if (val) {
      localStoreId.value = val;
      loadData();
    }
  }
);

const activeStoreParam = computed(() => {
  if (!props.isSuperAdmin) return '';
  return localStoreId.value || 'all';
});

const filteredLogs = computed(() => {
  return logs.value.filter((l) => {
    if (filterEmployeeId.value && l.employeeId !== filterEmployeeId.value) return false;
    if (filterDate.value && l.dateKey !== filterDate.value) return false;
    return true;
  });
});

const groupedLogs = computed(() => {
  const map = new Map();
  for (const log of filteredLogs.value) {
    const dk = log.dateKey || '';
    if (!map.has(dk)) {
      map.set(dk, { dateKey: dk, totalHours: 0, logs: [] });
    }
    const g = map.get(dk);
    g.logs.push(log);
    g.totalHours = Math.round((g.totalHours + (Number(log.hours) || 0)) * 100) / 100;
  }
  return Array.from(map.values()).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
});

const summary = computed(() => {
  const map = new Map();
  for (const log of logs.value) {
    const key = log.employeeId || log.employeeName;
    if (!map.has(key)) {
      map.set(key, {
        employeeId: log.employeeId,
        employeeName: log.employeeName,
        storeId: log.storeId || 'default',
        storeName: log.storeName || '',
        totalShifts: 0,
        totalHours: 0
      });
    }
    const entry = map.get(key);
    entry.totalShifts += 1;
    entry.totalHours = Math.round((entry.totalHours + (Number(log.hours) || 0)) * 100) / 100;
  }
  return Array.from(map.values()).sort((a, b) => b.totalHours - a.totalHours || a.employeeName.localeCompare(b.employeeName));
});

const totalMonthHours = computed(() => {
  return Math.round(summary.value.reduce((s, item) => s + (Number(item.totalHours) || 0), 0) * 100) / 100;
});

function formatTimeShort(val) {
  const s = String(val || '').trim();
  const m = s.match(/\b(\d{1,2}):(\d{2})(?::\d{2})?\b/);
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : s;
}

function formatDateVn(dateKey) {
  if (!dateKey) return '';
  const [y, m, d] = dateKey.split('-');
  return `${d}/${m}/${y}`;
}

async function loadData() {
  loading.value = true;
  try {
    const storeParam = activeStoreParam.value;
    const [empRes, logRes] = await Promise.all([
      api.getEmployees({ storeId: storeParam, includeInactive: true }),
      api.getTimeLogs({ month: selectedMonth.value, storeId: storeParam })
    ]);
    employees.value = empRes.employees || [];
    logs.value = logRes.logs || [];
  } catch (err) {
    alert(err.message);
  } finally {
    loading.value = false;
  }
}

async function handleAddEmployee() {
  if (empLoading.value) return;
  empError.value = '';
  const name = newEmpName.value.trim();
  if (!name) {
    empError.value = 'Vui lòng nhập tên nhân viên';
    return;
  }
  if (props.isSuperAdmin && localStoreId.value === 'all') {
    empError.value = 'Vui lòng chọn 1 quán cụ thể trước khi thêm nhân viên';
    return;
  }
  empLoading.value = true;
  try {
    const created = await api.createEmployee({
      name,
      ...(props.isSuperAdmin ? { storeId: localStoreId.value } : {})
    });
    if (created && created.id) {
      employees.value = [...employees.value, created].sort((a, b) => a.name.localeCompare(b.name));
    }
    newEmpName.value = '';
  } catch (err) {
    empError.value = err.message;
  } finally {
    empLoading.value = false;
  }
}

async function toggleEmployeeActive(emp) {
  if (togglingEmpId.value || deletingEmpId.value) return;
  togglingEmpId.value = emp.id;
  try {
    const updated = await api.updateEmployee(emp.id, {
      active: emp.active === false,
      ...(props.isSuperAdmin ? { storeId: emp.storeId || localStoreId.value } : {})
    });
    employees.value = employees.value.map((e) => (e.id === emp.id ? { ...e, ...updated } : e));
  } catch (err) {
    alert(err.message);
  } finally {
    togglingEmpId.value = '';
  }
}

async function handleDeleteEmployee(emp) {
  if (togglingEmpId.value || deletingEmpId.value) return;
  if (!confirm(`Xóa nhân viên "${emp.name}" khỏi danh sách? (Các dữ liệu chấm công cũ vẫn được giữ)`)) return;
  deletingEmpId.value = emp.id;
  try {
    await api.deleteEmployee(emp.id, props.isSuperAdmin ? (emp.storeId || localStoreId.value) : '');
    employees.value = employees.value.filter((e) => e.id !== emp.id);
  } catch (err) {
    alert(err.message);
  } finally {
    deletingEmpId.value = '';
  }
}

function openAddLogModal() {
  editingLogId.value = '';
  editingStoreId.value = '';
  logEmpId.value = activeEmployees.value[0]?.id || '';
  logDate.value = todayStr;
  logStart.value = '08:00';
  logEnd.value = '17:00';
  logNote.value = '';
  logError.value = '';
  showLogModal.value = true;
}

function openEditLogModal(log) {
  editingLogId.value = log.id;
  editingStoreId.value = log.storeId || '';
  logEmpId.value = log.employeeId;
  logDate.value = log.dateKey;
  logStart.value = formatTimeShort(log.startTime);
  logEnd.value = formatTimeShort(log.endTime);
  logNote.value = log.note || '';
  logError.value = '';
  showLogModal.value = true;
}

async function handleSaveLog() {
  if (logSaving.value) return;
  logError.value = '';
  if (!logEmpId.value) {
    logError.value = 'Vui lòng chọn nhân viên';
    return;
  }
  if (!logDate.value || logDate.value > todayStr) {
    logError.value = 'Ngày chấm công không hợp lệ hoặc là ngày tương lai';
    return;
  }
  const targetEmp = employees.value.find((e) => e.id === logEmpId.value);
  const storeParam = props.isSuperAdmin
    ? (editingStoreId.value || targetEmp?.storeId || localStoreId.value)
    : undefined;
  logSaving.value = true;
  try {
    const payload = {
      employeeId: logEmpId.value,
      dateKey: logDate.value,
      startTime: logStart.value,
      endTime: logEnd.value,
      note: logNote.value.trim(),
      ...(storeParam && storeParam !== 'all' ? { storeId: storeParam } : {})
    };
    if (editingLogId.value) {
      const updated = await api.updateTimeLog(editingLogId.value, payload);
      if (String(updated.dateKey || '').startsWith(selectedMonth.value)) {
        logs.value = logs.value.map((l) => (l.id === editingLogId.value ? { ...l, ...updated } : l));
      } else {
        logs.value = logs.value.filter((l) => l.id !== editingLogId.value);
      }
    } else {
      const created = await api.createTimeLog(payload);
      if (created && created.id && String(created.dateKey || '').startsWith(selectedMonth.value)) {
        logs.value = [created, ...logs.value];
      }
    }
    logs.value = [...logs.value].sort(
      (a, b) => String(b.dateKey).localeCompare(String(a.dateKey)) || String(b.startTime).localeCompare(String(a.startTime))
    );
    showLogModal.value = false;
  } catch (err) {
    logError.value = err.message;
  } finally {
    logSaving.value = false;
  }
}

async function handleDeleteLog(log) {
  if (deletingLogId.value) return;
  if (!confirm(`Xóa chấm công của ${log.employeeName} ngày ${formatDateVn(log.dateKey)} (${formatTimeShort(log.startTime)} - ${formatTimeShort(log.endTime)})?`)) return;
  deletingLogId.value = log.id;
  try {
    await api.deleteTimeLog(log.id, props.isSuperAdmin ? (log.storeId || localStoreId.value) : '');
    logs.value = logs.value.filter((l) => l.id !== log.id);
  } catch (err) {
    alert(err.message);
  } finally {
    deletingLogId.value = '';
  }
}

function exportCsv() {
  const rows = [
    ['TONG HOP GIO LAM THANG ' + selectedMonth.value],
    ['Nhan vien', 'Quan', 'So buoi', 'Tong gio', ...(hourlyRate.value > 0 ? ['Don gia/gio', 'Luong tam tinh'] : [])]
  ];
  for (const s of summary.value) {
    const row = [s.employeeName, s.storeName || '', s.totalShifts, s.totalHours];
    if (hourlyRate.value > 0) {
      row.push(hourlyRate.value, Math.round(s.totalHours * hourlyRate.value));
    }
    rows.push(row);
  }
  rows.push([]);
  rows.push(['CHI TIET CHAM CONG']);
  rows.push(['Ngay', 'Nhan vien', 'Quan', 'Bat dau', 'Gio ve', 'So gio', 'Ghi chu']);
  for (const l of logs.value) {
    rows.push([l.dateKey, l.employeeName, l.storeName || '', l.startTime, l.endTime, l.hours, l.note || '']);
  }
  const csv = '\uFEFF' + rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cham-cong-${selectedMonth.value}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

onMounted(loadData);
</script>

<template>
  <div class="page-container admin-page-container">
    <!-- Filter Bar -->
    <div class="panel card-pad" style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: space-between; align-items: center">
      <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center">
        <label style="font-size: 13px; font-weight: 600">Tháng:</label>
        <input v-model="selectedMonth" type="month" class="input-sm" style="width: auto" @change="loadData" />

        <select
          v-if="isSuperAdmin"
          v-model="localStoreId"
          class="input-sm"
          style="width: auto"
          @change="loadData"
        >
          <option value="all">Tất cả quán</option>
          <option v-for="st in stores" :key="st.id" :value="st.id">{{ st.name }}</option>
        </select>

        <div style="display: flex; align-items: center; gap: 6px; margin-left: 4px">
          <label style="font-size: 12px; color: var(--text-muted)">Lương/giờ (đ):</label>
          <input
            v-model.number="hourlyRate"
            type="number"
            min="0"
            step="1000"
            class="input-sm"
            style="width: 110px"
            placeholder="VD: 25000"
          />
        </div>
      </div>

      <div style="display: flex; gap: 8px; align-items: center">
        <button class="btn btn-outline btn-sm" :disabled="!summary.length" @click="exportCsv">
          <Download :size="14" /> Xuất CSV
        </button>
        <button class="btn btn-primary btn-sm" :disabled="loading" @click="loadData">
          <Loader2 v-if="loading" :size="14" class="spin" />
          <RefreshCw v-else :size="14" />
          Làm mới
        </button>
      </div>
    </div>

    <!-- Top 2-col: Employee list + Monthly Payroll Summary -->
    <div class="two-col" :class="{ 'is-loading': loading }">
      <!-- Danh sách nhân viên cố định -->
      <div class="panel card-pad">
        <div class="section-head" style="margin-bottom: 10px">
          <h3 style="margin: 0; font-size: 15px; display: flex; align-items: center; gap: 6px">
            <Users :size="16" /> Nhân viên cố định ({{ employees.length }})
          </h3>
        </div>

        <form style="display: flex; gap: 8px; margin-bottom: 10px" @submit.prevent="handleAddEmployee">
          <input
            v-model="newEmpName"
            type="text"
            class="input-sm"
            placeholder="Nhập tên nhân viên mới (VD: Lan)..."
            :disabled="empLoading"
          />
          <button class="btn btn-primary btn-sm" type="submit" :disabled="empLoading" style="white-space: nowrap">
            <Loader2 v-if="empLoading" :size="14" class="spin" />
            <UserPlus v-else :size="14" />
            {{ empLoading ? 'Đang thêm...' : 'Thêm' }}
          </button>
        </form>
        <div v-if="empError" class="admin-error-box" style="margin-bottom: 10px">{{ empError }}</div>

        <div v-if="!employees.length" style="color: var(--text-muted); font-size: 13px">
          Chưa có nhân viên nào. Hãy thêm tên nhân viên để họ chọn khi chấm công.
        </div>
        <div v-else style="display: flex; flex-direction: column; gap: 6px; max-height: 280px; overflow-y: auto">
          <div
            v-for="emp in employees"
            :key="emp.id"
            class="summary-line"
            style="padding: 6px 10px; border: 1px solid var(--border); border-radius: 8px; font-size: 13px"
          >
            <div>
              <b :style="emp.active === false ? { textDecoration: 'line-through', color: 'var(--text-muted)' } : {}">
                {{ emp.name }}
              </b>
              <span v-if="isSuperAdmin && emp.storeName" style="color: var(--text-muted); font-size: 12px; margin-left: 6px">
                ({{ emp.storeName }})
              </span>
            </div>
            <div style="display: flex; gap: 6px; align-items: center">
              <button
                class="btn btn-outline btn-sm"
                style="padding: 3px 8px; font-size: 11px"
                :disabled="togglingEmpId === emp.id || deletingEmpId === emp.id"
                @click="toggleEmployeeActive(emp)"
              >
                <Loader2 v-if="togglingEmpId === emp.id" :size="11" class="spin" />
                {{ togglingEmpId === emp.id ? 'Đang lưu...' : (emp.active === false ? 'Mở lại' : 'Nghỉ việc') }}
              </button>
              <button
                class="btn btn-danger-soft btn-sm"
                style="padding: 3px 6px"
                :disabled="togglingEmpId === emp.id || deletingEmpId === emp.id"
                @click="handleDeleteEmployee(emp)"
                title="Xóa khỏi danh sách"
              >
                <Loader2 v-if="deletingEmpId === emp.id" :size="12" class="spin" />
                <Trash2 v-else :size="12" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Bảng tổng hợp giờ làm tháng -->
      <div class="panel card-pad">
        <div class="section-head" style="margin-bottom: 10px">
          <h3 style="margin: 0; font-size: 15px; display: flex; align-items: center; gap: 6px">
            <Clock :size="16" /> Tổng hợp giờ làm tháng {{ selectedMonth }}
          </h3>
          <span style="font-size: 13px; color: var(--primary); font-weight: 700">
            Tổng: {{ totalMonthHours }} giờ
          </span>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nhân viên</th>
                <th>Số buổi</th>
                <th>Tổng giờ</th>
                <th v-if="hourlyRate > 0">Lương tạm tính</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!summary.length">
                <td :colspan="hourlyRate > 0 ? 4 : 3" style="text-align: center; color: var(--text-muted)">
                  Chưa có dữ liệu chấm công trong tháng này.
                </td>
              </tr>
              <tr
                v-for="s in summary"
                :key="s.employeeId"
                style="cursor: pointer"
                :style="filterEmployeeId === s.employeeId ? { background: '#f0fdf4' } : {}"
                @click="filterEmployeeId = filterEmployeeId === s.employeeId ? '' : s.employeeId"
                title="Bấm để lọc chi tiết bên dưới"
              >
                <td>
                  <b>{{ s.employeeName }}</b>
                  <span v-if="isSuperAdmin && s.storeName" style="font-size: 11px; color: var(--text-muted); margin-left: 4px">
                    ({{ s.storeName }})
                  </span>
                </td>
                <td>{{ s.totalShifts }} buổi</td>
                <td><b style="color: var(--primary)">{{ s.totalHours }} giờ</b></td>
                <td v-if="hourlyRate > 0">
                  <b>{{ formatVnd(Math.round(s.totalHours * hourlyRate)) }}</b>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Chi tiết chấm công từng ngày -->
    <div class="panel card-pad" :class="{ 'is-loading': loading }">
      <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 12px">
        <h3 style="margin: 0; font-size: 15px">Chi tiết chấm công theo ngày ({{ filteredLogs.length }})</h3>
        <div style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center">
          <input v-model="filterDate" type="date" :max="todayStr" class="input-sm" style="width: auto" title="Lọc theo ngày" />
          <button v-if="filterDate" class="btn btn-outline btn-sm" @click="filterDate = ''">Tất cả ngày</button>
          <select v-model="filterEmployeeId" class="input-sm" style="width: auto">
            <option value="">Tất cả nhân viên</option>
            <option v-for="emp in employees" :key="emp.id" :value="emp.id">{{ emp.name }}</option>
          </select>
          <button class="btn btn-primary btn-sm" :disabled="!activeEmployees.length" @click="openAddLogModal">
            <Plus :size="14" /> Thêm chấm công
          </button>
        </div>
      </div>

      <div class="table-wrap" style="max-height: 360px; overflow-y: auto">
        <table>
          <thead>
            <tr>
              <th>Nhân viên</th>
              <th v-if="isSuperAdmin">Quán</th>
              <th>Giờ làm</th>
              <th>Số giờ</th>
              <th>Ghi chú</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!filteredLogs.length">
              <td :colspan="isSuperAdmin ? 6 : 5" style="text-align: center; color: var(--text-muted)">
                Chưa có bản ghi chấm công nào.
              </td>
            </tr>
            <template v-for="group in groupedLogs" :key="group.dateKey">
              <tr style="background: #f8fafc">
                <td :colspan="isSuperAdmin ? 6 : 5" style="padding: 8px 12px; border-top: 2px solid var(--border)">
                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px">
                    <div>
                      <b>{{ formatDateVn(group.dateKey) }}</b>
                      <span v-if="group.dateKey === todayStr" class="badge badge-ok" style="margin-left: 6px; font-size: 11px">Hôm nay</span>
                    </div>
                    <div>
                      <span style="color: var(--text-muted)">{{ group.logs.length }} lượt</span>
                      · <b style="color: var(--primary)">{{ group.totalHours }} giờ</b>
                    </div>
                  </div>
                </td>
              </tr>
              <tr v-for="log in group.logs" :key="log.id">
                <td><b>{{ log.employeeName }}</b></td>
                <td v-if="isSuperAdmin" style="font-size: 13px">{{ log.storeName || '—' }}</td>
                <td>{{ formatTimeShort(log.startTime) }} → {{ formatTimeShort(log.endTime) }}</td>
                <td><b style="color: var(--primary)">{{ log.hours }} giờ</b></td>
                <td style="font-size: 13px; color: var(--text-muted)">{{ log.note || '—' }}</td>
                <td style="display: flex; gap: 4px">
                  <button class="btn btn-outline btn-sm" :disabled="deletingLogId === log.id" @click="openEditLogModal(log)" title="Sửa">
                    <Pencil :size="13" />
                  </button>
                  <button class="btn btn-danger-soft btn-sm" :disabled="deletingLogId === log.id" @click="handleDeleteLog(log)" title="Xóa">
                    <Loader2 v-if="deletingLogId === log.id" :size="13" class="spin" />
                    <Trash2 v-else :size="13" />
                  </button>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Thêm / Sửa chấm công (Admin) -->
    <div v-if="showLogModal" class="modal-backdrop" @click.self="!logSaving && (showLogModal = false)">
      <div class="modal" style="max-width: 440px; width: 95%">
        <div class="modal-header">
          <h3>{{ editingLogId ? 'Sửa bản chấm công' : 'Thêm chấm công' }}</h3>
          <button class="btn btn-outline btn-sm" :disabled="logSaving" @click="showLogModal = false">
            <X :size="16" />
          </button>
        </div>
        <form style="display: flex; flex-direction: column; gap: 12px; padding-top: 8px" @submit.prevent="handleSaveLog">
          <div>
            <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px">Nhân viên</label>
            <select v-model="logEmpId" class="input-sm" required>
              <option value="">-- Chọn nhân viên --</option>
              <option v-for="emp in (editingLogId ? employees : activeEmployees)" :key="emp.id" :value="emp.id">
                {{ emp.name }}
              </option>
            </select>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px">
            <div>
              <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px">Ngày</label>
              <input v-model="logDate" type="date" :max="todayStr" class="input-sm" required />
            </div>
            <div>
              <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px">Bắt đầu</label>
              <input v-model="logStart" type="time" min="08:00" max="23:00" class="input-sm" required />
            </div>
            <div>
              <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px">Giờ về</label>
              <input v-model="logEnd" type="time" min="08:00" max="23:00" class="input-sm" required />
            </div>
          </div>
          <div>
            <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px">Ghi chú</label>
            <input v-model="logNote" type="text" class="input-sm" placeholder="VD: Sửa giờ ca sáng..." />
          </div>
          <div v-if="logError" class="admin-error-box" style="margin: 0">{{ logError }}</div>
          <button class="btn btn-primary" type="submit" :disabled="logSaving">
            <Loader2 v-if="logSaving" :size="15" class="spin" />
            {{ logSaving ? 'Đang lưu...' : 'Lưu chấm công' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
