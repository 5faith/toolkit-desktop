<template>
  <div class="formatter-view">
    <FormatterToolbar
      :mode="store.mode"
      :indent-size="store.indentSize"
      :compress-copied="compressCopied"
      @update:mode="store.setMode"
      @update:indent-size="store.setIndentSize"
      @format="formatter.format()"
      @unescape="formatter.unescape()"
      @compress-copy="handleCompressCopy"
    />

    <div v-if="store.error" class="formatter-view__error">
      {{ store.error }}
    </div>

    <SplitPane
      :model-value="store.splitRatio"
      direction="horizontal"
      :min="25"
      :max="75"
      :min-size="240"
      :default-ratio="50"
      class="formatter-view__panels"
      @update:model-value="store.setSplitRatio"
    >
      <template #first>
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
            <span class="formatter-card__stats">{{ inputStats }}</span>
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
      </template>

      <template #second>
        <FormatterOutputPane />
      </template>
    </SplitPane>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import CodeEditor from '@shared/components/CodeEditor.vue'
import SplitPane from '@shared/components/SplitPane.vue'
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
  flex: 1;
  min-height: 0;
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
</style>
