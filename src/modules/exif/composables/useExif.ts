import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { useExifStore, type ExifData } from '../store'

export const SUPPORTED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'tif', 'tiff', 'heic', 'avif']

const MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  heic: 'image/heic',
  avif: 'image/avif',
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(blob)
  })
}

function bytesToDataUrl(bytes: number[] | Uint8Array, ext: string): Promise<string> {
  const uint8 = new Uint8Array(bytes)
  const blob = new Blob([uint8], { type: MIME_MAP[ext] || 'image/jpeg' })
  return blobToDataUrl(blob)
}

/**
 * TIFF 等格式 WebView 无法渲染，让后端解码为 PNG 作为预览图；
 * 解码失败时返回原始 data URL，由 <img> 的 @error 占位框兜底。
 */
async function resolvePreviewDataUrl(bytes: number[] | Uint8Array, ext: string, fallback: string): Promise<string> {
  try {
    const decoded = await invoke<string | null>('decode_image_preview', {
      data: new Uint8Array(bytes),
      ext,
    })
    return decoded ?? fallback
  } catch {
    return fallback
  }
}

export function useExif() {
  const store = useExifStore()

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
      const src = await resolvePreviewDataUrl(bytes, ext, await bytesToDataUrl(bytes, ext))
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

      const buffer = await file.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      const data = await invoke<ExifData>('read_image_exif_bytes', { data: bytes })
      const src = await resolvePreviewDataUrl(bytes, ext, await bytesToDataUrl(bytes, ext))
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
