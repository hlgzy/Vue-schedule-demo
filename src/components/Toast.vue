<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  message: { type: String, default: '' },
  type: { type: String, default: 'success' } // 'success' | 'error'
})
</script>

<template>
  <Transition name="toast">
    <div v-if="visible" class="toast" :class="type" role="status" aria-live="polite">
      <span class="toast-icon">{{ type === 'success' ? '✓' : '!' }}</span>
      <span class="toast-msg">{{ message }}</span>
    </div>
  </Transition>
</template>

<style scoped>
.toast {
  position: fixed; left: 50%; bottom: 32px; transform: translateX(-50%);
  background: #2b2c34; color: #fff; padding: 11px 18px; border-radius: 24px;
  display: flex; align-items: center; gap: 8px; font-size: 14px; z-index: 80;
  box-shadow: 0 8px 24px rgba(0,0,0,0.2); max-width: 90vw;
}
.toast.success { background: #2e7d4f; }
.toast.error { background: #c0392b; }
.toast-icon {
  width: 18px; height: 18px; border-radius: 50%; background: rgba(255,255,255,0.25);
  display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700;
}
.toast-msg { overflow: hidden; text-overflow: ellipsis; }
.toast-enter-active, .toast-leave-active { transition: opacity .25s, transform .25s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 12px); }
</style>
