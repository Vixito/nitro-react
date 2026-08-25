import { FC, ReactNode, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { NotificationBubbleType } from '../../api';
import { Column } from '../../common';
import { useNotification } from '../../hooks';
import { GetAlertLayout } from './views/alert-layouts/GetAlertLayout';
import { GetBubbleLayout } from './views/bubble-layouts/GetBubbleLayout';
import { GetConfirmLayout } from './views/confirm-layouts/GetConfirmLayout';

export const NotificationCenterView: FC<{}> = props =>
{
    const { alerts = [], bubbleAlerts = [], confirms = [], closeAlert = null, closeBubbleAlert = null, closeConfirm = null } = useNotification();

    const getAlerts = useMemo(() =>
    {
        if(!alerts || !alerts.length) return null;

        const elements: ReactNode[] = [];

        for(let i = 0; i < alerts.length; i++)
        {
            const alert = alerts[i];
            const element = (
                <div key={ `alert-${i}` } className="nitro-dialog-item" style={{ zIndex: 10002 + i }}>
                    { GetAlertLayout(alert, () => closeAlert(alert)) }
                </div>
            );

            elements.push(element);
        }

        return elements;
    }, [ alerts, closeAlert ]);

    const getBubbleAlerts = useMemo(() =>
    {
        if(!bubbleAlerts || !bubbleAlerts.length) return null;

        const elements: ReactNode[] = [];

        for(const alert of bubbleAlerts)
        {
            const element = GetBubbleLayout(alert, () => closeBubbleAlert(alert));

            if(alert.notificationType === NotificationBubbleType.CLUBGIFT)
            {
                elements.unshift(element);

                continue;
            }

            elements.push(element);
        }

        return elements;
    }, [ bubbleAlerts, closeBubbleAlert ]);

    const getConfirms = useMemo(() =>
    {
        if(!confirms || !confirms.length) return null;

        const elements: ReactNode[] = [];

        for(let i = 0; i < confirms.length; i++)
        {
            const confirm = confirms[i];
            const element = (
                <div key={ `confirm-${i}` } className="nitro-dialog-item" style={{ zIndex: 10010 + i }}>
                    { GetConfirmLayout(confirm, () => closeConfirm(confirm)) }
                </div>
            );

            elements.push(element);
        }

        return elements;
    }, [ confirms, closeConfirm ]);

    const hasModal = useMemo(() =>
    {
        return Boolean((confirms && confirms.length > 0) || (alerts && alerts.length > 0));
    }, [ alerts, confirms ]);

    // Dismiss topmost modal when clicking on the backdrop
    const handleBackdropClick = useCallback((e: React.MouseEvent) =>
    {
        e.preventDefault();
        e.stopPropagation();
        
        if (confirms && confirms.length > 0)
        {
            closeConfirm(confirms[confirms.length - 1]);
            return;
        }
        
        if (alerts && alerts.length > 0)
        {
            closeAlert(alerts[alerts.length - 1]);
            return;
        }
    }, [ alerts, confirms, closeAlert, closeConfirm ]);

    // Dismiss on Escape key
    useEffect(() =>
    {
        if (!hasModal) return;

        const handleKeyDown = (e: KeyboardEvent) =>
        {
            if (e.key === 'Escape')
            {
                if (confirms && confirms.length > 0)
                {
                    closeConfirm(confirms[confirms.length - 1]);
                }
                else if (alerts && alerts.length > 0)
                {
                    closeAlert(alerts[alerts.length - 1]);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [ hasModal, alerts, confirms, closeAlert, closeConfirm ]);

    return (
        <>
            <Column gap={ 1 }>
                { getBubbleAlerts }
            </Column>
            { hasModal ? createPortal(
                <div className="nitro-dialog-container">
                    <div className="nitro-alert-backdrop" onClick={ handleBackdropClick } title="Haz clic para cerrar" />
                    <div className="nitro-dialog-wrapper">
                        { getAlerts }
                        { getConfirms }
                    </div>
                </div>,
                document.body
            ) : null }
        </>
    );
}
