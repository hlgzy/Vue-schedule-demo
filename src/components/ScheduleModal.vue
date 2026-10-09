<script setup>
import { ref, reactive, computed, watch } from "vue"
import { PRESET_COLORS, validateSchedule } from "../utils/storage"
import { toLocalISO, toDateStr, parseISO } from "../utils/date"
import { tags } from "../composables/useStore"

const props = defineProps({
  visible: { type: Boolean, default: false },
  schedule: { type: Object, default: null },
  prefillDate: { type: String, default: "" }
})

const emit = defineEmits(["save", "close"])

const isEdit = computed(() => !!props.schedule)

const WEEKDAY_OPTIONS = [
  { value: 0, label: "日" },
  { value: 1, label: "一" },
  { value: 2, label: "二" },
  { value: 3, label: "三" },
  { value: 4, label: "四" },
  { value: 5, label: "五" },
  { value: 6, label: "六" }
]

const REMIND_OPTIONS = [
  { value: 5, label: "5分钟" },
  { value: 15, label: "15分钟" },
  { value: 30, label: "30分钟" },
  { value: 60, label: "1小时" },
  { value: 1440, label: "1天" }
]

const REPEAT_TYPES = [
  { value: "none", label: "不重复" },
  { value: "day", label: "每天" },
  { value: "week", label: "每周" },
  { value: "month", label: "每月" },
  { value: "year", label: "每年" }
]

const REPEAT_END_TYPES = [
  { value: "forever", label: "永不结束" },
  { value: "date", label: "指定结束日期" },
  { value: "count", label: "重复N次后停止" }
]

const form = reactive({
  id: null,
  title: "",
  isAllDay: false,
  startDate: "",
  startTime: "09:00",
  endDate: "",
  endTime: "10:00",
  remark: "",
  color: PRESET_COLORS[0].value,
  tagId: "",
  isFinish: false,
  repeatType: "none",
  repeatRule: [],
  repeatEndType: "forever",
  repeatEndDate: "",
  repeatCount: 0,
  remindEnable: false,
  remindMinute: 15
})

const errorMsg = ref("")

function pad(n) {
  return String(n).padStart(2, "0")
}

// Initialize the form when the modal becomes visible.
watch(() => props.visible, (v) => {
  if (!v) return
  errorMsg.value = ""
  if (props.schedule) {
    const s = props.schedule
    const start = parseISO(s.startTime)
    const end = parseISO(s.endTime)
    form.id = s.id
    form.title = s.title || ""
    form.isAllDay = !!s.isAllDay
    form.startDate = start ? toDateStr(start) : ""
    form.startTime = start ? (pad(start.getHours()) + ":" + pad(start.getMinutes())) : "09:00"
    form.endDate = end ? toDateStr(end) : form.startDate
    form.endTime = end ? (pad(end.getHours()) + ":" + pad(end.getMinutes())) : "10:00"
    form.remark = s.remark || ""
    form.color = s.color || PRESET_COLORS[0].value
    form.tagId = s.tagId || ""
    form.isFinish = !!s.isFinish
    form.repeatType = s.repeatType || "none"
    form.repeatRule = Array.isArray(s.repeatRule) ? [...s.repeatRule] : []
    form.repeatEndType = s.repeatEndType || "forever"
    form.repeatEndDate = s.repeatEndDate || ""
    form.repeatCount = s.repeatCount || 0
    form.remindEnable = !!s.remindEnable
    form.remindMinute = s.remindMinute || 15
  } else {
    const baseDate = props.prefillDate || toDateStr(new Date())
    form.id = null
    form.title = ""
    form.isAllDay = false
    form.startDate = baseDate
    form.startTime = "09:00"
    form.endDate = baseDate
    form.endTime = "10:00"
    form.remark = ""
    form.color = PRESET_COLORS[0].value
    form.tagId = ""
    form.isFinish = false
    form.repeatType = "none"
    form.repeatRule = []
    form.repeatEndType = "forever"
    form.repeatEndDate = ""
    form.repeatCount = 0
    form.remindEnable = false
    form.remindMinute = 15
  }
})

// When toggling all-day, default the end date to the start date.
watch(() => form.isAllDay, (allDay) => {
  if (allDay && form.endDate < form.startDate) {
    form.endDate = form.startDate
  }
})

// When repeat type changes to week, default repeatRule to the start date's weekday.
watch(() => form.repeatType, (rt) => {
  if (rt === "week" && form.repeatRule.length === 0 && form.startDate) {
    const d = parseISO(form.startDate + "T00:00:00")
    if (d) form.repeatRule = [d.getDay()]
  }
})

function toggleWeekday(val) {
  const idx = form.repeatRule.indexOf(val)
  if (idx > -1) {
    form.repeatRule.splice(idx, 1)
  } else {
    form.repeatRule.push(val)
  }
}

function buildISO(dateStr, timeStr, allDay) {
  if (allDay) {
    return dateStr + "T00:00:00"
  }
  return dateStr + "T" + timeStr + ":00"
}

function handleSubmit() {
  const payload = {
    title: form.title.trim(),
    isAllDay: form.isAllDay,
    startTime: buildISO(form.startDate, form.startTime, form.isAllDay),
    endTime: buildISO(form.endDate, form.endTime, form.isAllDay),
    remark: form.remark.trim(),
    color: form.color,
    tagId: form.tagId,
    isFinish: form.isFinish,
    repeatType: form.repeatType,
    repeatRule: form.repeatType === "week" ? [...form.repeatRule] : [],
    repeatEndType: form.repeatEndType,
    repeatEndDate: form.repeatEndType === "date" ? form.repeatEndDate : "",
    repeatCount: form.repeatEndType === "count" ? form.repeatCount : 0,
    remindEnable: form.remindEnable,
    remindMinute: form.remindEnable ? form.remindMinute : 15
  }
  if (form.id) payload.id = form.id

  const err = validateSchedule(payload)
  if (err) {
    errorMsg.value = err
    return
  }
  errorMsg.value = ""
  emit("save", payload)
}

function handleClose() {
  emit("close")
}

function onBackdrop(e) {
  if (e.target === e.currentTarget) handleClose()
}

// Show color picker only when no tag is selected (tag color takes precedence).
const showColorPicker = computed(() => !form.tagId)
</script>

<template>
  <div v-if="visible" class="modal-backdrop" @click="onBackdrop">
    <div class="modal-card" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h2>{{ isEdit ? "编辑日程" : "新建日程" }}</h2>
        <button class="icon-btn" type="button" @click="handleClose" aria-label="关闭">×</button>
      </div>

      <form class="modal-body" @submit.prevent="handleSubmit">
        <div class="field">
          <label class="label">标题 <span class="req">*</span></label>
          <input
            v-model="form.title"
            type="text"
            maxlength="50"
            placeholder="请输入日程标题（最多50字）"
            class="input"
          />
        </div>

        <div class="field-row">
          <label class="switch">
            <input type="checkbox" v-model="form.isAllDay" />
            <span>全天日程</span>
          </label>
          <label v-if="isEdit" class="switch">
            <input type="checkbox" v-model="form.isFinish" />
            <span>标记完成</span>
          </label>
        </div>

        <div class="field-grid">
          <div class="field">
            <label class="label">开始{{ form.isAllDay ? "日期" : "时间" }} <span class="req">*</span></label>
            <div class="datetime">
              <input v-model="form.startDate" type="date" class="input" />
              <input v-if="!form.isAllDay" v-model="form.startTime" type="time" class="input time-input" />
            </div>
          </div>
          <div class="field">
            <label class="label">结束{{ form.isAllDay ? "日期" : "时间" }} <span class="req">*</span></label>
            <div class="datetime">
              <input v-model="form.endDate" type="date" class="input" />
              <input v-if="!form.isAllDay" v-model="form.endTime" type="time" class="input time-input" />
            </div>
          </div>
        </div>

        <div class="field">
          <label class="label">标签</label>
          <select v-model="form.tagId" class="input">
            <option value="">无标签</option>
            <option v-for="t in tags" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
        </div>

        <div v-if="showColorPicker" class="field">
          <label class="label">颜色</label>
          <div class="color-picker">
            <button
              v-for="c in PRESET_COLORS"
              :key="c.value"
              type="button"
              class="color-dot"
              :class="{ active: form.color === c.value }"
              :style="{ background: c.value }"
              :title="c.label"
              @click="form.color = c.value"
            />
          </div>
        </div>

        <div class="field">
          <label class="label">重复</label>
          <select v-model="form.repeatType" class="input">
            <option v-for="rt in REPEAT_TYPES" :key="rt.value" :value="rt.value">{{ rt.label }}</option>
          </select>
        </div>

        <div v-if="form.repeatType === 'week'" class="field">
          <label class="label">重复星期</label>
          <div class="weekday-picker">
            <button
              v-for="w in WEEKDAY_OPTIONS"
              :key="w.value"
              type="button"
              class="weekday-btn"
              :class="{ active: form.repeatRule.includes(w.value) }"
              @click="toggleWeekday(w.value)"
            >{{ w.label }}</button>
          </div>
        </div>

        <div v-if="form.repeatType !== 'none'" class="field">
          <label class="label">结束条件</label>
          <select v-model="form.repeatEndType" class="input">
            <option v-for="et in REPEAT_END_TYPES" :key="et.value" :value="et.value">{{ et.label }}</option>
          </select>
        </div>

        <div v-if="form.repeatType !== 'none' && form.repeatEndType === 'date'" class="field">
          <label class="label">结束日期</label>
          <input v-model="form.repeatEndDate" type="date" class="input" />
        </div>

        <div v-if="form.repeatType !== 'none' && form.repeatEndType === 'count'" class="field">
          <label class="label">重复次数</label>
          <input v-model.number="form.repeatCount" type="number" min="1" max="999" class="input" />
        </div>

        <div class="field">
          <label class="switch">
            <input type="checkbox" v-model="form.remindEnable" />
            <span>开启提醒</span>
          </label>
        </div>

        <div v-if="form.remindEnable" class="field">
          <label class="label">提前提醒</label>
          <select v-model.number="form.remindMinute" class="input">
            <option v-for="r in REMIND_OPTIONS" :key="r.value" :value="r.value">{{ r.label }}</option>
          </select>
        </div>

        <div class="field">
          <label class="label">备注</label>
          <textarea
            v-model="form.remark"
            rows="3"
            placeholder="选填，补充日程说明"
            class="input textarea"
          />
        </div>

        <p v-if="errorMsg" class="error-text">{{ errorMsg }}</p>

        <div class="modal-footer">
          <button type="button" class="btn btn-ghost" @click="handleClose">取消</button>
          <button type="submit" class="btn btn-primary">{{ isEdit ? "保存" : "创建" }}</button>
        </div>
      </form>
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
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
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
  position: sticky;
  top: 0;
  background: var(--surface, #fff);
}
.modal-header h2 { margin: 0; font-size: 18px; color: var(--text-h); }
.modal-body { padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field-row { display: flex; gap: 20px; }
.label { font-size: 13px; color: var(--text); font-weight: 500; }
.req { color: #db2828; }
.input {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 9px 12px;
  font-size: 14px;
  color: var(--text-h);
  background: var(--surface, #fff);
  outline: none;
  width: 100%;
  box-sizing: border-box;
  font-family: inherit;
}
.input:focus { border-color: var(--accent); }
.textarea { resize: vertical; min-height: 64px; }
.datetime { display: flex; gap: 8px; }
.time-input { max-width: 120px; }
.field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.switch { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--text-h); cursor: pointer; user-select: none; }
.switch input { width: 16px; height: 16px; cursor: pointer; }
.color-picker { display: flex; gap: 10px; }
.color-dot {
  width: 28px; height: 28px; border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer; padding: 0;
  transition: transform .15s, border-color .15s;
}
.color-dot:hover { transform: scale(1.1); }
.color-dot.active { border-color: var(--text-h); }
.weekday-picker { display: flex; gap: 6px; flex-wrap: wrap; }
.weekday-btn {
  width: 36px; height: 36px; border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--surface, #fff);
  color: var(--text);
  cursor: pointer; font-size: 13px;
  transition: all .15s;
}
.weekday-btn:hover { border-color: var(--accent); }
.weekday-btn.active {
  background: var(--accent); color: #fff; border-color: var(--accent);
}
.error-text { color: #db2828; font-size: 13px; margin: 0; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
.icon-btn {
  border: none; background: transparent; font-size: 22px; line-height: 1;
  color: var(--text); cursor: pointer; padding: 4px 6px; border-radius: 6px;
}
.icon-btn:hover { background: var(--border); }
@media (max-width: 520px) {
  .field-grid { grid-template-columns: 1fr; }
  .time-input { max-width: none; }
}
</style>
