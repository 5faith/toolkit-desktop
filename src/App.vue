<template>
  <ToolShell
    :sidebar-collapsed="appStore.sidebarCollapsed"
    :live-mode="isLive"
    :live-matte-style="liveMatteStyle"
  >
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

    <div class="app-content">
      <TabBar
        :tabs="tabItems"
        :active-id="appStore.activeTabId"
        @activate="onActivateTab"
        @close="onCloseTab"
        @duplicate="onDuplicateTab"
        @close-others="onCloseOthers"
        @close-right="onCloseRight"
        @close-all="onCloseAll"
        @move="onMoveTab"
      />

      <div
        v-for="tab in appStore.openTabs"
        :key="tab.id"
        v-show="tab.id === appStore.activeTabId"
        :ref="tab.moduleId === 'live' ? setLiveWrap : undefined"
        class="app-content__view"
        :class="{
          'app-content__view--plain': moduleOf(tab.moduleId)?.card === false,
          'app-content__view--live': tab.moduleId === 'live',
        }"
      >
        <TabHost
          v-if="shouldRender(tab)"
          :tab-id="tab.id"
          :module-id="tab.moduleId"
        />
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
        {{ activeTabShortcut ? `Shortcut: ${activeTabShortcut}` : '' }}
      </StatusBar>
    </template>
  </ToolShell>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type ComponentPublicInstance } from 'vue'
import { useRouter } from 'vue-router'
import { getCurrentWindow } from '@tauri-apps/api/window'
import ToolShell from '@shared/components/ToolShell.vue'
import StatusBar from '@shared/components/StatusBar.vue'
import TabBar from '@shared/components/TabBar.vue'
import type { TabItem } from '@shared/types/tab'
import TabHost from '@shared/components/TabHost.vue'
import NotificationContainer from '@shared/components/NotificationContainer.vue'
import { useAppStore, type TabInstance } from '@/stores/app'
import { useShortcutStore, APP_SHORTCUT_ACTIONS } from '@/stores/shortcuts'
import { useModule } from '@shared/composables/useModule'
import { useShortcuts, type ShortcutBinding } from '@shared/composables/useShortcuts'
import { useTheme } from '@shared/composables/useTheme'
import { setTabSeed } from '@shared/composables/useTabStore'
import { setStorageItem } from '@shared/utils/storage'
import type { ToolModule } from '@core/module'

const SYSTEM_MODULE_IDS = new Set(['shortcuts'])

const router = useRouter()
const appStore = useAppStore()
const shortcutStore = useShortcutStore()
const { allModules, switchModule } = useModule()
const { isDark, toggleTheme } = useTheme()

void shortcutStore.initialize()

const toolModules = computed(() => allModules.value.filter(m => !SYSTEM_MODULE_IDS.has(m.id)))
const systemModules = computed(() => allModules.value.filter(m => SYSTEM_MODULE_IDS.has(m.id)))

function moduleOf(moduleId: string): ToolModule | undefined {
  return allModules.value.find(m => m.id === moduleId)
}

const activeTab = computed(
  () => appStore.openTabs.find(tab => tab.id === appStore.activeTabId) ?? null
)

const activeTabModule = computed(() => {
  const moduleId = activeTab.value?.moduleId
  return moduleId ? moduleOf(moduleId) : undefined
})

const activeTabShortcut = computed(() => {
  const mod = activeTabModule.value
  if (!mod?.shortcut) return ''
  return shortcutStore.getShortcut(`module:${mod.id}`, mod.shortcut)
})

const tabItems = computed<TabItem[]>(() => {
  const counts = new Map<string, number>()
  const items: TabItem[] = []

  for (const tab of appStore.openTabs) {
    const mod = moduleOf(tab.moduleId)
    if (!mod) continue

    const count = (counts.get(mod.id) ?? 0) + 1
    counts.set(mod.id, count)

    items.push({
      id: tab.id,
      moduleId: tab.moduleId,
      name: count === 1 ? mod.name : `${mod.name} (${count})`,
      icon: mod.icon,
      duplicatable: mod.duplicatable !== false,
    })
  }

  return items
})

function shouldRender(tab: TabInstance): boolean {
  const mod = moduleOf(tab.moduleId)
  if (mod?.keepAlive === false) return tab.id === appStore.activeTabId
  return true
}

const isLive = computed(() => activeTabModule.value?.id === 'live')

/*
 * Live 视频垫在 WebView 之下，只有页面透明处可见。 live 模式保留正常卡片间隙，
 * 但间隙下的画布由 ToolShell 的 matte 提供；这里测量视图容器的位置，在 matte 上
 * 抠出一个圆角"洞"正对视频卡片，视频从洞中透出，间隙仍是画布色。
 */
const liveWrapRef = ref<HTMLElement | null>(null)
const liveHole = ref<{ x: number; y: number; w: number; h: number } | null>(null)
let liveResizeObserver: ResizeObserver | null = null

function setLiveWrap(el: Element | ComponentPublicInstance | null) {
  liveWrapRef.value = el instanceof HTMLElement ? el : null
}

function measureLiveHole() {
  const el = liveWrapRef.value
  if (!isLive.value || !el) {
    liveHole.value = null
    return
  }
  const rect = el.getBoundingClientRect()
  liveHole.value = rect.width > 2 && rect.height > 2
    ? { x: rect.left, y: rect.top, w: rect.width, h: rect.height }
    : null
}

watch([isLive, () => appStore.activeTabId], () => {
  liveResizeObserver?.disconnect()
  liveResizeObserver = null

  if (!isLive.value) {
    liveHole.value = null
    return
  }

  nextTick(() => {
    measureLiveHole()
    const el = liveWrapRef.value
    if (el) {
      liveResizeObserver = new ResizeObserver(measureLiveHole)
      liveResizeObserver.observe(el)
    }
  })
}, { immediate: true })

const liveMatteStyle = computed(() => {
  const hole = liveHole.value
  if (!hole) return undefined
  const n = (v: number) => Math.round(v * 100) / 100
  const outer = `M0 0H${window.innerWidth}V${window.innerHeight}H0Z`
  const x = n(hole.x + 1)
  const y = n(hole.y + 1)
  const w = n(hole.w - 2)
  const h = n(hole.h - 2)
  const r = Math.min(11, w / 2 - 1, h / 2 - 1)
  let inner: string
  if (r < 1) {
    inner = `M${x + w} ${y}H${x}V${y + h}H${x + w}Z`
  } else {
    inner =
      `M${n(x + w - r)} ${y}H${n(x + r)}` +
      `A${n(r)} ${n(r)} 0 0 0 ${x} ${n(y + r)}` +
      `V${n(y + h - r)}` +
      `A${n(r)} ${n(r)} 0 0 0 ${n(x + r)} ${n(y + h)}` +
      `H${n(x + w - r)}` +
      `A${n(r)} ${n(r)} 0 0 0 ${x + w} ${n(y + h - r)}` +
      `V${n(y + r)}` +
      `A${n(r)} ${n(r)} 0 0 0 ${n(x + w - r)} ${y}Z`
  }
  return { clipPath: `path("${outer}${inner}")` }
})

function isOpen(moduleId: string) {
  return appStore.openTabs.some(tab => tab.moduleId === moduleId)
}

function syncRoute(moduleId: string) {
  const path = `/${moduleId}`
  if (router.currentRoute.value.path !== path) {
    void router.push(path)
  }
}

function onOpenModule(moduleId: string) {
  appStore.openTab(moduleId)
  switchModule(moduleId)
  syncRoute(moduleId)
}

function onActivateTab(tabId: string) {
  const tab = appStore.openTabs.find(item => item.id === tabId)
  if (!tab) return

  appStore.activateTab(tabId)
  switchModule(tab.moduleId)
  syncRoute(tab.moduleId)
}

function onDuplicateTab(tabId: string) {
  const source = appStore.openTabs.find(tab => tab.id === tabId)
  if (!source) return

  const mod = moduleOf(source.moduleId)
  if (!mod || mod.duplicatable === false) return

  const newTabId = appStore.insertDuplicateTab(tabId)
  if (!newTabId) return

  setTabSeed(source.moduleId, newTabId, mod.createDuplicateState?.(tabId))
  onActivateTab(newTabId)
}

function onCloseTab(tabId: string) {
  const nextTabId = appStore.closeTab(tabId)
  const next = nextTabId
    ? appStore.openTabs.find(tab => tab.id === nextTabId)
    : null

  if (next) {
    switchModule(next.moduleId)
    syncRoute(next.moduleId)
  }
}

function onCloseOthers(tabId: string) {
  appStore.closeOthers(tabId)
  onActivateTab(tabId)
}

function onCloseRight(tabId: string) {
  const nextTabId = appStore.closeTabsToRight(tabId)
  if (nextTabId) onActivateTab(nextTabId)
}

function onCloseAll() {
  appStore.closeAll()
}

function onMoveTab(fromIndex: number, toIndex: number) {
  appStore.moveTab(fromIndex, toIndex)
}

function closeActiveTab() {
  if (appStore.activeTabId) {
    onCloseTab(appStore.activeTabId)
  }
}

function duplicateActiveTab() {
  if (appStore.activeTabId) {
    onDuplicateTab(appStore.activeTabId)
  }
}

function cycleTab(delta: number) {
  const tabs = appStore.openTabs
  if (tabs.length < 2) return

  const index = tabs.findIndex(tab => tab.id === appStore.activeTabId)
  if (index === -1) return

  const next = tabs[(index + delta + tabs.length) % tabs.length]
  onActivateTab(next.id)
}

const appShortcutHandlers: Record<string, (() => void) | undefined> = {
  'tab.close': closeActiveTab,
  'tab.duplicate': duplicateActiveTab,
  'tab.next': () => cycleTab(1),
  'tab.prev': () => cycleTab(-1),
  'tab.next.page': () => cycleTab(1),
  'tab.prev.page': () => cycleTab(-1),
}

const shortcutBindings = computed<ShortcutBinding[]>(() => {
  const bindings: ShortcutBinding[] = []

  for (const mod of allModules.value) {
    if (!mod.shortcut) continue
    const shortcut = shortcutStore.getShortcut(`module:${mod.id}`, mod.shortcut)
    if (shortcut) bindings.push({ shortcut, handler: () => onOpenModule(mod.id) })
  }

  for (const action of APP_SHORTCUT_ACTIONS) {
    const shortcut = shortcutStore.getShortcut(action.id, action.defaultShortcut)
    const handler = appShortcutHandlers[action.id]
    if (shortcut && handler) bindings.push({ shortcut, handler })
  }

  return bindings
})

useShortcuts(shortcutBindings)

watch(
  () => router.currentRoute.value.meta.moduleId,
  (moduleId) => {
    if (!tabsReady) return
    if (typeof moduleId !== 'string') return

    const active = appStore.openTabs.find(tab => tab.id === appStore.activeTabId)
    if (active?.moduleId === moduleId) {
      switchModule(moduleId)
      return
    }

    const existing = appStore.openTabs.find(tab => tab.moduleId === moduleId)
    if (existing) {
      if (existing.id !== appStore.activeTabId) {
        appStore.activateTab(existing.id)
        switchModule(moduleId)
      }
      return
    }

    onOpenModule(moduleId)
  }
)

let tabsReady = false

const isTauri = '__TAURI_INTERNALS__' in window
const WINDOW_WIDTH_KEY = 'window:width'
let resizeTimer: ReturnType<typeof setTimeout> | undefined
let unlistenResize: (() => void) | undefined
let disposed = false

function setupWindowWidthPersistence() {
  if (!isTauri) return

  const appWindow = getCurrentWindow()
  void appWindow.onResized(({ payload }) => {
    if (resizeTimer) clearTimeout(resizeTimer)
    resizeTimer = setTimeout(async () => {
      if (disposed || await appWindow.isMaximized()) return
      const scale = await appWindow.scaleFactor()
      const width = Math.round(payload.width / scale)
      if (width >= 800) void setStorageItem(WINDOW_WIDTH_KEY, width)
    }, 300)
  }).then(unlisten => {
    if (disposed) unlisten()
    else unlistenResize = unlisten
  })
}

onMounted(async () => {
  setupWindowWidthPersistence()

  await appStore.restoreTabs()
  appStore.pruneTabs(allModules.value.map(mod => mod.id))
  tabsReady = true

  const routeModuleId = router.currentRoute.value.meta.moduleId
  if (typeof routeModuleId === 'string' && moduleOf(routeModuleId)) {
    const existing = appStore.openTabs.find(tab => tab.moduleId === routeModuleId)
    if (existing) onActivateTab(existing.id)
    else onOpenModule(routeModuleId)
    return
  }

  const restored = appStore.openTabs.find(tab => tab.id === appStore.activeTabId)
    ?? appStore.openTabs[0]
  if (restored) {
    onActivateTab(restored.id)
    return
  }

  const firstModule = allModules.value[0]
  if (firstModule) onOpenModule(firstModule.id)
})

onBeforeUnmount(() => {
  disposed = true
  if (resizeTimer) clearTimeout(resizeTimer)
  unlistenResize?.()
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

/* live：视图卡片背景保持透明（视频从 matte 的洞透出），但保留卡片边框与圆角 */
.app-content__view--live {
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
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
