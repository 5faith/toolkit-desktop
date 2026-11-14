<template>
  <section class="diff-result">
    <div class="diff-result__header">
      <span class="diff-result__title">Diff Result</span>
      <template v-if="hasResult">
        <span class="diff-stat diff-stat--added">+{{ stats.added }}</span>
        <span class="diff-stat diff-stat--removed">-{{ stats.removed }}</span>
        <span class="diff-stat">{{ stats.unchanged }} unchanged</span>
      </template>
      <div class="diff-result__spacer" />
      <div class="diff-result__modes">
        <button
          class="mode-btn"
          :class="{ 'mode-btn--active': store.viewMode === 'side-by-side' }"
          @click="store.setViewMode('side-by-side')"
        >
          Side by Side
        </button>
        <button
          class="mode-btn"
          :class="{ 'mode-btn--active': store.viewMode === 'unified' }"
          @click="store.setViewMode('unified')"
        >
          Unified
        </button>
      </div>
    </div>

    <div v-if="!hasResult" class="diff-result__empty">
      粘贴两段文本后点击 Compare
    </div>

    <div v-else-if="store.viewMode === 'side-by-side'" class="diff-side">
      <div class="diff-side__panel">
        <div
          ref="leftScrollRef"
          class="diff-side__scroll"
          @scroll="syncScroll('left')"
        >
          <div
            v-for="(line, i) in leftLines"
            :key="'l' + i"
            class="diff-line"
            :class="{
              'diff-line--removed': line.type === 'removed',
              'diff-line--padding': line.type === 'padding',
            }"
          >
            <pre class="diff-line__text">{{ line.text }}</pre>
          </div>
        </div>
      </div>
      <div class="diff-side__panel">
        <div
          ref="rightScrollRef"
          class="diff-side__scroll"
          @scroll="syncScroll('right')"
        >
          <div
            v-for="(line, i) in rightLines"
            :key="'r' + i"
            class="diff-line"
            :class="{
              'diff-line--added': line.type === 'added',
              'diff-line--padding': line.type === 'padding',
            }"
          >
            <pre class="diff-line__text">{{ line.text }}</pre>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="diff-unified">
      <div
        v-for="(change, index) in changes"
        :key="index"
        class="diff-line"
        :class="{
          'diff-line--added': change.added,
          'diff-line--removed': change.removed,
        }"
      >
        <span class="diff-line__marker">{{ change.added ? '+' : change.removed ? '-' : ' ' }}</span>
        <pre class="diff-line__text">{{ change.value }}</pre>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Change } from 'diff'
import { useDiffStore } from '../store'

defineOptions({ name: 'DiffResultPane' })

const props = defineProps<{
  changes: Change[]
}>()

const store = useDiffStore()

interface DiffLine {
  text: string
  type: 'added' | 'removed' | 'unchanged' | 'padding'
}

interface AlignedPair {
  left: DiffLine
  right: DiffLine
}

const hasResult = computed(() => props.changes.length > 0)

const stats = computed(() => {
  let added = 0
  let removed = 0
  let unchanged = 0

  for (const change of props.changes) {
    const count = change.count ?? change.value.split('\n').length
    if (change.added) added += count
    else if (change.removed) removed += count
    else unchanged += count
  }

  return { added, removed, unchanged }
})

const alignedLines = computed<AlignedPair[]>(() => {
  const pairs: AlignedPair[] = []

  for (const change of props.changes) {
    const lines = change.value.split('\n')

    if (change.removed) {
      for (const line of lines) {
        pairs.push({
          left: { text: line, type: 'removed' },
          right: { text: '', type: 'padding' },
        })
      }
    } else if (change.added) {
      for (const line of lines) {
        pairs.push({
          left: { text: '', type: 'padding' },
          right: { text: line, type: 'added' },
        })
      }
    } else {
      for (const line of lines) {
        pairs.push({
          left: { text: line, type: 'unchanged' },
          right: { text: line, type: 'unchanged' },
        })
      }
    }
  }

  return pairs
})

const leftLines = computed<DiffLine[]>(() => alignedLines.value.map(pair => pair.left))
const rightLines = computed<DiffLine[]>(() => alignedLines.value.map(pair => pair.right))

const leftScrollRef = ref<HTMLDivElement>()
const rightScrollRef = ref<HTMLDivElement>()
let syncing = false

function syncScroll(source: 'left' | 'right') {
  if (syncing) return
  syncing = true
  requestAnimationFrame(() => {
    const sourceEl = source === 'left' ? leftScrollRef.value : rightScrollRef.value
    const targetEl = source === 'left' ? rightScrollRef.value : leftScrollRef.value
    if (sourceEl && targetEl) {
      targetEl.scrollTop = sourceEl.scrollTop
    }
    syncing = false
  })
}
</script>

<style scoped>
.diff-result {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--color-bg-primary);
  border-top: 1px solid var(--color-border);
}

.diff-result__header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  min-height: 38px;
  padding: 0 var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.diff-result__title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.diff-result__spacer {
  flex: 1;
}

.diff-result__modes {
  display: flex;
  gap: var(--spacing-xs);
}

.diff-stat {
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--color-text-tertiary);
}

.diff-stat--added {
  color: #166534;
}

.diff-stat--removed {
  color: #991b1b;
}

.diff-result__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
  font-size: 13px;
}

.mode-btn {
  padding: 4px 10px;
  border-radius: var(--radius-md);
  font-size: 12px;
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

.diff-side {
  flex: 1;
  display: flex;
  gap: 1px;
  background: var(--color-border);
  min-height: 0;
}

.diff-side__panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-primary);
  min-height: 0;
}

.diff-side__scroll {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.diff-unified {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.diff-line {
  display: flex;
  padding: 0 var(--spacing-sm);
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.5;
}

.diff-line--added {
  background: #dcfce7;
  color: #166534;
}

.diff-line--removed {
  background: #fee2e2;
  color: #991b1b;
}

.diff-line--padding {
  background: var(--color-bg-secondary);
  min-height: 1.5em;
}

[data-theme="dark"] .diff-line--added {
  background: #14532d;
  color: #86efac;
}

[data-theme="dark"] .diff-line--removed {
  background: #7f1d1d;
  color: #fca5a5;
}

[data-theme="dark"] .diff-stat--added {
  color: #86efac;
}

[data-theme="dark"] .diff-stat--removed {
  color: #fca5a5;
}

.diff-line__marker {
  width: 20px;
  text-align: center;
  flex-shrink: 0;
  user-select: none;
}

.diff-line__text {
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}
</style>
