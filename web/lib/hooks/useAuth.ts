'use client'

import { useState, useEffect } from 'react'
import { pbShared } from '../pb'
import type { RecordModel } from 'pocketbase'

export interface AuthState {
  user: RecordModel | null
  isLoggedIn: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => void
  createAccount: (email: string, password: string) => Promise<void>
  error: string | null
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<RecordModel | null>(
    pbShared.authStore.record as RecordModel | null
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsub = pbShared.authStore.onChange(() => {
      setUser(pbShared.authStore.record as RecordModel | null)
    })
    return () => unsub()
  }, [])

  async function signIn(email: string, password: string) {
    setError(null)
    try {
      await pbShared.collection('users').authWithPassword(email, password)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign in failed')
      throw e
    }
  }

  async function createAccount(email: string, password: string) {
    setError(null)
    try {
      await pbShared.collection('users').create({ email, password, passwordConfirm: password })
      await signIn(email, password)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Account creation failed')
      throw e
    }
  }

  function signOut() {
    pbShared.authStore.clear()
  }

  return {
    user,
    isLoggedIn: !!user,
    signIn,
    signOut,
    createAccount,
    error,
  }
}
