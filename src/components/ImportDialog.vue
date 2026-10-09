<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  count: { type: Number, default: 0 }
})

const emit = defineEmits(['overwrite', 'append', 'cancel'])

function onBackdrop(e) {
  if (e.target === e.currentTarget) emit('cancel')
}
</script>

<template>
  <div v-if="visible" class="modal-backdrop" @click="onBackdrop">
    <div class="import-card" role="dialog" aria-modal="true">
      <h3 class="import-title">导入日程</h3>
      <p class="import-msg">检测到 {{ count }} 条日程，请选择导入方式：</p>
      <div class="import-options">
        <button type="button" class="btn btn-danger" @click="emit('overwrite')">
          覆盖原有数据
        </button>
        <button type="button" class="btn btn-primary" @click="emit('append')">
          增量追加导入
        </button>
      </div>
      <p class="import-tip">覆盖导入将清空当前所有日程；增量导入会保留现有日程并追加新数据（重复ID将跳过）。</p>
      <div class="import-footer">
        <button type="button" class="btn btn-ghost" @click="emit('cancel')">取消</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(15, 17, 23, 0.45);
  display: flex; align-items: center; justify-content: center; z-index: 60; padding: 16px;
}
.import-card {
  width: 100%; max-width: 400px; background: #fff; border-radius: 12px;
  padding: 22px; box-shadow: 0 20px 45px rgba(0,0,0,0.18);
}
.import-title { margin: 0 0 8px; font-size: 17px; color: var(--text-h); }
.import-msg { margin: 0 0 16px; font-size: 14px; color: var(--text); }
.import-options { display: flex; gap: 10px; margin-bottom: 10px; }
.import-options .btn { flex: 1; }
.import-tip { font-size: 12px; color: var(--text); margin: 0 0 16px; line-height: 1.5; }
.import-footer { display: flex; justify-content: flex-end; }
@media (max-width: 440px) {
  .import-options { flex-direction: column; }
}
</style>
