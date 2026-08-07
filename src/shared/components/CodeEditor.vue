<template>
  <div class="code-editor">
    <div v-if="showLineNumbers" ref="lineNumRef" class="code-editor__lines">
      <div v-for="n in lineCount" :key="n" class="code-editor__line-num">{{ n }}</div>
    </div>
    <textarea
      ref="textareaRef"
      :value="modelValue"
      class="code-editor__textarea"
      :class="{ 'code-editor__textarea--with-lines': showLineNumbers }"
      :placeholder="placeholder"
      :readonly="readonly"
      spellcheck="false"
      @input="onInput"
      @scroll="onScroll"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps<{
  modelValue: string
  placeholder?: string
  readonly?: boolean
  showLineNumbers?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const textareaRef = ref<HTMLTextAreaElement>()
const lineNumRef = ref<HTMLDivElement>()

const lineCount = computed(() => {
  const lines = (props.modelValue ?? '').split('\n').length
  return Math.max(lines, 1)
})

function onInput(event: Event) {
  const target = event.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
}

function onScroll() {
  if (lineNumRef.value && textareaRef.value) {
    lineNumRef.value.scrollTop = textareaRef.value.scrollTop
  }
}

watch(() => props.modelValue, () => {
  nextTick(() => {
    if (lineNumRef.value && textareaRef.value) {
      lineNumRef.value.scrollTop = textareaRef.value.scrollTop
    }
  })
})
</script>

<style scoped>
.code-editor {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.code-editor__lines {
  display: flex;
  flex-direction: column;
  padding: var(--spacing-md) var(--spacing-sm);
  padding-right: 0;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text-tertiary);
  background: var(--color-bg-secondary);
  border-right: 1px solid var(--color-border);
  overflow: hidden;
  user-select: none;
  text-align: right;
  min-width: 36px;
  flex-shrink: 0;
}

.code-editor__line-num {
  height: 20.8px;
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

.code-editor__textarea--with-lines {
  padding-left: var(--spacing-sm);
}

.code-editor__textarea::placeholder {
  color: var(--color-text-tertiary);
}
</style>
