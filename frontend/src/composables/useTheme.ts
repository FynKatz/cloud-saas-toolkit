import { ref, watchEffect } from 'vue'

const isDark = ref(false)

export function useTheme() {
  function init() {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark') {
      isDark.value = true
    } else if (stored === 'light') {
      isDark.value = false
    } else {
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    apply()
  }

  function apply() {
    document.documentElement.classList.toggle('dark', isDark.value)
    localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
  }

  function toggle() {
    isDark.value = !isDark.value
    apply()
  }

  watchEffect(() => {
    apply()
  })

  return { isDark, init, toggle }
}
