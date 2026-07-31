type EventHandler = (...args: unknown[]) => void

class EventBus {
  private listeners = new Map<string, Set<EventHandler>>()

  on(event: string, handler: EventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(handler)

    return () => {
      this.off(event, handler)
    }
  }

  emit(event: string, ...args: unknown[]): void {
    const handlers = this.listeners.get(event)
    if (handlers) {
      handlers.forEach(handler => handler(...args))
    }
  }

  off(event: string, handler: EventHandler): void {
    const handlers = this.listeners.get(event)
    if (handlers) {
      handlers.delete(handler)
      if (handlers.size === 0) {
        this.listeners.delete(event)
      }
    }
  }

  clear(): void {
    this.listeners.clear()
  }
}

export const eventBus = new EventBus()
