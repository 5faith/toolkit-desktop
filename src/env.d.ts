/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare module '*.js' {
  const value: unknown
  export default value
}

declare module '@/lib/mpegts.js/mpegts.min.js' {
  import type { MpegtsStatic } from '@/lib/mpegts.js/index.d.ts'
  const mpegts: MpegtsStatic
  export default mpegts
}
