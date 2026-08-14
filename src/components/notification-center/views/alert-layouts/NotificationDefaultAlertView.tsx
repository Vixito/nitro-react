import React, { FC, useState } from 'react';
import { LocalizeText, NotificationAlertItem, NotificationAlertType, OpenUrl } from '../../../../api';
import { Base, Button, Column, Flex, LayoutNotificationAlertView, LayoutNotificationAlertViewProps } from '../../../../common';

interface NotificationDefaultAlertViewProps extends LayoutNotificationAlertViewProps
{
    item: NotificationAlertItem;
}

export const NotificationDefaultAlertView: FC<NotificationDefaultAlertViewProps> = props =>
{
    const { item = null, title = ((props.item && props.item.title) || ''), onClose = null, ...rest } = props;
    const [ imageFailed, setImageFailed ] = useState<boolean>(false)
    const [ searchTerm, setSearchTerm ] = useState<string>('');

    const isCommandsList = React.useMemo(() => {
        return item && item.messages.some(msg => msg.includes('class="is-commands-list"'));
    }, [item]);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.toLowerCase();
        setSearchTerm(val);
        const rows = document.querySelectorAll('.notification-text tr.cmd-row');
        rows.forEach((row: HTMLElement) => {
            if (row.innerText.toLowerCase().includes(val)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
        
        const categories = document.querySelectorAll('.notification-text table.cmd-table');
        categories.forEach((table: HTMLElement) => {
            const hasVisibleRows = Array.from(table.querySelectorAll('tr.cmd-row')).some((tr: HTMLElement) => tr.style.display !== 'none');
            const catHeader = table.previousElementSibling as HTMLElement;
            if (catHeader && catHeader.tagName === 'B') {
                catHeader.style.display = hasVisibleRows ? '' : 'none';
                table.style.display = hasVisibleRows ? '' : 'none';
                
                // Hide the following <br/> tags too
                let next = table.nextElementSibling as HTMLElement;
                if (next && next.tagName === 'BR') next.style.display = hasVisibleRows ? '' : 'none';
            }
        });
    }

    const visitUrl = () =>
    {
        OpenUrl(item.clickUrl);
        
        onClose();
    }
    
    const hasFrank = (item.alertType === NotificationAlertType.DEFAULT);

    return (
        <LayoutNotificationAlertView title={ title } onClose={ onClose } { ...rest } type={ hasFrank ? NotificationAlertType.DEFAULT : item.alertType } classNames={ isCommandsList ? ['commands-alert'] : [] }>
            <Flex fullHeight overflow="auto" gap={ hasFrank || (item.imageUrl && !imageFailed) ? 2 : 0 }>
                { hasFrank && !item.imageUrl && <Base className="notification-frank flex-shrink-0" /> }
                { item.imageUrl && !imageFailed && <img src={ item.imageUrl } alt={ item.title } onError={ () => 
                {
                    setImageFailed(true) 
                } } className="align-self-baseline" /> }
                <Base classNames={ [ 'notification-text overflow-y-auto d-flex flex-column w-100', (item.clickUrl && !hasFrank) ? 'justify-content-center' : '' ] }>
                    { isCommandsList && (
                        <Flex fullWidth alignItems="center" gap={ 1 } className="mb-2 bg-white rounded border" style={{ padding: '4px 8px' }}>
                            <i className="icon icon-zoom" style={{ transform: 'scale(0.8)' }}></i>
                            <input type="text" className="w-100 border-0" style={{ outline: 'none', background: 'transparent', color: 'black' }} placeholder="Buscar comando..." value={ searchTerm } onChange={ handleSearch } />
                        </Flex>
                    ) }
                    { (item.messages.length > 0) && item.messages.map((message, index) =>
                    {
                        const htmlText = message.replace(/\r\n|\r|\n/g, '<br />');

                        return <Base key={ index } dangerouslySetInnerHTML={ { __html: htmlText } } />;
                    }) }
                    { item.clickUrl && (item.clickUrl.length > 0) && (item.imageUrl && !imageFailed) && <>
                        <hr className="my-2 w-100" />
                        <Button onClick={ visitUrl } className="align-self-center px-3">{ LocalizeText(item.clickUrlText) }</Button>
                    </> }
                </Base>
            </Flex>
            { (!item.imageUrl || (item.imageUrl && imageFailed)) && <>
                <Column alignItems="center" center gap={ 0 }>
                    <hr className="my-2 w-100" />
                    { !item.clickUrl &&
                        <Button onClick={ onClose }>{ LocalizeText('generic.close') }</Button> }
                    { item.clickUrl && (item.clickUrl.length > 0) && <Button onClick={ visitUrl }>{ LocalizeText(item.clickUrlText) }</Button> }
                </Column>
            </> }
        </LayoutNotificationAlertView>
    );

}
