import { ref } from 'vue'
import type { NotificationOptions } from '@shared/types/common'

interface Notification extends NotificationOptions {
  id: string
}

const notifications = ref<Notification[]>([])
let nextId = 0

export function useNotification() {
  function show(options: NotificationOptions) {
    const id = `notification-${nextId++}`
    const notification: Notification = { ...options, id }
    notifications.value.push(notification)

    const duration = options.duration ?? 3000
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration)
    }

    return id
  }

  function dismiss(id: string) {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index !== -1) {
      notifications.value.splice(index, 1)
    }
  }

  function success(message: string) {
    return show({ type: 'success', message })
  }

  function error(message: string) {
    return show({ type: 'error', message, duration: 5000 })
  }

  function warning(message: string) {
    return show({ type: 'warning', message })
  }

  function info(message: string) {
    return show({ type: 'info', message })
  }

  return {
    notifications,
    show,
    dismiss,
    success,
    error,
    warning,
    info,
  }
}
