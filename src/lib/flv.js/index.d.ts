interface FlvJsStatic {
  isSupported(): boolean
  createPlayer(config: Record<string, unknown>): FlvPlayer
}

interface FlvPlayer {
  attachMediaElement(element: HTMLVideoElement): void
  load(): void
  play(): void
  pause(): void
  destroy(): void
}

declare const flvjs: FlvJsStatic
export default flvjs
