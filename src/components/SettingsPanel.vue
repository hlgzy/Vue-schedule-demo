<script setup>
import {
  settings,
  setTheme,
  setWeekStart,
  toggleHideCompleted,
  toggleDesktopNotify
} from "../composables/useStore"

defineProps({
  visible: { type: Boolean, default: false }
})

const emit = defineEmits(["close"])

function onBackdrop(e) {
  if (e.target === e.currentTarget) emit("close")
}
</script>

<template>
  <div v-if="visible" class="modal-backdrop" @click="onBackdrop">
    <div class="modal-card" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h2>设置</h2>
        <button class="icon-btn" type="button" @click="emit('close')" aria-label="关闭">×</button>
      </div>

      <div class="modal-body">
        <div class="setting-row">
          <div class="setting-label">
            <span class="setting-title">主题模式</span>
            <span class="setting-desc">切换浅色 / 深色主题</span>
          </div>
          <div class="seg">
            <button
              type="button"
              class="seg-btn"
              :class="{ active: settings.theme === 'light' }"
              @click="setTheme('light')"
            >浅色</button>
            <button
              type="button"
              class="seg-btn"
              :class="{ active: settings.theme === 'dark' }"
              @click="setTheme('dark')"
            >深色</button>
          </div>
        </div>

        <div class="setting-row">
          <div class="setting-label">
            <span class="setting-title">周起始日</span>
            <span class="setting-desc">日历视图从周几开始</span>
          </div>
          <div class="seg">
            <button
              type="button"
              class="seg-btn"
              :class="{ active: settings.weekStart === 1 }"
              @click="setWeekStart(1)"
            >周一</button>
            <button
              type="button"
              class="seg-btn"
              :class="{ active: settings.weekStart === 0 }"
              @click="setWeekStart(0)"
            >周日</button>
          </div>
        </div>

        <div class="setting-row">
          <div class="setting-label">
            <span class="setting-title">隐藏已完成</span>
            <span class="setting-desc">在所有视图中隐藏已完成的日程</span>
          </div>
          <label class="toggle">
            <input type="checkbox" :checked="settings.hideCompleted" @change="toggleHideCompleted" />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="setting-row">
          <div class="setting-label">
            <span class="setting-title">桌面通知</span>
            <span class="setting-desc">开启浏览器桌面提醒通知</span>
          </div>
          <label class="toggle">
            <input type="checkbox" :checked="settings.desktopNotify" @change="toggleDesktopNotify" />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 17, 23, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 16px;
}
.modal-card {
  width: 100%;
  max-width: 440px;
  background: var(--surface, #fff);
  border-radius: 12px;
  box-shadow: 0 20px 45px rgba(0,0,0,0.18);
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}
.modal-header h2 { margin: 0; font-size: 18px; color: var(--text-h); }
.modal-body { padding: 8px 20px 20px; display: flex; flex-direction: column; gap: 4px; }
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-bottom: 1px solid var(--border);
  gap: 12px;
}
.setting-row:last-child { border-bottom: none; }
.setting-label { display: flex; flex-direction: column; gap: 2px; }
.setting-title { font-size: 14px; color: var(--text-h); font-weight: 500; }
.setting-desc { font-size: 12px; color: var(--text); }
.seg {
  display: inline-flex;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--surface, #fff);
}
.seg-btn {
  border: none;
  padding: 7px 14px;
  font-size: 13px;
  cursor: pointer;
  background: transparent;
  color: var(--text);
  font-family: inherit;
  transition: background .15s, color .15s;
}
.seg-btn.active {
  background: var(--accent);
  color: #fff;
}
.toggle {
  position: relative;
  display: inline-block;
  width: 42px;
  height: 24px;
  flex-shrink: 0;
}
.toggle input { opacity: 0; width: 0; height: 0; }
.toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: var(--border);
  border-radius: 24px;
  transition: background .2s;
}
.toggle-slider::before {
  content: "";
  position: absolute;
  width: 18px;
  height: 18px;
  left: 3px;
  top: 3px;
  background: #fff;
  border-radius: 50%;
  transition: transform .2s;
}
.toggle input:checked + .toggle-slider { background: var(--accent); }
.toggle input:checked + .toggle-slider::before { transform: translateX(18px); }
.icon-btn {
  border: none; background: transparent; font-size: 22px; line-height: 1;
  color: var(--text); cursor: pointer; padding: 4px 6px; border-radius: 6px;
}
.icon-btn:hover { background: var(--border); }
</style>
