<script setup>
import { computed, ref } from "vue"
import {
  isToday, parseISO, toTimeStr, toDateStr, toFullLabel,
  startOfDay, addDays, scheduleOnDate
} from "../utils/date"
import {
  settings, getFilteredOccurrences, scheduleColor, toggleFinish, tagById
} from "../composables/useStore"

const emit = defineEmits(["create", "edit", "delete"])

const cursor = ref(new Date())

const dayStart = computed(() => startOfDay(cursor.value))
const dayEnd = computed(() => addDays(dayStart.value, 1))

const occurrences = computed(() => {
  return getFilteredOccurrences(dayStart.value, dayEnd.value)
})

const allDayOccs = computed(() => {
  return occurrences.value
    .filter(function (o) { return o.isAllDay })
    .sort(function (a, b) { return parseISO(a.startTime) - parseISO(b.startTime) })
})

const timedOccs = computed(() => {
  return occurrences.value
    .filter(function (o) { return !o.isAllDay })
    .sort(function (a, b) { return parseISO(a.startTime) - parseISO(b.startTime) })
})

const headerLabel = computed(() => {
  const d = cursor.value
  var wkLabels
  if (settings.weekStart === 0) {
    wkLabels = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
  } else {
    wkLabels = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
  }
  var idx = d.getDay()
  // Adjust for week start
  var label = wkLabels[idx]
  return d.getFullYear() + "年" + (d.getMonth() + 1) + "月" + d.getDate() + "日 " + label
})

function prevDay() {
  cursor.value = addDays(cursor.value, -1)
}
function nextDay() {
  cursor.value = addDays(cursor.value, 1)
}
function goToday() {
  cursor.value = new Date()
}

function onCreate() {
  emit("create", toDateStr(cursor.value))
}
function onEdit(occ) {
  emit("edit", occ)
}
function onDelete(occ) {
  emit("delete", occ)
}
function onToggleFinish(occ) {
  toggleFinish(occ)
}
function tagName(occ) {
  var t = tagById(occ.tagId)
  return t ? t.name : ""
}
</script>

<template>
  <div class="day-view">
    <div class="cal-toolbar">
      <div class="cal-title">
        {{ headerLabel }}
        <span v-if="isToday(cursor)" class="today-badge">今天</span>
      </div>
      <div class="cal-nav">
        <button class="btn btn-ghost" type="button" @click="prevDay">‹ 前一天</button>
        <button class="btn btn-ghost" type="button" @click="goToday">今天</button>
        <button class="btn btn-ghost" type="button" @click="nextDay">后一天 ›</button>
        <button class="btn btn-primary" type="button" @click="onCreate">+ 新建</button>
      </div>
    </div>

    <div v-if="allDayOccs.length > 0" class="all-day-section">
      <h3 class="section-title">全天</h3>
      <div class="all-day-list">
        <div
          v-for="o in allDayOccs"
          :key="o.id"
          class="day-item all-day-item"
          :style="{ borderLeftColor: scheduleColor(o) }"
          @click="onEdit(o)"
        >
          <span class="item-color-dot" :style="{ background: scheduleColor(o) }"></span>
          <span class="item-name" :class="{ 'is-finish': o.isFinish }">{{ o.title }}</span>
          <span v-if="tagName(o)" class="item-tag" :style="{ color: scheduleColor(o) }">{{ tagName(o) }}</span>
          <div class="item-actions">
            <button class="btn btn-ghost btn-sm" type="button" @click.stop="onToggleFinish(o)">{{ o.isFinish ? "取消完成" : "完成" }}</button>
            <button class="btn btn-ghost btn-sm" type="button" @click.stop="onEdit(o)">编辑</button>
            <button class="btn btn-danger-ghost btn-sm" type="button" @click.stop="onDelete(o)">删除</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="timedOccs.length === 0 && allDayOccs.length === 0" class="empty">
      <p>今日暂无日程</p>
      <span>点击右上角"新建"添加日程</span>
    </div>

    <div v-if="timedOccs.length > 0" class="timed-section">
      <h3 class="section-title">时段日程</h3>
      <ul class="timed-list">
        <li
          v-for="o in timedOccs"
          :key="o.id"
          class="day-item"
          :style="{ borderLeftColor: scheduleColor(o) }"
          :class="{ 'is-finish': o.isFinish }"
          @click="onEdit(o)"
        >
          <div class="item-time-col">
            <span class="item-time">{{ toTimeStr(o.startTime) }}</span>
            <span class="item-time-end">{{ toTimeStr(o.endTime) }}</span>
          </div>
          <span class="item-color-dot" :style="{ background: scheduleColor(o) }"></span>
          <div class="item-main">
            <div class="item-name" :class="{ 'is-finish': o.isFinish }">{{ o.title }}</div>
            <div class="item-meta">
              <span v-if="tagName(o)" class="item-tag" :style="{ color: scheduleColor(o) }">{{ tagName(o) }}</span>
              <span v-if="o.remark" class="item-remark">{{ o.remark }}</span>
            </div>
          </div>
          <div class="item-actions">
            <button class="btn btn-ghost btn-sm" type="button" @click.stop="onToggleFinish(o)">{{ o.isFinish ? "取消完成" : "完成" }}</button>
            <button class="btn btn-ghost btn-sm" type="button" @click.stop="onEdit(o)">编辑</button>
            <button class="btn btn-danger-ghost btn-sm" type="button" @click.stop="onDelete(o)">删除</button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.day-view { display: flex; flex-direction: column; gap: 12px; }
.cal-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: 10px;
}
.cal-title { font-size: 20px; font-weight: 600; color: var(--text-h); display: flex; align-items: center; gap: 8px; }
.today-badge {
  font-size: 12px; background: var(--accent); color: #fff;
  padding: 2px 8px; border-radius: 10px;
}
.cal-nav { display: flex; gap: 6px; flex-wrap: wrap; }
.section-title { font-size: 14px; color: var(--text-h); margin-bottom: 8px; }
.all-day-section { margin-bottom: 8px; }
.all-day-list { display: flex; flex-direction: column; gap: 6px; }
.all-day-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px;
  background: var(--surface, #fff);
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  border-radius: 8px;
  cursor: pointer;
}
.empty {
  text-align: center; padding: 60px 16px; color: var(--text);
  display: flex; flex-direction: column; gap: 6px;
}
.empty p { font-size: 16px; color: var(--text-h); }
.timed-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.day-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  border-radius: 8px;
  background: var(--surface, #fff);
  cursor: pointer;
  transition: box-shadow .12s;
}
.day-item:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.day-item.is-finish { opacity: 0.55; }
.day-item.is-finish .item-name { text-decoration: line-through; }
.item-time-col { display: flex; flex-direction: column; align-items: flex-end; min-width: 48px; }
.item-time { font-size: 14px; color: var(--text-h); font-weight: 600; }
.item-time-end { font-size: 11px; color: var(--text); }
.item-color-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.item-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.item-name { font-size: 14px; color: var(--text-h); font-weight: 500; }
.item-name.is-finish { text-decoration: line-through; }
.item-meta { display: flex; gap: 8px; flex-wrap: wrap; font-size: 12px; }
.item-tag { font-weight: 500; }
.item-remark { color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px; }
.item-actions { display: flex; gap: 4px; flex-shrink: 0; }
.btn-sm { padding: 4px 8px; font-size: 12px; }
@media (max-width: 640px) {
  .item-remark { display: none; }
  .item-actions .btn-sm { padding: 4px 6px; }
}
</style>
