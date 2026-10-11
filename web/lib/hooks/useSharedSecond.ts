'use client'

import { useSyncExternalStore } from 'react'

type Listener = () => void

const listeners = new Set<Listener>()
let intervalId: ReturnType<typeof window.setInterval> | undefined
let now = Date.now()

function publish() {
  now = Date.now()
  listeners.forEach(listener => listener())
}

function start() {
  if (intervalId !== undefined || typeof window === 'undefined' || document.hidden) return
  publish()
  intervalId = window.setInterval(publish, 1000)
}

function stop() {
  if (intervalId === undefined) return
  window.clearInterval(intervalId)
  intervalId = undefined
}

function onVisibilityChange() {
  if (document.hidden) {
    stop()
  } else if (listeners.size > 0) {
    start()
  }
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  if (listeners.size === 1 && typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange)
  }
  start()

  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && typeof document !== 'undefined') {
      stop()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }
}

function getSnapshot() {
  return now
}

function getServerSnapshot() {
  return 0
}

/**
 * One visible-page second clock for hub countdowns. It owns a single interval
 * regardless of how many buildings or operations panels are subscribed.
 */
export function useSharedSecond(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
