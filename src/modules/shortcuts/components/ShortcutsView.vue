<template>
  <div class="shortcuts-view">
    <div class="shortcuts-view__header">
      <h2 class="shortcuts-view__title">Keyboard Shortcuts</h2>
      <p class="shortcuts-view__desc">Available keyboard shortcuts for the application.</p>
    </div>

    <div class="shortcuts-section">
      <h3 class="shortcuts-section__title">Module Switching</h3>
      <div class="shortcuts-list">
        <div v-for="mod in moduleShortcuts" :key="mod.id" class="shortcuts-row">
          <span class="shortcuts-row__desc">{{ mod.icon }} {{ mod.name }}</span>
          <kbd class="shortcuts-row__key">{{ mod.shortcut }}</kbd>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { moduleRegistry } from '@core/module-registry'

const moduleShortcuts = computed(() => {
  return moduleRegistry.getAll().filter(mod => mod.shortcut).map(mod => ({
    id: mod.id,
    name: mod.name,
    icon: mod.icon,
    shortcut: mod.shortcut!,
  }))
})
</script>

<style scoped>
.shortcuts-view {
  height: 100%;
  overflow-y: auto;
  padding: var(--spacing-xl);
  max-width: 640px;
  margin: 0 auto;
}

.shortcuts-view__header {
  margin-bottom: var(--spacing-xl);
}

.shortcuts-view__title {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-xs);
}

.shortcuts-view__desc {
  font-size: 13px;
  color: var(--color-text-tertiary);
}

.shortcuts-section {
  margin-bottom: var(--spacing-xl);
}

.shortcuts-section__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--spacing-sm);
  padding-bottom: var(--spacing-xs);
  border-bottom: 1px solid var(--color-border);
}

.shortcuts-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.shortcuts-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
}

.shortcuts-row:hover {
  background: var(--color-bg-hover);
}

.shortcuts-row__desc {
  font-size: 13px;
  color: var(--color-text-primary);
}

.shortcuts-row__keys {
  display: flex;
  gap: 4px;
}

.shortcuts-row__key {
  display: inline-block;
  padding: 2px 6px;
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  line-height: 1.4;
  white-space: nowrap;
}
</style>
