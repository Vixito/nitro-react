import { CrackableDataType, GroupInformationComposer, GroupInformationEvent, NowPlayingEvent, RoomControllerLevel, RoomObjectCategory, RoomObjectOperationType, RoomObjectVariable, RoomWidgetEnumItemExtradataParameter, RoomWidgetFurniInfoUsagePolicyEnum, SetObjectDataMessageComposer, SongInfoReceivedEvent, StringDataType, Vector3d } from '@nitrots/nitro-renderer';
import { FC, useCallback, useEffect, useState } from 'react';
import { FaTimes, FaUndo } from 'react-icons/fa';
import close2012Img from '../../../../../assets/images/infostand/close-2012.png';
import { AvatarInfoFurni, CreateLinkEvent, GetFurnitureDataForRoomObject, GetGroupInformation, GetNitroInstance, GetRoomEngine, LocalizeText, SendMessageComposer } from '../../../../../api';
import { Base, Button, Column, Flex, LayoutBadgeImageView, LayoutLimitedEditionCompactPlateView, LayoutRarityLevelView, Text, UserProfileIconView } from '../../../../../common';
import { useEraTheme, useMessageEvent, useRoom, useSoundEvent } from '../../../../../hooks';
import { isRoleplayMode } from '../../../../roleplay/RoleplayService';

interface InfoStandWidgetFurniViewProps
{
    avatarInfo: AvatarInfoFurni;
    onClose: () => void;
}

const PICKUP_MODE_NONE: number = 0;
const PICKUP_MODE_EJECT: number = 1;
const PICKUP_MODE_FULL: number = 2;

const CLEAN_PREVIEW_CACHE = new Map<string, string>();

/**
 * Elimina cajas negras rectangulares producidas por capas de brillo aditivo (blendMode ADD)
 * al extraer sprites de furnis (ej. Máquina de Café), preservando intactos los bordes negros 1px del pixel-art.
 */
function stripAdditiveBlackBox(img: HTMLImageElement): string
{
    try
    {
        if(img.src && CLEAN_PREVIEW_CACHE.has(img.src)) return CLEAN_PREVIEW_CACHE.get(img.src);
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if(!w || !h || w > 512 || h > 512) return img.src;

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if(!ctx) return img.src;

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, w, h);
        const d = imageData.data;

        const isDark = (idx: number) =>
        {
            const a = d[idx + 3];
            if(a === 0) return false;
            return d[idx] <= 20 && d[idx + 1] <= 20 && d[idx + 2] <= 20;
        };

        // Detectar bloques sólidos negros (>= 3x3) que tocan transparencia o bordes de imagen (artefacto ADD)
        const visited = new Uint8Array(w * h);
        const queue = new Int32Array(w * h);
        let qHead = 0;
        let qTail = 0;

        for(let y = 0; y < h; y++)
        {
            for(let x = 0; x < w; x++)
            {
                const p = y * w + x;
                const idx = p * 4;
                if(!isDark(idx)) continue;

                // ¿Toca borde de imagen o un píxel transparente?
                let touchesExterior = (x === 0 || y === 0 || x === w - 1 || y === h - 1);
                if(!touchesExterior)
                {
                    if(d[((y - 1) * w + x) * 4 + 3] === 0 ||
                       d[((y + 1) * w + x) * 4 + 3] === 0 ||
                       d[(y * w + (x - 1)) * 4 + 3] === 0 ||
                       d[(y * w + (x + 1)) * 4 + 3] === 0)
                    {
                        touchesExterior = true;
                    }
                }
                if(!touchesExterior) continue;

                // Verificar que es parte de un bloque negro sólido (>= 3x3 dark) y NO un borde pixel-art de 1px
                let darkCount = 0;
                for(let dy = -1; dy <= 1; dy++)
                {
                    const ny = y + dy;
                    if(ny < 0 || ny >= h) continue;
                    for(let dx = -1; dx <= 1; dx++)
                    {
                        const nx = x + dx;
                        if(nx < 0 || nx >= w) continue;
                        if(isDark((ny * w + nx) * 4)) darkCount++;
                    }
                }
                if(darkCount >= 6)
                {
                    visited[p] = 1;
                    queue[qTail++] = p;
                }
            }
        }

        if(qTail === 0) return img.src;

        // Expandir por toda la caja oscura/resplandor aditivo conectada
        while(qHead < qTail)
        {
            const p = queue[qHead++];
            const x = p % w;
            const y = (p - x) / w;
            const idx = p * 4;
            const maxC = Math.max(d[idx], d[idx + 1], d[idx + 2]);

            // Convertir brillo aditivo sobre negro en transparencia suave (negro puro -> alpha 0)
            if(maxC <= 14)
            {
                d[idx + 3] = 0;
            }
            else
            {
                d[idx + 3] = Math.min(d[idx + 3], Math.round(maxC * 2.4));
            }

            const neighbors = [
                x > 0 ? p - 1 : -1,
                x < w - 1 ? p + 1 : -1,
                y > 0 ? p - w : -1,
                y < h - 1 ? p + w : -1
            ];

            for(const np of neighbors)
            {
                if(np < 0 || visited[np]) continue;
                const nIdx = np * 4;
                if(d[nIdx + 3] === 0) continue;
                const nMax = Math.max(d[nIdx], d[nIdx + 1], d[nIdx + 2]);
                // Continuar en píxeles negros/halo tenue sin invadir contornos de objetos brillantes
                if(nMax <= 34)
                {
                    // Comprobar que no es un contorno 1px pegado a un píxel muy brillante del mueble
                    const nx = np % w;
                    const ny = (np - nx) / w;
                    let brightAdj = false;
                    if(nMax <= 14)
                    {
                        const checkDirs = [
                            nx > 0 ? (np - 1) * 4 : -1,
                            nx < w - 1 ? (np + 1) * 4 : -1,
                            ny > 0 ? (np - w) * 4 : -1,
                            ny < h - 1 ? (np + w) * 4 : -1
                        ];
                        for(const cIdx of checkDirs)
                        {
                            if(cIdx >= 0 && d[cIdx + 3] > 200 && Math.max(d[cIdx], d[cIdx + 1], d[cIdx + 2]) > 95)
                            {
                                brightAdj = true;
                                break;
                            }
                        }
                    }
                    if(!brightAdj)
                    {
                        visited[np] = 1;
                        queue[qTail++] = np;
                    }
                }
            }
        }

        ctx.putImageData(imageData, 0, 0);
        const out = canvas.toDataURL('image/png');
        if(img.src)
        {
            if(CLEAN_PREVIEW_CACHE.size > 60) CLEAN_PREVIEW_CACHE.clear();
            CLEAN_PREVIEW_CACHE.set(img.src, out);
        }
        return out;
    }
    catch (_)
    {
        return img.src;
    }
}

export const InfoStandWidgetFurniView: FC<InfoStandWidgetFurniViewProps> = props =>
{
    const { avatarInfo = null, onClose = null } = props;
    const { roomSession = null } = useRoom();
    const { currentEra } = useEraTheme();
    const isFlash2012 = currentEra === 'flash2012';
    
    const [ pickupMode, setPickupMode ] = useState(0);
    const [ canMove, setCanMove ] = useState(false);
    const [ canRotate, setCanRotate ] = useState(false);
    const [ canUse, setCanUse ] = useState(false);
    const [ furniKeys, setFurniKeys ] = useState<string[]>([]);
    const [ furniValues, setFurniValues ] = useState<string[]>([]);
    const [ customKeys, setCustomKeys ] = useState<string[]>([]);
    const [ customValues, setCustomValues ] = useState<string[]>([]);
    const [ isCrackable, setIsCrackable ] = useState(false);
    const [ crackableHits, setCrackableHits ] = useState(0);
    const [ crackableTarget, setCrackableTarget ] = useState(0);
    const [ godMode, setGodMode ] = useState(false);
    const [ canSeeFurniId, setCanSeeFurniId ] = useState(false);
    const [ groupName, setGroupName ] = useState<string>(null);
    const [ isJukeBox, setIsJukeBox ] = useState<boolean>(false);
    const [ isSongDisk, setIsSongDisk ] = useState<boolean>(false);
    const [ songId, setSongId ] = useState<number>(-1);
    const [ songName, setSongName ] = useState<string>('');
    const [ songCreator, setSongCreator ] = useState<string>('');
    const [ rpOpacity, setRpOpacity ] = useState<number>(100);
    const [ cleanPreviewSrc, setCleanPreviewSrc ] = useState<string>('');
    const rpMode = isRoleplayMode();

    useEffect(() =>
    {
        if(!rpMode || !avatarInfo?.image?.src)
        {
            setCleanPreviewSrc('');
            return;
        }
        const img = avatarInfo.image;
        if(img.complete && img.naturalWidth > 0)
        {
            setCleanPreviewSrc(stripAdditiveBlackBox(img));
            return;
        }
        setCleanPreviewSrc(img.src);
        const onLoad = () => setCleanPreviewSrc(stripAdditiveBlackBox(img));
        img.addEventListener('load', onLoad, { once: true });
        return () => img.removeEventListener('load', onLoad);
    }, [ rpMode, avatarInfo?.id, avatarInfo?.image ]);

    useEffect(() =>
    {
        if(!rpMode || !roomSession || !avatarInfo) return;
        try
        {
            const cat = avatarInfo.isWallItem ? RoomObjectCategory.WALL : RoomObjectCategory.FLOOR;
            const roomObj = GetRoomEngine()?.getRoomObject(roomSession.roomId, avatarInfo.id, cat);
            const alpha = roomObj?.model?.getValue<number>(RoomObjectVariable.FURNITURE_ALPHA_MULTIPLIER);
            setRpOpacity(typeof alpha === 'number' && !isNaN(alpha) ? Math.round(Math.max(10, Math.min(100, alpha * 100))) : 100);
        }
        catch (_)
        {
            setRpOpacity(100);
        }
    }, [ rpMode, roomSession, avatarInfo ]);

    const applyRpFurniOpacity = useCallback((nextPct: number) =>
    {
        const clamped = Math.max(10, Math.min(100, Math.round(nextPct)));
        setRpOpacity(clamped);
        if(!roomSession || !avatarInfo) return;
        try
        {
            const cat = avatarInfo.isWallItem ? RoomObjectCategory.WALL : RoomObjectCategory.FLOOR;
            const roomObj = GetRoomEngine()?.getRoomObject(roomSession.roomId, avatarInfo.id, cat);
            if(roomObj?.model)
            {
                roomObj.model.setValue(RoomObjectVariable.FURNITURE_ALPHA_MULTIPLIER, clamped / 100);
                // Forzar actualización inmediata del visualizador del furni
                try
                {
                    const vis = roomObj.visualization as any;
                    if(vis)
                    {
                        vis._alphaMultiplier = clamped / 100;
                        if(Array.isArray(vis._sprites))
                        {
                            for(const sp of vis._sprites)
                            {
                                if(sp) sp.alpha = Math.round(255 * (clamped / 100));
                            }
                        }
                    }
                }
                catch (_) {}
                GetNitroInstance()?.application?.render();
            }
        }
        catch (_) {}
    }, [ roomSession, avatarInfo ]);

    useSoundEvent<NowPlayingEvent>(NowPlayingEvent.NPE_SONG_CHANGED, event =>
    {
        setSongId(event.id);
    }, (isJukeBox || isSongDisk));

    useSoundEvent<NowPlayingEvent>(SongInfoReceivedEvent.SIR_TRAX_SONG_INFO_RECEIVED, event =>
    {
        if(event.id !== songId) return;
        
        const songInfo = GetNitroInstance().soundManager.musicController.getSongInfo(event.id);

        if(!songInfo) return;

        setSongName(songInfo.name);
        setSongCreator(songInfo.creator);
    }, (isJukeBox || isSongDisk));

    useEffect(() =>
    {
        let pickupMode = PICKUP_MODE_NONE;
        let canMove = false;
        let canRotate = false;
        let canUse = false;
        let furniKeyss: string[] = [];
        let furniValuess: string[] = [];
        let customKeyss: string[] = [];
        let customValuess: string[] = [];
        let isCrackable = false;
        let crackableHits = 0;
        let crackableTarget = 0;
        let godMode = false;
        let canSeeFurniId = false;
        let furniIsJukebox = false;
        let furniIsSongDisk = false;
        let furniSongId = -1;
        
        const isValidController = (avatarInfo.roomControllerLevel >= RoomControllerLevel.GUEST);

        if(isValidController || avatarInfo.isOwner || avatarInfo.isRoomOwner || avatarInfo.isAnyRoomController)
        {
            canMove = true;
            canRotate = !avatarInfo.isWallItem;

            if(avatarInfo.roomControllerLevel >= RoomControllerLevel.MODERATOR) godMode = true;
        }

        if(avatarInfo.isAnyRoomController)
        {
            canSeeFurniId = true;
        }
        
        if((((avatarInfo.usagePolicy === RoomWidgetFurniInfoUsagePolicyEnum.EVERYBODY) || ((avatarInfo.usagePolicy === RoomWidgetFurniInfoUsagePolicyEnum.CONTROLLER) && isValidController)) || ((avatarInfo.extraParam === RoomWidgetEnumItemExtradataParameter.JUKEBOX) && isValidController)) || ((avatarInfo.extraParam === RoomWidgetEnumItemExtradataParameter.USABLE_PRODUCT) && isValidController)) canUse = true;

        if(avatarInfo.extraParam)
        {
            if(avatarInfo.extraParam === RoomWidgetEnumItemExtradataParameter.CRACKABLE_FURNI)
            {
                const stuffData = (avatarInfo.stuffData as CrackableDataType);

                canUse = true;
                isCrackable = true;
                crackableHits = stuffData.hits;
                crackableTarget = stuffData.target;
            }

            else if(avatarInfo.extraParam === RoomWidgetEnumItemExtradataParameter.JUKEBOX)
            {
                const playlist = GetNitroInstance().soundManager.musicController.getRoomItemPlaylist();

                if(playlist)
                {
                    furniSongId = playlist.nowPlayingSongId;
                }

                furniIsJukebox = true;
            }

            else if(avatarInfo.extraParam.indexOf(RoomWidgetEnumItemExtradataParameter.SONGDISK) === 0)
            {
                furniSongId = parseInt(avatarInfo.extraParam.substr(RoomWidgetEnumItemExtradataParameter.SONGDISK.length));
                
                furniIsSongDisk = true;
            }

            if(godMode)
            {
                const extraParam = avatarInfo.extraParam.substr(RoomWidgetEnumItemExtradataParameter.BRANDING_OPTIONS.length);

                if(extraParam)
                {
                    const parts = extraParam.split('\t');

                    for(const part of parts)
                    {
                        const value = part.split('=');

                        if(value && (value.length === 2))
                        {
                            furniKeyss.push(value[0]);
                            furniValuess.push(value[1]);
                        }
                    }
                }
            }
        }

        if(godMode)
        {
            const roomObject = GetRoomEngine().getRoomObject(roomSession.roomId, avatarInfo.id, (avatarInfo.isWallItem) ? RoomObjectCategory.WALL : RoomObjectCategory.FLOOR);

            if(roomObject)
            {
                const customVariables = roomObject.model.getValue<string[]>(RoomObjectVariable.FURNITURE_CUSTOM_VARIABLES);
                const furnitureData = roomObject.model.getValue<{ [index: string]: string }>(RoomObjectVariable.FURNITURE_DATA);

                if(customVariables && customVariables.length)
                {
                    for(const customVariable of customVariables)
                    {
                        customKeyss.push(customVariable);
                        customValuess.push((furnitureData[customVariable]) || '');
                    }
                }
            }
        }

        if(avatarInfo.isOwner || avatarInfo.isAnyRoomController) pickupMode = PICKUP_MODE_FULL;

        else if(avatarInfo.isRoomOwner || (avatarInfo.roomControllerLevel >= RoomControllerLevel.GUILD_ADMIN)) pickupMode = PICKUP_MODE_EJECT;

        if(avatarInfo.isStickie) pickupMode = PICKUP_MODE_NONE;

        setPickupMode(pickupMode);
        setCanMove(canMove);
        setCanRotate(canRotate);
        setCanUse(canUse);
        setFurniKeys(furniKeyss);
        setFurniValues(furniValuess);
        setCustomKeys(customKeyss);
        setCustomValues(customValuess);
        setIsCrackable(isCrackable);
        setCrackableHits(crackableHits);
        setCrackableTarget(crackableTarget);
        setGodMode(godMode);
        setCanSeeFurniId(canSeeFurniId);
        setGroupName(null);
        setIsJukeBox(furniIsJukebox);
        setIsSongDisk(furniIsSongDisk);
        setSongId(furniSongId);
        
        if(avatarInfo.groupId) SendMessageComposer(new GroupInformationComposer(avatarInfo.groupId, false));
    }, [ roomSession, avatarInfo ]);

    useMessageEvent<GroupInformationEvent>(GroupInformationEvent, event =>
    {
        const parser = event.getParser();

        if(!avatarInfo || avatarInfo.groupId !== parser.id || parser.flag) return;

        if(groupName) setGroupName(null);

        setGroupName(parser.title);
    });

    useEffect(() =>
    {
        const songInfo = GetNitroInstance().soundManager.musicController.getSongInfo(songId);

        setSongName(songInfo?.name ?? '');
        setSongCreator(songInfo?.creator ?? '');
    }, [ songId ]);

    const onFurniSettingChange = useCallback((index: number, value: string) =>
    {
        const clone = Array.from(furniValues);

        clone[index] = value;

        setFurniValues(clone);
    }, [ furniValues ]);

    const onCustomVariableChange = useCallback((index: number, value: string) =>
    {
        const clone = Array.from(customValues);

        clone[index] = value;

        setCustomValues(clone);
    }, [ customValues ]);

    const getFurniSettingsAsString = useCallback(() =>
    {
        if(furniKeys.length === 0 || furniValues.length === 0) return '';

        let data = '';

        let i = 0;

        while(i < furniKeys.length)
        {
            const key = furniKeys[i];
            const value = furniValues[i];

            data = (data + (key + '=' + value + '\t'));

            i++;
        }

        return data;
    }, [ furniKeys, furniValues ]);

    const processButtonAction = useCallback((action: string) =>
    {
        if(!action || (action === '')) return;

        let objectData: string = null;

        switch(action)
        {
            case 'buy_one':
                {
                    const furniData = roomSession ? GetFurnitureDataForRoomObject(roomSession.roomId, avatarInfo.id, avatarInfo.category) : null;
                    if(furniData && furniData.className)
                    {
                        CreateLinkEvent(`catalog/open/furni/${ furniData.className }`);
                    }
                    else if(avatarInfo.name)
                    {
                        CreateLinkEvent(`catalog/open/furni/${ avatarInfo.name }`);
                    }
                    else if(avatarInfo.purchaseOfferId > 0)
                    {
                        CreateLinkEvent(`catalog/open/offerId/${ avatarInfo.purchaseOfferId }`);
                    }
                    else
                    {
                        CreateLinkEvent('catalog/open');
                    }
                    return;
                }
            case 'move':
                GetRoomEngine().processRoomObjectOperation(avatarInfo.id, avatarInfo.category, RoomObjectOperationType.OBJECT_MOVE);
                break;
            case 'rotate':
                {
                    const activeRoomId = roomSession?.roomId || GetRoomEngine().activeRoomId;
                    const roomObj = activeRoomId > 0 ? GetRoomEngine().getRoomObject(activeRoomId, avatarInfo.id, avatarInfo.category) : null;
                    let nextDirAngle: number | null = null;
                    if(roomObj && avatarInfo.category === RoomObjectCategory.FLOOR)
                    {
                        const allowed = roomObj.model?.getValue<number[]>(RoomObjectVariable.FURNITURE_ALLOWED_DIRECTIONS);
                        if(Array.isArray(allowed) && allowed.length > 1)
                        {
                            const cur = ((Math.round(roomObj.getDirection()?.x || 0) % 360) + 360) % 360;
                            const idx = allowed.indexOf(cur);
                            nextDirAngle = allowed[(idx >= 0 ? idx + 1 : 0) % allowed.length];
                        }
                    }
                    GetRoomEngine().processRoomObjectOperation(avatarInfo.id, avatarInfo.category, RoomObjectOperationType.OBJECT_ROTATE_POSITIVE);
                    // Giro optimista instantáneo (0 ms de espera visual y permite rotar varias veces seguidas sin perder clics)
                    if(roomObj && nextDirAngle !== null)
                    {
                        roomObj.setDirection(new Vector3d(nextDirAngle, 0, 0));
                    }
                }
                break;
            case 'pickup':
                if(pickupMode === PICKUP_MODE_FULL)
                {
                    GetRoomEngine().processRoomObjectOperation(avatarInfo.id, avatarInfo.category, RoomObjectOperationType.OBJECT_PICKUP);
                }
                else
                {
                    GetRoomEngine().processRoomObjectOperation(avatarInfo.id, avatarInfo.category, RoomObjectOperationType.OBJECT_EJECT);
                }
                break;
            case 'use':
                GetRoomEngine().useRoomObject(avatarInfo.id, avatarInfo.category);
                break;
            case 'save_branding_configuration': {
                const mapData = new Map<string, string>();
                const dataParts = getFurniSettingsAsString().split('\t');

                if(dataParts)
                {
                    for(const part of dataParts)
                    {
                        const [ key, value ] = part.split('=', 2);
                        
                        mapData.set(key, value);
                    }
                }

                GetRoomEngine().modifyRoomObjectDataWithMap(avatarInfo.id, avatarInfo.category, RoomObjectOperationType.OBJECT_SAVE_STUFF_DATA, mapData);
                break;
            }
            case 'save_custom_variables': {
                const map = new Map();

                for(let i = 0; i < customKeys.length; i++)
                {
                    const key = customKeys[i];
                    const value = customValues[i];

                    if((key && key.length) && (value && value.length)) map.set(key, value);
                }

                SendMessageComposer(new SetObjectDataMessageComposer(avatarInfo.id, map));
                break;
            }
        }
    }, [ avatarInfo, pickupMode, customKeys, customValues, getFurniSettingsAsString, roomSession ]);

    const getGroupBadgeCode = useCallback(() =>
    {
        const stringDataType = (avatarInfo.stuffData as StringDataType);

        if(!stringDataType || !(stringDataType instanceof StringDataType)) return null;

        return stringDataType.getValue(2);
    }, [ avatarInfo ]);

    if(!avatarInfo) return null;

    // En /rp_client mostrar tarjeta plana limpia (con Opacidad + botones Habbo blancos si hay permisos, o solo vista previa si no)
    if(rpMode)
    {
        try
        {
            const rawPrefs = localStorage.getItem('habbten_rp_client_prefs_v1');
            if(rawPrefs)
            {
                const parsed = JSON.parse(rawPrefs);
                if(parsed && parsed.furniPopup === false) return null;
            }
        }
        catch (_) {}

        const canManage = canMove || canRotate || (pickupMode !== PICKUP_MODE_NONE);
        const hasAnyAction = canManage || canUse;

        // Tiendas físicas en sala: detectar furnis de exhibición/máquinas/maniquíes para "Añadir al carrito — $X"
        const rawName = String(avatarInfo.name || '').toLowerCase();
        const furniMeta = roomSession ? GetFurnitureDataForRoomObject(roomSession.roomId, avatarInfo.id, avatarInfo.category) : null;
        const rawClass = String(furniMeta?.className || '').toLowerCase();
        const hay = `${ rawName } ${ rawClass }`;
        const currentRoomId = roomSession?.roomId || 0;
        let physicalShopOffer: { slug: string; name: string; price: number } | null = null;

        if(hay.includes('coffee') || hay.includes('café') || hay.includes('cafe') || hay.includes('espresso'))
        {
            physicalShopOffer = { slug: 'coffee', name: 'Café Expreso', price: 35 };
        }
        else if(hay.includes('pizza') || hay.includes('pizzeria'))
        {
            physicalShopOffer = { slug: 'pizza', name: 'Pizza Familiar', price: 105 };
        }
        else if(hay.includes('burger') || hay.includes('diner') || hay.includes('food'))
        {
            physicalShopOffer = { slug: 'burger', name: 'Hamburguesa Habbten', price: 60 };
        }
        else if(hay.includes('vending') || hay.includes('soda') || hay.includes('cola') || hay.includes('drink') || hay.includes('fridge'))
        {
            physicalShopOffer = { slug: 'energy_drink', name: 'Bebida Energética', price: 55 };
        }
        else if(hay.includes('hosp') || hay.includes('med') || hay.includes('firstaid') || hay.includes('cabinet'))
        {
            physicalShopOffer = { slug: 'medkit', name: 'Botiquín Profesional', price: 240 };
        }
        else if(hay.includes('car') || hay.includes('limo') || hay.includes('moto') || hay.includes('bike'))
        {
            physicalShopOffer = { slug: 'moto_sport', name: 'Moto Deportiva', price: 1650 };
        }
        else if(hay.includes('mannequin') || hay.includes('outfit') || hay.includes('hat') || hay.includes('uniform') || hay.includes('clothing'))
        {
            physicalShopOffer = { slug: '__clothing_shop', name: avatarInfo.name || 'Prenda de Tienda', price: 85 };
        }
        else if(currentRoomId === 214)
        {
            physicalShopOffer = { slug: 'coffee', name: 'Café Expreso', price: 35 };
        }
        else if(currentRoomId === 217)
        {
            physicalShopOffer = { slug: 'vest_light', name: 'Chaleco Ligero', price: 450 };
        }

        return (
            <div
                className="rp-furni-infostand"
                onMouseDown={ e => e.stopPropagation() }
                onPointerDown={ e => e.stopPropagation() }>
                <div className="rp-infostand-header">
                    <span className="rp-infostand-title">{ avatarInfo.name }</span>
                    <button type="button" className="rp-habbo-close-btn" onClick={ onClose } title="Cerrar">
                        <FaTimes />
                    </button>
                </div>

                <div className="rp-furni-body">
                    <div className="rp-furni-preview">
                        { (cleanPreviewSrc || (avatarInfo.image && avatarInfo.image.src.length > 0)) && (
                            <img className="rp-furni-preview-img" src={ cleanPreviewSrc || avatarInfo.image.src } alt={ avatarInfo.name } />
                        ) }
                    </div>

                    { physicalShopOffer && (
                        <button
                            type="button"
                            className="rp-furni-cart-btn"
                            onClick={ () =>
                            {
                                if(physicalShopOffer.slug === '__clothing_shop')
                                {
                                    CreateLinkEvent('avatar-editor/show');
                                }
                                else
                                {
                                    window.dispatchEvent(new CustomEvent('habbten-rp-add-to-cart', { detail: physicalShopOffer }));
                                }
                            } }>
                            { physicalShopOffer.slug === '__clothing_shop'
                                ? `Probar y comprar — $${ physicalShopOffer.price }`
                                : `Añadir al carrito — $${ physicalShopOffer.price }` }
                        </button>
                    ) }

                    { canManage && (
                        <div className="rp-furni-opacity-row">
                            <span>Opacidad</span>
                            <input
                                type="range"
                                min={ 10 }
                                max={ 100 }
                                step={ 5 }
                                value={ rpOpacity }
                                onChange={ e => applyRpFurniOpacity(Number(e.target.value)) } />
                            <span className="rp-furni-opacity-val">{ rpOpacity }%</span>
                        </div>
                    ) }

                    { hasAnyAction && (
                        <div className="rp-furni-btns">
                            { canMove && (
                                <button type="button" className="rp-furni-white-btn" onClick={ () => processButtonAction('move') }>
                                    Mover
                                </button>
                            ) }
                            { canUse && (
                                <button type="button" className="rp-furni-white-btn" onClick={ () => processButtonAction('use') }>
                                    Usar
                                </button>
                            ) }
                            { canRotate && (
                                <button type="button" className="rp-furni-white-btn" onClick={ () => processButtonAction('rotate') }>
                                    <FaUndo style={ { fontSize: 10 } } /> Rotar
                                </button>
                            ) }
                            { (pickupMode !== PICKUP_MODE_NONE) && (
                                <button type="button" className="rp-furni-white-btn" onClick={ () => processButtonAction('pickup') }>
                                    { pickupMode === PICKUP_MODE_EJECT ? 'Expulsar' : 'Recoger' }
                                </button>
                            ) }
                        </div>
                    ) }
                </div>
            </div>
        );
    }

    return (
        <Column gap={ 1 } alignItems="end">
            <Column className="nitro-infostand rounded">
                <Column overflow="visible" className="container-fluid content-area" gap={ 1 }>
                    <Column gap={ 1 }>
                        <Flex alignItems="center" justifyContent="between" gap={ 1 }>
                            <Text variant="white" small wrap>{ avatarInfo.name }</Text>
                            { isFlash2012
                                ? <img src={ close2012Img } alt="Cerrar" className="cursor-pointer infostand-close-2012" onClick={ onClose } />
                                : <FaTimes className="cursor-pointer fa-icon" onClick={ onClose } /> }
                        </Flex>
                        <hr className="m-0" />
                    </Column>
                    <Column gap={ 1 }>
                        <Flex position="relative" gap={ 1 }>
                            { avatarInfo.stuffData.isUnique &&
                                <div className="position-absolute end-0">
                                    <LayoutLimitedEditionCompactPlateView uniqueNumber={ avatarInfo.stuffData.uniqueNumber } uniqueSeries={ avatarInfo.stuffData.uniqueSeries } />
                                </div> }
                            { (avatarInfo.stuffData.rarityLevel > -1) &&
                                <div className="position-absolute end-0">
                                    <LayoutRarityLevelView level={ avatarInfo.stuffData.rarityLevel } />
                                </div> }
                            { avatarInfo.image && avatarInfo.image.src.length && 
                                <img className="d-block mx-auto" src={ avatarInfo.image.src } alt="" /> }
                        </Flex>
                        <hr className="m-0" />
                    </Column>
                    <Column gap={ 1 }>
                        <Text fullWidth wrap textBreak variant="white" small>{ avatarInfo.description }</Text>
                        <hr className="m-0" />
                    </Column>
                    <Column gap={ 1 }>
                        <Flex alignItems="center" gap={ 1 }>
                            <UserProfileIconView userId={ avatarInfo.ownerId } />
                            <Text variant="white" small wrap>
                                { LocalizeText('furni.owner', [ 'name' ], [ avatarInfo.ownerName ]) }
                            </Text>
                        </Flex>
                        { (avatarInfo.purchaseOfferId > 0 || !!avatarInfo.name?.length) &&
                            <Flex>
                                <Text variant="white" small underline pointer onClick={ event => processButtonAction('buy_one') }>
                                    { LocalizeText('infostand.button.buy') }
                                </Text>
                            </Flex> }
                    </Column>
                    { (isJukeBox || isSongDisk) &&
                        <Column gap={ 1 }>
                            <hr className="m-0" />
                            { (songId === -1) &&
                                <Text variant="white" small wrap>
                                    { LocalizeText('infostand.jukebox.text.not.playing') }
                                </Text> }
                            { !!songName.length &&
                                <Flex alignItems="center" gap={ 1 }>
                                    <Base className="icon disk-icon" />
                                    <Text variant="white" small wrap>
                                        { songName }
                                    </Text>
                                </Flex> }
                            { !!songCreator.length &&
                                <Flex alignItems="center" gap={ 1 }>
                                    <Base className="icon disk-creator" />
                                    <Text variant="white" small wrap>
                                        { songCreator }
                                    </Text>
                                </Flex> }
                        </Column> }
                    <Column gap={ 1 }>
                        { isCrackable &&
                            <>
                                <hr className="m-0" />
                                <Text variant="white" small wrap>{ LocalizeText('infostand.crackable_furni.hits_remaining', [ 'hits', 'target' ], [ crackableHits.toString(), crackableTarget.toString() ]) }</Text>
                            </> }
                        { avatarInfo.groupId > 0 &&
                            <>
                                <hr className="m-0" />
                                <Flex pointer alignItems="center" gap={ 2 } onClick={ () => GetGroupInformation(avatarInfo.groupId) }>
                                    <LayoutBadgeImageView badgeCode={ getGroupBadgeCode() } isGroup={ true } />
                                    <Text variant="white" underline>{ groupName }</Text>
                                </Flex>
                            </> }
                        { godMode &&
                            <>
                                <hr className="m-0" />
                                { canSeeFurniId && <Text small wrap variant="white">ID: { avatarInfo.id }</Text> }
                                { (furniKeys.length > 0) &&
                                    <>
                                        <hr className="m-0"/>
                                        <Column gap={ 1 }>
                                            { furniKeys.map((key, index) =>
                                            {
                                                return (
                                                    <Flex key={ index } alignItems="center" gap={ 1 }>
                                                        <Text small wrap align="end" variant="white" className="col-4">{ key }</Text>
                                                        <input type="text" className="form-control form-control-sm" value={ furniValues[index] } onChange={ event => onFurniSettingChange(index, event.target.value) }/>
                                                    </Flex>);
                                            }) }
                                        </Column>
                                    </> }
                            </> }
                        { (customKeys.length > 0) &&
                            <>
                                <hr className="m-0 my-1"/>
                                <Column gap={ 1 }>
                                    { customKeys.map((key, index) =>
                                    {
                                        const label = key === 'internalLink' ? 'Enlace:' : key;
                                        return (
                                            <Flex key={ index } alignItems="center" gap={ 1 } className="w-100">
                                                <Text small variant="white" className="text-nowrap" style={ { minWidth: '50px' } }>{ label }</Text>
                                                <input type="text" className="form-control form-control-sm flex-grow-1" value={ customValues[index] } onChange={ event => onCustomVariableChange(index, event.target.value) }/>
                                            </Flex>);
                                    }) }
                                </Column>
                            </> }
                    </Column>
                </Column>
            </Column>
            <Flex gap={ 1 } justifyContent="end" className="button-container mt-2">
                { canMove &&
                    <Button variant="dark" onClick={ event => processButtonAction('move') }>
                        { LocalizeText('infostand.button.move') }
                    </Button> }
                { canRotate &&
                    <Button variant="dark" onClick={ event => processButtonAction('rotate') }>
                        { LocalizeText('infostand.button.rotate') }
                    </Button> }
                { (pickupMode !== PICKUP_MODE_NONE) &&
                    <Button variant="dark" onClick={ event => processButtonAction('pickup') }>
                        { LocalizeText((pickupMode === PICKUP_MODE_EJECT) ? 'infostand.button.eject' : 'infostand.button.pickup') }
                    </Button> }
                { canUse &&
                    <Button variant="dark" onClick={ event => processButtonAction('use') }>
                        { LocalizeText('infostand.button.use') }
                    </Button> }
                { ((furniKeys.length > 0 && furniValues.length > 0) && (furniKeys.length === furniValues.length)) &&
                    <Button variant="dark" onClick={ () => processButtonAction('save_branding_configuration') }>
                        { LocalizeText('save') }
                    </Button> }
                { ((customKeys.length > 0 && customValues.length > 0) && (customKeys.length === customValues.length)) &&
                    <Button variant="dark" onClick={ () => processButtonAction('save_custom_variables') }>
                        { LocalizeText('save') }
                    </Button> }
            </Flex>
        </Column>
    );
}
