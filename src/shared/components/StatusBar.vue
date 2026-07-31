<template>
  <div class="status-bar">
    <span class="status-bar__module">{{ activeModuleName }}</span>
    <span class="status-bar__separator">|</span>
    <span class="status-bar__info"><slot /></span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  activeModuleName?: string
}>()
</script>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 var(--spacing-md);
  font-size: 12px;
  color: var(--color-text-tertiary);
  background: var(--color-bg-primary);
  gap: var(--spacing-sm);
}

.status-bar__module {
  font-weight: 500;
  color: var(--color-text-secondary);
}

.status-bar__separator {
  color: var(--color-border);
}
</style>
