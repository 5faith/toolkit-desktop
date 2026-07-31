<template>
  <div class="formatter-view">
    <div class="formatter-view__toolbar">
      <div class="formatter-view__modes">
        <button
          class="mode-btn"
          :class="{ 'mode-btn--active': store.mode === 'json' }"
          @click="store.setMode('json')"
        >
          JSON
        </button>
        <button
          class="mode-btn"
          :class="{ 'mode-btn--active': store.mode === 'xml' }"
          @click="store.setMode('xml')"
        >
          XML
        </button>
      </div>
      <div class="formatter-view__actions">
        <button class="action-btn" @click="formatter.format()">Format</button>
        <button class="action-btn" @click="formatter.compress()">Compress</button>
        <button class="action-btn" @click="formatter.compressOverride()">Compress Override</button>
        <button class="action-btn" @click="formatter.unescape()">Unescape</button>
        <button class="action-btn" @click="formatter.validate()">Validate</button>
        <button class="action-btn" @click="copyOutput">{{ copied ? 'Copied!' : 'Copy' }}</button>
      </div>
    </div>
    <div class="formatter-view__panels">
      <div class="formatter-view__panel">
        <div class="panel-header">Input</div>
        <CodeEditor v-model="store.inputText" placeholder="Paste your code here..." />
      </div>
      <div class="formatter-view__panel">
        <div class="panel-header">Output</div>
        <CodeEditor v-model="store.outputText" placeholder="Formatted output..." :readonly="true" />
      </div>
    </div>
    <div v-if="store.error" class="formatter-view__error">
      {{ store.error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import CodeEditor from '@shared/components/CodeEditor.vue'
import { useFormatterStore } from '../store'
import { useFormatter } from '../composables/useFormatter'
import { useClipboard } from '@shared/composables/useClipboard'

const store = useFormatterStore()
const formatter = useFormatter()
const { copy, copied } = useClipboard()

function copyOutput() {
  if (store.outputText) {
    copy(store.outputText)
  }
}
</script>

<style scoped>
.formatter-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 1px;
  background: var(--color-border);
}

.formatter-view__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-primary);
  flex-shrink: 0;
}

.formatter-view__modes {
  display: flex;
  gap: var(--spacing-xs);
}

.formatter-view__actions {
  display: flex;
  gap: var(--spacing-sm);
}

.mode-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  transition: all 0.15s;
}

.mode-btn:hover {
  background: var(--color-bg-hover);
}

.mode-btn--active {
  background: var(--color-accent-light);
  color: var(--color-accent);
}

.action-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: 13px;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  transition: all 0.15s;
}

.action-btn:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-border-hover);
}

.formatter-view__panels {
  display: flex;
  flex: 1;
  gap: 1px;
  background: var(--color-border);
  overflow: hidden;
}

.formatter-view__panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-primary);
  overflow: hidden;
}

.panel-header {
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.formatter-view__error {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: 13px;
  color: var(--color-error);
  background: var(--color-bg-primary);
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}
</style>
