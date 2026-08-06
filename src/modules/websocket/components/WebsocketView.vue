<template>
  <div class="websocket-view">
    <div class="websocket-view__toolbar">
      <input
        v-model="store.url"
        class="ws-url-input"
        placeholder="ws://localhost:8080"
        :disabled="store.connected"
      />
      <button
        class="action-btn"
        :class="{ 'action-btn--danger': store.connected }"
        @click="toggleConnection"
      >
        {{ store.connected ? 'Disconnect' : 'Connect' }}
      </button>
      <button class="action-btn" @click="store.clearMessages()">Clear</button>
      <button class="action-btn" @click="exportLog">Export</button>
      <button
        class="action-btn"
        :class="{ 'action-btn--active': store.autoBottom }"
        @click="store.setAutoBottom(!store.autoBottom)"
      >
        ↓ Auto
      </button>
    </div>

    <div class="websocket-view__body">
      <div ref="messagesRef" class="websocket-view__messages">
        <div
          v-for="msg in store.messages"
          :key="msg.id"
          class="message"
          :class="`message--${msg.type}`"
        >
          <span class="message__time">{{ formatTime(msg.timestamp) }}</span>
          <span class="message__type">{{ msg.type }}</span>
          <span class="message__content">{{ msg.content }}</span>
        </div>
        <div v-if="store.messages.length === 0" class="websocket-view__empty">
          No messages yet
        </div>
      </div>

      <div class="websocket-view__send">
        <input
          v-model="sendText"
          class="send-input"
          placeholder="Type a message..."
          :disabled="!store.connected"
          @keyup.enter="sendMessage"
        />
        <button class="action-btn" :disabled="!store.connected" @click="sendMessage">
          Send
        </button>
      </div>
    </div>

    <div v-if="error" class="websocket-view__error">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { useWebsocketStore } from '../store'
import { useWebSocket } from '../composables/useWebSocket'
import { useMessageLog } from '../composables/useMessageLog'
import { useClipboard } from '@shared/composables/useClipboard'

const store = useWebsocketStore()
const { error, connect, disconnect, send } = useWebSocket()
const { exportMessages } = useMessageLog()
const { copy } = useClipboard()

const sendText = ref('')
const messagesRef = ref<HTMLDivElement>()

watch(
  () => store.messages.length,
  () => {
    if (store.autoBottom) {
      nextTick(() => {
        if (messagesRef.value) {
          messagesRef.value.scrollTop = messagesRef.value.scrollHeight
        }
      })
    }
  },
)

function toggleConnection() {
  if (store.connected) {
    disconnect()
  } else {
    connect()
  }
}

function sendMessage() {
  if (sendText.value.trim()) {
    send(sendText.value)
    sendText.value = ''
  }
}

function exportLog() {
  const log = exportMessages()
  copy(log)
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour12: false })
}
</script>

<style scoped>
.websocket-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg-secondary);
}

.websocket-view__toolbar {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.ws-url-input {
  flex: 1;
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: 13px;
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  outline: none;
}

.ws-url-input:focus {
  border-color: var(--color-accent);
}

.ws-url-input:disabled {
  opacity: 0.6;
}

.action-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: 13px;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  transition: all 0.15s;
  white-space: nowrap;
}

.action-btn:hover:not(:disabled) {
  background: var(--color-bg-hover);
  border-color: var(--color-border-hover);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn--danger {
  color: var(--color-error);
  border-color: var(--color-error);
}

.action-btn--active {
  background: var(--color-accent);
  color: #fff;
  border-color: var(--color-accent);
}

.websocket-view__body {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.websocket-view__messages {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-sm);
}

.websocket-view__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-tertiary);
  font-size: 14px;
}

.message {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: 13px;
  margin-bottom: 2px;
}

.message--sent {
  background: var(--color-accent-light);
}

.message--received {
  background: var(--color-bg-tertiary);
}

.message--system {
  color: var(--color-text-tertiary);
  font-style: italic;
}

.message__time {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.message__type {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
  min-width: 60px;
  flex-shrink: 0;
}

.message__content {
  font-family: var(--font-mono);
  word-break: break-all;
}

.websocket-view__send {
  display: flex;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-top: 1px solid var(--color-border);
  background: var(--color-bg-primary);
  flex-shrink: 0;
}

.send-input {
  flex: 1;
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 13px;
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  outline: none;
}

.send-input:focus {
  border-color: var(--color-accent);
}

.websocket-view__error {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: 13px;
  color: var(--color-error);
  background: var(--color-bg-primary);
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}
</style>
