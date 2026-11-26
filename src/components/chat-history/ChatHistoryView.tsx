import { ILinkEventTracker, RoomObjectType } from '@nitrots/nitro-renderer';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { AddEventLinkTracker, ChatEntryType, LocalizeText, RemoveLinkEventTracker } from '../../api';
import { Flex, InfiniteScroll, NitroCardContentView, NitroCardHeaderView, NitroCardView, Text } from '../../common';
import { useChatHistory, useEraTheme } from '../../hooks';
import rtBtnHistory from '../../assets/images/eras/flash2012/roomtools/btn_history.png';

export const ChatHistoryView: FC<{}> = props =>
{
    const { currentEra } = useEraTheme();
    const [ isVisible, setIsVisible ] = useState(false);
    const [ searchText, setSearchText ] = useState<string>('');
    const [ selectedUser, setSelectedUser ] = useState<string>('');
    const { chatHistory = [] } = useChatHistory();
    const elementRef = useRef<HTMLDivElement>(null);

    const uniqueUsers = useMemo(() =>
    {
        const set = new Set<string>();
        for(const entry of chatHistory)
        {
            if(entry.type === ChatEntryType.TYPE_CHAT && entry.name)
            {
                set.add(entry.name);
            }
        }
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [ chatHistory ]);

    const filteredChatHistory = useMemo(() => 
    {
        const text = searchText.trim().toLowerCase();

        return chatHistory.filter(entry =>
        {
            if(selectedUser && entry.type === ChatEntryType.TYPE_CHAT && entry.name !== selectedUser) return false;
            if(selectedUser && entry.type !== ChatEntryType.TYPE_CHAT) return false;
            if(!text.length) return true;
            return ((entry.message && entry.message.toLowerCase().includes(text)) || (entry.name && entry.name.toLowerCase().includes(text)));
        });
    }, [ chatHistory, searchText, selectedUser ]);

    useEffect(() =>
    {
        if(elementRef && elementRef.current && isVisible)
        {
            elementRef.current.scrollTop = elementRef.current.scrollHeight;
        }
    }, [ isVisible, filteredChatHistory.length ]);

    useEffect(() =>
    {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) =>
            {
                const parts = url.split('/');
        
                if(parts.length < 2) return;
        
                switch(parts[1])
                {
                    case 'show':
                        setIsVisible(true);
                        return;
                    case 'hide':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setIsVisible(prevValue => !prevValue);
                        return;
                }
            },
            eventUrlPrefix: 'chat-history/'
        };

        AddEventLinkTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    if(!isVisible) return null;

    if(currentEra === 'flash2012')
    {
        return (
            <div className="chat-history-2012-drawer">
                <div ref={ elementRef } className="chat-history-2012-list">
                    { filteredChatHistory.map((row, idx) => (
                        <div key={ `${ row.id }-${ idx }` } className="chat-history-2012-row">
                            <span className="ch2012-time">{ row.timestamp }</span>
                            { (row.type === ChatEntryType.TYPE_ROOM_INFO) ? (
                                <span className="ch2012-room">
                                    <img src={ rtBtnHistory } alt="" className="ch2012-room-ico" />
                                    <span className="ch2012-room-name">{ row.name }</span>
                                </span>
                            ) : (
                                <span className="ch2012-chat">
                                    <b className="ch2012-user" dangerouslySetInnerHTML={ { __html: `${ row.name }: ` } } />
                                    <span className="ch2012-msg" dangerouslySetInnerHTML={ { __html: row.message } } />
                                </span>
                            ) }
                        </div>
                    )) }
                </div>
                <div className="chat-history-2012-footer">
                    <input
                        type="text"
                        className="ch2012-search"
                        placeholder="Buscar palabra o usuario"
                        value={ searchText }
                        onChange={ e => setSearchText(e.target.value) }
                    />
                    <select
                        className="ch2012-user-select"
                        value={ selectedUser }
                        onChange={ e => setSelectedUser(e.target.value) }
                    >
                        <option value="">Todos los usuarios</option>
                        { uniqueUsers.map(u => <option key={ u } value={ u }>{ u }</option>) }
                    </select>
                </div>
                <button
                    type="button"
                    className="chat-history-2012-handle"
                    title="Ocultar historial del chat"
                    onClick={ () => setIsVisible(false) }
                >
                    ‹
                </button>
            </div>
        );
    }

    const headerTitle = LocalizeText('room.chathistory.button.text');
    const displayTitle = (headerTitle && headerTitle !== 'room.chathistory.button.text') ? headerTitle : 'Historial de Chat';

    return (
        <NitroCardView uniqueKey="chat-history" className="nitro-chat-history" theme="primary-slim">
            <NitroCardHeaderView headerText={ displayTitle } onCloseClick={ event => setIsVisible(false) }/>
            <NitroCardContentView innerRef={ elementRef } overflow="hidden" gap={ 2 }>
                <input type="text" className="form-control form-control-sm" placeholder={ LocalizeText('generic.search') || 'Buscar...' } value={ searchText } onChange={ event => setSearchText(event.target.value) } />
                <InfiniteScroll rows={ filteredChatHistory } scrollToBottom={ true } rowRender={ row =>
                {
                    return (
                        <Flex alignItems="center" className="p-1" gap={ 2 }>
                            <Text variant="muted">{ row.timestamp }</Text>
                            { (row.type === ChatEntryType.TYPE_CHAT) &&
                                <div className="bubble-container" style={ { position: 'relative' } }>
                                    { (row.style === 0) &&
                                    <div className="user-container-bg" style={ { backgroundColor: row.color } } /> }
                                    <div className={ `chat-bubble bubble-${ row.style } type-${ row.chatType }` } style={ { maxWidth: '100%' } }>
                                        <div className={ `user-container ${ (row.entityType === RoomObjectType.PET) ? 'is-pet' : '' }` }>
                                            { row.imageUrl && (row.imageUrl.length > 0) &&
                                                <div className={ `user-image ${ (row.entityType === RoomObjectType.PET) ? 'pet-image' : '' }` } style={ { backgroundImage: `url(${ row.imageUrl })` } } /> }
                                        </div>
                                        <div className="chat-content">
                                            <b className="username mr-1" dangerouslySetInnerHTML={ { __html: `${ row.name }: ` } } />
                                            <span className="message" dangerouslySetInnerHTML={ { __html: `${ row.message }` } } />
                                        </div>
                                    </div>
                                </div> }
                            { (row.type === ChatEntryType.TYPE_ROOM_INFO) &&
                                <>
                                    <i className="icon icon-small-room" />
                                    <Text textBreak wrap grow>{ row.name }</Text>
                                </> }
                        </Flex>
                    )
                } } />
            </NitroCardContentView>
        </NitroCardView>
    );
}
