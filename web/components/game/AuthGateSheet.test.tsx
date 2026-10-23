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
  it('uses the blueprint surface for account access', async () => {
    const host = document.createElement('div')
    const root = createRoot(host)
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

    await act(async () => {
      root.render(<AuthGateSheet error={null} onSignIn={vi.fn(async () => {})} onCreateAccount={vi.fn(async () => {})} onRequestPasswordReset={vi.fn(async () => {})} onConfirmPasswordReset={vi.fn(async () => {})} />)
    })

    expect(host.querySelector('.auth-gate')?.classList.contains('theme-blueprint')).toBe(true)
    expect(host.querySelector('[data-testid="world-backdrop"]')).not.toBeNull()
    expect(host.textContent).toContain('LANDNAM')
    expect(host.textContent).not.toContain('command deck')

    await act(async () => root.unmount())
  })

  it('requires a matching user-chosen password before creating an account', async () => {
    const host = document.createElement('div')
    const root = createRoot(host)
    const onCreateAccount = vi.fn(async () => {})
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

    await act(async () => {
      root.render(<AuthGateSheet error={null} onSignIn={vi.fn(async () => {})} onCreateAccount={onCreateAccount} onRequestPasswordReset={vi.fn(async () => {})} onConfirmPasswordReset={vi.fn(async () => {})} />)
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

  it('keeps the Orionids destination visible through authentication', async () => {
    const host = document.createElement('div')
    const root = createRoot(host)
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

    await act(async () => {
      root.render(<AuthGateSheet entry="orionids" error={null} onSignIn={vi.fn(async () => {})} onCreateAccount={vi.fn(async () => {})} onRequestPasswordReset={vi.fn(async () => {})} onConfirmPasswordReset={vi.fn(async () => {})} />)
    })

    expect(host.textContent).toContain('Fly the Orionids')
    expect(host.textContent).toContain('straight into the Orionids launch')
    expect(host.querySelector('[data-testid="auth-gate-submit"]')?.textContent).toBe('Continue to Orionids')

    await act(async () => root.unmount())
  })

  it('requests password-reset instructions with only an email, no password', async () => {
    const host = document.createElement('div')
    const root = createRoot(host)
    const onRequestPasswordReset = vi.fn(async () => {})
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

    await act(async () => {
      root.render(<AuthGateSheet error={null} onSignIn={vi.fn(async () => {})} onCreateAccount={vi.fn(async () => {})} onRequestPasswordReset={onRequestPasswordReset} onConfirmPasswordReset={vi.fn(async () => {})} />)
    })
    await act(async () => {
      ;(host.querySelector('[data-testid="auth-gate-forgot-password"]') as HTMLButtonElement).click()
    })
    expect(host.querySelector('[data-testid="auth-gate-password"]')).toBeNull()
    const submit = host.querySelector('[data-testid="auth-gate-submit"]') as HTMLButtonElement
    expect(submit.textContent).toBe('Send Reset Link')
    expect(submit.disabled).toBe(true)

    await act(async () => setValue(host.querySelector('[data-testid="auth-gate-email"]') as HTMLInputElement, 'miner@example.com'))
    expect(submit.disabled).toBe(false)
    await act(async () => {
      host.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })

    expect(onRequestPasswordReset).toHaveBeenCalledWith('miner@example.com')
    expect(host.textContent).toContain('we’ve sent password-reset instructions')

    await act(async () => root.unmount())
  })

  it('finishes a code-based reset with the emailed code and a new password', async () => {
    const host = document.createElement('div')
    const root = createRoot(host)
    const onRequestPasswordReset = vi.fn(async (): Promise<'code'> => 'code')
    const onConfirmPasswordReset = vi.fn(async () => {})
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

    await act(async () => {
      root.render(<AuthGateSheet error={null} onSignIn={vi.fn(async () => {})} onCreateAccount={vi.fn(async () => {})} onRequestPasswordReset={onRequestPasswordReset} onConfirmPasswordReset={onConfirmPasswordReset} />)
    })
    await act(async () => {
      ;(host.querySelector('[data-testid="auth-gate-forgot-password"]') as HTMLButtonElement).click()
    })
    await act(async () => setValue(host.querySelector('[data-testid="auth-gate-email"]') as HTMLInputElement, 'miner@example.com'))
    await act(async () => {
      host.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })

    expect(host.querySelector('[data-testid="auth-gate-email"]')).toBeNull()
    expect(host.textContent).toContain('code we emailed to miner@example.com')
    await act(async () => {
      setValue(host.querySelector('[data-testid="auth-gate-code"]') as HTMLInputElement, '123456')
      setValue(host.querySelector('[data-testid="auth-gate-password"]') as HTMLInputElement, 'a-new-password')
      setValue(host.querySelector('[data-testid="auth-gate-password-confirmation"]') as HTMLInputElement, 'a-new-password')
    })
    await act(async () => {
      host.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    expect(onConfirmPasswordReset).toHaveBeenCalledWith('123456', 'a-new-password')

    await act(async () => root.unmount())
  })

  it('asks for the emailed code when sign-up needs verification', async () => {
    window.history.replaceState(null, '', '/game?gate=signup')
    const host = document.createElement('div')
    const root = createRoot(host)
    const onCreateAccount = vi.fn(async (): Promise<'verify'> => 'verify')
    const onVerifyAccount = vi.fn(async () => {})
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

    await act(async () => {
      root.render(<AuthGateSheet error={null} onSignIn={vi.fn(async () => {})} onCreateAccount={onCreateAccount} onVerifyAccount={onVerifyAccount} onRequestPasswordReset={vi.fn(async () => {})} onConfirmPasswordReset={vi.fn(async () => {})} />)
    })
    await act(async () => {
      setValue(host.querySelector('[data-testid="auth-gate-email"]') as HTMLInputElement, 'new@example.com')
      setValue(host.querySelector('[data-testid="auth-gate-password"]') as HTMLInputElement, 'long-password')
      setValue(host.querySelector('[data-testid="auth-gate-password-confirmation"]') as HTMLInputElement, 'long-password')
    })
    await act(async () => {
      host.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    expect(onCreateAccount).toHaveBeenCalledWith('new@example.com', 'long-password')
    expect(host.querySelector('[data-testid="auth-gate-password"]')).toBeNull()
    expect(host.querySelector('[data-testid="auth-gate-submit"]')?.textContent).toBe('Confirm Email')

    await act(async () => setValue(host.querySelector('[data-testid="auth-gate-code"]') as HTMLInputElement, '424242'))
    await act(async () => {
      host.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    expect(onVerifyAccount).toHaveBeenCalledWith('424242')

    window.history.replaceState(null, '', '/game')
    await act(async () => root.unmount())
  })

  it('sets a new password from the emailed reset link and drops the token from the URL', async () => {
    window.history.replaceState(null, '', '/game?reset_token=abc123')
    const host = document.createElement('div')
    const root = createRoot(host)
    const onConfirmPasswordReset = vi.fn(async () => {})
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

    await act(async () => {
      root.render(<AuthGateSheet error={null} onSignIn={vi.fn(async () => {})} onCreateAccount={vi.fn(async () => {})} onRequestPasswordReset={vi.fn(async () => {})} onConfirmPasswordReset={onConfirmPasswordReset} />)
    })
    expect(window.location.search).not.toContain('reset_token')
    expect(host.querySelector('[data-testid="auth-gate-email"]')).toBeNull()

    const password = host.querySelector('[data-testid="auth-gate-password"]') as HTMLInputElement
    const confirmation = host.querySelector('[data-testid="auth-gate-password-confirmation"]') as HTMLInputElement
    await act(async () => {
      setValue(password, 'a-new-password')
      setValue(confirmation, 'different')
    })
    await act(async () => {
      host.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    expect(onConfirmPasswordReset).not.toHaveBeenCalled()

    await act(async () => setValue(confirmation, 'a-new-password'))
    await act(async () => {
      host.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    expect(onConfirmPasswordReset).toHaveBeenCalledWith('abc123', 'a-new-password')
    expect(host.querySelector('[data-testid="auth-gate-password-changed"]')).not.toBeNull()

    await act(async () => root.unmount())
  })
})
