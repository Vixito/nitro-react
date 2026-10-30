import { MouseEventType, RoomObjectCategory, RoomObjectType } from '@nitrots/nitro-renderer';
import { Dispatch, FC, PropsWithChildren, SetStateAction, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CreateLinkEvent, DispatchUiEvent, GetConfiguration, GetRoomEngine, GetRoomSession, GetSessionDataManager, GetUserProfile } from '../../api';
import { Base, Flex, LayoutItemCountView } from '../../common';
import { GuideToolEvent } from '../../events';
import { useEraTheme } from '../../hooks/era/useEraTheme';

interface ToolbarMeViewProps
{
    useGuideTool: boolean;
    unseenAchievementCount: number;
    setMeExpanded: Dispatch<SetStateAction<boolean>>;
}

export const ToolbarMeView: FC<PropsWithChildren<ToolbarMeViewProps>> = props =>
{
    const { currentEra } = useEraTheme();
    const { useGuideTool = false, unseenAchievementCount = 0, setMeExpanded = null, children = null, ...rest } = props;
    const elementRef = useRef<HTMLDivElement>();
    const [ pointerStyle, setPointerStyle ] = useState<React.CSSProperties>({});

    useEffect(() =>
    {
        const roomSession = GetRoomSession();

        if(!roomSession) return;

        const ownUser = roomSession.userDataManager?.getUserData(GetSessionDataManager().userId);
        const userIndex = ownUser ? ownUser.roomIndex : roomSession.ownRoomIndex;

        if(userIndex >= 0)
        {
            GetRoomEngine().selectRoomObject(roomSession.roomId, userIndex, RoomObjectCategory.UNIT);
        }
    }, []);

    useEffect(() =>
    {
        const onClick = (event: MouseEvent) => setMeExpanded(false);

        document.addEventListener('click', onClick);

        return () => document.removeEventListener('click', onClick);
    }, [ setMeExpanded ]);

    useLayoutEffect(() =>
    {
        if(currentEra !== 'shockwave2006') return;

        const updatePointer = () =>
        {
            const avatarEl = document.querySelector('.nitro-toolbar.toolbar-shockwave2006 .item-avatar');
            const menuEl = elementRef.current;

            if(avatarEl && menuEl)
            {
                const avatarRect = avatarEl.getBoundingClientRect();
                const menuRect = menuEl.getBoundingClientRect();
                const avatarCenter = avatarRect.left + (avatarRect.width / 2);
                const pointerX = avatarCenter - menuRect.left;

                setPointerStyle({ left: `${ pointerX }px`, transform: 'translateX(-50%)' });
            }
        };

        updatePointer();
        window.addEventListener('resize', updatePointer);

        return () => window.removeEventListener('resize', updatePointer);
    }, [ currentEra ]);

    if(currentEra === 'shockwave2006')
    {
        const handleAction = (callback: () => void) =>
        {
            callback();
            setMeExpanded(false);
        };

        return (
            <div ref={ elementRef as any } className="shockwave-avatar-menu" onClick={ event => event.stopPropagation() }>
                <div className="shockwave-menu-header">
                    <span className="shockwave-menu-title">Menu</span>
                    <div className="shockwave-menu-close" onClick={ () => setMeExpanded(false) }>v</div>
                </div>
                <div className="shockwave-menu-body">
                    {/* 1. Editor de Ropa */}
                    <div className="shockwave-menu-row" onClick={ () => handleAction(() => CreateLinkEvent('avatar-editor/toggle')) }>
                        <i className="shockwave-menu-icon icon-clothing" />
                        <span className="shockwave-menu-label">Editor de Ropa</span>
                        <span className="shockwave-menu-arrow">▶</span>
                    </div>

                    {/* 2. Historial de Chat */}
                    <div className="shockwave-menu-row" onClick={ () => handleAction(() => CreateLinkEvent('chat-history/toggle')) }>
                        <i className="shockwave-menu-icon icon-chat-history" />
                        <span className="shockwave-menu-label">Historial de Chat</span>
                        <span className="shockwave-menu-arrow">▶</span>
                    </div>

                    {/* 3. Mis Salas */}
                    <div className="shockwave-menu-row" onClick={ () => handleAction(() => CreateLinkEvent('navigator/search/myworld_view')) }>
                        <i className="shockwave-menu-icon icon-rooms" />
                        <span className="shockwave-menu-label">Mis Salas</span>
                        <span className="shockwave-menu-arrow">▶</span>
                    </div>

                    {/* 4. Mi Perfil */}
                    <div className="shockwave-menu-row" onClick={ () => handleAction(() => GetUserProfile(GetSessionDataManager().userId)) }>
                        <i className="shockwave-menu-icon icon-profile" />
                        <span className="shockwave-menu-label">Mi Perfil</span>
                        <span className="shockwave-menu-arrow">▶</span>
                    </div>

                    {/* 5. Ajustes */}
                    <div className="shockwave-menu-row" onClick={ () => handleAction(() => CreateLinkEvent('user-settings/toggle')) }>
                        <i className="shockwave-menu-icon icon-settings" />
                        <span className="shockwave-menu-label">Ajustes</span>
                        <span className="shockwave-menu-arrow">▶</span>
                    </div>

                    {/* 6. Recompensas */}
                    <div className="shockwave-menu-row" onClick={ () => handleAction(() => CreateLinkEvent('achievements/toggle')) }>
                        <i className="shockwave-menu-icon icon-achievements" />
                        <span className="shockwave-menu-label">Recompensas</span>
                        { (unseenAchievementCount > 0) && <LayoutItemCountView count={ unseenAchievementCount } /> }
                        <span className="shockwave-menu-arrow">▶</span>
                    </div>

                    {/* 7. Guía */}
                    { (GetConfiguration('guides.enabled') && useGuideTool) && (
                        <div className="shockwave-menu-row" onClick={ () => handleAction(() => DispatchUiEvent(new GuideToolEvent(GuideToolEvent.TOGGLE_GUIDE_TOOL))) }>
                            <i className="shockwave-menu-icon icon-guide" />
                            <span className="shockwave-menu-label">Guía</span>
                            <span className="shockwave-menu-arrow">▶</span>
                        </div>
                    )}
                </div>
                <div className="shockwave-menu-footer">
                    <svg className="shockwave-menu-pointer" style={ pointerStyle } width="16" height="9" viewBox="0 0 16 9">
                        <polygon points="0,-2 16,-2 8,8" fill="#5b90a4" />
                        <polyline points="0,0 8,8 16,0" fill="none" stroke="#000000" strokeWidth="1.5" strokeLinejoin="miter" />
                    </svg>
                </div>
            </div>
        );
    }

    return (
        <Flex innerRef={ elementRef } alignItems="center" className="nitro-toolbar-me p-2" gap={ 2 }>
            { (GetConfiguration('guides.enabled') && useGuideTool) &&
                <Base pointer title="Guía de Ayuda" className="navigation-item icon icon-me-helper-tool" onClick={ event => DispatchUiEvent(new GuideToolEvent(GuideToolEvent.TOGGLE_GUIDE_TOOL)) } /> }
            <Base pointer title="Recompensas y Logros" className="navigation-item icon icon-me-achievements" onClick={ event => CreateLinkEvent('achievements/toggle') }>
                { (unseenAchievementCount > 0) &&
                    <LayoutItemCountView count={ unseenAchievementCount } /> }
            </Base>
            <Base pointer title="Mi Perfil" className="navigation-item icon icon-me-profile" onClick={ event => GetUserProfile(GetSessionDataManager().userId) } />
            <Base pointer title="Mis Salas" className="navigation-item icon icon-me-rooms" onClick={ event => CreateLinkEvent('navigator/search/myworld_view') } />
            <Base pointer title="Editor de Ropa" className="navigation-item icon icon-me-clothing" onClick={ event => CreateLinkEvent('avatar-editor/toggle') } />
            <Base pointer title="Ajustes" className="navigation-item icon icon-me-settings" onClick={ event => CreateLinkEvent('user-settings/toggle') } />
            { children }
        </Flex>
    );
}
