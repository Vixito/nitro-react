import { MouseEventType, RoomObjectCategory, RoomObjectType } from '@nitrots/nitro-renderer';
import { Dispatch, FC, PropsWithChildren, SetStateAction, useEffect, useRef } from 'react';
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

    useEffect(() =>
    {
        const roomSession = GetRoomSession();

        if(!roomSession) return;

        const ownUser = roomSession.userDataManager?.getDataByType(GetSessionDataManager().userId, RoomObjectType.USER);
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

        return () => document.removeEventListener(MouseEventType.MOUSE_CLICK, onClick);
    }, [ setMeExpanded ]);

    if(currentEra === 'shockwave2006')
    {
        return (
            <div ref={ elementRef as any } className="shockwave-avatar-menu">
                <div className="shockwave-menu-header">
                    <span className="shockwave-menu-title">Menú</span>
                    <div className="shockwave-menu-close" onClick={ () => setMeExpanded(false) }>v</div>
                </div>
                <div className="shockwave-menu-body">
                    <div className="shockwave-menu-row" onClick={ () => CreateLinkEvent('avatar-editor/toggle') }>
                        <i className="shockwave-menu-icon icon-clothing" />
                        <span className="shockwave-menu-label">Editor de Ropa</span>
                        <span className="shockwave-menu-arrow">▶</span>
                    </div>
                    <div className="shockwave-menu-row" onClick={ () => CreateLinkEvent('navigator/search/myworld_view') }>
                        <i className="shockwave-menu-icon icon-rooms" />
                        <span className="shockwave-menu-label">Mis Salas</span>
                        <span className="shockwave-menu-arrow">▶</span>
                    </div>
                    <div className="shockwave-menu-row" onClick={ () => GetUserProfile(GetSessionDataManager().userId) }>
                        <i className="shockwave-menu-icon icon-profile" />
                        <span className="shockwave-menu-label">Mi Perfil</span>
                        <span className="shockwave-menu-arrow">▶</span>
                    </div>
                    <div className="shockwave-menu-row" onClick={ () => CreateLinkEvent('user-settings/toggle') }>
                        <i className="shockwave-menu-icon icon-settings" />
                        <span className="shockwave-menu-label">Ajustes</span>
                        <span className="shockwave-menu-arrow">▶</span>
                    </div>
                    <div className="shockwave-menu-row" onClick={ () => CreateLinkEvent('achievements/toggle') }>
                        <i className="shockwave-menu-icon icon-achievements" />
                        <span className="shockwave-menu-label">Recompensas</span>
                        { (unseenAchievementCount > 0) && <LayoutItemCountView count={ unseenAchievementCount } /> }
                        <span className="shockwave-menu-arrow">▶</span>
                    </div>
                    { (GetConfiguration('guides.enabled') && useGuideTool) && (
                        <div className="shockwave-menu-row" onClick={ () => DispatchUiEvent(new GuideToolEvent(GuideToolEvent.TOGGLE_GUIDE_TOOL)) }>
                            <i className="shockwave-menu-icon icon-guide" />
                            <span className="shockwave-menu-label">Guía</span>
                            <span className="shockwave-menu-arrow">▶</span>
                        </div>
                    )}
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
