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

    const reload = () =>
    {
        if (window.parent && window.parent !== window) {
            window.parent.location.reload();
        } else {
            window.location.reload();
        }
    };
    
    return (
        <div className={ `nitro-loading ${ isError ? 'is-error' : '' }` }>
            { isError ?
                <div className="nitro-alert-backdrop d-flex align-items-center justify-content-center">
                    <div className="disconnect-alert-wrap" style={{ width: 380, maxWidth: '90vw' }}>
                        <LayoutNotificationAlertView
                            title="Desconexión"
                            onClose={ reload }
                        >
                            <Column gap={ 2 } className="p-3 text-center">
                                <Text bold fontSize={ 4 } className="text-black mb-1">
                                    { message || 'Tu sesión ha finalizado o la conexión fue cerrada.' }
                                </Text>
                                <Button className="btn-reconnect-hotel w-100 fw-bold py-2 mt-2" onClick={ reload }>
                                    Reconectar al Hotel
                                </Button>
                            </Column>
                        </LayoutNotificationAlertView>
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
