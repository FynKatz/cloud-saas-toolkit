import type { InjectionKey, Ref } from 'vue'

export const DASHBOARD_SEARCH_KEY: InjectionKey<Ref<string>> =
  Symbol('dashboard-search')
