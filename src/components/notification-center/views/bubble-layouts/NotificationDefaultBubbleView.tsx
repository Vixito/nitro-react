import { FC } from 'react';
import defaultSecurityIcon from '../../../../assets/images/eras/shockwave_v14/security_badge.png';
import { CreateLinkEvent, NotificationBubbleItem, OpenUrl } from '../../../../api';
import { LayoutNotificationBubbleView, LayoutNotificationBubbleViewProps } from '../../../../common';

export interface NotificationDefaultBubbleViewProps extends LayoutNotificationBubbleViewProps
{
    item: NotificationBubbleItem;
}

export const NotificationDefaultBubbleView: FC<NotificationDefaultBubbleViewProps> = props =>
{
    const { item = null, onClose = null, classNames = [], ...rest } = props;
    
    const htmlText = item.message.replace(/\r\n|\r|\n/g, '<br />');
    const iconSrc = (item.iconUrl && item.iconUrl.length) ? item.iconUrl : defaultSecurityIcon;
    const titleText = item.title || (item.message.toLowerCase().includes('seguridad') || item.message.toLowerCase().includes('conversaciones') ? 'Aviso de Seguridad' : null);

    const isCurrencyOrReward = Boolean(
        (titleText && /(diamante|crédito|ducket|reward|premio|moneda|gift)/i.test(titleText)) ||
        (item.message && /(diamante|crédito|ducket|recibido.*diamante|recibido.*crédito)/i.test(item.message)) ||
        (item.iconUrl && /(diamond|credit|ducket|badge|currency)/i.test(item.iconUrl))
    );

    const isEvent = !isCurrencyOrReward && Boolean(
        (titleText && /(event|evento)/i.test(titleText)) ||
        (item.notificationType && /(event|evento)/i.test(item.notificationType)) ||
        (item.message && /(event|evento)/i.test(item.message))
    );

    const finalClassNames = [
        ...classNames,
        isEvent ? 'bubble-event-alert' : 'bubble-default-alert'
    ];

    const handleNavigate = (event: React.MouseEvent) =>
    {
        event.stopPropagation();
        if(item.linkUrl && item.linkUrl.length)
        {
            const link = item.linkUrl.trim();
            if(link.startsWith('http://') || link.startsWith('https://'))
            {
                OpenUrl(link);
            }
            else if(link.startsWith('event:'))
            {
                CreateLinkEvent(link.substring(6));
            }
            else if(!isNaN(Number(link)))
            {
                CreateLinkEvent(`navigator/goto/${ link }`);
            }
            else
            {
                CreateLinkEvent(link);
            }
        }
        else if(onClose)
        {
            onClose();
        }
    };

    const handleBubbleClick = (event: React.MouseEvent) =>
    {
        if(item.linkUrl && item.linkUrl.length)
        {
            handleNavigate(event);
        }
        else if(onClose)
        {
            onClose();
        }
    };

    return (
        <LayoutNotificationBubbleView onClose={ onClose } gap={ 2 } alignItems="stretch" classNames={ finalClassNames } onClick={ handleBubbleClick } { ...rest }>
            <div className="bubble-image-container">
                <img className="no-select bubble-icon" src={ iconSrc } alt="" />
            </div>
            <div className="bubble-content">
                { titleText && <div className="bubble-title">{ titleText }</div> }
                <div className="bubble-text" dangerouslySetInnerHTML={ { __html: htmlText } } />
                { (item.linkUrl && item.linkUrl.length > 0) && (
                    <div className="bubble-action-btn-row">
                        <div className="bubble-action-btn" onClick={ handleNavigate }>
                            Ir ▶
                        </div>
                    </div>
                ) }
            </div>
            <div className="bubble-close-btn" title="Cerrar" onClick={ event => { event.stopPropagation(); onClose(); } }>
                ✕
            </div>
        </LayoutNotificationBubbleView>
    );
}
