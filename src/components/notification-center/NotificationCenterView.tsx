import { FC, ReactNode, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { NotificationAlertType, NotificationBubbleType } from '../../api';
import { Column } from '../../common';
import { useGameCenter, useNotification } from '../../hooks';
import { GetAlertLayout } from './views/alert-layouts/GetAlertLayout';
import { GetBubbleLayout } from './views/bubble-layouts/GetBubbleLayout';
import { GetConfirmLayout } from './views/confirm-layouts/GetConfirmLayout';

export const NotificationCenterView: FC<{}> = props =>
{
    const { alerts = [], bubbleAlerts = [], confirms = [], closeAlert = null, closeBubbleAlert = null, closeConfirm = null } = useNotification();
    const { isVisible: isGameCenterVisible } = useGameCenter();
    const [ overlayTop, setOverlayTop ] = useState<number | null>(null);

    useEffect(() =>
    {
        if (!isGameCenterVisible || typeof document === 'undefined')
        {
            setOverlayTop(null);
            return;
        }

        const measure = () =>
        {
            const isMobile = document.body.classList.contains('is-mobile-ui');
            const selectors = isMobile
                ? [ '.mobile-hud-top-right', '.nitro-purse-container' ]
                : [ '.nitro-purse-container', '.habbo-purse-2012', '.purse-container' ];

            let maxBottom = 0;
            for (const sel of selectors)
            {
                const el = document.querySelector(sel) as HTMLElement | null;
                if (!el) continue;
                const style = window.getComputedStyle(el);
                if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0 && rect.bottom > maxBottom)
                {
                    maxBottom = rect.bottom;
                }
            }

            if (maxBottom > 0)
            {
                setOverlayTop(Math.ceil(maxBottom + 8));
            }
            else
            {
                setOverlayTop(isMobile ? 58 : 118);
            }
        };

        measure();
        const timer = window.setTimeout(measure, 120);
        window.addEventListener('resize', measure);

        return () =>
        {
            window.clearTimeout(timer);
            window.removeEventListener('resize', measure);
        };
    }, [ isGameCenterVisible, bubbleAlerts.length ]);

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

    const container = typeof document !== 'undefined' ? (document.getElementById('draggable-windows-container') || document.body) : null;

    const bubbleLayer = (
        <Column gap={ 1 }>
            { getBubbleAlerts }
        </Column>
    );

    return (
        <>
            { (hasModal && container) && createPortal(
                <div className="nitro-alert-backdrop" />,
                container
            ) }
            { (isGameCenterVisible && typeof document !== 'undefined')
                ? createPortal(
                    <div
                        className="nitro-notification-bubbles-overlay"
                        style={ overlayTop !== null ? { top: `${ overlayTop }px` } : undefined }
                    >
                        { bubbleLayer }
                    </div>,
                    document.body
                )
                : bubbleLayer }
            { getConfirms }
            { getAlerts }
        </>
    );
}
