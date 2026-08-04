<template>
  <div class="notification-container">
    <TransitionGroup name="notification">
      <div
        v-for="n in notifications"
        :key="n.id"
        class="notification-toast"
        :class="`notification-toast--${n.type}`"
        @click="dismiss(n.id)"
      >
        <span class="notification-toast__icon">{{ icons[n.type] }}</span>
        <span class="notification-toast__message">{{ n.message }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { useNotification } from '@shared/composables/useNotification'

const { notifications, dismiss } = useNotification()

const icons: Record<string, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
}
</script>

<style scoped>
.notification-container {
  position: fixed;
  top: var(--spacing-md);
  right: var(--spacing-md);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  pointer-events: none;
}

.notification-toast {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: 13px;
  pointer-events: auto;
  cursor: pointer;
  box-shadow: var(--shadow-lg);
  min-width: 200px;
  max-width: 360px;
}

.notification-toast--success {
  background: #ecfdf5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.notification-toast--error {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.notification-toast--warning {
  background: #fffbeb;
  color: #92400e;
  border: 1px solid #fde68a;
}

.notification-toast--info {
  background: #eff6ff;
  color: #1e40af;
  border: 1px solid #bfdbfe;
}

.notification-toast__icon {
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
}

.notification-toast__message {
  flex: 1;
  line-height: 1.4;
}

.notification-enter-active {
  transition: all 0.25s ease;
}

.notification-leave-active {
  transition: all 0.2s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(40px);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(40px);
}
</style>
