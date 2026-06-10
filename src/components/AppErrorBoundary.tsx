// AppErrorBoundary — the app's last line of defense against render-time
// throws. Without it, a single component error (e.g. dexie-react-hooks
// rethrowing a Zod parse error inside useLiveQuery) white-screens the whole
// PWA, and the only escape is the data-destroying `?reset=1` URL hatch.
//
// The boundary catches the error, keeps the user's data intact, and offers
// "reload" first. "start fresh" is the clearly-labeled destructive fallback
// that routes to the `?reset=1` hatch (App.tsx runs it at module load, before
// any React renders, so even a hopelessly broken tree can't block the reset).
//
// Must be a class component: componentDidCatch / getDerivedStateFromError
// have no hooks equivalent.
import { Component, type CSSProperties, type ErrorInfo, type ReactNode } from 'react'
import { Lumo } from './Lumo'

export interface AppErrorBoundaryProps {
  children: ReactNode
  /** Injectable for tests — defaults to a full page reload. */
  reload?: () => void
  /** Injectable for tests — defaults to window.location.replace. */
  navigate?: (url: string) => void
}

interface AppErrorBoundaryState {
  error: Error | null
}

const serifItalic: CSSProperties = {
  fontFamily: "'Fraunces', Georgia, serif",
  fontStyle: 'italic',
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Keep the full stack in the console — the fallback UI only shows the
    // one-line message, but bug reports need the component stack.
    console.error('AppErrorBoundary caught a render error', error, info.componentStack)
  }

  private handleReload = (): void => {
    if (this.props.reload) {
      this.props.reload()
      return
    }
    window.location.reload()
  }

  private handleStartFresh = (): void => {
    // Route to the module-load `?reset=1` hatch in App.tsx — it wipes Dexie
    // + localStorage before any React renders, then reloads clean.
    const url = `${window.location.pathname}?reset=1`
    if (this.props.navigate) {
      this.props.navigate(url)
      return
    }
    window.location.replace(url)
  }

  render(): ReactNode {
    if (this.state.error === null) return this.props.children

    const message =
      this.state.error.message.length > 0
        ? this.state.error.message
        : String(this.state.error)

    return (
      <div
        style={{
          minHeight: '100dvh',
          background: 'var(--lumo-bg)',
          color: 'var(--lumo-text)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 10,
          }}
        >
          <Lumo state="sad" size={96} />
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              marginTop: 6,
            }}
          >
            something broke that shouldn't have
          </h1>
          <p
            style={{
              ...serifItalic,
              fontSize: 14,
              color: 'var(--lumo-text-sec)',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            not your fault. your workouts are still saved on this phone — a
            reload usually sorts it out.
          </p>
          <p
            data-testid="error-boundary-message"
            style={{
              fontSize: 11,
              color: 'var(--lumo-text-ter)',
              fontFamily: 'ui-monospace, monospace',
              wordBreak: 'break-word',
              lineHeight: 1.4,
              margin: '2px 0 6px',
            }}
          >
            {message}
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="active:scale-[0.98] transition"
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: 14,
              background: 'var(--brand)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: '-0.01em',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            reload
          </button>
          <div
            style={{
              width: '100%',
              marginTop: 18,
              padding: 14,
              borderRadius: 16,
              background: 'color-mix(in srgb, #ef4444 8%, var(--lumo-raised))',
              border: '1px solid color-mix(in srgb, #ef4444 35%, transparent)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <p
              style={{
                ...serifItalic,
                fontSize: 12,
                color: 'var(--lumo-text-sec)',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              still broken after a reload? starting fresh wipes everything on
              this device — profile, plan, and workout history. last resort
              only.
            </p>
            <button
              type="button"
              onClick={this.handleStartFresh}
              className="active:scale-[0.98] transition"
              style={{
                padding: '10px 14px',
                borderRadius: 12,
                background: 'transparent',
                color: '#ef4444',
                fontWeight: 700,
                fontSize: 13,
                border: '1px solid color-mix(in srgb, #ef4444 55%, transparent)',
                cursor: 'pointer',
              }}
            >
              start fresh (wipes data)
            </button>
          </div>
        </div>
      </div>
    )
  }
}

export default AppErrorBoundary
