<script setup>
import { computed } from "vue"
import { isExpired, toFullLabel, parseISO, startOfDay, addDays } from "../utils/date"
import { sortByTime } from "../utils/storage"
import {
  settings, getFilteredOccurrences, scheduleColor, toggleFinish, tagById
} from "../composables/useStore"

const emit = defineEmits(["edit", "delete"])

// Use a wide range: from 1 year ago to 1 year ahead.
const occurrences = computed(() => {
  const now = new Date()
  const rangeStart = addDays(startOfDay(now), -365)
  const rangeEnd = addDays(startOfDay(now), 365)
  return getFilteredOccurrences(rangeStart, rangeEnd)
})

const items = computed(() => sortByTime(occurrences.value))

function formatRange(s) {
  const start = toFullLabel(s.startTime)
  const end = toFullLabel(s.endTime)
  return start === end ? start : (start + " ~ " + end)
}

function tagName(o) {
  var t = tagById(o.tagId)
  return t ? t.name : ""
}
</script>

<template>
  <div class="list-view">
    <div v-if="items.length === 0" class="empty">
      <p>暂无日程</p>
      <span>点击右上角"新建"或在月视图日历上点击日期来添加日程</span>
    </div>

    <ul v-else class="list">
      <li
        v-for="o in items"
        :key="o.id"
        class="list-item"
        :class="{ expired: isExpired(o), 'is-finish': o.isFinish }"
      >
        <span class="dot" :style="{ background: scheduleColor(o) }"></span>
        <div class="item-main" @click="emit('edit', o)">
          <div class="item-title" :class="{ 'is-finish': o.isFinish }">{{ o.title }}</div>
          <div class="item-meta">
            <span class="item-time">{{ o.isAllDay ? "全天" : formatRange(o) }}</span>
            <span v-if="tagName(o)" class="item-tag" :style="{ color: scheduleColor(o) }">{{ tagName(o) }}</span>
            <span v-if="o.remark" class="item-remark">{{ o.remark }}</span>
          </div>
        </div>
        <div class="item-actions">
          <button class="btn btn-ghost btn-sm" type="button" @click="toggleFinish(o)">{{ o.isFinish ? "取消完成" : "完成" }}</button>
          <button class="btn btn-ghost btn-sm" type="button" @click="emit('edit', o)">编辑</button>
          <button class="btn btn-danger-ghost btn-sm" type="button" @click="emit('delete', o)">删除</button>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.list-view { width: 100%; }
.empty {
  text-align: center; padding: 60px 16px; color: var(--text);
  display: flex; flex-direction: column; gap: 6px;
}
.empty p { font-size: 16px; color: var(--text-h); margin: 0; }
.empty span { font-size: 13px; }
.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.list-item {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 14px; border: 1px solid var(--border); border-radius: 10px;
  background: var(--surface, #fff);
}
.list-item:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.list-item.expired { opacity: .55; }
.list-item.is-finish { opacity: .6; }
.dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.item-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; cursor: pointer; }
.item-title { font-size: 15px; color: var(--text-h); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-title.is-finish, .list-item.is-finish .item-title { text-decoration: line-through; }
.item-meta { display: flex; gap: 12px; flex-wrap: wrap; font-size: 12px; color: var(--text); }
.item-tag { font-weight: 500; }
.item-remark { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 320px; }
.item-actions { display: flex; gap: 6px; flex-shrink: 0; }
.btn-sm { padding: 5px 10px; font-size: 12px; }
@media (max-width: 640px) {
  .item-remark { display: none; }
  .item-title { white-space: normal; }
}
</style>
