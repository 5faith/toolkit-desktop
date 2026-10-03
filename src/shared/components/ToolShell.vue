<template>
  <div class="tool-shell" :class="{ 'sidebar-collapsed': sidebarCollapsed, 'tool-shell--live': liveMode }">
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
  gap: var(--spacing-sm);
  height: 100vh;
  width: 100vw;
  padding: var(--spacing-sm);
  box-sizing: border-box;
  overflow: hidden;
  background: var(--color-bg-secondary);
}

.tool-shell__body {
  display: flex;
  gap: var(--spacing-sm);
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.tool-shell__sidebar {
  width: var(--sidebar-width);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  background: var(--color-bg-primary);
  overflow-y: auto;
  overflow-x: hidden;
  flex-shrink: 0;
  transition: width 0.2s ease;
}

.sidebar-collapsed .tool-shell__sidebar {
  width: var(--sidebar-collapsed-width);
}

.tool-shell__content {
  flex: 1;
  min-width: 0;
  overflow: auto;
  background: var(--color-bg-secondary);
}

.tool-shell__content--live {
  background: transparent;
}

/*
 * mpv (--wid) renders BEHIND the webview and shows through transparent
 * regions only, so the live layout must go full-bleed: no canvas padding,
 * no card gaps — otherwise the opaque shell hides the video entirely.
 */
.tool-shell--live {
  padding: 0;
  gap: 0;
  background: transparent;
}

.tool-shell--live .tool-shell__body {
  gap: 0;
}

.tool-shell--live .tool-shell__sidebar {
  border: none;
  border-radius: 0;
  box-shadow: none;
}

.tool-shell--live .tool-shell__statusbar {
  border: none;
  border-radius: 0;
  box-shadow: none;
}

.tool-shell__statusbar {
  height: var(--statusbar-height);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  box-shadow: var(--shadow-sm);
  background: var(--color-bg-primary);
  overflow: hidden;
  flex-shrink: 0;
}
</style>
