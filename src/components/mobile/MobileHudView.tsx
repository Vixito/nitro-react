import { NitroSettingsEvent, UserSettingsEvent, UserSettingsSoundComposer } from '@nitrots/nitro-renderer';
import { FC, FormEvent, useEffect, useRef, useState } from 'react';
import { ChatMessageTypeEnum, CreateLinkEvent, DispatchMainEvent, GetRoomEngine, GetSessionDataManager, MessengerIconState, OpenMessengerChat, SendMessageComposer, VisitDesktop } from '../../api';
import catalogIconImg from '../../assets/images/toolbar/icons/catalog.png';
import friendsIconImg from '../../assets/images/toolbar/icons/friend_all.png';
import inventoryIconImg from '../../assets/images/toolbar/icons/inventory.png';
import messageIconImg from '../../assets/images/toolbar/icons/message.png';
import messageUnseenIconImg from '../../assets/images/toolbar/icons/message_unsee.gif';
import roomsIconImg from '../../assets/images/toolbar/icons/rooms.png';
import { LayoutAvatarImageView, LayoutCurrencyIcon } from '../../common';
import { useAchievements, useChatInputWidget, useFriends, useInventoryUnseenTracker, useMessageEvent, useMessenger, usePurse, useRoom, useSessionInfo } from '../../hooks';
import { useMobileTouchMode } from '../../hooks/mobile/useIsMobile';
import './MobileHudView.scss';

interface MobileHudViewProps
{
    isInRoom: boolean;
}

export const MobileHudView: FC<MobileHudViewProps> = props =>
{
    const { isInRoom } = props;
    const { userFigure = null, chatStyleId = 0 } = useSessionInfo();
    const { getFullCount = 0 } = useInventoryUnseenTracker();
    const { getTotalUnseen = 0 } = useAchievements();
    const { getCurrencyAmount = null } = usePurse();
    const { requests = [] } = useFriends();
    const { iconState = MessengerIconState.HIDDEN } = useMessenger();
    const { roomSession = null } = useRoom();
    const { sendChat = null, setIsTyping = null, setIsIdle = null } = useChatInputWidget();
    const [ touchMode, setTouchMode ] = useMobileTouchMode();

    const [ isMeMenuOpen, setMeMenuOpen ] = useState(false);
    const [ isHelpMenuOpen, setHelpMenuOpen ] = useState(false);
    const [ isSideDrawerOpen, setSideDrawerOpen ] = useState(false);
    const [ isChatBarOpen, setChatBarOpen ] = useState(false);
    const [ chatText, setChatText ] = useState('');
    const [ chatMode, setChatMode ] = useState<'say' | 'shout' | 'whisper'>('say');
    const [ isSoundActive, setIsSoundActive ] = useState(true);
    const [ modeToast, setModeToast ] = useState<string>('');
    const chatInputRef = useRef<HTMLInputElement>(null);
    const toastTimerRef = useRef<number | null>(null);

    const isMod = GetSessionDataManager() ? GetSessionDataManager().isModerator : false;
    const credits = getCurrencyAmount ? getCurrencyAmount(-1) : 0;
    const duckets = getCurrencyAmount ? getCurrencyAmount(0) : 0;
    const diamonds = getCurrencyAmount ? getCurrencyAmount(5) : 0;

    useMessageEvent<UserSettingsEvent>(UserSettingsEvent, event =>
    {
        const parser = event.getParser();
        setIsSoundActive(!(parser.volumeSystem === 0 && parser.volumeFurni === 0 && parser.volumeTrax === 0));
    });

    useEffect(() =>
    {
        if(!isInRoom)
        {
            setChatBarOpen(false);
            setSideDrawerOpen(false);
        }
    }, [ isInRoom ]);

    useEffect(() =>
    {
        if(isChatBarOpen && chatInputRef.current)
        {
            setTimeout(() => chatInputRef.current?.focus(), 60);
        }
    }, [ isChatBarOpen ]);

    const closePopovers = () =>
    {
        setMeMenuOpen(false);
        setHelpMenuOpen(false);
        setSideDrawerOpen(false);
    };

    const flashToast = (msg: string) =>
    {
        setModeToast(msg);
        if(toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = window.setTimeout(() => setModeToast(''), 1500);
    };

    const handleSwitchTouchMode = (next: 'walk' | 'pan') =>
    {
        setTouchMode(next);
        flashToast(next === 'walk' ? 'Modo Caminar' : 'Modo Mover Sala');
    };

    const handleZoomDelta = (delta: number) =>
    {
        if(!roomSession) return;
        const rc = GetRoomEngine().getRoomInstanceRenderingCanvas(roomSession.roomId, 1);
        const cur = rc ? (rc.scale || 1) : 1;
        const next = delta === 0 ? 1 : Math.max(0.5, Math.min(2.0, Number((cur + delta).toFixed(2))));
        GetRoomEngine().setRoomInstanceRenderingCanvasScale(roomSession.roomId, 1, next, null, null, false);
        flashToast(`Zoom ${ Math.round(next * 100) }%`);
    };

    const toggleSound = () =>
    {
        const nextState = !isSoundActive;
        setIsSoundActive(nextState);
        const volume = nextState ? 100 : 0;
        try
        {
            const settings = new NitroSettingsEvent();
            settings.volumeSystem = volume;
            settings.volumeFurni = volume;
            settings.volumeTrax = volume;
            DispatchMainEvent(settings);
            SendMessageComposer(new UserSettingsSoundComposer(volume, volume, volume));
        }
        catch
        {
            // ignore
        }
    };

    const toggleFullscreen = () =>
    {
        try
        {
            if(!document.fullscreenElement) document.documentElement.requestFullscreen?.();
            else document.exitFullscreen?.();
        }
        catch
        {
            // ignore
        }
    };

    const handleSendChat = (e: FormEvent) =>
    {
        e.preventDefault();
        const trimmed = chatText.trim();
        if(!trimmed || !sendChat) return;

        const msgType = chatMode === 'shout'
            ? ChatMessageTypeEnum.CHAT_SHOUT
            : (chatMode === 'whisper' ? ChatMessageTypeEnum.CHAT_WHISPER : ChatMessageTypeEnum.CHAT_DEFAULT);

        setIsTyping?.(false);
        setIsIdle?.(false);
        sendChat(trimmed, msgType, '', chatStyleId);
        setChatText('');
    };

    const cycleChatMode = () =>
    {
        setChatMode(prev => prev === 'say' ? 'shout' : (prev === 'shout' ? 'whisper' : 'say'));
    };

    const hasUnreadMessenger = iconState === MessengerIconState.UNREAD;

    return (
        <div className="hmob-hud">
            {/* BARRA SUPERIOR COMPACTA: MONEDERO + BOTÓN MAGENTA "?" */}
            <div className="hmob-top-right">
                <button
                    type="button"
                    className="hmob-purse-pill"
                    onClick={ () => { closePopovers(); CreateLinkEvent('catalog/toggle'); } }
                    aria-label="Monedero"
                >
                    <span className="hmob-coin">
                        <LayoutCurrencyIcon type={ -1 } />
                        <span>{ credits }</span>
                    </span>
                    <span className="hmob-coin">
                        <LayoutCurrencyIcon type={ 0 } />
                        <span>{ duckets }</span>
                    </span>
                    <span className="hmob-coin">
                        <LayoutCurrencyIcon type={ 5 } />
                        <span>{ diamonds }</span>
                    </span>
                </button>

                <button
                    type="button"
                    className={ `hmob-help-fab ${ isHelpMenuOpen ? 'open' : '' }` }
                    onClick={ () =>
                    {
                        setMeMenuOpen(false);
                        setSideDrawerOpen(false);
                        setHelpMenuOpen(prev => !prev);
                    } }
                    aria-label="Ayuda y opciones"
                    title="Ayuda y opciones"
                >
                    <span>?</span>
                </button>
            </div>

            {/* MENÚ DESPLEGABLE DEL BOTÓN "?" */}
            { isHelpMenuOpen && (
                <div className="hmob-popover hmob-help-popover">
                    <button type="button" onClick={ () => { closePopovers(); CreateLinkEvent('help/show'); } }>
                        <span>🛟</span> Ayuda y Seguridad
                    </button>
                    <button type="button" onClick={ () => { closePopovers(); CreateLinkEvent('user-settings/toggle'); } }>
                        <span>⚙️</span> Ajustes del Cliente
                    </button>
                    <button type="button" onClick={ toggleSound }>
                        <span>{ isSoundActive ? '🔊' : '🔇' }</span> { isSoundActive ? 'Silenciar Sonido' : 'Activar Sonido' }
                    </button>
                    <button type="button" onClick={ () => { closePopovers(); toggleFullscreen(); } }>
                        <span>⛶</span> Pantalla Completa
                    </button>
                    <button type="button" onClick={ () => { closePopovers(); CreateLinkEvent('games/toggle'); } }>
                        <span>🎮</span> Game Center
                    </button>
                    { isMod && (
                        <button type="button" onClick={ () => { closePopovers(); CreateLinkEvent('mod-tools/toggle'); } }>
                            <span>🛡️</span> Mod Tools
                        </button>
                    ) }
                </div>
            ) }

            {/* BOTÓN LATERAL IZQUIERDO ">" (EXACTO A LA CAPTURA DE HABBO MOBILE) */}
            { isInRoom && (
                <div className={ `hmob-side-tab-wrap ${ isSideDrawerOpen ? 'expanded' : '' }` }>
                    { isSideDrawerOpen && (
                        <div className="hmob-side-drawer">
                            <div className="hmob-drawer-row">
                                <button type="button" onClick={ () => handleZoomDelta(-0.25) } title="Alejar">−</button>
                                <button type="button" onClick={ () => handleZoomDelta(0) } title="100%">1:1</button>
                                <button type="button" onClick={ () => handleZoomDelta(0.25) } title="Acercar">+</button>
                            </div>
                            <button type="button" onClick={ () => { closePopovers(); CreateLinkEvent('navigator/toggle-room-info'); } }>
                                🏠 Info de Sala
                            </button>
                            <button type="button" onClick={ () => { closePopovers(); CreateLinkEvent('chat-history/toggle'); } }>
                                💬 Historial
                            </button>
                            <button type="button" onClick={ () => { closePopovers(); CreateLinkEvent('camera/toggle'); } }>
                                📷 Cámara
                            </button>
                            <button type="button" onClick={ () => { closePopovers(); CreateLinkEvent('games/toggle'); } }>
                                🎮 Game Center
                            </button>
                        </div>
                    ) }
                    <button
                        type="button"
                        className="hmob-side-chevron-btn"
                        onClick={ () =>
                        {
                            setHelpMenuOpen(false);
                            setMeMenuOpen(false);
                            setSideDrawerOpen(prev => !prev);
                        } }
                        aria-label="Herramientas de sala"
                    >
                        <span className={ `hmob-chevron-icon ${ isSideDrawerOpen ? 'flipped' : '' }` }>›</span>
                    </button>
                </div>
            ) }

            {/* TOAST BREVE AL CAMBIAR MODO CAMINAR / MOVER / ZOOM */}
            { modeToast && (
                <div className="hmob-mode-toast">{ modeToast }</div>
            ) }

            {/* BARRA FLOTANTE DE CHAT TÁCTIL (AL PULSAR LA BURBUJA "...") */}
            { isInRoom && isChatBarOpen && (
                <form className="hmob-chat-bar" onSubmit={ handleSendChat }>
                    <button
                        type="button"
                        className={ `hmob-chat-mode-btn mode-${ chatMode }` }
                        onClick={ cycleChatMode }
                        title="Cambiar modo de chat"
                    >
                        { chatMode === 'say' ? 'Hablar' : (chatMode === 'shout' ? 'Gritar' : 'Susurrar') }
                    </button>
                    <input
                        ref={ chatInputRef }
                        type="text"
                        className="hmob-chat-input"
                        placeholder="Escribe un mensaje en la sala..."
                        value={ chatText }
                        maxLength={ 150 }
                        onChange={ e =>
                        {
                            setChatText(e.target.value);
                            setIsTyping?.(e.target.value.length > 0);
                        } }
                    />
                    <button type="submit" className="hmob-chat-send-btn">
                        Enviar
                    </button>
                    <button
                        type="button"
                        className="hmob-chat-close-btn"
                        onClick={ () => setChatBarOpen(false) }
                        aria-label="Cerrar chat"
                    >
                        ✕
                    </button>
                </form>
            ) }

            {/* MENÚ FLOTANTE DEL AVATAR ("YO") */}
            { isMeMenuOpen && (
                <div className="hmob-popover hmob-me-popover">
                    <button type="button" onClick={ () => { closePopovers(); CreateLinkEvent('profile/open'); } }>
                        <span>🪪</span> Mi Perfil
                    </button>
                    <button type="button" onClick={ () => { closePopovers(); CreateLinkEvent('avatar-editor/toggle'); } }>
                        <span>👕</span> Cambiar Look
                    </button>
                    <button type="button" onClick={ () => { closePopovers(); CreateLinkEvent('achievements/toggle'); } }>
                        <span>🏆</span> Recompensas
                        { getTotalUnseen > 0 && <em className="hmob-mini-badge">{ getTotalUnseen }</em> }
                    </button>
                    <button type="button" onClick={ () => { closePopovers(); CreateLinkEvent('games/toggle'); } }>
                        <span>🎮</span> Game Center
                    </button>
                    <button type="button" onClick={ () => { closePopovers(); CreateLinkEvent('battlepass/toggle'); } }>
                        <span>⭐</span> Pase de Batalla
                    </button>
                    <button type="button" onClick={ () => { closePopovers(); CreateLinkEvent('habboUI/open/hccenter'); } }>
                        <span>👑</span> Habbten Club
                    </button>
                </div>
            ) }

            {/* DOCK INFERIOR FLOTANTE ESTILO HABBO MOBILE / AIR */}
            <div className="hmob-bottom-bar">
                <div className="hmob-dock-left">
                    {/* 1. Puerta de Salida / Vista Hotel */}
                    <button
                        type="button"
                        className="hmob-dock-btn"
                        onClick={ () =>
                        {
                            closePopovers();
                            if(isInRoom) VisitDesktop();
                            else CreateLinkEvent('navigator/toggle');
                        } }
                        title={ isInRoom ? 'Salir a la Vista del Hotel' : 'Explorar Salas' }
                    >
                        <svg width="34" height="34" viewBox="0 0 34 34" fill="none" className="hmob-door-svg">
                            <rect x="6" y="4" width="17" height="26" rx="2" fill="#8b4d22" stroke="#ffffff" strokeWidth="2.2" />
                            <rect x="8.5" y="6.5" width="12" height="21" fill="#c97b38" stroke="#3c1d0a" strokeWidth="1.2" />
                            <rect x="10.5" y="9" width="8" height="7" fill="#a85e24" />
                            <rect x="10.5" y="18" width="8" height="7" fill="#a85e24" />
                            <circle cx="11" cy="17" r="1.3" fill="#ffe169" />
                            <path d="M29 17H19M19 17L23.5 12.5M19 17L23.5 21.5" stroke="#ffffff" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M29 17H19M19 17L23.5 12.5M19 17L23.5 21.5" stroke="#e12d68" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>

                    {/* 2. Navegador de Salas */}
                    <button
                        type="button"
                        className="hmob-dock-btn"
                        onClick={ () => { closePopovers(); CreateLinkEvent('navigator/toggle'); } }
                        title="Salas"
                    >
                        <img src={ roomsIconImg } alt="Salas" className="hmob-dock-icon" />
                    </button>

                    {/* 3. Catálogo / Tienda */}
                    <button
                        type="button"
                        className="hmob-dock-btn"
                        onClick={ () => { closePopovers(); CreateLinkEvent('catalog/toggle'); } }
                        title="Tienda"
                    >
                        <img src={ catalogIconImg } alt="Tienda" className="hmob-dock-icon" />
                    </button>

                    {/* 4. Inventario */}
                    <button
                        type="button"
                        className="hmob-dock-btn"
                        onClick={ () => { closePopovers(); CreateLinkEvent('inventory/toggle'); } }
                        title="Inventario"
                    >
                        <img src={ inventoryIconImg } alt="Inventario" className="hmob-dock-icon" />
                        { getFullCount > 0 && <span className="hmob-count-badge">{ getFullCount > 99 ? '99+' : getFullCount }</span> }
                    </button>

                    {/* 5. Amigos */}
                    <button
                        type="button"
                        className="hmob-dock-btn"
                        onClick={ () => { closePopovers(); CreateLinkEvent('friends/toggle'); } }
                        title="Amigos"
                    >
                        <img src={ friendsIconImg } alt="Amigos" className="hmob-dock-icon" />
                        { requests.length > 0 && <span className="hmob-count-badge">{ requests.length }</span> }
                    </button>

                    {/* 6. Mensajes */}
                    <button
                        type="button"
                        className="hmob-dock-btn"
                        onClick={ () => { closePopovers(); OpenMessengerChat(); } }
                        title="Mensajes"
                    >
                        <img src={ hasUnreadMessenger ? messageUnseenIconImg : messageIconImg } alt="Mensajes" className="hmob-dock-icon" />
                    </button>

                    {/* 7. Avatar Circular (Menú "Yo") */}
                    <button
                        type="button"
                        className={ `hmob-avatar-btn ${ isMeMenuOpen ? 'active' : '' }` }
                        onClick={ () =>
                        {
                            setHelpMenuOpen(false);
                            setSideDrawerOpen(false);
                            setMeMenuOpen(prev => !prev);
                        } }
                        title="Mi perfil y menú"
                    >
                        <div className="hmob-avatar-ring">
                            { userFigure && (
                                <LayoutAvatarImageView figure={ userFigure } direction={ 2 } headOnly={ true } />
                            ) }
                        </div>
                        { getTotalUnseen > 0 && <span className="hmob-count-badge">{ getTotalUnseen }</span> }
                    </button>

                    {/* 8. Burbuja de Chat ("...") */}
                    { isInRoom && (
                        <button
                            type="button"
                            className={ `hmob-chat-bubble-btn ${ isChatBarOpen ? 'active' : '' }` }
                            onClick={ () =>
                            {
                                closePopovers();
                                setChatBarOpen(prev => !prev);
                            } }
                            title="Abrir chat"
                            aria-label="Abrir chat"
                        >
                            <span className="hmob-chat-dots">
                                <i /><i /><i />
                            </span>
                        </button>
                    ) }
                </div>

                {/* DERECHA: SWITCH CAMINAR (HUELLAS) / MOVER SALA (MANO) */}
                { isInRoom && (
                    <div className="hmob-touch-switch" role="group" aria-label="Modo táctil">
                        <button
                            type="button"
                            className={ `hmob-switch-btn ${ touchMode === 'walk' ? 'active' : '' }` }
                            onClick={ () => handleSwitchTouchMode('walk') }
                            title="Modo Caminar"
                            aria-label="Modo Caminar"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <ellipse cx="8.5" cy="11.5" rx="2.6" ry="4.8" />
                                <circle cx="8.5" cy="18.2" r="1.9" />
                                <ellipse cx="15.5" cy="9.5" rx="2.6" ry="4.8" />
                                <circle cx="15.5" cy="16.2" r="1.9" />
                            </svg>
                        </button>
                        <button
                            type="button"
                            className={ `hmob-switch-btn ${ touchMode === 'pan' ? 'active' : '' }` }
                            onClick={ () => handleSwitchTouchMode('pan') }
                            title="Modo Mover Cámara"
                            aria-label="Modo Mover Cámara"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M10.5 3a1.2 1.2 0 0 1 1.2 1.2V11h.8V3.8a1.2 1.2 0 1 1 2.4 0V11h.8V5.2a1.2 1.2 0 1 1 2.4 0v7.5c0 4.3-2.6 7.3-6.5 7.3-3.1 0-5.4-1.8-6.6-4.7l-1.7-4.1a1.3 1.3 0 0 1 2.3-1.2l1.6 2.5V5.2a1.2 1.2 0 1 1 2.4 0V11h.9V4.2A1.2 1.2 0 0 1 10.5 3Z" />
                            </svg>
                        </button>
                    </div>
                ) }
            </div>
        </div>
    );
};
