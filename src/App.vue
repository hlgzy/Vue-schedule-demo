<script setup>
import { ref, computed, onMounted } from "vue"
import MonthView from "./components/MonthView.vue"
import WeekView from "./components/WeekView.vue"
import DayView from "./components/DayView.vue"
import ListView from "./components/ListView.vue"
import ScheduleModal from "./components/ScheduleModal.vue"
import ConfirmDialog from "./components/ConfirmDialog.vue"
import ImportDialog from "./components/ImportDialog.vue"
import Toast from "./components/Toast.vue"
import TagManager from "./components/TagManager.vue"
import SettingsPanel from "./components/SettingsPanel.vue"
import FilterBar from "./components/FilterBar.vue"
import RepeatEditDialog from "./components/RepeatEditDialog.vue"
import {
  init, filters, setSearch, toast, showToast,
  addSchedule, updateSchedule, editOccurrence,
  deleteSchedule, deleteOccurrence, toggleFinish,
  handleExport, handleImport, activeReminders, dismissReminder,
  schedules
} from "./composables/useStore"
import { parseImportFile } from "./utils/storage"

// ---- View mode ----
const viewMode = ref("month")

// ---- Schedule modal (create/edit) ----
const modalVisible = ref(false)
const editingSchedule = ref(null)
const prefillDate = ref("")
const pendingEditOcc = ref(null)
const pendingEditMode = ref("all")

// ---- Delete confirmation ----
const deleteVisible = ref(false)
const deletingOcc = ref(null)
const pendingDeleteOcc = ref(null)

// ---- Repeat edit/delete dialog ----
const repeatDialogVisible = ref(false)
const repeatDialogType = ref("edit")

// ---- Import flow ----
const importVisible = ref(false)
const pendingImportFile = ref(null)
const pendingImportCount = ref(0)
const fileInput = ref(null)

// ---- Tag manager ----
const tagManagerVisible = ref(false)

// ---- Settings panel ----
const settingsVisible = ref(false)

// ---- Search (bound to store filter) ----
const searchKeyword = computed({
  get: function () { return filters.search },
  set: function (v) { setSearch(v) }
})

onMounted(function () {
  init()
})

// Is this occurrence a repeating occurrence (needs RepeatEditDialog)?
function isRepeatingOcc(occ) {
  return !!occ && !!occ.isOccurrence && !!occ.repeatType && occ.repeatType !== "none"
}

// ---- Create / Edit ----
function openCreate(dateStr) {
  editingSchedule.value = null
  prefillDate.value = dateStr || ""
  pendingEditOcc.value = null
  modalVisible.value = true
}

function openEdit(occ) {
  if (isRepeatingOcc(occ)) {
    // Show repeat edit dialog first.
    pendingEditOcc.value = occ
    repeatDialogType.value = "edit"
    repeatDialogVisible.value = true
  } else {
    // Direct edit: non-occurrence or overridden occurrence.
    editingSchedule.value = occ
    prefillDate.value = ""
    pendingEditOcc.value = occ
    pendingEditMode.value = occ && occ.isOccurrence ? "this" : "all"
    modalVisible.value = true
  }
}

function onRepeatEditSelect(mode) {
  pendingEditMode.value = mode
  repeatDialogVisible.value = false
  editingSchedule.value = pendingEditOcc.value
  prefillDate.value = ""
  modalVisible.value = true
}

function handleSave(payload) {
  const occ = pendingEditOcc.value
  if (occ && occ.isOccurrence) {
    editOccurrence(occ, payload, pendingEditMode.value)
    showToast("日程已更新")
  } else if (payload.id) {
    updateSchedule(payload.id, payload)
    showToast("日程已更新")
  } else {
    addSchedule(payload)
    showToast("日程已创建")
  }
  modalVisible.value = false
  pendingEditOcc.value = null
}

// ---- Delete ----
function requestDelete(occ) {
  if (isRepeatingOcc(occ)) {
    pendingDeleteOcc.value = occ
    repeatDialogType.value = "delete"
    repeatDialogVisible.value = true
  } else {
    deletingOcc.value = occ
    deleteVisible.value = true
  }
}

function onRepeatDeleteSelect(mode) {
  const occ = pendingDeleteOcc.value
  repeatDialogVisible.value = false
  if (occ) {
    deleteOccurrence(occ, mode)
    showToast("日程已删除")
  }
  pendingDeleteOcc.value = null
}

function confirmDelete() {
  const occ = deletingOcc.value
  if (occ) {
    if (occ.isOccurrence) {
      deleteOccurrence(occ, "this")
    } else {
      deleteSchedule(occ.id)
    }
    showToast("日程已删除")
  }
  deleteVisible.value = false
  deletingOcc.value = null
}

// ---- Export ----
function onExport() {
  handleExport()
}

// ---- Import ----
function triggerImport() {
  if (fileInput.value) {
    fileInput.value.value = ""
    fileInput.value.click()
  }
}

async function onFileChange(e) {
  const file = e.target.files && e.target.files[0]
  if (!file) return
  if (file.name.indexOf(".json") === -1) {
    showToast("请选择 .json 备份文件", "error")
    return
  }
  try {
    const parsed = await parseImportFile(file)
    if (parsed.length === 0) {
      showToast("备份文件中没有日程数据", "error")
      return
    }
    pendingImportFile.value = file
    pendingImportCount.value = parsed.length
    importVisible.value = true
  } catch (err) {
    const msg = typeof err === "string" ? err : "导入失败"
    showToast(msg, "error")
  }
}

function doOverwriteImport() {
  if (pendingImportFile.value) {
    handleImport(pendingImportFile.value, "overwrite")
  }
  importVisible.value = false
  pendingImportFile.value = null
}

function doAppendImport() {
  if (pendingImportFile.value) {
    handleImport(pendingImportFile.value, "append")
  }
  importVisible.value = false
  pendingImportFile.value = null
}

function cancelImport() {
  importVisible.value = false
  pendingImportFile.value = null
}

// ---- Repeat dialog cancel ----
function cancelRepeatDialog() {
  repeatDialogVisible.value = false
  pendingEditOcc.value = null
  pendingDeleteOcc.value = null
}
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="topbar-row">
        <h1 class="brand">📅 日程管理</h1>
        <div class="topbar-actions">
          <button class="btn btn-ghost" type="button" @click="tagManagerVisible = true">标签</button>
          <button class="btn btn-ghost" type="button" @click="settingsVisible = true">设置</button>
          <button class="btn btn-primary" type="button" @click="openCreate('')">+ 新建日程</button>
        </div>
      </div>

      <div class="topbar-row second">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="搜索日程标题或备注…"
            class="search-input"
          />
          <button v-if="searchKeyword" class="search-clear" type="button" @click="searchKeyword = ''">×</button>
        </div>

        <div class="toolbar-group">
          <div class="seg">
            <button type="button" class="seg-btn" :class="{ active: viewMode === 'month' }" @click="viewMode = 'month'">月</button>
            <button type="button" class="seg-btn" :class="{ active: viewMode === 'week' }" @click="viewMode = 'week'">周</button>
            <button type="button" class="seg-btn" :class="{ active: viewMode === 'day' }" @click="viewMode = 'day'">日</button>
            <button type="button" class="seg-btn" :class="{ active: viewMode === 'list' }" @click="viewMode = 'list'">列表</button>
          </div>
          <button class="btn btn-ghost" type="button" @click="onExport">导出</button>
          <button class="btn btn-ghost" type="button" @click="triggerImport">导入</button>
          <input ref="fileInput" type="file" accept=".json,application/json" class="hidden-file" @change="onFileChange" />
        </div>
      </div>

      <FilterBar />
    </header>

    <!-- Reminder banner -->
    <div v-if="activeReminders.length > 0" class="reminder-banner">
      <div v-for="r in activeReminders" :key="r.key" class="reminder-item">
        <span class="reminder-icon">🔔</span>
        <span class="reminder-text">{{ r.title }}</span>
        <button class="reminder-dismiss" type="button" @click="dismissReminder(r.key)">×</button>
      </div>
    </div>

    <main class="content">
      <MonthView
        v-if="viewMode === 'month'"
        @create="openCreate"
        @edit="openEdit"
        @delete="requestDelete"
      />
      <WeekView
        v-else-if="viewMode === 'week'"
        @create="openCreate"
        @edit="openEdit"
        @delete="requestDelete"
      />
      <DayView
        v-else-if="viewMode === 'day'"
        @create="openCreate"
        @edit="openEdit"
        @delete="requestDelete"
      />
      <ListView
        v-else
        @edit="openEdit"
        @delete="requestDelete"
      />
    </main>

    <!-- Modals -->
    <ScheduleModal
      :visible="modalVisible"
      :schedule="editingSchedule"
      :prefill-date="prefillDate"
      @save="handleSave"
      @close="modalVisible = false"
    />

    <RepeatEditDialog
      :visible="repeatDialogVisible"
      :type="repeatDialogType"
      :occurrence="pendingEditOcc || pendingDeleteOcc"
      @select="repeatDialogType === 'edit' ? onRepeatEditSelect($event) : onRepeatDeleteSelect($event)"
      @cancel="cancelRepeatDialog"
    />

    <ConfirmDialog
      :visible="deleteVisible"
      title="删除日程"
      message="确定要删除该日程吗？此操作不可撤回。"
      confirm-text="删除"
      danger
      @confirm="confirmDelete"
      @cancel="deleteVisible = false"
    />

    <ImportDialog
      :visible="importVisible"
      :count="pendingImportCount"
      @overwrite="doOverwriteImport"
      @append="doAppendImport"
      @cancel="cancelImport"
    />

    <TagManager :visible="tagManagerVisible" @close="tagManagerVisible = false" />
    <SettingsPanel :visible="settingsVisible" @close="settingsVisible = false" />

    <Toast :visible="toast.visible" :message="toast.message" :type="toast.type" />
  </div>
</template>

<style scoped>
.app-shell {
  width: 1100px;
  max-width: 100%;
  margin: 0 auto;
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding: 0 16px 24px;
}
.topbar {
  padding: 18px 0 14px;
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.topbar-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.topbar-row.second { flex-wrap: wrap; }
.brand { font-size: 22px; margin: 0; color: var(--text-h); font-weight: 600; }
.topbar-actions { display: flex; gap: 8px; }

.search-box {
  position: relative; flex: 1; min-width: 220px; max-width: 460px;
  display: flex; align-items: center;
}
.search-icon { position: absolute; left: 12px; font-size: 14px; pointer-events: none; opacity: .6; }
.search-input {
  width: 100%; padding: 9px 34px 9px 34px; border: 1px solid var(--border);
  border-radius: 20px; font-size: 14px; color: var(--text-h); outline: none; background: var(--surface, #fff);
  box-sizing: border-box; font-family: inherit;
}
.search-input:focus { border-color: var(--accent); }
.search-clear {
  position: absolute; right: 6px; border: none; background: transparent;
  font-size: 18px; line-height: 1; color: var(--text); cursor: pointer;
  width: 22px; height: 22px; border-radius: 50%;
}
.search-clear:hover { background: var(--border); }

.toolbar-group { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.seg {
  display: inline-flex; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; background: var(--surface, #fff);
}
.seg-btn {
  border: none; padding: 8px 14px; font-size: 13px; cursor: pointer; background: transparent;
  color: var(--text); font-family: inherit; transition: background .15s, color .15s;
}
.seg-btn:hover { background: var(--accent-bg); }
.seg-btn.active { background: var(--accent); color: #fff; }

.hidden-file { display: none; }

.content { flex: 1; margin-top: 16px; }

.reminder-banner {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;
}
.reminder-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--accent-bg);
  border: 1px solid var(--accent);
  border-radius: 8px;
  animation: slideIn .3s ease;
}
.reminder-icon { font-size: 16px; }
.reminder-text { flex: 1; font-size: 14px; color: var(--text-h); font-weight: 500; }
.reminder-dismiss {
  border: none; background: transparent; font-size: 18px;
  color: var(--text); cursor: pointer; padding: 2px 6px; border-radius: 6px;
}
.reminder-dismiss:hover { background: rgba(0,0,0,0.1); }

@keyframes slideIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
