import { ref } from 'vue'

const isDark = ref(false)

export function useTheme() {
  function init() {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark') isDark.value = true
    else if (stored === 'light') isDark.value = false
    else isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    apply()
  }

  // Only toggles the class. Persistence lives in init()/toggle() on purpose:
  // the previous implementation wrote localStorage from a watchEffect, which
  // runs eagerly on setup — i.e. before main.ts got to theme.init() — so it
  // clobbered the stored value back to the `false` default and dark mode
  // never survived a reload.
  function apply() {
    document.documentElement.classList.toggle('dark', isDark.value)
  }

  function toggle() {
    isDark.value = !isDark.value
    apply()
    localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
  }

  return { isDark, init, toggle }
}
