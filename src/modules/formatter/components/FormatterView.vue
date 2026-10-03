<template>
  <div class="formatter-view">
    <FormatterToolbar
      :mode="store.mode"
      :copied="copied"
      :compress-copied="compressCopied"
      @update:mode="store.setMode"
      @format="formatter.format()"
      @unescape="formatter.unescape()"
      @compress-copy="handleCompressCopy"
      @copy="copyOutput"
    />

    <div class="formatter-view__panels">
      <section class="formatter-card">
        <div class="formatter-card__head">
          <span class="formatter-card__dot formatter-card__dot--in" />
          <span class="formatter-card__title">Input</span>
          <span
            v-if="inputValidation"
            class="formatter-card__badge"
            :class="inputValidation.valid ? 'formatter-card__badge--ok' : 'formatter-card__badge--err'"
            :title="inputValidation.error ?? ''"
          >
            {{ inputValidation.valid ? `Valid ${store.mode.toUpperCase()}` : 'Invalid' }}
          </span>
          <div class="formatter-card__spacer" />
          <div class="formatter-card__actions">
            <button
              class="formatter-card__icon-btn"
              title="Paste from clipboard"
              @click="pasteInput"
            >📋</button>
            <button
              class="formatter-card__icon-btn"
              title="Clear input"
              :disabled="!store.inputText"
              @click="store.setInput('')"
            >✕</button>
          </div>
        </div>
        <div class="formatter-card__body">
          <CodeEditor v-model="store.inputText" placeholder="Paste your code here..." show-line-numbers />
        </div>
      </section>

      <div class="formatter-view__swap">
        <button class="formatter-view__swap-btn" title="Swap input/output" @click="store.swap()">⇄</button>
      </div>

      <FormatterOutputPane />
    </div>

    <div v-if="store.error" class="formatter-view__error">
      {{ store.error }}
    </div>

    <div class="formatter-view__stats">
      <span>In: {{ inputStats }}</span>
      <span>Out: {{ outputStats }}</span>
      <span v-if="store.durationMs !== null">Formatted in {{ store.durationMs }}ms</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import CodeEditor from '@shared/components/CodeEditor.vue'
import FormatterToolbar from './FormatterToolbar.vue'
import FormatterOutputPane from './FormatterOutputPane.vue'
import { useFormatterStore } from '../store'
import { useFormatter } from '../composables/useFormatter'
import { useValidation } from '../composables/useValidation'
import { useNotification } from '@shared/composables/useNotification'
import { copyToClipboard } from '@shared/utils/clipboard'

defineOptions({ name: 'FormatterView' })

const store = useFormatterStore()
const formatter = useFormatter()
const notification = useNotification()

const compressCopied = ref(false)
let compressCopyTimer: ReturnType<typeof setTimeout> | null = null
const copied = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | null = null

const { validateJsonSyntax, validateXmlSyntax, validateYamlSyntax } = useValidation()

const inputValidation = computed(() => {
  if (!store.inputText.trim()) return null
  if (store.mode === 'json') return validateJsonSyntax(store.inputText)
  if (store.mode === 'xml') return validateXmlSyntax(store.inputText)
  return validateYamlSyntax(store.inputText)
})

function textStats(text: string): string {
  if (!text) return '0 lines · 0 chars'
  return `${text.split('\n').length} lines · ${text.length} chars`
}

const inputStats = computed(() => textStats(store.inputText))
const outputStats = computed(() => textStats(store.outputText))

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

async function pasteInput() {
  try {
    const text = await navigator.clipboard.readText()
    if (text) store.setInput(text)
  } catch {
    notification.error('Unable to read clipboard')
  }
}
</script>

<style scoped src="./formatter-card.css"></style>

<style scoped>
.formatter-view {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  height: 100%;
  min-height: 0;
}

.formatter-view__panels {
  position: relative;
  display: flex;
  gap: var(--spacing-sm);
  flex: 1;
  min-height: 0;
}

.formatter-view__swap {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 5;
}

.formatter-view__swap-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--color-border-hover);
  border-radius: 50%;
  background: var(--color-bg-primary);
  color: var(--color-text-secondary);
  font-size: 14px;
  cursor: pointer;
  box-shadow: var(--shadow-md);
  transition: color 0.15s, border-color 0.15s, transform 0.25s;
}

.formatter-view__swap-btn:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
  transform: rotate(180deg);
}

.formatter-view__error {
  padding: var(--spacing-xs) var(--spacing-md);
  border: 1px solid color-mix(in srgb, var(--color-error) 35%, transparent);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
  color: var(--color-error);
  font-size: 12.5px;
  flex-shrink: 0;
}

.formatter-view__stats {
  display: flex;
  gap: var(--spacing-md);
  padding: 0 var(--spacing-xs);
  font-size: 11px;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}
</style>
