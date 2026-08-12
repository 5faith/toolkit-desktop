<template>
  <div class="yaml-tree">
    <div
      v-for="(row, i) in visibleRows"
      :key="row.path"
      class="yaml-tree__row"
      :class="{ 'yaml-tree__row--match': isCurrentMatch(row.path) }"
    >
      <span class="yaml-tree__line-num">{{ i + 1 }}</span>
      <span
        v-if="row.hasToggle"
        class="yaml-tree__toggle"
        @click="toggleFold(row.path)"
      >{{ collapsedSet.has(row.path) ? '▸' : '▾' }}</span>
      <span v-else class="yaml-tree__toggle yaml-tree__toggle--placeholder" />
      <span class="yaml-tree__content" :style="{ paddingLeft: row.depth * 16 + 'px' }">
        <template v-for="(seg, si) in row.segments" :key="si">
          <span v-if="seg.type === 'key'" class="yt-key"><span v-if="search" v-html="highlight(seg.text)" /><span v-else>{{ seg.text }}</span></span>
          <span v-else-if="seg.type === 'colon'" class="yt-colon">{{ seg.text }}</span>
          <span v-else-if="seg.type === 'string'" class="yt-string"><span v-if="search" v-html="highlight(seg.text)" /><span v-else>{{ seg.text }}</span></span>
          <span v-else-if="seg.type === 'number'" class="yt-number"><span v-if="search" v-html="highlight(seg.text)" /><span v-else>{{ seg.text }}</span></span>
          <span v-else-if="seg.type === 'boolean'" class="yt-boolean"><span v-if="search" v-html="highlight(seg.text)" /><span v-else>{{ seg.text }}</span></span>
          <span v-else-if="seg.type === 'null'" class="yt-null"><span v-if="search" v-html="highlight(seg.text)" /><span v-else>{{ seg.text }}</span></span>
          <span v-else-if="seg.type === 'dash'" class="yt-dash">{{ seg.text }}</span>
          <span v-else-if="seg.type === 'ellipsis'" class="yt-ellipsis"><span v-if="search" v-html="highlight(seg.text)" /><span v-else>{{ seg.text }}</span></span>
        </template>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { parse as yamlParse } from 'yaml'

type SegType = 'key' | 'colon' | 'string' | 'number' | 'boolean' | 'null' | 'dash' | 'ellipsis'
interface Seg { type: SegType; text: string }
interface Row {
  path: string
  depth: number
  segments: Seg[]
  hasToggle: boolean
  parentPath: string
}

const props = defineProps<{ yamlText: string; search?: string }>()

const collapsedSet = ref(new Set<string>())
const searchIndex = ref(0)
const searchTotal = ref(0)
const emit = defineEmits<{
  'search-change': [info: { currentIndex: number; totalCount: number }]
}>()

function seg(type: SegType, text: string): Seg { return { type, text } }

const allRows = computed<Row[]>(() => {
  if (!props.yamlText) return []
  try {
    const doc = yamlParse(props.yamlText)
    if (doc === undefined || doc === null) return []
    return flatten(doc, 'root', '', 0)
  } catch { return [] }
})

const visibleRows = computed(() => {
  if (collapsedSet.value.size === 0) return allRows.value
  return allRows.value.filter(row => {
    let cur = row.parentPath
    while (cur) {
      if (collapsedSet.value.has(cur)) return false
      const dot = cur.lastIndexOf('.')
      cur = dot > 0 ? cur.substring(0, dot) : ''
    }
    return true
  })
})

watch(() => props.search, () => { searchIndex.value = 0; updateSearchTotal() })
watch(visibleRows, () => { updateSearchTotal() })

function flatten(data: unknown, path: string, parentPath: string, depth: number): Row[] {
  if (data === null || data === undefined) {
    return [{ path, parentPath, depth, hasToggle: false, segments: [seg('null', 'null')] }]
  }
  if (typeof data === 'string') {
    return [{ path, parentPath, depth, hasToggle: false, segments: [seg('string', data)] }]
  }
  if (typeof data === 'number') {
    return [{ path, parentPath, depth, hasToggle: false, segments: [seg('number', String(data))] }]
  }
  if (typeof data === 'boolean') {
    return [{ path, parentPath, depth, hasToggle: false, segments: [seg('boolean', String(data))] }]
  }
  if (Array.isArray(data)) return flattenArray(data, path, parentPath, depth)
  if (typeof data === 'object') return flattenObject(data as Record<string, unknown>, path, parentPath, depth)
  return [{ path, parentPath, depth, hasToggle: false, segments: [seg('string', String(data))] }]
}

function flattenObject(obj: Record<string, unknown>, path: string, parentPath: string, depth: number): Row[] {
  const keys = Object.keys(obj)
  const isCollapsed = collapsedSet.value.has(path)

  if (isCollapsed) {
    return [{ path, parentPath, depth, hasToggle: true, segments: [seg('key', `{...} ${keys.length} items`)] }]
  }

  const rows: Row[] = []
  for (const k of keys) {
    const v = obj[k]
    const childPath = `${path}.${k}`
    const isObject = v !== null && v !== undefined && typeof v === 'object'

    if (isObject) {
      const isChildCollapsed = collapsedSet.value.has(childPath)
      const childCount = typeof v === 'object' && v !== null
        ? (Array.isArray(v) ? v.length : Object.keys(v).length)
        : 0
      rows.push({
        path: childPath,
        parentPath: path,
        depth,
        hasToggle: true,
        segments: [
          seg('key', k),
          seg('colon', ': '),
          seg('ellipsis', isChildCollapsed ? `{...} ${childCount} items` : `{${childCount}}`),
        ],
      })
      if (!isChildCollapsed) {
        rows.push(...flatten(v, childPath, path, depth + 1))
      }
    } else {
      rows.push({
        path: childPath,
        parentPath: path,
        depth,
        hasToggle: false,
        segments: [seg('key', k), seg('colon', ': '), ...valueSegs(v)],
      })
    }
  }
  return rows
}

function flattenArray(arr: unknown[], path: string, parentPath: string, depth: number): Row[] {
  const isCollapsed = collapsedSet.value.has(path)

  if (isCollapsed) {
    return [{ path, parentPath, depth, hasToggle: true, segments: [seg('key', `[...] ${arr.length} items`)] }]
  }

  const rows: Row[] = []
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i]
    const childPath = `${path}[${i}]`
    const isObject = v !== null && v !== undefined && typeof v === 'object'

    if (isObject) {
      const childCount = Array.isArray(v) ? v.length : Object.keys(v).length
      rows.push({
        path: childPath,
        parentPath: path,
        depth,
        hasToggle: true,
        segments: [
          seg('dash', '- '),
          seg('ellipsis', `[${childCount}]`),
        ],
      })
      rows.push(...flatten(v, childPath, path, depth + 1))
    } else {
      rows.push({
        path: childPath,
        parentPath: path,
        depth,
        hasToggle: false,
        segments: [seg('dash', '- '), ...valueSegs(v)],
      })
    }
  }
  return rows
}

function valueSegs(v: unknown): Seg[] {
  if (v === null || v === undefined) return [seg('null', 'null')]
  if (typeof v === 'string') return [seg('string', v)]
  if (typeof v === 'number') return [seg('number', String(v))]
  if (typeof v === 'boolean') return [seg('boolean', String(v))]
  return [seg('string', String(v))]
}

function toggleFold(path: string) {
  const s = new Set(collapsedSet.value)
  s.has(path) ? s.delete(path) : s.add(path)
  collapsedSet.value = s
}

function highlight(text: string): string {
  if (!props.search) return esc(text)
  const re = new RegExp(`(${props.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return esc(text).replace(re, '<mark class="search-hl">$1</mark>')
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function isCurrentMatch(path: string): boolean {
  if (!props.search || searchTotal.value === 0) return false
  const matches = allRows.value.filter(r => rMatch(r)).map(r => r.path)
  return matches[searchIndex.value - 1] === path
}

function rMatch(r: Row): boolean {
  if (!props.search) return false
  const kw = props.search.toLowerCase()
  return r.segments.some(s => s.text.toLowerCase().includes(kw))
}

function updateSearchTotal() {
  if (!props.search) {
    searchTotal.value = 0
    searchIndex.value = 0
    emit('search-change', { currentIndex: 0, totalCount: 0 })
    return
  }
  const count = visibleRows.value.filter(r => rMatch(r)).length
  searchTotal.value = count
  if (count > 0 && searchIndex.value === 0) searchIndex.value = 1
  if (count === 0) searchIndex.value = 0
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

defineExpose({ nextMatch, prevMatch, searchTotal, searchIndex })
</script>

<style scoped>
.yaml-tree {
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.6;
  overflow: auto;
  padding: var(--spacing-sm) 0;
}
.yaml-tree__row {
  display: flex;
  align-items: baseline;
  padding: 0 var(--spacing-md);
  white-space: nowrap;
}
.yaml-tree__row--match { background: var(--color-accent-light); }
.yaml-tree__line-num {
  width: 36px;
  text-align: right;
  padding-right: var(--spacing-sm);
  color: var(--color-text-tertiary);
  user-select: none;
  flex-shrink: 0;
}
.yaml-tree__toggle {
  width: 16px;
  text-align: center;
  cursor: pointer;
  color: var(--color-text-tertiary);
  user-select: none;
  flex-shrink: 0;
}
.yaml-tree__toggle:hover { color: var(--color-accent); }
.yaml-tree__toggle--placeholder { cursor: default; }
.yaml-tree__toggle--placeholder:hover { color: var(--color-text-tertiary); }
.yaml-tree__content { flex: 1; }
:deep(.search-hl) { background: #fbbf24; color: #000; border-radius: 2px; padding: 0 1px; }
.yt-key { color: #881391; }
.yt-string { color: #137e13; }
.yt-number { color: #1a1ae5; }
.yt-boolean { color: #e06c00; }
.yt-null { color: #e06c00; font-style: italic; }
.yt-colon { color: var(--color-text-secondary); }
.yt-dash { color: var(--color-text-secondary); }
.yt-ellipsis { color: var(--color-text-tertiary); font-style: italic; }
[data-theme="dark"] .yt-key { color: #c792ea; }
[data-theme="dark"] .yt-string { color: #7ec699; }
[data-theme="dark"] .yt-number { color: #f78c6c; }
[data-theme="dark"] .yt-boolean { color: #ff9d00; }
[data-theme="dark"] .yt-null { color: #ff9d00; font-style: italic; }
</style>
