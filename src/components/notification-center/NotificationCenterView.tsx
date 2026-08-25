import { FC, ReactNode, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { NotificationAlertType, NotificationBubbleType } from '../../api';
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

        for(const alert of alerts)
        {
            const element = GetAlertLayout(alert, () => closeAlert(alert));

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

        for(const confirm of confirms)
        {
            const element = GetConfirmLayout(confirm, () => closeConfirm(confirm));

            elements.push(element);
        }

        return elements;
    }, [ confirms, closeConfirm ]);

    const hasModal = useMemo(() =>
    {
        if (confirms && confirms.length > 0) return true;
        if (!alerts || !alerts.length) return false;

        return alerts.some(alert =>
        {
            if (alert.alertType === NotificationAlertType.MOTD || alert.alertType === NotificationAlertType.SEARCH) return false;
            if (alert.messages && alert.messages.some(msg => msg.includes('is-commands-list') || msg.includes('cmd-category-block') || msg.includes('cmd-row'))) return false;
            return true;
        });
    }, [ alerts, confirms ]);

    const hasActiveModals = Boolean((getConfirms && getConfirms.length > 0) || (getAlerts && getAlerts.length > 0));

    return (
        <>
            <Column gap={ 1 }>
                { getBubbleAlerts }
            </Column>
            { hasActiveModals ? createPortal(
                <div className="nitro-dialog-container">
                    { hasModal && <div className="nitro-alert-backdrop" /> }
                    <div className="nitro-dialog-wrapper">
                        { getConfirms }
                        { getAlerts }
                    </div>
                </div>,
                document.body
            ) : null }
        </>
    );
}
