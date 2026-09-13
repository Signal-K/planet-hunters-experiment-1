// @vitest-environment jsdom

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'

import AuthGateSheet from './AuthGateSheet'

function setValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('AuthGateSheet', () => {
  it('requires a matching user-chosen password before creating an account', async () => {
    const host = document.createElement('div')
    const root = createRoot(host)
    const onCreateAccount = vi.fn(async () => {})
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

    await act(async () => {
      root.render(<AuthGateSheet error={null} onSignIn={vi.fn(async () => {})} onCreateAccount={onCreateAccount} />)
    })
    await act(async () => {
      ;[...host.querySelectorAll('button')].find(button => button.textContent === 'Sign Up')?.click()
    })

    const email = host.querySelector('[data-testid="auth-gate-email"]') as HTMLInputElement
    const password = host.querySelector('[data-testid="auth-gate-password"]') as HTMLInputElement
    const confirmation = host.querySelector('[data-testid="auth-gate-password-confirmation"]') as HTMLInputElement
    await act(async () => {
      setValue(email, 'miner@example.com')
      setValue(password, 'correct-horse-battery-staple')
      setValue(confirmation, 'different-password')
      host.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })

    expect(onCreateAccount).not.toHaveBeenCalled()
    expect(host.textContent).toContain('Passwords do not match.')
    expect(host.textContent).not.toContain('Continue with Email')

    await act(async () => root.unmount())
  })
})
