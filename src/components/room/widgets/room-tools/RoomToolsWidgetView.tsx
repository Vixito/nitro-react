import { GetGuestRoomResultEvent, NavigatorSearchComposer, RateFlatMessageComposer, RoomEngineEvent } from '@nitrots/nitro-renderer';
import { FC, useEffect, useState } from 'react';
import { CreateLinkEvent, GetRoomEngine, GetSessionDataManager, LocalizeText, SendMessageComposer, TryVisitRoom } from '../../../../api';
import { Base, classNames, Column, Flex, Text, TransitionAnimation, TransitionAnimationTypes } from '../../../../common';
import { useEraTheme, useMessageEvent, useNavigator, useRoom, useRoomEngineEvent } from '../../../../hooks';
import { useIsMobile } from '../../../../hooks/mobile/useIsMobile';
import rtIconSettings from '../../../../assets/images/eras/flash2012/roomtools/icon_settings.png';
import rtIconZoom from '../../../../assets/images/eras/flash2012/roomtools/icon_zoom.png';
import rtIconChatHistory from '../../../../assets/images/eras/flash2012/roomtools/icon_chathistory.png';
import rtIconLike from '../../../../assets/images/eras/flash2012/roomtools/icon_like.png';
import rtIconLink from '../../../../assets/images/eras/flash2012/roomtools/icon_link.png';
import rtBtnBack from '../../../../assets/images/eras/flash2012/roomtools/btn_back.png';
import rtBtnHistory from '../../../../assets/images/eras/flash2012/roomtools/btn_history.png';
import rtBtnForward from '../../../../assets/images/eras/flash2012/roomtools/btn_forward.png';
import rtBtnChat from '../../../../assets/images/eras/flash2012/roomtools/btn_chat.png';

interface RoomHistoryEntry
{
    id: number;
    name: string;
}

// Module-level room history so visited rooms survive RoomView unmounts/remounts between rooms
let sharedRoomHistory: RoomHistoryEntry[] = [];
let sharedHistoryIdx = -1;

export const RoomToolsWidgetView: FC<{}> = props =>
{
    const isMobile = useIsMobile();
    const { currentEra } = useEraTheme();
    const [ isZoomedIn, setIsZoomedIn ] = useState<boolean>(false);
    const [ roomName, setRoomName ] = useState<string>(null);
    const [ roomOwner, setRoomOwner ] = useState<string>(null);
    const [ roomTags, setRoomTags ] = useState<string[]>(null);
    const [ isOpen, setIsOpen ] = useState<boolean>(false);
    const [ isCollapsed2012, setIsCollapsed2012 ] = useState<boolean>(false);
    const [ showHistoryMenu, setShowHistoryMenu ] = useState<boolean>(false);
    const [ roomHistory, setRoomHistory ] = useState<RoomHistoryEntry[]>(() => [ ...sharedRoomHistory ]);
    const [ historyIdx, setHistoryIdx ] = useState<number>(() => sharedHistoryIdx);
    const { navigatorData = null } = useNavigator();
    const { roomSession = null } = useRoom();

    const isOwner = (roomOwner && GetSessionDataManager().userName && roomOwner.toLowerCase() === GetSessionDataManager().userName.toLowerCase()) || (roomSession && roomSession.isRoomOwner);
    const canLike = Boolean(navigatorData?.canRate && !isOwner);

    useEffect(() =>
    {
        if(!roomSession) return;

        const currentScale = GetRoomEngine().getRoomInstanceRenderingCanvasScale(roomSession.roomId, 1);
        setIsZoomedIn(currentScale < 1);
        setShowHistoryMenu(false);

        const rid = roomSession.roomId;
        if(rid > 0)
        {
            const knownName = (navigatorData?.enteredGuestRoom?.roomId === rid && navigatorData.enteredGuestRoom.roomName)
                ? navigatorData.enteredGuestRoom.roomName
                : (sharedRoomHistory.find(e => e.id === rid)?.name || `Sala #${ rid }`);

            if(sharedHistoryIdx >= 0 && sharedRoomHistory[sharedHistoryIdx]?.id === rid)
            {
                if(knownName && !knownName.startsWith('Sala #'))
                {
                    sharedRoomHistory = sharedRoomHistory.map(item => item.id === rid ? { ...item, name: knownName } : item);
                }
            }
            else
            {
                const base = sharedHistoryIdx >= 0 ? sharedRoomHistory.slice(0, sharedHistoryIdx + 1) : [];
                sharedRoomHistory = [ ...base, { id: rid, name: knownName } ].slice(-20);
                sharedHistoryIdx = sharedRoomHistory.length - 1;
            }

            setRoomHistory([ ...sharedRoomHistory ]);
            setHistoryIdx(sharedHistoryIdx);
        }
    }, [ roomSession ]);

    // Keep room names synced in shared history whenever navigatorData loads enteredGuestRoom
    useEffect(() =>
    {
        const entered = navigatorData?.enteredGuestRoom;
        if(!entered || !entered.roomId || !entered.roomName) return;

        let changed = false;
        sharedRoomHistory = sharedRoomHistory.map(item =>
        {
            if(item.id === entered.roomId && item.name !== entered.roomName)
            {
                changed = true;
                return { ...item, name: entered.roomName };
            }
            return item;
        });

        if(changed) setRoomHistory([ ...sharedRoomHistory ]);
    }, [ navigatorData?.enteredGuestRoom?.roomId, navigatorData?.enteredGuestRoom?.roomName ]);

    useRoomEngineEvent<RoomEngineEvent>(RoomEngineEvent.ROOM_ZOOMED, event =>
    {
        if(!roomSession || (event.roomId !== roomSession.roomId)) return;

        const currentScale = GetRoomEngine().getRoomInstanceRenderingCanvasScale(roomSession.roomId, 1);
        setIsZoomedIn(currentScale < 1);
    });

    const handleToolClick = (action: string, value?: string) =>
    {
        switch(action)
        {
            case 'settings':
                CreateLinkEvent('navigator/toggle-room-info');
                return;
            case 'zoom': {
                const currentScale = GetRoomEngine().getRoomInstanceRenderingCanvasScale(roomSession.roomId, 1);
                const targetScale = (currentScale < 1) ? 1 : 0.5;

                GetRoomEngine().setRoomInstanceRenderingCanvasScale(roomSession.roomId, 1, targetScale);
                setIsZoomedIn(targetScale < 1);
                return;
            }
            case 'chat_history':
                CreateLinkEvent('chat-history/toggle');
                return;
            case 'like_room':
                if(isOwner) return;
                SendMessageComposer(new RateFlatMessageComposer(1));
                return;
            case 'toggle_room_link':
                CreateLinkEvent('navigator/toggle-room-link');
                return;
            case 'navigator_search_tag':
                CreateLinkEvent(`navigator/search/${ value }`);
                SendMessageComposer(new NavigatorSearchComposer('hotel_view', `tag:${ value }`));
                return;
        }
    }

    useMessageEvent<GetGuestRoomResultEvent>(GetGuestRoomResultEvent, event =>
    {
        const parser = event.getParser();

        if(!parser.roomEnter || (parser.data.roomId !== roomSession.roomId)) return;

        if(roomName !== parser.data.roomName) setRoomName(parser.data.roomName);
        if(roomOwner !== parser.data.ownerName) setRoomOwner(parser.data.ownerName);
        if(roomTags !== parser.data.tags) setRoomTags(parser.data.tags);
        if(parser.data.roomId > 0 && parser.data.roomName)
        {
            sharedRoomHistory = sharedRoomHistory.map(item => item.id === parser.data.roomId ? { ...item, name: parser.data.roomName } : item);
            setRoomHistory([ ...sharedRoomHistory ]);
        }
    });

    useEffect(() =>
    {
        setIsOpen(true);

        const timeout = setTimeout(() => setIsOpen(false), 5000);

        return () => clearTimeout(timeout);
    }, [ roomName, roomOwner, roomTags ]);

    if(isMobile) return null;

    if(currentEra === 'flash2012')
    {
        const canGoBack = historyIdx > 0;
        const canGoForward = historyIdx >= 0 && historyIdx < roomHistory.length - 1;

        const goHistory = (dir: -1 | 1) =>
        {
            const targetIdx = sharedHistoryIdx + dir;
            if(targetIdx < 0 || targetIdx >= sharedRoomHistory.length) return;
            sharedHistoryIdx = targetIdx;
            setHistoryIdx(targetIdx);
            setShowHistoryMenu(false);
            TryVisitRoom(sharedRoomHistory[targetIdx].id);
        };

        return (
            <div className="nitro-room-tools-container room-tools-2012-root">
                <div className={ `room-tools-2012-panel ${ isCollapsed2012 ? 'is-collapsed' : '' }` }>
                    <button
                        type="button"
                        className="room-tools-2012-handle"
                        title={ isCollapsed2012 ? 'Mostrar herramientas de sala' : 'Ocultar herramientas de sala' }
                        onClick={ () => { setIsCollapsed2012(prev => !prev); setShowHistoryMenu(false); } }
                    >
                        <span>{ isCollapsed2012 ? '›' : '‹' }</span>
                    </button>

                    <div className="room-tools-2012-body-wrap">
                        <div className="room-tools-2012-body">
                            <button type="button" className="room-tools-2012-row" onClick={ () => handleToolClick('settings') }>
                                <span className="rt2012-ico"><img src={ rtIconSettings } alt="" /></span>
                                <span className="rt2012-lbl">Ajustes</span>
                            </button>
                            <button type="button" className="room-tools-2012-row" onClick={ () => handleToolClick('zoom') }>
                                <span className="rt2012-ico"><img src={ rtIconZoom } alt="" /></span>
                                <span className="rt2012-lbl">Zoom</span>
                            </button>
                            <button type="button" className="room-tools-2012-row" onClick={ () => handleToolClick('chat_history') }>
                                <span className="rt2012-ico"><img src={ rtIconChatHistory } alt="" /></span>
                                <span className="rt2012-lbl">Historial del chat</span>
                            </button>
                            <button
                                type="button"
                                className={ `room-tools-2012-row ${ !canLike ? 'is-disabled' : '' }` }
                                disabled={ !canLike }
                                onClick={ () => handleToolClick('like_room') }
                            >
                                <span className="rt2012-ico"><img src={ rtIconLike } alt="" /></span>
                                <span className="rt2012-lbl">Me gusta</span>
                            </button>
                            <button type="button" className="room-tools-2012-row" onClick={ () => handleToolClick('toggle_room_link') }>
                                <span className="rt2012-ico"><img src={ rtIconLink } alt="" /></span>
                                <span className="rt2012-lbl">Link a esta Sala</span>
                            </button>

                            <div className="room-tools-2012-actions">
                                <button
                                    type="button"
                                    className={ `rt2012-sq-btn ${ !canGoBack ? 'is-dim' : '' }` }
                                    disabled={ !canGoBack }
                                    title="Sala anterior"
                                    onClick={ () => goHistory(-1) }
                                >
                                    <img src={ rtBtnBack } alt="Anterior" />
                                </button>
                                <button
                                    type="button"
                                    className="rt2012-sq-btn"
                                    title="Historial de salas visitadas"
                                    onClick={ () => setShowHistoryMenu(prev => !prev) }
                                >
                                    <img src={ rtBtnHistory } alt="Historial de salas" />
                                </button>
                                <button
                                    type="button"
                                    className={ `rt2012-sq-btn ${ !canGoForward ? 'is-dim' : '' }` }
                                    disabled={ !canGoForward }
                                    title="Sala siguiente"
                                    onClick={ () => goHistory(1) }
                                >
                                    <img src={ rtBtnForward } alt="Siguiente" />
                                </button>
                                <button
                                    type="button"
                                    className="rt2012-sq-btn"
                                    title="Historial del chat"
                                    onClick={ () => handleToolClick('chat_history') }
                                >
                                    <img src={ rtBtnChat } alt="Chat" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                { showHistoryMenu && !isCollapsed2012 && (
                    <div className="room-tools-2012-history-popover">
                        <div className="rt2012-hist-title">Historial de salas</div>
                        { roomHistory.length === 0 ? (
                            <div className="rt2012-hist-empty">Sin salas recientes</div>
                        ) : (
                            [ ...roomHistory ].reverse().map((entry, i) => {
                                const realIdx = roomHistory.length - 1 - i;
                                const isCurrent = realIdx === historyIdx;
                                return (
                                    <button
                                        key={ `${ entry.id }-${ realIdx }` }
                                        type="button"
                                        className={ `rt2012-hist-item ${ isCurrent ? 'is-current' : '' }` }
                                        onClick={ () => { sharedHistoryIdx = realIdx; setHistoryIdx(realIdx); setShowHistoryMenu(false); if(!isCurrent) TryVisitRoom(entry.id); } }
                                    >
                                        { entry.name }
                                    </button>
                                );
                            })
                        ) }
                    </div>
                ) }

                <TransitionAnimation type={ TransitionAnimationTypes.SLIDE_LEFT } inProp={ isOpen } timeout={ 300 }>
                    <div className="room-tools-2012-toast">
                        <div className="rt2012-toast-name">{ roomName }</div>
                        <div className="rt2012-toast-owner">{ roomOwner }</div>
                    </div>
                </TransitionAnimation>
            </div>
        );
    }

    return (
        <Flex className="nitro-room-tools-container" gap={ 2 }>
            <Column center className="nitro-room-tools p-2">
                <Base pointer title={ LocalizeText('room.settings.button.text') } className="icon icon-cog" onClick={ () => handleToolClick('settings') } />
                <Base pointer title={ LocalizeText('room.zoom.button.text') } onClick={ () => handleToolClick('zoom') } className={ classNames('icon', (!isZoomedIn && 'icon-zoom-less'), (isZoomedIn && 'icon-zoom-more')) } />
                <Base pointer title={ LocalizeText('room.chathistory.button.text') } onClick={ () => handleToolClick('chat_history') } className="icon icon-chat-history" />
                { (navigatorData.canRate && !isOwner) &&
                    <Base pointer title={ LocalizeText('room.like.button.text') } onClick={ () => handleToolClick('like_room') } className="icon icon-like-room" /> }
                <Base pointer title={ LocalizeText('navigator.embed.src') } onClick={ () => handleToolClick('toggle_room_link') } className="icon icon-link-room" />
            </Column>
            <Column justifyContent="center">
                <TransitionAnimation type={ TransitionAnimationTypes.SLIDE_LEFT } inProp={ isOpen } timeout={ 300 }>
                    <Column center>
                        <Column className="nitro-room-tools-info rounded py-2 px-3">
                            <Column gap={ 1 }>
                                <Text wrap variant="white" fontSize={ 4 }>{ roomName }</Text>
                                <Text variant="muted" fontSize={ 5 }>{ roomOwner }</Text>
                            </Column>
                            { roomTags && roomTags.length > 0 &&
                                <Flex gap={ 2 }>
                                    { roomTags.map(t => (t || '').trim()).filter(Boolean).slice(0, 2).map((tag, index) => <Text key={ index } small pointer variant="white" className="rounded bg-primary p-1" onClick={ () => handleToolClick('navigator_search_tag', tag) }>#{ tag.replace(/^#+/, '') }</Text>) }
                                </Flex> }
                        </Column>
                    </Column>
                </TransitionAnimation>
            </Column>
        </Flex>
    );
}
