export interface MpegtsPlayer {
  attachMediaElement(element: HTMLVideoElement): void
  detachMediaElement(): void
  load(): void
  play(): void
  pause(): void
  destroy(): void
  on(event: string, callback: (...args: unknown[]) => void): void
  off(event: string, callback: (...args: unknown[]) => void): void
}

export interface MpegtsConfig {
  type: string
  url: string
  isLive?: boolean
  cors?: boolean
  withCredentials?: boolean
  hasAudio?: boolean
  hasVideo?: boolean
  enableStashBuffer?: boolean
  stashInitialSize?: number
  lazyLoad?: boolean
  lazyLoadMaxDuration?: number
  deferLoadAfterSourceOpen?: boolean
  autoCleanupSourceBuffer?: boolean
  autoCleanupMaxBackwardDuration?: number
  autoCleanupMinBackwardDuration?: number
  statisticsInfoReportInterval?: number
  fixAudioTimestampGap?: boolean
  accurateSeek?: boolean
  seekType?: string
  seekParamStart?: string
  seekParamEnd?: string
  rangeLoadZeroStart?: boolean
  customSeekHandler?: unknown
  reuseRedirectedURL?: boolean
  headers?: Record<string, string>
  customLoader?: unknown
}

export interface MpegtsStatic {
  isSupported(): boolean
  createPlayer(config: MpegtsConfig, config2?: Record<string, unknown>): MpegtsPlayer
  LoggingControl: {
    enableAll: boolean
    enableDebug: boolean
    enableVerbose: boolean
    enableInfo: boolean
    enableWarn: boolean
    enableError: boolean
  }
}

declare const mpegts: MpegtsStatic
export default mpegts
