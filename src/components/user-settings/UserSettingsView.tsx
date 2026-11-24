import { ILinkEventTracker, NitroSettingsEvent, UserSettingsCameraFollowComposer, UserSettingsEvent, UserSettingsOldChatComposer, UserSettingsRoomInvitesComposer, UserSettingsSoundComposer } from '@nitrots/nitro-renderer';
import { FC, useEffect, useState } from 'react';
import { FaVolumeDown, FaVolumeMute, FaVolumeUp } from 'react-icons/fa';
import { AddEventLinkTracker, CreateLinkEvent, DispatchMainEvent, DispatchUiEvent, LocalizeText, RemoveLinkEventTracker, SendMessageComposer } from '../../api';
import { Button, classNames, Column, Flex, HorizontalRule, NitroCardContentView, NitroCardHeaderView, NitroCardView, Text } from '../../common';
import { useCatalogPlaceMultipleItems, useCatalogSkipPurchaseConfirmation, useEraTheme, useMessageEvent } from '../../hooks';
import { useIsMobile, useMobileDpadSettings } from '../../hooks/mobile/useIsMobile';

export const UserSettingsView: FC<{}> = props => {
    const [isVisible, setIsVisible] = useState(false);
    const [userSettings, setUserSettings] = useState<NitroSettingsEvent>(null);
    const [catalogPlaceMultipleObjects, setCatalogPlaceMultipleObjects] = useCatalogPlaceMultipleItems();
    const [catalogSkipPurchaseConfirmation, setCatalogSkipPurchaseConfirmation] = useCatalogSkipPurchaseConfirmation();
    const [infinitePermissions, setInfinitePermissions] = useState<{ credits: { rankHas: boolean, enabled: boolean }, pixels: { rankHas: boolean, enabled: boolean }, points: { rankHas: boolean, enabled: boolean } }>(null);
    const { currentEra, setEra, eras } = useEraTheme();
    const isMobile = useIsMobile();
    const { enabled: dpadEnabled, side: dpadSide, setEnabled: setDpadEnabled, setSide: setDpadSide } = useMobileDpadSettings();

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

    if (!isMobile && currentEra === 'flash2012') {
        const renderVolumeRow2012 = (label: string, id: string, val: number, actionType: string) => {
            const stepIndex = Math.max(0, Math.min(11, Math.round((val / 100) * 11)));

            return (
                <div className="settings-2012-volume-row">
                    <label htmlFor={ id } className="settings-2012-vol-label">{ label }</label>
                    <button
                        type="button"
                        className={ `settings-2012-spk spk-off ${ val === 0 ? 'is-muted' : '' }` }
                        title="Silenciar"
                        onClick={ () => {
                            processAction(actionType, 0);
                            SendMessageComposer(new UserSettingsSoundComposer(
                                actionType === 'system_volume' ? 0 : Math.round(userSettings.volumeSystem),
                                actionType === 'furni_volume' ? 0 : Math.round(userSettings.volumeFurni),
                                actionType === 'trax_volume' ? 0 : Math.round(userSettings.volumeTrax)
                            ));
                        } }
                    />
                    <div className="settings-2012-slider-wrap">
                        <div className="settings-2012-slider-ticks" />
                        <input
                            type="range"
                            id={ id }
                            className="settings-2012-range"
                            min="0"
                            max="11"
                            step="1"
                            value={ stepIndex }
                            aria-valuetext={ `${ stepIndex } de 11` }
                            onChange={ event => {
                                const nextStep = Math.max(0, Math.min(11, Number(event.target.value)));
                                const nextVol = Math.round((nextStep / 11) * 100);
                                processAction(actionType, nextVol);
                            } }
                            onMouseUp={ () => saveRangeSlider('volume') }
                            onTouchEnd={ () => saveRangeSlider('volume') }
                        />
                    </div>
                    <button
                        type="button"
                        className={ `settings-2012-spk spk-on ${ val > 0 ? 'is-active' : '' }` }
                        title="Volumen máximo"
                        onClick={ () => {
                            processAction(actionType, 100);
                            SendMessageComposer(new UserSettingsSoundComposer(
                                actionType === 'system_volume' ? 100 : Math.round(userSettings.volumeSystem),
                                actionType === 'furni_volume' ? 100 : Math.round(userSettings.volumeFurni),
                                actionType === 'trax_volume' ? 100 : Math.round(userSettings.volumeTrax)
                            ));
                        } }
                    />
                </div>
            );
        };

        return (
            <>
                <NitroCardView uniqueKey="user-settings" className="user-settings-window settings-flash2012" theme="primary-slim">
                    <NitroCardHeaderView headerText={ LocalizeText('widget.memenu.settings.title') } onCloseClick={ () => processAction('close_view') } />
                    <NitroCardContentView className="settings-2012-body">
                        <div className="settings-2012-checks">
                            <label className="settings-2012-check-row">
                                <input className="form-check-input" type="checkbox" checked={ userSettings.oldChat } onChange={ event => processAction('oldchat', event.target.checked) } />
                                <span>{ LocalizeText('memenu.settings.chat.prefer.old.chat') }</span>
                            </label>
                            <label className="settings-2012-check-row">
                                <input className="form-check-input" type="checkbox" checked={ userSettings.roomInvites } onChange={ event => processAction('room_invites', event.target.checked) } />
                                <span>{ LocalizeText('memenu.settings.other.ignore.room.invites') }</span>
                            </label>
                            <label className="settings-2012-check-row">
                                <input className="form-check-input" type="checkbox" checked={ userSettings.cameraFollow } onChange={ event => processAction('camera_follow', event.target.checked) } />
                                <span>{ LocalizeText('memenu.settings.other.disable.room.camera.follow') }</span>
                            </label>
                            <label className="settings-2012-check-row">
                                <input className="form-check-input" type="checkbox" checked={ catalogSkipPurchaseConfirmation } onChange={ event => setCatalogSkipPurchaseConfirmation(event.target.checked) } />
                                <span>{ LocalizeText('memenu.settings.other.skip.purchase.confirmation') }</span>
                            </label>
                            <label className="settings-2012-check-row">
                                <input className="form-check-input" type="checkbox" checked={ catalogPlaceMultipleObjects } onChange={ event => setCatalogPlaceMultipleObjects(event.target.checked) } />
                                <span>{ LocalizeText('memenu.settings.other.place.multiple.objects') }</span>
                            </label>
                        </div>

                        { infinitePermissions && (infinitePermissions.credits.rankHas || infinitePermissions.pixels.rankHas || infinitePermissions.points.rankHas) && (
                            <div className="settings-2012-sunk-box">
                                <div className="settings-2012-box-title">{ LocalizeText('memenu.settings.other.infinite.permissions.title') }</div>
                                { infinitePermissions.credits.rankHas && (
                                    <label className="settings-2012-check-row">
                                        <input className="form-check-input" type="checkbox" checked={ infinitePermissions.credits.enabled } onChange={ event => toggleInfinitePermission('credits', event.target.checked) } />
                                        <span>{ LocalizeText('memenu.settings.other.infinite.credits') }</span>
                                    </label>
                                ) }
                                { infinitePermissions.pixels.rankHas && (
                                    <label className="settings-2012-check-row">
                                        <input className="form-check-input" type="checkbox" checked={ infinitePermissions.pixels.enabled } onChange={ event => toggleInfinitePermission('pixels', event.target.checked) } />
                                        <span>Duckets infinitos</span>
                                    </label>
                                ) }
                                { infinitePermissions.points.rankHas && (
                                    <label className="settings-2012-check-row">
                                        <input className="form-check-input" type="checkbox" checked={ infinitePermissions.points.enabled } onChange={ event => toggleInfinitePermission('points', event.target.checked) } />
                                        <span>{ LocalizeText('memenu.settings.other.infinite.points') }</span>
                                    </label>
                                ) }
                            </div>
                        ) }

                        <div className="settings-2012-sunk-box">
                            <div className="settings-2012-box-title">{ LocalizeText('widget.memenu.settings.volume') }</div>
                            { renderVolumeRow2012(LocalizeText('widget.memenu.settings.volume.ui'), 'vol2012-sys', userSettings.volumeSystem, 'system_volume') }
                            { renderVolumeRow2012(LocalizeText('widget.memenu.settings.volume.furni'), 'vol2012-furni', userSettings.volumeFurni, 'furni_volume') }
                            { renderVolumeRow2012(LocalizeText('widget.memenu.settings.volume.trax'), 'vol2012-trax', userSettings.volumeTrax, 'trax_volume') }
                        </div>

                        <div className="settings-2012-sunk-box">
                            <div className="settings-2012-box-title">Versión / Era del Cliente</div>
                            <div className="settings-2012-eras">
                                { eras.map(era => (
                                    <label key={ era.id } className="settings-2012-check-row">
                                        <input
                                            type="radio"
                                            name="era_theme_radio_2012"
                                            className="form-check-input"
                                            checked={ currentEra === era.id }
                                            onChange={ () => setEra(era.id) }
                                        />
                                        <span><strong>{ era.name }</strong> — { era.subtitle }</span>
                                    </label>
                                )) }
                            </div>
                            <div className="d-flex gap-2 mt-2">
                                <button type="button" className="btn-shiny-2012 flex-fill" onClick={ () => CreateLinkEvent('era-selector/open') }>
                                    Selector Visual
                                </button>
                                <button type="button" className="btn-shiny-2012 flex-fill" onClick={ () => CreateLinkEvent('discord/open') }>
                                    Discord
                                </button>
                            </div>
                            <button
                                type="button"
                                className="btn-shiny-2012 w-100 mt-2"
                                onClick={ () => { setIsVisible(false); CreateLinkEvent('tutorial/start'); } }
                            >
                                Ver tutorial del cliente
                            </button>
                        </div>

                        <div className="settings-2012-footer">
                            <button type="button" className="btn-shiny-2012 px-3" onClick={ () => processAction('close_view') }>
                                Volver
                            </button>
                        </div>
                    </NitroCardContentView>
                </NitroCardView>
            </>
        );
    }

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
                        { isMobile ? (
                            <>
                                <HorizontalRule />
                                <Text bold>Controles móviles</Text>
                                <Flex alignItems="center" gap={1}>
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        checked={ dpadEnabled }
                                        onChange={ event => setDpadEnabled(event.target.checked) }
                                    />
                                    <Text>Mostrar joystick de movimiento</Text>
                                </Flex>
                                { dpadEnabled && (
                                    <Flex alignItems="center" justifyContent="between" gap={2} className="mt-1 mb-1">
                                        <Text className="small">Posición del joystick:</Text>
                                        <Flex gap={1}>
                                            <button
                                                type="button"
                                                onClick={ () => setDpadSide('left') }
                                                style={{
                                                    padding: '4px 12px',
                                                    borderRadius: '5px',
                                                    border: '1.5px solid #0b3952',
                                                    backgroundColor: dpadSide === 'left' ? '#165e82' : '#ffffff',
                                                    color: dpadSide === 'left' ? '#ffffff' : '#142633',
                                                    fontSize: '12px',
                                                    fontWeight: 700,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Izquierda
                                            </button>
                                            <button
                                                type="button"
                                                onClick={ () => setDpadSide('right') }
                                                style={{
                                                    padding: '4px 12px',
                                                    borderRadius: '5px',
                                                    border: '1.5px solid #0b3952',
                                                    backgroundColor: dpadSide === 'right' ? '#165e82' : '#ffffff',
                                                    color: dpadSide === 'right' ? '#ffffff' : '#142633',
                                                    fontSize: '12px',
                                                    fontWeight: 700,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Derecha
                                            </button>
                                        </Flex>
                                    </Flex>
                                ) }
                                <Button variant="secondary" className="d-flex align-items-center justify-content-center my-2 py-2" onClick={() => { setIsVisible(false); CreateLinkEvent('tutorial/start'); }}>
                                    <Text bold variant="white">Ver tutorial del cliente</Text>
                                </Button>
                            </>
                        ) : (
                            <>
                                <HorizontalRule />
                                <Text bold>Versión / Era del Juego</Text>
                                <div className="d-flex flex-column gap-1 my-1">
                                    { eras.map(era => (
                                        <label key={ era.id } className="d-flex align-items-center gap-2 cursor-pointer mb-0">
                                            <input
                                                type="radio"
                                                name="era_theme_radio"
                                                className="form-check-input"
                                                checked={ currentEra === era.id }
                                                onChange={ () => setEra(era.id) }
                                            />
                                            <span className="small"><strong>{ era.name }</strong> - { era.subtitle }</span>
                                        </label>
                                    )) }
                                </div>
                                <Button variant="primary" className="d-flex align-items-center justify-content-center my-2 py-2" onClick={() => CreateLinkEvent('era-selector/open')}>
                                    <Text bold variant="white">Selector de Versión Visual</Text>
                                </Button>
                                <Button variant="secondary" className="d-flex align-items-center justify-content-center mb-2 py-2" onClick={() => { setIsVisible(false); CreateLinkEvent('tutorial/start'); }}>
                                    <Text bold variant="white">Ver tutorial del cliente</Text>
                                </Button>
                            </>
                        ) }
                        <HorizontalRule />
                        <Button variant="primary" className="d-flex align-items-center justify-content-center my-2 py-2" onClick={() => CreateLinkEvent('discord/open')}>
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
        </>
    );
}
