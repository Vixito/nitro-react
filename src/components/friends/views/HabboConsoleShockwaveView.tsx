import { HabboSearchComposer, HabboSearchResultData, HabboSearchResultEvent, ILinkEventTracker, RemoveFriendComposer } from '@nitrots/nitro-renderer';
import { FC, useEffect, useState } from 'react';
import { AddEventLinkTracker, CreateLinkEvent, GetRoomSession, GetSessionDataManager, MessengerFriend, OpenMessengerChat, RemoveLinkEventTracker, SendMessageComposer } from '../../../api';
import { DraggableWindow, DraggableWindowPosition, LayoutAvatarImageView } from '../../../common';
import { useFriends, useMessageEvent, useSessionInfo } from '../../../hooks';

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

    // Friend list selection state
    const [ selectedFriend, setSelectedFriend ] = useState<MessengerFriend | null>(null);

    const { onlineFriends = [], offlineFriends = [], requests = [], requestFriend = null } = useFriends();
    const { userInfo } = useSessionInfo();

    const sessionData = GetSessionDataManager();
    const userFigure = sessionData ? sessionData.figure : '';
    const userName = sessionData ? sessionData.userName : 'Habbten';

    // Motto state
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

    const allFriendsList = [ ...onlineFriends, ...offlineFriends ];
    const allSearchResults = [ ...friendResults, ...otherResults ];

    return (
        <DraggableWindow
            uniqueKey="habbo-console-shockwave"
            handleSelector=".console-header"
            windowPosition={ DraggableWindowPosition.TOP_LEFT }
            offsetLeft={ 200 }
            offsetTop={ 50 }
            className="habbo-console-draggable-window"
        >
            <div className="habbo-console-shockwave">
                {/* Header Amarillo Clásico Game Boy / Pager con textura punteada */}
                <div className="console-header drag-handler">
                    <span className="console-title">Consola Habbten</span>
                    <button
                        type="button"
                        className="console-close-btn"
                        onClick={ () => setIsVisible(false) }
                        title="Cerrar Consola"
                    >
                        ✕
                    </button>
                </div>

                {/* Pantalla CRT Central con Scanlines Horizontales */}
                <div className="console-crt-screen">
                    {/* Modal de Alerta Clásico si existe (Ej: confirmación de petición) */}
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

                    {/* TAB 1: MI INFO (Exacto a Referencia Imagen 2) */}
                    { activeTab === 'myinfo' && (
                        <div className="console-tab-content myinfo-tab">
                            {/* Sección Superior: Avatar monocromático + Nombre + Input Lema/Misión + Link Perfil */}
                            <div className="myinfo-user-card">
                                <div className="avatar-preview-box">
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
                                            placeholder="Tu lema o misión..."
                                        />
                                    </div>
                                    <div
                                        className="profile-link"
                                        onClick={ () => CreateLinkEvent('habboUI/open/' + (sessionData ? sessionData.userId : 0)) }
                                    >
                                        Perfil Habbten &gt;&gt;
                                    </div>
                                </div>
                            </div>

                            <div className="console-dashed-divider" />

                            {/* Sección Central: Contadores oficiales de mensajes y peticiones */}
                            <div className="myinfo-counts-section">
                                <div className="count-row">0 nuevo(s) mensaje(s)</div>
                                <div
                                    className="count-row clickable"
                                    onClick={ () => setActiveTab('friends') }
                                >
                                    { requests.length } Solicitud(es) de amistad
                                </div>
                                <div className="count-row dim">No hay mensajes guardados.</div>
                            </div>

                            <div className="console-dashed-divider" />

                            {/* Sección Inferior: Enlace móvil / Pager clásico */}
                            <div className="myinfo-mobile-section">
                                <div className="pager-phone-icon">
                                    <span className="pager-icon">📟</span>
                                    <span className="link-dots">&lt;···&gt;</span>
                                    <span className="phone-icon">📱</span>
                                </div>
                                <div className="mobile-text">
                                    <div>Enlace con móvil inactivo.</div>
                                    <div>Comprueba tu número en tu Habbten ID.</div>
                                </div>
                            </div>
                        </div>
                    ) }

                    {/* TAB 2: AMIGOS (Exacto a Referencia Imagen 3) */}
                    { activeTab === 'friends' && (
                        <div className="console-tab-content friends-tab">
                            <div className="friends-screen-inner">
                                <div className="friends-scroll-area">
                                    { allFriendsList.length === 0 ? (
                                        <div className="no-friends-notice">No tienes amig@s en tu lista todavía.</div>
                                    ) : (
                                        allFriendsList.map(friend => (
                                            <div
                                                key={ friend.id }
                                                className={ `console-friend-row ${ selectedFriend?.id === friend.id ? 'selected' : '' }` }
                                                onClick={ () => setSelectedFriend(friend) }
                                                onDoubleClick={ () => OpenMessengerChat(friend.id) }
                                            >
                                                <div className="friend-head-col">
                                                    <LayoutAvatarImageView figure={ friend.figure } direction={ 2 } headOnly={ true } />
                                                </div>
                                                <div className="friend-info-col">
                                                    <div className="friend-name-row">
                                                        <span className="friend-name">{ friend.name }</span>
                                                        <span className="phone-icon">📱</span>
                                                        <span className="friend-msgs">- 0_msgs</span>
                                                    </div>
                                                    <div className="friend-status-row">
                                                        { friend.online ? ((friend as any).inRoom ? '(En sala privada)' : '(En el Hotel)') : 'Desconectad@' }
                                                    </div>
                                                    <div className="friend-motto-row">
                                                        &ldquo;{ friend.motto || '...' }&rdquo;
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) }
                                </div>
                            </div>

                            {/* 3 Botones de acción integrados dentro de la pantalla CRT */}
                            <div className="friends-crt-actions">
                                <button
                                    type="button"
                                    className="console-crt-btn help-btn"
                                    title="Información de amigo"
                                    disabled={ !selectedFriend }
                                    onClick={ () => selectedFriend && CreateLinkEvent('habboUI/open/' + selectedFriend.id) }
                                >
                                    ?
                                </button>
                                <button
                                    type="button"
                                    className="console-crt-btn compose-btn"
                                    disabled={ !selectedFriend }
                                    onClick={ () => selectedFriend && OpenMessengerChat(selectedFriend.id) }
                                >
                                    Enviar un mensaje
                                </button>
                                <button
                                    type="button"
                                    className="console-crt-btn remove-btn"
                                    disabled={ !selectedFriend }
                                    onClick={ handleRemoveFriend }
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    ) }

                    {/* TAB 3: BUSCAR (Exacto a Referencia Imagen 4) */}
                    { activeTab === 'find' && (
                        <div className="console-tab-content find-tab">
                            <div className="find-input-section">
                                <div className="find-label">Buscar Habbo:</div>
                                <div className="find-search-bar">
                                    <input
                                        type="text"
                                        className="console-pixel-input find-input"
                                        value={ searchValue }
                                        onChange={ e => setSearchValue(e.target.value) }
                                        onKeyDown={ e => e.key === 'Enter' && handleSearch() }
                                    />
                                    <button type="button" className="console-crt-btn search-btn" onClick={ handleSearch }>
                                        Buscar
                                    </button>
                                </div>
                            </div>

                            <div className="find-results-container">
                                { hasSearched && allSearchResults.length === 0 ? (
                                    <div className="find-not-found">Habbo no encontrado</div>
                                ) : (
                                    <div className="results-scroll-list">
                                        { allSearchResults.map(user => (
                                            <div
                                                key={ user.avatarId }
                                                className={ `result-user-item ${ selectedSearchUser?.avatarId === user.avatarId ? 'selected' : '' }` }
                                                onClick={ () => setSelectedSearchUser(user) }
                                            >
                                                <span className="user-icon">👤</span>
                                                <span className="user-name">{ user.avatarName }</span>
                                            </div>
                                        )) }
                                    </div>
                                )}
                            </div>

                            <div className="find-bottom-actions">
                                <button
                                    type="button"
                                    className="console-crt-btn request-btn"
                                    disabled={ !selectedSearchUser }
                                    onClick={ handleSendRequest }
                                >
                                    Pedir Amistad
                                </button>
                            </div>
                        </div>
                    ) }

                    {/* TAB 4: AYUDA (Exacto a Referencia Imagen 5) */}
                    { activeTab === 'help' && (
                        <div className="console-tab-content help-tab">
                            <div className="help-header-title">Ayuda de la Consola Habbten</div>
                            <div className="help-content-box">
                                <p>Puedes usar la Consola Habbten para mantenerte en contacto constante con tus amigos, usando mensajes instantáneos, correo electrónico y SMS, incluso cuando no estén conectados.</p>
                                <p>Solo los Habbos que hayas elegido añadir a tu Lista de Amigos pueden hablar contigo a través de la Consola, por lo que no hay riesgo de ser molestado por personas que no te agraden. Los mensajes que envíes son privados y seguros.</p>
                            </div>
                            <div className="help-bottom-actions">
                                <button
                                    type="button"
                                    className="console-crt-btn emergency-btn"
                                    onClick={ () => CreateLinkEvent('help/toggle') }
                                >
                                    Llamada de Emergencia / Soporte
                                </button>
                            </div>
                        </div>
                    ) }
                </div>

                {/* BARRA INFERIOR DE 4 PESTAÑAS PAGER / GAME BOY (Exacto a Referencia Imágenes 2, 3, 4, 5) */}
                <div className="console-bottom-tabs">
                    <button
                        type="button"
                        className={ `console-pager-tab ${ activeTab === 'myinfo' ? 'active' : '' }` }
                        onClick={ () => setActiveTab('myinfo') }
                    >
                        <div className="pager-tab-icon">
                            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                                <circle cx="8" cy="8" r="6" />
                                <circle cx="8" cy="6" r="4" fill="#d49b04" />
                                <path d="M5 5h6v2H5z" />
                                <rect x="6" y="8" width="1" height="1" />
                                <rect x="9" y="8" width="1" height="1" />
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
                            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                                <circle cx="6" cy="7" r="4" />
                                <circle cx="10" cy="8" r="4" fill="#a57700" />
                                <circle cx="6" cy="7" r="3" fill="#d49b04" />
                                <circle cx="10" cy="8" r="3" fill="#e5ad02" />
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
                            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="6.5" cy="6.5" r="4.5" />
                                <line x1="10" y1="10" x2="14" y2="14" strokeWidth="2.5" />
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
                            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M6 3h4v2h2v3h-2v1H7V8h3V6H6V3zM7 11h2v2H7v-2z" />
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
