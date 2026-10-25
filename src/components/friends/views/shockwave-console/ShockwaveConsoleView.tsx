import { ILinkEventTracker, UserMottoComposer } from '@nitrots/nitro-renderer';
import { FC, KeyboardEvent, useEffect, useState } from 'react';
import { AddEventLinkTracker, CreateLinkEvent, GetSessionDataManager, GetUserProfile, RemoveLinkEventTracker, SendMessageComposer } from '../../../../api';
import { LayoutAvatarImageView } from '../../../../common';
import { useFriends, useMessenger, useSessionInfo } from '../../../../hooks';
import phoneIcon from '../../../../assets/images/eras/shockwave_v14/console/0011-phonelink-inactive-gfx.png';

export const ShockwaveConsoleView: FC<{}> = () =>
{
    const [ isVisible, setIsVisible ] = useState(false);
    const [ activeTab, setActiveTab ] = useState<'myinfo' | 'friends' | 'find' | 'help'>('myinfo');
    const { userInfo = null, userFigure = null } = useSessionInfo();
    const { requests = [], onlineFriends = [], offlineFriends = [] } = useFriends();
    const { messageThreads = [] } = useMessenger();
    const unreadCount = messageThreads.reduce((sum, t) => sum + (t.unreadCount || 0), 0);
    const [ missionText, setMissionText ] = useState('');
    const [ searchQuery, setSearchQuery ] = useState('');
    const [ searchResults, setSearchResults ] = useState<any[]>([]);

    useEffect(() =>
    {
        if(userInfo?.motto)
        {
            setMissionText(userInfo.motto);
        }
    }, [ userInfo ]);

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
                    case 'show':
                        setIsVisible(true);
                        return;
                    case 'hide':
                    case 'close':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setIsVisible(prev => !prev);
                        return;
                }
            },
            eventUrlPrefix: 'console/'
        };

        const friendTracker: ILinkEventTracker = {
            linkReceived: (url: string) =>
            {
                const parts = url.split('/');
                if(parts.length < 2) return;

                switch(parts[1])
                {
                    case 'open':
                    case 'show':
                        setIsVisible(true);
                        return;
                    case 'hide':
                    case 'close':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setIsVisible(prev => !prev);
                        return;
                }
            },
            eventUrlPrefix: 'friends/'
        };

        AddEventLinkTracker(linkTracker);
        AddEventLinkTracker(friendTracker);

        return () =>
        {
            RemoveLinkEventTracker(linkTracker);
            RemoveLinkEventTracker(friendTracker);
        };
    }, []);

    const saveMission = () =>
    {
        if(!missionText) return;
        SendMessageComposer(new UserMottoComposer(missionText));
    };

    const onMissionKeyDown = (e: KeyboardEvent<HTMLInputElement>) =>
    {
        if(e.key === 'Enter')
        {
            saveMission();
            (e.target as HTMLElement).blur();
        }
    };

    if(!isVisible) return null;

    return (
        <div className="shockwave-console-window">
            {/* Cabecera de la carcasa amarilla */}
            <div className="console-case-header">
                <span className="console-case-title">Consola Habbten</span>
                <div className="console-close-btn" onClick={ () => setIsVisible(false) }>
                    ✕
                </div>
            </div>

            {/* Pantalla CRT oscura */}
            <div className="console-crt-screen">
                { activeTab === 'myinfo' && (
                    <div className="console-screen-myinfo">
                        {/* Fila superior: Avatar, nombre y misión */}
                        <div className="console-profile-row">
                            <div className="console-avatar-box">
                                <LayoutAvatarImageView figure={ userFigure } direction={ 2 } headOnly={ true } />
                            </div>
                            <div className="console-profile-details">
                                <div className="console-username">{ userInfo?.username || 'Habbten' }</div>
                                <input
                                    type="text"
                                    className="console-mission-input"
                                    value={ missionText }
                                    placeholder="Escribe tu misión..."
                                    maxLength={ 38 }
                                    onChange={ e => setMissionText(e.target.value) }
                                    onKeyDown={ onMissionKeyDown }
                                    onBlur={ saveMission }
                                />
                                <div
                                    className="console-profile-link"
                                    onClick={ () => GetSessionDataManager() && GetUserProfile(GetSessionDataManager().userId) }
                                >
                                    Perfil Habbten &gt;&gt;
                                </div>
                            </div>
                        </div>

                        <div className="console-dashed-divider" />

                        {/* Mensajes y solicitudes */}
                        <div className="console-counts-row">
                            <div className="console-count-item">
                                { unreadCount } nuevo(s) mensaje(s)
                            </div>
                            <div className="console-count-item">
                                { requests.length } petición(es) de amistad
                            </div>
                            <div className="console-count-item text-muted">
                                No hay mensajes guardados.
                            </div>
                        </div>

                        <div className="console-dashed-divider" />

                        {/* Enlace de teléfono móvil */}
                        <div className="console-mobile-row">
                            <img src={ phoneIcon } alt="" className="console-phone-icon" />
                            <div className="console-mobile-text">
                                Enlace de móvil inactivo. Verifica el número en tu Habbten ID.
                            </div>
                        </div>
                    </div>
                ) }

                { activeTab === 'friends' && (
                    <div className="console-screen-friends">
                        <div className="console-friends-header">
                            Amig@s conectados ({ onlineFriends.length })
                        </div>
                        <div className="console-friends-list">
                            { onlineFriends.length === 0 ? (
                                <div className="console-empty-text">No tienes amigos conectados.</div>
                            ) : (
                                onlineFriends.map(friend => (
                                    <div key={ friend.id } className="console-friend-row">
                                        <span className="console-friend-status online">●</span>
                                        <span className="console-friend-name">{ friend.name }</span>
                                        <span className="console-friend-motto">{ friend.motto || '' }</span>
                                    </div>
                                ))
                            ) }
                        </div>

                        <div className="console-friends-header mt-2">
                            Amig@s desconectados ({ offlineFriends.length })
                        </div>
                        <div className="console-friends-list">
                            { offlineFriends.slice(0, 10).map(friend => (
                                <div key={ friend.id } className="console-friend-row offline">
                                    <span className="console-friend-status offline">○</span>
                                    <span className="console-friend-name">{ friend.name }</span>
                                </div>
                            )) }
                        </div>
                    </div>
                ) }

                { activeTab === 'find' && (
                    <div className="console-screen-find">
                        <div className="console-find-title">Buscar en Habbten:</div>
                        <div className="console-find-input-row">
                            <input
                                type="text"
                                className="console-find-input"
                                placeholder="Nombre de usuario..."
                                value={ searchQuery }
                                onChange={ e => setSearchQuery(e.target.value) }
                            />
                            <button className="console-find-btn">Buscar</button>
                        </div>
                        <div className="console-empty-text mt-3">
                            Introduce el nombre de un amigo para buscarlo en el hotel.
                        </div>
                    </div>
                ) }

                { activeTab === 'help' && (
                    <div className="console-screen-help">
                        <div className="console-help-title">Ayuda de la Consola:</div>
                        <div className="console-help-body">
                            - La Consola Habbten te permite comunicarte en privado con tus amigos.<br />
                            - En la pestaña MI INFO puedes editar tu misión presionando Enter.<br />
                            - En AMIGOS verás quién está conectado en tiempo real.
                        </div>
                    </div>
                ) }
            </div>

            {/* 4 Pestañas inferiores de la consola */}
            <div className="console-bottom-tabs">
                <div
                    className={ `console-tab ${ activeTab === 'myinfo' ? 'active' : '' }` }
                    onClick={ () => setActiveTab('myinfo') }
                >
                    <div className="console-tab-icon icon-myinfo" />
                    <span className="console-tab-label">MI INFO</span>
                </div>
                <div
                    className={ `console-tab ${ activeTab === 'friends' ? 'active' : '' }` }
                    onClick={ () => setActiveTab('friends') }
                >
                    <div className="console-tab-icon icon-friends" />
                    <span className="console-tab-label">AMIGOS</span>
                </div>
                <div
                    className={ `console-tab ${ activeTab === 'find' ? 'active' : '' }` }
                    onClick={ () => setActiveTab('find') }
                >
                    <div className="console-tab-icon icon-find" />
                    <span className="console-tab-label">BUSCAR</span>
                </div>
                <div
                    className={ `console-tab ${ activeTab === 'help' ? 'active' : '' }` }
                    onClick={ () => setActiveTab('help') }
                >
                    <div className="console-tab-icon icon-help" />
                    <span className="console-tab-label">AYUDA</span>
                </div>
            </div>
        </div>
    );
};
