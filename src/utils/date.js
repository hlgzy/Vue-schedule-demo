// Date helpers for the schedule app.
// All formatting uses local time; ISO strings keep the 'YYYY-MM-DDTHH:mm:ss' shape from the V1.0 spec.

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']
const MONTH_LABELS = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月'
]

// Pad a number to 2 digits.
function pad(n) {
  return String(n).padStart(2, '0')
}

// Add n days to a Date (returns a new Date).
export function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

// Return a Date at the start (00:00:00) of the given date's day.
export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

// Return a Date at the end (23:59:59.999) of the given date's day.
export function endOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

// Return the start of the week containing refDate, given weekStart (0=Sun, 1=Mon).
export function startOfWeek(refDate, weekStart) {
  const ws = weekStart == null ? 1 : weekStart
  const d = startOfDay(refDate)
  const offset = (d.getDay() - ws + 7) % 7
  return addDays(d, -offset)
}

// Build an 'YYYY-MM-DDTHH:mm:ss' string from a Date object (local time).
export function toLocalISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// Parse an ISO string ('YYYY-MM-DDTHH:mm:ss' or 'YYYY-MM-DD') into a Date.
export function parseISO(str) {
  if (!str) return null
  if (str.length === 10) {
    const [y, m, d] = str.split('-').map(Number)
    return new Date(y, m - 1, d, 0, 0, 0)
  }
  const [datePart, timePart] = str.split('T')
  const [y, m, d] = datePart.split('-').map(Number)
  const [h = 0, min = 0, s = 0] = (timePart || '').split(':').map(Number)
  return new Date(y, m - 1, d, h, min, s)
}

// 'YYYY-MM-DD' from a Date.
export function toDateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// 'HH:mm' from an ISO time string.
export function toTimeStr(iso) {
  const d = parseISO(iso)
  if (!d) return ''
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Human friendly date label, e.g. '10月9日'.
export function toDateLabel(iso) {
  const d = parseISO(iso)
  if (!d) return ''
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

// Full label with time, e.g. '2026-10-09 09:00'.
export function toFullLabel(iso, isAllDay = false) {
  if (isAllDay) {
    const d = parseISO(iso)
    if (!d) return ''
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} 全天`
  }
  const d = parseISO(iso)
  if (!d) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Header label for the month view, e.g. '2026年10月'.
export function monthHeader(year, month) {
  return `${year}年${MONTH_LABELS[month]}`
}

export function weekdayLabels(weekStart) {
  const ws = weekStart == null ? 1 : weekStart
  const out = []
  for (let i = 0; i < 7; i++) {
    out.push(WEEKDAY_LABELS[(ws + i) % 7])
  }
  return out
}

// Is the given date the same calendar day as today?
export function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

export function isToday(d) {
  return isSameDay(d, new Date())
}

// Is the date in the active month being rendered? (used to dim trailing/leading days)
export function isSameMonth(d, ref) {
  return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear()
}

// Generate a 6-row calendar grid (42 cells) for the month containing `refDate`,
// starting on the configured weekday (weekStart: 0=Sun, 1=Mon). Each cell is a Date object.
export function buildMonthGrid(refDate, weekStart) {
  const ws = weekStart == null ? 1 : weekStart
  const firstOfMonth = new Date(refDate.getFullYear(), refDate.getMonth(), 1)
  const offset = (firstOfMonth.getDay() - ws + 7) % 7
  const start = new Date(firstOfMonth)
  start.setDate(firstOfMonth.getDate() - offset)

  const cells = []
  const cursor = new Date(start)
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return cells
}

// Return the 7-day range {start, end} for the week containing refDate.
export function getWeekRange(refDate, weekStart) {
  const ws = weekStart == null ? 1 : weekStart
  const start = startOfWeek(refDate, ws)
  const end = addDays(start, 7)
  return { start, end }
}

// Does a schedule fall on a given Date (considering all-day spanning)?
export function scheduleOnDate(schedule, date) {
  const start = parseISO(schedule.startTime)
  if (!start) return false
  if (schedule.isAllDay) {
    // Span from start date to end date (inclusive).
    const end = parseISO(schedule.endTime) || start
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayStart.getDate() + 1)
    return start < dayEnd && end >= dayStart
  }
  return isSameDay(start, date)
}

// Is a schedule already past? (endTime earlier than now)
export function isExpired(schedule) {
  const end = parseISO(schedule.endTime || schedule.startTime)
  if (!end) return false
  if (schedule.isAllDay) {
    // Whole-day schedule expires at end-of-day on its end date.
    const dayEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59)
    return dayEnd < new Date()
  }
  return end < new Date()
}

// Compare two schedules for ascending sort by start time.
export function compareByStart(a, b) {
  const da = parseISO(a.startTime)
  const db = parseISO(b.startTime)
  return da - db
}

export { WEEKDAY_LABELS }
