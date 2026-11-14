<template>
  <div
    ref="barRef"
    class="tab-bar"
    @wheel.prevent="onWheel"
  >
    <div v-if="tabs.length === 0" class="tab-bar__empty">
      No tabs open — pick a tool from the sidebar
    </div>

    <div
      v-for="(tab, index) in tabs"
      :key="tab.id"
      :ref="el => setTabRef(tab.id, el)"
      class="tab-bar__item"
      :class="{
        'tab-bar__item--active': tab.id === activeId,
        'tab-bar__item--dragging': drag?.dragging && drag.tabId === tab.id,
        'tab-bar__item--drop-target': drag?.dragging && dropIndex === index && drag.sourceIndex !== index,
      }"
      :style="tabStyle(tab.id)"
      :data-tab-id="tab.id"
      @click="onTabClick(tab.id)"
      @auxclick="onAuxClick($event, tab.id)"
      @contextmenu="onContextMenu($event, tab.id, index)"
      @pointerdown="onPointerDown($event, tab.id, index)"
    >
      <span class="tab-bar__icon">{{ tab.icon }}</span>
      <span class="tab-bar__name" :title="tab.name">{{ tab.name }}</span>
      <span
        class="tab-bar__close"
        title="Close"
        @click.stop="emit('close', tab.id)"
        @pointerdown.stop
      >✕</span>
    </div>

    <ContextMenu
      :visible="ctxVisible"
      :x="ctxX"
      :y="ctxY"
      :items="ctxItems"
      @select="onCtxSelect"
      @close="ctxVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch, type ComponentPublicInstance } from 'vue'
import ContextMenu from './ContextMenu.vue'
import type { ContextMenuItem } from './ContextMenu.vue'
import type { TabItem } from '@shared/types/tab'

const props = defineProps<{
  tabs: TabItem[]
  activeId: string
}>()

const emit = defineEmits<{
  activate: [id: string]
  close: [id: string]
  duplicate: [id: string]
  closeOthers: [id: string]
  closeRight: [id: string]
  closeAll: []
  move: [fromIndex: number, toIndex: number]
}>()

const barRef = ref<HTMLElement | null>(null)
const tabEls = new Map<string, HTMLElement>()

interface DragState {
  tabId: string
  sourceIndex: number
  startX: number
  dragging: boolean
  offsetX: number
}

const drag = reactive<DragState>({
  tabId: '',
  sourceIndex: -1,
  startX: 0,
  dragging: false,
  offsetX: 0,
})

const dropIndex = ref(-1)
let suppressClick = false

function setTabRef(id: string, el: Element | ComponentPublicInstance | null) {
  if (el instanceof HTMLElement) tabEls.set(id, el)
  else tabEls.delete(id)
}

function onTabClick(id: string) {
  if (suppressClick) return
  emit('activate', id)
}

function onAuxClick(event: MouseEvent, id: string) {
  if (event.button !== 1) return
  event.preventDefault()
  emit('close', id)
}

function tabStyle(id: string): Record<string, string> | undefined {
  if (!drag.dragging || drag.tabId !== id) return undefined
  return {
    transform: `translateX(${drag.offsetX}px)`,
    zIndex: '3',
    pointerEvents: 'none',
  }
}

function onWheel(event: WheelEvent) {
  const el = barRef.value
  if (!el) return
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
  el.scrollLeft += delta
}

function onPointerDown(event: PointerEvent, tabId: string, index: number) {
  if (event.button !== 0) return
  if ((event.target as HTMLElement).closest('.tab-bar__close')) return

  drag.tabId = tabId
  drag.sourceIndex = index
  drag.startX = event.clientX
  drag.dragging = false
  drag.offsetX = 0
  dropIndex.value = index

  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
}

function resolveDropIndex(clientX: number): number {
  let result = props.tabs.length - 1
  for (let i = 0; i < props.tabs.length; i++) {
    const el = tabEls.get(props.tabs[i].id)
    if (!el) continue
    const rect = el.getBoundingClientRect()
    if (clientX < rect.left + rect.width / 2) {
      result = i
      break
    }
  }
  return Math.max(result, 0)
}

function onPointerMove(event: PointerEvent) {
  if (!drag.tabId) return

  const deltaX = event.clientX - drag.startX
  if (!drag.dragging && Math.abs(deltaX) < 5) return

  drag.dragging = true
  drag.offsetX = deltaX
  dropIndex.value = resolveDropIndex(event.clientX)
}

function onPointerUp() {
  if (!drag.tabId) return

  if (drag.dragging) {
    suppressClick = true
    setTimeout(() => {
      suppressClick = false
    }, 0)

    if (dropIndex.value !== drag.sourceIndex && dropIndex.value >= 0) {
      emit('move', drag.sourceIndex, dropIndex.value)
    }
  }

  drag.tabId = ''
  drag.sourceIndex = -1
  drag.dragging = false
  drag.offsetX = 0
  dropIndex.value = -1

  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
}

watch(() => props.activeId, async (id) => {
  if (!id) return
  await nextTick()
  tabEls.get(id)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}, { immediate: true })

onBeforeUnmount(onPointerUp)

const ctxVisible = ref(false)
const ctxX = ref(0)
const ctxY = ref(0)
const ctxTabId = ref('')
const ctxIndex = ref(-1)

const ctxItems = computed<ContextMenuItem[]>(() => {
  const tab = props.tabs.find(item => item.id === ctxTabId.value)
  return [
    {
      label: 'Duplicate Tab',
      keyHint: 'Ctrl+Shift+D',
      disabled: !tab || !tab.duplicatable,
      action: 'duplicate',
    },
    { label: 'Close', keyHint: 'Ctrl+W', action: 'close' },
    { label: 'Close Others', disabled: props.tabs.length <= 1, action: 'closeOthers' },
    {
      label: 'Close Tabs to the Right',
      disabled: ctxIndex.value < 0 || ctxIndex.value >= props.tabs.length - 1,
      action: 'closeRight',
    },
    { separator: true },
    { label: 'Close All', danger: true, action: 'closeAll' },
  ]
})

function onContextMenu(event: MouseEvent, id: string, index: number) {
  event.preventDefault()
  event.stopPropagation()
  ctxTabId.value = id
  ctxIndex.value = index
  ctxX.value = event.clientX
  ctxY.value = event.clientY
  ctxVisible.value = false
  requestAnimationFrame(() => {
    ctxVisible.value = true
  })
}

function onCtxSelect(item: ContextMenuItem) {
  const id = ctxTabId.value
  if (!id) return
  if (item.action === 'duplicate') emit('duplicate', id)
  if (item.action === 'close') emit('close', id)
  if (item.action === 'closeOthers') emit('closeOthers', id)
  if (item.action === 'closeRight') emit('closeRight', id)
  if (item.action === 'closeAll') emit('closeAll')
}
</script>

<style scoped>
.tab-bar {
  display: flex;
  align-items: center;
  gap: 2px;
  min-height: 46px;
  padding: 5px 8px;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  flex-shrink: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.tab-bar::-webkit-scrollbar {
  display: none;
}

.tab-bar__empty {
  padding: 0 var(--spacing-sm);
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.tab-bar__item {
  display: flex;
  align-items: center;
  gap: 7px;
  max-width: 180px;
  padding: 7px 10px 7px 13px;
  border: 1px solid transparent;
  border-radius: 9px;
  font-size: 12.5px;
  color: var(--color-text-tertiary);
  cursor: grab;
  white-space: nowrap;
  user-select: none;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s;
}

.tab-bar__item:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-secondary);
}

.tab-bar__item--active {
  background: var(--color-bg-hover);
  border-color: var(--color-border);
  color: var(--color-text-primary);
  font-weight: 600;
  box-shadow: inset 0 -2px 0 var(--color-accent);
}

.tab-bar__item--dragging {
  cursor: grabbing;
  opacity: 0.85;
  background: var(--color-bg-primary);
  border-color: var(--color-accent);
  box-shadow: var(--shadow-md);
}

.tab-bar__item--drop-target {
  box-shadow: inset 2px 0 0 var(--color-accent);
}

.tab-bar__icon {
  font-size: 13px;
  line-height: 1;
  flex-shrink: 0;
}

.tab-bar__name {
  font-weight: inherit;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tab-bar__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 17px;
  height: 17px;
  border-radius: 5px;
  font-size: 11px;
  color: var(--color-text-tertiary);
  opacity: 0.55;
  flex-shrink: 0;
  transition: background-color 0.15s, color 0.15s, opacity 0.15s;
}

.tab-bar__close:hover {
  background: color-mix(in srgb, var(--color-error) 18%, transparent);
  color: var(--color-error);
  opacity: 1;
}
</style>
