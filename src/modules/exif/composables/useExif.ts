import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { useExifStore, type ExifData } from '../store'

export const SUPPORTED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'avif']

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function useExif() {
  const store = useExifStore()

  async function readFileAsDataUrl(path: string): Promise<string> {
    const bytes = await invoke<number[]>('read_local_file', { path })
    const uint8 = new Uint8Array(bytes)
    const ext = path.split('.').pop()?.toLowerCase() || 'jpeg'
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      heic: 'image/heic',
      avif: 'image/avif',
    }
    const mime = mimeMap[ext] || 'image/jpeg'
    return blobToDataUrl(new Blob([uint8], { type: mime }))
  }

  function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(blob)
    })
  }

  async function processFile(path: string) {
    store.setLoading(true)
    store.setError('')

    try {
      const name = path.split(/[\\/]/).pop() || path
      const ext = name.split('.').pop()?.toLowerCase() || ''
      if (!SUPPORTED_EXTENSIONS.includes(ext)) {
        throw new Error(`Unsupported format: .${ext}`)
      }

      const bytes = await invoke<number[]>('read_local_file', { path })
      const size = bytes.length
      const src = await readFileAsDataUrl(path)
      store.setImage(path, name, size, src)

      const data = await invoke<ExifData>('read_image_exif', { path })
      store.setExifData(data)
    } catch (e) {
      store.setError(String(e))
    } finally {
      store.setLoading(false)
    }
  }

  /**
   * Handle a File dropped via HTML5 drag events (used when the window runs
   * with dragDropEnabled = false or in the browser; no real path available).
   * Bytes are sent to the backend so EXIF is parsed the same way as path-based imports.
   */
  async function processDroppedFile(file: File) {
    store.setLoading(true)
    store.setError('')

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      if (!SUPPORTED_EXTENSIONS.includes(ext)) {
        throw new Error(`Unsupported format: .${ext}`)
      }
      const data = await invoke<ExifData>('read_image_exif_bytes', {
        data: new Uint8Array(await file.arrayBuffer()),
      })
      const src = await blobToDataUrl(file)
      store.setImage('', file.name, file.size, src)
      store.setExifData(data)
    } catch (e) {
      store.setError(String(e))
    } finally {
      store.setLoading(false)
    }
  }

  async function pickFile() {
    const selected = await open({
      multiple: false,
      directory: false,
      filters: [
        {
          name: 'Images',
          extensions: SUPPORTED_EXTENSIONS,
        },
      ],
    })
    if (selected) {
      await processFile(selected as string)
    }
  }

  function clearAll() {
    store.clear()
  }

  function formatSize(bytes: number): string {
    return formatBytes(bytes)
  }

  return {
    pickFile,
    processFile,
    processDroppedFile,
    clearAll,
    formatSize,
  }
}
