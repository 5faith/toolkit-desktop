import { inject, type InjectionKey } from 'vue'

/** 当前 Tab 实例 id 的注入 key */
export const TAB_ID_KEY: InjectionKey<string> = Symbol('tab-id')

/** 非 Tab 环境（例如单元测试）下的兜底 id */
export const DEFAULT_TAB_ID = '__default__'

export function useCurrentTabId(): string {
  return inject(TAB_ID_KEY, DEFAULT_TAB_ID)
}
