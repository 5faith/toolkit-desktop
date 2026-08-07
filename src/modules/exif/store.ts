import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ExifField {
  tag: string
  value: string
}

export interface ExifData {
  cameraMake?: string
  cameraModel?: string
  cameraSerial?: string
  lensModel?: string
  lensSerial?: string
  focalLength?: string
  aperture?: string
  shutterSpeed?: string
  iso?: string
  exposureProgram?: string
  meteringMode?: string
  flash?: string
  whiteBalance?: string
  dateTaken?: string
  dateOriginal?: string
  dateDigitized?: string
  width?: number
  height?: number
  gpsLatitude?: string
  gpsLongitude?: string
  gpsAltitude?: string
  software?: string
  artist?: string
  copyright?: string
  orientation?: number
  totalTags?: number
  allFields?: ExifField[]
  xmpFields?: ExifField[]
  iptcFields?: ExifField[]
  iccFields?: ExifField[]
}

export const useExifStore = defineStore('exif', () => {
  const filePath = ref('')
  const fileName = ref('')
  const fileSize = ref(0)
  const fileSrc = ref('')
  const exifData = ref<ExifData | null>(null)
  const loading = ref(false)
  const error = ref('')

  function setImage(path: string, name: string, size: number, src: string) {
    filePath.value = path
    fileName.value = name
    fileSize.value = size
    fileSrc.value = src
  }

  function setExifData(data: ExifData) {
    exifData.value = data
  }

  function setLoading(val: boolean) {
    loading.value = val
  }

  function setError(msg: string) {
    error.value = msg
  }

  function clear() {
    filePath.value = ''
    fileName.value = ''
    fileSize.value = 0
    fileSrc.value = ''
    exifData.value = null
    loading.value = false
    error.value = ''
  }

  return {
    filePath,
    fileName,
    fileSize,
    fileSrc,
    exifData,
    loading,
    error,
    setImage,
    setExifData,
    setLoading,
    setError,
    clear,
  }
})
