<template>
  <div class="json-tree" @scroll="onScroll">
    <div
      v-for="(row, i) in visibleRows"
      :key="row.path"
      class="json-tree__row"
      :class="{ 'json-tree__row--match': isCurrentMatch(row.path) }"
    >
      <span class="json-tree__line-num">{{ i + 1 }}</span>
      <span
        v-if="row.hasToggle"
        class="json-tree__toggle"
        @click="toggleFold(row.path)"
      >{{ collapsedSet.has(row.path) ? '▸' : '▾' }}</span>
      <span v-else class="json-tree__toggle json-tree__toggle--placeholder" />
      <span class="json-tree__content" :style="{ paddingLeft: row.depth * 16 + 'px' }">
        <template v-if="row.collapsedSummary">
          <span class="jt-bracket">{{ row.collapsedSummary }}</span>
        </template>
        <template v-else>
          <template v-for="(seg, si) in row.segments" :key="si">
            <span v-if="seg.type === 'key'" class="jt-key"><span v-if="search" v-html="highlight(seg.text)" /><span v-else>{{ seg.text }}</span></span>
            <span v-else-if="seg.type === 'colon'" class="jt-colon">: </span>
            <span v-else-if="seg.type === 'string'" class="jt-string"><span v-if="search" v-html="highlight(seg.text)" /><span v-else>{{ seg.text }}</span></span>
            <span v-else-if="seg.type === 'number'" class="jt-number"><span v-if="search" v-html="highlight(seg.text)" /><span v-else>{{ seg.text }}</span></span>
            <span v-else-if="seg.type === 'boolean'" class="jt-boolean"><span v-if="search" v-html="highlight(seg.text)" /><span v-else>{{ seg.text }}</span></span>
            <span v-else-if="seg.type === 'null'" class="jt-null"><span v-if="search" v-html="highlight(seg.text)" /><span v-else>{{ seg.text }}</span></span>
            <span v-else-if="seg.type === 'bracket'" class="jt-bracket">{{ seg.text }}</span>
            <span v-else-if="seg.type === 'comma'" class="jt-comma">,</span>
            <span v-else-if="seg.type === 'ellipsis'" class="jt-ellipsis"><span v-if="search" v-html="highlight(seg.text)" /><span v-else>{{ seg.text }}</span></span>
          </template>
        </template>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

type SegmentType = 'key' | 'colon' | 'string' | 'number' | 'boolean' | 'null' | 'bracket' | 'comma' | 'ellipsis'

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
  data: unknown
  search?: string
}>()

const collapsedSet = ref(new Set<string>())
const searchIndex = ref(0)
const searchTotal = ref(0)
const emit = defineEmits<{
  'search-change': [info: { currentIndex: number; totalCount: number }]
}>()

const allRows = computed<TreeRow[]>(() => {
  if (props.data === null || props.data === undefined) return []
  return buildRows(props.data, 'root', '', 0)
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

function buildRows(data: unknown, path: string, parentPath: string, depth: number): TreeRow[] {
  if (data === null) {
    return [R(path, parentPath, depth, false, [s('null', 'null')])]
  }

  const t = typeof data
  if (t === 'string') {
    return [R(path, parentPath, depth, false, [s('string', `"${esc(data as string)}"`)])]
  }
  if (t === 'number' || t === 'boolean') {
    return [R(path, parentPath, depth, false, [s(t, String(data))])]
  }

  if (Array.isArray(data)) {
    return buildArrayRows(data, path, parentPath, depth)
  }

  if (t === 'object') {
    return buildObjectRows(data as Record<string, unknown>, path, parentPath, depth)
  }

  return []
}

function buildObjectRows(obj: Record<string, unknown>, path: string, parentPath: string, depth: number): TreeRow[] {
  const keys = Object.keys(obj)
  const isCollapsed = collapsedSet.value.has(path)
  const rows: TreeRow[] = []

  if (isCollapsed) {
    rows.push(R(path, parentPath, depth, true, [], `{...} ${keys.length} items`))
    return rows
  }

  rows.push(R(path, parentPath, depth, keys.length > 0, [
    s('bracket', '{'),
    s('ellipsis', keys.length > 0 ? ` // ${keys.length} items` : ''),
  ]))

  for (let i = 0; i < keys.length; i++) {
    const k = keys[i]
    const v = obj[k]
    const childPath = `${path}.${k}`
    const isLast = i === keys.length - 1

    if (v !== null && typeof v === 'object') {
      const childRows = buildRows(v, childPath, path, depth + 1)
      if (childRows.length > 0) {
        const first = childRows[0]
        const summary = first.collapsedSummary
          ? `"${k}": ${first.collapsedSummary}`
          : undefined
        childRows[0] = R(first.path, first.parentPath, first.depth, first.hasToggle, [
          s('key', `"${k}"`),
          s('colon', ': '),
          ...first.segments,
        ], summary)
      }
      if (!isLast && childRows.length > 0) {
        const last = childRows[childRows.length - 1]
        childRows[childRows.length - 1] = R(last.path, last.parentPath, last.depth, last.hasToggle, [
          ...last.segments,
          s('comma', ','),
        ], last.collapsedSummary)
      }
      for (const r of childRows) rows.push(r)
    } else {
      rows.push(R(childPath, path, depth + 1, false, [
        s('key', `"${k}"`),
        s('colon', ': '),
        ...buildValueSegments(v),
        ...(isLast ? [] : [s('comma', ',')]),
      ]))
    }
  }

  rows.push(R(`${path}__end`, parentPath, depth, false, [s('bracket', '}')]))

  return rows
}

function buildArrayRows(arr: unknown[], path: string, parentPath: string, depth: number): TreeRow[] {
  const isCollapsed = collapsedSet.value.has(path)

  if (isCollapsed) {
    return [R(path, parentPath, depth, true, [], `[...] ${arr.length} items`)]
  }

  const rows: TreeRow[] = []

  rows.push(R(path, parentPath, depth, arr.length > 0, [
    s('bracket', '['),
    s('ellipsis', arr.length > 0 ? ` // ${arr.length} items` : ''),
  ]))

  for (let i = 0; i < arr.length; i++) {
    const v = arr[i]
    const childPath = `${path}[${i}]`
    const isLast = i === arr.length - 1

    if (v !== null && typeof v === 'object') {
      const childRows = buildRows(v, childPath, path, depth + 1)
      if (!isLast && childRows.length > 0) {
        const last = childRows[childRows.length - 1]
        childRows[childRows.length - 1] = R(last.path, last.parentPath, last.depth, last.hasToggle, [
          ...last.segments,
          s('comma', ','),
        ], last.collapsedSummary)
      }
      for (const r of childRows) rows.push(r)
    } else {
      rows.push(R(childPath, path, depth + 1, false, [
        ...buildValueSegments(v),
        ...(isLast ? [] : [s('comma', ',')]),
      ]))
    }
  }

  rows.push(R(`${path}__end`, parentPath, depth, false, [s('bracket', ']')]))

  return rows
}

function buildValueSegments(v: unknown): Segment[] {
  if (v === null) return [s('null', 'null')]
  if (typeof v === 'string') return [s('string', `"${esc(v)}"`)]
  if (typeof v === 'number') return [s('number', String(v))]
  if (typeof v === 'boolean') return [s('boolean', String(v))]
  return [s('string', String(v))]
}

function R(path: string, parentPath: string, depth: number, hasToggle: boolean, segments: Segment[], collapsedSummary?: string): TreeRow {
  return { path, depth, segments, hasToggle, parentPath, collapsedSummary }
}

function esc(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
}

function toggleFold(path: string) {
  const s = new Set(collapsedSet.value)
  if (s.has(path)) {
    s.delete(path)
  } else {
    s.add(path)
  }
  collapsedSet.value = s
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

void highlight

defineExpose({ nextMatch, prevMatch, searchTotal, searchIndex })
</script>

<style scoped>
.json-tree {
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.6;
  overflow: auto;
  padding: var(--spacing-sm) 0;
}

.json-tree__row {
  display: flex;
  align-items: baseline;
  padding: 0 var(--spacing-md);
  white-space: nowrap;
}

.json-tree__row--match {
  background: var(--color-accent-light);
}

.json-tree__line-num {
  width: 36px;
  text-align: right;
  padding-right: var(--spacing-sm);
  color: var(--color-text-tertiary);
  user-select: none;
  flex-shrink: 0;
}

.json-tree__toggle {
  width: 16px;
  text-align: center;
  cursor: pointer;
  color: var(--color-text-tertiary);
  user-select: none;
  flex-shrink: 0;
}

.json-tree__toggle:hover {
  color: var(--color-accent);
}

.json-tree__toggle--placeholder {
  cursor: default;
}

.json-tree__toggle--placeholder:hover {
  color: var(--color-text-tertiary);
}

.json-tree__content {
  flex: 1;
}

:deep(.search-hl) {
  background: #fbbf24;
  color: #000;
  border-radius: 2px;
  padding: 0 1px;
}

.jt-key { color: #881391; }
.jt-string { color: #137e13; }
.jt-number { color: #1a1ae5; }
.jt-boolean { color: #e06c00; }
.jt-null { color: #e06c00; font-style: italic; }
.jt-bracket { color: var(--color-text-primary); }
.jt-colon { color: var(--color-text-secondary); }
.jt-comma { color: var(--color-text-secondary); }
.jt-ellipsis { color: var(--color-text-tertiary); font-style: italic; }

[data-theme="dark"] .jt-key { color: #c792ea; }
[data-theme="dark"] .jt-string { color: #7ec699; }
[data-theme="dark"] .jt-number { color: #f78c6c; }
[data-theme="dark"] .jt-boolean { color: #ff9d00; }
[data-theme="dark"] .jt-null { color: #ff9d00; font-style: italic; }
</style>
