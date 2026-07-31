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

declare module '@/lib/flv.js/flv.min.js' {
  interface FlvJsStatic {
    isSupported(): boolean
    createPlayer(config: Record<string, unknown>): FlvPlayerInstance
  }

  interface FlvPlayerInstance {
    attachMediaElement(element: HTMLVideoElement): void
    load(): void
    play(): void
    pause(): void
    destroy(): void
  }

  const flvjs: FlvJsStatic
  export default flvjs
}
