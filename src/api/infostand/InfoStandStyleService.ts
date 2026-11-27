import { AvatarAction, IGetImageListener, ImageResult, TextureUtils, Vector3d } from '@nitrots/nitro-renderer';
import { useEffect, useState } from 'react';
import { GetRoomEngine } from '../nitro';

// Real Habbo / Game Center / Wired pixel-art assets bundled in Nitro
import bbLogoImg from '../../assets/images/gamecenter/battleball/battleball_logo.png';
import bbBackdropImg from '../../assets/images/gamecenter/battleball/bb_arena_backdrop.png';
import bbIconImg from '../../assets/images/gamecenter/battleball/bb_presence_icon.png';
import bbBombImg from '../../assets/images/gamecenter/battleball/pu_bomb.png';
import bbCannonImg from '../../assets/images/gamecenter/battleball/pu_cannon.png';
import bbSpringImg from '../../assets/images/gamecenter/battleball/pu_spring.png';

import ffArenaImg from '../../assets/images/gamecenter/fastfood/ff_arena_classic.png';
import ffParachuteImg from '../../assets/images/gamecenter/fastfood/ff_btn_parachute.png';
import ffBurgerImg from '../../assets/images/gamecenter/fastfood/ff_food_burger.png';
import ffDrinksImg from '../../assets/images/gamecenter/fastfood/ff_food_drinks.png';
import ffPizzaImg from '../../assets/images/gamecenter/fastfood/ff_food_pizza.png';
import ffLogoImg from '../../assets/images/gamecenter/fastfood/ff_logo_habbten.png';

import ssPineImg from '../../assets/images/gamecenter/snowstorm/sprite_pine_tree.png';
import ssDuckImg from '../../assets/images/gamecenter/snowstorm/sprite_snow_duck.png';
import ssHorizonImg from '../../assets/images/gamecenter/snowstorm/ss_horizon_bg.png';
import ssIceSmallImg from '../../assets/images/gamecenter/snowstorm/thumbnails_Icecube_small.png';
import ssSnowballImg from '../../assets/images/gamecenter/snowstorm/thumbnails_Snowball.png';
import ssLogoImg from '../../assets/images/gamecenter/snowstorm/thumbnails_Snowstorm_Logo.png';

import wsSplashImg from '../../assets/images/gamecenter/wobblesquabble/ws_fx_splash.png';
import wsWhackImg from '../../assets/images/gamecenter/wobblesquabble/ws_fx_whack.png';
import wsIconImg from '../../assets/images/gamecenter/wobblesquabble/ws_presence_icon.png';
import wsRooftopImg from '../../assets/images/gamecenter/wobblesquabble/ws_rooftop_wide.png';

import wiredBannerImg from '../../assets/images/wired/wired_banner_pattern.png';
import wiredMonitorImg from '../../assets/images/wired/wired_monitor_illustration.png';

export type InfoStandPlatePattern =
    | 'none'
    | 'diamond'
    | 'stripe'
    | 'frost'
    | 'candy'
    | 'snow'
    | 'checker'
    | 'wave'
    | 'tiles'
    | 'crest'
    | 'starlight'
    | 'circuit'
    | 'pitch'
    | 'grid';

export type InfoStandTopTrim = 'none' | 'icicles' | 'garland' | 'awning' | 'wired_bar' | 'magic_stars';

export interface InfoStandPlateDecorItem
{
    slot: 'tl' | 'tr' | 'bl' | 'br';
    img?: string;
    furniId?: number;
    size?: number;
}

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
    emblemImg?: string;
    emblemFurniId?: number;
    bgImageUrl?: string;
    bgImageOpacity?: number;
    topTrim?: InfoStandTopTrim;
    topBannerImg?: string;
    decors?: InfoStandPlateDecorItem[];
    pattern?: InfoStandPlatePattern;
}

export interface InfoStandFurniDef
{
    id: string;
    name: string;
    furnitureId: number;
    price: number;
    seatOffsetX?: number;
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
    { id: 'default',        name: 'Clásico',             price: 0,   accentColor: '#5c6b73', borderColor: '#ffffff', bgStyle: 'rgba(74, 74, 74, 0.78)', emblemColor: '#7a8a93', pattern: 'none' },
    { id: 'emerald',        name: 'Pod Esmeralda',       price: 0,   accentColor: '#1f8a2e', borderColor: '#66e05c', bgStyle: 'linear-gradient(180deg, #1b6f27 0%, #104818 100%)', emblemColor: '#2fb83d', pattern: 'none' },
    { id: 'sapphire',       name: 'Pod Zafiro',          price: 0,   accentColor: '#1a65b8', borderColor: '#5cb8ff', bgStyle: 'linear-gradient(180deg, #154d92 0%, #0b2d59 100%)', emblemColor: '#2d8bf0', pattern: 'none' },
    { id: 'amber',          name: 'Ámbar Retro',         price: 250, accentColor: '#c96f12', borderColor: '#ffb84d', bgStyle: 'linear-gradient(180deg, #a6540d 0%, #6b3105 100%)', emblemColor: '#f08c24', pattern: 'none' },
    { id: 'rose',           name: 'Rosa Club',           price: 250, accentColor: '#b83b72', borderColor: '#ff8cc2', bgStyle: 'linear-gradient(180deg, #982b5c 0%, #611739 100%)', emblemColor: '#e8589a', pattern: 'none' },
    { id: 'ice',            name: 'Cristal Ártico',      price: 350, accentColor: '#2996b5', borderColor: '#9beeff', bgStyle: 'linear-gradient(180deg, #1c6e8c 0%, #114459 100%)', emblemColor: '#4fd2f5', pattern: 'stripe' },
    { id: 'violet',         name: 'Neón Galaxia',        price: 400, accentColor: '#7b3bd1', borderColor: '#c490ff', bgStyle: 'linear-gradient(180deg, #5c24a8 0%, #331066 100%)', emblemColor: '#9b5bf5', pattern: 'diamond' },
    { id: 'crimson',        name: 'Rubí Real',           price: 400, accentColor: '#b01e2b', borderColor: '#ff6b6b', bgStyle: 'linear-gradient(180deg, #8e1420 0%, #520911 100%)', emblemColor: '#e03131', pattern: 'diamond' },
    { id: 'obsidian',       name: 'Obsidiana VIP',       price: 500, accentColor: '#2a2d34', borderColor: '#ff6b35', bgStyle: 'linear-gradient(180deg, #2d3036 0%, #16181c 100%)', emblemColor: '#e85d04', pattern: 'diamond' },
    { id: 'gold_hc',        name: 'Oro Imperial',        price: 600, accentColor: '#b5891b', borderColor: '#ffe066', bgStyle: 'linear-gradient(180deg, #8f670e 0%, #523905 100%)', emblemColor: '#ffd43b', pattern: 'diamond' },

    // Navidad / Invierno 2008 (con carámbanos congelados y furnis reales xmas08)
    {
        id: 'xmas_2008',
        name: 'Navidad Helada 2008',
        price: 450,
        accentColor: '#3b95c9',
        borderColor: '#d9f4ff',
        bgStyle: 'linear-gradient(180deg, #5eb8e6 0%, #246596 52%, #13395c 100%)',
        emblemColor: '#9ce6ff',
        emblemImg: ssIceSmallImg,
        topTrim: 'icicles',
        decors: [
            { slot: 'bl', furniId: 2972, size: 34 }, // Pingüino Polo 2008 (xmas08_trph1)
            { slot: 'br', furniId: 2967, size: 42 }  // Árbol Ártico 2008 (xmas08_icetree)
        ],
        pattern: 'frost'
    },
    {
        id: 'xmas_classic',
        name: 'Espíritu Navideño',
        price: 400,
        accentColor: '#b91c1c',
        borderColor: '#f7d060',
        bgStyle: 'linear-gradient(180deg, #9c1a1a 0%, #590d14 100%)',
        emblemColor: '#22c55e',
        emblemFurniId: 215, // Pato de Navidad (xmasduck)
        topTrim: 'garland',
        decors: [
            { slot: 'bl', furniId: 2971, size: 34 }, // Pingüino Santa (penguin_elf)
            { slot: 'br', furniId: 4291, size: 42 }  // Arbolito Navideño (xmas2011_tree1)
        ],
        pattern: 'candy'
    },

    // Game Center (con logos, fondos y sprites originales de los 4 juegos)
    {
        id: 'gc_snowstorm',
        name: 'SnowStorm',
        price: 450,
        accentColor: '#1d5d9b',
        borderColor: '#e0f4ff',
        bgStyle: 'linear-gradient(180deg, #1d5d9b 0%, #0c2f59 100%)',
        emblemColor: '#7dd3fc',
        emblemImg: ssSnowballImg,
        bgImageUrl: ssHorizonImg,
        bgImageOpacity: 0.32,
        topTrim: 'icicles',
        topBannerImg: ssLogoImg,
        decors: [
            { slot: 'bl', img: ssPineImg, size: 38 },
            { slot: 'br', img: ssDuckImg, size: 32 }
        ],
        pattern: 'snow'
    },
    {
        id: 'gc_fastfood',
        name: 'FastFood',
        price: 400,
        accentColor: '#c92a2a',
        borderColor: '#ffd43b',
        bgStyle: 'linear-gradient(180deg, #b82525 0%, #751313 100%)',
        emblemColor: '#ff922b',
        emblemImg: ffBurgerImg,
        bgImageUrl: ffArenaImg,
        bgImageOpacity: 0.24,
        topTrim: 'awning',
        topBannerImg: ffLogoImg,
        decors: [
            { slot: 'tl', img: ffParachuteImg, size: 28 },
            { slot: 'bl', img: ffPizzaImg, size: 34 },
            { slot: 'br', img: ffBurgerImg, size: 32 }
        ],
        pattern: 'checker'
    },
    {
        id: 'gc_wobble',
        name: 'Wobble Squabble',
        price: 400,
        accentColor: '#0e9f9e',
        borderColor: '#7ef9ff',
        bgStyle: 'linear-gradient(180deg, #0ea5a4 0%, #084f5c 100%)',
        emblemColor: '#22d3ee',
        emblemImg: wsIconImg,
        bgImageUrl: wsRooftopImg,
        bgImageOpacity: 0.3,
        decors: [
            { slot: 'bl', img: wsWhackImg, size: 38 },
            { slot: 'br', img: wsSplashImg, size: 42 }
        ],
        pattern: 'wave'
    },
    {
        id: 'gc_battleball',
        name: 'Battle Ball',
        price: 450,
        accentColor: '#6d28d9',
        borderColor: '#a3e635',
        bgStyle: 'linear-gradient(180deg, #5b21b6 0%, #2e0759 100%)',
        emblemColor: '#84cc16',
        emblemImg: bbIconImg,
        bgImageUrl: bbBackdropImg,
        bgImageOpacity: 0.34,
        topBannerImg: bbLogoImg,
        decors: [
            { slot: 'tl', img: bbBombImg, size: 26 },
            { slot: 'bl', img: bbCannonImg, size: 28 },
            { slot: 'br', img: bbSpringImg, size: 26 }
        ],
        pattern: 'tiles'
    },

    // Mundo Mágico (Harry Potter — furnis mágicos reales de Habbo)
    {
        id: 'hp_gryffindor',
        name: 'León Escarlata',
        price: 500,
        accentColor: '#7f1d1d',
        borderColor: '#f5c542',
        bgStyle: 'linear-gradient(180deg, #7f1d1d 0%, #420909 100%)',
        emblemColor: '#eab308',
        emblemFurniId: 225, // Velas rojas (rcandleset)
        topTrim: 'magic_stars',
        decors: [
            { slot: 'bl', furniId: 225, size: 34 },   // Velas Rojas
            { slot: 'br', furniId: 10831, size: 40 }  // Escobas Embrujadas
        ],
        pattern: 'crest'
    },
    {
        id: 'hp_slytherin',
        name: 'Serpiente Esmeralda',
        price: 500,
        accentColor: '#14532d',
        borderColor: '#cbd5e1',
        bgStyle: 'linear-gradient(180deg, #14532d 0%, #052b14 100%)',
        emblemColor: '#22c55e',
        emblemFurniId: 4578, // Poción mágica
        topTrim: 'magic_stars',
        decors: [
            { slot: 'bl', furniId: 4578, size: 32 },  // Poción resucitadora
            { slot: 'br', furniId: 2625, size: 38 }   // Caldero mágico
        ],
        pattern: 'crest'
    },
    {
        id: 'hp_magic',
        name: 'Hechicero Nocturno',
        price: 550,
        accentColor: '#312e81',
        borderColor: '#fde047',
        bgStyle: 'linear-gradient(180deg, #1e1b4b 0%, #090721 100%)',
        emblemColor: '#818cf8',
        emblemFurniId: 2997, // Pingüino Abracadabra
        topTrim: 'magic_stars',
        decors: [
            { slot: 'bl', furniId: 2997, size: 36 },  // Pingüino Abracadabra
            { slot: 'br', furniId: 10789, size: 40 }  // Caldero de la Bruja
        ],
        pattern: 'starlight'
    },

    // Wired (textura oficial Wired + cajas Wired reales)
    {
        id: 'wired_tech',
        name: 'Maestro Wired',
        price: 550,
        accentColor: '#334155',
        borderColor: '#38bdf8',
        bgStyle: 'linear-gradient(180deg, #2b333d 0%, #14181e 100%)',
        emblemColor: '#00e5ff',
        emblemFurniId: 3668, // Causante WIRED
        bgImageUrl: wiredBannerImg,
        bgImageOpacity: 0.28,
        topTrim: 'wired_bar',
        decors: [
            { slot: 'tl', img: wiredMonitorImg, size: 28 },
            { slot: 'bl', furniId: 3668, size: 34 },  // Causante WIRED
            { slot: 'br', furniId: 3663, size: 34 }   // Efecto WIRED
        ],
        pattern: 'circuit'
    },

    // Deportes & Retro (furnis deportivos y arcade reales)
    {
        id: 'sport_football',
        name: 'Estadio Fútbol',
        price: 350,
        accentColor: '#15803d',
        borderColor: '#f8fafc',
        bgStyle: 'linear-gradient(180deg, #1f7a38 0%, #104a20 100%)',
        emblemColor: '#4ade80',
        emblemFurniId: 3508, // Balón Clásico (fball_ball)
        decors: [
            { slot: 'bl', furniId: 3508, size: 30 },  // Balón Clásico
            { slot: 'br', furniId: 3505, size: 38 }   // Trofeo Mundial
        ],
        pattern: 'pitch'
    },
    {
        id: 'sport_basket',
        name: 'Cancha Basket',
        price: 350,
        accentColor: '#c2410c',
        borderColor: '#fed7aa',
        bgStyle: 'linear-gradient(180deg, #c2410c 0%, #75280f 100%)',
        emblemColor: '#fb923c',
        emblemFurniId: 280, // Trofeo Baloncesto
        decors: [
            { slot: 'bl', furniId: 3547, size: 30 },  // Balón
            { slot: 'br', furniId: 280, size: 38 }    // Trofeo Baloncesto
        ],
        pattern: 'stripe'
    },
    {
        id: 'arcade_retro',
        name: 'Arcade 8-Bit',
        price: 450,
        accentColor: '#3b0764',
        borderColor: '#f472b6',
        bgStyle: 'linear-gradient(180deg, #22104a 0%, #0d0524 100%)',
        emblemColor: '#ec4899',
        emblemFurniId: 5063, // Raro Armario Arcade
        decors: [
            { slot: 'bl', furniId: 3277, size: 36 },  // Arcade Tank
            { slot: 'br', furniId: 5063, size: 42 }   // Armario Arcade
        ],
        pattern: 'grid'
    },
    {
        id: 'habbo_club',
        name: 'VIP Clásico',
        price: 650,
        accentColor: '#166534',
        borderColor: '#facc15',
        bgStyle: 'linear-gradient(180deg, #166534 0%, #0a361b 100%)',
        emblemColor: '#fde047',
        emblemFurniId: 1506, // Trofeo Pato Dorado
        decors: [
            { slot: 'bl', furniId: 267, size: 38 },   // El Club Sofa
            { slot: 'br', furniId: 1506, size: 36 }   // Trofeo Pato Dorado
        ],
        pattern: 'diamond'
    }
];

export const INFOSTAND_FURNIS: InfoStandFurniDef[] = [
    { id: 'none',           name: 'Sin furni',        furnitureId: 0,    price: 0,   seatOffsetX: 0,  seatOffsetY: 0 },
    { id: 'chair_plasty',   name: 'Pod Clásico',      furnitureId: 121,  price: 0,   seatOffsetX: 0,  seatOffsetY: -6 },
    { id: 'chair_plasty_1', name: 'Pod Verde',        furnitureId: 126,  price: 150, seatOffsetX: 0,  seatOffsetY: -6 },
    { id: 'chair_plasty_2', name: 'Pod Rojo',         furnitureId: 125,  price: 150, seatOffsetX: 0,  seatOffsetY: -6 },
    { id: 'chair_plasty_3', name: 'Pod Azul',         furnitureId: 147,  price: 150, seatOffsetX: 0,  seatOffsetY: -6 },
    { id: 'chair_plasty_4', name: 'Pod Naranja',      furnitureId: 124,  price: 200, seatOffsetX: 0,  seatOffsetY: -6 },
    { id: 'chair_plasty_5', name: 'Pod Rosa',         furnitureId: 1500, price: 200, seatOffsetX: 0,  seatOffsetY: -6 },
    { id: 'chair_plasty_6', name: 'Pod Morado',       furnitureId: 1499, price: 200, seatOffsetX: 0,  seatOffsetY: -6 },
    { id: 'chair_norja',    name: 'Silla Norja',      furnitureId: 30,   price: 150, seatOffsetX: 0,  seatOffsetY: -6 },
    { id: 'pillow_0',       name: 'Almohadón Blanco', furnitureId: 1581, price: 300, seatOffsetX: 0,  seatOffsetY: 4 },
    { id: 'pillow_1',       name: 'Almohadón Rosa',   furnitureId: 1582, price: 300, seatOffsetX: 0,  seatOffsetY: 4 },
    { id: 'club_sofa',      name: 'Sofá HC',          furnitureId: 267,  price: 400, seatOffsetX: -2, seatOffsetY: 0 },
    { id: 'hc_chr',         name: 'Silla Majestic',   furnitureId: 1527, price: 500, seatOffsetX: 0,  seatOffsetY: -2 },
    { id: 'throne',         name: 'Trono Clásico',    furnitureId: 230,  price: 800, seatOffsetX: 0,  seatOffsetY: 2 }
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

export function useInfoStandFurniSprite(furnitureId?: number): string | null
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

export function useInfoStandFurniIcon(furnitureId?: number): string | null
{
    if(!furnitureId || furnitureId <= 0) return null;
    const engine = GetRoomEngine();
    if(!engine) return null;
    return engine.getFurnitureFloorIconUrl(furnitureId) || null;
}
