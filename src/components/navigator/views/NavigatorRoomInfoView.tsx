import { GetCustomRoomFilterMessageComposer, NavigatorSearchComposer, RoomMuteComposer, RoomSettingsComposer, SecurityLevel, ToggleStaffPickMessageComposer, UpdateHomeRoomMessageComposer } from '@nitrots/nitro-renderer';
import { ChangeEvent, FC, useEffect, useRef, useState } from 'react';
import { FaDownload, FaLink, FaUpload } from 'react-icons/fa';
import { CreateLinkEvent, DispatchUiEvent, GetGroupInformation, GetSessionDataManager, LocalizeText, ReportType, SendMessageComposer, TryVisitRoom } from '../../../api';
import { Button, classNames, Column, Flex, LayoutBadgeImageView, LayoutRoomThumbnailView, NitroCardContentView, NitroCardHeaderView, NitroCardView, Text, UserProfileIconView } from '../../../common';
import { RoomWidgetThumbnailEvent } from '../../../events';
import { useHelp, useNavigator } from '../../../hooks';

interface ParsedRoomBackup
{
    format: string;
    version?: number;
    exportedAt?: string;
    sourceRoomId?: number;
    room: {
        name?: string;
        description?: string;
        model?: string;
        override_model?: string;
    };
    customModel?: { heightmap?: string } | null;
    items: Array<Record<string, unknown>>;
    stats?: {
        totalItems?: number;
        floorItems?: number;
        wallItems?: number;
        wiredCount?: number;
    };
}

export class NavigatorRoomInfoViewProps
{
    onCloseClick: () => void;
}

export const NavigatorRoomInfoView: FC<NavigatorRoomInfoViewProps> = props =>
{
    const { onCloseClick = null } = props;
    const [ isRoomPicked, setIsRoomPicked ] = useState(false);
    const [ isRoomMuted, setIsRoomMuted ] = useState(false);
    const [ backupBusy, setBackupBusy ] = useState(false);
    const [ backupNotice, setBackupNotice ] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
    const [ pendingImport, setPendingImport ] = useState<{ fileName: string; data: ParsedRoomBackup } | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const { report = null } = useHelp();
    const { navigatorData = null } = useNavigator();

    const hasPermission = (permission: string) =>
    {
        switch(permission)
        {
            case 'settings':
                return (GetSessionDataManager().userId === navigatorData.enteredGuestRoom.ownerId || GetSessionDataManager().isModerator);
            case 'staff_pick':
                return GetSessionDataManager().securityLevel >= SecurityLevel.COMMUNITY;
            default: return false;
        }
    }

    const processAction = (action: string, value?: string) =>
    {
        if(!navigatorData || !navigatorData.enteredGuestRoom) return;

        switch(action)
        {
            case 'set_home_room':
                let newRoomId = -1;

                if(navigatorData.homeRoomId !== navigatorData.enteredGuestRoom.roomId)
                {
                    newRoomId = navigatorData.enteredGuestRoom.roomId;
                }

                if(newRoomId > 0) SendMessageComposer(new UpdateHomeRoomMessageComposer(newRoomId));
                return;
            case 'navigator_search_tag':
                CreateLinkEvent(`navigator/search/${ value }`);
                SendMessageComposer(new NavigatorSearchComposer('hotel_view', `tag:${ value }`));
                return;
            case 'open_room_thumbnail_camera':
                DispatchUiEvent(new RoomWidgetThumbnailEvent(RoomWidgetThumbnailEvent.TOGGLE_THUMBNAIL));
                return;
            case 'open_group_info':
                GetGroupInformation(navigatorData.enteredGuestRoom.habboGroupId);
                return;
            case 'toggle_room_link':
                CreateLinkEvent('navigator/toggle-room-link');
                return;
            case 'open_room_settings':
                SendMessageComposer(new RoomSettingsComposer(navigatorData.enteredGuestRoom.roomId));
                return;
            case 'toggle_pick':
                setIsRoomPicked(value => !value);
                SendMessageComposer(new ToggleStaffPickMessageComposer(navigatorData.enteredGuestRoom.roomId));
                return;
            case 'toggle_mute':
                setIsRoomMuted(value => !value);
                SendMessageComposer(new RoomMuteComposer());
                return;
            case 'room_filter':
                SendMessageComposer(new GetCustomRoomFilterMessageComposer(navigatorData.enteredGuestRoom.roomId));
                return;
            case 'open_floorplan_editor':
                CreateLinkEvent('floor-editor/toggle');
                return;
            case 'report_room':
                report(ReportType.ROOM, { roomId: navigatorData.enteredGuestRoom.roomId, roomName: navigatorData.enteredGuestRoom.roomName });
                return;
            case 'close':
                onCloseClick();
                return;
        }

    }

    const handleExportRoom = async () =>
    {
        if(!navigatorData?.enteredGuestRoom || backupBusy) return;
        const roomId = navigatorData.enteredGuestRoom.roomId;
        setBackupBusy(true);
        setBackupNotice(null);
        try
        {
            const res = await fetch(`/api/client/rooms/${ roomId }/export`, {
                method: 'GET',
                credentials: 'include'
            });
            if(!res.ok)
            {
                let errMsg = 'No se pudo exportar la sala.';
                try
                {
                    const j = await res.json();
                    if(j?.error) errMsg = j.error;
                }
                catch {}
                setBackupNotice({ type: 'err', text: errMsg });
                return;
            }
            const blob = await res.blob();
            const disp = res.headers.get('Content-Disposition') || '';
            const match = disp.match(/filename="?([^"]+)"?/i);
            const fileName = match?.[1] || `habbten_sala_${ roomId }.habbten-room.json`;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1500);
            setBackupNotice({ type: 'ok', text: `Copia guardada (${ fileName }).` });
        }
        catch
        {
            setBackupNotice({ type: 'err', text: 'Error de conexión al exportar la sala.' });
        }
        finally
        {
            setBackupBusy(false);
        }
    };

    const handleTriggerImportPicker = () =>
    {
        if(backupBusy) return;
        setBackupNotice(null);
        if(fileInputRef.current)
        {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    };

    const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) =>
    {
        const file = event.target.files?.[0];
        if(!file) return;
        setBackupNotice(null);

        if(file.size > 4.5 * 1024 * 1024)
        {
            setBackupNotice({ type: 'err', text: 'El archivo es demasiado grande (máximo 4.5 MB).' });
            return;
        }

        try
        {
            const rawText = await file.text();
            const parsed = JSON.parse(rawText) as ParsedRoomBackup;
            if(!parsed || parsed.format !== 'habbten_room_backup' || !parsed.room || !Array.isArray(parsed.items))
            {
                setBackupNotice({ type: 'err', text: 'Archivo inválido. Usa un .habbten-room.json exportado desde Habbten.' });
                return;
            }
            setPendingImport({ fileName: file.name, data: parsed });
        }
        catch
        {
            setBackupNotice({ type: 'err', text: 'No se pudo leer el archivo JSON de la sala.' });
        }
    };

    const handleConfirmImport = async () =>
    {
        if(!navigatorData?.enteredGuestRoom || !pendingImport || backupBusy) return;
        const roomId = navigatorData.enteredGuestRoom.roomId;
        setBackupBusy(true);
        setBackupNotice(null);

        try
        {
            const res = await fetch(`/api/client/rooms/${ roomId }/import`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    backup: pendingImport.data,
                    restoreMetadata: true
                })
            });
            const data = await res.json();
            if(!res.ok || !data?.success)
            {
                setBackupNotice({ type: 'err', text: data?.error || 'Error al importar la sala.' });
                return;
            }

            const missingPart = data.missingItems > 0 ? ` (${ data.missingItems } no estaban en tu inventario)` : '';
            const wiredPart = data.wiredRemapped > 0 ? `, ${ data.wiredRemapped } Wired reconectados` : '';
            setPendingImport(null);
            setBackupNotice({
                type: 'ok',
                text: `Restaurada: ${ data.restoredItems }/${ data.totalItems } furnis${ wiredPart }${ missingPart }. Recargando sala...`
            });

            setTimeout(() =>
            {
                TryVisitRoom(roomId);
                onCloseClick();
            }, 900);
        }
        catch
        {
            setBackupNotice({ type: 'err', text: 'Error de conexión al restaurar la sala.' });
        }
        finally
        {
            setBackupBusy(false);
        }
    };

    useEffect(() =>
    {
        if(!navigatorData) return;

        setIsRoomPicked(navigatorData.currentRoomIsStaffPick);

        if(navigatorData.enteredGuestRoom) setIsRoomMuted(navigatorData.enteredGuestRoom.allInRoomMuted);
    }, [ navigatorData ]);

    useEffect(() =>
    {
        setPendingImport(null);
        setBackupNotice(null);
    }, [ navigatorData?.enteredGuestRoom?.roomId ]);

    if(!navigatorData.enteredGuestRoom) return null;

    return (
        <NitroCardView className="nitro-room-info" theme="primary-slim">
            <NitroCardHeaderView headerText={ LocalizeText('navigator.roomsettings.roominfo') } onCloseClick={ () => processAction('close') } />
            <NitroCardContentView className="text-black">
                { navigatorData.enteredGuestRoom &&
                    <>
                        <Flex gap={ 2 } overflow="hidden">
                            <LayoutRoomThumbnailView roomId={ navigatorData.enteredGuestRoom.roomId } customUrl={ navigatorData.enteredGuestRoom.officialRoomPicRef } position="relative" className="flex-shrink-0">
                                { (hasPermission('settings') || navigatorData.currentRoomOwner || (navigatorData.enteredGuestRoom.ownerId === GetSessionDataManager().userId)) &&
                                    <Flex center position="absolute" className="top-0 end-0 m-1 p-1 bg-dark bg-opacity-75 rounded cursor-pointer" title="Tomar / cambiar miniatura" onClick={ () => processAction('open_room_thumbnail_camera') } style={ { zIndex: 10 } }>
                                        <i className="icon icon-camera-small" />
                                    </Flex> }
                            </LayoutRoomThumbnailView>
                            <Column grow gap={ 1 } overflow="hidden" className="min-w-0">
                                <Flex gap={ 1 } className="min-w-0">
                                    <Column grow gap={ 1 } className="min-w-0">
                                        <Flex gap={ 1 } alignItems="start" className="min-w-0">
                                            <i onClick={ () => processAction('set_home_room') } className={ classNames('flex-shrink-0 icon icon-house-small cursor-pointer mt-1', ((navigatorData.homeRoomId !== navigatorData.enteredGuestRoom.roomId) && 'gray')) } />
                                            <Text bold className="text-break" style={ { lineHeight: 1.25 } }>{ navigatorData.enteredGuestRoom.roomName }</Text>
                                        </Flex>
                                        { navigatorData.enteredGuestRoom.showOwner &&
                                            <Flex alignItems="center" gap={ 1 }>
                                                <Text variant="muted">{ LocalizeText('navigator.roomownercaption') }</Text>
                                                <Flex alignItems="center" gap={ 1 }>
                                                    <UserProfileIconView userId={ navigatorData.enteredGuestRoom.ownerId } />
                                                    <Text>{ navigatorData.enteredGuestRoom.ownerName }</Text>
                                                </Flex>
                                            </Flex> }
                                        <Flex alignItems="center" gap={ 1 }>
                                            <Text variant="muted">{ LocalizeText('navigator.roomrating') }</Text>
                                            <Text>{ navigatorData.currentRoomRating }</Text>
                                        </Flex>
                                        { (navigatorData.enteredGuestRoom.tags.length > 0) &&
                                            <Flex alignItems="center" gap={ 1 } className="flex-wrap">
                                                { navigatorData.enteredGuestRoom.tags.map(tag =>
                                                {
                                                    return <Text key={ tag } pointer className="bg-muted rounded px-1 py-0" style={ { fontSize: '0.85em', lineHeight: 1.5 } } onClick={ event => processAction('navigator_search_tag', tag) }>#{ tag }</Text>
                                                }) }
                                            </Flex> }
                                    </Column>
                                    <Column alignItems="center" gap={ 1 } className="flex-shrink-0">
                                        { hasPermission('settings') &&
                                            <i className="icon icon-cog cursor-pointer" title={ LocalizeText('navigator.room.popup.info.room.settings') } onClick={ () => processAction('open_room_settings') } /> }
                                        <FaLink title={ LocalizeText('navigator.embed.caption') } className="cursor-pointer fa-icon" onClick={ () => CreateLinkEvent('navigator/toggle-room-link') } />
                                    </Column>
                                </Flex>
                                <Text overflow="auto" className="text-break" style={ { maxHeight: 72, lineHeight: 1.35 } }>{ navigatorData.enteredGuestRoom.description }</Text>
                                { (navigatorData.enteredGuestRoom.habboGroupId > 0) &&
                                    <Flex pointer alignItems="center" gap={ 1 } onClick={ () => processAction('open_group_info') }>
                                        <LayoutBadgeImageView className="flex-none" badgeCode={ navigatorData.enteredGuestRoom.groupBadgeCode } isGroup={ true } />
                                        <Text underline>
                                            { LocalizeText('navigator.guildbase', [ 'groupName' ], [ navigatorData.enteredGuestRoom.groupName ]) }
                                        </Text>
                                    </Flex> }
                            </Column>
                        </Flex>
                        <Column gap={ 1 }>
                            { hasPermission('staff_pick') &&
                            <Button onClick={ () => processAction('toggle_pick') }>
                                { LocalizeText(isRoomPicked ? 'navigator.staffpicks.unpick' : 'navigator.staffpicks.pick') }
                            </Button> }
                            <Button variant="danger" onClick={ () => processAction('report_room') }>
                                { LocalizeText('help.emergency.main.report.room') }
                            </Button>
                            { hasPermission('settings') &&
                            <>
                                <Button onClick={ () => processAction('toggle_mute') }>
                                    { LocalizeText(isRoomMuted ? 'navigator.muteall_on' : 'navigator.muteall_off') }
                                </Button>
                                <Button onClick={ () => processAction('room_filter') }>
                                    { LocalizeText('navigator.roomsettings.roomfilter') }
                                </Button>
                                <Button onClick={ () => processAction('open_floorplan_editor') }>
                                    { LocalizeText('open.floor.plan.editor') }
                                </Button>
                                <input
                                    ref={ fileInputRef }
                                    type="file"
                                    accept=".json,.habbten-room.json,application/json"
                                    style={ { display: 'none' } }
                                    onChange={ handleFileSelected }
                                />
                                <Flex gap={ 1 } className="room-backup-btn-row">
                                    <Button fullWidth disabled={ backupBusy } onClick={ handleExportRoom }>
                                        <FaDownload className="me-1" />
                                        Exportar Sala
                                    </Button>
                                    <Button fullWidth disabled={ backupBusy } onClick={ handleTriggerImportPicker }>
                                        <FaUpload className="me-1" />
                                        Importar Sala
                                    </Button>
                                </Flex>
                                { pendingImport && (
                                    <div className="room-backup-confirm-box">
                                        <div className="room-backup-confirm-title">Restaurar copia en esta sala</div>
                                        <div className="room-backup-confirm-meta">
                                            <div><strong>Sala:</strong> { pendingImport.data.room?.name || pendingImport.fileName }</div>
                                            <div>
                                                <strong>Furnis:</strong> { pendingImport.data.items.length }
                                                { (pendingImport.data.stats?.wiredCount || 0) > 0 && ` | Wired: ${ pendingImport.data.stats?.wiredCount }` }
                                                { pendingImport.data.customModel?.heightmap && ' | Plano personalizado' }
                                            </div>
                                        </div>
                                        <div className="room-backup-warn">
                                            Se reemplazará el diseño actual de esta sala por la copia seleccionada. Los furnis actuales volverán a tu inventario.
                                        </div>
                                        <Flex gap={ 1 }>
                                            <Button fullWidth variant="success" disabled={ backupBusy } onClick={ handleConfirmImport }>
                                                { backupBusy ? 'Restaurando...' : 'Restaurar ahora' }
                                            </Button>
                                            <Button variant="secondary" disabled={ backupBusy } onClick={ () => setPendingImport(null) }>
                                                Cancelar
                                            </Button>
                                        </Flex>
                                    </div>
                                ) }
                                { backupNotice && (
                                    <div className={ `room-backup-notice ${ backupNotice.type === 'ok' ? 'is-ok' : 'is-err' }` }>
                                        { backupNotice.text }
                                    </div>
                                ) }
                            </> }
                        </Column>
                    </> }

            </NitroCardContentView>
        </NitroCardView>
    );
};
