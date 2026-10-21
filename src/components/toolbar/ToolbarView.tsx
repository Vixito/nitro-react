import { Dispose, DropBounce, EaseOut, ILinkEventTracker, JumpBy, Motions, NitroSettingsEvent, NitroToolbarAnimateIconEvent, PerkAllowancesMessageEvent, PerkEnum, Queue, UserSettingsEvent, UserSettingsSoundComposer, Wait } from '@nitrots/nitro-renderer';
import { FC, useState, useRef, useEffect } from 'react';
import { AddEventLinkTracker, CreateLinkEvent, DispatchMainEvent, GetConfiguration, GetSessionDataManager, MessengerIconState, OpenMessengerChat, RemoveLinkEventTracker, SendMessageComposer, VisitDesktop } from '../../api';
import { Base, Flex, LayoutAvatarImageView, LayoutItemCountView, TransitionAnimation, TransitionAnimationTypes } from '../../common';
import { useAchievements, useFriends, useInventoryUnseenTracker, useMessageEvent, useMessenger, useRoomEngineEvent, useSessionInfo } from '../../hooks';
import { useEraTheme } from '../../hooks/era/useEraTheme';
import { ToolbarMeView } from './ToolbarMeView';

export const ToolbarView: FC<{ isInRoom: boolean }> = props =>
{
    const { isInRoom } = props;
    const { currentEra } = useEraTheme();
    const [ isMeExpanded, setMeExpanded ] = useState(false);
    const [ useGuideTool, setUseGuideTool ] = useState(false);
    const { userFigure = null } = useSessionInfo();
    const { getFullCount = 0 } = useInventoryUnseenTracker();
    const { getTotalUnseen = 0 } = useAchievements();
    const { requests = [] } = useFriends();
    const { iconState = MessengerIconState.HIDDEN } = useMessenger();
    const isMod = GetSessionDataManager() ? GetSessionDataManager().isModerator : false;
    
    const [isPlayingRadio, setIsPlayingRadio] = useState(false);
    const [isSoundActive, setIsSoundActive] = useState(true);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [radioVolume, setRadioVolume] = useState(0.5);

    const [ habbtenConfig, setHabbtenConfig ] = useState<any>(() => {
        try {
            return (window.parent as any)?.HabbtenConfig || (window as any)?.HabbtenConfig || null;
        } catch(e) {
            return (window as any)?.HabbtenConfig || null;
        }
    });
    const radioUrl = habbtenConfig?.radio?.url;
    const isGameCenterEnabled = habbtenConfig?.client ? (habbtenConfig.client.toolbar_icons?.game_center === true) : (habbtenConfig?.toolbar_icons?.game_center === true);

    useEffect(() =>
    {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) =>
            {
                const parts = url.split('/');
                if(parts.length < 2) return;

                switch(parts[1])
                {
                    case 'memenu':
                    case 'me':
                    case 'toggle-me':
                    case 'toggle':
                        setMeExpanded(prev => !prev);
                        return;
                    case 'show-me':
                    case 'show':
                    case 'open':
                        setMeExpanded(true);
                        return;
                    case 'hide-me':
                    case 'hide':
                    case 'close':
                        setMeExpanded(false);
                        return;
                }
            },
            eventUrlPrefix: 'toolbar/'
        };

        const linkTrackerAlias: ILinkEventTracker = {
            ...linkTracker,
            eventUrlPrefix: 'memenu/'
        };

        AddEventLinkTracker(linkTracker);
        AddEventLinkTracker(linkTrackerAlias);

        return () => {
            RemoveLinkEventTracker(linkTracker);
            RemoveLinkEventTracker(linkTrackerAlias);
        };
    }, []);
    
    useEffect(() => {
        const updateConfig = (e?: any) => {
            let cfg = e?.detail;
            if(!cfg) {
                try {
                    cfg = (window.parent as any)?.HabbtenConfig || (window as any)?.HabbtenConfig;
                } catch(err) {
                    cfg = (window as any)?.HabbtenConfig;
                }
            }
            if (cfg) setHabbtenConfig({ ...cfg });
        };
        updateConfig();
        window.addEventListener('habbten-config-updated', updateConfig);
        const interval = setInterval(updateConfig, 2000);
        return () => {
            window.removeEventListener('habbten-config-updated', updateConfig);
            clearInterval(interval);
        };
    }, []);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = radioVolume;
        }
    }, [radioVolume]);

    const toggleRadio = () => {
        if (audioRef.current && radioUrl) {
            if (isPlayingRadio) {
                audioRef.current.pause();
                // Reset source to avoid downloading in background
                audioRef.current.src = "";
            } else {
                audioRef.current.src = radioUrl;
                audioRef.current.play().catch(e => console.error("Radio play failed:", e));
            }
            setIsPlayingRadio(!isPlayingRadio);
        }
    };

    const toggleSound = () => {
        const nextState = !isSoundActive;
        setIsSoundActive(nextState);

        const volume = nextState ? 100 : 0;
        try {
            const settings = new NitroSettingsEvent();
            settings.volumeSystem = volume;
            settings.volumeFurni = volume;
            settings.volumeTrax = volume;
            DispatchMainEvent(settings);
            SendMessageComposer(new UserSettingsSoundComposer(volume, volume, volume));
        } catch (e) {}
    };

    useMessageEvent<UserSettingsEvent>(UserSettingsEvent, event => {
        const parser = event.getParser();
        const isMuted = (parser.volumeSystem === 0 && parser.volumeFurni === 0 && parser.volumeTrax === 0);
        setIsSoundActive(!isMuted);
    });
    
    useMessageEvent<PerkAllowancesMessageEvent>(PerkAllowancesMessageEvent, event =>
    {
        const parser = event.getParser();

        setUseGuideTool(parser.isAllowed(PerkEnum.USE_GUIDE_TOOL));
    });

    useRoomEngineEvent<NitroToolbarAnimateIconEvent>(NitroToolbarAnimateIconEvent.ANIMATE_ICON, event =>
    {
        const animationIconToToolbar = (iconName: string, image: HTMLImageElement, x: number, y: number) =>
        {
            const target = (document.body.getElementsByClassName(iconName)[0] as HTMLElement);

            if(!target) return;
            
            image.className = 'toolbar-icon-animation';
            image.style.visibility = 'visible';
            image.style.left = (x + 'px');
            image.style.top = (y + 'px');

            document.body.append(image);

            const targetBounds = target.getBoundingClientRect();
            const imageBounds = image.getBoundingClientRect();

            const left = (imageBounds.x - targetBounds.x);
            const top = (imageBounds.y - targetBounds.y);
            const squared = Math.sqrt(((left * left) + (top * top)));
            const wait = (500 - Math.abs(((((1 / squared) * 100) * 500) * 0.5)));
            const height = 20;

            const motionName = (`ToolbarBouncing[${ iconName }]`);

            if(!Motions.getMotionByTag(motionName))
            {
                Motions.runMotion(new Queue(new Wait((wait + 8)), new DropBounce(target, 400, 12))).tag = motionName;
            }

            const motion = new Queue(new EaseOut(new JumpBy(image, wait, ((targetBounds.x - imageBounds.x) + height), (targetBounds.y - imageBounds.y), 100, 1), 1), new Dispose(image));

            Motions.runMotion(motion);
        }

        animationIconToToolbar('icon-inventory', event.image, event.x, event.y);
    });

    if(currentEra === 'flash2012')
    {
        return (
            <>
                <TransitionAnimation type={ TransitionAnimationTypes.FADE_IN } inProp={ isMeExpanded } timeout={ 300 }>
                    <ToolbarMeView useGuideTool={ useGuideTool } unseenAchievementCount={ getTotalUnseen } setMeExpanded={ setMeExpanded } />
                </TransitionAnimation>

                {/* Auténtica Barra Lateral Vertical 2012 Flash */}
                <div className="nitro-toolbar toolbar-flash2012">
                    <div className="toolbar-capsule">
                        { isInRoom ? (
                            <div className="navigation-item item-hotel icon-habbo" title="Vista del Hotel" onClick={ () => VisitDesktop() }>
                                <i className="toolbar-icon icon-habbo" />
                                <span className="avatar-label">Hotel</span>
                            </div>
                        ) : (
                            <div className="navigation-item item-hotel icon-house" title="Mi Sala" onClick={ () => CreateLinkEvent('navigator/goto/home') }>
                                <i className="toolbar-icon icon-house" />
                                <span className="avatar-label">Mi Sala</span>
                            </div>
                        )}
                        <div className="toolbar-divider" />
                        <div className="navigation-item item-rooms icon-rooms" title="Navegador de Salas" onClick={ () => CreateLinkEvent('navigator/toggle') }>
                            <i className="toolbar-icon icon-rooms" />
                            <span className="avatar-label">Salas</span>
                        </div>
                        <div className="toolbar-divider" />
                        <div className="navigation-item item-friends icon-friendall" title="Amigos" onClick={ () => CreateLinkEvent('friends/toggle') }>
                            <i className="toolbar-icon icon-friendall" />
                            { (requests.length > 0) && <LayoutItemCountView count={ requests.length } /> }
                            <span className="avatar-label">Amigos</span>
                        </div>
                        { ((iconState === MessengerIconState.SHOW) || (iconState === MessengerIconState.UNREAD)) && (
                            <>
                                <div className="toolbar-divider" />
                                <div className={ `navigation-item item-message icon-message ${ (iconState === MessengerIconState.UNREAD) ? 'is-unseen' : '' }` } title="Mensajes" onClick={ () => OpenMessengerChat() }>
                                    <i className="toolbar-icon icon-message" />
                                    <span className="avatar-label">Chat</span>
                                </div>
                            </>
                        )}
                        <div className="toolbar-divider" />
                        <div className="navigation-item item-catalog icon-catalog" title="Tienda de Habbten" onClick={ () => CreateLinkEvent('catalog/toggle') }>
                            <i className="toolbar-icon icon-catalog" />
                            <span className="avatar-label">Tienda</span>
                        </div>
                        <div className="toolbar-divider" />
                        <div className="navigation-item item-inventory icon-inventory" title="Inventario" onClick={ () => CreateLinkEvent('inventory/toggle') }>
                            <i className="toolbar-icon icon-inventory" />
                            { (getFullCount > 0) && <LayoutItemCountView count={ getFullCount } /> }
                            <span className="avatar-label">Objetos</span>
                        </div>
                        { isMod && (
                            <>
                                <div className="toolbar-divider" />
                                <div className="navigation-item item-modtools icon-modtools" title="Herramientas de Moderación" onClick={ () => CreateLinkEvent('mod-tools/toggle') }>
                                    <i className="toolbar-icon icon-modtools" />
                                    <span className="avatar-label">Mod</span>
                                </div>
                            </>
                        )}
                        { isInRoom && (
                            <>
                                <div className="toolbar-divider" />
                                <div className="navigation-item item-camera icon-camera" title="Cámara" onClick={ () => CreateLinkEvent('camera/toggle') }>
                                    <i className="toolbar-icon icon-camera" />
                                    <span className="avatar-label">Cámara</span>
                                </div>
                            </>
                        )}
                        <div className="toolbar-divider" />
                        <div className={ `navigation-item item-avatar ${ isMeExpanded ? 'active ' : '' }` } title="Mi Personaje" onClick={ () => setMeExpanded(!isMeExpanded) }>
                            <div className="avatar-circle">
                                <LayoutAvatarImageView figure={ userFigure } direction={ 2 } headOnly={ true } />
                            </div>
                            { (getTotalUnseen > 0) && <LayoutItemCountView count={ getTotalUnseen } /> }
                            <span className="avatar-label">Yo</span>
                        </div>
                    </div>
                </div>

                {/* Floating Bottom Left Chat Input Container (2012 Flash) */}
                <div id="toolbar-chat-input-container" className="chat-container-flash2012" />

                <div id="toolbar-friend-bar-container" className="d-none" />
            </>
        );
    }

    if(currentEra === 'shockwave2006')
    {
        return (
            <>
                <TransitionAnimation type={ TransitionAnimationTypes.FADE_IN } inProp={ isMeExpanded } timeout={ 300 }>
                    <ToolbarMeView useGuideTool={ useGuideTool } unseenAchievementCount={ getTotalUnseen } setMeExpanded={ setMeExpanded } />
                </TransitionAnimation>

                {/* Auténtica Barra Inferior Shockwave 2006 (Habbten v14 / Origins) */}
                <div className="nitro-toolbar toolbar-shockwave2006">
                    <div className="toolbar-inner">
                        {/* GRUPO IZQUIERDO: Avatar + Barra de Chat */}
                        <div className="toolbar-left-group">
                            <div className={ `navigation-item item-avatar ${ isMeExpanded ? 'active ' : '' }` } title="Mi Personaje" onClick={ () => setMeExpanded(!isMeExpanded) }>
                                <LayoutAvatarImageView figure={ userFigure } direction={ 3 } headDirection={ 3 } headOnly={ true } classNames={ ['shockwave-avatar-head'] } />
                                { (getTotalUnseen > 0) && <LayoutItemCountView count={ getTotalUnseen } /> }
                            </div>

                            {/* Chat input integrado como cápsula clásica en la izquierda */}
                            <div id="toolbar-chat-input-container" className="chat-container-shockwave2006" />
                        </div>

                        {/* GRUPO DERECHO: Iconos oficiales v14 (Origins 1:1) */}
                        <div className="toolbar-right-group">
                            {/* 1. Consola (Consola amarilla v14) */}
                            <div className="navigation-item item-console" title="Consola" onClick={ () => CreateLinkEvent('friends/toggle') }>
                                <i className="toolbar-icon icon-friendall" />
                                { (requests.length > 0) && <LayoutItemCountView count={ requests.length } /> }
                            </div>

                            {/* 2. Navegador de Salas (Estrella dorada con ventana azul v14) */}
                            <div className="navigation-item item-rooms" title="Navegador de Salas" onClick={ () => CreateLinkEvent('navigator/toggle') }>
                                <i className="toolbar-icon icon-rooms" />
                            </div>

                            {/* 3. Habbten Club (Portapapeles con sello oficial v14) */}
                            <div className="navigation-item item-club" title="Habbten Club" onClick={ () => CreateLinkEvent('habboUI/toggle/hccenter') }>
                                <i className="toolbar-icon icon-club" />
                            </div>

                            {/* 4. Monedero -> Tienda / Catálogo sin bugs */}
                            <div className="navigation-item item-credits" title="Tienda de Habbten" onClick={ () => CreateLinkEvent('catalog/toggle') }>
                                <i className="toolbar-icon icon-credits" />
                            </div>

                            {/* 5. Folleto blanco con silla -> Pase de Batalla */}
                            <div className="navigation-item item-catalog" title="Pase de Batalla" onClick={ () => CreateLinkEvent('battlepass/toggle') }>
                                <i className="toolbar-icon icon-catalog" />
                            </div>

                            {/* 6. Mano / Inventario (Mano abierta v14) */}
                            <div className="navigation-item item-inventory" title="Mano" onClick={ () => CreateLinkEvent('inventory/toggle') }>
                                <i className="toolbar-icon icon-inventory" />
                                { (getFullCount > 0) && <LayoutItemCountView count={ getFullCount } /> }
                            </div>

                            {/* 7. Ayuda y Sonido del Juego con alternancia clara Activado / Desactivado */}
                            <div className="toolbar-help-sound-column">
                                <div className="navigation-item item-help" title="Ayuda" onClick={ () => CreateLinkEvent('help/toggle') }>
                                    <i className="toolbar-icon icon-help" />
                                </div>
                                <div className={ `navigation-item item-sound ${ isSoundActive ? 'active' : 'muted' }` } title={ isSoundActive ? 'Sonido: Activado (Clic para silenciar)' : 'Sonido: Silenciado (Clic para activar)' } onClick={ toggleSound }>
                                    <i className={ `toolbar-icon icon-sound ${ isSoundActive ? 'active' : 'muted' }` } />
                                </div>
                            </div>

                            {/* 8. Mod Tools (si es staff) */}
                            { isMod && (
                                <div className="navigation-item item-modtools" title="Herramientas de Moderación" onClick={ () => CreateLinkEvent('mod-tools/toggle') }>
                                    <i className="toolbar-icon icon-modtools" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div id="toolbar-friend-bar-container" className="d-none" />
            </>
        );
    }

    return (
        <>
            <TransitionAnimation type={ TransitionAnimationTypes.FADE_IN } inProp={ isMeExpanded } timeout={ 300 }>
                <ToolbarMeView useGuideTool={ useGuideTool } unseenAchievementCount={ getTotalUnseen } setMeExpanded={ setMeExpanded } />
            </TransitionAnimation>
            <Flex alignItems="center" justifyContent="between" gap={ 2 } className="nitro-toolbar py-1 px-3">
                <Flex gap={ 2 } alignItems="center">
                    <Flex alignItems="center" gap={ 2 }>
                        <Flex center pointer title="Mi Personaje" className={ 'navigation-item item-avatar ' + (isMeExpanded ? 'active ' : '') } onClick={ event => setMeExpanded(!isMeExpanded) }>
                            <LayoutAvatarImageView figure={ userFigure } direction={ 2 } position="absolute" />
                            { (getTotalUnseen > 0) &&
                                <LayoutItemCountView count={ getTotalUnseen } /> }
                        </Flex>
                        { isInRoom &&
                            <Base pointer title="Vista del Hotel" className="navigation-item icon icon-habbo" onClick={ event => VisitDesktop() } /> }
                        { !isInRoom &&
                            <Base pointer title="Mi Sala" className="navigation-item icon icon-house" onClick={ event => CreateLinkEvent('navigator/goto/home') } /> }
                        <Base pointer title="Navegador de Salas" className="navigation-item icon icon-rooms" onClick={ event => CreateLinkEvent('navigator/toggle') } />
                        <Base pointer title="Pase de Batalla" className="navigation-item icon icon-battlepass" onClick={ event => CreateLinkEvent('battlepass/toggle') } />
                        { isGameCenterEnabled && <Base pointer title="Centro de Juegos" className="navigation-item icon icon-game" onClick={ event => CreateLinkEvent('games/toggle') } /> }
                        <Base pointer title="Tienda de Habbten" className="navigation-item icon icon-catalog" onClick={ event => CreateLinkEvent('catalog/toggle') } />
                        <Base pointer title="Inventario" className="navigation-item icon icon-inventory" onClick={ event => CreateLinkEvent('inventory/toggle') }>
                            { (getFullCount > 0) &&
                                <LayoutItemCountView count={ getFullCount } /> }
                        </Base>
                        { isInRoom &&
                            <Base pointer title="Cámara" className="navigation-item icon icon-camera" onClick={ event => CreateLinkEvent('camera/toggle') } /> }
                        { isMod &&
                            <Base pointer title="Herramientas de Moderación" className="navigation-item icon icon-modtools" onClick={ event => CreateLinkEvent('mod-tools/toggle') } /> }
                        { radioUrl && (
                            <Flex alignItems="center" gap={ 1 } title="Radio Habbten" className="navigation-item" style={{ background: 'rgba(0,0,0,0.6)', padding: '0 8px', borderRadius: '4px', height: '30px' }}>
                                <audio ref={audioRef} preload="none" />
                                <Base pointer onClick={toggleRadio} className="text-white text-sm font-bold" style={{ whiteSpace: 'nowrap' }}>
                                    {isPlayingRadio ? '⏸ Radio' : '▶ Radio'}
                                </Base>
                                {isPlayingRadio && (
                                    <input 
                                        type="range" 
                                        min="0" max="1" step="0.01" 
                                        value={radioVolume} 
                                        onChange={(e) => setRadioVolume(parseFloat(e.target.value))} 
                                        style={{ width: '50px', height: '4px', cursor: 'pointer' }}
                                    />
                                )}
                            </Flex>
                        )}
                    </Flex>
                </Flex>
                <Flex alignItems="center" id="toolbar-chat-input-container" />
                <Flex alignItems="center" gap={ 2 }>
                    <Flex gap={ 2 }>
                        <Base pointer title="Amigos" className="navigation-item icon icon-friendall" onClick={ event => CreateLinkEvent('friends/toggle') }>
                            { (requests.length > 0) &&
                                <LayoutItemCountView count={ requests.length } /> }
                        </Base>
                        { ((iconState === MessengerIconState.SHOW) || (iconState === MessengerIconState.UNREAD)) &&
                            <Base pointer title="Mensajes" className={ `navigation-item icon icon-message ${ (iconState === MessengerIconState.UNREAD) && 'is-unseen' }` } onClick={ event => OpenMessengerChat() } /> }
                    </Flex>
                    <Base id="toolbar-friend-bar-container" className="d-none d-lg-block" />
                </Flex>
            </Flex>
        </>
    );
}
