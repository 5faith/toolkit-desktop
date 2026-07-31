<template>
  <div class="tab-bar">
    <div
      v-for="mod in modules"
      :key="mod.id"
      class="tab-bar__item"
      :class="{ 'tab-bar__item--active': mod.id === activeModuleId }"
      @click="$emit('switch', mod.id)"
    >
      <span class="tab-bar__icon">{{ mod.icon }}</span>
      <span class="tab-bar__name">{{ mod.name }}</span>
      <span v-if="mod.shortcut" class="tab-bar__shortcut">{{ mod.shortcut }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ToolModule } from '@core/module'

defineProps<{
  modules: ToolModule[]
  activeModuleId: string
}>()

defineEmits<{
  switch: [id: string]
}>()
</script>

<style scoped>
.tab-bar {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 var(--spacing-sm);
  gap: var(--spacing-xs);
  background: var(--color-bg-primary);
  overflow-x: auto;
}

.tab-bar__item {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color 0.15s;
  white-space: nowrap;
  user-select: none;
}

.tab-bar__item:hover {
  background: var(--color-bg-hover);
}

.tab-bar__item--active {
  background: var(--color-accent-light);
  color: var(--color-accent);
}

.tab-bar__icon {
  font-size: 16px;
}

.tab-bar__name {
  font-size: 13px;
  font-weight: 500;
}

.tab-bar__shortcut {
  font-size: 11px;
  color: var(--color-text-tertiary);
  margin-left: var(--spacing-xs);
}
</style>
