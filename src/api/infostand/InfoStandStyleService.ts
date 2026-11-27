import { AvatarAction, IGetImageListener, ImageResult, TextureUtils, Vector3d } from '@nitrots/nitro-renderer';
import { useEffect, useState } from 'react';
import { GetRoomEngine } from '../nitro';

export interface InfoStandPlateDef
{
    id: string;
    name: string;
    price: number;
    accentColor: string;
    borderColor: string;
    bgStyle: string;
    emblemColor: string;
    emblemLabel?: string;
    pattern?: 'none' | 'diamond' | 'stripe';
}

export interface InfoStandFurniDef
{
    id: string;
    name: string;
    furnitureId: number;
    price: number;
    seatOffsetY?: number;
}

export interface InfoStandActionDef
{
    id: string;
    name: string;
    price: number;
    posture?: string;
    gesture?: string;
    expression?: string;
    carryItem?: number;
}

export interface UserInfoStandStyle
{
    plateId: string;
    furniId: string;
    actionId: string;
}

export const DEFAULT_INFOSTAND_STYLE: UserInfoStandStyle = {
    plateId: 'default',
    furniId: 'none',
    actionId: 'std'
};

export const INFOSTAND_PLATES: InfoStandPlateDef[] = [
    { id: 'default',  name: 'Clásico',         price: 0,   accentColor: '#5c6b73', borderColor: '#ffffff', bgStyle: 'rgba(74, 74, 74, 0.78)', emblemColor: '#7a8a93', pattern: 'none' },
    { id: 'emerald',  name: 'Pod Esmeralda',   price: 0,   accentColor: '#1f8a2e', borderColor: '#66e05c', bgStyle: 'linear-gradient(180deg, #1b6f27 0%, #104818 100%)', emblemColor: '#2fb83d', pattern: 'none' },
    { id: 'sapphire', name: 'Pod Zafiro',      price: 0,   accentColor: '#1a65b8', borderColor: '#5cb8ff', bgStyle: 'linear-gradient(180deg, #154d92 0%, #0b2d59 100%)', emblemColor: '#2d8bf0', pattern: 'none' },
    { id: 'amber',    name: 'Ámbar Retro',     price: 250, accentColor: '#c96f12', borderColor: '#ffb84d', bgStyle: 'linear-gradient(180deg, #a6540d 0%, #6b3105 100%)', emblemColor: '#f08c24', pattern: 'none' },
    { id: 'rose',     name: 'Rosa Club',       price: 250, accentColor: '#b83b72', borderColor: '#ff8cc2', bgStyle: 'linear-gradient(180deg, #982b5c 0%, #611739 100%)', emblemColor: '#e8589a', pattern: 'none' },
    { id: 'ice',      name: 'Cristal Ártico',  price: 350, accentColor: '#2996b5', borderColor: '#9beeff', bgStyle: 'linear-gradient(180deg, #1c6e8c 0%, #114459 100%)', emblemColor: '#4fd2f5', pattern: 'stripe' },
    { id: 'violet',   name: 'Neón Galaxia',    price: 400, accentColor: '#7b3bd1', borderColor: '#c490ff', bgStyle: 'linear-gradient(180deg, #5c24a8 0%, #331066 100%)', emblemColor: '#9b5bf5', pattern: 'diamond' },
    { id: 'crimson',  name: 'Rubí Real',       price: 400, accentColor: '#b01e2b', borderColor: '#ff6b6b', bgStyle: 'linear-gradient(180deg, #8e1420 0%, #520911 100%)', emblemColor: '#e03131', pattern: 'diamond' },
    { id: 'obsidian', name: 'Obsidiana VIP',   price: 500, accentColor: '#2a2d34', borderColor: '#ff6b35', bgStyle: 'linear-gradient(180deg, #2d3036 0%, #16181c 100%)', emblemColor: '#e85d04', emblemLabel: '★', pattern: 'diamond' },
    { id: 'gold_hc',  name: 'Oro Imperial',    price: 600, accentColor: '#b5891b', borderColor: '#ffe066', bgStyle: 'linear-gradient(180deg, #8f670e 0%, #523905 100%)', emblemColor: '#ffd43b', emblemLabel: 'HC', pattern: 'diamond' }
];

export const INFOSTAND_FURNIS: InfoStandFurniDef[] = [
    { id: 'none',           name: 'Sin furni',        furnitureId: 0,    price: 0,   seatOffsetY: 0 },
    { id: 'chair_plasty',   name: 'Pod Clásico',      furnitureId: 121,  price: 0,   seatOffsetY: -6 },
    { id: 'chair_plasty_1', name: 'Pod Verde',        furnitureId: 126,  price: 150, seatOffsetY: -6 },
    { id: 'chair_plasty_2', name: 'Pod Rojo',         furnitureId: 125,  price: 150, seatOffsetY: -6 },
    { id: 'chair_plasty_3', name: 'Pod Azul',         furnitureId: 147,  price: 150, seatOffsetY: -6 },
    { id: 'chair_plasty_4', name: 'Pod Naranja',      furnitureId: 124,  price: 200, seatOffsetY: -6 },
    { id: 'chair_plasty_5', name: 'Pod Rosa',         furnitureId: 1500, price: 200, seatOffsetY: -6 },
    { id: 'chair_plasty_6', name: 'Pod Morado',       furnitureId: 1499, price: 200, seatOffsetY: -6 },
    { id: 'chair_norja',    name: 'Silla Norja',      furnitureId: 30,   price: 150, seatOffsetY: -8 },
    { id: 'pillow_0',       name: 'Almohadón Blanco', furnitureId: 1581, price: 300, seatOffsetY: -4 },
    { id: 'pillow_1',       name: 'Almohadón Rosa',   furnitureId: 1582, price: 300, seatOffsetY: -4 },
    { id: 'club_sofa',      name: 'Sofá HC',          furnitureId: 267,  price: 400, seatOffsetY: -8 },
    { id: 'hc_chr',         name: 'Silla Majestic',   furnitureId: 1527, price: 500, seatOffsetY: -8 },
    { id: 'throne',         name: 'Trono Clásico',    furnitureId: 230,  price: 800, seatOffsetY: -10 }
];

export const INFOSTAND_ACTIONS: InfoStandActionDef[] = [
    { id: 'std',    name: 'Normal',          price: 0,   posture: AvatarAction.POSTURE_STAND },
    { id: 'wav',    name: 'Saludando',       price: 0,   posture: AvatarAction.POSTURE_STAND, expression: AvatarAction.EXPRESSION_WAVE },
    { id: 'sit',    name: 'Sentado',         price: 0,   posture: AvatarAction.POSTURE_SIT },
    { id: 'sml',    name: 'Sonriendo',       price: 0,   posture: AvatarAction.POSTURE_STAND, gesture: AvatarAction.GESTURE_SMILE },
    { id: 'crr_1',  name: 'Té / Café',       price: 200, posture: AvatarAction.POSTURE_STAND, carryItem: 1 },
    { id: 'crr_2',  name: 'Zumo',            price: 200, posture: AvatarAction.POSTURE_STAND, carryItem: 2 },
    { id: 'crr_3',  name: 'Zanahoria',       price: 200, posture: AvatarAction.POSTURE_STAND, carryItem: 3 },
    { id: 'crr_5',  name: 'Helado',          price: 250, posture: AvatarAction.POSTURE_STAND, carryItem: 5 },
    { id: 'crr_6',  name: 'Refresco',        price: 250, posture: AvatarAction.POSTURE_STAND, carryItem: 6 },
    { id: 'crr_33', name: 'Habbo Cola',      price: 300, posture: AvatarAction.POSTURE_STAND, carryItem: 33 },
    { id: 'crr_42', name: 'Café Expreso',    price: 300, posture: AvatarAction.POSTURE_STAND, carryItem: 42 },
    { id: 'crr_19', name: 'Cóctel Tropical', price: 350, posture: AvatarAction.POSTURE_STAND, carryItem: 19 }
];

export function getPlateDef(plateId?: string): InfoStandPlateDef
{
    return INFOSTAND_PLATES.find(p => p.id === plateId) || INFOSTAND_PLATES[0];
}

export function getFurniDef(furniId?: string): InfoStandFurniDef
{
    return INFOSTAND_FURNIS.find(f => f.id === furniId) || INFOSTAND_FURNIS[0];
}

export function getActionDef(actionId?: string): InfoStandActionDef
{
    return INFOSTAND_ACTIONS.find(a => a.id === actionId) || INFOSTAND_ACTIONS[0];
}

const styleCache = new Map<number, { style: UserInfoStandStyle; fetchedAt: number }>();
const CACHE_TTL_MS = 60000;

export function broadcastInfoStandUpdate(userId: number, style: UserInfoStandStyle): void
{
    styleCache.set(userId, { style, fetchedAt: Date.now() });
    window.dispatchEvent(new CustomEvent('habbten-infostand-updated', { detail: { userId, style } }));
}

export function useUserInfoStandStyle(userId?: number): UserInfoStandStyle
{
    const [ style, setStyle ] = useState<UserInfoStandStyle>(() =>
    {
        if(!userId || userId <= 0) return DEFAULT_INFOSTAND_STYLE;
        const cached = styleCache.get(userId);
        return cached ? cached.style : DEFAULT_INFOSTAND_STYLE;
    });

    useEffect(() =>
    {
        if(!userId || userId <= 0)
        {
            setStyle(DEFAULT_INFOSTAND_STYLE);
            return;
        }

        let cancelled = false;
        const cached = styleCache.get(userId);
        if(cached) setStyle(cached.style);
        else setStyle(DEFAULT_INFOSTAND_STYLE);

        if(!cached || (Date.now() - cached.fetchedAt) > CACHE_TTL_MS)
        {
            fetch(`/api/client/infostand/${ userId }`, { credentials: 'include' })
                .then(res => res.json())
                .then(json =>
                {
                    if(cancelled || !json?.success || !json.style) return;
                    const resolved: UserInfoStandStyle = {
                        plateId: json.style.plateId || 'default',
                        furniId: json.style.furniId || 'none',
                        actionId: json.style.actionId || 'std'
                    };
                    styleCache.set(userId, { style: resolved, fetchedAt: Date.now() });
                    setStyle(resolved);
                })
                .catch(() => {});
        }

        const onUpdated = (event: CustomEvent<{ userId: number; style: UserInfoStandStyle }>) =>
        {
            if(event.detail && event.detail.userId === userId)
            {
                setStyle(event.detail.style);
            }
        };

        window.addEventListener('habbten-infostand-updated', onUpdated as EventListener);
        return () =>
        {
            cancelled = true;
            window.removeEventListener('habbten-infostand-updated', onUpdated as EventListener);
        };
    }, [ userId ]);

    return style;
}

const furniImageCache = new Map<number, string>();

export function useInfoStandFurniSprite(furnitureId: number): string | null
{
    const [ imageUrl, setImageUrl ] = useState<string | null>(() =>
    {
        if(!furnitureId || furnitureId <= 0) return null;
        return furniImageCache.get(furnitureId) || null;
    });

    useEffect(() =>
    {
        if(!furnitureId || furnitureId <= 0)
        {
            setImageUrl(null);
            return;
        }

        const cached = furniImageCache.get(furnitureId);
        if(cached)
        {
            setImageUrl(cached);
            return;
        }

        let cancelled = false;
        const engine = GetRoomEngine();
        if(!engine)
        {
            setImageUrl(null);
            return;
        }

        const iconFallback = engine.getFurnitureFloorIconUrl(furnitureId) || null;
        if(iconFallback) setImageUrl(iconFallback);

        const applyResolvedImage = (img: HTMLImageElement | null) =>
        {
            if(cancelled || !img || !img.src) return;
            const commit = () =>
            {
                if(cancelled) return;
                furniImageCache.set(furnitureId, img.src);
                setImageUrl(img.src);
            };
            if(img.complete) commit();
            else img.onload = commit;
        };

        const listener: IGetImageListener = {
            imageReady: (_id: number, texture, image) =>
            {
                if(cancelled) return;
                let resolved = image;
                if(!resolved && texture)
                {
                    try { resolved = TextureUtils.generateImage(texture); } catch { resolved = null; }
                }
                applyResolvedImage(resolved);
            },
            imageFailed: () => {}
        };

        try
        {
            const result: ImageResult = engine.getFurnitureFloorImage(furnitureId, new Vector3d(180), 64, listener);
            // result.id === 0 means the real furniture asset is already loaded in memory (non-zero is a loading placeholder!)
            if(result && result.id === 0 && result.data)
            {
                applyResolvedImage(result.getImage());
            }
        }
        catch
        {
            // Keep icon fallback if 3D asset isn't loaded yet
        }

        return () => { cancelled = true; };
    }, [ furnitureId ]);

    return imageUrl;
}
