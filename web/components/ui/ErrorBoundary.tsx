'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import Panel from './Panel'
import { PrimaryBtn } from './Button'

interface Props {
  children?: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="error-fallback p-6 flex flex-col items-center justify-center min-h-[300px] text-center">
          <Panel accent="var(--ln-crit)">
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-bold text-[var(--ln-crit)]">SIGNAL INTERRUPTED</h2>
              <p className="text-sm opacity-80">
                A critical error occurred in the ship's computer system. 
                Telemetry data has been corrupted.
              </p>
              <div className="bg-black/40 p-3 rounded font-mono text-xs text-left overflow-auto max-w-full">
                {this.state.error?.message}
              </div>
              <PrimaryBtn onClick={() => window.location.reload()}>
                Reboot System
              </PrimaryBtn>
            </div>
          </Panel>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
