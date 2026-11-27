import { HabboWebTools, ILinkEventTracker, RoomSessionEvent } from '@nitrots/nitro-renderer';
import { FC, useEffect, useState } from 'react';
import { AddEventLinkTracker, GetAltCodeCharacter, GetCommunication, RemoveLinkEventTracker, StripControlCharacters } from '../../api';
import { Base, TransitionAnimation, TransitionAnimationTypes } from '../../common';
import { useRoomSessionManagerEvent } from '../../hooks';
import { useIsMobile } from '../../hooks/mobile/useIsMobile';
import { MobileHudView } from '../mobile/MobileHudView';
import { AchievementsView } from '../achievements/AchievementsView';
import { AvatarEditorView } from '../avatar-editor/AvatarEditorView';
import { BattlePassView } from '../battle-pass/BattlePassView';
import { CameraWidgetView } from '../camera/CameraWidgetView';
import { CampaignView } from '../campaign/CampaignView';
import { CatalogView } from '../catalog/CatalogView';
import { ChatHistoryView } from '../chat-history/ChatHistoryView';
import { FloorplanEditorView } from '../floorplan-editor/FloorplanEditorView';
import { FriendsView } from '../friends/FriendsView';
import { GameCenterView } from '../game-center/GameCenterView';
import { GroupsView } from '../groups/GroupsView';
import { GuideToolView } from '../guide-tool/GuideToolView';
import { HcCenterView } from '../hc-center/HcCenterView';
import { HelpView } from '../help/HelpView';
import { HotelView } from '../hotel-view/HotelView';
import { InventoryView } from '../inventory/InventoryView';
import { ModToolsView } from '../mod-tools/ModToolsView';
import { NavigatorView } from '../navigator/NavigatorView';
import { NitropediaView } from '../nitropedia/NitropediaView';
import { RightSideView } from '../right-side/RightSideView';
import { RoomView } from '../room/RoomView';
import { ToolbarView } from '../toolbar/ToolbarView';
import { UserProfileView } from '../user-profile/UserProfileView';
import { UserSettingsView } from '../user-settings/UserSettingsView';
import { WiredView } from '../wired/WiredView';
import { EraSelectorModalView } from '../eras/EraSelectorModalView';
import { DiscordLinkModalView } from '../discord/DiscordLinkModalView';
import { DiscordActivityReporter } from '../discord/DiscordActivityReporter';
import { NotificationCenterView } from '../notification-center/NotificationCenterView';
import { RoleplayHudView } from '../roleplay/RoleplayHudView';
import { isRoleplayMode } from '../roleplay/RoleplayService';
import { LoginStreakView } from '../streak/LoginStreakView';
import { InfoStandEditorView } from '../room/widgets/avatar-info/infostand/InfoStandEditorView';
import { BulletinBoardView } from '../bulletin/BulletinBoardView';
import { ClientTutorialView } from '../tutorial/ClientTutorialView';

export const MainView: FC<{}> = props =>
{
    const [ isReady, setIsReady ] = useState(false);
    const [ landingViewVisible, setLandingViewVisible ] = useState(true);
    const isMobile = useIsMobile();
    const isRpClient = isRoleplayMode();

    useRoomSessionManagerEvent<RoomSessionEvent>(RoomSessionEvent.CREATED, event => setLandingViewVisible(false));
    useRoomSessionManagerEvent<RoomSessionEvent>(RoomSessionEvent.ENDED, event =>
    {
        if(document.body.style.cursor === 'pointer') document.body.style.cursor = 'default';
        setLandingViewVisible(event.openLandingView);
    });

    useEffect(() =>
    {
        setIsReady(true);

        GetCommunication()?.connection?.onReady();
    }, []);

    // Soporte global de códigos ALT + teclado numérico (ALT+7 = •, ALT+0134 = † bomba, ALT+157 = ¥ estrella, etc.)
    // Funciona en cualquier <input> o <textarea> (chat, nombre de sala, ajustes, misión, mensajero) en todas las versiones y SO.
    useEffect(() =>
    {
        let buffer = '';
        let activeEl: HTMLInputElement | HTMLTextAreaElement | null = null;
        let startValue = '';
        let selStart = 0;
        let selEnd = 0;

        const isEditable = (el: Element | null): el is HTMLInputElement | HTMLTextAreaElement =>
        {
            if(!el) return false;
            if(el instanceof HTMLTextAreaElement) return !el.disabled && !el.readOnly;
            if(el instanceof HTMLInputElement)
            {
                const allowed = [ 'text', 'search', 'url', 'email', 'password', '' ];
                return !el.disabled && !el.readOnly && allowed.includes((el.type || '').toLowerCase());
            }
            return false;
        };

        const setNativeValue = (el: HTMLInputElement | HTMLTextAreaElement, nextValue: string, caretPos: number) =>
        {
            const proto = (el instanceof HTMLTextAreaElement) ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
            const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
            if(setter) setter.call(el, nextValue);
            else el.value = nextValue;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            try
            {
                el.setSelectionRange(caretPos, caretPos);
            }
            catch (_) {}
        };

        const onKeyDown = (event: KeyboardEvent) =>
        {
            if(!event.altKey || !/^Numpad[0-9]$/.test(event.code)) return;

            const target = isEditable(document.activeElement) ? document.activeElement : null;
            if(!target) return;

            // Evitar que Linux/Chrome cambie de pestaña o mueva el cursor al usar Alt+Numpad
            event.preventDefault();

            if(!buffer)
            {
                activeEl = target;
                startValue = target.value;
                selStart = target.selectionStart ?? target.value.length;
                selEnd = target.selectionEnd ?? target.value.length;
            }

            buffer += event.code.charAt(6);
        };

        const onKeyUp = (event: KeyboardEvent) =>
        {
            if(event.key !== 'Alt' || !buffer) return;

            const capturedBuffer = buffer;
            const target = activeEl;
            const capturedStartVal = startValue;
            const start = selStart;
            const end = selEnd;

            buffer = '';
            activeEl = null;

            if(!target || !target.isConnected) return;

            const leadingZero = capturedBuffer.charAt(0) === '0';
            const code = parseInt(capturedBuffer, 10);
            const char = GetAltCodeCharacter(code, leadingZero);

            setTimeout(() =>
            {
                if(!target.isConnected) return;

                // Si el SO (Windows) ya insertó el carácter nativamente, solo limpiamos caracteres de control
                if(target.value !== capturedStartVal)
                {
                    const cleaned = StripControlCharacters(target.value);
                    if(cleaned !== target.value)
                    {
                        setNativeValue(target, cleaned, cleaned.length);
                    }
                    return;
                }

                if(!char) return;

                const nextVal = capturedStartVal.substring(0, start) + char + capturedStartVal.substring(end);
                setNativeValue(target, nextVal, start + char.length);
            }, 0);
        };

        window.addEventListener('keydown', onKeyDown, true);
        window.addEventListener('keyup', onKeyUp, true);

        return () =>
        {
            window.removeEventListener('keydown', onKeyDown, true);
            window.removeEventListener('keyup', onKeyUp, true);
        };
    }, []);

    useEffect(() =>
    {
        const linkTracker: ILinkEventTracker = { 
            linkReceived: (url: string) =>
            {
                const parts = url.split('/');
        
                if(parts.length < 2) return;
        
                switch(parts[1])
                {
                    case 'open':
                        if(parts.length > 2)
                        {
                            switch(parts[2])
                            {
                                case 'credits':
                                    //HabboWebTools.openWebPageAndMinimizeClient(this._windowManager.getProperty(ExternalVariables.WEB_SHOP_RELATIVE_URL));
                                    break;
                                default: {
                                    const name = parts[2];
                                    HabboWebTools.openHabblet(name);
                                }
                            }
                        }
                        return;
                }
            },
            eventUrlPrefix: 'habblet/'
        };

        AddEventLinkTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    // Cliente Roleplay dedicado (independiente del cliente clásico: solo Navegador RP y Móvil RP, sin monedero/barra Holo)
    if(isRpClient)
    {
        return (
            <Base fit className={ `rp-client-shell ${ isMobile ? 'is-rp-mobile' : 'is-rp-desktop' }` }>
                <RoomView />
                <RoleplayHudView isMobile={ isMobile } isInRoom={ !landingViewVisible } />
                <div className="rp-notifications-slot">
                    <NotificationCenterView />
                </div>
                <AvatarEditorView />
                <FriendsView />
                <UserProfileView />
                <UserSettingsView />
                <ChatHistoryView />
                <ModToolsView />
                <DiscordActivityReporter />
            </Base>
        );
    }

    return (
        <Base fit>
            <TransitionAnimation type={ TransitionAnimationTypes.FADE_IN } inProp={ landingViewVisible } timeout={ 300 }>
                <HotelView />
            </TransitionAnimation>
            { isMobile
                ? <MobileHudView isInRoom={ !landingViewVisible } />
                : <ToolbarView isInRoom={ !landingViewVisible } /> }
            <ModToolsView />
            <RoomView />
            <ChatHistoryView />
            <WiredView />
            <AvatarEditorView />
            <AchievementsView />
            <NavigatorView />
            <InventoryView />
            <CatalogView />
            <FriendsView />
            <RightSideView />
            <UserSettingsView />
            <UserProfileView />
            <GroupsView />
            <CameraWidgetView />
            <HelpView />
            <NitropediaView />
            <GuideToolView />
            <HcCenterView />
            <CampaignView />
            <GameCenterView />
            <FloorplanEditorView />
            <BattlePassView />
            <LoginStreakView />
            <InfoStandEditorView />
            <BulletinBoardView />
            <ClientTutorialView />
            <EraSelectorModalView />
            <DiscordLinkModalView />
            <DiscordActivityReporter />
        </Base>
    );
}
