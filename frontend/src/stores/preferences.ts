import { defineStore } from 'pinia'
import { ref } from 'vue'

export type L1Context = 'workspace' | 'notifications' | 'admin'
export type ThemeMode = 'light' | 'dark'
export type Locale = 'zh' | 'en'

const V2_PREFIX = 'v2.'

function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeLocal(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // private mode or quota exceeded; preference stays in memory.
  }
}

function migrateLegacy(
  oldKey: string,
  newKey: string,
  _valid: (_: string) => boolean,
): string | null {
  const legacy = readLocal(oldKey)
  if (!legacy || readLocal(newKey)) return readLocal(newKey)
  if (_valid(legacy)) {
    writeLocal(newKey, legacy)
    try {
      localStorage.removeItem(oldKey)
    } catch {
      // ignore removal failure
    }
    return legacy
  }
  return null
}

export const usePreferencesStore = defineStore('preferences', () => {
  const sidebarCollapsed = ref(false)
  const l1ActiveContext = ref<L1Context>('workspace')
  const theme = ref<ThemeMode>('light')
  const locale = ref<Locale>('zh')
  let initialized = false

  function init(): void {
    if (initialized) return
    initialized = true

    // one-time migration from old keys before reading v2.* keys.
    const migratedSidebar = migrateLegacy(
      'sidebar-collapsed',
      `${V2_PREFIX}sidebar-collapsed`,
      (v): v is '1' | '0' => v === '1' || v === '0',
    )
    if (migratedSidebar) sidebarCollapsed.value = migratedSidebar === '1'
    else sidebarCollapsed.value = readLocal(`${V2_PREFIX}sidebar-collapsed`) === '1'

    const migratedContext = migrateLegacy(
      'l1-context',
      `${V2_PREFIX}l1-active-context`,
      (v): v is L1Context => ['workspace', 'notifications', 'admin'].includes(v),
    )
    if (migratedContext) l1ActiveContext.value = migratedContext as L1Context
    else {
      const current = readLocal(`${V2_PREFIX}l1-active-context`)
      l1ActiveContext.value =
        current === 'notifications' || current === 'admin'
          ? (current as L1Context)
          : 'workspace'
    }

    const migratedTheme = migrateLegacy(
      'theme',
      `${V2_PREFIX}theme`,
      (v): v is ThemeMode => v === 'light' || v === 'dark',
    )
    if (migratedTheme) theme.value = migratedTheme as ThemeMode
    else {
      const stored = readLocal(`${V2_PREFIX}theme`)
      if (stored === 'dark' || stored === 'light') theme.value = stored as ThemeMode
      else theme.value = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    applyTheme()

    const storedLocale = readLocal(`${V2_PREFIX}locale`)
    locale.value = storedLocale === 'en' ? 'en' : 'zh'
  }

  function applyTheme(): void {
    document.documentElement.classList.toggle('dark', theme.value === 'dark')
  }

  function setSidebarCollapsed(value: boolean): void {
    sidebarCollapsed.value = value
    writeLocal(`${V2_PREFIX}sidebar-collapsed`, value ? '1' : '0')
  }

  function setL1Context(value: L1Context): void {
    l1ActiveContext.value = value
    writeLocal(`${V2_PREFIX}l1-active-context`, value)
  }

  function setTheme(value: ThemeMode): void {
    theme.value = value
    applyTheme()
    writeLocal(`${V2_PREFIX}theme`, value)
  }

  function toggleTheme(): void {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  function setLocale(value: Locale): void {
    locale.value = value
    writeLocal(`${V2_PREFIX}locale`, value)
  }

  return {
    sidebarCollapsed,
    l1ActiveContext,
    theme,
    locale,
    init,
    setSidebarCollapsed,
    setL1Context,
    setTheme,
    toggleTheme,
    setLocale,
  }
})
