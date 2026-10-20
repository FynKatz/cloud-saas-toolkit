import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { toVirtualEmail } from '../types/auth'
import type { Profile } from '../types/auth'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const user = ref<User | null>(null)
  const profile = ref<Profile | null>(null)
  const loading = ref(true)
  const initialized = ref(false)

  const isAuthenticated = computed(() => !!session.value)
  const isApproved = computed(() => profile.value?.status === 'approved')
  const mustChangePassword = computed(
    () => profile.value?.must_change_password === true,
  )

  async function refreshProfile(): Promise<void> {
    if (!user.value) {
      profile.value = null
      return
    }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.value.id)
      .single()
    profile.value = (data as Profile | null) ?? null
  }

  async function init(): Promise<void> {
    try {
      const { data } = await supabase.auth.getSession()
      session.value = data.session
      user.value = data.session?.user ?? null
      await refreshProfile()
    } finally {
      loading.value = false
      initialized.value = true
    }
  }

  supabase.auth.onAuthStateChange((_event, newSession) => {
    session.value = newSession
    user.value = newSession?.user ?? null
    refreshProfile()
  })

  async function signUp(
    username: string,
    password: string,
  ): Promise<{ error?: string }> {
    const email = toVirtualEmail(username)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    })
    if (error) {
      if (error.message.includes('already registered') || error.status === 422) {
        return { error: '用户名已被占用' }
      }
      return { error: '注册失败，请稍后重试' }
    }
    if (data.session) {
      session.value = data.session
      user.value = data.session.user
      await refreshProfile()
    }
    return {}
  }

  async function signIn(
    username: string,
    password: string,
  ): Promise<{ error?: string }> {
    const email = toVirtualEmail(username)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) return { error: '用户名或密码错误' }
    session.value = data.session
    user.value = data.session.user
    await refreshProfile()
    return {}
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut()
    session.value = null
    user.value = null
    profile.value = null
  }

  return {
    session,
    user,
    profile,
    loading,
    initialized,
    isAuthenticated,
    isApproved,
    mustChangePassword,
    init,
    signUp,
    signIn,
    signOut,
    refreshProfile,
  }
})
