<template>
  <div class="tool-shell" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
    <div class="tool-shell__body">
      <aside class="tool-shell__sidebar">
        <slot name="sidebar" />
      </aside>
      <main class="tool-shell__content" :class="{ 'tool-shell__content--live': liveMode }">
        <slot />
      </main>
    </div>
    <footer class="tool-shell__statusbar">
      <slot name="statusbar" />
    </footer>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  sidebarCollapsed?: boolean
  liveMode?: boolean
}>()
</script>

<style scoped>
.tool-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.tool-shell__body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.tool-shell__sidebar {
  width: var(--sidebar-width);
  border-right: 1px solid var(--color-border);
  overflow-y: auto;
  flex-shrink: 0;
  transition: width 0.2s ease;
  background: var(--color-bg-primary);
}

.sidebar-collapsed .tool-shell__sidebar {
  width: var(--sidebar-collapsed-width);
}

.tool-shell__content {
  flex: 1;
  overflow: auto;
  background: var(--color-bg-secondary);
}

.tool-shell__content--live {
  background: transparent;
  overflow: visible;
}

.tool-shell__statusbar {
  height: var(--statusbar-height);
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
  background: var(--color-bg-primary);
}
</style>
