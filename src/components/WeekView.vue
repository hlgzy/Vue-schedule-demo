<script setup>
import { computed, ref } from "vue"
import {
  getWeekRange, weekdayLabels, isToday, isSameDay,
  parseISO, toTimeStr, toDateStr, startOfDay, addDays,
  scheduleOnDate
} from "../utils/date"
import {
  settings, getFilteredOccurrences, scheduleColor, toggleFinish
} from "../composables/useStore"

const emit = defineEmits(["create", "edit", "delete"])

const cursor = ref(new Date())

const weekRange = computed(() => getWeekRange(cursor.value, settings.weekStart))

const days = computed(() => {
  const start = weekRange.value.start
  const arr = []
  for (let i = 0; i < 7; i++) arr.push(addDays(start, i))
  return arr
})

const weekLabels = computed(() => weekdayLabels(settings.weekStart))

const occurrences = computed(() => {
  const r = weekRange.value
  return getFilteredOccurrences(r.start, r.end)
})

function occForDay(day) {
  return occurrences.value
    .filter(function (o) { return scheduleOnDate(o, day) })
    .sort(function (a, b) { return parseISO(a.startTime) - parseISO(b.startTime) })
}

function allDayForDay(day) {
  return occForDay(day).filter(function (o) { return o.isAllDay })
}

function timedForDay(day) {
  return occForDay(day).filter(function (o) { return !o.isAllDay })
}

const HOUR_HEIGHT = 40
const HOURS = []
for (var i = 0; i < 24; i++) { HOURS.push(i) }

function occStyle(occ) {
  const start = parseISO(occ.startTime)
  const end = parseISO(occ.endTime) || start
  const startMin = start.getHours() * 60 + start.getMinutes()
  const endMin = end.getHours() * 60 + end.getMinutes()
  const top = (startMin / 60) * HOUR_HEIGHT
  const height = Math.max(20, ((endMin - startMin) / 60) * HOUR_HEIGHT)
  return {
    top: top + "px",
    height: height + "px",
    background: scheduleColor(occ),
    opacity: occ.isFinish ? 0.5 : 1
  }
}

const headerLabel = computed(() => {
  const s = weekRange.value.start
  const e = addDays(s, 6)
  return s.getFullYear() + "年" + (s.getMonth() + 1) + "月" + s.getDate() + "日 - " +
         e.getMonth() + "月" + e.getDate() + "日"
})

function prevWeek() {
  cursor.value = addDays(cursor.value, -7)
}
function nextWeek() {
  cursor.value = addDays(cursor.value, 7)
}
function goToday() {
  cursor.value = new Date()
}

function onCellClick(day) {
  emit("create", toDateStr(day))
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
  <div class="week-view">
    <div class="cal-toolbar">
      <div class="cal-title">{{ headerLabel }}</div>
      <div class="cal-nav">
        <button class="btn btn-ghost" type="button" @click="prevWeek">‹ 上周</button>
        <button class="btn btn-ghost" type="button" @click="goToday">本周</button>
        <button class="btn btn-ghost" type="button" @click="nextWeek">下周 ›</button>
      </div>
    </div>

    <div class="week-grid-wrap">
      <div class="week-header-row">
        <div class="hour-col-header"></div>
        <div
          v-for="(day, i) in days"
          :key="i"
          class="day-header"
          :class="{ 'is-today': isToday(day) }"
        >
          <span class="day-wk">{{ weekLabels[i] }}</span>
          <span class="day-num">{{ day.getDate() }}</span>
        </div>
      </div>

      <div class="all-day-row">
        <div class="hour-col-header">全天</div>
        <div
          v-for="(day, i) in days"
          :key="'ad' + i"
          class="day-all-day"
          @click="onCellClick(day)"
        >
          <div
            v-for="o in allDayForDay(day)"
            :key="o.id"
            class="all-day-chip"
            :style="{ background: scheduleColor(o), opacity: o.isFinish ? 0.5 : 1 }"
            :class="{ 'is-finish': o.isFinish }"
            @click="onOccClick(o, $event)"
          >{{ o.title }}</div>
        </div>
      </div>

      <div class="time-grid">
        <div class="hour-col">
          <div v-for="h in HOURS" :key="h" class="hour-label">{{ h < 10 ? "0" + h : h }}:00</div>
        </div>
        <div class="day-columns">
          <div
            v-for="(day, i) in days"
            :key="'col' + i"
            class="day-column"
            :class="{ 'is-today-col': isToday(day) }"
            @click="onCellClick(day)"
          >
            <div class="hour-lines">
              <div v-for="h in HOURS" :key="h" class="hour-line"></div>
            </div>
            <div
              v-for="o in timedForDay(day)"
              :key="o.id"
              class="time-block"
              :style="occStyle(o)"
              @click="onOccClick(o, $event)"
            >
              <div class="block-time">{{ toTimeStr(o.startTime) }}</div>
              <div class="block-title" :class="{ 'is-finish': o.isFinish }">{{ o.title }}</div>
              <button v-if="!o.isOccurrence || true" class="block-btn finish-btn" type="button" @click="onToggleFinish(o, $event)">{{ o.isFinish ? "✓" : "○" }}</button>
              <button class="block-btn del-btn" type="button" @click="onDelete(o, $event)">×</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.week-view { display: flex; flex-direction: column; gap: 12px; }
.cal-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: 10px;
}
.cal-title { font-size: 20px; font-weight: 600; color: var(--text-h); }
.cal-nav { display: flex; gap: 6px; }
.week-grid-wrap {
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--surface, #fff);
}
.week-header-row {
  display: grid;
  grid-template-columns: 48px repeat(7, 1fr);
  border-bottom: 1px solid var(--border);
  background: var(--surface-2, #f9f8f4);
}
.hour-col-header {
  padding: 8px 4px;
  text-align: center;
  font-size: 11px;
  color: var(--text);
  border-right: 1px solid var(--border);
}
.day-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 0;
  border-right: 1px solid var(--border);
}
.day-header:last-child { border-right: none; }
.day-wk { font-size: 12px; color: var(--text); }
.day-num { font-size: 15px; color: var(--text-h); font-weight: 600; }
.day-header.is-today .day-num {
  background: var(--accent);
  color: #fff;
  border-radius: 50%;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.all-day-row {
  display: grid;
  grid-template-columns: 48px repeat(7, 1fr);
  border-bottom: 2px solid var(--border);
  min-height: 32px;
}
.day-all-day {
  border-right: 1px solid var(--border);
  padding: 2px 3px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  cursor: pointer;
}
.day-all-day:last-child { border-right: none; }
.all-day-chip {
  font-size: 11px;
  color: #fff;
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}
.all-day-chip.is-finish { text-decoration: line-through; }
.time-grid {
  display: grid;
  grid-template-columns: 48px 1fr;
  max-height: 600px;
  overflow-y: auto;
}
.hour-col {
  border-right: 1px solid var(--border);
}
.hour-label {
  height: 40px;
  font-size: 10px;
  color: var(--text);
  text-align: right;
  padding-right: 4px;
  border-bottom: 1px solid var(--border);
  opacity: 0.7;
}
.day-columns {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  position: relative;
}
.day-column {
  border-right: 1px solid var(--border);
  position: relative;
  cursor: pointer;
}
.day-column:last-child { border-right: none; }
.day-column.is-today-col { background: var(--accent-bg); }
.hour-lines {
  position: absolute;
  inset: 0;
}
.hour-line {
  height: 40px;
  border-bottom: 1px solid var(--border);
}
.time-block {
  position: absolute;
  left: 2px;
  right: 2px;
  border-radius: 4px;
  padding: 3px 6px;
  color: #fff;
  font-size: 11px;
  overflow: hidden;
  cursor: pointer;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.block-time { font-weight: 600; opacity: 0.9; }
.block-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.block-title.is-finish { text-decoration: line-through; }
.block-btn {
  position: absolute;
  top: 2px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  padding: 1px 4px;
  line-height: 1;
}
.finish-btn { right: 18px; background: rgba(255,255,255,0.3); color: #fff; }
.del-btn { right: 2px; background: rgba(0,0,0,0.2); color: #fff; }
@media (max-width: 640px) {
  .time-grid { max-height: 400px; }
  .block-title { font-size: 10px; }
}
</style>
