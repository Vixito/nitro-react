import { FC } from 'react';
import { Base, Column, LayoutProgressBar, Text } from '../../common';

interface LoadingViewProps
{
    isError: boolean;
    message: string;
    percent: number;
}

export const LoadingView: FC<LoadingViewProps> = props =>
{
    const { isError = false, message = '', percent = 0 } = props;

    const reload = (event?: any) =>
    {
        if(event)
        {
            event.preventDefault();
            event.stopPropagation();
        }

        if (window.parent && window.parent !== window) {
            window.parent.location.reload();
        } else {
            window.location.reload();
        }
    };
    
    return (
        <div className={ `nitro-loading ${ isError ? 'is-error' : '' }` }>
            { isError ?
                <div className="nitro-alert-backdrop d-flex align-items-center justify-content-center" onClick={ (e) => e.stopPropagation() }>
                    <div className="nitro-card nitro-alert nitro-disconnect-card no-resize rounded shadow" data-skin-2012="illumina-light" style={{ width: 380, maxWidth: '90vw', position: 'relative', zIndex: 1000001, pointerEvents: 'auto' }}>
                        <div className="drag-handler container-fluid nitro-card-header d-flex align-items-center justify-content-center">
                            <div className="nitro-card-header-inner d-flex align-items-center justify-content-center w-100">
                                <span className="disconnect-status-dot" aria-hidden="true" />
                                <span className="nitro-card-header-text">Desconexión</span>
                            </div>
                        </div>
                        <div className="nitro-card-content text-black p-3 text-center d-flex flex-column align-items-center justify-content-between">
                            <div className="disconnect-body-row w-100">
                                <div className="disconnect-frank-box" aria-hidden="true">
                                    <div className="disconnect-frank-sprite" />
                                    <span className="disconnect-offline-badge">
                                        <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                                            <path d="M2 2L14 14M6.5 6.5L4.5 8.5C3.4 9.6 3.4 11.4 4.5 12.5C5.6 13.6 7.4 13.6 8.5 12.5L9.5 11.5M9.5 9.5L11.5 7.5C12.6 6.4 12.6 4.6 11.5 3.5C10.4 2.4 8.6 2.4 7.5 3.5L6.5 4.5" stroke="#f87171" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </span>
                                </div>
                                <div className="disconnect-copy">
                                    <span className="disconnect-eyebrow">Conexión interrumpida</span>
                                    <div className="fs-5 fw-bold text-black mb-3 text-center w-100 disconnect-message">
                                        { message || 'Tu sesión ha finalizado o la conexión fue cerrada.' }
                                    </div>
                                    <div className="disconnect-hint">
                                        Vuelve a conectarte para regresar al hotel al instante.
                                    </div>
                                </div>
                            </div>
                            <div className="disconnect-actions w-100">
                                <button
                                    type="button"
                                    className="btn nitro-reconnect-btn w-100 fw-bold py-2 mt-2"
                                    style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                                    onClick={ reload }
                                >
                                    <svg className="disconnect-btn-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                        <path d="M21 12a9 9 0 1 1-2.64-6.36" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                                        <path d="M21 3v6h-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    <span>Reconectar al Hotel</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                :
                <Column fullHeight className="container h-100">
                    <Column fullHeight alignItems="center" justifyContent="end">
                        <Base className="connecting-duck" />
                        <Column size={ 6 } className="text-center py-4">
                            <Text fontSize={ 4 } variant="white" className="text-shadow">{ percent.toFixed() }%</Text>
                            <LayoutProgressBar progress={ percent } className="mt-2 large" />
                        </Column>
                    </Column>
                </Column>
            }
        </div>
    );
}
