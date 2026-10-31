import { AddFavouriteRoomMessageComposer, DeleteFavouriteRoomMessageComposer, FavouriteChangedEvent, FavouritesEvent, GetGuestRoomMessageComposer, RoomDataParser, RoomObjectType, RoomSettingsComposer } from '@nitrots/nitro-renderer';
import { FC, KeyboardEvent, MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CreateRoomSession, DoorStateType, GetSessionDataManager, GetUserProfile, SendMessageComposer, TryVisitRoom, VisitDesktop } from '../../../api';
import doorInvisibleIcon from '../../../assets/images/eras/shockwave_v14/door_invisible.png';
import doorLockedIcon from '../../../assets/images/eras/shockwave_v14/door_locked.png';
import doorOpenIcon from '../../../assets/images/eras/shockwave_v14/door_open.png';
import doorPasswordIcon from '../../../assets/images/eras/shockwave_v14/door_password.png';
import iconProfileSm from '../../../assets/images/friends/icon-profile-sm.png';
import iconSmile from '../../../assets/images/friends/icon-smile.png';
import { DraggableWindow, DraggableWindowPosition, ShockwaveDropdown } from '../../../common';
import { useMessageEvent, useNavigator, useRoom } from '../../../hooks';
import { NavigatorRoomCreatorView } from './NavigatorRoomCreatorView';

interface NavigatorShockwaveViewProps
{
    isVisible: boolean;
    onClose: () => void;
    isCreatorOpen: boolean;
    setCreatorOpen: (flag: boolean) => void;
    sendSearch: (searchValue: string, contextCode: string) => void;
}

const sanitizeHabbtenName = (text: string): string =>
{
    if(!text) return '';
    return text
        .replace(/\bHabbo Club\b/gi, 'Habbten Club')
        .replace(/\bHabbo Hotel\b/gi, 'Hotel Habbten')
        .replace(/\bHabbo Lido\b/gi, 'Habbten Lido')
        .replace(/\bHabburger's\b/gi, "Habbtenguer's")
        .replace(/\bHabbos\b/gi, 'Habbten')
        .replace(/\bHabbo\b/gi, 'Habbten');
};

export const NavigatorShockwaveView: FC<NavigatorShockwaveViewProps> = ({
    isVisible,
    onClose,
    isCreatorOpen,
    setCreatorOpen,
    sendSearch
}) =>
{
    const { searchResult = null, topLevelContext = null, setDoorData = null, navigatorData = null } = useNavigator();
    const { roomSession = null } = useRoom();

    const [ mainTab, setMainTab ] = useState<'public' | 'private'>('public');
    const [ bottomTab, setBottomTab ] = useState<'info' | 'people'>('info');
    const [ privateFilter, setPrivateFilter ] = useState<'popular' | 'my' | 'fav'>('popular');
    const [ searchQuery, setSearchQuery ] = useState('');
    const [ selectedRoom, setSelectedRoom ] = useState<RoomDataParser | null>(null);
    const [ isHotelViewSelected, setIsHotelViewSelected ] = useState(false);
    const [ favRoomIds, setFavRoomIds ] = useState<number[]>([]);
    const [ hasLoadedFavs, setHasLoadedFavs ] = useState(false);

    const getRoomUserCount = useCallback((room: RoomDataParser | null) =>
    {
        if(!room) return 0;
        if(roomSession && roomSession.roomId === room.roomId)
        {
            const rawUsers = (roomSession.userDataManager as any)?._userDataByRoomIndex;
            let activeCount = 0;
            if(rawUsers)
            {
                rawUsers.forEach((u: any) => { if(u && u.type === RoomObjectType.USER) activeCount++; });
            }
            return Math.max(room.userCount, activeCount);
        }
        return room.userCount;
    }, [ roomSession ]);

    const handleSelectRoom = useCallback((room: RoomDataParser) =>
    {
        setLoadingRoom(null);
        setIsHotelViewSelected(false);
        setSelectedRoom(room);
    }, []);

    useMessageEvent<FavouritesEvent>(FavouritesEvent, event =>
    {
        const parser = event.getParser();
        if(!parser) return;
        setFavRoomIds(parser.favoriteRoomIds || []);
        setHasLoadedFavs(true);
    });

    useMessageEvent<FavouriteChangedEvent>(FavouriteChangedEvent, event =>
    {
        const parser = event.getParser();
        if(!parser) return;
        setFavRoomIds(prev =>
        {
            if(parser.added)
            {
                return prev.includes(parser.flatId) ? prev : [ ...prev, parser.flatId ];
            }
            return prev.filter(id => id !== parser.flatId);
        });
    });

    // Estado del proceso de carga al dirigirse a una sala (Imagen 5)
    const [ loadingRoom, setLoadingRoom ] = useState<RoomDataParser | null>(null);
    const [ loadingProgress, setLoadingProgress ] = useState<number>(0);
    const loadingIntervalRef = useRef<number | null>(null);
    const loadingTimeoutRef = useRef<number | null>(null);

    const clearLoadingTimers = () =>
    {
        if(loadingIntervalRef.current !== null)
        {
            window.clearInterval(loadingIntervalRef.current);
            loadingIntervalRef.current = null;
        }
        if(loadingTimeoutRef.current !== null)
        {
            window.clearTimeout(loadingTimeoutRef.current);
            loadingTimeoutRef.current = null;
        }
    };

    useEffect(() =>
    {
        return () => clearLoadingTimers();
    }, []);

    useEffect(() =>
    {
        if(!isVisible)
        {
            clearLoadingTimers();
            setLoadingRoom(null);
            setLoadingProgress(0);
        }
    }, [ isVisible ]);

    useEffect(() =>
    {
        if(!topLevelContext) return;
        if(topLevelContext.code === 'official_view')
        {
            setMainTab('public');
        }
        else if(topLevelContext.code === 'hotel_view' || topLevelContext.code === 'myworld_view')
        {
            setMainTab('private');
        }
    }, [ topLevelContext ]);

    const handleSwitchMainTab = (tab: 'public' | 'private') =>
    {
        clearLoadingTimers();
        setLoadingRoom(null);
        setCreatorOpen(false);
        setSelectedRoom(null);
        setIsHotelViewSelected(false);
        setMainTab(tab);

        if(tab === 'public')
        {
            sendSearch('', 'official_view');
        }
        else
        {
            const code = (privateFilter === 'my' || privateFilter === 'fav') ? 'myworld_view' : 'hotel_view';
            sendSearch('', code);
        }
    };

    const handlePrivateFilterChange = (val: string) =>
    {
        if(val === 'create')
        {
            setCreatorOpen(true);
            return;
        }
        const nextFilter = val as 'popular' | 'my' | 'fav';
        setPrivateFilter(nextFilter);
        setSelectedRoom(null);
        setSearchQuery('');
        if(nextFilter === 'my' || nextFilter === 'fav')
        {
            sendSearch('', 'myworld_view');
        }
        else
        {
            sendSearch('', 'hotel_view');
        }
    };

    const handleSearchSubmit = () =>
    {
        setSelectedRoom(null);
        const query = searchQuery.trim();
        if(query.length > 0)
        {
            if(privateFilter === 'my' || privateFilter === 'fav')
            {
                sendSearch(query, 'myworld_view');
            }
            else
            {
                sendSearch(query, 'hotel_view');
            }
        }
        else
        {
            if(privateFilter === 'my' || privateFilter === 'fav')
            {
                sendSearch('', 'myworld_view');
            }
            else
            {
                sendSearch('', 'hotel_view');
            }
        }
    };

    const handleSearchChange = (val: string) =>
    {
        setSearchQuery(val);
        if(val.trim() === '' && searchQuery.trim() !== '')
        {
            setSelectedRoom(null);
            if(privateFilter === 'my' || privateFilter === 'fav')
            {
                sendSearch('', 'myworld_view');
            }
            else
            {
                sendSearch('', 'hotel_view');
            }
        }
    };

    const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) =>
    {
        if(e.key === 'Enter') handleSearchSubmit();
    };

    const allRooms = useMemo(() =>
    {
        if(!searchResult || !searchResult.results) return [];
        const list: RoomDataParser[] = [];

        if(mainTab === 'private' && privateFilter === 'fav')
        {
            if(hasLoadedFavs && favRoomIds.length === 0) return [];

            for(const group of searchResult.results)
            {
                if(!group || !group.rooms) continue;
                const code = (group.code || '').toLowerCase();
                const isFavGroup = code.includes('fav');

                for(const r of group.rooms)
                {
                    const isExplicitFav = favRoomIds.includes(r.roomId) || (!hasLoadedFavs && isFavGroup);
                    if(isExplicitFav && !list.some(existing => existing.roomId === r.roomId))
                    {
                        list.push(r);
                    }
                }
            }
        }
        else if(mainTab === 'private' && privateFilter === 'my')
        {
            const myUserId = GetSessionDataManager().userId;
            const myUserName = (GetSessionDataManager().userName || '').toLowerCase();
            for(const group of searchResult.results)
            {
                if(!group || !group.rooms) continue;
                const code = (group.code || '').toLowerCase();
                const isMyGroup = code.includes('my') || code.includes('own') || code === 'guest_me';

                for(const r of group.rooms)
                {
                    const isMine = isMyGroup || r.ownerId === myUserId || (r.ownerName && r.ownerName.toLowerCase() === myUserName);
                    if(isMine && !list.some(existing => existing.roomId === r.roomId))
                    {
                        list.push(r);
                    }
                }
            }
        }
        else
        {
            for(const group of searchResult.results)
            {
                if(!group || !group.rooms) continue;
                for(const r of group.rooms)
                {
                    if(!list.some(existing => existing.roomId === r.roomId))
                    {
                        list.push(r);
                    }
                }
            }
        }

        const q = searchQuery.trim().toLowerCase();
        if(q.length > 0)
        {
            return list.filter(r =>
                (r.roomName && r.roomName.toLowerCase().includes(q)) ||
                (r.description && r.description.toLowerCase().includes(q)) ||
                (r.tags && r.tags.some(t => t.toLowerCase().includes(q))) ||
                (r.ownerName && r.ownerName.toLowerCase().includes(q))
            );
        }

        return list;
    }, [ searchResult, mainTab, privateFilter, favRoomIds, hasLoadedFavs, searchQuery ]);

    const executeVisitRoom = (roomData: RoomDataParser) =>
    {
        if(!roomData) return;

        if(roomData.ownerId !== GetSessionDataManager().userId)
        {
            if(roomData.habboGroupId !== 0)
            {
                TryVisitRoom(roomData.roomId);
                return;
            }

            switch(roomData.doorMode)
            {
                case RoomDataParser.DOORBELL_STATE:
                    setDoorData(prevValue =>
                    {
                        const newValue = { ...prevValue };
                        newValue.roomInfo = roomData;
                        newValue.state = DoorStateType.START_DOORBELL;
                        return newValue;
                    });
                    return;
                case RoomDataParser.PASSWORD_STATE:
                    setDoorData(prevValue =>
                    {
                        const newValue = { ...prevValue };
                        newValue.roomInfo = roomData;
                        newValue.state = DoorStateType.START_PASSWORD;
                        return newValue;
                    });
                    return;
            }
        }

        CreateRoomSession(roomData.roomId);
    };

    const startGoingToRoom = (roomData: RoomDataParser, event?: MouseEvent) =>
    {
        if(event) event.stopPropagation();
        if(!roomData) return;

        clearLoadingTimers();
        setIsHotelViewSelected(false);
        setSelectedRoom(roomData);
        setBottomTab('info');
        setLoadingRoom(roomData);
        setLoadingProgress(25);

        loadingIntervalRef.current = window.setInterval(() =>
        {
            setLoadingProgress(prev => Math.min(100, prev + 25));
        }, 120);

        loadingTimeoutRef.current = window.setTimeout(() =>
        {
            clearLoadingTimers();
            setLoadingRoom(null);
            setLoadingProgress(0);
            executeVisitRoom(roomData);
        }, 520);
    };

    const cancelGoingToRoom = (event?: MouseEvent) =>
    {
        if(event) event.stopPropagation();
        clearLoadingTimers();
        setLoadingRoom(null);
        setLoadingProgress(0);
    };

    const handleGoHotelView = (event: MouseEvent) =>
    {
        event.stopPropagation();
        clearLoadingTimers();
        setLoadingRoom(null);
        VisitDesktop();
        onClose();
    };

    const handleToggleFavorite = (room: RoomDataParser) =>
    {
        if(!room) return;
        const isFav = favRoomIds.includes(room.roomId) || privateFilter === 'fav';
        if(isFav)
        {
            SendMessageComposer(new DeleteFavouriteRoomMessageComposer(room.roomId));
            setFavRoomIds(prev => prev.filter(id => id !== room.roomId));
        }
        else
        {
            SendMessageComposer(new AddFavouriteRoomMessageComposer(room.roomId));
            setFavRoomIds(prev => [ ...prev, room.roomId ]);
        }
    };

    const handleModifyRoom = (room: RoomDataParser) =>
    {
        if(!room) return;
        SendMessageComposer(new RoomSettingsComposer(room.roomId));
    };

    const getDoorGraphicForRoom = (room: RoomDataParser) =>
    {
        if(!room) return doorOpenIcon;
        switch(room.doorMode)
        {
            case RoomDataParser.DOORBELL_STATE:
                return doorLockedIcon;
            case RoomDataParser.PASSWORD_STATE:
                return doorPasswordIcon;
            case RoomDataParser.INVISIBLE_STATE:
                return doorInvisibleIcon;
            default:
                return doorOpenIcon;
        }
    };

    // Usuarios reales dentro de la sala si el jugador está actualmente en esa sala
    const currentRoomUsers = useMemo(() =>
    {
        if(!selectedRoom || !roomSession || roomSession.roomId !== selectedRoom.roomId || !roomSession.userDataManager) return [];
        const rawUsers = (roomSession.userDataManager as any)._userDataByRoomIndex;
        if(!rawUsers) return [];
        const users: { webID: number; name: string }[] = [];
        rawUsers.forEach((u: any) =>
        {
            if(u && u.type === RoomObjectType.USER)
            {
                users.push({ webID: u.webID, name: u.name });
            }
        });
        return users;
    }, [ selectedRoom, roomSession ]);

    if(!isVisible) return null;

    const isBottomActive = (mainTab === 'private') || (selectedRoom !== null) || isHotelViewSelected || (loadingRoom !== null);
    const minPrivateRows = 11;
    const emptyFillerCount = Math.max(0, minPrivateRows - allRooms.length);
    const canModifySelectedRoom = selectedRoom && (
        selectedRoom.ownerId === GetSessionDataManager().userId ||
        GetSessionDataManager().isModerator
    );

    return (
        <DraggableWindow
            uniqueKey="navigator-shockwave-2006"
            handleSelector=".nav-shockwave-header"
            windowPosition={ DraggableWindowPosition.CENTER }
            className="navigator-shockwave-draggable"
        >
            <div className="navigator-shockwave-window">
                {/* CABECERA CLÁSICA SHOCKWAVE 2006 (IMAGEN 2: DOS BLOQUES DE PUNTOS SIN CAJA ALREDEDOR DEL TÍTULO) */}
                <div className="nav-shockwave-header">
                    <div className="nav-header-dots left" />
                    <span className="nav-shockwave-title">
                        { isCreatorOpen ? 'Crear Sala en Habbten' : 'Navegador Habbten' }
                    </span>
                    <div className="nav-header-dots right" />
                    <button
                        type="button"
                        className="nav-shockwave-close"
                        onClick={ onClose }
                        title="Cerrar"
                        aria-label="Cerrar"
                    />
                </div>

                { isCreatorOpen ? (
                    <div className="nav-shockwave-creator-wrapper">
                        <div className="creator-back-row">
                            <span className="creator-back-link" onClick={ () => setCreatorOpen(false) }>
                                &lt;&lt; Volver al Navegador
                            </span>
                        </div>
                        <NavigatorRoomCreatorView />
                    </div>
                ) : (
                    <div className="nav-shockwave-body">
                        {/* PESTAÑAS PRINCIPALES SUPERIORES (Salas públicas / Salas privadas) */}
                        <div className="nav-top-tabs">
                            <div
                                className={ `nav-top-tab ${ mainTab === 'public' ? 'active' : '' }` }
                                onClick={ () => handleSwitchMainTab('public') }
                            >
                                <svg className="tab-cube-icon" width="16" height="13" viewBox="0 0 16 13" shapeRendering="crispEdges">
                                    <path d="M7 0h2v1h2v1h2v1h2v5h-2v1h-2v1h-2v1H7v-1H5v-1H3V8H1V3h2V2h2V1h2V0z" fill="#000000" />
                                    <path d="M7 1h2v1h2v1h2v1H11v1H9v1H7V5H5V4H3V3h2V2h2V1z" fill="#ffffff" />
                                    <path d="M2 4h2v1h2v1h1v4H5V9H3V8H2V4z" fill="#d2d8dc" />
                                    <path d="M9 6h2V5h2V4h1v4h-1v1h-2v1H9V6z" fill="#9ea7ad" />
                                </svg>
                                <span className="tab-text">Salas públicas</span>
                            </div>
                            <div
                                className={ `nav-top-tab ${ mainTab === 'private' ? 'active' : '' }` }
                                onClick={ () => handleSwitchMainTab('private') }
                            >
                                <svg className="tab-cube-icon" width="16" height="13" viewBox="0 0 16 13" shapeRendering="crispEdges">
                                    <path d="M7 0h2v1h2v1h2v1h2v5h-2v1h-2v1h-2v1H7v-1H5v-1H3V8H1V3h2V2h2V1h2V0z" fill="#000000" />
                                    <path d="M7 1h2v1h2v1h2v1H11v1H9v1H7V5H5V4H3V3h2V2h2V1z" fill="#ffffff" />
                                    <path d="M2 4h2v1h2v1h1v4H5V9H3V8H2V4z" fill="#d2d8dc" />
                                    <path d="M9 6h2V5h2V4h1v4h-1v1h-2v1H9V6z" fill="#9ea7ad" />
                                </svg>
                                <span className="tab-text">Salas privadas</span>
                            </div>
                        </div>

                        {/* CAJA PRINCIPAL DE LISTADO DE SALAS */}
                        <div className="nav-main-box">
                            { mainTab === 'private' && (
                                <div className="nav-private-Searchbar">
                                    <ShockwaveDropdown
                                        className="nav-pill-select-wrap"
                                        value={ privateFilter }
                                        options={ [
                                            { value: 'popular', label: 'Salas populares' },
                                            { value: 'my', label: 'Mis salas' },
                                            { value: 'fav', label: 'Salas favoritas' },
                                            { value: 'create', label: '+ Crear sala...' }
                                        ] }
                                        onChange={ val => handlePrivateFilterChange(val) }
                                    />
                                    <input
                                        type="text"
                                        className="nav-pill-input"
                                        value={ searchQuery }
                                        onChange={ e => handleSearchChange(e.target.value) }
                                        onKeyDown={ handleSearchKeyDown }
                                    />
                                    <button
                                        type="button"
                                        className="nav-bevel-search-btn"
                                        onClick={ handleSearchSubmit }
                                    >
                                        Buscar
                                    </button>
                                </div>
                            ) }

                            { mainTab === 'public' ? (
                                <div className="nav-public-list">
                                    {/* Fila dedicada: Vista del hotel */}
                                    <div
                                        className={ `nav-public-row hotel-view-row ${ isHotelViewSelected ? 'selected' : '' }` }
                                        onClick={ () => { setLoadingRoom(null); setSelectedRoom(null); setIsHotelViewSelected(true); } }
                                    >
                                        <span className="pub-room-name">Vista del hotel</span>
                                        <span className="pub-dots-long" />
                                        <span
                                            className="nav-go-link"
                                            onClick={ handleGoHotelView }
                                            title="Ir a la Vista del Hotel"
                                        >
                                            Ir &gt;&gt;
                                        </span>
                                    </div>

                                    {/* Filas de salas públicas */}
                                    { allRooms.map(room => (
                                        <div
                                            key={ room.roomId }
                                            className={ `nav-public-row ${ selectedRoom?.roomId === room.roomId ? 'selected' : '' }` }
                                            onClick={ () => handleSelectRoom(room) }
                                        >
                                            <svg className="pub-room-cube" width="18" height="14" viewBox="0 0 18 14" shapeRendering="crispEdges">
                                                <path d="M8 0h2v1h2v1h2v1h2v1h1v5h-1v1h-2v1h-2v1h-2v1H8v-1H6v-1H4v-1H2V9H1V4h1V3h2V2h2V1h2V0z" fill="#000000" />
                                                <path d="M8 1h2v1h2v1h2v1h-2v1h-2v1H8V5H6V4H4V3h2V2h2V1z" fill="#bfc7cc" />
                                                <path d="M2 5h2v1h2v1h2v5H6v-1H4v-1H2V5z" fill="#99a2a8" />
                                                <path d="M10 7h2V6h2V5h2v5h-2v1h-2v1h-2V7z" fill="#737c82" />
                                                <rect x="8" y="3" width="2" height="1" fill="#555d61" />
                                            </svg>
                                            <span className="pub-room-name">{ sanitizeHabbtenName(room.roomName) }</span>
                                            <span className="pub-user-count">{ getRoomUserCount(room) }</span>
                                            <span className="pub-dots-short" />
                                            <span
                                                className="nav-go-link"
                                                onClick={ e => startGoingToRoom(room, e) }
                                                title="Entrar a la sala"
                                            >
                                                Ir &gt;&gt;
                                            </span>
                                        </div>
                                    )) }
                                </div>
                            ) : (
                                <div className="nav-private-list">
                                    { allRooms.map(room => (
                                        <div
                                            key={ room.roomId }
                                            className={ `nav-private-row ${ selectedRoom?.roomId === room.roomId ? 'selected' : '' }` }
                                            onClick={ () => handleSelectRoom(room) }
                                        >
                                            <div className="priv-row-top">
                                                <span className="priv-user-count">
                                                    { getRoomUserCount(room) }
                                                </span>
                                                <span className="priv-room-name">{ sanitizeHabbtenName(room.roomName) }</span>
                                                <span
                                                    className="nav-go-link priv-go"
                                                    onClick={ e => startGoingToRoom(room, e) }
                                                    title="Entrar a la sala"
                                                >
                                                    Ir &gt;&gt;
                                                </span>
                                            </div>
                                            <div className="priv-row-dots" />
                                        </div>
                                    )) }

                                    {/* Líneas punteadas de relleno idénticas al juego original */}
                                    { Array.from({ length: emptyFillerCount }).map((_, idx) => (
                                        <div key={ `empty-${ idx }` } className="nav-private-empty-row">
                                            <div className="priv-row-dots" />
                                        </div>
                                    )) }
                                </div>
                            ) }
                        </div>

                        {/* PANEL INFERIOR (Info sala / Gente) */}
                        <div className={ `nav-bottom-section ${ isBottomActive ? 'active-panel' : 'dimmed-panel' }` }>
                            <div className="nav-bottom-tabs">
                                <div
                                    className={ `nav-bottom-tab ${ bottomTab === 'info' ? 'active' : '' }` }
                                    onClick={ () => setBottomTab('info') }
                                >
                                    <svg className="bottom-tab-icon" width="13" height="13" viewBox="0 0 13 13" shapeRendering="crispEdges">
                                        <path d="M4 0h5v1h2v2h1v5h-1v2H9v1H4v-1H2V8H1V3h1V1h2V0z" fill="currentColor" />
                                        <path d="M4 1h5v1h2v2h1v5h-1v2H9v1H4v-1H2V9H1V4h1V2h2V1z" fill="#ffffff" fillOpacity="0.85" />
                                        <rect x="6" y="3" width="1" height="1" fill="currentColor" />
                                        <rect x="6" y="5" width="1" height="4" fill="currentColor" />
                                    </svg>
                                    <span className="bottom-tab-label">Info sala</span>
                                </div>
                                <div
                                    className={ `nav-bottom-tab ${ bottomTab === 'people' ? 'active' : '' }` }
                                    onClick={ () => setBottomTab('people') }
                                >
                                    <svg className="bottom-tab-icon" width="14" height="14" viewBox="0 0 14 14" shapeRendering="crispEdges">
                                        <rect x="2" y="1" width="3" height="3" fill="currentColor" />
                                        <rect x="3" y="2" width="1" height="1" fill="#ffffff" fillOpacity="0.8" />
                                        <rect x="1" y="5" width="5" height="4" fill="currentColor" />
                                        <rect x="2" y="6" width="3" height="2" fill="#ffffff" fillOpacity="0.8" />
                                        <rect x="2" y="9" width="3" height="4" fill="currentColor" />
                                        <rect x="8" y="1" width="3" height="3" fill="currentColor" />
                                        <rect x="9" y="2" width="1" height="1" fill="#ffffff" fillOpacity="0.8" />
                                        <rect x="7" y="5" width="5" height="4" fill="currentColor" />
                                        <rect x="8" y="6" width="3" height="2" fill="#ffffff" fillOpacity="0.8" />
                                        <rect x="8" y="9" width="3" height="4" fill="currentColor" />
                                    </svg>
                                    <span className="bottom-tab-label">Gente</span>
                                </div>
                            </div>

                            <div className="nav-bottom-box">
                                { !isBottomActive ? null : loadingRoom ? (
                                    /* PROCESO DE CARGA AL IR A UNA SALA (IMAGEN 5) */
                                    <div className="nav-room-loading">
                                        <div className="loading-line-1">
                                            { (mainTab === 'private' || loadingRoom.showOwner) ? 'Yendo a sala privada' : 'Yendo a sala pública' }
                                        </div>
                                        <div className="loading-line-2">
                                            { sanitizeHabbtenName(loadingRoom.roomName) }
                                        </div>
                                        <div className="loading-progress-track">
                                            <div
                                                className="loading-progress-fill"
                                                style={ { width: `${ loadingProgress }%` } }
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            className="nav-retro-btn cancel-btn"
                                            onClick={ cancelGoingToRoom }
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                ) : isHotelViewSelected ? (
                                    bottomTab === 'info' ? (
                                        <div className="nav-room-details">
                                            <div className="details-info-top">
                                                <div className="details-title">Vista del Hotel Habbten</div>
                                                <div className="details-desc">
                                                    Regresa a la vista exterior principal del Hotel Habbten.
                                                </div>
                                            </div>
                                            <div className="details-buttons-row">
                                                <span />
                                                <div className="nav-retro-go-wrap" onClick={ handleGoHotelView }>
                                                    <button type="button" className="nav-retro-go-btn">
                                                        Ir &gt;&gt;
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="nav-room-details">
                                            <div className="details-info-top">
                                                <div className="details-desc">
                                                    Vista panorámica principal del Hotel Habbten.
                                                </div>
                                            </div>
                                        </div>
                                    )
                                ) : !selectedRoom ? (
                                    <div className="nav-room-details">
                                        <div className="details-info-top">
                                            <div className="details-default-text">
                                                Para conseguir tu propia sala privada gratis, visita los kioscos Room-O-Matic en el Vestíbulo.
                                            </div>
                                        </div>
                                        <div className="details-buttons-row">
                                            <button
                                                type="button"
                                                className="nav-retro-btn"
                                                onClick={ () => setCreatorOpen(true) }
                                            >
                                                Crear sala
                                            </button>
                                        </div>
                                    </div>
                                ) : bottomTab === 'info' ? (
                                    /* INFO DE SALA (IMAGEN 1 E IMAGEN 4) */
                                    <div className="nav-room-details">
                                        <div className="details-info-top">
                                            <div className="details-title">
                                                { sanitizeHabbtenName(selectedRoom.roomName) } ({ getRoomUserCount(selectedRoom) }/{ selectedRoom.maxUserCount })
                                            </div>
                                            { selectedRoom.showOwner && selectedRoom.ownerName ? (
                                                <div
                                                    className="details-owner-row clickable"
                                                    onClick={ () => selectedRoom.ownerId > 0 && GetUserProfile(selectedRoom.ownerId) }
                                                >
                                                    Dueñ@: { selectedRoom.ownerName }
                                                </div>
                                            ) : (
                                                <div className="details-owner-row">
                                                    Sala Pública Oficial
                                                </div>
                                            ) }
                                            { selectedRoom.description && (
                                                <div className="details-desc">
                                                    { sanitizeHabbtenName(selectedRoom.description) }
                                                </div>
                                            ) }
                                        </div>

                                        {/* Ícono isométrico de puerta sin background (Abierta, Timbre/Candado, Clave o Invisible) */}
                                        <div className="details-door-graphic">
                                            <img
                                                src={ getDoorGraphicForRoom(selectedRoom) }
                                                alt=""
                                                className="door-iso-img"
                                            />
                                        </div>

                                        {/* Botonera inferior idéntica a la Imagen 4 */}
                                        <div className="details-buttons-row">
                                            <button
                                                type="button"
                                                className="nav-retro-btn"
                                                onClick={ () => handleToggleFavorite(selectedRoom) }
                                            >
                                                { (favRoomIds.includes(selectedRoom.roomId) || privateFilter === 'fav')
                                                    ? 'Quitar favorita'
                                                    : 'Añadir a favoritas' }
                                            </button>

                                            <div className="details-right-btns">
                                                { canModifySelectedRoom && (
                                                    <button
                                                        type="button"
                                                        className="nav-retro-btn"
                                                        onClick={ () => handleModifyRoom(selectedRoom) }
                                                    >
                                                        Modificar
                                                    </button>
                                                ) }
                                                <div
                                                    className="nav-retro-go-wrap"
                                                    onClick={ e => startGoingToRoom(selectedRoom, e) }
                                                >
                                                    <button type="button" className="nav-retro-go-btn">
                                                        Ir &gt;&gt;
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="nav-room-people">
                                        <div className="people-header-row">
                                            <img src={ iconSmile } alt="" className="pixel-icon" />
                                            <span>
                                                { getRoomUserCount(selectedRoom) } / { selectedRoom.maxUserCount } usuario(s) en <b>{ sanitizeHabbtenName(selectedRoom.roomName) }</b>
                                            </span>
                                        </div>
                                        { currentRoomUsers.length > 0 ? (
                                            <div className="people-users-grid">
                                                { currentRoomUsers.map(u => (
                                                    <div
                                                        key={ u.webID }
                                                        className="people-user-chip"
                                                        onClick={ () => u.webID > 0 && GetUserProfile(u.webID) }
                                                    >
                                                        <img src={ iconProfileSm } alt="" className="pixel-icon" />
                                                        <span>{ u.name }</span>
                                                    </div>
                                                )) }
                                            </div>
                                        ) : selectedRoom.userCount === 0 ? (
                                            <div className="people-empty-text">
                                                No hay usuarios en esta sala en este momento.
                                            </div>
                                        ) : (
                                            <div className="people-empty-text">
                                                Hay { selectedRoom.userCount } usuario(s) dentro de la sala. Haz clic en <b>Ir &gt;&gt;</b> para entrar y verlos en tiempo real.
                                            </div>
                                        ) }
                                    </div>
                                ) }
                            </div>
                        </div>
                    </div>
                ) }
            </div>
        </DraggableWindow>
    );
};
