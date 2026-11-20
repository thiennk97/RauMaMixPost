<script setup>
import { ref, computed, onMounted } from 'vue';
import { Clock, Plus, RefreshCw, Loader2, UserCheck, Calendar } from 'lucide-vue-next';
import { api, getTodayStr } from '../api.js';

const todayStr = getTodayStr();
const currentMonth = todayStr.slice(0, 7);
const prevMonth = (() => {
  const [y, m] = currentMonth.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
})();
const allowedMonths = [
  { value: currentMonth, label: `Tháng này (${currentMonth})` },
  { value: prevMonth, label: `Tháng trước (${prevMonth})` }
];

const employees = ref([]);
const logs = ref([]);
const loading = ref(false);
const submitting = ref(false);

const selectedMonth = ref(currentMonth);
const filterEmployeeId = ref('');
const filterDate = ref('');

// Form chấm công
const formEmployeeId = ref('');
const formDate = ref(todayStr);
const formStart = ref('08:00');
const formEnd = ref('17:00');
const formNote = ref('');
const formError = ref('');
const toast = ref('');

const OPEN_MIN = 8 * 60;
const CLOSE_MIN = 23 * 60;
const MAX_DAILY_HOURS = 15;

const timeValidationError = computed(() => {
  const s = parseMinutes(formStart.value);
  const e = parseMinutes(formEnd.value);
  if (s < 0 || e < 0) return 'Vui lòng nhập giờ bắt đầu và giờ về hợp lệ';
  if (s < OPEN_MIN || e > CLOSE_MIN) return 'Giờ chấm công chỉ hợp lệ trong khung 08:00 - 23:00';
  if (e <= s) return 'Giờ về phải sau giờ bắt đầu';
  const hrs = Math.round(((e - s) / 60) * 100) / 100;
  if (hrs > MAX_DAILY_HOURS) return `Tổng giờ làm không được vượt quá ${MAX_DAILY_HOURS} giờ/ngày`;
  return '';
});

const computedHours = computed(() => {
  if (timeValidationError.value) return 0;
  const s = parseMinutes(formStart.value);
  const e = parseMinutes(formEnd.value);
  return Math.round(((e - s) / 60) * 100) / 100;
});

function parseMinutes(hhmm) {
  const m = String(hhmm || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return -1;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return -1;
  return h * 60 + min;
}

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

const todayHoursByEmp = computed(() => {
  const map = {};
  for (const l of logs.value) {
    if (l.dateKey === todayStr) {
      map[l.employeeId] = Math.round(((map[l.employeeId] || 0) + (Number(l.hours) || 0)) * 100) / 100;
    }
  }
  return map;
});

async function loadData(fetchEmployees = true) {
  loading.value = true;
  try {
    const [empRes, logRes] = await Promise.all([
      fetchEmployees ? api.getEmployees() : Promise.resolve(null),
      api.getTimeLogs({ month: selectedMonth.value })
    ]);
    if (empRes) {
      employees.value = empRes.employees || [];
    }
    logs.value = logRes.logs || [];
    if (formEmployeeId.value && !employees.value.some((e) => e.id === formEmployeeId.value)) {
      formEmployeeId.value = '';
    }
  } catch (err) {
    alert(err.message);
  } finally {
    loading.value = false;
  }
}

async function handleSubmit() {
  if (submitting.value) return;
  formError.value = '';
  if (!formEmployeeId.value) {
    formError.value = 'Vui lòng chọn tên nhân viên trong danh sách';
    return;
  }
  if (!formDate.value) {
    formError.value = 'Vui lòng chọn ngày làm';
    return;
  }
  if (formDate.value > todayStr) {
    formError.value = 'Không được chấm công cho ngày tương lai';
    return;
  }
  if (timeValidationError.value) {
    formError.value = timeValidationError.value;
    return;
  }
  submitting.value = true;
  try {
    const created = await api.createTimeLog({
      employeeId: formEmployeeId.value,
      dateKey: formDate.value,
      startTime: formStart.value,
      endTime: formEnd.value,
      note: formNote.value.trim()
    });
    if (created && created.id && String(created.dateKey || '').startsWith(selectedMonth.value)) {
      logs.value = [created, ...logs.value].sort(
        (a, b) => String(b.dateKey).localeCompare(String(a.dateKey)) || String(b.startTime).localeCompare(String(a.startTime))
      );
    }
    formNote.value = '';
    toast.value = 'Đã lưu chấm công';
    setTimeout(() => { toast.value = ''; }, 2500);
  } catch (err) {
    formError.value = err.message;
  } finally {
    submitting.value = false;
  }
}

onMounted(loadData);
</script>

<template>
  <div class="page-container">
    <div class="two-col">
      <!-- Form chấm công -->
      <div class="panel card-pad">
        <div class="section-head" style="margin-bottom: 12px">
          <h3 style="margin: 0; font-size: 16px; display: flex; align-items: center; gap: 6px">
            <Clock :size="18" /> Chấm công ca làm
          </h3>
          <span v-if="toast" class="badge badge-ok">{{ toast }}</span>
        </div>

        <div v-if="!employees.length && !loading" class="admin-error-box" style="margin-bottom: 10px">
          Chưa có danh sách nhân viên cố định. Vui lòng nhờ Admin thêm tên nhân viên trong trang Quản trị → Chấm công.
        </div>

        <form style="display: flex; flex-direction: column; gap: 12px" @submit.prevent="handleSubmit">
          <div>
            <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px">
              Chọn nhân viên <span style="color: #dc2626">*</span>
            </label>
            <div class="cat-pills" style="flex-wrap: wrap">
              <button
                v-for="emp in employees"
                :key="emp.id"
                type="button"
                class="pill"
                :class="{ active: formEmployeeId === emp.id }"
                @click="formEmployeeId = emp.id; formError = ''"
              >
                <UserCheck v-if="formEmployeeId === emp.id" :size="13" style="margin-right: 4px; vertical-align: middle" />
                {{ emp.name }}
              </button>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px">
            <div>
              <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px">Ngày làm</label>
              <input v-model="formDate" type="date" :max="todayStr" class="input-sm" required @input="formError = ''" />
            </div>
            <div>
              <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px">Bắt đầu (từ 08:00)</label>
              <input v-model="formStart" type="time" min="08:00" max="23:00" class="input-sm" required @input="formError = ''" />
            </div>
            <div>
              <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px">Giờ về (đến 23:00)</label>
              <input v-model="formEnd" type="time" min="08:00" max="23:00" class="input-sm" required @input="formError = ''" />
            </div>
          </div>

          <div
            v-if="timeValidationError"
            class="admin-error-box"
            style="margin: 0; font-size: 12px; padding: 7px 10px"
          >
            {{ timeValidationError }}
          </div>
          <div v-else class="summary-line" style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 8px 12px; font-size: 13px">
            <span>Tổng giờ ca này</span>
            <b style="color: #166534; font-size: 15px">{{ computedHours }} giờ</b>
          </div>

          <div>
            <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px">Ghi chú (tuỳ chọn)</label>
            <input v-model="formNote" type="text" class="input-sm" placeholder="VD: Ca sáng, tăng ca..." />
          </div>

          <div v-if="formError" class="admin-error-box" style="margin: 0">{{ formError }}</div>

          <button class="btn btn-primary" type="submit" :disabled="submitting || !employees.length">
            <Loader2 v-if="submitting" :size="16" class="spin" />
            <Plus v-else :size="16" />
            {{ submitting ? 'Đang lưu...' : 'Lưu chấm công' }}
          </button>
        </form>
      </div>

      <!-- Tổng hợp giờ làm trong tháng -->
      <div class="panel card-pad" :class="{ 'is-loading': loading }">
        <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 12px">
          <h3 style="margin: 0; font-size: 16px; display: flex; align-items: center; gap: 6px">
            <Calendar :size="17" /> Tổng giờ tháng {{ selectedMonth }}
          </h3>
          <div style="display: flex; gap: 6px; align-items: center">
            <select v-model="selectedMonth" class="input-sm" style="width: auto" @change="filterDate = ''; loadData(false)">
              <option v-for="m in allowedMonths" :key="m.value" :value="m.value">{{ m.label }}</option>
            </select>
            <button class="btn btn-outline btn-sm" :disabled="loading" @click="loadData">
              <Loader2 v-if="loading" :size="14" class="spin" />
              <RefreshCw v-else :size="14" />
            </button>
          </div>
        </div>

        <div v-if="!summary.length" style="color: var(--text-muted); font-size: 14px">
          Chưa có dữ liệu chấm công trong tháng này.
        </div>
        <div v-else style="display: flex; flex-direction: column; gap: 8px">
          <div
            v-for="s in summary"
            :key="s.employeeId"
            class="summary-line"
            style="padding: 8px 10px; border: 1px solid var(--border); border-radius: 8px; cursor: pointer"
            :style="filterEmployeeId === s.employeeId ? { background: '#f0fdf4', borderColor: '#86efac' } : {}"
            @click="filterEmployeeId = filterEmployeeId === s.employeeId ? '' : s.employeeId"
            title="Bấm để lọc lịch sử theo nhân viên này"
          >
            <div>
              <b>{{ s.employeeName }}</b>
              <span style="font-size: 12px; color: var(--text-muted); margin-left: 6px">({{ s.totalShifts }} buổi)</span>
              <div v-if="todayHoursByEmp[s.employeeId]" style="font-size: 12px; color: #15803d">
                Hôm nay: {{ todayHoursByEmp[s.employeeId] }} giờ
              </div>
            </div>
            <b style="color: var(--primary); font-size: 15px">{{ s.totalHours }} giờ</b>
          </div>
        </div>
      </div>
    </div>

    <!-- Lịch sử chấm công -->
    <div class="panel card-pad">
      <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 12px">
        <h3 style="margin: 0; font-size: 15px">
          Lịch sử chấm công ({{ filteredLogs.length }})
        </h3>
        <div style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center">
          <input v-model="filterDate" type="date" :max="todayStr" class="input-sm" style="width: auto" title="Lọc theo ngày" />
          <button v-if="filterDate" class="btn btn-outline btn-sm" @click="filterDate = ''">Tất cả ngày</button>
          <select v-model="filterEmployeeId" class="input-sm" style="width: auto">
            <option value="">Tất cả nhân viên</option>
            <option v-for="emp in employees" :key="emp.id" :value="emp.id">{{ emp.name }}</option>
          </select>
        </div>
      </div>

      <div class="table-wrap" style="max-height: 360px; overflow-y: auto" :style="loading ? { opacity: 0.55 } : {}">
        <table>
          <thead>
            <tr>
              <th>Nhân viên</th>
              <th>Giờ làm</th>
              <th>Tổng giờ</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!filteredLogs.length">
              <td colspan="4" style="text-align: center; color: var(--text-muted)">Chưa có bản ghi chấm công nào.</td>
            </tr>
            <template v-for="group in groupedLogs" :key="group.dateKey">
              <tr style="background: #f8fafc">
                <td colspan="4" style="padding: 8px 12px; border-top: 2px solid var(--border)">
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
                <td>{{ formatTimeShort(log.startTime) }} → {{ formatTimeShort(log.endTime) }}</td>
                <td><b style="color: var(--primary)">{{ log.hours }} giờ</b></td>
                <td style="font-size: 13px; color: var(--text-muted)">{{ log.note || '—' }}</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
