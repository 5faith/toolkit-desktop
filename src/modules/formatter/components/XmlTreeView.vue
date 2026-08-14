<template>
  <div class="xml-tree" @scroll="onScroll">
    <div v-if="parseErrorText" class="xml-tree__error">{{ parseErrorText }}</div>
    <div
      v-for="(row, i) in visibleRows"
      :key="row.path"
      class="xml-tree__row"
      :class="{ 'xml-tree__row--match': isCurrentMatch(row.path) }"
    >
      <span class="xml-tree__line-num">{{ i + 1 }}</span>
      <span
        v-if="row.hasToggle"
        class="xml-tree__toggle"
        @click="toggleFold(row.path)"
      >{{ collapsedSet.has(row.path) ? '▸' : '▾' }}</span>
      <span v-else class="xml-tree__toggle xml-tree__toggle--placeholder" />
      <span class="xml-tree__content" :style="{ paddingLeft: row.depth * 16 + 'px' }">
        <template v-if="row.collapsedSummary">
          <span class="xt-tag">{{ row.collapsedSummary }}</span>
        </template>
        <template v-else>
          <template v-for="(seg, si) in row.segments" :key="si">
            <span v-if="seg.type === 'tag'" class="xt-tag"><span v-if="search" v-html="highlight(seg.text)" /><span v-else>{{ seg.text }}</span></span>
            <span v-else-if="seg.type === 'attr-name'" class="xt-attr-name"><span v-if="search" v-html="highlight(seg.text)" /><span v-else>{{ seg.text }}</span></span>
            <span v-else-if="seg.type === 'attr-value'" class="xt-attr-value"><span v-if="search" v-html="highlight(seg.text)" /><span v-else>{{ seg.text }}</span></span>
            <span v-else-if="seg.type === 'text'" class="xt-text"><span v-if="search" v-html="highlight(seg.text)" /><span v-else>{{ seg.text }}</span></span>
            <span v-else-if="seg.type === 'bracket'" class="xt-bracket">{{ seg.text }}</span>
            <span v-else-if="seg.type === 'equals'" class="xt-equals">{{ seg.text }}</span>
            <span v-else-if="seg.type === 'ellipsis'" class="xt-ellipsis"><span v-if="search" v-html="highlight(seg.text)" /><span v-else>{{ seg.text }}</span></span>
          </template>
        </template>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

type SegmentType = 'tag' | 'attr-name' | 'attr-value' | 'text' | 'bracket' | 'equals' | 'ellipsis'

interface Segment {
  type: SegmentType
  text: string
}

interface TreeRow {
  path: string
  depth: number
  segments: Segment[]
  hasToggle: boolean
  parentPath: string
  collapsedSummary?: string
}

const props = defineProps<{
  xmlText: string
  search?: string
}>()

const collapsedSet = ref(new Set<string>())
const searchIndex = ref(0)
const searchTotal = ref(0)
const emit = defineEmits<{
  'search-change': [info: { currentIndex: number; totalCount: number }]
}>()

const parseErrorText = ref('')

const allRows = computed<TreeRow[]>(() => {
  parseErrorText.value = ''
  if (!props.xmlText) return []
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(props.xmlText, 'application/xml')
    const parseError = doc.querySelector('parsererror')
    if (parseError) {
      parseErrorText.value = parseError.textContent || 'XML parse error'
      return []
    }
    return buildFromNode(doc.documentElement, 'root', '', 0)
  } catch (e) {
    parseErrorText.value = String(e)
    return []
  }
})

const visibleRows = computed(() => {
  if (collapsedSet.value.size === 0) return allRows.value
  return allRows.value.filter(row => {
    if (collapsedSet.value.has(row.path)) return true
    let current = row.parentPath
    while (current) {
      if (collapsedSet.value.has(current)) return false
      const lastDot = current.lastIndexOf('.')
      current = lastDot > 0 ? current.substring(0, lastDot) : ''
    }
    return true
  })
})

watch(() => props.search, () => {
  searchIndex.value = 0
  updateSearchTotal()
})

watch(visibleRows, () => {
  updateSearchTotal()
})

function s(type: SegmentType, text: string): Segment {
  return { type, text }
}

function buildFromNode(node: Element, path: string, parentPath: string, depth: number): TreeRow[] {
  const rows: TreeRow[] = []
  const tagName = node.tagName
  const hasChildren = node.children.length > 0
  const isCollapsed = collapsedSet.value.has(path)

  const attrs: Segment[] = []
  for (const attr of Array.from(node.attributes)) {
    attrs.push(s('equals', ' '))
    attrs.push(s('attr-name', attr.name))
    attrs.push(s('equals', '='))
    attrs.push(s('attr-value', `"${attr.value}"`))
  }

  if (isCollapsed) {
    const childCount = node.children.length
    const summary = childCount > 0 ? `<${tagName}>...<\/${tagName}> ${childCount} children` : `<${tagName} />`
    rows.push(R(path, parentPath, depth, true, [], summary))
    return rows
  }

  if (!hasChildren) {
    const text = node.textContent?.trim() || ''
    if (text) {
      rows.push(R(path, parentPath, depth, text.length > 50, [
        s('bracket', '<'),
        s('tag', tagName),
        ...attrs,
        s('bracket', '>'),
        s('text', text),
        s('bracket', '<\/'),
        s('tag', tagName),
        s('bracket', '>'),
      ], text.length > 50 ? `<${tagName}>...<\/${tagName}>` : undefined))
    } else {
      rows.push(R(path, parentPath, depth, false, [
        s('bracket', '<'),
        s('tag', tagName),
        ...attrs,
        s('bracket', ' />'),
      ]))
    }
    return rows
  }

  const childCount = node.children.length
  rows.push(R(path, parentPath, depth, true, [
    s('bracket', '<'),
    s('tag', tagName),
    ...attrs,
    s('bracket', '>'),
    s('ellipsis', childCount > 0 ? ` // ${childCount} children` : ''),
  ]))

  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i]
    const childPath = `${path}.${child.tagName}[${i}]`
    const childRows = buildFromNode(child, childPath, path, depth + 1)
    for (const r of childRows) rows.push(r)
  }

  rows.push(R(`${path}__end`, parentPath, depth, false, [
    s('bracket', '<\/'),
    s('tag', tagName),
    s('bracket', '>'),
  ]))

  return rows
}

function R(path: string, parentPath: string, depth: number, hasToggle: boolean, segments: Segment[], collapsedSummary?: string): TreeRow {
  return { path, depth, segments, hasToggle, parentPath, collapsedSummary }
}

function toggleFold(path: string) {
  const newSet = new Set(collapsedSet.value)
  if (newSet.has(path)) {
    newSet.delete(path)
  } else {
    newSet.add(path)
  }
  collapsedSet.value = newSet
}

function highlight(text: string): string {
  if (!props.search) return escHtml(text)
  const escaped = props.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  return escHtml(text).replace(regex, '<mark class="search-hl">$1</mark>')
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function isCurrentMatch(path: string): boolean {
  if (!props.search || searchTotal.value === 0) return false
  const matchPaths = allRows.value
    .filter(r => rowMatchesSearch(r))
    .map(r => r.path)
  return matchPaths[searchIndex.value - 1] === path
}

function rowMatchesSearch(row: TreeRow): boolean {
  if (!props.search) return false
  const kw = props.search.toLowerCase()
  if (row.collapsedSummary) return row.collapsedSummary.toLowerCase().includes(kw)
  return row.segments.some(s => s.text.toLowerCase().includes(kw))
}

function updateSearchTotal() {
  if (!props.search) {
    searchTotal.value = 0
    searchIndex.value = 0
    emit('search-change', { currentIndex: 0, totalCount: 0 })
    return
  }
  const count = visibleRows.value.filter(r => rowMatchesSearch(r)).length
  searchTotal.value = count
  if (count > 0 && searchIndex.value === 0) {
    searchIndex.value = 1
  }
  if (count === 0) {
    searchIndex.value = 0
  }
  emit('search-change', { currentIndex: searchIndex.value, totalCount: searchTotal.value })
}

function nextMatch() {
  if (searchTotal.value === 0) return
  searchIndex.value = searchIndex.value >= searchTotal.value ? 1 : searchIndex.value + 1
}

function prevMatch() {
  if (searchTotal.value === 0) return
  searchIndex.value = searchIndex.value <= 1 ? searchTotal.value : searchIndex.value - 1
}

function onScroll() {}

defineExpose({ nextMatch, prevMatch, searchTotal, searchIndex })
</script>

<style scoped>
.xml-tree {
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.6;
  overflow: auto;
  padding: var(--spacing-sm) 0;
}

.xml-tree__row {
  display: flex;
  align-items: baseline;
  padding: 0 var(--spacing-md);
  white-space: nowrap;
}

.xml-tree__row--match {
  background: var(--color-accent-light);
}

.xml-tree__line-num {
  width: 36px;
  text-align: right;
  padding-right: var(--spacing-sm);
  color: var(--color-text-tertiary);
  user-select: none;
  flex-shrink: 0;
}

.xml-tree__toggle {
  width: 16px;
  text-align: center;
  cursor: pointer;
  color: var(--color-text-tertiary);
  user-select: none;
  flex-shrink: 0;
}

.xml-tree__toggle:hover {
  color: var(--color-accent);
}

.xml-tree__toggle--placeholder {
  cursor: default;
}

.xml-tree__toggle--placeholder:hover {
  color: var(--color-text-tertiary);
}

.xml-tree__content {
  flex: 1;
}

:deep(.search-hl) {
  background: #fbbf24;
  color: #000;
  border-radius: 2px;
  padding: 0 1px;
}

.xt-tag { color: #881391; }
.xt-attr-name { color: #e06c00; }
.xt-attr-value { color: #137e13; }
.xt-text { color: var(--color-text-primary); }
.xt-bracket { color: var(--color-text-secondary); }
.xt-equals { color: var(--color-text-secondary); }
.xt-ellipsis { color: var(--color-text-tertiary); font-style: italic; }

[data-theme="dark"] .xt-tag { color: #c792ea; }
[data-theme="dark"] .xt-attr-name { color: #ff9d00; }
[data-theme="dark"] .xt-attr-value { color: #7ec699; }

.xml-tree__error {
  padding: var(--spacing-md);
  color: var(--color-error);
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
