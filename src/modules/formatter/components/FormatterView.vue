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
        <button class="action-btn" @click="formatter.unescape()">Unescape</button>
        <button class="action-btn" @click="handleCompressCopy">{{ compressCopied ? 'Copied!' : 'Compress Copy' }}</button>
        <button class="action-btn" @click="copyOutput">{{ copied ? 'Copied!' : 'Copy' }}</button>
      </div>
    </div>
    <div class="formatter-view__panels">
      <div class="formatter-view__panel">
        <div class="panel-header">Input</div>
        <CodeEditor v-model="store.inputText" placeholder="Paste your code here..." show-line-numbers />
      </div>
      <div class="formatter-view__panel">
        <div class="panel-header">
          <span>Output</span>
          <div v-if="store.outputText && store.mode === 'json'" class="search-box">
            <input
              v-model="searchKeyword"
              class="search-input"
              placeholder="Search..."
              @keydown.enter="onSearchEnter"
              @input="onSearchInput"
            />
            <span v-if="searchTotal > 0" class="search-count">{{ searchIndex }}/{{ searchTotal }}</span>
            <button class="search-btn" :disabled="searchTotal === 0" @click="searchPrev">▲</button>
            <button class="search-btn" :disabled="searchTotal === 0" @click="searchNext">▼</button>
          </div>
        </div>
        <div class="panel-body">
          <template v-if="store.mode === 'json' && jsonParsed !== null">
            <JsonTreeView
              ref="treeViewRef"
              :data="jsonParsed"
              :search="searchKeyword"
              class="json-output"
              @search-change="onSearchChange"
            />
          </template>
          <template v-else>
            <CodeEditor v-model="store.outputText" placeholder="Formatted output..." :readonly="true" show-line-numbers />
          </template>
        </div>
      </div>
    </div>
    <div v-if="store.error" class="formatter-view__error">
      {{ store.error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import CodeEditor from '@shared/components/CodeEditor.vue'
import JsonTreeView from './JsonTreeView.vue'
import { useFormatterStore } from '../store'
import { useFormatter } from '../composables/useFormatter'
import { copyToClipboard } from '@shared/utils/clipboard'

const store = useFormatterStore()
const formatter = useFormatter()

const searchKeyword = ref('')
const searchIndex = ref(0)
const searchTotal = ref(0)
const treeViewRef = ref<InstanceType<typeof JsonTreeView>>()
const compressCopied = ref(false)
let compressCopyTimer: ReturnType<typeof setTimeout> | null = null
const copied = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | null = null

const jsonParsed = computed(() => {
  if (!store.outputText) return null
  try {
    return JSON.parse(store.outputText)
  } catch {
    return null
  }
})

async function handleCompressCopy() {
  const result = await formatter.compressCopy()
  if (result) {
    const success = await copyToClipboard(result)
    if (success) {
      compressCopied.value = true
      if (compressCopyTimer) clearTimeout(compressCopyTimer)
      compressCopyTimer = setTimeout(() => {
        compressCopied.value = false
      }, 2000)
    }
  }
}

async function copyOutput() {
  if (store.outputText) {
    const success = await copyToClipboard(store.outputText)
    if (success) {
      copied.value = true
      if (copyTimer) clearTimeout(copyTimer)
      copyTimer = setTimeout(() => {
        copied.value = false
      }, 2000)
    }
  }
}

function onSearchEnter() {
  searchNext()
}

function onSearchInput() {
  searchIndex.value = 0
}

function onSearchChange(info: { currentIndex: number; totalCount: number }) {
  searchIndex.value = info.currentIndex
  searchTotal.value = info.totalCount
}

function searchNext() {
  treeViewRef.value?.nextMatch()
}

function searchPrev() {
  treeViewRef.value?.prevMatch()
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

.search-box {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  text-transform: none;
  letter-spacing: normal;
  font-weight: 400;
}

.search-input {
  width: 140px;
  padding: 2px var(--spacing-xs);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 12px;
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  outline: none;
}

.search-input:focus {
  border-color: var(--color-accent);
}

.search-count {
  font-size: 11px;
  color: var(--color-text-tertiary);
  white-space: nowrap;
  min-width: 30px;
  text-align: center;
}

.search-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 10px;
  color: var(--color-text-tertiary);
  background: var(--color-bg-secondary);
  cursor: pointer;
}

.search-btn:hover:not(:disabled) {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.search-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.panel-body {
  flex: 1;
  overflow: auto;
}

.json-output {
  flex: 1;
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
