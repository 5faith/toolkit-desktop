<template>
  <ToolShell :sidebar-collapsed="appStore.sidebarCollapsed">
    <template #sidebar>
      <div class="sidebar">
        <div
          v-for="mod in toolModules"
          :key="mod.id"
          class="sidebar__item"
          :class="{ 'sidebar__item--active': mod.id === appStore.activeModuleId }"
          @click="onSwitchModule(mod.id)"
        >
          <span class="sidebar__icon">{{ mod.icon }}</span>
          <span v-if="!appStore.sidebarCollapsed" class="sidebar__name">{{ mod.name }}</span>
        </div>
        <div class="sidebar__spacer" />
        <div class="sidebar__divider" />
        <div class="sidebar__section-label" v-if="!appStore.sidebarCollapsed">System</div>
        <div
          v-for="mod in systemModules"
          :key="mod.id"
          class="sidebar__item sidebar__item--system"
          :class="{ 'sidebar__item--active': mod.id === appStore.activeModuleId }"
          @click="onSwitchModule(mod.id)"
        >
          <span class="sidebar__icon">{{ mod.icon }}</span>
          <span v-if="!appStore.sidebarCollapsed" class="sidebar__name">{{ mod.name }}</span>
        </div>
        <button class="sidebar__toggle" @click="appStore.toggleSidebar()">
          {{ appStore.sidebarCollapsed ? '→' : '←' }}
        </button>
      </div>
    </template>

    <router-view />

    <NotificationContainer />

    <template #statusbar>
      <StatusBar :active-module-name="activeModule?.name">
        {{ activeModule?.shortcut ? `Shortcut: ${activeModule.shortcut}` : '' }}
      </StatusBar>
    </template>
  </ToolShell>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import ToolShell from '@shared/components/ToolShell.vue'
import StatusBar from '@shared/components/StatusBar.vue'
import NotificationContainer from '@shared/components/NotificationContainer.vue'
import { useAppStore } from '@/stores/app'
import { useModule } from '@shared/composables/useModule'
import { useShortcuts } from '@shared/composables/useShortcuts'
import { registerModuleRoutes } from '@/router'

const SYSTEM_MODULE_IDS = new Set(['shortcuts'])

const router = useRouter()
const appStore = useAppStore()
const { allModules, activeModule, switchModule } = useModule()
useShortcuts({ onModuleSwitch: onSwitchModule })

const toolModules = computed(() => allModules.value.filter(m => !SYSTEM_MODULE_IDS.has(m.id)))
const systemModules = computed(() => allModules.value.filter(m => SYSTEM_MODULE_IDS.has(m.id)))

function onSwitchModule(id: string) {
  switchModule(id)
  appStore.switchModule(id)
  router.push(`/${id}`)
}

onMounted(() => {
  registerModuleRoutes()
  if (allModules.value.length > 0) {
    const first = allModules.value[0]
    onSwitchModule(first.id)
  }
})
</script>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: var(--spacing-sm);
  gap: var(--spacing-xs);
}

.sidebar__item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color 0.15s;
  user-select: none;
}

.sidebar__item:hover {
  background: var(--color-bg-hover);
}

.sidebar__item--active {
  background: var(--color-accent-light);
  color: var(--color-accent);
}

.sidebar__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-size: 16px;
  line-height: 1;
  flex-shrink: 0;
}

.sidebar__name {
  font-size: 13px;
  line-height: 20px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar__spacer {
  flex: 1;
}

.sidebar__divider {
  height: 1px;
  margin: var(--spacing-xs) var(--spacing-sm);
  background: var(--color-border);
}

.sidebar__section-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-tertiary);
  padding: 0 var(--spacing-md);
  line-height: 20px;
}

.sidebar__item--system {
  opacity: 0.85;
}

.sidebar__item--system:hover {
  opacity: 1;
}

.sidebar__toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  color: var(--color-text-tertiary);
  transition: background-color 0.15s;
}

.sidebar__toggle:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}
</style>
