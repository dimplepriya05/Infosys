import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'DM Sans, sans-serif', background: '#f8fafc' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>⚠️</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '.75rem', color: '#0f172a' }}>Something went wrong</h2>
          <p style={{ color: '#64748b', marginBottom: '2rem', maxWidth: 380, textAlign: 'center', lineHeight: 1.7 }}>
            An unexpected error occurred. Please refresh the page or contact support if the problem persists.
          </p>
          <div style={{ display: 'flex', gap: '.75rem' }}>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '.75rem 1.5rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, fontFamily: 'inherit', fontSize: '.9375rem', fontWeight: 600, cursor: 'pointer' }}
            >
              🔄 Reload Page
            </button>
            <button
              onClick={() => this.setState({ hasError: false })}
              style={{ padding: '.75rem 1.5rem', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: 10, fontFamily: 'inherit', fontSize: '.9375rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Try Again
            </button>
          </div>
          {this.state.error && (
            <pre style={{ marginTop: '2rem', background: '#1e293b', color: '#94a3b8', padding: '1rem 1.5rem', borderRadius: 10, fontSize: '.75rem', maxWidth: 600, overflow: 'auto' }}>
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
