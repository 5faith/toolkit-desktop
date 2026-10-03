<template>
  <ToolShell :sidebar-collapsed="appStore.sidebarCollapsed" :live-mode="appStore.activeModuleId === 'live'">
    <template #sidebar>
      <div class="sidebar">
        <div v-if="!appStore.sidebarCollapsed" class="sidebar__brand">
          <span class="sidebar__brand-logo">🧰</span>
          <span class="sidebar__brand-name">Toolkit</span>
        </div>
        <div
          v-for="mod in toolModules"
          :key="mod.id"
          class="sidebar__item"
          :class="{ 'sidebar__item--active': mod.id === appStore.activeModuleId }"
          @click="onOpenModule(mod.id)"
        >
          <span class="sidebar__icon">{{ mod.icon }}</span>
          <span v-if="!appStore.sidebarCollapsed" class="sidebar__name">{{ mod.name }}</span>
          <span
            v-if="!appStore.sidebarCollapsed && isOpen(mod.id)"
            class="sidebar__dot"
          />
        </div>
        <div class="sidebar__spacer" />
        <div class="sidebar__divider" />
        <div class="sidebar__section-label" v-if="!appStore.sidebarCollapsed">System</div>
        <div
          v-for="mod in systemModules"
          :key="mod.id"
          class="sidebar__item sidebar__item--system"
          :class="{ 'sidebar__item--active': mod.id === appStore.activeModuleId }"
          @click="onOpenModule(mod.id)"
        >
          <span class="sidebar__icon">{{ mod.icon }}</span>
          <span v-if="!appStore.sidebarCollapsed" class="sidebar__name">{{ mod.name }}</span>
        </div>
        <div
          class="sidebar__item sidebar__item--system"
          @click="toggleTheme"
        >
          <span class="sidebar__icon">{{ isDark ? '☀' : '☾' }}</span>
          <span v-if="!appStore.sidebarCollapsed" class="sidebar__name">{{ isDark ? 'Light' : 'Dark' }}</span>
        </div>
        <button class="sidebar__toggle" @click="appStore.toggleSidebar()">
          {{ appStore.sidebarCollapsed ? '→' : '←' }}
        </button>
      </div>
    </template>

    <div class="app-content" :class="{ 'app-content--live': appStore.activeModuleId === 'live' }">
      <TabBar
        :tabs="openedModules"
        :active-id="appStore.activeModuleId"
        @activate="onOpenModule"
        @close="onCloseTab"
        @close-others="onCloseOthers"
        @close-all="onCloseAll"
      />

      <div
        v-show="appStore.openTabs.length > 0"
        class="app-content__view"
        :class="{ 'app-content__view--plain': activeModule?.card === false }"
      >
        <router-view v-slot="{ Component }">
          <keep-alive :include="cachedNames">
            <component :is="Component" />
          </keep-alive>
        </router-view>
      </div>

      <div v-if="appStore.openTabs.length === 0" class="app-content__empty">
        <span class="app-content__empty-icon">🧰</span>
        <span class="app-content__empty-title">No tabs open</span>
        <span class="app-content__empty-hint">Pick a tool from the sidebar to get started</span>
      </div>
    </div>

    <NotificationContainer />

    <template #statusbar>
      <StatusBar :active-module-name="activeTabModule?.name">
        {{ activeTabModule?.shortcut ? `Shortcut: ${activeTabModule.shortcut}` : '' }}
      </StatusBar>
    </template>
  </ToolShell>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import ToolShell from '@shared/components/ToolShell.vue'
import StatusBar from '@shared/components/StatusBar.vue'
import TabBar from '@shared/components/TabBar.vue'
import NotificationContainer from '@shared/components/NotificationContainer.vue'
import { useAppStore } from '@/stores/app'
import { useModule } from '@shared/composables/useModule'
import { useShortcuts } from '@shared/composables/useShortcuts'
import { useTheme } from '@shared/composables/useTheme'
import { registerModuleRoutes } from '@/router'
import type { ToolModule } from '@core/module'

const SYSTEM_MODULE_IDS = new Set(['shortcuts'])

const router = useRouter()
const appStore = useAppStore()
const { allModules, activeModule, switchModule } = useModule()
const { isDark, toggleTheme } = useTheme()

const toolModules = computed(() => allModules.value.filter(m => !SYSTEM_MODULE_IDS.has(m.id)))
const systemModules = computed(() => allModules.value.filter(m => SYSTEM_MODULE_IDS.has(m.id)))

/** module bound to the currently open tab (registry follows the route, which may lag the tabs) */
const activeTabModule = computed(() =>
  allModules.value.find(m => m.id === appStore.activeModuleId)
)

const openedModules = computed(() =>
  appStore.openTabs
    .map(id => allModules.value.find(m => m.id === id))
    .filter((m): m is ToolModule => m !== undefined)
)

const cachedNames = computed(() =>
  allModules.value
    .filter(m => m.keepAlive !== false)
    .map(m => getViewName(m))
    .filter((name): name is string => name !== undefined)
)

function getViewName(mod: ToolModule): string | undefined {
  const comp: unknown = mod.route.component
  if (comp && typeof comp === 'object' && 'name' in comp) {
    const name = (comp as { name?: unknown }).name
    if (typeof name === 'string') return name
  }
  return undefined
}

function isOpen(id: string) {
  return appStore.openTabs.includes(id)
}

function onOpenModule(id: string) {
  appStore.openTab(id)
  switchModule(id)
  router.push(`/${id}`)
}

function onCloseTab(id: string) {
  const next = appStore.closeTab(id)
  if (next) {
    switchModule(next)
    router.push(`/${next}`)
  } else {
    router.replace('/')
  }
}

function onCloseOthers(id: string) {
  appStore.closeOthers(id)
  switchModule(id)
  router.push(`/${id}`)
}

function onCloseAll() {
  appStore.closeAll()
  router.replace('/')
}

function closeActiveTab() {
  if (appStore.activeModuleId) {
    onCloseTab(appStore.activeModuleId)
  }
}

const { register: registerShortcut } = useShortcuts({ onModuleSwitch: onOpenModule })
registerShortcut('Ctrl+w', closeActiveTab)

onMounted(async () => {
  registerModuleRoutes()
  await appStore.restoreTabs()
  const target = appStore.openTabs.includes(appStore.activeModuleId) && appStore.activeModuleId
    ? appStore.activeModuleId
    : appStore.openTabs[0] ?? allModules.value[0]?.id
  if (target) {
    onOpenModule(target)
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

.sidebar__brand {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
}

.sidebar__brand-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--color-accent), var(--color-info));
  color: #fff;
  font-size: 13px;
  flex-shrink: 0;
}

.sidebar__brand-name {
  font-size: 13px;
  font-weight: 700;
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

.sidebar__dot {
  margin-left: auto;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--color-accent);
  opacity: 0.7;
  flex-shrink: 0;
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

.app-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  height: 100%;
  min-height: 0;
}

/* live 模式：视频垫在 WebView 之下，TabBar 与视频区之间不能留透明缝 */
.app-content--live {
  gap: 0;
}

.app-content--live :deep(.tab-bar) {
  border-radius: 0;
  border-left: none;
  border-right: none;
  border-top: none;
}

.app-content__view {
  flex: 1;
  min-height: 0;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.app-content__view--plain {
  background: transparent;
  border: none;
  border-radius: 0;
  box-shadow: none;
}

.app-content__empty {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  background: var(--color-bg-primary);
  border: 1px dashed var(--color-border-hover);
  border-radius: var(--radius-xl);
}

.app-content__empty-icon {
  font-size: 40px;
}

.app-content__empty-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.app-content__empty-hint {
  font-size: 12.5px;
  color: var(--color-text-tertiary);
}
</style>
