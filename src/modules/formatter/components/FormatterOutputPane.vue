<template>
  <section class="formatter-card">
    <div class="formatter-card__head">
      <span class="formatter-card__dot formatter-card__dot--out" />
      <span class="formatter-card__title">Output</span>
      <span v-if="store.outputText" class="formatter-card__badge formatter-card__badge--ok">
        {{ outputLineCount }} lines
      </span>
      <div class="formatter-card__spacer" />
      <div v-if="store.outputText" class="search-box">
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
      <div class="formatter-card__actions">
        <button
          class="formatter-card__icon-btn"
          :class="{ 'formatter-card__icon-btn--on': wrapOutput }"
          title="Toggle line wrap"
          @click="wrapOutput = !wrapOutput"
        >⏎</button>
        <button
          class="formatter-card__icon-btn"
          title="Copy output"
          :disabled="!store.outputText"
          @click="copyOutput"
        >⧉</button>
        <button
          class="formatter-card__icon-btn"
          title="Download output"
          :disabled="!store.outputText"
          @click="downloadOutput"
        >⬇</button>
      </div>
    </div>
    <div class="formatter-card__body">
      <template v-if="store.mode === 'json' && jsonParsed !== null">
        <JsonTreeView
          ref="treeViewRef"
          :data="jsonParsed"
          :search="searchKeyword"
          class="tree-output"
          @search-change="onSearchChange"
        />
      </template>
      <template v-else-if="store.mode === 'xml' && store.outputText">
        <XmlTreeView
          ref="xmlTreeViewRef"
          :xml-text="store.outputText"
          :search="searchKeyword"
          class="tree-output"
          @search-change="onSearchChange"
        />
      </template>
      <template v-else-if="store.mode === 'yaml' && store.outputText">
        <YamlTreeView
          ref="yamlTreeViewRef"
          :yaml-text="store.outputText"
          :search="searchKeyword"
          class="tree-output"
          @search-change="onSearchChange"
        />
      </template>
      <template v-else>
        <CodeEditor
          ref="outputEditorRef"
          v-model="store.outputText"
          placeholder="Formatted output..."
          :readonly="true"
          :wrap="wrapOutput"
          show-line-numbers
        />
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import CodeEditor from '@shared/components/CodeEditor.vue'
import JsonTreeView from './JsonTreeView.vue'
import XmlTreeView from './XmlTreeView.vue'
import YamlTreeView from './YamlTreeView.vue'
import { useFormatterStore } from '../store'
import { copyToClipboard } from '@shared/utils/clipboard'

defineOptions({ name: 'FormatterOutputPane' })

const store = useFormatterStore()

const searchKeyword = ref('')
const searchIndex = ref(0)
const searchTotal = ref(0)
const wrapOutput = ref(true)
const treeViewRef = ref<InstanceType<typeof JsonTreeView>>()
const xmlTreeViewRef = ref<InstanceType<typeof XmlTreeView>>()
const yamlTreeViewRef = ref<InstanceType<typeof YamlTreeView>>()
const outputEditorRef = ref<InstanceType<typeof CodeEditor>>()

const jsonParsed = computed(() => {
  if (!store.outputText) return null
  try {
    return JSON.parse(store.outputText)
  } catch {
    return null
  }
})

const outputLineCount = computed(() => store.outputText.split('\n').length)

async function copyOutput() {
  if (store.outputText) {
    await copyToClipboard(store.outputText)
  }
}

function downloadOutput() {
  if (!store.outputText) return
  const ext = store.mode
  const blob = new Blob([store.outputText], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `output.${ext}`
  anchor.click()
  URL.revokeObjectURL(url)
}

function onSearchEnter() {
  searchNext()
}

function onSearchInput() {
  searchIndex.value = 0
  updateTextSearchTotal()
}

function onSearchChange(info: { currentIndex: number; totalCount: number }) {
  searchIndex.value = info.currentIndex
  searchTotal.value = info.totalCount
}

function updateTextSearchTotal() {
  if (store.mode === 'json') return
  const text = store.outputText
  const keyword = searchKeyword.value
  if (!text || !keyword) {
    searchTotal.value = 0
    searchIndex.value = 0
    return
  }
  let count = 0
  let pos = 0
  const lowerText = text.toLowerCase()
  const lowerKeyword = keyword.toLowerCase()
  while ((pos = lowerText.indexOf(lowerKeyword, pos)) !== -1) {
    count++
    pos += lowerKeyword.length
  }
  searchTotal.value = count
  if (count > 0 && searchIndex.value >= count) {
    searchIndex.value = 0
  }
  highlightTextMatch()
}

function highlightTextMatch() {
  if (store.mode === 'json') return
  const textarea = outputEditorRef.value?.textareaRef
  if (!textarea || !searchKeyword.value || searchTotal.value === 0) return
  const text = store.outputText
  const keyword = searchKeyword.value
  const lowerText = text.toLowerCase()
  const lowerKeyword = keyword.toLowerCase()
  let pos = 0
  let matchIndex = 0
  while (pos < lowerText.length) {
    const found = lowerText.indexOf(lowerKeyword, pos)
    if (found === -1) break
    if (matchIndex === searchIndex.value) {
      textarea.focus()
      textarea.setSelectionRange(found, found + keyword.length)
      const lineHeight = 20.8
      const linesBefore = text.substring(0, found).split('\n').length - 1
      textarea.scrollTop = Math.max(0, linesBefore * lineHeight - textarea.clientHeight / 2)
      return
    }
    matchIndex++
    pos = found + lowerKeyword.length
  }
}

function searchNext() {
  if (store.mode === 'json') {
    treeViewRef.value?.nextMatch()
  } else if (store.mode === 'xml') {
    xmlTreeViewRef.value?.nextMatch()
  } else if (store.mode === 'yaml') {
    yamlTreeViewRef.value?.nextMatch()
  } else {
    if (searchTotal.value === 0) return
    searchIndex.value = (searchIndex.value + 1) % searchTotal.value
    highlightTextMatch()
  }
}

function searchPrev() {
  if (store.mode === 'json') {
    treeViewRef.value?.prevMatch()
  } else if (store.mode === 'xml') {
    xmlTreeViewRef.value?.prevMatch()
  } else if (store.mode === 'yaml') {
    yamlTreeViewRef.value?.prevMatch()
  } else {
    if (searchTotal.value === 0) return
    searchIndex.value = (searchIndex.value - 1 + searchTotal.value) % searchTotal.value
    highlightTextMatch()
  }
}

watch(() => store.mode, () => {
  searchKeyword.value = ''
  searchIndex.value = 0
  searchTotal.value = 0
})

watch(searchKeyword, () => {
  nextTick(updateTextSearchTotal)
})
</script>

<style scoped src="./formatter-card.css"></style>
