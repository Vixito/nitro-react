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
    
    return (
        <div className={ `nitro-loading ${ isError ? 'is-error' : '' }` }>
            { isError ?
                <div className="disconnect-backdrop">
                    <div className="disconnect-modal-card">
                        <div className="disconnect-modal-header">
                            <span className="disconnect-header-title">¡Conexión perdida!</span>
                        </div>
                        <div className="disconnect-modal-body">
                            <div className="disconnect-icon-frank" />
                            <div className="disconnect-info-text">
                                <span className="disconnect-main-message">{ message || 'Tu sesión ha finalizado o la conexión fue cerrada.' }</span>
                                <span className="disconnect-sub-message">Has sido desconectado de Habbo Hotel. Haz clic abajo para volver a entrar.</span>
                            </div>
                        </div>
                        <div className="disconnect-modal-footer">
                            <button
                                type="button"
                                className="disconnect-reconnect-btn"
                                onClick={ () => {
                                    if (window.parent && window.parent !== window) {
                                        window.parent.location.reload();
                                    } else {
                                        window.location.reload();
                                    }
                                } }
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
