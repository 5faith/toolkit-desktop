import { createApp } from 'vue'
import { pinia } from './stores'
import router from './router'
import App from './App.vue'
import { registerAllModules } from './modules'

import 'virtual:uno.css'
import '@shared/styles/reset.css'
import '@shared/styles/variables.css'
import '@shared/styles/global.css'

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable
}

window.addEventListener('keydown', (e) => {
  if (!isEditableTarget(e.target)) return

  if (e.key === 'Backspace') {
    e.preventDefault()
    const el = e.target as HTMLInputElement | HTMLTextAreaElement
    const start = el.selectionStart
    const end = el.selectionEnd
    if (start !== null && end !== null) {
      if (start !== end) {
        el.setRangeText('', start, end, 'end')
      } else if (start > 0) {
        el.setRangeText('', start - 1, start, 'end')
      }
      el.dispatchEvent(new Event('input', { bubbles: true }))
    }
  }
}, true)

window.addEventListener('paste', (e) => {
  if (!isEditableTarget(e.target)) return
  e.preventDefault()
  const text = e.clipboardData?.getData('text') ?? ''
  if (!text) return
  const el = e.target as HTMLInputElement | HTMLTextAreaElement
  const start = el.selectionStart ?? el.value.length
  const end = el.selectionEnd ?? el.value.length
  el.setRangeText(text, start, end, 'end')
  el.dispatchEvent(new Event('input', { bubbles: true }))
}, true)

registerAllModules()

const app = createApp(App)
app.use(pinia)
app.use(router)
app.mount('#app')
