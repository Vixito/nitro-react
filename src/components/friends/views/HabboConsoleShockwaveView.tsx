import { HabboSearchComposer, HabboSearchResultData, HabboSearchResultEvent, ILinkEventTracker } from '@nitrots/nitro-renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { AddEventLinkTracker, CreateLinkEvent, GetSessionDataManager, LocalizeText, OpenMessengerChat, RemoveLinkEventTracker, SendMessageComposer } from '../../../api';
import { LayoutAvatarImageView } from '../../../common';
import { useFriends, useMessageEvent } from '../../../hooks';

export const HabboConsoleShockwaveView: FC<{}> = () =>
{
    const [ isVisible, setIsVisible ] = useState(false);
    const [ activeTab, setActiveTab ] = useState<'myinfo' | 'friends' | 'find' | 'help'>('myinfo');
    const [ searchValue, setSearchValue ] = useState('');
    const [ selectedSearchUser, setSelectedSearchUser ] = useState<HabboSearchResultData | null>(null);
    const [ friendResults, setFriendResults ] = useState<HabboSearchResultData[]>([]);
    const [ otherResults, setOtherResults ] = useState<HabboSearchResultData[]>([]);
    const [ alertMessage, setAlertMessage ] = useState<string | null>(null);

    const { onlineFriends = [], offlineFriends = [], requests = [], requestFriend = null } = useFriends();

    const sessionData = GetSessionDataManager();
    const userFigure = sessionData ? sessionData.figure : '';
    const userName = sessionData ? sessionData.userName : 'Habbo';

    useEffect(() =>
    {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) =>
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
                }
            },
            eventUrlPrefix: 'friends/'
        };

        AddEventLinkTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    useMessageEvent<HabboSearchResultEvent>(HabboSearchResultEvent, event =>
    {
        const parser = event.getParser();
        setFriendResults(parser.friends || []);
        setOtherResults(parser.others || []);
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

    if(!isVisible) return null;

    return (
        <div className="habbo-console-shockwave">
            {/* Header Amarillo Clásico con textura punteada */}
            <div className="console-header">
                <span className="console-title">Consola Habbten</span>
                <button type="button" className="console-close-btn" onClick={ () => setIsVisible(false) }>
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
                            <button type="button" className="console-btn" onClick={ () => setAlertMessage(null) }>
                                Aceptar
                            </button>
                        </div>
                    </div>
                ) }

                {/* TAB 1: MI INFO */}
                { activeTab === 'myinfo' && (
                    <div className="console-tab-content myinfo-tab">
                        <div className="myinfo-user-card">
                            <div className="avatar-preview-box">
                                <LayoutAvatarImageView figure={ userFigure } direction={ 2 } headOnly={ true } />
                            </div>
                            <div className="user-details">
                                <div className="user-name">{ userName }</div>
                                <div className="user-status">En línea en el Hotel</div>
                            </div>
                        </div>

                        <div className="console-divider" />

                        <div className="info-summary-list">
                            <div className="info-item">
                                <span className="info-label">Amig@s conectados:</span>
                                <span className="info-value">{ onlineFriends.length }</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Peticiones de amistad:</span>
                                <span className="info-value">{ requests.length }</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Total amig@s:</span>
                                <span className="info-value">{ onlineFriends.length + offlineFriends.length }</span>
                            </div>
                        </div>

                        <div className="console-instructions">
                            Haz clic en la pestaña <b>AMIGOS</b> para chatear o en <b>BUSCAR</b> para encontrar a otros Habbos.
                        </div>
                    </div>
                ) }

                {/* TAB 2: AMIGOS */}
                { activeTab === 'friends' && (
                    <div className="console-tab-content friends-tab">
                        <div className="friends-scroll-area">
                            <div className="friends-section-title">En línea ({ onlineFriends.length })</div>
                            { onlineFriends.length === 0 ? (
                                <div className="no-friends-notice">No hay amig@s conectados</div>
                            ) : (
                                onlineFriends.map(friend => (
                                    <div key={ friend.id } className="console-friend-row online" onClick={ () => OpenMessengerChat(friend.id) }>
                                        <span className="status-dot green" />
                                        <span className="friend-name">{ friend.name }</span>
                                        <button type="button" className="console-chat-btn">💬</button>
                                    </div>
                                ))
                            )}

                            <div className="friends-section-title mt-2">Desconectados ({ offlineFriends.length })</div>
                            { offlineFriends.length === 0 ? (
                                <div className="no-friends-notice">No hay amig@s desconectados</div>
                            ) : (
                                offlineFriends.map(friend => (
                                    <div key={ friend.id } className="console-friend-row offline">
                                        <span className="status-dot grey" />
                                        <span className="friend-name">{ friend.name }</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ) }

                {/* TAB 3: BUSCAR (Exacto a Referencia Imagen 4 & 5) */}
                { activeTab === 'find' && (
                    <div className="console-tab-content find-tab">
                        <div className="find-search-bar">
                            <input
                                type="text"
                                className="console-search-input"
                                placeholder="Buscar Habbo..."
                                value={ searchValue }
                                onChange={ e => setSearchValue(e.target.value) }
                                onKeyDown={ e => e.key === 'Enter' && handleSearch() }
                            />
                            <button type="button" className="console-btn" onClick={ handleSearch }>
                                Buscar
                            </button>
                        </div>

                        <div className="find-results-container">
                            <div className="results-header">Resultados:</div>
                            <div className="results-scroll-list">
                                { otherResults.length === 0 && friendResults.length === 0 ? (
                                    <div className="no-results-msg">Escribe un nombre y presiona Buscar</div>
                                ) : (
                                    [ ...friendResults, ...otherResults ].map(user => (
                                        <div
                                            key={ user.avatarId }
                                            className={ `result-user-item ${ selectedSearchUser?.avatarId === user.avatarId ? 'selected' : '' }` }
                                            onClick={ () => setSelectedSearchUser(user) }
                                        >
                                            <span className="user-icon">👤</span>
                                            <span className="user-name">{ user.avatarName }</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <button
                            type="button"
                            className="console-btn-primary"
                            disabled={ !selectedSearchUser }
                            onClick={ handleSendRequest }
                        >
                            Pedir Amistad
                        </button>
                    </div>
                ) }

                {/* TAB 4: AYUDA */}
                { activeTab === 'help' && (
                    <div className="console-tab-content help-tab">
                        <div className="help-content-text">
                            <div className="help-title">Centro de Ayuda Habbten</div>
                            <p>¿Tienes problemas con un usuario o necesitas asistencia de un Moderador o Guía?</p>
                            <p>Puedes enviar una llamada de emergencia o consultar las normas de seguridad del hotel.</p>
                        </div>
                        <button type="button" className="console-btn-primary" onClick={ () => CreateLinkEvent('help/toggle') }>
                            Abrir Ayuda / Soporte
                        </button>
                    </div>
                ) }
            </div>

            {/* BARRA INFERIOR DE 4 PESTAÑAS (Exacto a Imagen 4 & 5) */}
            <div className="console-bottom-tabs">
                <button
                    type="button"
                    className={ `console-tab-btn ${ activeTab === 'myinfo' ? 'active' : '' }` }
                    onClick={ () => setActiveTab('myinfo') }
                >
                    <span className="tab-icon">👤</span>
                    <span className="tab-label">MI INFO</span>
                    <div className="tab-grip-lines">
                        <span /><span /><span />
                    </div>
                </button>

                <button
                    type="button"
                    className={ `console-tab-btn ${ activeTab === 'friends' ? 'active' : '' }` }
                    onClick={ () => setActiveTab('friends') }
                >
                    <span className="tab-icon">👥</span>
                    <span className="tab-label">AMIGOS</span>
                    <div className="tab-grip-lines">
                        <span /><span /><span />
                    </div>
                </button>

                <button
                    type="button"
                    className={ `console-tab-btn ${ activeTab === 'find' ? 'active' : '' }` }
                    onClick={ () => setActiveTab('find') }
                >
                    <span className="tab-icon">🔍</span>
                    <span className="tab-label">BUSCAR</span>
                    <div className="tab-grip-lines">
                        <span /><span /><span />
                    </div>
                </button>

                <button
                    type="button"
                    className={ `console-tab-btn ${ activeTab === 'help' ? 'active' : '' }` }
                    onClick={ () => setActiveTab('help') }
                >
                    <span className="tab-icon">❓</span>
                    <span className="tab-label">AYUDA</span>
                    <div className="tab-grip-lines">
                        <span /><span /><span />
                    </div>
                </button>
            </div>
        </div>
    );
};
