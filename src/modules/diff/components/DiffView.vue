<template>
  <div class="diff-view">
    <div class="diff-view__toolbar">
      <button class="action-btn action-btn--primary" @click="computeDiff">Compare</button>
      <button class="action-btn" @click="toggleInputs">
        {{ store.inputCollapsed ? '展开输入 ▼' : '收起输入 ▲' }}
      </button>
      <span v-if="store.inputCollapsed" class="diff-view__summary">
        原文 {{ leftLineCount }} 行 · 修改后 {{ rightLineCount }} 行
      </span>
    </div>

    <SplitPane
      v-if="!store.inputCollapsed"
      :model-value="store.splitRatio"
      direction="vertical"
      :min="12"
      :max="55"
      :default-ratio="28"
      class="diff-view__split"
      @update:model-value="store.setSplitRatio"
    >
      <template #first>
        <div class="diff-view__inputs">
          <div class="diff-view__input-panel">
            <div class="panel-header">
              <span>Left (Original)</span>
              <span class="panel-header__meta">{{ leftLineCount }} lines</span>
              <div class="panel-header__spacer" />
              <div class="panel-header__actions">
                <button class="icon-btn" title="Paste from clipboard" @click="pasteInto('left')">📋</button>
                <button
                  class="icon-btn"
                  title="Clear"
                  :disabled="!store.leftText"
                  @click="store.setLeft('')"
                >✕</button>
              </div>
            </div>
            <CodeEditor v-model="store.leftText" placeholder="Paste original text..." />
          </div>

          <div class="diff-view__input-panel">
            <div class="panel-header">
              <span>Right (Modified)</span>
              <span class="panel-header__meta">{{ rightLineCount }} lines</span>
              <div class="panel-header__spacer" />
              <div class="panel-header__actions">
                <button class="icon-btn" title="Paste from clipboard" @click="pasteInto('right')">📋</button>
                <button
                  class="icon-btn"
                  title="Clear"
                  :disabled="!store.rightText"
                  @click="store.setRight('')"
                >✕</button>
              </div>
            </div>
            <CodeEditor v-model="store.rightText" placeholder="Paste modified text..." />
          </div>
        </div>
      </template>

      <template #second>
        <DiffResultPane :changes="lineDiff" class="diff-view__result" />
      </template>
    </SplitPane>

    <DiffResultPane
      v-else
      :changes="lineDiff"
      class="diff-view__result diff-view__result--full"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Change } from 'diff'
import CodeEditor from '@shared/components/CodeEditor.vue'
import SplitPane from '@shared/components/SplitPane.vue'
import { useNotification } from '@shared/composables/useNotification'
import { useDiffStore } from '../store'
import { useDiff } from '../composables/useDiff'
import DiffResultPane from './DiffResultPane.vue'

defineOptions({ name: 'DiffView' })

const store = useDiffStore()
const { computeDiff: doCompute, computeLineDiff } = useDiff()
const notification = useNotification()

const lineDiff = ref<Change[]>([])

const leftLineCount = computed(() => (store.leftText ? store.leftText.split('\n').length : 0))
const rightLineCount = computed(() => (store.rightText ? store.rightText.split('\n').length : 0))

function computeDiff() {
  doCompute()
  lineDiff.value = computeLineDiff()
}

function toggleInputs() {
  store.setInputCollapsed(!store.inputCollapsed)
}

async function pasteInto(side: 'left' | 'right') {
  try {
    const text = await navigator.clipboard.readText()
    if (!text) return
    if (side === 'left') store.setLeft(text)
    else store.setRight(text)
  } catch {
    notification.error('Unable to read clipboard')
  }
}
</script>

<style scoped>
.diff-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--color-bg-secondary);
}

.diff-view__toolbar {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.diff-view__summary {
  font-size: 12px;
  color: var(--color-text-tertiary);
  white-space: nowrap;
}

.diff-view__split {
  flex: 1;
  min-height: 0;
}

.diff-view__inputs {
  display: flex;
  flex: 1;
  gap: 1px;
  background: var(--color-border);
  min-height: 0;
}

.diff-view__input-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: var(--color-bg-primary);
  overflow: hidden;
}

.diff-view__result {
  flex: 1;
  min-height: 0;
}

.diff-view__result--full {
  border-top: none;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 0 var(--spacing-md);
  min-height: 34px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.panel-header__meta {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
}

.panel-header__spacer {
  flex: 1;
}

.panel-header__actions {
  display: flex;
  gap: 2px;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-tertiary);
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}

.icon-btn:hover:not(:disabled) {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
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

.action-btn--primary {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: #fff;
  font-weight: 500;
}

.action-btn--primary:hover {
  background: var(--color-accent-hover);
  border-color: var(--color-accent-hover);
}
</style>
