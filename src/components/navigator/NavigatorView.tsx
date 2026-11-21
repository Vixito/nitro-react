import { ConvertGlobalRoomIdMessageComposer, HabboWebTools, ILinkEventTracker, LegacyExternalInterface, NavigatorInitComposer, NavigatorSearchComposer, RoomSessionEvent } from '@nitrots/nitro-renderer';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { FaPlus } from 'react-icons/fa';
import { AddEventLinkTracker, GetConfiguration, LocalizeText, RemoveLinkEventTracker, SendMessageComposer, TryVisitRoom } from '../../api';
import { Base, Column, DraggableWindowPosition, NitroCardContentView, NitroCardHeaderView, NitroCardTabsItemView, NitroCardTabsView, NitroCardView } from '../../common';
import { useNavigator, useRoomSessionManagerEvent } from '../../hooks';
import { useEraTheme } from '../../hooks/era/useEraTheme';
import btnCreateRoom2012 from '../../assets/images/eras/flash2012/navigator/btn_create_room_2012.png';
import btnRandomRoom2012 from '../../assets/images/eras/flash2012/navigator/btn_random_room_2012.png';
import { NavigatorDoorStateView } from './views/NavigatorDoorStateView';
import { NavigatorRoomCreatorView } from './views/NavigatorRoomCreatorView';
import { NavigatorRoomInfoView } from './views/NavigatorRoomInfoView';
import { NavigatorRoomLinkView } from './views/NavigatorRoomLinkView';
import { NavigatorShockwaveView } from './views/NavigatorShockwaveView';
import { NavigatorRoomSettingsView } from './views/room-settings/NavigatorRoomSettingsView';
import { NavigatorSearchResultView } from './views/search/NavigatorSearchResultView';
import { NavigatorSearchView } from './views/search/NavigatorSearchView';

export const NavigatorView: FC<{}> = props =>
{
    const { currentEra } = useEraTheme();
    const [ isVisible, setIsVisible ] = useState(false);
    const [ isReady, setIsReady ] = useState(false);
    const [ isCreatorOpen, setCreatorOpen ] = useState(false);
    const [ isRoomInfoOpen, setRoomInfoOpen ] = useState(false);
    const [ isRoomLinkOpen, setRoomLinkOpen ] = useState(false);
    const [ isLoading, setIsLoading ] = useState(false);
    const [ needsInit, setNeedsInit ] = useState(true);
    const [ needsSearch, setNeedsSearch ] = useState(false);
    const { searchResult = null, topLevelContext = null, topLevelContexts = null, navigatorData = null } = useNavigator();
    const pendingSearch = useRef<{ value: string, code: string }>(null);
    const elementRef = useRef<HTMLDivElement>();

    useRoomSessionManagerEvent<RoomSessionEvent>(RoomSessionEvent.CREATED, event =>
    {
        setIsVisible(false);
        setCreatorOpen(false);
    });

    const sendSearch = useCallback((searchValue: string, contextCode: string) =>
    {
        setCreatorOpen(false);

        SendMessageComposer(new NavigatorSearchComposer(contextCode, searchValue));

        setIsLoading(true);
    }, []);

    const reloadCurrentSearch = useCallback(() =>
    {
        if(!isReady)
        {
            setNeedsSearch(true);

            return;
        }

        if(pendingSearch.current)
        {
            sendSearch(pendingSearch.current.value, pendingSearch.current.code);

            pendingSearch.current = null;

            return;
        }

        if(searchResult)
        {
            sendSearch(searchResult.data, searchResult.code);

            return;
        }

        if(topLevelContext)
        {
            sendSearch('', topLevelContext.code);
            return;
        }

        sendSearch('', 'official_view');
    }, [ isReady, searchResult, topLevelContext, sendSearch ]);

    useEffect(() =>
    {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) =>
            {
                const parts = url.split('/');
        
                if(parts.length < 2) return;
        
                switch(parts[1])
                {
                    case 'show': {
                        setIsVisible(true);
                        if(parts.length > 2)
                        {
                            pendingSearch.current = { value: parts[3] || '', code: parts[2] };
                        }
                        else
                        {
                            pendingSearch.current = { value: '', code: 'official_view' };
                        }
                        setNeedsSearch(true);
                        return;
                    }
                    case 'hide':
                        setIsVisible(false);
                        return;
                    case 'toggle': {
                        if(isVisible)
                        {
                            setIsVisible(false);
        
                            return;
                        }
        
                        setIsVisible(true);
                        pendingSearch.current = { value: '', code: 'official_view' };
                        setNeedsSearch(true);
                        return;
                    }
                    case 'toggle-room-info':
                        setRoomInfoOpen(value => !value);
                        return;
                    case 'toggle-room-link':
                        setRoomLinkOpen(value => !value);
                        return;
                    case 'goto':
                        if(parts.length <= 2) return;
        
                        switch(parts[2])
                        {
                            case 'home':
                                if(navigatorData.homeRoomId > 0)
                                {
                                    TryVisitRoom(navigatorData.homeRoomId);
                                }
                                else
                                {
                                    const defaultHome = parseInt(GetConfiguration<string>('hotel.home.room', '51'));
                                    if(defaultHome > 0) TryVisitRoom(defaultHome);
                                }
                                break;
                            default: {
                                const roomId = parseInt(parts[2]);
        
                                TryVisitRoom(roomId);
                            }
                        }
                        return;
                    case 'create':
                        setIsVisible(true);
                        setCreatorOpen(true);
                        return;
                    case 'search':
                        if(parts.length > 2)
                        {
                            const topLevelContextCode = parts[2];
        
                            let searchValue = '';
        
                            if(parts.length > 3) searchValue = parts[3];
        
                            pendingSearch.current = { value: searchValue, code: topLevelContextCode };
        
                            setIsVisible(true);
                            setNeedsSearch(true);
                        }
                        return;
                }
            },
            eventUrlPrefix: 'navigator/'
        };

        AddEventLinkTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [ isVisible, navigatorData ]);

    useEffect(() =>
    {
        if(!searchResult) return;

        setIsLoading(false);

        if(elementRef && elementRef.current) elementRef.current.scrollTop = 0;
    }, [ searchResult ]);

    useEffect(() =>
    {
        if(!isVisible || !isReady || !needsSearch) return;

        reloadCurrentSearch();

        setNeedsSearch(false);
    }, [ isVisible, isReady, needsSearch, reloadCurrentSearch ]);

    useEffect(() =>
    {
        if(isReady || !topLevelContext) return;

        setIsReady(true);
    }, [ isReady, topLevelContext ]);

    useEffect(() =>
    {
        if(!isVisible || !needsInit) return;

        SendMessageComposer(new NavigatorInitComposer());

        setNeedsInit(false);
    }, [ isVisible, needsInit ]);

    useEffect(() =>
    {
        LegacyExternalInterface.addCallback(HabboWebTools.OPENROOM, (k: string, _arg_2: boolean = false, _arg_3: string = null) => SendMessageComposer(new ConvertGlobalRoomIdMessageComposer(k)));
    }, []);

    const handleVisitRandomRoom = () =>
    {
        const allRooms = (searchResult?.results || []).flatMap(r => r.rooms || []);
        const activeRooms = allRooms.filter(r => r.userCount > 0);
        const pool = activeRooms.length > 0 ? activeRooms : allRooms;
        if(pool.length > 0)
        {
            const picked = pool[Math.floor(Math.random() * pool.length)];
            TryVisitRoom(picked.roomId);
            return;
        }
        sendSearch('', 'hotel_view');
    };

    return (
        <>
            { isVisible && (currentEra === 'shockwave2006' ? (
                <NavigatorShockwaveView
                    isVisible={ isVisible }
                    onClose={ () => setIsVisible(false) }
                    isCreatorOpen={ isCreatorOpen }
                    setCreatorOpen={ setCreatorOpen }
                    sendSearch={ sendSearch }
                />
            ) : currentEra === 'flash2012' ? (
                <>
                    <NitroCardView uniqueKey="navigator" className="nitro-navigator navigator-flash2012">
                        <NitroCardHeaderView headerText={ LocalizeText('navigator.title') } onCloseClick={ event => setIsVisible(false) } />
                        <NitroCardTabsView>
                            { topLevelContexts && (topLevelContexts.length > 0) && topLevelContexts.map((context, index) => (
                                <NitroCardTabsItemView key={ index } isActive={ (topLevelContext === context) } onClick={ event => sendSearch('', context.code) }>
                                    { LocalizeText(('navigator.toplevelview.' + context.code)) }
                                </NitroCardTabsItemView>
                            )) }
                        </NitroCardTabsView>
                        <NitroCardContentView position="relative" className="navigator-2012-content">
                            { isLoading &&
                                <Base fit position="absolute" className="top-0 start-0 z-index-1 bg-muted opacity-0-5" /> }
                            <NavigatorSearchView sendSearch={ sendSearch } />
                            <Column innerRef={ elementRef } overflow="auto" className="navigator-2012-list flex-grow-1">
                                { (searchResult && searchResult.results.map((result, index) => <NavigatorSearchResultView key={ index } searchResult={ result } />)) }
                            </Column>
                            <div className="navigator-2012-bottom-actions">
                                <button type="button" className="nav2012-big-btn" title="Crear Sala" onClick={ () => setCreatorOpen(true) }>
                                    <img src={ btnCreateRoom2012 } alt="Crear Sala" />
                                </button>
                                <button type="button" className="nav2012-big-btn" title="Ir a un sitio nuevo" onClick={ handleVisitRandomRoom }>
                                    <img src={ btnRandomRoom2012 } alt="Ir a un sitio nuevo" />
                                </button>
                            </div>
                        </NitroCardContentView>
                    </NitroCardView>
                    { isCreatorOpen && (
                        <NitroCardView uniqueKey="navigator-room-creator" className="navigator-room-creator-2012" windowPosition={ DraggableWindowPosition.CENTER }>
                            <NitroCardHeaderView headerText={ LocalizeText('navigator.createroom.title') || 'Crear una Sala' } onCloseClick={ () => setCreatorOpen(false) } />
                            <NitroCardContentView className="p-2">
                                <NavigatorRoomCreatorView onClose={ () => setCreatorOpen(false) } />
                            </NitroCardContentView>
                        </NitroCardView>
                    ) }
                </>
            ) : (
                <NitroCardView uniqueKey="navigator" className="nitro-navigator">
                    <NitroCardHeaderView headerText={ LocalizeText(isCreatorOpen ? 'navigator.createroom.title' : 'navigator.title') } onCloseClick={ event => setIsVisible(false) } />
                    <NitroCardTabsView>
                        { topLevelContexts && (topLevelContexts.length > 0) && topLevelContexts.map((context, index) =>
                        {
                            return (
                                <NitroCardTabsItemView key={ index } isActive={ ((topLevelContext === context) && !isCreatorOpen) } onClick={ event => sendSearch('', context.code) }>
                                    { LocalizeText(('navigator.toplevelview.' + context.code)) }
                                </NitroCardTabsItemView>
                            );
                        }) }
                        <NitroCardTabsItemView isActive={ isCreatorOpen } onClick={ event => setCreatorOpen(true) }>
                            <FaPlus className="fa-icon" />
                        </NitroCardTabsItemView>
                    </NitroCardTabsView>
                    <NitroCardContentView position="relative">
                        { isLoading &&
                            <Base fit position="absolute" className="top-0 start-0 z-index-1 bg-muted opacity-0-5" /> }
                        { !isCreatorOpen &&
                            <>
                                <NavigatorSearchView sendSearch={ sendSearch } />
                                <Column innerRef={ elementRef } overflow="auto">
                                    { (searchResult && searchResult.results.map((result, index) => <NavigatorSearchResultView key={ index } searchResult={ result } />)) }
                                </Column>
                            </> }
                        { isCreatorOpen && <NavigatorRoomCreatorView /> }
                    </NitroCardContentView>
                </NitroCardView>
            )) }
            <NavigatorDoorStateView />
            { isRoomInfoOpen && <NavigatorRoomInfoView onCloseClick={ () => setRoomInfoOpen(false) } /> }
            { isRoomLinkOpen && <NavigatorRoomLinkView onCloseClick={ () => setRoomLinkOpen(false) } /> }
            <NavigatorRoomSettingsView />
        </>
    );
}
