import { Component } from 'react';

/**
 * ErrorBoundary — catches any render-time errors in child components
 * and shows a friendly fallback UI instead of a blank page.
 */
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('[ErrorBoundary] Caught error:', error, info);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '300px',
                    padding: '2rem',
                    textAlign: 'center',
                    color: 'var(--text-secondary, #6b7280)',
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                    <h2 style={{ color: 'var(--text-primary, #111827)', marginBottom: '0.5rem' }}>
                        Something went wrong
                    </h2>
                    <p style={{ marginBottom: '1.5rem', maxWidth: '400px' }}>
                        This section encountered an error. You can try reloading or go back.
                    </p>
                    {this.state.error && (
                        <details style={{ marginBottom: '1rem', fontSize: '0.8rem', color: '#dc2626' }}>
                            <summary>Error details</summary>
                            <pre style={{ textAlign: 'left', marginTop: '0.5rem' }}>
                                {this.state.error.toString()}
                            </pre>
                        </details>
                    )}
                    <button
                        onClick={this.handleReset}
                        style={{
                            padding: '0.5rem 1.5rem',
                            background: 'var(--primary, #2563eb)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '600',
                        }}
                    >
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
