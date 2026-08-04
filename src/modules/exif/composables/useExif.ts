import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { useExifStore, type ExifData } from '../store'

const SUPPORTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/avif',
]

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
    const blob = new Blob([uint8], { type: mime })
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
      if (!['jpg', 'jpeg', 'png', 'webp', 'heic', 'avif'].includes(ext)) {
        throw new Error(`Unsupported format: .${ext}`)
      }

      const bytes = await invoke<number[]>('read_local_file', { path })
      const size = bytes.length
      const src = await readFileAsDataUrl(path)
      store.setImage(path, name, size, src)

      const data = await invoke<ExifData>('read_image_exif', { path })
      console.log('[useExif] received data:', data)
      console.log('[useExif] allFields:', data.allFields)
      console.log('[useExif] allFields length:', data.allFields?.length)
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
          extensions: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'avif'],
        },
      ],
    })
    if (selected) {
      await processFile(selected as string)
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer?.files[0]
    if (!file) return

    if (!SUPPORTED_TYPES.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|heic|avif)$/i)) {
      store.setError('Unsupported file format')
      return
    }

    const reader = new FileReader()
    reader.onload = async () => {
      store.setLoading(true)
      store.setError('')
      try {
        const name = file.name
        const size = file.size
        const src = reader.result as string
        store.setImage('', name, size, src)

        if ('path' in file) {
          const filePath = (file as unknown as { path: string }).path
          const data = await invoke<ExifData>('read_image_exif', { path: filePath })
          store.setExifData(data)
        } else {
          store.setError('Cannot read EXIF from dropped file without file path access')
        }
      } catch (e) {
        store.setError(String(e))
      } finally {
        store.setLoading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault()
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
    handleDrop,
    handleDragOver,
    clearAll,
    formatSize,
  }
}
