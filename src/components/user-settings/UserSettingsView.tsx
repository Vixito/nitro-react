import { ILinkEventTracker, NitroSettingsEvent, UserSettingsCameraFollowComposer, UserSettingsEvent, UserSettingsOldChatComposer, UserSettingsRoomInvitesComposer, UserSettingsSoundComposer } from '@nitrots/nitro-renderer';
import { FC, useEffect, useState } from 'react';
import { FaVolumeDown, FaVolumeMute, FaVolumeUp } from 'react-icons/fa';
import { AddEventLinkTracker, DispatchMainEvent, DispatchUiEvent, LocalizeText, RemoveLinkEventTracker, SendMessageComposer } from '../../api';
import { Button, classNames, Column, Flex, HorizontalRule, NitroCardContentView, NitroCardHeaderView, NitroCardView, Text } from '../../common';
import { useCatalogPlaceMultipleItems, useCatalogSkipPurchaseConfirmation, useMessageEvent } from '../../hooks';

export const UserSettingsView: FC<{}> = props => {
    const [isVisible, setIsVisible] = useState(false);
    const [userSettings, setUserSettings] = useState<NitroSettingsEvent>(null);
    const [catalogPlaceMultipleObjects, setCatalogPlaceMultipleObjects] = useCatalogPlaceMultipleItems();
    const [catalogSkipPurchaseConfirmation, setCatalogSkipPurchaseConfirmation] = useCatalogSkipPurchaseConfirmation();
    const [infinitePermissions, setInfinitePermissions] = useState<{ credits: { rankHas: boolean, enabled: boolean }, pixels: { rankHas: boolean, enabled: boolean }, points: { rankHas: boolean, enabled: boolean } }>(null);
    const [showDiscordModal, setShowDiscordModal] = useState(false);
    const [discordTag, setDiscordTag] = useState(localStorage.getItem('habbten_discord_tag') || '');
    const [isDiscordConnected, setIsDiscordConnected] = useState(!!localStorage.getItem('habbten_discord_tag'));
    const [discordStatusMsg, setDiscordStatusMsg] = useState('');

    const loadInfinitePermissions = async () => {
        try {
            const response = await fetch('/api/user/permissions');

            if (response.ok) {
                const data = await response.json();

                if (data.success) setInfinitePermissions(data.permissions);
            }
        }
        catch (e) {
            // ignore
        }
    };

    const toggleInfinitePermission = async (name: string, enabled: boolean) => {
        if (!infinitePermissions || !infinitePermissions[name]) return;

        setInfinitePermissions(prevValue => ({ ...prevValue, [name]: { ...prevValue[name], enabled } }));

        try {
            await fetch('/api/user/permissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [name]: enabled })
            });
        }
        catch (e) {
            setInfinitePermissions(prevValue => ({ ...prevValue, [name]: { ...prevValue[name], enabled: !enabled } }));
        }
    };

    const processAction = (type: string, value?: boolean | number | string) => {
        let doUpdate = true;

        const clone = userSettings.clone();

        switch (type) {
            case 'close_view':
                setIsVisible(false);
                doUpdate = false;
                return;
            case 'oldchat':
                clone.oldChat = value as boolean;
                SendMessageComposer(new UserSettingsOldChatComposer(clone.oldChat));
                break;
            case 'room_invites':
                clone.roomInvites = value as boolean;
                SendMessageComposer(new UserSettingsRoomInvitesComposer(clone.roomInvites));
                break;
            case 'camera_follow':
                clone.cameraFollow = value as boolean;
                SendMessageComposer(new UserSettingsCameraFollowComposer(clone.cameraFollow));
                break;
            case 'system_volume':
                clone.volumeSystem = value as number;
                clone.volumeSystem = Math.max(0, clone.volumeSystem);
                clone.volumeSystem = Math.min(100, clone.volumeSystem);
                break;
            case 'furni_volume':
                clone.volumeFurni = value as number;
                clone.volumeFurni = Math.max(0, clone.volumeFurni);
                clone.volumeFurni = Math.min(100, clone.volumeFurni);
                break;
            case 'trax_volume':
                clone.volumeTrax = value as number;
                clone.volumeTrax = Math.max(0, clone.volumeTrax);
                clone.volumeTrax = Math.min(100, clone.volumeTrax);
                break;
        }

        if (doUpdate) setUserSettings(clone);

        DispatchMainEvent(clone)
    }

    const saveRangeSlider = (type: string) => {
        switch (type) {
            case 'volume':
                SendMessageComposer(new UserSettingsSoundComposer(Math.round(userSettings.volumeSystem), Math.round(userSettings.volumeFurni), Math.round(userSettings.volumeTrax)));
                break;
        }
    }

    useMessageEvent<UserSettingsEvent>(UserSettingsEvent, event => {
        const parser = event.getParser();
        const settingsEvent = new NitroSettingsEvent();

        settingsEvent.volumeSystem = parser.volumeSystem;
        settingsEvent.volumeFurni = parser.volumeFurni;
        settingsEvent.volumeTrax = parser.volumeTrax;
        settingsEvent.oldChat = parser.oldChat;
        settingsEvent.roomInvites = parser.roomInvites;
        settingsEvent.cameraFollow = parser.cameraFollow;
        settingsEvent.flags = parser.flags;
        settingsEvent.chatType = parser.chatType;

        setUserSettings(settingsEvent);
        DispatchMainEvent(settingsEvent);
    });

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        setIsVisible(true);
                        loadInfinitePermissions();
                        return;
                    case 'hide':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setIsVisible(prevValue => {
                            const newValue = !prevValue;

                            if (newValue) loadInfinitePermissions();

                            return newValue;
                        });
                        return;
                }
            },
            eventUrlPrefix: 'user-settings/'
        };

        AddEventLinkTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    useEffect(() => {
        if (!userSettings) return;

        DispatchUiEvent(userSettings);
    }, [userSettings]);

    if (!isVisible || !userSettings) return null;

    return (
        <>
            <NitroCardView uniqueKey="user-settings" className="user-settings-window" theme="primary-slim">
                <NitroCardHeaderView headerText={LocalizeText('widget.memenu.settings.title')} onCloseClick={event => processAction('close_view')} />
                <NitroCardContentView className="text-black">
                    <Column gap={1}>
                        <Flex alignItems="center" gap={1}>
                            <input className="form-check-input" type="checkbox" checked={userSettings.oldChat} onChange={event => processAction('oldchat', event.target.checked)} />
                            <Text>{LocalizeText('memenu.settings.chat.prefer.old.chat')}</Text>
                        </Flex>
                        <Flex alignItems="center" gap={1}>
                            <input className="form-check-input" type="checkbox" checked={userSettings.roomInvites} onChange={event => processAction('room_invites', event.target.checked)} />
                            <Text>{LocalizeText('memenu.settings.other.ignore.room.invites')}</Text>
                        </Flex>
                        <Flex alignItems="center" gap={1}>
                            <input className="form-check-input" type="checkbox" checked={userSettings.cameraFollow} onChange={event => processAction('camera_follow', event.target.checked)} />
                            <Text>{LocalizeText('memenu.settings.other.disable.room.camera.follow')}</Text>
                        </Flex>
                        <Flex alignItems="center" gap={1}>
                            <input className="form-check-input" type="checkbox" checked={catalogPlaceMultipleObjects} onChange={event => setCatalogPlaceMultipleObjects(event.target.checked)} />
                            <Text>{LocalizeText('memenu.settings.other.place.multiple.objects')}</Text>
                        </Flex>
                        <Flex alignItems="center" gap={1}>
                            <input className="form-check-input" type="checkbox" checked={catalogSkipPurchaseConfirmation} onChange={event => setCatalogSkipPurchaseConfirmation(event.target.checked)} />
                            <Text>{LocalizeText('memenu.settings.other.skip.purchase.confirmation')}</Text>
                        </Flex>
                        <HorizontalRule />
                        <Button variant="primary" className="d-flex align-items-center justify-content-center py-1.5" onClick={() => setShowDiscordModal(true)}>
                            <Text bold variant="white">Conectar a Discord</Text>
                        </Button>
                        {infinitePermissions && (infinitePermissions.credits.rankHas || infinitePermissions.pixels.rankHas || infinitePermissions.points.rankHas) &&
                            <>
                                <HorizontalRule />
                                <Text bold>{LocalizeText('memenu.settings.other.infinite.permissions.title')}</Text>
                                {infinitePermissions.credits.rankHas &&
                                    <Flex alignItems="center" gap={1}>
                                        <input className="form-check-input" type="checkbox" checked={infinitePermissions.credits.enabled} onChange={event => toggleInfinitePermission('credits', event.target.checked)} />
                                        <Text>{LocalizeText('memenu.settings.other.infinite.credits')}</Text>
                                    </Flex>}
                                {infinitePermissions.pixels.rankHas &&
                                    <Flex alignItems="center" gap={1}>
                                        <input className="form-check-input" type="checkbox" checked={infinitePermissions.pixels.enabled} onChange={event => toggleInfinitePermission('pixels', event.target.checked)} />
                                        <Text>{LocalizeText('memenu.settings.other.infinite.pixels')}</Text>
                                    </Flex>}
                                {infinitePermissions.points.rankHas &&
                                    <Flex alignItems="center" gap={1}>
                                        <input className="form-check-input" type="checkbox" checked={infinitePermissions.points.enabled} onChange={event => toggleInfinitePermission('points', event.target.checked)} />
                                        <Text>{LocalizeText('memenu.settings.other.infinite.points')}</Text>
                                    </Flex>}
                            </>}
                    </Column>
                    <Column>
                        <Text bold>{LocalizeText('widget.memenu.settings.volume')}</Text>
                        <Column gap={1}>
                            <Text>{LocalizeText('widget.memenu.settings.volume.ui')}</Text>
                            <Flex alignItems="center" gap={1}>
                                {(userSettings.volumeSystem === 0) && <FaVolumeMute className={classNames((userSettings.volumeSystem >= 50) && 'text-muted', 'fa-icon')} />}
                                {(userSettings.volumeSystem > 0) && <FaVolumeDown className={classNames((userSettings.volumeSystem >= 50) && 'text-muted', 'fa-icon')} />}
                                <input type="range" className="custom-range w-100" min="0" max="100" step="1" id="volumeSystem" value={userSettings.volumeSystem} onChange={event => processAction('system_volume', event.target.value)} onMouseUp={() => saveRangeSlider('volume')} />
                                <FaVolumeUp className={classNames((userSettings.volumeSystem < 50) && 'text-muted', 'fa-icon')} />
                            </Flex>
                        </Column>
                        <Column gap={1}>
                            <Text>{LocalizeText('widget.memenu.settings.volume.furni')}</Text>
                            <Flex alignItems="center" gap={1}>
                                {(userSettings.volumeFurni === 0) && <FaVolumeMute className={classNames((userSettings.volumeFurni >= 50) && 'text-muted', 'fa-icon')} />}
                                {(userSettings.volumeFurni > 0) && <FaVolumeDown className={classNames((userSettings.volumeFurni >= 50) && 'text-muted', 'fa-icon')} />}
                                <input type="range" className="custom-range w-100" min="0" max="100" step="1" id="volumeFurni" value={userSettings.volumeFurni} onChange={event => processAction('furni_volume', event.target.value)} onMouseUp={() => saveRangeSlider('volume')} />
                                <FaVolumeUp className={classNames((userSettings.volumeFurni < 50) && 'text-muted', 'fa-icon')} />
                            </Flex>
                        </Column>
                        <Column gap={1}>
                            <Text>{LocalizeText('widget.memenu.settings.volume.trax')}</Text>
                            <Flex alignItems="center" gap={1}>
                                {(userSettings.volumeTrax === 0) && <FaVolumeMute className={classNames((userSettings.volumeTrax >= 50) && 'text-muted', 'fa-icon')} />}
                                {(userSettings.volumeTrax > 0) && <FaVolumeDown className={classNames((userSettings.volumeTrax >= 50) && 'text-muted', 'fa-icon')} />}
                                <input type="range" className="custom-range w-100" min="0" max="100" step="1" id="volumeTrax" value={userSettings.volumeTrax} onChange={event => processAction('trax_volume', event.target.value)} onMouseUp={() => saveRangeSlider('volume')} />
                                <FaVolumeUp className={classNames((userSettings.volumeTrax < 50) && 'text-muted', 'fa-icon')} />
                            </Flex>
                        </Column>
                    </Column>
                </NitroCardContentView>
            </NitroCardView>
            {showDiscordModal && (
                <NitroCardView uniqueKey="nitro-discord-settings" theme="primary-slim" className="nitro-discord-settings" style={{ zIndex: 1050, width: 430, backgroundColor: '#2d2847', color: '#ffffff', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
                    <NitroCardHeaderView headerText="Habbten Actividad en Discord" onCloseClick={() => setShowDiscordModal(false)} />
                    <NitroCardContentView className="p-3" style={{ backgroundColor: '#2d2847', color: '#ffffff' }}>
                        <div className="d-flex align-items-center gap-3 mb-3">
                            <div style={{ width: 64, height: 64, minWidth: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="60" height="60" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M32 6L56 18V44L32 58L8 44V18L32 6Z" fill="#5865F2" stroke="#4752C4" strokeWidth="2"/>
                                    <path d="M32 6L56 18L32 30L8 18L32 6Z" fill="#7983F5"/>
                                    <path d="M32 30V58L8 44V18L32 30Z" fill="#4752C4"/>
                                    <path d="M32 30V58L56 44V18L32 30Z" fill="#5865F2"/>
                                    <path d="M24 24C22.5 24.5 21 25.5 20 27.5C20 33.5 23 39 27 41C28 40 29 38.5 30 37.5C27.5 36.8 26.5 35 26.5 35C26.5 35 27 35.3 28 35.8C30.5 37 33 37.5 35.5 37.5C38 37.5 40.5 37 43 35.8C44 35.3 44.5 35 44.5 35C44.5 35 43.5 36.8 41 37.5C42 38.5 43 40 44 41C48 39 51 33.5 51 27.5C50 25.5 48.5 24.5 47 24C45.5 26 44.5 28 44 30C41.5 29.5 39 29.5 35.5 29.5C32 29.5 29.5 29.5 27 30C26.5 28 25.5 26 24 24Z" fill="white"/>
                                </svg>
                            </div>
                            <div>
                                <div className="fw-bold mb-1" style={{ fontSize: '15px', color: '#ffffff' }}>Conecta Habbten a Discord</div>
                                <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4' }}>
                                    ¡Hemos detectado que tienes un auténtico espíritu gamer! *Choca esos cinco*<br />
                                    ¿Quieres que tus amigos/as sepan lo que estás haciendo en este loco hotel?
                                </div>
                            </div>
                        </div>

                        <div className="mb-3 p-3 rounded" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div className="fw-bold mb-2 text-white" style={{ fontSize: '13px' }}>Ajustes:</div>
                            <div className="d-flex flex-column gap-2" style={{ fontSize: '12px' }}>
                                <label className="d-flex align-items-center gap-2 cursor-pointer mb-0 ps-1">
                                    <input type="checkbox" className="form-check-input mt-0" defaultChecked />
                                    <span className="text-white">Mostrar Habbten en mi estado de Discord</span>
                                </label>
                                <label className="d-flex align-items-center gap-2 cursor-pointer mb-0 ps-1">
                                    <input type="checkbox" className="form-check-input mt-0" defaultChecked />
                                    <span className="text-white">Compartir mi actividad dentro del juego</span>
                                </label>
                                <div className="ps-4 d-flex flex-column gap-2">
                                    <label className="d-flex align-items-center gap-2 cursor-pointer mb-0">
                                        <input type="checkbox" className="form-check-input mt-0" defaultChecked />
                                        <span style={{ color: '#cbd5e1' }}>Esconder actividad en salas ocultas</span>
                                    </label>
                                    <label className="d-flex align-items-center gap-2 cursor-pointer mb-0">
                                        <input type="checkbox" className="form-check-input mt-0" defaultChecked />
                                        <span style={{ color: '#cbd5e1' }}>Permitir que los/as usuarios/as se unan a mí</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="mb-3">
                            <div className="fw-bold mb-1.5 text-white" style={{ fontSize: '13px' }}>Paso 1: Servidor Oficial de Habbten</div>
                            <a href="https://discord.com/invite/EVafmrDh" target="_blank" rel="noopener noreferrer" className="d-flex align-items-center justify-content-between p-2.5 rounded text-decoration-none" style={{ background: '#3f385c', border: '1px solid #5a4f7e', color: '#ffffff' }}>
                                <div className="d-flex align-items-center gap-3">
                                    <div style={{ width: 40, height: 40, minWidth: 40, background: '#261f38', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #5a4f7e' }}>
                                        <img src="hotel-icon.png" onError={({ currentTarget }) => { currentTarget.src = '/game/hotel-icon.png'; }} width="32" height="32" style={{ objectFit: 'contain' }} alt="" />
                                    </div>
                                    <div>
                                        <div className="fw-bold text-white" style={{ fontSize: '13px' }}>Servidor Oficial de Habbten</div>
                                        <div style={{ fontSize: '11px', color: '#cbd5e1' }}>Únete a nuestra comunidad oficial</div>
                                    </div>
                                </div>
                                <span className="btn btn-sm py-1.5 px-3 fw-bold" style={{ background: '#5865F2', color: '#ffffff', border: 'none', fontSize: '12px', borderRadius: '6px' }}>
                                    Unirse
                                </span>
                            </a>
                        </div>

                        <div className="p-3 rounded mb-3" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div className="fw-bold mb-2 text-white" style={{ fontSize: '12px' }}>Paso 2: Escribe tu Usuario de Discord:</div>
                            <div className="input-group">
                                <span className="input-group-text bg-dark text-white border-secondary">@</span>
                                <input
                                    type="text"
                                    className="form-control bg-dark text-white border-secondary"
                                    placeholder="tu_usuario_discord"
                                    value={discordTag}
                                    onChange={e => setDiscordTag(e.target.value)}
                                    style={{ fontSize: '12px' }}
                                />
                                <button
                                    type="button"
                                    className={`btn ${isDiscordConnected ? 'btn-success' : 'btn-primary'} fw-bold px-3`}
                                    style={{ fontSize: '12px' }}
                                    onClick={() => {
                                        if (discordTag.trim()) {
                                            localStorage.setItem('habbten_discord_tag', discordTag.trim());
                                            setIsDiscordConnected(true);
                                            setDiscordStatusMsg('¡Cuenta vinculada correctamente!');
                                            setTimeout(() => setDiscordStatusMsg(''), 3000);
                                        } else {
                                            localStorage.removeItem('habbten_discord_tag');
                                            setIsDiscordConnected(false);
                                            setDiscordStatusMsg('Cuenta desvinculada.');
                                            setTimeout(() => setDiscordStatusMsg(''), 3000);
                                        }
                                    }}
                                >
                                    {isDiscordConnected ? '✓ Vinculado' : 'Vincular'}
                                </button>
                            </div>
                            {discordStatusMsg && <div className="text-success small text-center mt-1.5">{discordStatusMsg}</div>}
                        </div>

                        <button
                            type="button"
                            className="btn w-100 py-2 fw-bold"
                            style={{ background: '#1e1b4b', color: '#c7d2fe', border: '1px solid #4338ca', fontSize: '12px' }}
                            onClick={() => setShowDiscordModal(false)}
                        >
                            ¿Habbten en Discord? ¿Con esta economía..? ¡Sácame de aquí!
                        </button>
                    </NitroCardContentView>
                </NitroCardView>
            )}
        </>
    );
}
