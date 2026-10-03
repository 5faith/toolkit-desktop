<template>
  <div class="tool-shell" :class="{ 'sidebar-collapsed': sidebarCollapsed, 'tool-shell--live': liveMode }">
    <div v-if="liveMode" class="tool-shell__matte" :style="liveMatteStyle" />
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
import type { StyleValue } from 'vue'

defineProps<{
  sidebarCollapsed?: boolean
  liveMode?: boolean
  /** inline clip-path style that cuts the video hole out of the live matte (computed in App.vue) */
  liveMatteStyle?: StyleValue
}>()
</script>

<style scoped>
.tool-shell {
  position: relative;
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

/*
 * mpv (--wid) renders BEHIND the webview and shows through transparent page
 * regions only. In live mode the shell keeps its normal card layout, but the
 * canvas comes from this opaque matte: App.vue clips a rounded hole out of it
 * exactly over the video region, so the gaps stay canvas-colored while the
 * video still shows through.
 */
.tool-shell__matte {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: var(--color-bg-secondary);
  pointer-events: none;
}

.tool-shell__body {
  display: flex;
  gap: var(--spacing-sm);
  flex: 1;
  min-height: 0;
  overflow: hidden;
  position: relative;
  z-index: 1;
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

.tool-shell--live {
  background: transparent;
}

.tool-shell__content--live {
  background: transparent;
}

.tool-shell__statusbar {
  height: var(--statusbar-height);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  box-shadow: var(--shadow-sm);
  background: var(--color-bg-primary);
  overflow: hidden;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}
</style>
