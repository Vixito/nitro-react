import { Dispose, DropBounce, EaseOut, ILinkEventTracker, JumpBy, Motions, NitroToolbarAnimateIconEvent, PerkAllowancesMessageEvent, PerkEnum, Queue, Wait } from '@nitrots/nitro-renderer';
import { FC, useState, useRef, useEffect } from 'react';
import { AddEventLinkTracker, CreateLinkEvent, GetConfiguration, GetSessionDataManager, MessengerIconState, OpenMessengerChat, RemoveLinkEventTracker, VisitDesktop } from '../../api';
import { Base, Flex, LayoutAvatarImageView, LayoutItemCountView, TransitionAnimation, TransitionAnimationTypes } from '../../common';
import { useAchievements, useFriends, useInventoryUnseenTracker, useMessageEvent, useMessenger, useRoomEngineEvent, useSessionInfo } from '../../hooks';
import { ToolbarMeView } from './ToolbarMeView';

export const ToolbarView: FC<{ isInRoom: boolean }> = props =>
{
    const { isInRoom } = props;
    const [ isMeExpanded, setMeExpanded ] = useState(false);
    const [ useGuideTool, setUseGuideTool ] = useState(false);
    const { userFigure = null } = useSessionInfo();
    const { getFullCount = 0 } = useInventoryUnseenTracker();
    const { getTotalUnseen = 0 } = useAchievements();
    const { requests = [] } = useFriends();
    const { iconState = MessengerIconState.HIDDEN } = useMessenger();
    const isMod = GetSessionDataManager().isModerator;
    
    const [isPlayingRadio, setIsPlayingRadio] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [radioVolume, setRadioVolume] = useState(0.5);

    const [ habbtenConfig, setHabbtenConfig ] = useState<any>((window.parent as any)?.HabbtenConfig || (window as any)?.HabbtenConfig);
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
            const cfg = e?.detail || (window.parent as any)?.HabbtenConfig || (window as any)?.HabbtenConfig;
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

    return (
        <>
            <TransitionAnimation type={ TransitionAnimationTypes.FADE_IN } inProp={ isMeExpanded } timeout={ 300 }>
                <ToolbarMeView useGuideTool={ useGuideTool } unseenAchievementCount={ getTotalUnseen } setMeExpanded={ setMeExpanded } />
            </TransitionAnimation>
            <Flex alignItems="center" justifyContent="between" gap={ 2 } className="nitro-toolbar py-1 px-3">
                <Flex gap={ 2 } alignItems="center">
                    <Flex alignItems="center" gap={ 2 }>
                        <Flex center pointer className={ 'navigation-item item-avatar ' + (isMeExpanded ? 'active ' : '') } onClick={ event => setMeExpanded(!isMeExpanded) }>
                            <LayoutAvatarImageView figure={ userFigure } direction={ 2 } position="absolute" />
                            { (getTotalUnseen > 0) &&
                                <LayoutItemCountView count={ getTotalUnseen } /> }
                        </Flex>
                        { isInRoom &&
                            <Base pointer className="navigation-item icon icon-habbo" onClick={ event => VisitDesktop() } /> }
                        { !isInRoom &&
                            <Base pointer className="navigation-item icon icon-house" onClick={ event => CreateLinkEvent('navigator/goto/home') } /> }
                        <Base pointer className="navigation-item icon icon-rooms" onClick={ event => CreateLinkEvent('navigator/toggle') } />
                        { isGameCenterEnabled && <Base pointer className="navigation-item icon icon-game" onClick={ event => CreateLinkEvent('games/toggle') } /> }
                        <Base pointer className="navigation-item icon icon-catalog" onClick={ event => CreateLinkEvent('catalog/toggle') } />
                        <Base pointer className="navigation-item icon icon-inventory" onClick={ event => CreateLinkEvent('inventory/toggle') }>
                            { (getFullCount > 0) &&
                                <LayoutItemCountView count={ getFullCount } /> }
                        </Base>
                        { isInRoom &&
                            <Base pointer className="navigation-item icon icon-camera" onClick={ event => CreateLinkEvent('camera/toggle') } /> }
                        <Base pointer title="Pase de Batalla" className="navigation-item icon icon-battlepass" onClick={ event => CreateLinkEvent('battlepass/toggle') } />
                        { isMod &&
                            <Base pointer className="navigation-item icon icon-modtools" onClick={ event => CreateLinkEvent('mod-tools/toggle') } /> }
                        { radioUrl && (
                            <Flex alignItems="center" gap={ 1 } className="navigation-item" style={{ background: 'rgba(0,0,0,0.6)', padding: '0 8px', borderRadius: '4px', height: '30px' }}>
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
                        <Base pointer className="navigation-item icon icon-friendall" onClick={ event => CreateLinkEvent('friends/toggle') }>
                            { (requests.length > 0) &&
                                <LayoutItemCountView count={ requests.length } /> }
                        </Base>
                        { ((iconState === MessengerIconState.SHOW) || (iconState === MessengerIconState.UNREAD)) &&
                            <Base pointer className={ `navigation-item icon icon-message ${ (iconState === MessengerIconState.UNREAD) && 'is-unseen' }` } onClick={ event => OpenMessengerChat() } /> }
                    </Flex>
                    <Base id="toolbar-friend-bar-container" className="d-none d-lg-block" />
                </Flex>
            </Flex>
        </>
    );
}
