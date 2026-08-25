import { FC, ReactNode, useMemo } from 'react';
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

    return (
        <>
            { hasModal && <div className="nitro-alert-backdrop" onClick={ () => {
                if (confirms && confirms.length > 0) closeConfirm(confirms[confirms.length - 1]);
                else if (alerts && alerts.length > 0) {
                    const modalAlert = [ ...alerts ].reverse().find(a => a.alertType !== NotificationAlertType.MOTD && a.alertType !== NotificationAlertType.SEARCH && !a.messages?.some(m => m.includes('cmd-category-block') || m.includes('cmd-row')));
                    if (modalAlert) closeAlert(modalAlert);
                }
            } } /> }
            <Column gap={ 1 }>
                { getBubbleAlerts }
            </Column>
            { getConfirms }
            { getAlerts }
        </>
    );
}
