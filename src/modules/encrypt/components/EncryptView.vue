<template>
  <div class="encrypt-view">
    <div class="encrypt-view__toolbar">
      <div class="mode-tabs">
        <button
          class="mode-tab"
          :class="{ 'mode-tab--active': store.mode === 'uuid' }"
          @click="store.setMode('uuid')"
        >
          UUID
        </button>
        <button
          class="mode-tab"
          :class="{ 'mode-tab--active': store.mode === 'md5' }"
          @click="store.setMode('md5')"
        >
          MD5
        </button>
        <button
          class="mode-tab"
          :class="{ 'mode-tab--active': store.mode === 'aes' }"
          @click="store.setMode('aes')"
        >
          AES
        </button>
      </div>
    </div>

    <div class="encrypt-view__body">
      <div class="encrypt-view__section">
        <div class="section-header">Input</div>

        <template v-if="store.mode === 'uuid'">
          <div class="section-hint">Click Generate to create a UUID v4</div>
        </template>

        <template v-else-if="store.mode === 'md5'">
          <CodeEditor
            v-model="store.input"
            placeholder="Enter text to compute MD5 hash..."
          />
        </template>

        <template v-else>
          <div class="aes-options">
            <input
              v-model="store.aesKey"
              type="password"
              class="aes-input"
              placeholder="Password (used to derive AES-256 key via PBKDF2)"
            />
          </div>
          <CodeEditor
            v-model="store.input"
            :placeholder="aesDecryptMode ? 'Enter hex ciphertext to decrypt...' : 'Enter text to encrypt...'"
          />
        </template>
      </div>

      <div class="encrypt-view__actions">
        <template v-if="store.mode === 'uuid'">
          <button class="primary-btn" @click="handleGenerateUuid">Generate</button>
        </template>
        <template v-else-if="store.mode === 'md5'">
          <button class="primary-btn" @click="handleComputeMd5">Compute</button>
        </template>
        <template v-else>
          <button class="action-btn" @click="handleAesEncrypt">Encrypt</button>
          <button class="action-btn" @click="handleAesDecrypt">Decrypt</button>
        </template>
      </div>

      <div class="encrypt-view__section">
        <div class="section-header">
          Output
          <button
            v-if="store.output"
            class="copy-btn"
            @click="copy(store.output)"
          >
            {{ copied ? 'Copied!' : 'Copy' }}
          </button>
        </div>
        <CodeEditor
          :model-value="store.output"
          placeholder="Result will appear here..."
          readonly
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import CodeEditor from '@shared/components/CodeEditor.vue'
import { useClipboard } from '@shared/composables/useClipboard'
import { useEncryptStore } from '../store'
import { useEncrypt } from '../composables/useEncrypt'

const store = useEncryptStore()
const { generateUuid, computeMd5, encryptAes, decryptAes } = useEncrypt()
const { copy, copied } = useClipboard()

const aesDecryptMode = ref(false)

function handleGenerateUuid() {
  store.setOutput(generateUuid())
}

function handleComputeMd5() {
  store.setOutput(computeMd5(store.input))
}

async function handleAesEncrypt() {
  aesDecryptMode.value = false
  const result = await encryptAes(store.input, store.aesKey)
  if (result) store.setOutput(result)
}

async function handleAesDecrypt() {
  aesDecryptMode.value = true
  const result = await decryptAes(store.input, store.aesKey)
  if (result) store.setOutput(result)
}
</script>

<style scoped>
.encrypt-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg-secondary);
}

.encrypt-view__toolbar {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.mode-tabs {
  display: flex;
  gap: var(--spacing-xs);
}

.mode-tab {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  transition: all 0.15s;
}

.mode-tab:hover {
  background: var(--color-bg-hover);
}

.mode-tab--active {
  background: var(--color-accent-light);
  color: var(--color-accent);
}

.encrypt-view__body {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.encrypt-view__section {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.section-hint {
  padding: var(--spacing-md);
  font-size: 13px;
  color: var(--color-text-tertiary);
}

.encrypt-view__actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.primary-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  color: #fff;
  background: var(--color-accent);
  transition: background 0.15s;
}

.primary-btn:hover {
  background: var(--color-accent-hover);
}

.action-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: 13px;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  transition: all 0.15s;
}

.action-btn:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-border-hover);
}

.copy-btn {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-accent);
  cursor: pointer;
}

.copy-btn:hover {
  text-decoration: underline;
}

.aes-options {
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.aes-input {
  width: 100%;
  padding: var(--spacing-xs) var(--spacing-sm);
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--color-text-primary);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
}

.aes-input:focus {
  border-color: var(--color-accent);
}
</style>
