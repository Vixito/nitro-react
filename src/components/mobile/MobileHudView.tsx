import { NitroSettingsEvent, RoomObjectCategory, RoomUnitWalkComposer, UserSettingsEvent, UserSettingsSoundComposer } from '@nitrots/nitro-renderer';
import { FC, FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { ChatMessageTypeEnum, CreateLinkEvent, DispatchMainEvent, GetRoomEngine, GetRoomSession, GetSessionDataManager, GetUserProfile, MessengerIconState, OpenMessengerChat, SendMessageComposer, TryVisitRoom, VisitDesktop } from '../../api';
import iconAchievements from '../../assets/images/eras/flash2012/memenu/achievements_color.png';
import iconClothes from '../../assets/images/eras/flash2012/memenu/clothes_color.png';
import iconProfile from '../../assets/images/eras/flash2012/memenu/profile_color.png';
import iconRooms from '../../assets/images/eras/flash2012/memenu/rooms_color.png';
import iconSettings from '../../assets/images/eras/flash2012/memenu/settings_color.png';
import iconSoundOff from '../../assets/images/eras/flash2012/memenu/sound_off_color.png';
import iconSoundOn from '../../assets/images/eras/flash2012/memenu/sound_on_color.png';
import iconTalents from '../../assets/images/eras/flash2012/memenu/talents_color.png';
import mobChatBubbleImg from '../../assets/images/mobile/mob_chat_bubble.png';
import mobExitImg from '../../assets/images/mobile/mob_exit.png';
import mobFriendsImg from '../../assets/images/mobile/mob_friends.png';
import mobHelpImg from '../../assets/images/mobile/mob_help.png';
import mobInventoryImg from '../../assets/images/mobile/mob_inventory.png';
import mobMessengerImg from '../../assets/images/mobile/mob_messenger.png';
import mobNavigatorImg from '../../assets/images/mobile/mob_navigator.png';
import mobShopImg from '../../assets/images/mobile/mob_shop.png';
import iconCamera from '../../assets/images/toolbar/icons/camera.png';
import iconGame from '../../assets/images/toolbar/icons/game.png';
import iconHabboClub from '../../assets/images/toolbar/icons/habbo.png';
import iconChatHistory from '../../assets/images/toolbar/icons/me-menu/chat-history.png';
import iconHelp from '../../assets/images/toolbar/icons/me-menu/helper-tool.png';
import iconModTools from '../../assets/images/toolbar/icons/modtools.png';
import { LayoutCurrencyIcon } from '../../common';
import { useAchievements, useChatInputWidget, useFriends, useInventoryUnseenTracker, useMessageEvent, useMessenger, useNavigator, usePurse, useRoom, useSessionInfo } from '../../hooks';
import { useMobileTouchMode } from '../../hooks/mobile/useIsMobile';
import { HabboHeadImg } from '../game-center/views/SnowStormAvatar';
import { MobileJoystick, JoystickPhase } from './MobileJoystick';
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
    const { navigatorData = null } = useNavigator();
    const { roomSession = null } = useRoom();
    const { sendChat = null, setIsTyping = null, setIsIdle = null } = useChatInputWidget();
    const [ touchMode, setTouchMode ] = useMobileTouchMode();
    const joyDirRef = useRef<{ dx: number; dy: number } | null>(null);
    const joyIntervalRef = useRef<number | null>(null);
    const joyLastSentRef = useRef<{ x: number; y: number; at: number }>({ x: -999, y: -999, at: 0 });
    const joyWasMovingRef = useRef<boolean>(false);

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

    const getMyAvatarTile = useCallback((): { x: number; y: number; roomId: number } | null =>
    {
        const activeSession = roomSession || GetRoomSession();
        const engine = GetRoomEngine();
        const userSession = GetSessionDataManager();
        if(!activeSession || !engine || !userSession) return null;

        const roomId = activeSession.roomId;
        const udm = activeSession.userDataManager;
        const userData = udm?.getUserData?.(userSession.userId)
            || udm?.getDataByType?.(userSession.userId, 1)
            || udm?.getUserDataByName?.(userSession.userName);
        if(!userData) return null;

        const unitObj = engine.getRoomObject(roomId, userData.roomIndex, RoomObjectCategory.UNIT);
        if(!unitObj) return null;

        const loc = unitObj.getLocation();
        if(!loc) return null;

        return { x: Math.round(loc.x), y: Math.round(loc.y), roomId };
    }, [ roomSession ]);

    const sendContinuousWalk = useCallback((dx: number, dy: number, maxSteps: number) =>
    {
        const pos = getMyAvatarTile();
        if(!pos) return;

        const engine = GetRoomEngine();
        const hmap = engine?.getFurnitureStackingHeightMap?.(pos.roomId);
        let targetX = pos.x + dx;
        let targetY = pos.y + dy;

        if(maxSteps > 1 && hmap && typeof hmap.validateLocation === 'function')
        {
            const baseH = hmap.getTileHeight(pos.x, pos.y);
            let bestK = 0;

            for(let k = 1; k <= maxSteps; k++)
            {
                const tx = pos.x + dx * k;
                const ty = pos.y + dy * k;
                if(tx < 0 || ty < 0 || tx >= hmap.width || ty >= hmap.height) break;
                if(!hmap.validateLocation(tx, ty, 1, 1, 0, 0, 0, 0, false, baseH)) break;
                bestK = k;
            }

            if(bestK > 0)
            {
                targetX = pos.x + dx * bestK;
                targetY = pos.y + dy * bestK;
            }
        }
        else if(maxSteps > 1)
        {
            targetX = Math.max(0, pos.x + dx * maxSteps);
            targetY = Math.max(0, pos.y + dy * maxSteps);
        }

        if(targetX < 0 || targetY < 0) return;

        joyLastSentRef.current = { x: targetX, y: targetY, at: Date.now() };
        joyWasMovingRef.current = true;
        SendMessageComposer(new RoomUnitWalkComposer(targetX, targetY));
    }, [ getMyAvatarTile ]);

    const stopJoystickWalk = useCallback(() =>
    {
        if(joyIntervalRef.current)
        {
            window.clearInterval(joyIntervalRef.current);
            joyIntervalRef.current = null;
        }
        joyDirRef.current = null;
        joyWasMovingRef.current = false;
    }, []);

    const handleRoomJoystickVector = useCallback((nx: number, ny: number, phase: JoystickPhase) =>
    {
        if(phase === 'end' || (nx === 0 && ny === 0))
        {
            stopJoystickWalk();
            return;
        }

        const deg = (Math.atan2(ny, nx) * 180) / Math.PI;
        let dx = 0;
        let dy = 0;

        if(deg >= -22.5 && deg < 22.5) { dx = 1; dy = -1; }           // → Derecha
        else if(deg >= 22.5 && deg < 67.5) { dx = 1; dy = 0; }        // ↘ Abajo-derecha
        else if(deg >= 67.5 && deg < 112.5) { dx = 1; dy = 1; }       // ↓ Abajo
        else if(deg >= 112.5 && deg < 157.5) { dx = 0; dy = 1; }      // ↙ Abajo-izquierda
        else if(deg >= 157.5 || deg < -157.5) { dx = -1; dy = 1; }    // ← Izquierda
        else if(deg >= -157.5 && deg < -112.5) { dx = -1; dy = 0; }   // ↖ Arriba-izquierda
        else if(deg >= -112.5 && deg < -67.5) { dx = -1; dy = -1; }   // ↑ Arriba
        else { dx = 0; dy = -1; }                                     // ↗ Arriba-derecha

        const prev = joyDirRef.current;
        const dirChanged = !prev || prev.dx !== dx || prev.dy !== dy;
        joyDirRef.current = { dx, dy };

        // Quick tap -> exactly 1 tile so user can step 1-by-1 cleanly AND stops immediately when released
        if(phase === 'start')
        {
            sendContinuousWalk(dx, dy, 1);
        }
        else if(dirChanged && (Date.now() - joyLastSentRef.current.at) >= 510)
        {
            sendContinuousWalk(dx, dy, 2);
        }

        // While held/dragged -> refresh 2 tiles ahead every 520ms (matches Arcturus 500ms walk rate limit for zero pauses & instant stop on release!)
        if(!joyIntervalRef.current)
        {
            joyIntervalRef.current = window.setInterval(() =>
            {
                const cur = joyDirRef.current;
                if(cur) sendContinuousWalk(cur.dx, cur.dy, 2);
            }, 520);
        }
    }, [ sendContinuousWalk, stopJoystickWalk ]);

    useEffect(() =>
    {
        if(!isInRoom)
        {
            stopJoystickWalk();
            setChatBarOpen(false);
            setSideDrawerOpen(false);
        }
        return () => stopJoystickWalk();
    }, [ isInRoom, stopJoystickWalk ]);

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
            {/* BARRA SUPERIOR DERECHA: MONEDERO COMPACTO + BOTÓN ORIGINAL "?" */}
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
                    <img src={ mobHelpImg } alt="?" className="hmob-help-sprite" />
                </button>
            </div>

            {/* MENÚ DESPLEGABLE DEL BOTÓN "?" (SIN EMOJIS — ÍCONOS PIXEL-ART OFICIALES) */}
            { isHelpMenuOpen && (
                <div className="hmob-popover hmob-help-popover">
                    <button type="button" onClick={ () => { closePopovers(); CreateLinkEvent('help/show'); } }>
                        <span className="hmob-menu-ico"><img src={ iconHelp } alt="" /></span>
                        <span>Ayuda y Seguridad</span>
                    </button>
                    <button type="button" onClick={ () => { closePopovers(); CreateLinkEvent('user-settings/toggle'); } }>
                        <span className="hmob-menu-ico"><img src={ iconSettings } alt="" /></span>
                        <span>Ajustes del Cliente</span>
                    </button>
                    <button type="button" onClick={ toggleSound }>
                        <span className="hmob-menu-ico"><img src={ isSoundActive ? iconSoundOn : iconSoundOff } alt="" /></span>
                        <span>{ isSoundActive ? 'Silenciar Sonido' : 'Activar Sonido' }</span>
                    </button>
                    <button type="button" onClick={ () => { closePopovers(); CreateLinkEvent('games/toggle'); } }>
                        <span className="hmob-menu-ico"><img src={ iconGame } alt="" /></span>
                        <span>Game Center</span>
                    </button>
                    <button
                        type="button"
                        onClick={ () =>
                        {
                            closePopovers();
                            try
                            {
                                if((window as any).HabbtenNative && typeof (window as any).HabbtenNative.returnToAccountPicker === 'function')
                                {
                                    (window as any).HabbtenNative.returnToAccountPicker();
                                    return;
                                }
                                if(window.parent && window.parent !== window)
                                {
                                    window.parent.postMessage({ type: 'habbten-mobile-exit-to-app' }, '*');
                                    return;
                                }
                            }
                            catch
                            {
                                // ignore
                            }
                            window.location.href = '/logout';
                        } }
                    >
                        <span className="hmob-menu-ico"><img src={ mobExitImg } alt="" /></span>
                        <span>Cambiar Cuenta / Salir</span>
                    </button>
                    { isMod && (
                        <button type="button" onClick={ () => { closePopovers(); CreateLinkEvent('mod-tools/toggle'); } }>
                            <span className="hmob-menu-ico"><img src={ iconModTools } alt="" /></span>
                            <span>Mod Tools</span>
                        </button>
                    ) }
                </div>
            ) }

            {/* BOTÓN LATERAL IZQUIERDO ">" (EXACTO A HABBO MOBILE, SIN SOLAPARSE CON ROOM TOOLS) */}
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
                                <span className="hmob-menu-ico"><img src={ iconRooms } alt="" /></span>
                                <span>Info de Sala</span>
                            </button>
                            <button type="button" onClick={ () => { closePopovers(); CreateLinkEvent('chat-history/toggle'); } }>
                                <span className="hmob-menu-ico"><img src={ iconChatHistory } alt="" /></span>
                                <span>Historial</span>
                            </button>
                            <button type="button" onClick={ () => { closePopovers(); CreateLinkEvent('camera/toggle'); } }>
                                <span className="hmob-menu-ico"><img src={ iconCamera } alt="" /></span>
                                <span>Cámara</span>
                            </button>
                            <button type="button" onClick={ () => { closePopovers(); CreateLinkEvent('games/toggle'); } }>
                                <span className="hmob-menu-ico"><img src={ iconGame } alt="" /></span>
                                <span>Game Center</span>
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

            {/* JOYSTICK MÓVIL ANALÓGICO 360° PARA CAMINAR EN SALA (CONFIGURABLE EN AJUSTES) */}
            { isInRoom && (
                <MobileJoystick onVectorChange={ handleRoomJoystickVector } />
            ) }

            {/* TOAST BREVE AL CAMBIAR MODO CAMINAR / MOVER / ZOOM */}
            { modeToast && (
                <div className="hmob-mode-toast">{ modeToast }</div>
            ) }

            {/* BARRA FLOTANTE DE CHAT TÁCTIL */}
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

            {/* MENÚ FLOTANTE DEL AVATAR ("YO" — SIN EMOJIS, SOLO ÍCONOS HABBO REALES) */}
            { isMeMenuOpen && (
                <div className="hmob-popover hmob-me-popover">
                    <button type="button" onClick={ () => { closePopovers(); GetUserProfile(GetSessionDataManager().userId); } }>
                        <span className="hmob-menu-ico"><img src={ iconProfile } alt="" /></span>
                        <span>Mi Perfil</span>
                    </button>
                    <button type="button" onClick={ () => { closePopovers(); CreateLinkEvent('avatar-editor/toggle'); } }>
                        <span className="hmob-menu-ico"><img src={ iconClothes } alt="" /></span>
                        <span>Cambiar Look</span>
                    </button>
                    <button type="button" onClick={ () => { closePopovers(); CreateLinkEvent('achievements/toggle'); } }>
                        <span className="hmob-menu-ico"><img src={ iconAchievements } alt="" /></span>
                        <span>Recompensas</span>
                        { getTotalUnseen > 0 && <em className="hmob-mini-badge">{ getTotalUnseen }</em> }
                    </button>
                    <button type="button" onClick={ () => { closePopovers(); CreateLinkEvent('games/toggle'); } }>
                        <span className="hmob-menu-ico"><img src={ iconGame } alt="" /></span>
                        <span>Game Center</span>
                    </button>
                    <button type="button" onClick={ () => { closePopovers(); CreateLinkEvent('battlepass/toggle'); } }>
                        <span className="hmob-menu-ico"><img src={ iconTalents } alt="" /></span>
                        <span>Pase de Batalla</span>
                    </button>
                    <button type="button" onClick={ () => { closePopovers(); CreateLinkEvent('habboUI/open/hccenter'); } }>
                        <span className="hmob-menu-ico"><img src={ iconHabboClub } alt="" /></span>
                        <span>Habbten Club</span>
                    </button>
                </div>
            ) }

            {/* DOCK INFERIOR FLOTANTE CON LOS SPRITES ORIGINALES DE HABBO MOBILE */}
            <div className="hmob-bottom-bar">
                <div className="hmob-dock-left">
                    {/* 1. Puerta de Salida (en sala) / Ir a mi Sala Recibidor (en vista del hotel) */}
                    <button
                        type="button"
                        className="hmob-dock-btn"
                        onClick={ () =>
                        {
                            closePopovers();
                            if(isInRoom)
                            {
                                VisitDesktop();
                            }
                            else if(navigatorData && navigatorData.homeRoomId > 0)
                            {
                                TryVisitRoom(navigatorData.homeRoomId);
                            }
                            else
                            {
                                CreateLinkEvent('navigator/toggle');
                            }
                        } }
                        title={ isInRoom ? 'Salir a la Vista del Hotel' : 'Ir a mi sala principal' }
                    >
                        <img src={ mobExitImg } alt={ isInRoom ? 'Salir' : 'Mi sala' } className="hmob-dock-sprite" />
                    </button>

                    {/* 2. Navegador de Salas */}
                    <button
                        type="button"
                        className="hmob-dock-btn"
                        onClick={ () => { closePopovers(); CreateLinkEvent('navigator/toggle'); } }
                        title="Salas"
                    >
                        <img src={ mobNavigatorImg } alt="Salas" className="hmob-dock-sprite" />
                    </button>

                    {/* 3. Catálogo / Tienda */}
                    <button
                        type="button"
                        className="hmob-dock-btn"
                        onClick={ () => { closePopovers(); CreateLinkEvent('catalog/toggle'); } }
                        title="Tienda"
                    >
                        <img src={ mobShopImg } alt="Tienda" className="hmob-dock-sprite" />
                    </button>

                    {/* 4. Inventario */}
                    <button
                        type="button"
                        className="hmob-dock-btn"
                        onClick={ () => { closePopovers(); CreateLinkEvent('inventory/toggle'); } }
                        title="Inventario"
                    >
                        <img src={ mobInventoryImg } alt="Inventario" className="hmob-dock-sprite" />
                        { getFullCount > 0 && <span className="hmob-count-badge">{ getFullCount > 99 ? '99+' : getFullCount }</span> }
                    </button>

                    {/* 5. Amigos */}
                    <button
                        type="button"
                        className="hmob-dock-btn"
                        onClick={ () => { closePopovers(); CreateLinkEvent('friends/toggle'); } }
                        title="Amigos"
                    >
                        <img src={ mobFriendsImg } alt="Amigos" className="hmob-dock-sprite" />
                        { requests.length > 0 && <span className="hmob-count-badge">{ requests.length }</span> }
                    </button>

                    {/* 6. Mensajes */}
                    <button
                        type="button"
                        className={ `hmob-dock-btn ${ hasUnreadMessenger ? 'is-pulsing' : '' }` }
                        onClick={ () => { closePopovers(); OpenMessengerChat(); } }
                        title="Mensajes"
                    >
                        <img src={ mobMessengerImg } alt="Mensajes" className="hmob-dock-sprite" />
                        { hasUnreadMessenger && <span className="hmob-count-badge">!</span> }
                    </button>

                    {/* 7. Avatar Circular (Cabeza recortada y centrada) */}
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
                                <HabboHeadImg figure={ userFigure } size={ 34 } smallScale={ false } />
                            ) }
                        </div>
                        { getTotalUnseen > 0 && <span className="hmob-count-badge">{ getTotalUnseen }</span> }
                    </button>

                    {/* 8. Burbuja de Chat ("...") original */}
                    { isInRoom && (
                        <button
                            type="button"
                            className={ `hmob-chat-sprite-btn ${ isChatBarOpen ? 'active' : '' }` }
                            onClick={ () =>
                            {
                                closePopovers();
                                setChatBarOpen(prev => !prev);
                            } }
                            title="Abrir chat"
                            aria-label="Abrir chat"
                        >
                            <img src={ mobChatBubbleImg } alt="Chat" className="hmob-chat-sprite" />
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
