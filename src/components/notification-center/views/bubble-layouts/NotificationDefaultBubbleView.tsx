import { FC } from 'react';
import defaultSecurityIcon from '../../../../assets/images/eras/shockwave_v14/security_badge.png';
import { NotificationBubbleItem, OpenUrl } from '../../../../api';
import { LayoutNotificationBubbleView, LayoutNotificationBubbleViewProps } from '../../../../common';

export interface NotificationDefaultBubbleViewProps extends LayoutNotificationBubbleViewProps
{
    item: NotificationBubbleItem;
}

export const NotificationDefaultBubbleView: FC<NotificationDefaultBubbleViewProps> = props =>
{
    const { item = null, onClose = null, ...rest } = props;
    
    const htmlText = item.message.replace(/\r\n|\r|\n/g, '<br />');
    const iconSrc = (item.iconUrl && item.iconUrl.length) ? item.iconUrl : defaultSecurityIcon;
    const titleText = item.title || (item.message.toLowerCase().includes('seguridad') || item.message.toLowerCase().includes('conversaciones') ? 'Aviso de Seguridad' : null);

    const handleBubbleClick = (event: React.MouseEvent) =>
    {
        if(item.linkUrl && item.linkUrl.length)
        {
            OpenUrl(item.linkUrl);
        }
        else if(onClose)
        {
            onClose();
        }
    };

    return (
        <LayoutNotificationBubbleView onClose={ onClose } gap={ 2 } alignItems="start" onClick={ handleBubbleClick } { ...rest }>
            <div className="bubble-image-container">
                <img className="no-select bubble-icon" src={ iconSrc } alt="" />
            </div>
            <div className="bubble-content">
                { titleText && <div className="bubble-title">{ titleText }</div> }
                <div className="bubble-text" dangerouslySetInnerHTML={ { __html: htmlText } } />
                { (item.linkUrl && item.linkUrl.length > 0) && (
                    <div className="bubble-action-btn-row">
                        <div className="bubble-action-btn">
                            Go ▶
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
