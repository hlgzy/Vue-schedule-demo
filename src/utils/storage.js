// localStorage persistence + data helpers for schedules.
// V1.0 stores everything locally under the `schedule_data` key as a JSON array.
// V1.5 adds tags, exceptions, settings, and schedule field migration.

import { compareByStart } from './date'

const STORAGE_KEY = 'schedule_data'
const TAGS_KEY = 'schedule_tag_list'
const EXCEPTIONS_KEY = 'schedule_exceptions'
const SETTINGS_KEY = 'schedule_settings'

// Built-in default tags (cannot be deleted by the user).
export const DEFAULT_TAGS = [
  { id: 'tag_work', name: '工作', color: '#2185d0' },
  { id: 'tag_study', name: '学习', color: '#21ba45' },
  { id: 'tag_life', name: '生活', color: '#f5a623' },
  { id: 'tag_private', name: '私事', color: '#db2828' }
]

// Default settings for V1.5.
export const DEFAULT_SETTINGS = {
  theme: 'light',      // 'light' | 'dark'
  weekStart: 1,        // 0=Sunday, 1=Monday
  hideCompleted: false,
  desktopNotify: false
}

// Migrate a single schedule object to the V1.5 schema (adds default fields).
export function migrateSchedule(s) {
  return Object.assign({
    tagId: '',
    isFinish: false,
    repeatType: 'none',
    repeatRule: [],
    repeatEndType: 'forever',
    repeatEndDate: '',
    repeatCount: 0,
    remindEnable: false,
    remindMinute: 15
  }, s)
}

// Preset color palette (blue / red / green / yellow / gray).
export const PRESET_COLORS = [
  { value: '#2185d0', label: '蓝' },
  { value: '#db2828', label: '红' },
  { value: '#21ba45', label: '绿' },
  { value: '#f5a623', label: '黄' },
  { value: '#909399', label: '灰' }
]

// Generate a unique id (crypto.randomUUID when available, fallback otherwise).
export function genId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
}

// Read all schedules from localStorage. Always returns an array.
// V1.5: migrates old schedules to the new schema on load.
export function loadSchedules() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    return data.map(migrateSchedule)
  } catch (e) {
    console.error('Failed to load schedules:', e)
    return []
  }
}

// --- Tags ---
// Load tags, falling back to DEFAULT_TAGS if none stored.
export function loadTags() {
  try {
    const raw = localStorage.getItem(TAGS_KEY)
    if (!raw) return [...DEFAULT_TAGS]
    const data = JSON.parse(raw)
    return Array.isArray(data) && data.length > 0 ? data : [...DEFAULT_TAGS]
  } catch (e) {
    console.error('Failed to load tags:', e)
    return [...DEFAULT_TAGS]
  }
}

export function saveTags(tags) {
  try {
    localStorage.setItem(TAGS_KEY, JSON.stringify(tags))
    return true
  } catch (e) {
    console.error('Failed to save tags:', e)
    return false
  }
}

// --- Repeat exceptions ---
// Exceptions stored as [{key, type, data?}] where key = `${baseId}_${YYYY-MM-DD}`.
export function loadExceptions() {
  try {
    const raw = localStorage.getItem(EXCEPTIONS_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch (e) {
    console.error('Failed to load exceptions:', e)
    return []
  }
}

export function saveExceptions(exceptions) {
  try {
    localStorage.setItem(EXCEPTIONS_KEY, JSON.stringify(exceptions))
    return true
  } catch (e) {
    console.error('Failed to save exceptions:', e)
    return false
  }
}

// --- Settings ---
export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    return Object.assign({ ...DEFAULT_SETTINGS }, JSON.parse(raw))
  } catch (e) {
    console.error('Failed to load settings:', e)
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    return true
  } catch (e) {
    console.error('Failed to save settings:', e)
    return false
  }
}

// Persist the full schedule array.
export function saveSchedules(schedules) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules))
    return true
  } catch (e) {
    console.error('Failed to save schedules:', e)
    return false
  }
}

// Filter schedules by a keyword (title or remark, case-insensitive).
// Empty keyword returns the original list.
export function searchSchedules(schedules, keyword) {
  const kw = (keyword || '').trim().toLowerCase()
  if (!kw) return [...schedules]
  return schedules.filter(s =>
    (s.title || '').toLowerCase().includes(kw) ||
    (s.remark || '').toLowerCase().includes(kw)
  )
}

// Sort schedules ascending by start time (returns a new array).
export function sortByTime(schedules) {
  return [...schedules].sort(compareByStart)
}

// Validate a parsed schedule object. Returns an error message string or null.
export function validateSchedule(schedule) {
  if (!schedule.title || !schedule.title.trim()) {
    return '日程标题不能为空'
  }
  if (schedule.title.length > 50) {
    return '日程标题不能超过50字'
  }
  if (!schedule.startTime || !schedule.endTime) {
    return '请选择开始和结束时间'
  }
  // For non-all-day schedules the end must not be earlier than the start.
  if (!schedule.isAllDay) {
    const start = new Date(schedule.startTime)
    const end = new Date(schedule.endTime)
    if (end < start) {
      return '结束时间不能早于开始时间'
    }
  }
  return null
}

// Export schedules to a downloaded .json file.
export function exportSchedules(schedules) {
  const payload = {
    app: 'schedule-demo',
    version: '1.5',
    exportedAt: new Date().toISOString(),
    data: schedules
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  a.href = url
  a.download = `schedule-backup-${stamp}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Parse an uploaded JSON file. Resolves with the schedule array, rejects on bad format.
export function parseImportFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result)
        // Support both { data: [...] } wrapper and a bare array.
        const arr = Array.isArray(parsed) ? parsed : parsed?.data
        if (!Array.isArray(arr)) {
          reject('文件格式不正确：未找到日程数组')
          return
        }
        // Lightweight sanity check on each item.
        // V1.5: preserve all fields via migrateSchedule.
        const clean = arr
          .filter(item => item && typeof item === 'object')
          .map(item => migrateSchedule(Object.assign({
            id: genId(),
            title: String(item.title || ''),
            isAllDay: !!item.isAllDay,
            startTime: item.startTime || '',
            endTime: item.endTime || '',
            remark: item.remark || '',
            color: item.color || PRESET_COLORS[0].value
          }, item)))
        resolve(clean)
      } catch (e) {
        reject('文件解析失败：' + e.message)
      }
    }
    reader.onerror = () => reject('读取文件失败')
    reader.readAsText(file)
  })
}

// Merge imported schedules into existing ones (incremental append).
export function mergeImport(existing, imported) {
  const existingIds = new Set(existing.map(s => s.id))
  const appended = imported.filter(s => !existingIds.has(s.id))
  // For colliding ids, keep the existing one (do not silently overwrite on append).
  return [...existing, ...appended]
}

// Replace existing schedules with imported ones (overwrite).
export function overwriteImport(imported) {
  return [...imported]
}
