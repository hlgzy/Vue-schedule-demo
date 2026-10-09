// Singleton store for the V1.5 schedule app.
// Components import this directly — no props drilling needed.
// Holds: schedules, tags, exceptions, settings, filters, toast, reminders.

import { ref, reactive, computed } from "vue"
import {
  loadSchedules, saveSchedules,
  loadTags, saveTags,
  loadExceptions, saveExceptions,
  loadSettings, saveSettings,
  genId, migrateSchedule,
  DEFAULT_TAGS, DEFAULT_SETTINGS,
  exportSchedules, parseImportFile,
  mergeImport, overwriteImport
} from "../utils/storage"
import { expandAll } from "../utils/repeat"
import {
  parseISO, toDateStr, startOfDay, addDays,
  startOfWeek, isSameDay, isExpired
} from "../utils/date"

// ==================== State ====================

const schedules = ref([])
const tags = ref([...DEFAULT_TAGS])
const exceptions = ref([])
const settings = reactive({ ...DEFAULT_SETTINGS })
const filters = reactive({
  search: "",
  time: "all",         // all | today | future | past
  status: "all",       // all | undone | done
  selectedTagIds: []   // empty = all tags
})
const toast = reactive({ visible: false, message: "", type: "success" })

// Fired reminder keys: { "occKey": true }  (per-day scope, cleared on reload)
const firedReminders = reactive({})
const activeReminders = reactive([])

let toastTimer = null
let reminderTimer = null
let initialized = false

// ==================== Toast ====================

function showToast(msg, type) {
  if (!type) type = "success"
  toast.message = msg
  toast.type = type
  toast.visible = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(function () { toast.visible = false }, 2400)
}

// ==================== Init ====================

function init() {
  if (initialized) return
  initialized = true
  schedules.value = loadSchedules()
  tags.value = loadTags()
  exceptions.value = loadExceptions()
  Object.assign(settings, loadSettings())
  applyTheme()
  loadFiredReminders()
  startReminderLoop()
}

function applyTheme() {
  document.documentElement.setAttribute("data-theme", settings.theme)
}

// ==================== Persistence ====================

function persistSchedules() { return saveSchedules(schedules.value) }
function persistTags() { return saveTags(tags.value) }
function persistExceptions() { return saveExceptions(exceptions.value) }
function persistSettings() { return saveSettings(settings) }

// ==================== Tag helpers ====================

function tagById(id) {
  if (!id) return null
  return tags.value.find(function (t) { return t.id === id }) || null
}

// Resolve display color: tag color first, then schedule.color.
function scheduleColor(s) {
  const t = tagById(s.tagId)
  if (t) return t.color
  return s.color || "#2185d0"
}

// ==================== Schedule CRUD ====================

function addSchedule(data) {
  const item = Object.assign({}, migrateSchedule(data), { id: genId() })
  schedules.value.push(item)
  persistSchedules()
  return item
}

function updateSchedule(id, data) {
  const idx = schedules.value.findIndex(function (s) { return s.id === id })
  if (idx > -1) {
    schedules.value[idx] = Object.assign({}, schedules.value[idx], data)
    persistSchedules()
    return schedules.value[idx]
  }
  return null
}

function deleteSchedule(id) {
  schedules.value = schedules.value.filter(function (s) { return s.id !== id })
  // Also remove exceptions for this base.
  exceptions.value = exceptions.value.filter(function (e) {
    return !e.key.startsWith(id + "_")
  })
  persistSchedules()
  persistExceptions()
}

// ==================== Repeat exceptions ====================

// Get the base schedule from an occurrence.
function baseOf(occ) {
  if (occ && occ.isOccurrence && occ.baseId) {
    return schedules.value.find(function (s) { return s.id === occ.baseId }) || null
  }
  return occ
}

// Create or update an exception for a specific occurrence.
function setException(key, type, data) {
  const idx = exceptions.value.findIndex(function (e) { return e.key === key })
  const entry = data ? { key: key, type: type, data: data } : { key: key, type: type }
  if (idx > -1) {
    exceptions.value[idx] = entry
  } else {
    exceptions.value.push(entry)
  }
  persistExceptions()
}

// Edit a repeating occurrence with three modes:
//   "this" → override exception (edit only this occurrence)
//   "all"  → edit the base series
//   "following" → end base before this occurrence + create new base from here
function editOccurrence(occ, newData, mode) {
  if (!occ || !occ.isOccurrence) {
    if (occ) updateSchedule(occ.id, newData)
    return
  }
  const base = baseOf(occ)
  if (!base) return
  const occKey = occ.occKey

  if (mode === "all") {
    updateSchedule(base.id, newData)
    return
  }

  if (mode === "this") {
    // Check if there's an existing override; if so, update it; else create new.
    const existing = exceptions.value.find(function (e) { return e.key === occKey })
    if (existing && existing.type === "override" && existing.data) {
      const updated = Object.assign({}, existing.data, newData)
      setException(occKey, "override", updated)
    } else {
      const overrideData = Object.assign({}, base, newData, {
        startTime: newData.startTime || occ.startTime,
        endTime: newData.endTime || occ.endTime,
        repeatType: "none"
      })
      setException(occKey, "override", overrideData)
    }
    return
  }

  if (mode === "following") {
    // 1. End the base series the day before this occurrence.
    const occDate = parseISO(occ.startTime)
    const dayBefore = addDays(startOfDay(occDate), -1)
    updateSchedule(base.id, {
      repeatEndType: "date",
      repeatEndDate: toDateStr(dayBefore)
    })
    // 2. Create a new base starting from this occurrence with edited data.
    const newBase = Object.assign({}, base, newData, {
      id: genId(),
      startTime: newData.startTime || occ.startTime,
      endTime: newData.endTime || occ.endTime
    })
    schedules.value.push(newBase)
    persistSchedules()
    return
  }
}

// Delete a repeating occurrence with three modes.
function deleteOccurrence(occ, mode) {
  if (!occ || !occ.isOccurrence) {
    if (occ) deleteSchedule(occ.id)
    return
  }
  const base = baseOf(occ)
  if (!base) return
  const occKey = occ.occKey

  if (mode === "all") {
    deleteSchedule(base.id)
    return
  }

  if (mode === "this") {
    setException(occKey, "exclude")
    return
  }

  if (mode === "following") {
    const occDate = parseISO(occ.startTime)
    const dayBefore = addDays(startOfDay(occDate), -1)
    updateSchedule(base.id, {
      repeatEndType: "date",
      repeatEndDate: toDateStr(dayBefore)
    })
    return
  }
}

// Toggle finish state of a schedule/occurrence.
function toggleFinish(occ) {
  if (!occ) return
  if (!occ.isOccurrence) {
    updateSchedule(occ.id, { isFinish: !occ.isFinish })
    return
  }
  const base = baseOf(occ)
  if (!base) return
  const occKey = occ.occKey
  const existing = exceptions.value.find(function (e) { return e.key === occKey })
  if (existing && existing.type === "override" && existing.data) {
    const updated = Object.assign({}, existing.data, { isFinish: !occ.isFinish })
    setException(occKey, "override", updated)
  } else {
    const overrideData = Object.assign({}, base, {
      startTime: occ.startTime,
      endTime: occ.endTime,
      isFinish: !occ.isFinish,
      repeatType: "none"
    })
    setException(occKey, "override", overrideData)
  }
}

// ==================== Tag CRUD ====================

function addTag(name, color) {
  const tag = { id: genId(), name: name, color: color || "#2185d0" }
  tags.value.push(tag)
  persistTags()
  return tag
}

function updateTag(id, data) {
  const idx = tags.value.findIndex(function (t) { return t.id === id })
  if (idx > -1) {
    tags.value[idx] = Object.assign({}, tags.value[idx], data)
    persistTags()
  }
}

function deleteTag(id) {
  // Don't allow deleting built-in default tags.
  if (DEFAULT_TAGS.some(function (t) { return t.id === id })) return false
  tags.value = tags.value.filter(function (t) { return t.id !== id })
  // Clear tagId on schedules that used this tag.
  for (const s of schedules.value) {
    if (s.tagId === id) s.tagId = ""
  }
  // Remove from active filters.
  const fidx = filters.selectedTagIds.indexOf(id)
  if (fidx > -1) filters.selectedTagIds.splice(fidx, 1)
  persistTags()
  persistSchedules()
  return true
}

// ==================== Settings ====================

function updateSettings(data) {
  Object.assign(settings, data)
  applyTheme()
  persistSettings()
}

function setTheme(theme) {
  settings.theme = theme
  applyTheme()
  persistSettings()
}

function setWeekStart(val) {
  settings.weekStart = val
  persistSettings()
}

function toggleHideCompleted() {
  settings.hideCompleted = !settings.hideCompleted
  persistSettings()
}

function toggleDesktopNotify() {
  if (!settings.desktopNotify) {
    if (typeof Notification === "undefined") {
      showToast("浏览器不支持桌面通知", "error")
      return
    }
    if (Notification.permission === "granted") {
      settings.desktopNotify = true
      persistSettings()
      return
    }
    if (Notification.permission !== "denied") {
      Notification.requestPermission().then(function (perm) {
        if (perm === "granted") {
          settings.desktopNotify = true
          persistSettings()
          showToast("桌面通知已开启")
        } else {
          showToast("未授权桌面通知", "error")
        }
      })
    } else {
      showToast("通知权限被拒绝，请在浏览器设置中开启", "error")
    }
  } else {
    settings.desktopNotify = false
    persistSettings()
  }
}

// ==================== Filters ====================

function setSearch(kw) { filters.search = kw }
function setTimeFilter(val) { filters.time = val }
function setStatusFilter(val) { filters.status = val }
function toggleTagFilter(id) {
  const idx = filters.selectedTagIds.indexOf(id)
  if (idx > -1) {
    filters.selectedTagIds.splice(idx, 1)
  } else {
    filters.selectedTagIds.push(id)
  }
}
function clearTagFilters() { filters.selectedTagIds.splice(0) }
function clearFilters() {
  filters.search = ""
  filters.time = "all"
  filters.status = "all"
  filters.selectedTagIds.splice(0)
}

// ==================== Occurrence expansion + filtering ====================

// Get all occurrences within a range (before filtering).
function getOccurrencesForRange(rangeStart, rangeEnd) {
  return expandAll(schedules.value, rangeStart, rangeEnd, exceptions.value)
}

// Apply filters (search + time + status + tag + hideCompleted) to occurrences.
function applyFilters(occs) {
  let result = occs

  // Search by keyword.
  const kw = (filters.search || "").trim().toLowerCase()
  if (kw) {
    result = result.filter(function (o) {
      return (o.title || "").toLowerCase().indexOf(kw) > -1 ||
             (o.remark || "").toLowerCase().indexOf(kw) > -1
    })
  }

  // Time dimension filter.
  if (filters.time === "today") {
    const now = new Date()
    result = result.filter(function (o) {
      const start = parseISO(o.startTime)
      return start && isSameDay(start, now)
    })
  } else if (filters.time === "future") {
    const todayStart = startOfDay(new Date())
    result = result.filter(function (o) {
      const start = parseISO(o.startTime)
      return start && start >= todayStart
    })
  } else if (filters.time === "past") {
    result = result.filter(function (o) { return isExpired(o) })
  }

  // Status dimension filter.
  if (filters.status === "undone") {
    result = result.filter(function (o) { return !o.isFinish })
  } else if (filters.status === "done") {
    result = result.filter(function (o) { return !!o.isFinish })
  }

  // Tag dimension filter (multi-select).
  if (filters.selectedTagIds.length > 0) {
    result = result.filter(function (o) {
      if (!o.tagId) return false
      return filters.selectedTagIds.indexOf(o.tagId) > -1
    })
  }

  // Hide completed toggle.
  if (settings.hideCompleted) {
    result = result.filter(function (o) { return !o.isFinish })
  }

  return result
}

// Get filtered occurrences for a range.
function getFilteredOccurrences(rangeStart, rangeEnd) {
  return applyFilters(getOccurrencesForRange(rangeStart, rangeEnd))
}

// ==================== Stats ====================

const stats = computed(function () {
  const now = new Date()
  const ws = settings.weekStart
  const weekStart = startOfWeek(now, ws)
  const weekEnd = addDays(weekStart, 7)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const weekOccs = expandAll(schedules.value, weekStart, weekEnd, exceptions.value)
  const monthOccs = expandAll(schedules.value, monthStart, monthEnd, exceptions.value)

  function countStats(occs) {
    const total = occs.length
    const done = occs.filter(function (o) { return !!o.isFinish }).length
    return { total: total, done: done, undone: total - done }
  }

  return {
    week: countStats(weekOccs),
    month: countStats(monthOccs)
  }
})

// ==================== Reminders ====================

function loadFiredReminders() {
  try {
    const today = new Date()
    const key = "fired_" + toDateStr(today)
    const raw = localStorage.getItem(key)
    if (raw) {
      const data = JSON.parse(raw)
      if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
          firedReminders[data[i]] = true
        }
      }
    }
  } catch (e) { /* ignore */ }
}

function saveFiredReminders() {
  try {
    const today = new Date()
    const key = "fired_" + toDateStr(today)
    const arr = Object.keys(firedReminders)
    localStorage.setItem(key, JSON.stringify(arr))
  } catch (e) { /* ignore */ }
}

function checkReminders() {
  const now = new Date()
  const dayStart = startOfDay(now)
  const dayEnd = addDays(dayStart, 1)
  const occs = expandAll(schedules.value, dayStart, dayEnd, exceptions.value)

  for (let i = 0; i < occs.length; i++) {
    const o = occs[i]
    if (!o.remindEnable) continue
    const rKey = o.occKey || o.id
    if (firedReminders[rKey]) continue

    const start = parseISO(o.startTime)
    if (!start) continue
    const remindAt = new Date(start.getTime() - (o.remindMinute || 0) * 60000)

    if (now >= remindAt) {
      firedReminders[rKey] = true
      activeReminders.push({
        key: rKey,
        title: o.title,
        time: o.startTime,
        schedule: o
      })
      // Desktop notification.
      if (settings.desktopNotify && typeof Notification !== "undefined" && Notification.permission === "granted") {
        try {
          new Notification(o.title, { body: "日程即将开始" })
        } catch (e) { /* ignore */ }
      }
    }
  }
  saveFiredReminders()
}

function dismissReminder(key) {
  const idx = activeReminders.findIndex(function (r) { return r.key === key })
  if (idx > -1) activeReminders.splice(idx, 1)
}

function startReminderLoop() {
  checkReminders()
  reminderTimer = setInterval(checkReminders, 60000)
}

function stopReminderLoop() {
  clearInterval(reminderTimer)
}

// ==================== Import / Export ====================

function handleExport() {
  if (schedules.value.length === 0) {
    showToast("暂无日程可导出", "error")
    return false
  }
  try {
    exportSchedules(schedules.value)
    showToast("已导出备份文件")
    return true
  } catch (e) {
    showToast("导出失败", "error")
    return false
  }
}

async function handleImport(file, mode) {
  // mode: "overwrite" | "append"
  try {
    const parsed = await parseImportFile(file)
    if (parsed.length === 0) {
      showToast("备份文件中没有日程数据", "error")
      return false
    }
    if (mode === "overwrite") {
      schedules.value = overwriteImport(parsed)
    } else {
      const before = schedules.value.length
      schedules.value = mergeImport(schedules.value, parsed)
      const added = schedules.value.length - before
      if (added === 0) {
        showToast("没有新增日程，均与现有重复")
        return true
      }
    }
    persistSchedules()
    showToast("导入成功")
    return true
  } catch (err) {
    const msg = typeof err === "string" ? err : "导入失败"
    showToast(msg, "error")
    return false
  }
}

// ==================== Export ====================

export {
  // State
  schedules, tags, exceptions, settings, filters, toast,
  activeReminders, stats,
  // Init
  init,
  // Tag helpers
  tagById, scheduleColor,
  // Schedule CRUD
  addSchedule, updateSchedule, deleteSchedule,
  editOccurrence, deleteOccurrence, toggleFinish, baseOf,
  // Tag CRUD
  addTag, updateTag, deleteTag,
  // Settings
  updateSettings, setTheme, setWeekStart, toggleHideCompleted, toggleDesktopNotify,
  // Filters
  setSearch, setTimeFilter, setStatusFilter, toggleTagFilter, clearTagFilters, clearFilters,
  // Occurrences
  getOccurrencesForRange, getFilteredOccurrences, applyFilters,
  // Reminders
  dismissReminder, checkReminders, stopReminderLoop,
  // Toast
  showToast,
  // Import/Export
  handleExport, handleImport,
  // Re-exports
  DEFAULT_TAGS
}
