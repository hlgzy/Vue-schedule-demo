<script setup>
const props = defineProps({
  visible: { type: Boolean, default: false },
  // "edit" or "delete" — controls button text.
  type: { type: String, default: "edit" },
  // The occurrence being edited/deleted.
  occurrence: { type: Object, default: null }
})

const emit = defineEmits(["select", "cancel"])

// Options for repeating schedule edit/delete.
const OPTIONS = [
  { value: "this", label: "仅本次", desc: "只修改/删除这一天的日程，不影响其他重复日程" },
  { value: "all", label: "全部系列", desc: "修改/删除所有重复日程（包括历史和未来）" },
  { value: "following", label: "本次及后续", desc: "从这一天开始（含今天），后续所有重复日程" }
]

function select(mode) {
  emit("select", mode)
}

function onBackdrop(e) {
  if (e.target === e.currentTarget) emit("cancel")
}
</script>

<template>
  <div v-if="visible" class="modal-backdrop" @click="onBackdrop">
    <div class="modal-card" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h2>{{ type === "delete" ? "删除重复日程" : "编辑重复日程" }}</h2>
        <button class="icon-btn" type="button" @click="emit('cancel')" aria-label="关闭">×</button>
      </div>
      <div class="modal-body">
        <p class="dialog-desc">
          这是重复日程，请选择{{ type === "delete" ? "删除" : "修改" }}范围：
        </p>
        <div v-if="occurrence" class="occ-preview">
          <span class="occ-title">{{ occurrence.title }}</span>
        </div>
        <div class="options">
          <button
            v-for="opt in OPTIONS"
            :key="opt.value"
            type="button"
            class="option-btn"
            :class="{ danger: type === 'delete' }"
            @click="select(opt.value)"
          >
            <span class="option-label">{{ opt.label }}</span>
            <span class="option-desc">{{ opt.desc }}</span>
          </button>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-ghost" @click="emit('cancel')">取消</button>
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
  z-index: 55;
  padding: 16px;
}
.modal-card {
  width: 100%;
  max-width: 420px;
  background: var(--surface, #fff);
  border-radius: 12px;
  box-shadow: 0 20px 45px rgba(0,0,0,0.18);
  overflow: hidden;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}
.modal-header h2 { margin: 0; font-size: 18px; color: var(--text-h); }
.modal-body { padding: 18px 20px; display: flex; flex-direction: column; gap: 12px; }
.dialog-desc { font-size: 14px; color: var(--text); margin: 0; }
.occ-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--surface-2, #f9f8f4);
  border-radius: 8px;
  border: 1px solid var(--border);
}
.occ-title { font-size: 14px; color: var(--text-h); font-weight: 500; }
.options { display: flex; flex-direction: column; gap: 8px; }
.option-btn {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface, #fff);
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: all .15s;
}
.option-btn:hover {
  border-color: var(--accent);
  background: var(--accent-bg);
}
.option-btn.danger:hover {
  border-color: #db2828;
  background: #fdf0f0;
}
.option-label { font-size: 14px; color: var(--text-h); font-weight: 600; }
.option-desc { font-size: 12px; color: var(--text); }
.modal-footer {
  padding: 0 20px 16px;
  display: flex;
  justify-content: flex-end;
}
.icon-btn {
  border: none; background: transparent; font-size: 22px; line-height: 1;
  color: var(--text); cursor: pointer; padding: 4px 6px; border-radius: 6px;
}
.icon-btn:hover { background: var(--border); }
</style>
