<template>
  <div
    ref="containerRef"
    class="split-pane"
    :class="`split-pane--${direction}`"
  >
    <div class="split-pane__pane split-pane__pane--first" :style="firstStyle">
      <slot name="first" />
    </div>

    <div
      class="split-pane__handle"
      role="separator"
      :aria-orientation="direction === 'horizontal' ? 'vertical' : 'horizontal'"
      :aria-valuenow="Math.round(ratio)"
      :aria-valuemin="min"
      :aria-valuemax="max"
      tabindex="0"
      @pointerdown="onPointerDown"
      @dblclick="resetRatio"
      @keydown="onKeydown"
    >
      <slot name="handle">
        <span class="split-pane__grip" />
      </slot>
    </div>

    <div class="split-pane__pane split-pane__pane--second">
      <slot name="second" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: number
  direction?: 'horizontal' | 'vertical'
  min?: number
  max?: number
  defaultRatio?: number
  /** 两侧最小像素尺寸，0 表示只使用百分比约束 */
  minSize?: number
}>(), {
  direction: 'horizontal',
  min: 20,
  max: 80,
  defaultRatio: 50,
  minSize: 0,
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const containerRef = ref<HTMLElement | null>(null)
const dragging = ref(false)

const ratio = computed(() => {
  const value = Number.isFinite(props.modelValue) ? props.modelValue : props.defaultRatio
  return Math.min(Math.max(value, props.min), props.max)
})

const firstStyle = computed(() => (
  props.direction === 'horizontal'
    ? { width: `${ratio.value}%` }
    : { height: `${ratio.value}%` }
))

let previousUserSelect = ''
let previousCursor = ''

function clampRatio(value: number, total: number): number {
  let min = props.min
  let max = props.max

  if (props.minSize > 0 && total > 0) {
    const minPercent = (props.minSize / total) * 100
    min = Math.max(min, minPercent)
    max = Math.min(max, 100 - minPercent)
  }

  if (min >= max) return props.defaultRatio
  return Math.min(Math.max(value, min), max)
}

function updateFromPosition(clientX: number, clientY: number) {
  const el = containerRef.value
  if (!el) return

  const rect = el.getBoundingClientRect()
  const total = props.direction === 'horizontal' ? rect.width : rect.height
  if (total <= 0) return

  const position = props.direction === 'horizontal'
    ? clientX - rect.left
    : clientY - rect.top

  emit('update:modelValue', clampRatio((position / total) * 100, total))
}

function onPointerDown(event: PointerEvent) {
  if (event.button !== 0) return
  event.preventDefault()

  dragging.value = true
  const target = event.currentTarget as HTMLElement
  target.setPointerCapture(event.pointerId)

  previousUserSelect = document.body.style.userSelect
  previousCursor = document.body.style.cursor
  document.body.style.userSelect = 'none'
  document.body.style.cursor = props.direction === 'horizontal' ? 'col-resize' : 'row-resize'

  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
}

function onPointerMove(event: PointerEvent) {
  if (!dragging.value) return
  updateFromPosition(event.clientX, event.clientY)
}

function onPointerUp() {
  if (!dragging.value) return
  dragging.value = false
  document.body.style.userSelect = previousUserSelect
  document.body.style.cursor = previousCursor
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
}

function resetRatio() {
  emit('update:modelValue', props.defaultRatio)
}

function onKeydown(event: KeyboardEvent) {
  const step = event.shiftKey ? 5 : 2
  let next: number | null = null

  if (props.direction === 'horizontal') {
    if (event.key === 'ArrowLeft') next = ratio.value - step
    if (event.key === 'ArrowRight') next = ratio.value + step
  } else {
    if (event.key === 'ArrowUp') next = ratio.value - step
    if (event.key === 'ArrowDown') next = ratio.value + step
  }

  if (event.key === 'Home') next = props.defaultRatio
  if (next === null) return

  event.preventDefault()
  emit('update:modelValue', Math.min(Math.max(next, props.min), props.max))
}

onBeforeUnmount(onPointerUp)
</script>

<style scoped>
.split-pane {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.split-pane--horizontal {
  flex-direction: row;
}

.split-pane--vertical {
  flex-direction: column;
}

.split-pane__pane {
  display: flex;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.split-pane__pane--first {
  flex: 0 0 auto;
}

.split-pane__pane--second {
  flex: 1 1 0;
}

.split-pane__handle {
  position: relative;
  z-index: 4;
  display: flex;
  flex: 0 0 9px;
  align-items: center;
  justify-content: center;
  outline: none;
}

.split-pane--horizontal > .split-pane__handle {
  cursor: col-resize;
}

.split-pane--vertical > .split-pane__handle {
  cursor: row-resize;
}

.split-pane__handle::before {
  content: '';
  position: absolute;
  border-radius: 1px;
  background: var(--color-border);
  transition: background-color 0.15s;
}

.split-pane--horizontal > .split-pane__handle::before {
  width: 1px;
  height: 100%;
}

.split-pane--vertical > .split-pane__handle::before {
  width: 100%;
  height: 1px;
}

.split-pane__handle:hover::before,
.split-pane__handle:focus-visible::before {
  background: var(--color-accent);
}

.split-pane__grip {
  position: relative;
  z-index: 1;
  width: 3px;
  height: 22px;
  border-radius: 2px;
  background: var(--color-border-hover);
}

.split-pane--vertical > .split-pane__handle .split-pane__grip {
  width: 22px;
  height: 3px;
}
</style>
