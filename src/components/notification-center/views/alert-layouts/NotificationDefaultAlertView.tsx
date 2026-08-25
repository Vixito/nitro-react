import React, { FC, useMemo, useState } from 'react';
import { LocalizeText, NotificationAlertItem, NotificationAlertType, OpenUrl } from '../../../../api';
import { Base, Button, Column, Flex, LayoutNotificationAlertView, LayoutNotificationAlertViewProps } from '../../../../common';

interface NotificationDefaultAlertViewProps extends LayoutNotificationAlertViewProps
{
    item: NotificationAlertItem;
}

export const NotificationDefaultAlertView: FC<NotificationDefaultAlertViewProps> = props =>
{
    const { item = null, title = ((props.item && props.item.title) || ''), onClose = null, ...rest } = props;
    const [ imageFailed, setImageFailed ] = useState<boolean>(false);
    const [ searchTerm, setSearchTerm ] = useState<string>('');
    const [ activeCategory, setActiveCategory ] = useState<string>('ALL');
    const [ customSize, setCustomSize ] = useState<{ width: number, height: number }>({ width: 620, height: 600 });

    const isCommandsList = useMemo(() => {
        return item && item.messages.some(msg => msg.includes('class="is-commands-list"') || msg.includes('cmd-category-block') || msg.includes('cmd-row'));
    }, [item]);

    // Extraer categorías dinámicamente de los mensajes
    const availableCategories = useMemo(() => {
        if (!isCommandsList || !item) return [];
        const cats: string[] = [];
        for (const msg of item.messages) {
            const matches = msg.matchAll(/data-category="([^"]+)"/g);
            for (const match of matches) {
                if (match[1] && !cats.includes(match[1])) cats.push(match[1]);
            }
        }
        return cats;
    }, [isCommandsList, item]);

    const filterCommands = (search: string, category: string) => {
        const query = search.toLowerCase();
        const blocks = document.querySelectorAll('.notification-text .cmd-category-block');
        
        if (blocks.length > 0) {
            blocks.forEach((block: HTMLElement) => {
                const blockCat = block.getAttribute('data-category');
                const catMatches = (category === 'ALL' || blockCat === category);
                
                if (!catMatches) {
                    block.style.display = 'none';
                    return;
                }
                
                const rows = block.querySelectorAll('tr.cmd-row');
                let visibleRows = 0;
                rows.forEach((row: HTMLElement) => {
                    if (!query || row.innerText.toLowerCase().includes(query)) {
                        row.style.display = '';
                        visibleRows++;
                    } else {
                        row.style.display = 'none';
                    }
                });
                
                block.style.display = (visibleRows > 0) ? '' : 'none';
            });
        } else {
            // Fallback para filas legacy
            const rows = document.querySelectorAll('.notification-text tr.cmd-row');
            rows.forEach((row: HTMLElement) => {
                if (!query || row.innerText.toLowerCase().includes(query)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearchTerm(val);
        filterCommands(val, activeCategory);
    };

    const handleCategoryClick = (cat: string) => {
        setActiveCategory(cat);
        filterCommands(searchTerm, cat);
    };

    const onResizeMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        const startW = customSize.width;
        const startH = customSize.height;

        const onMouseMove = (moveEv: MouseEvent) => {
            const nextW = Math.max(380, Math.min(window.innerWidth * 0.96, startW + (moveEv.clientX - startX)));
            const nextH = Math.max(320, Math.min(window.innerHeight * 0.94, startH + (moveEv.clientY - startY)));
            setCustomSize({ width: nextW, height: nextH });
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const visitUrl = () =>
    {
        OpenUrl(item.clickUrl);
        onClose();
    };
    
    const hasFrank = !isCommandsList && (item.alertType === NotificationAlertType.DEFAULT);

    return (
        <LayoutNotificationAlertView 
            title={ isCommandsList ? 'Lista de Comandos' : title } 
            onClose={ onClose } 
            { ...rest } 
            type={ isCommandsList ? 'custom-commands' : (hasFrank ? NotificationAlertType.DEFAULT : item.alertType) } 
            classNames={ isCommandsList ? ['commands-alert'] : [] }
            style={ isCommandsList ? { width: `${customSize.width}px`, height: `${customSize.height}px`, maxWidth: '96vw', maxHeight: '94vh' } : {} }
        >
            <Flex fullHeight overflow="hidden" className="w-100" gap={ hasFrank || (item.imageUrl && !imageFailed) ? 2 : 0 }>
                { hasFrank && !item.imageUrl && <Base className="notification-frank flex-shrink-0" /> }
                { item.imageUrl && !imageFailed && <img src={ item.imageUrl } alt={ item.title } onError={ () => setImageFailed(true) } className="align-self-baseline" /> }
                <Base classNames={ [ 'notification-text d-flex flex-column w-100 flex-grow-1 overflow-hidden', (item.clickUrl && !hasFrank && !item.imageUrl) ? 'justify-content-center' : 'justify-content-between' ] }>
                    { isCommandsList && (
                        <div className="d-flex flex-column gap-2 mb-2 flex-shrink-0">
                            <Flex fullWidth alignItems="center" gap={ 1 } className="bg-white rounded border" style={{ padding: '5px 10px' }}>
                                <i className="icon icon-zoom" style={{ transform: 'scale(0.85)' }}></i>
                                <input type="text" className="w-100 border-0" style={{ outline: 'none', background: 'transparent', color: '#0f172a', fontSize: '13px' }} placeholder="Buscar comando o descripción..." value={ searchTerm } onChange={ handleSearch } />
                                { searchTerm && (
                                    <button onClick={ () => { setSearchTerm(''); filterCommands('', activeCategory); } } className="border-0 bg-transparent text-muted cursor-pointer px-1">✕</button>
                                ) }
                            </Flex>
                            { availableCategories.length > 1 && (
                                <div className="d-flex flex-wrap gap-1" style={{ maxHeight: '65px', overflowY: 'auto' }}>
                                    <button 
                                        type="button"
                                        onClick={ () => handleCategoryClick('ALL') } 
                                        className={`btn btn-xs px-2 py-1 rounded text-nowrap ${ activeCategory === 'ALL' ? 'btn-primary' : 'btn-outline-secondary' }`}
                                        style={{ fontSize: '11px', fontWeight: activeCategory === 'ALL' ? 'bold' : 'normal' }}
                                    >
                                        Todas ({ availableCategories.length })
                                    </button>
                                    { availableCategories.map((cat, idx) => (
                                        <button 
                                            key={ idx } 
                                            type="button"
                                            onClick={ () => handleCategoryClick(cat) } 
                                            className={`btn btn-xs px-2 py-1 rounded text-nowrap ${ activeCategory === cat ? 'btn-primary' : 'btn-outline-secondary' }`}
                                            style={{ fontSize: '11px', fontWeight: activeCategory === cat ? 'bold' : 'normal' }}
                                        >
                                            { cat }
                                        </button>
                                    )) }
                                </div>
                            ) }
                        </div>
                    ) }
                    <div className="overflow-y-auto flex-grow-1 w-100" style={{ paddingRight: '6px' }}>
                        { (item.messages.length > 0) && item.messages.map((message, index) =>
                        {
                            const htmlText = message.replace(/\r\n|\r|\n/g, '<br />');
                            return <Base key={ index } dangerouslySetInnerHTML={ { __html: htmlText } } />;
                        }) }
                    </div>
                    { item.clickUrl && (item.clickUrl.length > 0) && (item.imageUrl && !imageFailed) && (
                        <div className="d-flex flex-column w-100 mt-auto pt-2 flex-shrink-0">
                            <Button onClick={ visitUrl } className="w-100 py-1">{ LocalizeText(item.clickUrlText) }</Button>
                        </div>
                    ) }
                </Base>
            </Flex>
            { (!item.imageUrl || (item.imageUrl && imageFailed)) && <>
                <Column alignItems="center" center gap={ 0 } className="mt-2 flex-shrink-0">
                    { !item.clickUrl &&
                        <Button onClick={ onClose } className="btn-sm px-4">{ LocalizeText('generic.close') }</Button> }
                    { item.clickUrl && (item.clickUrl.length > 0) && <Button onClick={ visitUrl }>{ LocalizeText(item.clickUrlText) }</Button> }
                </Column>
            </> }
            { isCommandsList && (
                <div 
                    onMouseDown={ onResizeMouseDown } 
                    title="Arrastra para cambiar el tamaño (ancho y alto)"
                    style={{ 
                        position: 'absolute', 
                        right: 2, 
                        bottom: 2, 
                        width: 18, 
                        height: 18, 
                        cursor: 'nwse-resize', 
                        zIndex: 9999, 
                        display: 'flex', 
                        alignItems: 'flex-end', 
                        justifyContent: 'flex-end', 
                        padding: 2,
                        opacity: 0.7 
                    }}
                >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M10 2L2 10M10 6L6 10M10 10L10 10" stroke="#334155" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                </div>
            ) }
        </LayoutNotificationAlertView>
    );
};
