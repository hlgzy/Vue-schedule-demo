<script setup>
import {
  filters, tags, settings, stats,
  setTimeFilter, setStatusFilter, toggleTagFilter, clearFilters
} from "../composables/useStore"

const TIME_OPTIONS = [
  { value: "all", label: "全部" },
  { value: "today", label: "今日" },
  { value: "future", label: "未来" },
  { value: "past", label: "已过期" }
]

const STATUS_OPTIONS = [
  { value: "all", label: "全部" },
  { value: "undone", label: "未完成" },
  { value: "done", label: "已完成" }
]

function isTagActive(id) {
  return filters.selectedTagIds.indexOf(id) > -1
}

const hasActiveFilters = () => {
  return filters.search || filters.time !== "all" || filters.status !== "all" || filters.selectedTagIds.length > 0
}
</script>

<template>
  <div class="filter-bar">
    <div class="filter-group">
      <span class="filter-label">时间</span>
      <div class="seg">
        <button
          v-for="opt in TIME_OPTIONS"
          :key="opt.value"
          type="button"
          class="seg-btn"
          :class="{ active: filters.time === opt.value }"
          @click="setTimeFilter(opt.value)"
        >{{ opt.label }}</button>
      </div>
    </div>

    <div class="filter-group">
      <span class="filter-label">状态</span>
      <div class="seg">
        <button
          v-for="opt in STATUS_OPTIONS"
          :key="opt.value"
          type="button"
          class="seg-btn"
          :class="{ active: filters.status === opt.value }"
          @click="setStatusFilter(opt.value)"
        >{{ opt.label }}</button>
      </div>
    </div>

    <div class="filter-group tag-filter">
      <span class="filter-label">标签</span>
      <div class="tag-chips">
        <button
          v-for="tag in tags"
          :key="tag.id"
          type="button"
          class="tag-chip"
          :class="{ active: isTagActive(tag.id) }"
          :style="isTagActive(tag.id) ? { background: tag.color, borderColor: tag.color } : {}"
          @click="toggleTagFilter(tag.id)"
        >{{ tag.name }}</button>
      </div>
    </div>

    <button v-if="hasActiveFilters()" type="button" class="btn btn-ghost btn-sm clear-btn" @click="clearFilters">清除筛选</button>

    <div class="stats-section">
      <div class="stat-card">
        <span class="stat-title">本周</span>
        <div class="stat-nums">
          <span class="stat-item">总 {{ stats.week.total }}</span>
          <span class="stat-item done">完成 {{ stats.week.done }}</span>
          <span class="stat-item undone">未完成 {{ stats.week.undone }}</span>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-title">本月</span>
        <div class="stat-nums">
          <span class="stat-item">总 {{ stats.month.total }}</span>
          <span class="stat-item done">完成 {{ stats.month.done }}</span>
          <span class="stat-item undone">未完成 {{ stats.month.undone }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.filter-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 10px 0;
}
.filter-group { display: flex; align-items: center; gap: 8px; }
.filter-label { font-size: 12px; color: var(--text); white-space: nowrap; }
.seg {
  display: inline-flex;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--surface, #fff);
}
.seg-btn {
  border: none;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  background: transparent;
  color: var(--text);
  font-family: inherit;
  transition: background .15s, color .15s;
}
.seg-btn:hover { background: var(--accent-bg); }
.seg-btn.active {
  background: var(--accent);
  color: #fff;
}
.tag-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.tag-chip {
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 4px 12px;
  font-size: 12px;
  cursor: pointer;
  background: var(--surface, #fff);
  color: var(--text-h);
  font-family: inherit;
  transition: all .15s;
}
.tag-chip:hover { border-color: var(--accent); }
.tag-chip.active { color: #fff; }
.btn-sm { padding: 5px 10px; font-size: 12px; }
.clear-btn { margin-left: auto; }
.stats-section {
  display: flex;
  gap: 12px;
  width: 100%;
  margin-top: 4px;
}
.stat-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  background: var(--surface-2, #f9f8f4);
  border: 1px solid var(--border);
}
.stat-title { font-size: 13px; color: var(--text-h); font-weight: 600; white-space: nowrap; }
.stat-nums { display: flex; gap: 10px; flex-wrap: wrap; }
.stat-item { font-size: 12px; color: var(--text); }
.stat-item.done { color: #21ba45; }
.stat-item.undone { color: #db2828; }
@media (max-width: 640px) {
  .filter-group { width: 100%; }
  .stats-section { flex-direction: column; }
}
</style>
