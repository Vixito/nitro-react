import { HabboSearchComposer, HabboSearchResultData, HabboSearchResultEvent, ILinkEventTracker, RemoveFriendComposer } from '@nitrots/nitro-renderer';
import { FC, useEffect, useState } from 'react';
import { AddEventLinkTracker, CreateLinkEvent, GetRoomSession, GetSessionDataManager, GetUserProfile, MessengerFriend, OpenMessengerChat, RemoveLinkEventTracker, SendMessageComposer } from '../../../api';
import iconAccept from '../../../assets/images/friends/icon-accept.png';
import iconAdd from '../../../assets/images/friends/icon-add.png';
import iconChat from '../../../assets/images/friends/icon-chat.png';
import iconDeny from '../../../assets/images/friends/icon-deny.png';
import iconFollow from '../../../assets/images/friends/icon-follow.png';
import iconNewMessage from '../../../assets/images/friends/icon-new-message.png';
import iconProfileSm from '../../../assets/images/friends/icon-profile-sm.png';
import iconSmile from '../../../assets/images/friends/icon-smile.png';
import { DraggableWindow, DraggableWindowPosition, LayoutAvatarImageView, LayoutBadgeImageView } from '../../../common';
import { useFriends, useMessageEvent, useMessenger, useSessionInfo } from '../../../hooks';

export const HabboConsoleShockwaveView: FC<{}> = () =>
{
    const [ isVisible, setIsVisible ] = useState(false);
    const [ activeTab, setActiveTab ] = useState<'myinfo' | 'friends' | 'find' | 'help'>('myinfo');
    const [ searchValue, setSearchValue ] = useState('');
    const [ hasSearched, setHasSearched ] = useState(false);
    const [ selectedSearchUser, setSelectedSearchUser ] = useState<HabboSearchResultData | null>(null);
    const [ friendResults, setFriendResults ] = useState<HabboSearchResultData[]>([]);
    const [ otherResults, setOtherResults ] = useState<HabboSearchResultData[]>([]);
    const [ alertMessage, setAlertMessage ] = useState<string | null>(null);

    const [ selectedFriend, setSelectedFriend ] = useState<MessengerFriend | null>(null);

    const { onlineFriends = [], offlineFriends = [], requests = [], requestFriend = null, requestResponse = null, followFriend = null } = useFriends();
    const { visibleThreads = [] } = useMessenger();
    const { userInfo } = useSessionInfo();

    const sessionData = GetSessionDataManager();
    const userFigure = sessionData ? sessionData.figure : '';
    const userName = sessionData ? sessionData.userName : 'Habbten';

    const [ motto, setMotto ] = useState('');

    useEffect(() =>
    {
        const customInfo = (userInfo as any)?.customInformation ?? (userInfo as any)?.motto;
        if(customInfo !== undefined)
        {
            setMotto(customInfo || '');
        }
    }, [ userInfo ]);

    const handleSaveMotto = () =>
    {
        const roomSession = GetRoomSession();
        const customInfo = (userInfo as any)?.customInformation ?? (userInfo as any)?.motto;
        if(roomSession && motto !== customInfo)
        {
            roomSession.sendMottoMessage(motto);
        }
    };

    useEffect(() =>
    {
        const handleLink = (url: string) =>
        {
            const parts = url.split('/');
            if(parts.length < 2) return;

            switch(parts[1])
            {
                case 'show':
                    setIsVisible(true);
                    return;
                case 'hide':
                    setIsVisible(false);
                    return;
                case 'toggle':
                    setIsVisible(prev => !prev);
                    return;
                case 'request':
                    if(parts.length >= 4 && requestFriend)
                    {
                        const targetId = parseInt(parts[2]);
                        const targetName = parts[3];
                        requestFriend(targetId, targetName);
                        setAlertMessage(`${ targetName } ha recibido tu petición de amistad.`);
                        setIsVisible(true);
                        setActiveTab('friends');
                    }
                    return;
            }
        };

        const tracker1: ILinkEventTracker = { linkReceived: handleLink, eventUrlPrefix: 'friends/' };
        const tracker2: ILinkEventTracker = { linkReceived: handleLink, eventUrlPrefix: 'friends-list/' };
        const tracker3: ILinkEventTracker = { linkReceived: handleLink, eventUrlPrefix: 'habbo-console/' };

        AddEventLinkTracker(tracker1);
        AddEventLinkTracker(tracker2);
        AddEventLinkTracker(tracker3);

        return () =>
        {
            RemoveLinkEventTracker(tracker1);
            RemoveLinkEventTracker(tracker2);
            RemoveLinkEventTracker(tracker3);
        };
    }, [ requestFriend ]);

    useMessageEvent<HabboSearchResultEvent>(HabboSearchResultEvent, event =>
    {
        const parser = event.getParser();
        setFriendResults(parser.friends || []);
        setOtherResults(parser.others || []);
        setHasSearched(true);
    });

    const handleSearch = () =>
    {
        if(!searchValue.trim()) return;
        SendMessageComposer(new HabboSearchComposer(searchValue.trim()));
    };

    const handleSendRequest = () =>
    {
        if(!selectedSearchUser) return;
        if(requestFriend)
        {
            requestFriend(selectedSearchUser.avatarId, selectedSearchUser.avatarName);
            setAlertMessage(`${ selectedSearchUser.avatarName } ha recibido tu petición de amistad. Será añadid@ a tu lista de amig@s cuando la acepte.`);
        }
    };

    const handleRemoveFriend = () =>
    {
        if(!selectedFriend) return;
        SendMessageComposer(new RemoveFriendComposer(selectedFriend.id));
        setSelectedFriend(null);
    };

    if(!isVisible) return null;

    const isRealFriend = (friend: MessengerFriend) => (friend.id > 0) && !friend.name.toLowerCase().includes('staff chat');
    const allFriendsList = [ ...onlineFriends, ...offlineFriends ];
    const realOnlineFriendsCount = onlineFriends.filter(isRealFriend).length;
    const realTotalFriendsCount = allFriendsList.filter(isRealFriend).length;
    const allSearchResults = [ ...friendResults, ...otherResults ];
    const unreadMessagesCount = visibleThreads.reduce((acc, thread) => acc + (thread.unreadCount || 0), 0);

    return (
        <DraggableWindow
            uniqueKey="habbo-console-shockwave"
            handleSelector=".console-drag-handle"
            windowPosition={ DraggableWindowPosition.TOP_LEFT }
            offsetLeft={ 200 }
            offsetTop={ 50 }
            className="habbo-console-draggable-window"
        >
            <div className="habbo-console-shockwave">
                {/* Header Amarillo Clásico Consola Habbten con textura punteada y botón de cierre original */}
                <div className="console-header console-drag-handle">
                    <span className="console-title">Consola Habbten</span>
                    <button
                        type="button"
                        className="console-close-btn"
                        onClick={ () => setIsVisible(false) }
                        title="Cerrar Consola"
                        aria-label="Cerrar Consola"
                    />
                </div>

                {/* Pantalla CRT Central con Scanlines Horizontales */}
                <div className="console-crt-screen">
                    { alertMessage && (
                        <div className="console-alert-overlay">
                            <div className="console-alert-box">
                                <p className="console-alert-text">{ alertMessage }</p>
                                <button type="button" className="console-crt-btn" onClick={ () => setAlertMessage(null) }>
                                    Aceptar
                                </button>
                            </div>
                        </div>
                    ) }

                    {/* TAB 1: MI INFO */}
                    { activeTab === 'myinfo' && (
                        <div className="console-tab-content myinfo-tab">
                            <div className="myinfo-user-card">
                                <div
                                    className="avatar-preview-box"
                                    style={ { cursor: 'pointer' } }
                                    title="Ver mi perfil"
                                    onClick={ () => sessionData && GetUserProfile(sessionData.userId) }
                                >
                                    <LayoutAvatarImageView figure={ userFigure } direction={ 2 } headOnly={ true } />
                                </div>
                                <div className="user-details">
                                    <div className="user-name">{ userName }</div>
                                    <div className="motto-input-container">
                                        <input
                                            type="text"
                                            className="console-pixel-input motto-input"
                                            value={ motto }
                                            maxLength={ 38 }
                                            onChange={ e => setMotto(e.target.value) }
                                            onKeyDown={ e => e.key === 'Enter' && handleSaveMotto() }
                                            onBlur={ handleSaveMotto }
                                            placeholder="Tu misión en Habbten..."
                                        />
                                    </div>
                                    <div
                                        className="profile-link"
                                        onClick={ () => sessionData && GetUserProfile(sessionData.userId) }
                                    >
                                        <img src={ iconProfileSm } alt="" className="pixel-icon" />
                                        <span>Perfil Habbten &gt;&gt;</span>
                                    </div>
                                </div>
                            </div>

                            <div className="console-dashed-divider" />

                            <div className="myinfo-counts-section">
                                <div
                                    className={ `count-row ${ visibleThreads.length > 0 ? 'clickable' : '' }` }
                                    onClick={ () => visibleThreads.length > 0 ? CreateLinkEvent('friends-messenger/open') : setActiveTab('friends') }
                                >
                                    <img src={ unreadMessagesCount > 0 ? iconNewMessage : iconChat } alt="" className="pixel-icon" />
                                    <span>{ unreadMessagesCount } nuevo(s) mensaje(s)</span>
                                </div>
                                <div
                                    className="count-row clickable"
                                    onClick={ () => setActiveTab('friends') }
                                >
                                    <img src={ iconAdd } alt="" className="pixel-icon" />
                                    <span>{ requests.length } Solicitud(es) de amistad</span>
                                </div>
                                <div className="count-row dim">
                                    { visibleThreads.length > 0 ? `${ visibleThreads.length } conversación(es) activa(s).` : 'No hay mensajes guardados.' }
                                </div>
                            </div>

                            <div className="console-dashed-divider" />

                            <div className="myinfo-status-section">
                                <div
                                    className="status-summary-row clickable"
                                    onClick={ () => setActiveTab('friends') }
                                >
                                    <img src={ iconSmile } alt="" className="pixel-icon" />
                                    <span>{ realOnlineFriendsCount } amig@(s) conectad@(s) en el Hotel</span>
                                </div>
                                <div className="status-summary-sub">
                                    Total en tu lista: { realTotalFriendsCount } amig@(s)
                                </div>
                            </div>
                        </div>
                    ) }

                    {/* TAB 2: AMIGOS */}
                    { activeTab === 'friends' && (
                        <div className="console-tab-content friends-tab">
                            <div className="friends-screen-inner">
                                <div className="friends-scroll-area">
                                    { requests.length > 0 && (
                                        <div className="console-requests-section">
                                            <div className="requests-section-title">Peticiones pendientes ({ requests.length })</div>
                                            { requests.map(req => (
                                                <div key={ req.id } className="console-request-row">
                                                    <span
                                                        className="request-user-name"
                                                        onClick={ () => GetUserProfile(req.requesterUserId) }
                                                    >
                                                        { req.name }
                                                    </span>
                                                    <div className="request-actions">
                                                        <button
                                                            type="button"
                                                            className="request-icon-btn"
                                                            title="Aceptar amistad"
                                                            onClick={ () => requestResponse && requestResponse(req.id, true) }
                                                        >
                                                            <img src={ iconAccept } alt="Aceptar" className="pixel-icon" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="request-icon-btn"
                                                            title="Rechazar"
                                                            onClick={ () => requestResponse && requestResponse(req.id, false) }
                                                        >
                                                            <img src={ iconDeny } alt="Rechazar" className="pixel-icon" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )) }
                                        </div>
                                    ) }

                                    { allFriendsList.length === 0 ? (
                                        <div className="no-friends-notice">No tienes amig@s en tu lista todavía.</div>
                                    ) : (
                                        allFriendsList.map(friend =>
                                        {
                                            const isStaffChat = (friend.id <= 0) || friend.name.toLowerCase().includes('staff chat');
                                            const staffBadgeCode = (friend.figure && !friend.figure.includes('-') && friend.figure !== 'default') ? friend.figure : 'ADM';

                                            return (
                                                <div
                                                    key={ friend.id }
                                                    className={ `console-friend-row ${ selectedFriend?.id === friend.id ? 'selected' : '' }` }
                                                    onClick={ () => setSelectedFriend(friend) }
                                                    onDoubleClick={ () => OpenMessengerChat(friend.id) }
                                                >
                                                    <div
                                                        className="friend-head-col"
                                                        style={ !isStaffChat ? { cursor: 'pointer' } : undefined }
                                                        title={ !isStaffChat ? `Ver perfil de ${ friend.name }` : undefined }
                                                        onClick={ e => {
                                                            if(!isStaffChat && friend.id > 0)
                                                            {
                                                                e.stopPropagation();
                                                                GetUserProfile(friend.id);
                                                            }
                                                        } }
                                                    >
                                                        { isStaffChat ? (
                                                            <LayoutBadgeImageView isGroup={ false } badgeCode={ staffBadgeCode } />
                                                        ) : (
                                                            <LayoutAvatarImageView figure={ friend.figure } direction={ 2 } headOnly={ true } />
                                                        ) }
                                                    </div>
                                                    <div className="friend-info-col">
                                                        <div className="friend-name-row">
                                                            { !isStaffChat && (
                                                                <img src={ iconSmile } alt="" className={ `pixel-icon ${ !friend.online ? 'icon-offline' : '' }` } />
                                                            ) }
                                                            <span className="friend-name">{ friend.name }</span>
                                                            { !isStaffChat && friend.online && friend.followingAllowed && (
                                                                <button
                                                                    type="button"
                                                                    className="friend-inline-action"
                                                                    title="Seguir a la sala"
                                                                    onClick={ e => { e.stopPropagation(); followFriend && followFriend(friend); } }
                                                                >
                                                                    <img src={ iconFollow } alt="Seguir" className="pixel-icon" />
                                                                </button>
                                                            ) }
                                                        </div>
                                                        <div className="friend-status-row">
                                                            { isStaffChat ? 'Canal Oficial Staff' : (friend.online ? (friend.followingAllowed ? '(En una sala)' : '(En el Hotel)') : 'Desconectad@') }
                                                        </div>
                                                        { !isStaffChat && (
                                                            <div className="friend-motto-row">
                                                                &ldquo;{ friend.motto || '...' }&rdquo;
                                                            </div>
                                                        ) }
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) }
                                </div>
                            </div>

                            {/* Botones de acción integrados dentro de la pantalla CRT */}
                            <div className="friends-crt-actions">
                                <button
                                    type="button"
                                    className="console-crt-btn help-btn"
                                    title="Perfil de Habbten"
                                    disabled={ !selectedFriend || selectedFriend.id <= 0 }
                                    onClick={ () => selectedFriend && selectedFriend.id > 0 && GetUserProfile(selectedFriend.id) }
                                >
                                    <img src={ iconProfileSm } alt="Perfil" className="pixel-icon" />
                                </button>
                                <button
                                    type="button"
                                    className="console-crt-btn compose-btn"
                                    disabled={ !selectedFriend }
                                    onClick={ () => selectedFriend && OpenMessengerChat(selectedFriend.id) }
                                >
                                    <img src={ iconChat } alt="" className="pixel-icon" />
                                    <span>Mensaje</span>
                                </button>
                                <button
                                    type="button"
                                    className="console-crt-btn remove-btn"
                                    disabled={ !selectedFriend || selectedFriend.id <= 0 }
                                    onClick={ handleRemoveFriend }
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    ) }

                    {/* TAB 3: BUSCAR */}
                    { activeTab === 'find' && (
                        <div className="console-tab-content find-tab">
                            <div className="find-input-section">
                                <div className="find-label">Buscar Habbten:</div>
                                <div className="find-search-bar">
                                    <input
                                        type="text"
                                        className="console-pixel-input find-input"
                                        value={ searchValue }
                                        onChange={ e => setSearchValue(e.target.value) }
                                        onKeyDown={ e => e.key === 'Enter' && handleSearch() }
                                        placeholder="Nombre de usuario..."
                                    />
                                    <button type="button" className="console-crt-btn search-btn" onClick={ handleSearch }>
                                        Buscar
                                    </button>
                                </div>
                            </div>

                            <div className="find-results-container">
                                { hasSearched && allSearchResults.length === 0 ? (
                                    <div className="find-not-found">Habbten no encontrado</div>
                                ) : (
                                    <div className="results-scroll-list">
                                        { allSearchResults.map(user => (
                                            <div
                                                key={ user.avatarId }
                                                className={ `result-user-item ${ selectedSearchUser?.avatarId === user.avatarId ? 'selected' : '' }` }
                                                onClick={ () => setSelectedSearchUser(user) }
                                            >
                                                <img src={ iconSmile } alt="" className="pixel-icon" />
                                                <span className="user-name">{ user.avatarName }</span>
                                            </div>
                                        )) }
                                    </div>
                                ) }
                            </div>

                            <div className="find-bottom-actions">
                                <button
                                    type="button"
                                    className="console-crt-btn request-btn"
                                    disabled={ !selectedSearchUser }
                                    onClick={ handleSendRequest }
                                >
                                    <img src={ iconAdd } alt="" className="pixel-icon" />
                                    <span>Pedir Amistad</span>
                                </button>
                            </div>
                        </div>
                    ) }

                    {/* TAB 4: AYUDA */}
                    { activeTab === 'help' && (
                        <div className="console-tab-content help-tab">
                            <div className="help-header-title">Ayuda de la Consola Habbten</div>
                            <div className="help-content-box">
                                <p>Puedes usar la Consola Habbten para mantenerte en contacto con tus amig@s dentro del Hotel mediante mensajes instantáneos y gestionar tus solicitudes de amistad en tiempo real.</p>
                                <p>Solo los usuarios de Habbten que hayas elegido añadir a tu Lista de Amig@s pueden hablar contigo a través de la Consola, por lo que los mensajes que envíes son privados y seguros.</p>
                            </div>
                            <div className="help-bottom-actions">
                                <button
                                    type="button"
                                    className="console-crt-btn emergency-btn"
                                    onClick={ () => CreateLinkEvent('help/toggle') }
                                >
                                    Ayuda / Soporte Habbten
                                </button>
                            </div>
                        </div>
                    ) }
                </div>

                {/* BARRA INFERIOR DE 4 PESTAÑAS PAGER / CONSOLA 2006 */}
                <div className="console-bottom-tabs">
                    <button
                        type="button"
                        className={ `console-pager-tab ${ activeTab === 'myinfo' ? 'active' : '' }` }
                        onClick={ () => setActiveTab('myinfo') }
                    >
                        <div className="pager-tab-icon">
                            <svg width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges">
                                <rect x="4" y="2" width="8" height="2" fill="#000000" />
                                <rect x="2" y="4" width="2" height="8" fill="#000000" />
                                <rect x="12" y="4" width="2" height="8" fill="#000000" />
                                <rect x="4" y="12" width="8" height="2" fill="#000000" />
                                <rect x="4" y="4" width="8" height="8" fill="#f7be00" />
                                <rect x="4" y="4" width="8" height="2" fill="#000000" />
                                <rect x="5" y="7" width="2" height="2" fill="#000000" />
                                <rect x="9" y="7" width="2" height="2" fill="#000000" />
                                <rect x="6" y="10" width="4" height="1" fill="#000000" />
                            </svg>
                        </div>
                        <div className="pager-tab-label">MI INFO</div>
                        <div className="pager-tab-grip">
                            <span /><span /><span />
                        </div>
                    </button>

                    <button
                        type="button"
                        className={ `console-pager-tab ${ activeTab === 'friends' ? 'active' : '' }` }
                        onClick={ () => setActiveTab('friends') }
                    >
                        <div className="pager-tab-icon">
                            <svg width="18" height="16" viewBox="0 0 18 16" shapeRendering="crispEdges">
                                <rect x="2" y="3" width="6" height="2" fill="#000000" />
                                <rect x="1" y="5" width="1" height="5" fill="#000000" />
                                <rect x="8" y="5" width="1" height="5" fill="#000000" />
                                <rect x="2" y="10" width="6" height="2" fill="#000000" />
                                <rect x="2" y="5" width="6" height="5" fill="#f7be00" />
                                <rect x="3" y="6" width="1" height="1" fill="#000000" />
                                <rect x="6" y="6" width="1" height="1" fill="#000000" />
                                <rect x="4" y="8" width="2" height="1" fill="#000000" />
                                <rect x="10" y="4" width="6" height="2" fill="#000000" />
                                <rect x="9" y="6" width="1" height="5" fill="#000000" />
                                <rect x="16" y="6" width="1" height="5" fill="#000000" />
                                <rect x="10" y="11" width="6" height="2" fill="#000000" />
                                <rect x="10" y="6" width="6" height="5" fill="#d49b04" />
                                <rect x="11" y="7" width="1" height="1" fill="#000000" />
                                <rect x="14" y="7" width="1" height="1" fill="#000000" />
                                <rect x="12" y="9" width="2" height="1" fill="#000000" />
                            </svg>
                        </div>
                        <div className="pager-tab-label">AMIGOS</div>
                        <div className="pager-tab-grip">
                            <span /><span /><span />
                        </div>
                    </button>

                    <button
                        type="button"
                        className={ `console-pager-tab ${ activeTab === 'find' ? 'active' : '' }` }
                        onClick={ () => setActiveTab('find') }
                    >
                        <div className="pager-tab-icon">
                            <svg width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges">
                                <rect x="4" y="2" width="5" height="2" fill="#000000" />
                                <rect x="2" y="4" width="2" height="5" fill="#000000" />
                                <rect x="9" y="4" width="2" height="5" fill="#000000" />
                                <rect x="4" y="9" width="5" height="2" fill="#000000" />
                                <rect x="9" y="9" width="2" height="2" fill="#000000" />
                                <rect x="11" y="11" width="3" height="3" fill="#000000" />
                            </svg>
                        </div>
                        <div className="pager-tab-label">BUSCAR</div>
                        <div className="pager-tab-grip">
                            <span /><span /><span />
                        </div>
                    </button>

                    <button
                        type="button"
                        className={ `console-pager-tab ${ activeTab === 'help' ? 'active' : '' }` }
                        onClick={ () => setActiveTab('help') }
                    >
                        <div className="pager-tab-icon">
                            <svg width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges">
                                <rect x="5" y="2" width="6" height="2" fill="#000000" />
                                <rect x="4" y="4" width="2" height="2" fill="#000000" />
                                <rect x="10" y="4" width="2" height="3" fill="#000000" />
                                <rect x="7" y="7" width="3" height="2" fill="#000000" />
                                <rect x="7" y="9" width="2" height="2" fill="#000000" />
                                <rect x="7" y="12" width="2" height="2" fill="#000000" />
                            </svg>
                        </div>
                        <div className="pager-tab-label">AYUDA</div>
                        <div className="pager-tab-grip">
                            <span /><span /><span />
                        </div>
                    </button>
                </div>
            </div>
        </DraggableWindow>
    );
};
