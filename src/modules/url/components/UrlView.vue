<template>
  <div class="url-view">
    <div class="url-view__toolbar">
      <div class="url-view__actions">
        <button class="action-btn" @click="encode">Encode</button>
        <button class="action-btn" @click="decode">Decode</button>
        <button class="action-btn" @click="copyOutput">{{ copied ? 'Copied!' : 'Copy' }}</button>
      </div>
    </div>
    <div class="url-view__panels">
      <div class="url-view__panel">
        <div class="panel-header">Input</div>
        <CodeEditor v-model="inputText" placeholder="Paste text or URL here..." show-line-numbers />
      </div>
      <div class="url-view__panel">
        <div class="panel-header">Output</div>
        <CodeEditor v-model="outputText" placeholder="Encoded/Decoded result..." :readonly="true" show-line-numbers />
      </div>
    </div>
    <div v-if="error" class="url-view__error">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import CodeEditor from '@shared/components/CodeEditor.vue'
import { useClipboard } from '@shared/composables/useClipboard'

const inputText = ref('')
const outputText = ref('')
const error = ref('')
const { copy, copied } = useClipboard()

function encode() {
  try {
    outputText.value = encodeURIComponent(inputText.value)
    error.value = ''
  } catch (e) {
    error.value = String(e)
  }
}

function decode() {
  try {
    outputText.value = decodeURIComponent(inputText.value)
    error.value = ''
  } catch (e) {
    error.value = String(e)
  }
}

function copyOutput() {
  if (outputText.value) {
    copy(outputText.value)
  }
}
</script>

<style scoped>
.url-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 1px;
  background: var(--color-border);
}

.url-view__toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-primary);
  flex-shrink: 0;
}

.url-view__actions {
  display: flex;
  gap: var(--spacing-sm);
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

.url-view__panels {
  display: flex;
  flex: 1;
  gap: 1px;
  background: var(--color-border);
  overflow: hidden;
}

.url-view__panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-primary);
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.url-view__error {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: 13px;
  color: var(--color-error);
  background: var(--color-bg-primary);
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}
</style>
