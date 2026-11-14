<template>
  <div class="formatter-toolbar">
    <div class="formatter-toolbar__modes">
      <button
        v-for="m in MODES"
        :key="m.id"
        class="formatter-toolbar__mode"
        :class="{ 'formatter-toolbar__mode--active': mode === m.id }"
        @click="emit('update:mode', m.id)"
      >
        {{ m.label }}
      </button>
    </div>

    <label v-if="mode !== 'xml'" class="formatter-toolbar__indent" title="Indent size">
      <span>缩进</span>
      <select
        class="formatter-toolbar__select"
        :value="indentSize"
        @change="onIndentChange"
      >
        <option :value="2">2 空格</option>
        <option :value="4">4 空格</option>
      </select>
    </label>

    <div class="formatter-toolbar__actions">
      <button
        class="formatter-toolbar__btn"
        :disabled="mode === 'yaml'"
        @click="emit('unescape')"
      >↷ Unescape</button>
      <button
        class="formatter-toolbar__btn"
        :disabled="mode === 'xml' || mode === 'yaml'"
        @click="emit('compressCopy')"
      >⧉ {{ compressCopied ? 'Copied!' : 'Compress Copy' }}</button>
      <button
        class="formatter-toolbar__btn formatter-toolbar__btn--primary"
        @click="emit('format')"
      >✦ Format</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FormatMode } from '../store'

defineProps<{
  mode: FormatMode
  indentSize: number
  compressCopied: boolean
}>()

const emit = defineEmits<{
  'update:mode': [mode: FormatMode]
  'update:indentSize': [size: number]
  format: []
  unescape: []
  compressCopy: []
}>()

const MODES: Array<{ id: FormatMode; label: string }> = [
  { id: 'json', label: 'JSON' },
  { id: 'xml', label: 'XML' },
  { id: 'yaml', label: 'YAML' },
]

function onIndentChange(event: Event) {
  const value = Number((event.target as HTMLSelectElement).value)
  emit('update:indentSize', value === 4 ? 4 : 2)
}
</script>

<style scoped>
.formatter-toolbar {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-shrink: 0;
}

.formatter-toolbar__modes {
  display: flex;
  gap: 2px;
  padding: 4px;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  box-shadow: var(--shadow-sm);
}

.formatter-toolbar__mode {
  padding: 4px 14px;
  border-radius: 7px;
  font-size: 12.5px;
  color: var(--color-text-tertiary);
  transition: background-color 0.15s, color 0.15s;
}

.formatter-toolbar__mode:hover {
  color: var(--color-text-secondary);
}

.formatter-toolbar__mode--active {
  background: var(--color-bg-hover);
  box-shadow: inset 0 0 0 1px var(--color-border-hover);
  color: var(--color-text-primary);
  font-weight: 600;
}

.formatter-toolbar__indent {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  box-shadow: var(--shadow-sm);
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.formatter-toolbar__select {
  border: none;
  background: transparent;
  color: var(--color-text-primary);
  font-size: 12.5px;
  outline: none;
  cursor: pointer;
}

.formatter-toolbar__actions {
  display: flex;
  gap: 7px;
  align-items: center;
  margin-left: auto;
  padding: 4px 6px;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  box-shadow: var(--shadow-sm);
}

.formatter-toolbar__btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 13px;
  border: none;
  border-radius: 9px;
  background: transparent;
  font-size: 12.5px;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s, filter 0.15s;
}

.formatter-toolbar__btn:hover:not(:disabled) {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.formatter-toolbar__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.formatter-toolbar__btn--primary {
  background: linear-gradient(135deg, var(--color-accent), var(--color-accent-hover));
  color: #fff;
  font-weight: 600;
  box-shadow: 0 4px 14px color-mix(in srgb, var(--color-accent) 35%, transparent);
}

.formatter-toolbar__btn--primary:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--color-accent), var(--color-accent-hover));
  color: #fff;
  filter: brightness(1.08);
}
</style>
