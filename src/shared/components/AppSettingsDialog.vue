<template>
  <Teleport to="body">
    <Transition name="settings-dialog">
      <div v-if="open" class="settings-dialog" @click.self="emit('close')">
        <section
          class="settings-dialog__panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-dialog-title"
        >
          <header class="settings-dialog__header">
            <h2 id="settings-dialog-title" class="settings-dialog__title">Settings</h2>
            <button class="settings-dialog__close" aria-label="Close settings" @click="emit('close')">
              ✕
            </button>
          </header>

          <div class="settings-dialog__body">
            <section class="settings-section">
              <h3 class="settings-section__title">Appearance</h3>
              <div class="theme-picker">
                <button
                  v-for="option in themeOptions"
                  :key="option.value"
                  class="theme-picker__item"
                  :class="{ 'theme-picker__item--active': mode === option.value }"
                  :aria-pressed="mode === option.value"
                  @click="setTheme(option.value)"
                >
                  <span class="theme-picker__icon">{{ option.icon }}</span>
                  <span class="theme-picker__label">{{ option.label }}</span>
                </button>
              </div>
            </section>

            <section class="settings-section">
              <h3 class="settings-section__title">Developer</h3>
              <div class="settings-row">
                <div class="settings-row__text">
                  <span class="settings-row__label">Developer mode</span>
                  <span class="settings-row__description">Press F12 to open DevTools</span>
                </div>
                <button
                  class="switch"
                  :class="{ 'switch--on': devtoolsEnabled }"
                  role="switch"
                  :aria-checked="devtoolsEnabled"
                  aria-label="Toggle developer mode"
                  @click="toggleDevTools"
                >
                  <span class="switch__thumb" />
                </button>
              </div>
              <button class="settings-dialog__action" :disabled="!isDesktop" @click="onOpenDevTools">
                Open DevTools now
              </button>
            </section>

            <section class="settings-section settings-section--about">
              <div class="settings-row">
                <span class="settings-row__label">Version</span>
                <code class="settings-value">v{{ version }}</code>
              </div>
              <div class="settings-row">
                <span class="settings-row__label">Config</span>
                <code class="settings-value">data/toolkit.json</code>
              </div>
            </section>
          </div>

          <footer class="settings-dialog__footer">
            <span class="settings-dialog__hint">Stored in the app data directory</span>
            <button class="settings-dialog__done" @click="emit('close')">Done</button>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import packageJson from '../../../package.json'
import { useTheme } from '@shared/composables/useTheme'
import { useDevTools } from '@shared/composables/useDevTools'
import type { ThemeMode } from '@shared/types/common'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const { mode, setTheme } = useTheme()
const { enabled: devtoolsEnabled, isDesktop, setEnabled, openDevTools } = useDevTools()

const version = ref(packageJson.version)
const isTauri = '__TAURI_INTERNALS__' in window

const themeOptions: Array<{ value: ThemeMode; label: string; icon: string }> = [
  { value: 'light', label: 'Light', icon: '☀' },
  { value: 'dark', label: 'Dark', icon: '☾' },
  { value: 'system', label: 'System', icon: '🖥' },
]

function toggleDevTools() {
  setEnabled(!devtoolsEnabled.value)
}

function onOpenDevTools() {
  void openDevTools()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.open) {
    event.preventDefault()
    emit('close')
  }
}

onMounted(async () => {
  window.addEventListener('keydown', onKeydown)

  if (!isTauri) return
  try {
    version.value = await invoke<string>('get_app_version')
  } catch {
    // 保留 package.json 中的版本号
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.settings-dialog {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  background: rgba(0, 0, 0, 0.38);
  backdrop-filter: blur(2px);
}

.settings-dialog__panel {
  display: flex;
  flex-direction: column;
  width: 420px;
  max-width: 100%;
  max-height: 80vh;
  overflow: hidden;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
}

.settings-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
}

.settings-dialog__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.settings-dialog__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-md);
  font-size: 13px;
  color: var(--color-text-tertiary);
  transition: background-color 0.15s, color 0.15s;
}

.settings-dialog__close:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.settings-dialog__body {
  padding: 0 20px;
  overflow-y: auto;
}

.settings-section {
  padding: 16px 0;
  border-bottom: 1px solid var(--color-border);
}

.settings-section--about {
  border-bottom: none;
}

.settings-section__title {
  margin: 0 0 12px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

.theme-picker {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-sm);
}

.theme-picker__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  transition: border-color 0.15s, background-color 0.15s, color 0.15s;
}

.theme-picker__item:hover {
  border-color: var(--color-border-hover);
  color: var(--color-text-primary);
}

.theme-picker__item--active {
  background: var(--color-accent-light);
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.theme-picker__icon {
  font-size: 18px;
  line-height: 1;
}

.theme-picker__label {
  font-size: 12px;
  font-weight: 500;
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  min-height: 28px;
}

.settings-row + .settings-row {
  margin-top: 8px;
}

.settings-row__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.settings-row__label {
  font-size: 13px;
  color: var(--color-text-primary);
}

.settings-row__description {
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.settings-value {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-text-secondary);
}

.switch {
  position: relative;
  flex-shrink: 0;
  width: 38px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: var(--color-bg-active);
  transition: background-color 0.15s;
}

.switch--on {
  background: var(--color-accent);
}

.switch__thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: var(--shadow-sm);
  transition: transform 0.15s;
}

.switch--on .switch__thumb {
  transform: translateX(16px);
}

.settings-dialog__action {
  margin-top: 12px;
  padding: 6px 12px;
  font-size: 12px;
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: border-color 0.15s, color 0.15s;
}

.settings-dialog__action:hover:not(:disabled) {
  border-color: var(--color-border-hover);
  color: var(--color-text-primary);
}

.settings-dialog__action:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.settings-dialog__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  padding: 12px 20px;
  border-top: 1px solid var(--color-border);
}

.settings-dialog__hint {
  font-size: 10px;
  color: var(--color-text-tertiary);
}

.settings-dialog__done {
  padding: 6px 16px;
  font-size: 12px;
  font-weight: 500;
  color: #ffffff;
  background: var(--color-accent);
  border-radius: var(--radius-md);
  transition: background-color 0.15s;
}

.settings-dialog__done:hover {
  background: var(--color-accent-hover);
}

.settings-dialog-enter-active,
.settings-dialog-leave-active {
  transition: opacity 0.15s ease;
}

.settings-dialog-enter-active .settings-dialog__panel,
.settings-dialog-leave-active .settings-dialog__panel {
  transition: transform 0.15s ease;
}

.settings-dialog-enter-from,
.settings-dialog-leave-to {
  opacity: 0;
}

.settings-dialog-enter-from .settings-dialog__panel,
.settings-dialog-leave-to .settings-dialog__panel {
  transform: scale(0.97);
}
</style>
