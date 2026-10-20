import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps
{
    children: ReactNode;
    fallbackTitle?: string;
}

interface ErrorBoundaryState
{
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState>
{
    constructor(props: ErrorBoundaryProps)
    {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState>
    {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void
    {
        this.setState({ errorInfo });
        console.error('[REACT_ERROR_BOUNDARY_CAUGHT]', error, errorInfo);

        try
        {
            fetch('/api/debug-client-log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    step: 'REACT_ERROR_BOUNDARY',
                    message: error?.message,
                    stack: error?.stack,
                    componentStack: errorInfo?.componentStack,
                    time: new Date().toISOString()
                })
            }).catch(() => {});
        }
        catch(e) {}
    }

    render(): ReactNode
    {
        if(this.state.hasError)
        {
            return (
                <div style={ {
                    position: 'fixed',
                    inset: 0,
                    zIndex: 999999,
                    backgroundColor: '#1e293b',
                    color: '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px',
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                } }>
                    <div style={ {
                        maxWidth: '650px',
                        width: '100%',
                        backgroundColor: '#0f172a',
                        border: '2px solid #ef4444',
                        borderRadius: '12px',
                        padding: '24px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                    } }>
                        <div style={ { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' } }>
                            <div style={ {
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ef4444',
                                fontSize: '20px',
                                fontWeight: 'bold'
                            } }>!</div>
                            <div>
                                <h3 style={ { margin: 0, fontSize: '18px', color: '#ffffff' } }>
                                    { this.props.fallbackTitle || 'Error en la interfaz de Habbten' }
                                </h3>
                                <p style={ { margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' } }>
                                    Se ha producido un problema inesperado al renderizar el cliente.
                                </p>
                            </div>
                        </div>

                        <div style={ {
                            backgroundColor: '#020617',
                            border: '1px solid #1e293b',
                            borderRadius: '8px',
                            padding: '12px',
                            marginBottom: '16px',
                            maxHeight: '180px',
                            overflowY: 'auto'
                        } }>
                            <p style={ { margin: 0, color: '#f87171', fontSize: '12px', fontFamily: 'monospace', wordBreak: 'break-word' } }>
                                { this.state.error?.toString() }
                            </p>
                            { this.state.error?.stack && (
                                <pre style={ { margin: '8px 0 0', color: '#64748b', fontSize: '11px', whiteSpace: 'pre-wrap' } }>
                                    { this.state.error.stack }
                                </pre>
                            ) }
                        </div>

                        <div style={ { display: 'flex', gap: '10px', justifyContent: 'flex-end' } }>
                            <button
                                onClick={ () => this.setState({ hasError: false, error: null, errorInfo: null }) }
                                style={ {
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    border: '1px solid #475569',
                                    backgroundColor: '#1e293b',
                                    color: '#ffffff',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    fontSize: '13px'
                                } }
                            >
                                Reintentar
                            </button>
                            <button
                                onClick={ () => window.location.reload() }
                                style={ {
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    backgroundColor: '#ef4444',
                                    color: '#ffffff',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    fontSize: '13px'
                                } }
                            >
                                Recargar Cliente
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
