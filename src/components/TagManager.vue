<script setup>
import { ref, reactive } from "vue"
import { tags, addTag, updateTag, deleteTag, DEFAULT_TAGS } from "../composables/useStore"
import { PRESET_COLORS } from "../utils/storage"

defineProps({
  visible: { type: Boolean, default: false }
})

const emit = defineEmits(["close"])

const newTag = reactive({ name: "", color: PRESET_COLORS[0].value })
const editingId = ref("")
const editName = ref("")
const editColor = ref("")

function isDefault(id) {
  return DEFAULT_TAGS.some(function (t) { return t.id === id })
}

function handleAdd() {
  if (!newTag.name.trim()) return
  addTag(newTag.name.trim(), newTag.color)
  newTag.name = ""
  newTag.color = PRESET_COLORS[0].value
}

function startEdit(tag) {
  editingId.value = tag.id
  editName.value = tag.name
  editColor.value = tag.color
}

function saveEdit() {
  if (editingId.value && editName.value.trim()) {
    updateTag(editingId.value, { name: editName.value.trim(), color: editColor.value })
  }
  editingId.value = ""
}

function cancelEdit() {
  editingId.value = ""
}

function handleDelete(tag) {
  if (isDefault(tag.id)) return
  if (confirm("确定删除标签「" + tag.name + "」？相关日程的标签将被清空。")) {
    deleteTag(tag.id)
  }
}

function onBackdrop(e) {
  if (e.target === e.currentTarget) emit("close")
}
</script>

<template>
  <div v-if="visible" class="modal-backdrop" @click="onBackdrop">
    <div class="modal-card" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h2>标签管理</h2>
        <button class="icon-btn" type="button" @click="emit('close')" aria-label="关闭">×</button>
      </div>

      <div class="modal-body">
        <div class="tag-list">
          <div v-for="tag in tags" :key="tag.id" class="tag-row">
            <template v-if="editingId === tag.id">
              <input v-model="editName" type="text" class="input tag-name-input" placeholder="标签名" />
              <div class="color-picker-sm">
                <button
                  v-for="c in PRESET_COLORS"
                  :key="c.value"
                  type="button"
                  class="color-dot-sm"
                  :class="{ active: editColor === c.value }"
                  :style="{ background: c.value }"
                  @click="editColor = c.value"
                />
              </div>
              <button type="button" class="btn btn-primary btn-sm" @click="saveEdit">保存</button>
              <button type="button" class="btn btn-ghost btn-sm" @click="cancelEdit">取消</button>
            </template>
            <template v-else>
              <span class="tag-dot" :style="{ background: tag.color }"></span>
              <span class="tag-name">{{ tag.name }}</span>
              <span v-if="isDefault(tag.id)" class="tag-badge">默认</span>
              <button type="button" class="btn btn-ghost btn-sm" @click="startEdit(tag)">编辑</button>
              <button
                v-if="!isDefault(tag.id)"
                type="button"
                class="btn btn-danger-ghost btn-sm"
                @click="handleDelete(tag)"
              >删除</button>
            </template>
          </div>
        </div>

        <div class="add-section">
          <h3 class="section-title">新增标签</h3>
          <div class="add-row">
            <input v-model="newTag.name" type="text" class="input" placeholder="标签名称" @keyup.enter="handleAdd" />
            <div class="color-picker-sm">
              <button
                v-for="c in PRESET_COLORS"
                :key="c.value"
                type="button"
                class="color-dot-sm"
                :class="{ active: newTag.color === c.value }"
                :style="{ background: c.value }"
                @click="newTag.color = c.value"
              />
            </div>
            <button type="button" class="btn btn-primary" @click="handleAdd">添加</button>
          </div>
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
  max-width: 500px;
  max-height: 80vh;
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
}
.modal-header h2 { margin: 0; font-size: 18px; color: var(--text-h); }
.modal-body { padding: 18px 20px; display: flex; flex-direction: column; gap: 20px; }
.tag-list { display: flex; flex-direction: column; gap: 8px; }
.tag-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--surface-2, #f9f8f4);
  flex-wrap: wrap;
}
.tag-dot { width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0; }
.tag-name { font-size: 14px; color: var(--text-h); flex: 1; min-width: 60px; }
.tag-badge {
  font-size: 11px; color: var(--text);
  background: var(--border);
  padding: 2px 6px; border-radius: 4px;
}
.btn-sm { padding: 5px 10px; font-size: 12px; }
.tag-name-input { max-width: 140px; }
.color-picker-sm { display: flex; gap: 4px; }
.color-dot-sm {
  width: 20px; height: 20px; border-radius: 50%;
  border: 2px solid transparent; cursor: pointer; padding: 0;
}
.color-dot-sm.active { border-color: var(--text-h); }
.add-section { border-top: 1px solid var(--border); padding-top: 16px; }
.section-title { font-size: 14px; color: var(--text-h); margin-bottom: 10px; }
.add-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.add-row .input { flex: 1; min-width: 120px; }
.icon-btn {
  border: none; background: transparent; font-size: 22px; line-height: 1;
  color: var(--text); cursor: pointer; padding: 4px 6px; border-radius: 6px;
}
.icon-btn:hover { background: var(--border); }
</style>
