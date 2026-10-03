<template>
  <Teleport to="body">
    <div
      v-if="visible"
      ref="menuRef"
      class="context-menu"
      :style="{ left: `${pos.x}px`, top: `${pos.y}px` }"
    >
      <template v-for="(item, index) in items" :key="index">
        <div v-if="item.separator" class="context-menu__separator" />
        <div
          v-else
          class="context-menu__item"
          :class="{
            'context-menu__item--danger': item.danger,
            'context-menu__item--disabled': item.disabled,
          }"
          @click="onSelect(item)"
        >
          <span class="context-menu__label">{{ item.label }}</span>
          <span v-if="item.keyHint" class="context-menu__hint">{{ item.keyHint }}</span>
        </div>
      </template>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, ref, reactive, watch, onBeforeUnmount } from 'vue'

export interface ContextMenuItem {
  label?: string
  keyHint?: string
  danger?: boolean
  disabled?: boolean
  separator?: boolean
  action?: string
}

const props = defineProps<{
  visible: boolean
  x: number
  y: number
  items: ContextMenuItem[]
}>()

const emit = defineEmits<{
  select: [item: ContextMenuItem]
  close: []
}>()

const menuRef = ref<HTMLElement | null>(null)
const pos = reactive({ x: props.x, y: props.y })

function onSelect(item: ContextMenuItem) {
  if (item.disabled) return
  emit('select', item)
  emit('close')
}

function onWindowClick() {
  if (props.visible) emit('close')
}

function onWindowKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.visible) emit('close')
}

watch(() => props.visible, async (visible) => {
  if (visible) {
    pos.x = props.x
    pos.y = props.y
    await nextTick()
    const el = menuRef.value
    if (el) {
      pos.x = Math.min(props.x, window.innerWidth - el.offsetWidth - 8)
      pos.y = Math.min(props.y, window.innerHeight - el.offsetHeight - 8)
    }
    window.addEventListener('click', onWindowClick)
    window.addEventListener('contextmenu', onWindowClick)
    window.addEventListener('keydown', onWindowKeydown)
  } else {
    removeListeners()
  }
})

function removeListeners() {
  window.removeEventListener('click', onWindowClick)
  window.removeEventListener('contextmenu', onWindowClick)
  window.removeEventListener('keydown', onWindowKeydown)
}

onBeforeUnmount(removeListeners)
</script>

<style scoped>
.context-menu {
  position: fixed;
  z-index: 9999;
  min-width: 150px;
  padding: var(--spacing-xs);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

.context-menu__item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 7px 11px;
  border-radius: var(--radius-md);
  font-size: 12.5px;
  color: var(--color-text-secondary);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.context-menu__item:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.context-menu__item--danger {
  color: var(--color-error);
}

.context-menu__item--danger:hover {
  background: color-mix(in srgb, var(--color-error) 12%, transparent);
  color: var(--color-error);
}

.context-menu__item--disabled {
  opacity: 0.4;
  pointer-events: none;
}

.context-menu__hint {
  margin-left: auto;
  padding-left: var(--spacing-md);
  font-size: 10.5px;
  color: var(--color-text-tertiary);
}

.context-menu__separator {
  height: 1px;
  margin: var(--spacing-xs) var(--spacing-sm);
  background: var(--color-border);
}
</style>
