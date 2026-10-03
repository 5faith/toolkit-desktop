import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue'

export interface UseFileDropOptions {
  /** drop target element; hit-tested against Tauri drop positions and used for the HTML5 fallback */
  target: Ref<HTMLElement | null>
  /** called with dropped file paths (Tauri with dragDropEnabled = true) */
  onDropPaths?: (paths: string[]) => void
  /** called with dropped File objects (HTML5 events; paths are not available there) */
  onDropFiles?: (files: File[]) => void
}

const isTauri = '__TAURI_INTERNALS__' in window

export function useFileDrop(options: UseFileDropOptions) {
  const dragging = ref(false)
  let unlisten: (() => void) | null = null
  let disposed = false
  let boundEl: HTMLElement | null = null

  /** Tauri reports physical pixels; convert to CSS pixels before hit-testing */
  function hitTest(physicalX: number, physicalY: number): boolean {
    const el = options.target.value
    if (!el) return false
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) return false
    const dpr = window.devicePixelRatio || 1
    const x = physicalX / dpr
    const y = physicalY / dpr
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
  }

  function handleHtmlDragOver(event: DragEvent) {
    event.preventDefault()
    dragging.value = true
  }

  function handleHtmlDragLeave(event: DragEvent) {
    if (!event.relatedTarget || !boundEl?.contains(event.relatedTarget as Node)) {
      dragging.value = false
    }
  }

  function handleHtmlDrop(event: DragEvent) {
    event.preventDefault()
    dragging.value = false
    const files = Array.from(event.dataTransfer?.files ?? [])
    if (files.length > 0) options.onDropFiles?.(files)
  }

  /** keep the webview from navigating to a file dropped outside the target */
  function guardDocumentDrag(event: DragEvent) {
    if (event.target instanceof Node && boundEl?.contains(event.target)) return
    event.preventDefault()
  }

  function bindHtml(el: HTMLElement | null) {
    if (boundEl === el) return
    if (boundEl) {
      boundEl.removeEventListener('dragover', handleHtmlDragOver)
      boundEl.removeEventListener('dragleave', handleHtmlDragLeave)
      boundEl.removeEventListener('drop', handleHtmlDrop)
    }
    boundEl = el
    if (el) {
      el.addEventListener('dragover', handleHtmlDragOver)
      el.addEventListener('dragleave', handleHtmlDragLeave)
      el.addEventListener('drop', handleHtmlDrop)
    }
  }

  watch(() => options.target.value, el => bindHtml(el), { immediate: true })

  onMounted(async () => {
    // HTML5 drag events are always bound: they are the only mechanism when
    // Tauri windows run with dragDropEnabled = false, and they take over in
    // plain browsers. The Tauri event below only fires with dragDropEnabled = true.
    document.addEventListener('dragover', guardDocumentDrag)
    document.addEventListener('drop', guardDocumentDrag)

    if (!isTauri) return
    try {
      const { getCurrentWebview } = await import('@tauri-apps/api/webview')
      const un = await getCurrentWebview().onDragDropEvent((event) => {
        const payload = event.payload
        if (payload.type === 'enter' || payload.type === 'over') {
          dragging.value = hitTest(payload.position.x, payload.position.y)
        } else if (payload.type === 'leave') {
          dragging.value = false
        } else if (payload.type === 'drop') {
          const inside = hitTest(payload.position.x, payload.position.y)
          dragging.value = false
          if (inside) options.onDropPaths?.(payload.paths)
        }
      })
      if (disposed) un()
      else unlisten = un
    } catch (e) {
      console.warn('Drag-drop events unavailable:', e)
    }
  })

  onUnmounted(() => {
    disposed = true
    unlisten?.()
    unlisten = null
    bindHtml(null)
    document.removeEventListener('dragover', guardDocumentDrag)
    document.removeEventListener('drop', guardDocumentDrag)
  })

  return { dragging }
}
