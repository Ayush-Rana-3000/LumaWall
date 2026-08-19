import React, { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { log } from '@utils/logger'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  /** Optional label to identify which part of the app crashed. */
  label?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    log.error('React error boundary caught an error', {
      label: this.props.label ?? 'unknown',
      message: error.message,
      stack: error.stack?.slice(0, 500),
      componentStack: errorInfo.componentStack?.slice(0, 500),
    })
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex flex-col items-center justify-center gap-4 p-8 rounded-2xl bg-ink-850/80 border border-white/[0.08] text-center min-h-[200px]">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="w-8 h-8 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Something went wrong</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-md">
              {this.props.label
                ? `The ${this.props.label} encountered an error.`
                : 'An unexpected error occurred.'}
            </p>
            {typeof window !== 'undefined' && window.location.hostname === 'localhost' && this.state.error && (
              <p className="text-xs text-red-400 mt-2 font-mono break-all max-w-lg">
                {this.state.error.message}
              </p>
            )}
          </div>
          <button
            onClick={this.handleReset}
            className="btn btn-primary inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
