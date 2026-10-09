<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '确认操作' },
  message: { type: String, default: '确定要执行此操作吗？' },
  confirmText: { type: String, default: '确认' },
  cancelText: { type: String, default: '取消' },
  danger: { type: Boolean, default: false }
})

const emit = defineEmits(['confirm', 'cancel'])

function onBackdrop(e) {
  if (e.target === e.currentTarget) emit('cancel')
}
</script>

<template>
  <div v-if="visible" class="modal-backdrop" @click="onBackdrop">
    <div class="confirm-card" role="alertdialog" aria-modal="true">
      <h3 class="confirm-title">{{ title }}</h3>
      <p class="confirm-msg">{{ message }}</p>
      <div class="confirm-footer">
        <button type="button" class="btn btn-ghost" @click="emit('cancel')">{{ cancelText }}</button>
        <button type="button" class="btn" :class="danger ? 'btn-danger' : 'btn-primary'" @click="emit('confirm')">{{ confirmText }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(15, 17, 23, 0.45);
  display: flex; align-items: center; justify-content: center; z-index: 60; padding: 16px;
}
.confirm-card {
  width: 100%; max-width: 380px; background: #fff; border-radius: 12px;
  padding: 22px 22px 18px; box-shadow: 0 20px 45px rgba(0,0,0,0.18);
}
.confirm-title { margin: 0 0 8px; font-size: 17px; color: var(--text-h); }
.confirm-msg { margin: 0 0 18px; font-size: 14px; color: var(--text); line-height: 1.5; }
.confirm-footer { display: flex; justify-content: flex-end; gap: 10px; }
</style>
