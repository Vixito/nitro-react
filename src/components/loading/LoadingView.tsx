import { FC } from 'react';
import { Base, Button, Column, LayoutNotificationAlertView, LayoutProgressBar, Text } from '../../common';

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
                    <div className="nitro-card nitro-alert no-resize rounded shadow" data-skin-2012="illumina-light" style={{ width: 380, maxWidth: '90vw', position: 'relative', zIndex: 1000001, pointerEvents: 'auto' }}>
                        <div className="drag-handler container-fluid nitro-card-header d-flex align-items-center justify-content-center">
                            <div className="nitro-card-header-inner d-flex align-items-center justify-content-center w-100">
                                <span className="nitro-card-header-text">Desconexión</span>
                            </div>
                        </div>
                        <div className="nitro-card-content text-black p-3 text-center d-flex flex-column align-items-center justify-content-between">
                            <div className="fs-5 fw-bold text-black mb-3 text-center w-100">
                                { message || 'Tu sesión ha finalizado o la conexión fue cerrada.' }
                            </div>
                            <button
                                type="button"
                                className="btn w-100 fw-bold py-2 mt-2"
                                style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                                onClick={ reload }
                            >
                                Reconectar al Hotel
                            </button>
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
