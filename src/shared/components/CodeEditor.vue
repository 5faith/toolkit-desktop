<template>
  <div class="code-editor">
    <textarea
      ref="textareaRef"
      :value="modelValue"
      class="code-editor__textarea"
      :placeholder="placeholder"
      :readonly="readonly"
      spellcheck="false"
      @input="onInput"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  modelValue: string
  placeholder?: string
  readonly?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const textareaRef = ref<HTMLTextAreaElement>()

function onInput(event: Event) {
  const target = event.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
}
</script>

<style scoped>
.code-editor {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.code-editor__textarea {
  width: 100%;
  height: 100%;
  padding: var(--spacing-md);
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text-primary);
  background: var(--color-bg-primary);
  border: none;
  outline: none;
  resize: none;
  tab-size: 2;
}

.code-editor__textarea::placeholder {
  color: var(--color-text-tertiary);
}
</style>
