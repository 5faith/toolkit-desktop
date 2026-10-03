<template>
  <div class="tab-bar">
    <div v-if="tabs.length === 0" class="tab-bar__empty">
      No tabs open — pick a tool from the sidebar
    </div>
    <div
      v-for="mod in tabs"
      :key="mod.id"
      class="tab-bar__item"
      :class="{ 'tab-bar__item--active': mod.id === activeId }"
      @click="$emit('activate', mod.id)"
      @contextmenu="onContextMenu($event, mod.id)"
    >
      <span class="tab-bar__icon">{{ mod.icon }}</span>
      <span class="tab-bar__name">{{ mod.name }}</span>
      <span
        class="tab-bar__close"
        title="Close"
        @click.stop="$emit('close', mod.id)"
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
import { computed, ref } from 'vue'
import type { ToolModule } from '@core/module'
import ContextMenu from './ContextMenu.vue'
import type { ContextMenuItem } from './ContextMenu.vue'

const props = defineProps<{
  tabs: ToolModule[]
  activeId: string
}>()

const emit = defineEmits<{
  activate: [id: string]
  close: [id: string]
  closeOthers: [id: string]
  closeAll: []
}>()

const ctxVisible = ref(false)
const ctxX = ref(0)
const ctxY = ref(0)
const ctxTabId = ref('')

const ctxItems = computed<ContextMenuItem[]>(() => [
  { label: 'Close', keyHint: 'Ctrl+W', action: 'close' },
  { label: 'Close Others', disabled: props.tabs.length <= 1, action: 'closeOthers' },
  { separator: true },
  { label: 'Close All', danger: true, action: 'closeAll' },
])

function onContextMenu(event: MouseEvent, id: string) {
  event.preventDefault()
  event.stopPropagation()
  ctxTabId.value = id
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
  if (item.action === 'close') emit('close', id)
  if (item.action === 'closeOthers') emit('closeOthers', id)
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
  padding: 7px 10px 7px 13px;
  border: 1px solid transparent;
  border-radius: 9px;
  font-size: 12.5px;
  color: var(--color-text-tertiary);
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
  transition: background-color 0.15s, color 0.15s;
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

.tab-bar__icon {
  font-size: 13px;
  line-height: 1;
}

.tab-bar__name {
  font-weight: inherit;
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
  transition: background-color 0.15s, color 0.15s, opacity 0.15s;
}

.tab-bar__close:hover {
  background: color-mix(in srgb, var(--color-error) 18%, transparent);
  color: var(--color-error);
  opacity: 1;
}
</style>
