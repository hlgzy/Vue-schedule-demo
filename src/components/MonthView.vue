<script setup>
import { computed, ref } from "vue"
import {
  buildMonthGrid, weekdayLabels, isToday, isSameMonth,
  scheduleOnDate, toDateStr, toTimeStr, monthHeader,
  startOfDay, addDays
} from "../utils/date"
import {
  settings, getFilteredOccurrences, scheduleColor, toggleFinish, tagById
} from "../composables/useStore"

const emit = defineEmits(["create", "edit", "delete"])

const cursor = ref(new Date())

const grid = computed(() => buildMonthGrid(cursor.value, settings.weekStart))
const headerLabel = computed(() => monthHeader(cursor.value.getFullYear(), cursor.value.getMonth()))
const wLabels = computed(() => weekdayLabels(settings.weekStart))

// Expand occurrences for the full grid range (includes trailing/leading days).
const occurrences = computed(() => {
  const cells = grid.value
  if (cells.length === 0) return []
  const rangeStart = startOfDay(cells[0])
  const rangeEnd = addDays(startOfDay(cells[cells.length - 1]), 1)
  return getFilteredOccurrences(rangeStart, rangeEnd)
})

// Schedules that land on a given cell date, sorted by start time.
function occForCell(date) {
  return occurrences.value
    .filter(function (o) { return scheduleOnDate(o, date) })
    .sort(function (a, b) { return new Date(a.startTime) - new Date(b.startTime) })
}

function prevMonth() {
  const d = new Date(cursor.value)
  d.setDate(1)
  d.setMonth(d.getMonth() - 1)
  cursor.value = d
}
function nextMonth() {
  const d = new Date(cursor.value)
  d.setDate(1)
  d.setMonth(d.getMonth() + 1)
  cursor.value = d
}
function goToday() {
  cursor.value = new Date()
}

function onCellClick(date) {
  emit("create", toDateStr(date))
}
function onOccClick(occ, e) {
  e.stopPropagation()
  emit("edit", occ)
}
function onDelete(occ, e) {
  e.stopPropagation()
  emit("delete", occ)
}
function onToggleFinish(occ, e) {
  e.stopPropagation()
  toggleFinish(occ)
}
</script>

<template>
  <div class="month-view">
    <div class="cal-toolbar">
      <div class="cal-title">{{ headerLabel }}</div>
      <div class="cal-nav">
        <button class="btn btn-ghost" type="button" @click="prevMonth">‹ 上月</button>
        <button class="btn btn-ghost" type="button" @click="goToday">回到今天</button>
        <button class="btn btn-ghost" type="button" @click="nextMonth">下月 ›</button>
      </div>
    </div>

    <div class="cal-weekdays">
      <div v-for="(w, i) in wLabels" :key="i" class="weekday">{{ w }}</div>
    </div>

    <div class="cal-grid">
      <div
        v-for="(cell, idx) in grid"
        :key="idx"
        class="cal-cell"
        :class="{
          'is-today': isToday(cell),
          'out-month': !isSameMonth(cell, cursor),
          'is-weekend': idx % 7 === 5 || idx % 7 === 6
        }"
        @click="onCellClick(cell)"
      >
        <div class="cell-date">
          <span class="date-num">{{ cell.getDate() }}</span>
        </div>
        <div class="cell-events">
          <div
            v-for="o in occForCell(cell)"
            :key="o.id"
            class="event-chip"
            :style="{ background: scheduleColor(o), opacity: o.isFinish ? 0.5 : 1 }"
            @click="onOccClick(o, $event)"
          >
            <span class="event-time">{{ o.isAllDay ? "全天" : toTimeStr(o.startTime) }}</span>
            <span class="event-title" :class="{ 'is-finish': o.isFinish }">{{ o.title }}</span>
            <button class="chip-btn" type="button" @click="onToggleFinish(o, $event)">{{ o.isFinish ? "✓" : "○" }}</button>
            <button class="chip-btn del" type="button" @click="onDelete(o, $event)">×</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.month-view { display: flex; flex-direction: column; gap: 12px; }
.cal-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: 10px;
}
.cal-title { font-size: 20px; font-weight: 600; color: var(--text-h); }
.cal-nav { display: flex; gap: 6px; }
.cal-weekdays {
  display: grid; grid-template-columns: repeat(7, 1fr);
  border: 1px solid var(--border); border-radius: 8px 8px 0 0; overflow: hidden;
  background: var(--surface-2, #f7f6f2);
}
.weekday {
  padding: 8px 0; text-align: center; font-size: 13px; color: var(--text);
  font-weight: 500;
}
.cal-grid {
  display: grid; grid-template-columns: repeat(7, 1fr);
  border: 1px solid var(--border); border-top: none; border-radius: 0 0 8px 8px;
  overflow: hidden;
  grid-auto-rows: minmax(92px, 1fr);
}
.cal-cell {
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  padding: 4px 4px 2px;
  min-height: 92px;
  cursor: pointer;
  background: var(--surface, #fff);
  transition: background .12s;
  display: flex; flex-direction: column; gap: 3px;
  overflow: hidden;
}
.cal-cell:hover { background: var(--accent-bg); }
.cal-cell.out-month { background: var(--surface-2, #fbfaf8); }
.cal-cell.out-month .date-num { color: var(--text); opacity: 0.4; }
.cell-date { display: flex; justify-content: flex-end; }
.date-num { font-size: 13px; color: var(--text); line-height: 1.2; }
.cal-cell.is-today .date-num {
  background: var(--accent); color: #fff; border-radius: 50%;
  width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;
  font-weight: 600;
}
.cell-events { display: flex; flex-direction: column; gap: 3px; overflow: hidden; }
.event-chip {
  display: flex; align-items: center; gap: 4px;
  color: #fff; font-size: 11px; line-height: 1.3;
  padding: 2px 4px 2px 6px; border-radius: 4px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  cursor: pointer; position: relative;
}
.event-time { font-weight: 600; opacity: .9; flex-shrink: 0; }
.event-title { overflow: hidden; text-overflow: ellipsis; flex: 1; }
.event-title.is-finish { text-decoration: line-through; }
.chip-btn {
  border: none; border-radius: 3px; cursor: pointer;
  font-size: 11px; padding: 0 3px; line-height: 1.3;
  background: rgba(255,255,255,0.25); color: #fff;
}
.chip-btn.del { background: rgba(0,0,0,0.2); }
.chip-btn:hover { background: rgba(255,255,255,0.4); }
@media (max-width: 640px) {
  .cal-grid { grid-auto-rows: minmax(68px, 1fr); }
  .event-chip { font-size: 10px; padding: 1px 2px 1px 4px; }
  .event-time { display: none; }
  .chip-btn { display: none; }
  .weekday { font-size: 11px; }
}
</style>
