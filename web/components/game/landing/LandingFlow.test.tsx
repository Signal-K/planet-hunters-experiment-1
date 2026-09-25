// @vitest-environment jsdom

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'

import LandingFlow from './LandingFlow'

function setValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

async function mount(element: React.ReactElement) {
  const host = document.createElement('div')
  const root = createRoot(host)
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  await act(async () => root.render(element))
  const click = async (testId: string) => act(async () => {
    (host.querySelector(`[data-testid="${testId}"]`) as HTMLButtonElement | null)?.click()
  })
  return { host, root, click }
}

const noop = vi.fn(async () => {})

describe('LandingFlow (SSL-35)', () => {
  it('goes yard → Start new game → create account, and checks the password match', async () => {
    const onCreateAccount = vi.fn(async () => {})
    const { host, root, click } = await mount(
      <LandingFlow signedIn={false} onSignIn={noop} onCreateAccount={onCreateAccount} onContinue={vi.fn()} onStartNew={vi.fn()} />,
    )
    expect(host.querySelector('[data-testid="landnam-landing"]')?.getAttribute('data-step')).toBe('choice')
    expect(host.querySelector('svg[aria-label]')).not.toBeNull()

    await click('intro-begin-btn')
    expect(host.querySelector('[data-testid="landnam-landing"]')?.getAttribute('data-step')).toBe('signup')

    await act(async () => {
      setValue(host.querySelector('[data-testid="auth-gate-email"]') as HTMLInputElement, 'miner@example.com')
      setValue(host.querySelector('[data-testid="auth-gate-password"]') as HTMLInputElement, 'correct-horse-battery-staple')
      setValue(host.querySelector('[data-testid="auth-gate-password-confirmation"]') as HTMLInputElement, 'different-password')
      host.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    expect(onCreateAccount).not.toHaveBeenCalled()
    expect(host.textContent).toContain('Passwords do not match.')
    await act(async () => root.unmount())
  })

  it('sends Continue to sign in when signed out', async () => {
    const { host, root, click } = await mount(
      <LandingFlow signedIn={false} onSignIn={noop} onCreateAccount={noop} onContinue={vi.fn()} onStartNew={vi.fn()} />,
    )
    await click('landing-continue')
    expect(host.querySelector('[data-testid="landnam-landing"]')?.getAttribute('data-step')).toBe('signin')
    expect(host.querySelector('[data-testid="auth-gate-password-confirmation"]')).toBeNull()
    await act(async () => root.unmount())
  })

  it('asks before erasing a signed-in save, and continues without signing in again', async () => {
    const onContinue = vi.fn()
    const onStartNew = vi.fn()
    const { root, click } = await mount(
      <LandingFlow signedIn hasSave onSignIn={noop} onCreateAccount={noop} onContinue={onContinue} onStartNew={onStartNew} />,
    )
    await click('landing-continue')
    expect(onContinue).toHaveBeenCalledOnce()
    await click('intro-begin-btn')
    expect(onStartNew).not.toHaveBeenCalled()
    await click('intro-begin-btn')
    expect(onStartNew).toHaveBeenCalledOnce()
    await act(async () => root.unmount())
  })
})
