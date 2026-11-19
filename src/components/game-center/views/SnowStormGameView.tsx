import { AvatarScaleType, AvatarSetType } from '@nitrots/nitro-renderer';
import { FC, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GetAvatarRenderManager, GetConfiguration, GetSessionDataManager } from '../../../api';
import { useGameCenter, useGamePresence } from '../../../hooks';
import { HabboHeadImg, SnowStormParkaAvatar, trimTransparentImage } from './SnowStormAvatar';

import creditIconImg from '../../../assets/images/eras/flash2012/purse/credit_icon.png';
import ducketIconImg from '../../../assets/images/eras/flash2012/purse/ducket_icon.png';
import closeUbuntuImg from '../../../assets/images/eras/flash2012/skins/close_ubuntu_normal.png';
import room1Img from '../../../assets/images/gamecenter/snowstorm/Room_snowstorm_1.png';
import room2Img from '../../../assets/images/gamecenter/snowstorm/Room_snowstorm_2.png';
import room3Img from '../../../assets/images/gamecenter/snowstorm/Room_snowstorm_3.png';
import room4Img from '../../../assets/images/gamecenter/snowstorm/Room_snowstorm_4.png';
import room5Img from '../../../assets/images/gamecenter/snowstorm/Room_snowstorm_5.png';
import posesGridImg from '../../../assets/images/gamecenter/snowstorm/Snowstorm_poses_grid.png';
import hudBtnLeaveImg from '../../../assets/images/gamecenter/snowstorm/hud_btn_leave.png';
import hudBtnReloadImg from '../../../assets/images/gamecenter/snowstorm/hud_btn_reload.png';
import hudMittenBlueImg from '../../../assets/images/gamecenter/snowstorm/hud_mitten_blue.png';
import hudMittenRedImg from '../../../assets/images/gamecenter/snowstorm/hud_mitten_red.png';
import berryTreeImg from '../../../assets/images/gamecenter/snowstorm/sprite_berry_tree.png';
import fenceImg from '../../../assets/images/gamecenter/snowstorm/sprite_fence.png';
import pineTreeImg from '../../../assets/images/gamecenter/snowstorm/sprite_pine_tree.png';
import ssHorizonBgImg from '../../../assets/images/gamecenter/snowstorm/ss_horizon_bg.png';
import snowballSmallImg from '../../../assets/images/gamecenter/snowstorm/thumbnails_Extra_ss_snowball.png';
import iceCubeBigImg from '../../../assets/images/gamecenter/snowstorm/thumbnails_Icecube_big.png';
import machineImg from '../../../assets/images/gamecenter/snowstorm/thumbnails_S_snowball_machine_name.png';
import snowstormLogoImg from '../../../assets/images/gamecenter/snowstorm/thumbnails_Snowstorm_Logo.png';

import './SnowStormGameView.scss';

type Stage = 'lobby' | 'playing' | 'results';
type Team = 'blue' | 'red';
type TileType = 0 | 1 | 2 | 3 | 4 | 5 | 6;
// 0 = snow walkable, 1 = ice water (impassable), 2 = wooden bridge (walkable),
// 3 = snow pine tree (solid), 4 = ice-cube bunker (solid, low cover - lob flies over),
// 5 = wooden fence (solid, low cover - lob flies over), 6 = central Snowball Machine

interface ArenaDef
{
    id: number;
    name: string;
    preview: string;
    grid: TileType[][];
}

interface RosterBot
{
    id: string;
    name: string;
    figure: string;
    team: Team;
    stars: number;
    isHuman?: boolean;
}

interface Fighter
{
    id: string;
    name: string;
    figure: string;
    team: Team;
    isHuman: boolean;
    x: number;
    y: number;
    vx: number;
    vy: number;
    targetX: number | null;
    targetY: number | null;
    facingX: number; // 1 = right, -1 = left
    facingY: number; // 1 = down, -1 = up
    hp: number; // 0..5 (each hit = 1)
    snowballs: number; // 0..5
    reloading: boolean;
    reloadTimer: number;
    koTimer: number;
    invulnTimer: number;
    throwAnimTimer: number;
    hitAnimTimer: number;
    throwCooldown: number;
    walkPhase: number;
    hits: number;
    kos: number;
    throws: number;
    score: number;
    aiThinkTimer: number;
    aiGoalX: number;
    aiGoalY: number;
}

interface SnowballProj
{
    id: number;
    ownerId: string;
    team: Team;
    sx: number;
    sy: number;
    tx: number;
    ty: number;
    progress: number;
    duration: number;
    isLob: boolean;
    arcHeight: number;
}

interface SnowPile
{
    x: number;
    y: number;
    balls: number;
}

interface Particle
{
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    life: number;
    maxLife: number;
    size: number;
    color: string;
}

interface FloatingPopup
{
    x: number;
    y: number;
    text: string;
    color: string;
    life: number;
    maxLife: number;
}

interface ChatBubble
{
    id: number;
    fighterId: string;
    name: string;
    figure: string;
    team: Team;
    text: string;
    life: number;
}

interface MatchFinishResponse
{
    success: boolean;
    my_score?: number;
    rewards?: { credits: number; duckets: number; score: number };
    unlocked_achievements?: Array<{ achievement: string; title: string; level: number; badge: string }>;
    games_left?: number;
    has_unlimited?: boolean;
}

interface HudSnapshot
{
    timeLeft: number;
    blueScore: number;
    redScore: number;
    myHp: number;
    mySnowballs: number;
    myScore: number;
    myReloading: boolean;
    myKo: boolean;
}

const GRID_SIZE = 16;
const MATCH_DURATION = 120;
const TILE_W = 54;
const TILE_H = 27;

// Measured exact rects from Snowstorm_poses.png (416x101, transparent background)
const POSE_RECTS = {
    blue: {
        idle: { x: 76, y: 8, w: 21, h: 32 },
        back: { x: 10, y: 7, w: 21, h: 32 },
        walk: { x: 42, y: 5, w: 23, h: 36 },
        crouch: { x: 102, y: 9, w: 25, h: 31 },
        ko: { x: 140, y: 9, w: 53, h: 30 },
        throw: { x: 200, y: 6, w: 32, h: 33 },
        hit: { x: 292, y: 10, w: 37, h: 37 }
    },
    red: {
        idle: { x: 83, y: 55, w: 21, h: 32 },
        back: { x: 274, y: 57, w: 23, h: 38 },
        walk: { x: 181, y: 55, w: 27, h: 36 },
        crouch: { x: 378, y: 62, w: 25, h: 31 },
        ko: { x: 213, y: 58, w: 54, h: 30 },
        throw: { x: 44, y: 52, w: 32, h: 33 },
        hit: { x: 8, y: 48, w: 27, h: 36 }
    }
} as const;

const BOT_POOL_BLUE: Omit<RosterBot, 'team'>[] = [
    { id: 'bot-b1', name: 'VentiscaAzul', figure: 'hr-115-45.hd-180-1.ch-255-66.lg-280-110.sh-305-62', stars: 8 },
    { id: 'bot-b2', name: 'NieveAzul', figure: 'hr-515-33.hd-600-2.ch-635-70.lg-715-66.sh-730-62', stars: 7 },
    { id: 'bot-b3', name: 'PinguinoPro', figure: 'hr-828-61.hd-190-2.ch-215-64.lg-275-110.sh-290-62', stars: 6 }
];

const BOT_POOL_RED: Omit<RosterBot, 'team'>[] = [
    { id: 'bot-r1', name: 'Llamarada', figure: 'hr-893-61.hd-180-3.ch-255-64.lg-280-110.sh-305-64', stars: 9 },
    { id: 'bot-r2', name: 'Sohaldinho', figure: 'hr-155-42.hd-205-2.ch-210-66.lg-270-82.sh-290-64', stars: 8 },
    { id: 'bot-r3', name: 'VentiRojo', figure: 'hr-540-31.hd-620-1.ch-665-92.lg-700-110.sh-725-64', stars: 7 },
    { id: 'bot-r4', name: 'GlaciarMax', figure: 'hr-100-45.hd-195-1.ch-225-62.lg-285-64.sh-300-64', stars: 6 }
];

const BOT_CHAT_LINES = [
    '¡Al centro por bolas!',
    '¡Toma eso!',
    '¡Cuidado con el lanzamiento alto!',
    '¡Buen disparo!',
    '¡Recargando nieve!',
    '¡Defiendan la máquina!',
    '¡K.O. limpio!',
    '¡Jajaja qué puntería!'
];

function parseMap(rows: string[]): TileType[][]
{
    // Legend: . snow, ~ water/ice, = bridge, T tree, I ice-cube bunker, F fence, M snowball machine
    const mapChar: Record<string, TileType> = {
        '.': 0, '~': 1, '=': 2, 'T': 3, 'I': 4, 'F': 5, 'M': 6
    };
    return rows.map(r => r.split('').map(ch => mapChar[ch] ?? 0));
}

const ARENAS: ArenaDef[] = [
    {
        id: 1,
        name: 'Lago de la Máquina',
        preview: room1Img,
        grid: parseMap([
            '................',
            '..T..III....T...',
            '.....I..........',
            '..T..I..FF..T...',
            '................',
            '.....~~~~~~.....',
            '.....~..=.~.....',
            '.....=..M.=.....',
            '.....~....~.....',
            '.....~.=..~.....',
            '.....~~~~~~.....',
            '................',
            '...T..FF..I..T..',
            '..........I.....',
            '...T....III..T..',
            '................'
        ])
    },
    {
        id: 2,
        name: 'Bosque Prohibido',
        preview: room2Img,
        grid: parseMap([
            '................',
            '..T....T....T...',
            '....T.....T.....',
            '..F....I....F...',
            '....T.....T.....',
            '......~~~~......',
            '......=..=......',
            '...T..~.M~..T...',
            '......~..~......',
            '......~~~~......',
            '....T.....T.....',
            '..F....I....F...',
            '....T.....T.....',
            '..T....T....T...',
            '................',
            '................'
        ])
    },
    {
        id: 3,
        name: 'Fortaleza Ártica',
        preview: room3Img,
        grid: parseMap([
            '................',
            '................',
            '..IIII....T.....',
            '..I..........T..',
            '..I...FF........',
            '......~~~~......',
            '.....~=..=~.....',
            '.....~..M.~.....',
            '.....~=..=~.....',
            '......~~~~......',
            '........FF...I..',
            '..T..........I..',
            '.....T....IIII..',
            '................',
            '................',
            '................'
        ])
    },
    {
        id: 4,
        name: 'Puente Helado',
        preview: room4Img,
        grid: parseMap([
            '................',
            '...T...II...T...',
            '................',
            '..FF........FF..',
            '................',
            '................',
            '~~==~~~==~~~==~~',
            '~~==~~~M=~~~==~~',
            '~~==~~~==~~~==~~',
            '................',
            '................',
            '..FF........FF..',
            '................',
            '...T...II...T...',
            '................',
            '................'
        ])
    },
    {
        id: 5,
        name: 'Colina Invernal',
        preview: room5Img,
        grid: parseMap([
            '................',
            '....T......T....',
            '..II........II..',
            '................',
            '....F..TT..F....',
            '................',
            '......I..I......',
            '.......M........',
            '......I..I......',
            '................',
            '....F..TT..F....',
            '................',
            '..II........II..',
            '....T......T....',
            '................',
            '................'
        ])
    }
];

function isTileWalkable(grid: TileType[][], gx: number, gy: number): boolean
{
    const ix = Math.floor(gx);
    const iy = Math.floor(gy);
    if (ix < 0 || iy < 0 || ix >= GRID_SIZE || iy >= GRID_SIZE) return false;
    const t = grid[iy][ix];
    return t === 0 || t === 2;
}

// Solid circular collision radius so fighters NEVER clip into trees, fences, bunkers, or moat!
function isWalkable(grid: TileType[][], gx: number, gy: number, radius = 0.34): boolean
{
    if (!isTileWalkable(grid, gx, gy)) return false;
    if (radius <= 0) return true;
    return (
        isTileWalkable(grid, gx - radius, gy - radius) &&
        isTileWalkable(grid, gx + radius, gy - radius) &&
        isTileWalkable(grid, gx - radius, gy + radius) &&
        isTileWalkable(grid, gx + radius, gy + radius)
    );
}

function findSafeSpawn(grid: TileType[][], team: Team): { x: number; y: number }
{
    for (let attempt = 0; attempt < 25; attempt++)
    {
        const bx = team === 'blue' ? 0.8 + Math.random() * 2.8 : 12.4 + Math.random() * 2.8;
        const by = team === 'blue' ? 0.8 + Math.random() * 2.8 : 12.4 + Math.random() * 2.8;
        if (isWalkable(grid, bx, by, 0.38)) return { x: bx, y: by };
    }
    return team === 'blue' ? { x: 0.6, y: 0.6 } : { x: 15.4, y: 15.4 };
}

function blocksDirectShot(grid: TileType[][], gx: number, gy: number): boolean
{
    const ix = Math.floor(gx);
    const iy = Math.floor(gy);
    if (ix < 0 || iy < 0 || ix >= GRID_SIZE || iy >= GRID_SIZE) return true;
    const t = grid[iy][ix];
    if (t !== 3 && t !== 4 && t !== 5 && t !== 6) return false;
    // Tight inner core so players peeking beside a tree/bunker can still be hit fairly!
    const fx = gx - ix;
    const fy = gy - iy;
    return fx >= 0.18 && fx <= 0.82 && fy >= 0.18 && fy <= 0.82;
}

function findMachineTile(grid: TileType[][]): { x: number; y: number }
{
    for (let y = 0; y < GRID_SIZE; y++)
    {
        for (let x = 0; x < GRID_SIZE; x++)
        {
            if (grid[y][x] === 6) return { x: x + 0.5, y: y + 0.5 };
        }
    }
    return { x: 7.5, y: 7.5 };
}

class SnowStormAudio
{
    private ctx: AudioContext | null = null;
    public muted = false;

    private ensure(): AudioContext | null
    {
        if (this.muted) return null;
        if (!this.ctx)
        {
            const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (AC) this.ctx = new AC();
        }
        if (this.ctx && this.ctx.state === 'suspended')
        {
            this.ctx.resume().catch(() => {});
        }
        return this.ctx;
    }

    public playThrow(isLob = false)
    {
        const ctx = this.ensure();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(isLob ? 420 : 580, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(isLob ? 210 : 180, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.13);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.14);
    }

    public playHit()
    {
        const ctx = this.ensure();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(240, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(75, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.14, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.11);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
    }

    public playKo()
    {
        const ctx = this.ensure();
        if (!ctx) return;
        [ 523, 659, 784 ].forEach((freq, i) =>
        {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            const t = ctx.currentTime + i * 0.06;
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.06, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
            osc.connect(gain).connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.15);
        });
    }

    public playReload()
    {
        const ctx = this.ensure();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(360, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(620, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    }

    public playWhistle()
    {
        const ctx = this.ensure();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1650, ctx.currentTime);
        osc.frequency.setValueAtTime(1920, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.07, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.34);
    }
}

export const SnowStormGameView: FC = () =>
{
    const { setIsSnowStormPlaying, setIsSnowStormLobbyVisible } = useGameCenter();
    const { setMyGamePresence } = useGamePresence();

    const session = GetSessionDataManager();
    const myUsername = session?.userName || 'Jugador';
    const myFigure = session?.figure || 'hr-115-42.hd-195-19.ch-3030-82.lg-275-1408.sh-295-1321';

    const [ stage, setStage ] = useState<Stage>('lobby');
    const [ selectedArenaId, setSelectedArenaId ] = useState<number>(() => Math.floor(Math.random() * ARENAS.length) + 1);
    const [ lobbyCountdown, setLobbyCountdown ] = useState<number>(5);
    const [ showLeaveModal, setShowLeaveModal ] = useState<boolean>(false);
    const [ muted, setMuted ] = useState<boolean>(false);
    const [ chatOpen, setChatOpen ] = useState<boolean>(false);
    const [ chatText, setChatText ] = useState<string>('');
    const [ rematchCountdown, setRematchCountdown ] = useState<number>(20);
    const [ rematchBusy, setRematchBusy ] = useState<boolean>(false);
    const [ rematchError, setRematchError ] = useState<string | null>(null);
    const [ finishData, setFinishData ] = useState<MatchFinishResponse | null>(null);
    const [ finalFighters, setFinalFighters ] = useState<Fighter[]>([]);
    const [ finalBlueScore, setFinalBlueScore ] = useState<number>(0);
    const [ finalRedScore, setFinalRedScore ] = useState<number>(0);

    const [ hud, setHud ] = useState<HudSnapshot>({
        timeLeft: MATCH_DURATION,
        blueScore: 0,
        redScore: 0,
        myHp: 5,
        mySnowballs: 5,
        myScore: 0,
        myReloading: false,
        myKo: false
    });

    const selectedArena = useMemo(() => ARENAS.find(a => a.id === selectedArenaId) || ARENAS[0], [ selectedArenaId ]);

    const rosterBlue: RosterBot[] = useMemo(() => ([
        { id: 'human', name: myUsername, figure: myFigure, team: 'blue', stars: 10, isHuman: true },
        ...BOT_POOL_BLUE.map(b => ({ ...b, team: 'blue' as Team }))
    ]), [ myUsername, myFigure ]);

    const rosterRed: RosterBot[] = useMemo(() => (
        BOT_POOL_RED.map(b => ({ ...b, team: 'red' as Team }))
    ), []);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const audioRef = useRef<SnowStormAudio>(new SnowStormAudio());
    const keysRef = useRef<Set<string>>(new Set());
    const chatInputRef = useRef<HTMLInputElement | null>(null);

    // Loaded sprite images
    const spritesRef = useRef<{
        poses?: HTMLImageElement;
        machine?: HTMLImageElement;
        iceCube?: HTMLImageElement;
        snowball?: HTMLImageElement;
        pineTree?: HTMLImageElement;
        berryTree?: HTMLImageElement;
        fence?: HTMLImageElement;
    }>({});

    // Cached real Habbo heads rendered via GetAvatarRenderManager()
    const headCacheRef = useRef<Map<string, { front: HTMLImageElement; back: HTMLImageElement }>>(new Map());

    // Mutable match engine state
    const engineRef = useRef<{
        running: boolean;
        finished: boolean;
        arena: ArenaDef;
        timeLeft: number;
        fighters: Fighter[];
        projectiles: SnowballProj[];
        piles: SnowPile[];
        particles: Particle[];
        popups: FloatingPopup[];
        chats: ChatBubble[];
        nextProjId: number;
        nextChatId: number;
        pileTimer: number;
        cameraOriginX: number;
        cameraOriginY: number;
        scale: number;
    } | null>(null);

    // Register real game presence ("está jugando un juego SNOW STORM") on mount
    // and blur any active hotel room chat input so keystrokes never leak into the room!
    useEffect(() =>
    {
        if (document.activeElement instanceof HTMLElement)
        {
            document.activeElement.blur();
        }
        setMyGamePresence('snowstorm', 'SNOW STORM');
        return () =>
        {
            setMyGamePresence(null);
        };
    }, [ setMyGamePresence ]);

    // Preload PNG sprites
    useEffect(() =>
    {
        const load = (src: string, key: keyof typeof spritesRef.current) =>
        {
            const img = new Image();
            img.src = src;
            img.onload = () => { spritesRef.current[key] = img; };
        };
        load(posesGridImg, 'poses');
        load(machineImg, 'machine');
        load(iceCubeBigImg, 'iceCube');
        load(snowballSmallImg, 'snowball');
        load(pineTreeImg, 'pineTree');
        load(berryTreeImg, 'berryTree');
        load(fenceImg, 'fence');
    }, []);

    // Pre-render real Habbo heads via Nitro AvatarRenderManager (local, zero external URLs)
    useEffect(() =>
    {
        const allFigures = Array.from(new Set([ ...rosterBlue, ...rosterRed ].map(r => r.figure)));
        const renderManager = GetAvatarRenderManager();
        if (!renderManager) return;

        const renderHead = (figure: string) =>
        {
            const buildDir = (dir: number, onReady: (img: HTMLImageElement) => void) =>
            {
                const avatarImg = renderManager.createAvatarImage(figure, AvatarScaleType.LARGE, 'M', {
                    resetFigure: () => { buildDir(dir, onReady); },
                    dispose: () => {},
                    disposed: false
                }, null);
                if (!avatarImg) return;
                avatarImg.setDirection(AvatarSetType.FULL, dir);
                avatarImg.setDirection(AvatarSetType.HEAD, dir);
                const cropped = avatarImg.getCroppedImage(AvatarSetType.HEAD);
                if (cropped && cropped.src)
                {
                    trimTransparentImage(cropped.src, (_url, trimmedImg) => onReady(trimmedImg));
                }
                avatarImg.dispose();
            };

            const entry = headCacheRef.current.get(figure) || {
                front: new Image(),
                back: new Image()
            };
            headCacheRef.current.set(figure, entry);
            buildDir(2, img => { entry.front = img; });
            buildDir(0, img => { entry.back = img; });
        };

        allFigures.forEach(renderHead);
    }, [ rosterBlue, rosterRed ]);

    const toggleMute = useCallback(() =>
    {
        setMuted(prev =>
        {
            const next = !prev;
            audioRef.current.muted = next;
            return next;
        });
    }, []);

    const exitToLobby = useCallback(async (applyPenalty: boolean) =>
    {
        try
        {
            await fetch('/api/games/snowstorm/leave', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ inMatch: applyPenalty })
            });
        }
        catch
        {
            // Ignore
        }
        setMyGamePresence(null);
        setIsSnowStormPlaying(false);
        setIsSnowStormLobbyVisible(true);
    }, [ setIsSnowStormPlaying, setIsSnowStormLobbyVisible, setMyGamePresence ]);

    const spawnMatch = useCallback((arena: ArenaDef) =>
    {
        const blueSpawns = [
            { x: 0.6, y: 1.5 }, { x: 1.5, y: 0.6 }, { x: 0.6, y: 2.5 }, { x: 2.5, y: 0.6 }
        ];
        const redSpawns = [
            { x: 15.4, y: 14.5 }, { x: 14.5, y: 15.4 }, { x: 15.4, y: 13.5 }, { x: 13.5, y: 15.4 }
        ];

        const makeFighter = (bot: RosterBot, rawSp: { x: number; y: number }): Fighter =>
        {
            const sp = isWalkable(arena.grid, rawSp.x, rawSp.y, 0.36) ? rawSp : findSafeSpawn(arena.grid, bot.team);
            return ({
                id: bot.id,
                name: bot.name,
                figure: bot.figure,
                team: bot.team,
                isHuman: !!bot.isHuman,
                x: sp.x,
                y: sp.y,
                vx: 0,
                vy: 0,
                targetX: null,
                targetY: null,
                facingX: bot.team === 'blue' ? 1 : -1,
                facingY: bot.team === 'blue' ? 1 : -1,
                hp: 5,
                snowballs: 5,
                reloading: false,
                reloadTimer: 0,
                koTimer: 0,
                invulnTimer: 1.5,
                throwAnimTimer: 0,
                hitAnimTimer: 0,
                throwCooldown: 0,
                walkPhase: 0,
                hits: 0,
                kos: 0,
                throws: 0,
                score: 0,
                aiThinkTimer: 0.4 + Math.random() * 0.6,
                aiGoalX: sp.x,
                aiGoalY: sp.y
            });
        };

        const fighters: Fighter[] = [
            ...rosterBlue.map((b, i) => makeFighter(b, blueSpawns[i])),
            ...rosterRed.map((b, i) => makeFighter(b, redSpawns[i]))
        ];

        const machine = findMachineTile(arena.grid);
        const piles: SnowPile[] = [];
        const offsets = [ [ 1, 0 ], [ -1, 0 ], [ 0, 1 ], [ 0, -1 ] ];
        for (const [ ox, oy ] of offsets)
        {
            const px = Math.floor(machine.x) + ox;
            const py = Math.floor(machine.y) + oy;
            if (isWalkable(arena.grid, px, py))
            {
                piles.push({ x: px + 0.5, y: py + 0.5, balls: 5 });
                if (piles.length >= 2) break;
            }
        }

        engineRef.current = {
            running: true,
            finished: false,
            arena,
            timeLeft: MATCH_DURATION,
            fighters,
            projectiles: [],
            piles,
            particles: [],
            popups: [],
            chats: [
                {
                    id: 1,
                    fighterId: 'bot-b1',
                    name: rosterBlue[1].name,
                    figure: rosterBlue[1].figure,
                    team: 'blue',
                    text: '¡Vamos Equipo Azul! ¡A la máquina de nieve!',
                    life: 4.5
                }
            ],
            nextProjId: 1,
            nextChatId: 2,
            pileTimer: 5,
            cameraOriginX: 0,
            cameraOriginY: 0,
            scale: 1
        };

        setShowLeaveModal(false);
        setFinishData(null);
        setRematchError(null);
        setRematchCountdown(20);
        setHud({
            timeLeft: MATCH_DURATION,
            blueScore: 0,
            redScore: 0,
            myHp: 5,
            mySnowballs: 5,
            myScore: 0,
            myReloading: false,
            myKo: false
        });
        setStage('playing');
        audioRef.current.playWhistle();
    }, [ rosterBlue, rosterRed ]);

    // Stage A: Lobby countdown -> automatically launches match
    useEffect(() =>
    {
        if (stage !== 'lobby') return;
        if (lobbyCountdown <= 0)
        {
            spawnMatch(selectedArena);
            return;
        }
        const t = setTimeout(() => setLobbyCountdown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [ stage, lobbyCountdown, selectedArena, spawnMatch ]);

    // Stage C: Rematch 20s countdown
    useEffect(() =>
    {
        if (stage !== 'results') return;
        if (rematchCountdown <= 0) return;
        const t = setTimeout(() => setRematchCountdown(c => Math.max(0, c - 1)), 1000);
        return () => clearTimeout(t);
    }, [ stage, rematchCountdown ]);

    const handleFinishMatch = useCallback(async (eng: NonNullable<typeof engineRef.current>) =>
    {
        if (eng.finished) return;
        eng.finished = true;
        eng.running = false;
        audioRef.current.playWhistle();

        const fightersCopy = eng.fighters.map(f => ({ ...f }));
        const blueScore = fightersCopy.filter(f => f.team === 'blue').reduce((s, f) => s + f.score, 0);
        const redScore = fightersCopy.filter(f => f.team === 'red').reduce((s, f) => s + f.score, 0);

        const me = fightersCopy.find(f => f.isHuman);
        const sortedKo = [ ...fightersCopy ].sort((a, b) => b.kos - a.kos || b.score - a.score);
        const sortedHits = [ ...fightersCopy ].sort((a, b) => b.hits - a.hits || b.score - a.score);
        const isMvpKo = !!(me && sortedKo[0]?.id === me.id && me.kos > 0);
        const isMvpHits = !!(me && sortedHits[0]?.id === me.id && me.hits > 0);

        setFinalFighters(fightersCopy);
        setFinalBlueScore(blueScore);
        setFinalRedScore(redScore);
        setStage('results');

        try
        {
            const res = await fetch('/api/games/snowstorm/finish', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mapId: eng.arena.id,
                    mapName: eng.arena.name,
                    myTeam: 'blue',
                    hits: me?.hits || 0,
                    kos: me?.kos || 0,
                    throws: me?.throws || 0,
                    blueScore,
                    redScore,
                    isMvpKo,
                    isMvpHits,
                    durationSec: Math.max(10, Math.round(MATCH_DURATION - eng.timeLeft))
                })
            });
            const data: MatchFinishResponse = await res.json();
            if (data && data.success)
            {
                setFinishData(data);
            }
        }
        catch
        {
            // Keep results visible even if network fails
        }
    }, []);

    const handleRematch = useCallback(async () =>
    {
        setRematchBusy(true);
        setRematchError(null);
        try
        {
            const res = await fetch('/api/games/snowstorm/start', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (!res.ok || !data.success)
            {
                setRematchError(data.error || 'No se pudo iniciar la revancha.');
                setRematchBusy(false);
                return;
            }
            // Pick a different random arena for the rematch automatically
            const otherArenas = ARENAS.filter(a => a.id !== selectedArenaId);
            const randomArena = otherArenas[Math.floor(Math.random() * otherArenas.length)] || ARENAS[0];
            setSelectedArenaId(randomArena.id);
            setLobbyCountdown(5);
            setStage('lobby');
        }
        catch
        {
            setRematchError('Error de conexión con el servidor.');
        }
        finally
        {
            setRematchBusy(false);
        }
    }, [ selectedArenaId ]);

    const handleQuickBuy10 = useCallback(async () =>
    {
        try
        {
            const res = await fetch('/api/games/snowstorm/buy-pack', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pack: 10 })
            });
            const data = await res.json();
            if (data && data.success)
            {
                setFinishData(prev => prev ? { ...prev, games_left: data.games_left } : prev);
                setRematchError('¡Compraste +10 partidas por 5 créditos!');
            }
            else
            {
                setRematchError(data.error || 'Créditos insuficientes.');
            }
        }
        catch
        {
            setRematchError('Error de conexión.');
        }
    }, []);

    const triggerHumanReload = useCallback(() =>
    {
        const eng = engineRef.current;
        if (!eng || !eng.running) return;
        const me = eng.fighters.find(f => f.isHuman);
        if (!me || me.koTimer > 0 || me.snowballs >= 5) return;
        me.reloading = true;
        me.targetX = null;
        me.targetY = null;
        me.reloadTimer = 0.45;
    }, []);

    const handleChatSubmit = useCallback((e: FormEvent) =>
    {
        e.preventDefault();
        const eng = engineRef.current;
        const text = chatText.trim().slice(0, 64);
        if (eng && text.length > 0)
        {
            eng.chats.push({
                id: eng.nextChatId++,
                fighterId: 'human',
                name: myUsername,
                figure: myFigure,
                team: 'blue',
                text,
                life: 4.5
            });
            if (eng.chats.length > 6) eng.chats.shift();
        }
        setChatText('');
        setChatOpen(false);
    }, [ chatText, myUsername, myFigure ]);

    // =========================================================================
    // MAIN 60 FPS GAME ENGINE & ISOMETRIC RENDERER (Stage B: playing)
    // =========================================================================
    useEffect(() =>
    {
        if (stage !== 'playing') return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const throwBall = (
            eng: NonNullable<typeof engineRef.current>,
            shooter: Fighter,
            tx: number,
            ty: number,
            isLob: boolean
        ) =>
        {
            if (shooter.koTimer > 0 || shooter.snowballs <= 0 || shooter.throwCooldown > 0) return;
            const dx = tx - shooter.x;
            const dy = ty - shooter.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 0.25) return;

            const maxRange = isLob ? 7.8 : 6.8;
            const clampedDist = Math.min(dist, maxRange);
            const finalTx = shooter.x + (dx / dist) * clampedDist;
            const finalTy = shooter.y + (dy / dist) * clampedDist;

            shooter.snowballs -= 1;
            shooter.throws += 1;
            shooter.reloading = false;
            shooter.throwAnimTimer = 0.28;
            shooter.throwCooldown = isLob ? 0.55 : 0.34;

            // Update facing in isometric space
            const isoDx = (finalTx - shooter.x) - (finalTy - shooter.y);
            const isoDy = (finalTx - shooter.x) + (finalTy - shooter.y);
            shooter.facingX = isoDx >= 0 ? 1 : -1;
            shooter.facingY = isoDy >= 0 ? 1 : -1;

            const speed = isLob ? 5.6 : 11.2;
            const duration = Math.max(0.14, clampedDist / speed);

            eng.projectiles.push({
                id: eng.nextProjId++,
                ownerId: shooter.id,
                team: shooter.team,
                sx: shooter.x,
                sy: shooter.y,
                tx: finalTx,
                ty: finalTy,
                progress: 0,
                duration,
                isLob,
                arcHeight: isLob ? 68 : 16
            });

            if (shooter.isHuman) audioRef.current.playThrow(isLob);
        };

        const spawnSplash = (eng: NonNullable<typeof engineRef.current>, gx: number, gy: number, count: number, color = '#ffffff') =>
        {
            for (let i = 0; i < count; i++)
            {
                const ang = Math.random() * Math.PI * 2;
                const spd = 1.2 + Math.random() * 2.6;
                eng.particles.push({
                    x: gx,
                    y: gy,
                    z: 10 + Math.random() * 8,
                    vx: Math.cos(ang) * spd,
                    vy: Math.sin(ang) * spd,
                    vz: 24 + Math.random() * 44,
                    life: 0.45 + Math.random() * 0.3,
                    maxLife: 0.75,
                    size: 2.5 + Math.random() * 3,
                    color
                });
            }
        };

        const isoToScreen = (gx: number, gy: number, eng: NonNullable<typeof engineRef.current>) =>
        {
            const sx = eng.cameraOriginX + (gx - gy) * (TILE_W / 2) * eng.scale;
            const sy = eng.cameraOriginY + (gx + gy) * (TILE_H / 2) * eng.scale;
            return { sx, sy };
        };

        const screenToIso = (sx: number, sy: number, eng: NonNullable<typeof engineRef.current>) =>
        {
            const rx = (sx - eng.cameraOriginX) / ((TILE_W / 2) * eng.scale);
            const ry = (sy - eng.cameraOriginY) / ((TILE_H / 2) * eng.scale);
            const gx = (rx + ry) / 2;
            const gy = (ry - rx) / 2;
            return { gx, gy };
        };

        const handlePointerDown = (e: MouseEvent) =>
        {
            if (showLeaveModal) return;
            const eng = engineRef.current;
            if (!eng || !eng.running) return;
            const me = eng.fighters.find(f => f.isHuman);
            if (!me || me.koTimer > 0) return;

            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            const { gx, gy } = screenToIso(mx, my, eng);

            const isRightClick = e.button === 2;
            const isLob = isRightClick || e.ctrlKey || e.metaKey;
            const isForceThrow = e.shiftKey || isLob;

            // Check if clicked directly on an enemy fighter
            let clickedEnemy: Fighter | null = null;
            let bestDist = 42 * eng.scale;
            for (const f of eng.fighters)
            {
                if (f.team === me.team || f.koTimer > 0) continue;
                const pos = isoToScreen(f.x, f.y, eng);
                const d = Math.hypot(mx - pos.sx, my - (pos.sy - 20 * eng.scale));
                if (d < bestDist)
                {
                    bestDist = d;
                    clickedEnemy = f;
                }
            }

            if (clickedEnemy)
            {
                // Slight predictive lead on moving targets
                throwBall(eng, me, clickedEnemy.x + clickedEnemy.vx * 0.14, clickedEnemy.y + clickedEnemy.vy * 0.14, isLob);
                return;
            }

            if (isForceThrow)
            {
                throwBall(eng, me, gx, gy, isLob);
                return;
            }

            // Otherwise walk to clicked tile
            if (gx >= 0.2 && gx < GRID_SIZE - 0.2 && gy >= 0.2 && gy < GRID_SIZE - 0.2)
            {
                me.reloading = false;
                me.targetX = gx;
                me.targetY = gy;
            }
        };

        const handleContextMenu = (e: MouseEvent) => e.preventDefault();

        const handleKeyDown = (e: KeyboardEvent) =>
        {
            if (document.activeElement === chatInputRef.current)
            {
                if (e.key === 'Escape') setChatOpen(false);
                return;
            }
            if (e.key === 'Enter')
            {
                e.preventDefault();
                setChatOpen(true);
                setTimeout(() => chatInputRef.current?.focus(), 20);
                return;
            }
            if (e.key === 'Escape')
            {
                setShowLeaveModal(prev => !prev);
                return;
            }
            if (e.code === 'Space')
            {
                e.preventDefault();
                triggerHumanReload();
                return;
            }
            keysRef.current.add(e.key.toLowerCase());
        };

        const handleKeyUp = (e: KeyboardEvent) =>
        {
            keysRef.current.delete(e.key.toLowerCase());
        };

        canvas.addEventListener('mousedown', handlePointerDown);
        canvas.addEventListener('contextmenu', handleContextMenu);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        let rafId = 0;
        let lastTime = performance.now();
        let hudSyncAcc = 0;

        const moveFighterWithSlide = (f: Fighter, dx: number, dy: number, dt: number, speed: number, grid: TileType[][]) =>
        {
            const len = Math.hypot(dx, dy);
            if (len < 0.001)
            {
                f.vx = 0;
                f.vy = 0;
                return false;
            }
            const nx = dx / len;
            const ny = dy / len;
            const step = Math.min(len, speed * dt);
            const tryX = f.x + nx * step;
            const tryY = f.y + ny * step;

            let moved = false;
            if (isWalkable(grid, tryX, tryY))
            {
                f.vx = (tryX - f.x) / Math.max(dt, 0.001);
                f.vy = (tryY - f.y) / Math.max(dt, 0.001);
                f.x = tryX;
                f.y = tryY;
                moved = true;
            }
            else if (isWalkable(grid, tryX, f.y))
            {
                f.vx = (tryX - f.x) / Math.max(dt, 0.001);
                f.vy = 0;
                f.x = tryX;
                moved = true;
            }
            else if (isWalkable(grid, f.x, tryY))
            {
                f.vx = 0;
                f.vy = (tryY - f.y) / Math.max(dt, 0.001);
                f.y = tryY;
                moved = true;
            }
            else
            {
                f.vx = 0;
                f.vy = 0;
            }

            if (moved)
            {
                const isoDx = nx - ny;
                const isoDy = nx + ny;
                f.facingX = isoDx >= 0 ? 1 : -1;
                f.facingY = isoDy >= 0 ? 1 : -1;
                f.walkPhase += dt * 10;
            }
            return moved;
        };

        const update = (dt: number) =>
        {
            const eng = engineRef.current;
            if (!eng || !eng.running) return;

            eng.timeLeft = Math.max(0, eng.timeLeft - dt);
            if (eng.timeLeft <= 0)
            {
                handleFinishMatch(eng);
                return;
            }

            const grid = eng.arena.grid;
            const machine = findMachineTile(grid);

            // Spawn snow piles around central Snowball Machine
            eng.pileTimer -= dt;
            if (eng.pileTimer <= 0 && eng.piles.length < 4)
            {
                eng.pileTimer = 5.5;
                const candidates = [
                    [ 1, 0 ], [ -1, 0 ], [ 0, 1 ], [ 0, -1 ], [ 1, 1 ], [ -1, -1 ], [ 1, -1 ], [ -1, 1 ]
                ];
                for (const [ ox, oy ] of candidates)
                {
                    const px = Math.floor(machine.x) + ox + 0.5;
                    const py = Math.floor(machine.y) + oy + 0.5;
                    if (isWalkable(grid, px, py) && !eng.piles.some(p => Math.hypot(p.x - px, p.y - py) < 0.6))
                    {
                        eng.piles.push({ x: px, y: py, balls: 5 });
                        break;
                    }
                }
            }

            // Update fighters
            for (const f of eng.fighters)
            {
                if (f.invulnTimer > 0) f.invulnTimer = Math.max(0, f.invulnTimer - dt);
                if (f.throwAnimTimer > 0) f.throwAnimTimer = Math.max(0, f.throwAnimTimer - dt);
                if (f.hitAnimTimer > 0) f.hitAnimTimer = Math.max(0, f.hitAnimTimer - dt);
                if (f.throwCooldown > 0) f.throwCooldown = Math.max(0, f.throwCooldown - dt);

                if (f.koTimer > 0)
                {
                    f.koTimer = Math.max(0, f.koTimer - dt);
                    f.vx = 0;
                    f.vy = 0;
                    if (f.koTimer === 0)
                    {
                        f.hp = 5;
                        f.snowballs = 5;
                        f.invulnTimer = 2.0;
                        f.reloading = false;
                        // Respawn cleanly on guaranteed obstacle-free base tile
                        const safe = findSafeSpawn(grid, f.team);
                        f.x = safe.x;
                        f.y = safe.y;
                    }
                    continue;
                }

                // Instant refill when stepping onto snow pile or next to Snowball Machine
                if (f.snowballs < 5)
                {
                    const pileIdx = eng.piles.findIndex(p => Math.hypot(p.x - f.x, p.y - f.y) < 0.85);
                    if (pileIdx >= 0)
                    {
                        f.snowballs = 5;
                        f.reloading = false;
                        eng.piles.splice(pileIdx, 1);
                        if (f.isHuman) audioRef.current.playReload();
                        eng.popups.push({ x: f.x, y: f.y, text: '❄ +5 Bolas', color: '#1b82c9', life: 1.0, maxLife: 1.0 });
                    }
                    else if (Math.hypot(machine.x - f.x, machine.y - f.y) < 1.35)
                    {
                        f.snowballs = 5;
                        f.reloading = false;
                        if (f.isHuman) audioRef.current.playReload();
                    }
                }

                // Crouch reload
                if (f.reloading)
                {
                    f.vx = 0;
                    f.vy = 0;
                    f.reloadTimer -= dt;
                    if (f.reloadTimer <= 0)
                    {
                        f.snowballs = Math.min(5, f.snowballs + 1);
                        if (f.isHuman) audioRef.current.playReload();
                        if (f.snowballs >= 5) f.reloading = false;
                        else f.reloadTimer = 0.52;
                    }
                    continue;
                }

                if (f.isHuman)
                {
                    // Keyboard movement in isometric screen directions
                    let screenDx = 0;
                    let screenDy = 0;
                    const keys = keysRef.current;
                    if (keys.has('w') || keys.has('arrowup')) screenDy -= 1;
                    if (keys.has('s') || keys.has('arrowdown')) screenDy += 1;
                    if (keys.has('a') || keys.has('arrowleft')) screenDx -= 1;
                    if (keys.has('d') || keys.has('arrowright')) screenDx += 1;

                    if (screenDx !== 0 || screenDy !== 0)
                    {
                        f.targetX = null;
                        f.targetY = null;
                        // Convert screen direction to iso grid direction
                        const gxDir = screenDx + screenDy;
                        const gyDir = screenDy - screenDx;
                        moveFighterWithSlide(f, gxDir, gyDir, dt, 3.6, grid);
                    }
                    else if (f.targetX !== null && f.targetY !== null)
                    {
                        const dx = f.targetX - f.x;
                        const dy = f.targetY - f.y;
                        if (Math.hypot(dx, dy) < 0.14)
                        {
                            f.targetX = null;
                            f.targetY = null;
                            f.vx = 0;
                            f.vy = 0;
                        }
                        else
                        {
                            const moved = moveFighterWithSlide(f, dx, dy, dt, 3.6, grid);
                            if (!moved) { f.targetX = null; f.targetY = null; }
                        }
                    }
                    else
                    {
                        f.vx = 0;
                        f.vy = 0;
                    }
                }
                else
                {
                    // Smart, lively Bot AI
                    f.aiThinkTimer -= dt;
                    const enemies = eng.fighters.filter(o => o.team !== f.team && o.koTimer <= 0);
                    let nearestEnemy: Fighter | null = null;
                    let nearestDist = 999;
                    for (const e of enemies)
                    {
                        const d = Math.hypot(e.x - f.x, e.y - f.y);
                        if (d < nearestDist) { nearestDist = d; nearestEnemy = e; }
                    }

                    if (f.snowballs <= 0)
                    {
                        f.reloading = true;
                        f.reloadTimer = 0.6;
                        continue;
                    }

                    if (f.aiThinkTimer <= 0)
                    {
                        f.aiThinkTimer = 0.65 + Math.random() * 0.85;
                        // Occasional tactical callout
                        if (Math.random() < 0.035 && eng.chats.length < 4)
                        {
                            eng.chats.push({
                                id: eng.nextChatId++,
                                fighterId: f.id,
                                name: f.name,
                                figure: f.figure,
                                team: f.team,
                                text: BOT_CHAT_LINES[Math.floor(Math.random() * BOT_CHAT_LINES.length)],
                                life: 3.4
                            });
                        }

                        if (f.snowballs <= 1 && eng.piles.length > 0)
                        {
                            f.aiGoalX = eng.piles[0].x;
                            f.aiGoalY = eng.piles[0].y;
                        }
                        else if (nearestEnemy)
                        {
                            // Strafe at comfortable throwing range (3.5..5.5 tiles)
                            const ang = Math.atan2(f.y - nearestEnemy.y, f.x - nearestEnemy.x) + (Math.random() - 0.5) * 1.4;
                            const desiredR = 3.8 + Math.random() * 1.8;
                            const gx = Math.max(1.2, Math.min(GRID_SIZE - 1.2, nearestEnemy.x + Math.cos(ang) * desiredR));
                            const gy = Math.max(1.2, Math.min(GRID_SIZE - 1.2, nearestEnemy.y + Math.sin(ang) * desiredR));
                            f.aiGoalX = gx;
                            f.aiGoalY = gy;
                        }
                        else
                        {
                            f.aiGoalX = 3 + Math.random() * 10;
                            f.aiGoalY = 3 + Math.random() * 10;
                        }
                    }

                    moveFighterWithSlide(f, f.aiGoalX - f.x, f.aiGoalY - f.y, dt, 2.55, grid);

                    if (nearestEnemy && nearestDist < 6.4 && f.throwCooldown <= 0 && Math.random() < dt * 2.1)
                    {
                        const useLob = nearestDist > 4.2 && Math.random() < 0.35;
                        const aimJitter = (Math.random() - 0.5) * 0.65;
                        throwBall(eng, f, nearestEnemy.x + aimJitter, nearestEnemy.y + aimJitter, useLob);
                    }
                }
            }

            // Update projectiles & collisions
            for (let i = eng.projectiles.length - 1; i >= 0; i--)
            {
                const p = eng.projectiles[i];
                p.progress += dt / p.duration;
                const t = Math.min(1, p.progress);
                const cx = p.sx + (p.tx - p.sx) * t;
                const cy = p.sy + (p.ty - p.sy) * t;

                let remove = false;

                // 1. Check fighter hit FIRST (so enemies peeking beside trees/bunkers take hits fairly!)
                if (!p.isLob || t >= 0.85)
                {
                    const hitRadius = p.isLob ? 0.90 : 0.68;
                    for (const target of eng.fighters)
                    {
                        if (target.team === p.team || target.koTimer > 0 || target.invulnTimer > 0) continue;
                        if (Math.hypot(target.x - cx, target.y - cy) < hitRadius)
                        {
                            target.hp = Math.max(0, target.hp - 1);
                            target.hitAnimTimer = 0.25;
                            target.reloading = false;
                            spawnSplash(eng, target.x, target.y, 14, '#ffffff');

                            const shooter = eng.fighters.find(f => f.id === p.ownerId);
                            if (shooter)
                            {
                                shooter.hits += 1;
                                shooter.score = shooter.hits + shooter.kos * 5;
                            }

                            if (target.hp <= 0)
                            {
                                target.koTimer = 3.5;
                                if (shooter)
                                {
                                    shooter.kos += 1;
                                    shooter.score = shooter.hits + shooter.kos * 5;
                                }
                                spawnSplash(eng, target.x, target.y, 24, '#e6f8ff');
                                eng.popups.push({
                                    x: target.x,
                                    y: target.y,
                                    text: '¡K.O.! +5',
                                    color: p.team === 'blue' ? '#1277d6' : '#d62824',
                                    life: 1.35,
                                    maxLife: 1.35
                                });
                                if (shooter?.isHuman || target.isHuman) audioRef.current.playKo();
                            }
                            else
                            {
                                eng.popups.push({
                                    x: target.x,
                                    y: target.y,
                                    text: '+1',
                                    color: p.team === 'blue' ? '#1277d6' : '#d62824',
                                    life: 0.9,
                                    maxLife: 0.9
                                });
                                if (shooter?.isHuman || target.isHuman) audioRef.current.playHit();
                            }

                            remove = true;
                            break;
                        }
                    }
                }

                // 2. Direct shots stop on solid obstacle cores (high-arc lobs fly right over!)
                if (!remove && !p.isLob && t > 0.08 && t < 0.96 && blocksDirectShot(grid, cx, cy))
                {
                    spawnSplash(eng, cx, cy, 8, '#dff5ff');
                    remove = true;
                }

                if (p.progress >= 1 && !remove)
                {
                    spawnSplash(eng, p.tx, p.ty, p.isLob ? 14 : 7, '#e8f8ff');
                    remove = true;
                }

                if (remove) eng.projectiles.splice(i, 1);
            }

            // Particles
            for (let i = eng.particles.length - 1; i >= 0; i--)
            {
                const pt = eng.particles[i];
                pt.life -= dt;
                if (pt.life <= 0) { eng.particles.splice(i, 1); continue; }
                pt.x += pt.vx * dt;
                pt.y += pt.vy * dt;
                pt.z = Math.max(0, pt.z + pt.vz * dt);
                pt.vz -= 160 * dt;
            }

            // Floating popups
            for (let i = eng.popups.length - 1; i >= 0; i--)
            {
                eng.popups[i].life -= dt;
                if (eng.popups[i].life <= 0) eng.popups.splice(i, 1);
            }

            // Chat bubbles
            for (let i = eng.chats.length - 1; i >= 0; i--)
            {
                eng.chats[i].life -= dt;
                if (eng.chats[i].life <= 0) eng.chats.splice(i, 1);
            }

            // Throttled React HUD sync (~8 Hz)
            hudSyncAcc += dt;
            if (hudSyncAcc >= 0.12)
            {
                hudSyncAcc = 0;
                const me = eng.fighters.find(f => f.isHuman);
                const blueScore = eng.fighters.filter(f => f.team === 'blue').reduce((s, f) => s + f.score, 0);
                const redScore = eng.fighters.filter(f => f.team === 'red').reduce((s, f) => s + f.score, 0);
                setHud({
                    timeLeft: Math.ceil(eng.timeLeft),
                    blueScore,
                    redScore,
                    myHp: me?.hp ?? 0,
                    mySnowballs: me?.snowballs ?? 0,
                    myScore: me?.score ?? 0,
                    myReloading: !!me?.reloading,
                    myKo: (me?.koTimer ?? 0) > 0
                });
            }
        };

        const drawPineTree = (sx: number, sy: number, sc: number, useBerry = false) =>
        {
            const sprite = useBerry ? spritesRef.current.berryTree : spritesRef.current.pineTree;
            if (sprite && sprite.complete && sprite.naturalWidth > 0)
            {
                // Official Habbo pixel-art snowy pine / frosted berry tree
                const targetH = (useBerry ? 88 : 82) * sc;
                const targetW = (sprite.naturalWidth / sprite.naturalHeight) * targetH;
                ctx.drawImage(sprite, sx - targetW / 2, sy - targetH + 10 * sc, targetW, targetH);
                return;
            }
            ctx.fillStyle = '#c8e4f5';
            ctx.beginPath();
            ctx.moveTo(sx, sy - 64 * sc);
            ctx.lineTo(sx - 20 * sc, sy);
            ctx.lineTo(sx + 20 * sc, sy);
            ctx.closePath();
            ctx.fill();
        };

        const drawFence = (sx: number, sy: number, sc: number) =>
        {
            const sprite = spritesRef.current.fence;
            if (sprite && sprite.complete && sprite.naturalWidth > 0)
            {
                const targetW = 54 * sc;
                const targetH = (sprite.naturalHeight / sprite.naturalWidth) * targetW;
                ctx.drawImage(sprite, sx - targetW / 2, sy - targetH + 12 * sc, targetW, targetH);
                return;
            }
            ctx.fillStyle = '#c8a66b';
            ctx.fillRect(sx - 16 * sc, sy - 18 * sc, 32 * sc, 18 * sc);
        };

        const render = () =>
        {
            const eng = engineRef.current;
            if (!eng) return;

            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const cssW = canvas.clientWidth || window.innerWidth;
            const cssH = canvas.clientHeight || window.innerHeight;
            if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr))
            {
                canvas.width = Math.round(cssW * dpr);
                canvas.height = Math.round(cssH * dpr);
            }

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.imageSmoothingEnabled = false;

            // Fit 16x16 arena comfortably inside viewport
            const mapPixelW = GRID_SIZE * TILE_W;
            const mapPixelH = GRID_SIZE * TILE_H;
            const scale = Math.min((cssW - 110) / mapPixelW, (cssH - 110) / mapPixelH, 1.38);
            eng.scale = Math.max(0.62, scale);
            eng.cameraOriginX = cssW / 2;
            eng.cameraOriginY = (cssH - mapPixelH * eng.scale) / 2 + 24 * eng.scale;

            const sc = eng.scale;

            // 1. Expansive seamless bright winter snowscape (Snowstorm_fight.png vibe)
            const bgGrad = ctx.createLinearGradient(0, 0, 0, cssH);
            bgGrad.addColorStop(0, '#dff3fe');
            bgGrad.addColorStop(0.14, '#f3fbff');
            bgGrad.addColorStop(0.32, '#fbfdff');
            bgGrad.addColorStop(1, '#ffffff');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, cssW, cssH);

            // Soft snowy rolling hills & contour lines in background
            ctx.strokeStyle = '#d3eaf7';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, cssH * 0.13);
            ctx.quadraticCurveTo(cssW * 0.24, cssH * 0.05, cssW * 0.52, cssH * 0.12);
            ctx.quadraticCurveTo(cssW * 0.78, cssH * 0.17, cssW, cssH * 0.08);
            ctx.stroke();

            // Distant background pine trees along upper snow ridge (authentic Snowstorm_fight.png depth!)
            const pineSpr = spritesRef.current.pineTree;
            if (pineSpr && pineSpr.complete && pineSpr.naturalWidth > 0)
            {
                const bgTrees = [
                    { rx: 0.12, ry: 0.11, s: 0.52 },
                    { rx: 0.20, ry: 0.16, s: 0.62 },
                    { rx: 0.27, ry: 0.12, s: 0.50 },
                    { rx: 0.39, ry: 0.18, s: 0.55 },
                    { rx: 0.44, ry: 0.15, s: 0.58 },
                    { rx: 0.58, ry: 0.11, s: 0.54 },
                    { rx: 0.72, ry: 0.14, s: 0.60 },
                    { rx: 0.79, ry: 0.16, s: 0.52 },
                    { rx: 0.87, ry: 0.12, s: 0.48 }
                ];
                ctx.save();
                ctx.globalAlpha = 0.72;
                for (const bt of bgTrees)
                {
                    const th = 72 * bt.s * sc;
                    const tw = (pineSpr.naturalWidth / pineSpr.naturalHeight) * th;
                    ctx.drawImage(pineSpr, cssW * bt.rx - tw / 2, cssH * bt.ry - th / 2, tw, th);
                }
                ctx.restore();
            }

            // Soft bottom foreground snowbanks (like Snowstorm_fight.png)
            ctx.fillStyle = '#f2f9fd';
            ctx.beginPath();
            ctx.moveTo(0, cssH * 0.84);
            ctx.quadraticCurveTo(cssW * 0.22, cssH * 0.88, cssW * 0.46, cssH);
            ctx.lineTo(0, cssH);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#c8e3f2';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = '#f2f9fd';
            ctx.beginPath();
            ctx.moveTo(cssW, cssH * 0.78);
            ctx.quadraticCurveTo(cssW * 0.84, cssH * 0.86, cssW * 0.68, cssH);
            ctx.lineTo(cssW, cssH);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 2. Floor tiles (seamless snowy ground + beveled icy moat + wooden bridges)
            const grid = eng.arena.grid;
            for (let y = 0; y < GRID_SIZE; y++)
            {
                for (let x = 0; x < GRID_SIZE; x++)
                {
                    const t = grid[y][x];
                    const p = isoToScreen(x, y, eng);
                    const hw = (TILE_W / 2) * sc;
                    const hh = (TILE_H / 2) * sc;

                    if (t === 1)
                    {
                        // Frozen icy moat with icy rim bevel
                        ctx.beginPath();
                        ctx.moveTo(p.sx, p.sy);
                        ctx.lineTo(p.sx + hw, p.sy + hh);
                        ctx.lineTo(p.sx, p.sy + hh * 2);
                        ctx.lineTo(p.sx - hw, p.sy + hh);
                        ctx.closePath();
                        const iceGrad = ctx.createLinearGradient(p.sx, p.sy, p.sx, p.sy + hh * 2);
                        iceGrad.addColorStop(0, '#c2e8fb');
                        iceGrad.addColorStop(1, '#d8f2ff');
                        ctx.fillStyle = iceGrad;
                        ctx.fill();
                        ctx.strokeStyle = '#8cc2de';
                        ctx.lineWidth = 1.1;
                        ctx.stroke();
                    }
                    else if (t === 2)
                    {
                        // Wooden bridge planks over icy moat
                        ctx.beginPath();
                        ctx.moveTo(p.sx, p.sy);
                        ctx.lineTo(p.sx + hw, p.sy + hh);
                        ctx.lineTo(p.sx, p.sy + hh * 2);
                        ctx.lineTo(p.sx - hw, p.sy + hh);
                        ctx.closePath();
                        ctx.fillStyle = '#e0b55c';
                        ctx.fill();
                        ctx.strokeStyle = '#7c5720';
                        ctx.lineWidth = 1.4;
                        ctx.stroke();

                        // Plank seam lines
                        ctx.strokeStyle = 'rgba(116, 78, 22, 0.45)';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(p.sx - hw * 0.5, p.sy + hh * 0.5);
                        ctx.lineTo(p.sx + hw * 0.5, p.sy + hh * 1.5);
                        ctx.stroke();
                    }
                    else
                    {
                        // Very soft snow tile hints (no stark checkerboard box!)
                        ctx.beginPath();
                        ctx.moveTo(p.sx, p.sy);
                        ctx.lineTo(p.sx + hw, p.sy + hh);
                        ctx.lineTo(p.sx, p.sy + hh * 2);
                        ctx.lineTo(p.sx - hw, p.sy + hh);
                        ctx.closePath();
                        ctx.fillStyle = (x + y) % 2 === 0 ? 'rgba(246, 252, 255, 0.55)' : 'rgba(235, 247, 254, 0.45)';
                        ctx.fill();
                        ctx.strokeStyle = 'rgba(182, 218, 238, 0.18)';
                        ctx.lineWidth = 0.6;
                        ctx.stroke();
                    }
                }
            }

            // Click walk marker for human
            const me = eng.fighters.find(f => f.isHuman);
            if (me && me.targetX !== null && me.targetY !== null)
            {
                const mp = isoToScreen(me.targetX, me.targetY, eng);
                ctx.strokeStyle = 'rgba(26, 134, 214, 0.7)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.ellipse(mp.sx, mp.sy, 11 * sc, 5.5 * sc, 0, 0, Math.PI * 2);
                ctx.stroke();
            }

            // 3. Depth-sorted draw queue (obstacles, snow piles, machine, fighters)
            const drawables: Array<{ depth: number; draw: () => void }> = [];

            // Static obstacles & Snowball Machine
            for (let y = 0; y < GRID_SIZE; y++)
            {
                for (let x = 0; x < GRID_SIZE; x++)
                {
                    const t = grid[y][x];
                    if (t < 3) continue;
                    const p = isoToScreen(x + 0.5, y + 0.5, eng);
                    const depth = x + y + 0.5;

                    if (t === 3)
                    {
                        const useBerry = (x + y) % 5 === 0;
                        drawables.push({ depth, draw: () => drawPineTree(p.sx, p.sy, sc, useBerry) });
                    }
                    else if (t === 4)
                    {
                        drawables.push({
                            depth,
                            draw: () =>
                            {
                                const ic = spritesRef.current.iceCube;
                                if (ic)
                                {
                                    const w = 48 * sc;
                                    const h = 46 * sc;
                                    ctx.drawImage(ic, p.sx - w / 2, p.sy - h + 11 * sc, w, h);
                                }
                                else
                                {
                                    ctx.fillStyle = '#cde9f8';
                                    ctx.fillRect(p.sx - 16 * sc, p.sy - 24 * sc, 32 * sc, 24 * sc);
                                }
                            }
                        });
                    }
                    else if (t === 5)
                    {
                        drawables.push({ depth, draw: () => drawFence(p.sx, p.sy, sc) });
                    }
                    else if (t === 6)
                    {
                        drawables.push({
                            depth: depth + 0.1,
                            draw: () =>
                            {
                                const mach = spritesRef.current.machine;
                                // Subtle glow ring showing instant refill zone
                                ctx.strokeStyle = 'rgba(56, 174, 245, 0.45)';
                                ctx.lineWidth = 2;
                                ctx.beginPath();
                                ctx.ellipse(p.sx, p.sy + 4 * sc, 34 * sc, 17 * sc, 0, 0, Math.PI * 2);
                                ctx.stroke();

                                if (mach)
                                {
                                    const w = 58 * sc;
                                    const h = 62 * sc;
                                    ctx.drawImage(mach, p.sx - w / 2, p.sy - h + 14 * sc, w, h);
                                }
                            }
                        });
                    }
                }
            }

            // Collectible snow piles
            for (const pile of eng.piles)
            {
                const p = isoToScreen(pile.x, pile.y, eng);
                drawables.push({
                    depth: pile.x + pile.y - 0.1,
                    draw: () =>
                    {
                        ctx.fillStyle = '#ffffff';
                        ctx.strokeStyle = '#89bddb';
                        ctx.lineWidth = 1.2;
                        for (const [ ox, oy ] of [ [ -5, 2 ], [ 5, 2 ], [ 0, -3 ] ])
                        {
                            ctx.beginPath();
                            ctx.arc(p.sx + ox * sc, p.sy + oy * sc, 5.5 * sc, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.stroke();
                        }
                    }
                });
            }

            // Fighters (official Snowstorm_poses.png parka + real local Habbo head!)
            for (const f of eng.fighters)
            {
                const p = isoToScreen(f.x, f.y, eng);
                drawables.push({
                    depth: f.x + f.y + 0.15,
                    draw: () =>
                    {
                        ctx.save();

                        // Spawn shield shimmer
                        if (f.invulnTimer > 0 && Math.floor(f.invulnTimer * 12) % 2 === 0)
                        {
                            ctx.globalAlpha = 0.65;
                        }

                        // Shadow
                        ctx.fillStyle = 'rgba(20, 62, 92, 0.25)';
                        ctx.beginPath();
                        ctx.ellipse(p.sx, p.sy + 2 * sc, (f.koTimer > 0 ? 22 : 13) * sc, (f.koTimer > 0 ? 9 : 6) * sc, 0, 0, Math.PI * 2);
                        ctx.fill();

                        // Team / Player highlight ring on ground
                        if (f.isHuman)
                        {
                            ctx.strokeStyle = '#ffd52e';
                            ctx.lineWidth = 2.4;
                            ctx.beginPath();
                            ctx.ellipse(p.sx, p.sy + 2 * sc, 16 * sc, 8 * sc, 0, 0, Math.PI * 2);
                            ctx.stroke();
                        }

                        // Authentic 3/4-diagonal body + smooth grounded 4-step Habbo walking (ZERO jumping/bobbing!)
                        const poses = spritesRef.current.poses;
                        const isMoving = Math.hypot(f.vx, f.vy) > 0.18;
                        const walkFrames = [ 1, 0, 2, 0 ];
                        let colIdx = 0; // 0 = 3/4 standing idle
                        if (f.koTimer > 0) colIdx = 6;
                        else if (f.hitAnimTimer > 0) colIdx = 5;
                        else if (f.throwAnimTimer > 0) colIdx = 4;
                        else if (f.reloading) colIdx = 3;
                        else if (isMoving) colIdx = walkFrames[Math.floor(f.walkPhase) % 4];
                        else if (f.facingY < 0) colIdx = 7;

                        const cellW = 60;
                        const cellH = 44;
                        const rowY = f.team === 'blue' ? 0 : 44;
                        const spriteScale = 1.2 * sc;
                        const dw = cellW * spriteScale;
                        const dh = cellH * spriteScale;

                        if (poses)
                        {
                            ctx.save();
                            ctx.translate(p.sx, p.sy + 3 * sc);
                            if (f.facingX < 0 && f.koTimer <= 0) ctx.scale(-1, 1);
                            ctx.drawImage(
                                poses,
                                colIdx * cellW, rowY, cellW, cellH,
                                -dw / 2, -dh, dw, dh
                            );
                            ctx.restore();
                        }

                        // Tightly-trimmed real Habbo head anchored by CHIN BOTTOM snugly inside the parka fur collar
                        const headEntry = headCacheRef.current.get(f.figure);
                        const headImg = (f.facingY < 0 && !isMoving && f.koTimer <= 0 && !f.reloading && f.throwAnimTimer <= 0)
                            ? headEntry?.back
                            : headEntry?.front;
                        if (headImg && headImg.complete && headImg.naturalWidth > 0 && f.koTimer <= 0)
                        {
                            const hScale = 0.66 * spriteScale;
                            const hw = headImg.naturalWidth * hScale;
                            const hh = headImg.naturalHeight * hScale;
                            const chinFromFeet = f.reloading ? 17.5 : 20.5;
                            const headAnchorX = f.reloading ? (3 * spriteScale) : (1 * spriteScale);
                            const headAnchorY = -chinFromFeet * spriteScale - hh;
                            ctx.save();
                            ctx.translate(p.sx, p.sy + 3 * sc);
                            if (f.facingX < 0) ctx.scale(-1, 1);
                            ctx.drawImage(headImg, -hw / 2 + headAnchorX, headAnchorY, hw, hh);
                            ctx.restore();
                        }

                        // Dizzy stars when K.O.'d
                        if (f.koTimer > 0)
                        {
                            const tNow = performance.now() * 0.005;
                            for (let s = 0; s < 3; s++)
                            {
                                const a = tNow + s * (Math.PI * 2 / 3);
                                const sx = p.sx + Math.cos(a) * 14 * sc;
                                const sy = p.sy - 26 * sc + Math.sin(a) * 5 * sc;
                                ctx.fillStyle = '#ffd52e';
                                ctx.strokeStyle = '#996000';
                                ctx.lineWidth = 1;
                                ctx.beginPath();
                                ctx.arc(sx, sy, 3.2 * sc, 0, Math.PI * 2);
                                ctx.fill();
                                ctx.stroke();
                            }
                        }

                        // Overhead compact name & HP bar
                        const topY = p.sy - (f.koTimer > 0 ? 36 : 64) * sc;
                        if (f.koTimer <= 0 && f.hp < 5)
                        {
                            const bw = 28 * sc;
                            const bh = 4.5 * sc;
                            ctx.fillStyle = 'rgba(0,0,0,0.55)';
                            ctx.fillRect(p.sx - bw / 2, topY - 7 * sc, bw, bh);
                            ctx.fillStyle = f.hp <= 2 ? '#ef4444' : '#65d624';
                            ctx.fillRect(p.sx - bw / 2 + 1, topY - 7 * sc + 1, (bw - 2) * (f.hp / 5), bh - 2);
                        }

                        ctx.font = `bold ${ Math.max(10, Math.round(11 * sc)) }px Ubuntu, Verdana, sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.fillStyle = 'rgba(255,255,255,0.82)';
                        const tag = f.isHuman ? `${ f.name } ★` : f.name;
                        const tw = ctx.measureText(tag).width + 8;
                        ctx.fillRect(p.sx - tw / 2, topY - 20 * sc, tw, 13 * sc);
                        ctx.fillStyle = f.team === 'blue' ? '#125a94' : '#a8221e';
                        ctx.fillText(tag, p.sx, topY - 10 * sc);

                        ctx.restore();
                    }
                });
            }

            drawables.sort((a, b) => a.depth - b.depth);
            for (const d of drawables) d.draw();

            // 4. Flying snowballs (with ground shadow + parabolic arc)
            for (const pr of eng.projectiles)
            {
                const t = Math.min(1, pr.progress);
                const cx = pr.sx + (pr.tx - pr.sx) * t;
                const cy = pr.sy + (pr.ty - pr.sy) * t;
                const pos = isoToScreen(cx, cy, eng);
                const arc = Math.sin(t * Math.PI) * pr.arcHeight * sc;

                // Shadow
                ctx.fillStyle = 'rgba(20, 62, 92, 0.25)';
                ctx.beginPath();
                ctx.ellipse(pos.sx, pos.sy, 6 * sc, 3 * sc, 0, 0, Math.PI * 2);
                ctx.fill();

                // Snowball sprite
                const sb = spritesRef.current.snowball;
                const sz = (pr.isLob ? 16 : 12) * sc;
                if (sb)
                {
                    ctx.drawImage(sb, pos.sx - sz / 2, pos.sy - 14 * sc - arc - sz / 2, sz, sz);
                }
                else
                {
                    ctx.fillStyle = '#ffffff';
                    ctx.strokeStyle = '#5a94ba';
                    ctx.lineWidth = 1.4;
                    ctx.beginPath();
                    ctx.arc(pos.sx, pos.sy - 14 * sc - arc, sz / 2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                }
            }

            // 5. Snow splash particles
            for (const pt of eng.particles)
            {
                const pos = isoToScreen(pt.x, pt.y, eng);
                ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
                ctx.fillStyle = pt.color;
                ctx.beginPath();
                ctx.arc(pos.sx, pos.sy - pt.z * sc, pt.size * sc, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;

            // 6. Floating combat score popups (+1 / ¡K.O.! +5)
            for (const pop of eng.popups)
            {
                const pos = isoToScreen(pop.x, pop.y, eng);
                const lift = (1 - pop.life / pop.maxLife) * 38 * sc;
                ctx.save();
                ctx.globalAlpha = Math.min(1, (pop.life / pop.maxLife) * 1.4);
                ctx.font = `900 ${ Math.round(15 * sc) }px Ubuntu, Verdana, sans-serif`;
                ctx.textAlign = 'center';
                ctx.lineWidth = 3;
                ctx.strokeStyle = '#ffffff';
                ctx.strokeText(pop.text, pos.sx, pos.sy - 56 * sc - lift);
                ctx.fillStyle = pop.color;
                ctx.fillText(pop.text, pos.sx, pos.sy - 56 * sc - lift);
                ctx.restore();
            }

            // 7. Authentic Habbo team-colored speech bubbles with mini head icon (Snowstorm_fight.png)
            for (const ch of eng.chats)
            {
                const speaker = eng.fighters.find(f => f.id === ch.fighterId);
                if (!speaker) continue;
                const pos = isoToScreen(speaker.x, speaker.y, eng);
                const namePart = `${ ch.name }: `;
                const msgPart = ch.text;
                ctx.save();
                ctx.font = 'bold 12px Ubuntu, Verdana, sans-serif';
                const nameW = ctx.measureText(namePart).width;
                ctx.font = '12px Ubuntu, Verdana, sans-serif';
                const msgW = ctx.measureText(msgPart).width;
                const headPad = 30;
                const bw = headPad + nameW + msgW + 14;
                const bh = 26;
                const bx = Math.max(70, Math.min(cssW - bw - 16, pos.sx - bw / 2));
                const by = Math.max(58, pos.sy - 96 * sc);

                ctx.fillStyle = ch.team === 'blue' ? '#cde9fc' : '#f7b8b6';
                ctx.strokeStyle = '#1b2c38';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.roundRect(bx, by, bw, bh, 7);
                ctx.fill();
                ctx.stroke();

                // Crisp full-size tightly-trimmed avatar head inside left side of speech bubble
                const chHead = headCacheRef.current.get(ch.figure)?.front;
                if (chHead && chHead.complete && chHead.naturalWidth > 0)
                {
                    const mh = 23;
                    const mw = (chHead.naturalWidth / chHead.naturalHeight) * mh;
                    ctx.drawImage(chHead, bx + 4, by + (bh - mh) / 2 - 1, mw, mh);
                }

                ctx.fillStyle = '#142029';
                ctx.textAlign = 'left';
                ctx.font = 'bold 12px Ubuntu, Verdana, sans-serif';
                ctx.fillText(namePart, bx + headPad, by + 17);
                ctx.font = '12px Ubuntu, Verdana, sans-serif';
                ctx.fillText(msgPart, bx + headPad + nameW, by + 17);
                ctx.restore();
            }
        };

        // Render first frame synchronously to avoid blank/partial GPU tile on mount
        render();

        const loop = (now: number) =>
        {
            const dt = Math.min(0.05, (now - lastTime) / 1000);
            lastTime = now;
            if (!showLeaveModal) update(dt);
            render();
            rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);

        return () =>
        {
            cancelAnimationFrame(rafId);
            canvas.removeEventListener('mousedown', handlePointerDown);
            canvas.removeEventListener('contextmenu', handleContextMenu);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            keysRef.current.clear();
        };
    }, [ stage, showLeaveModal, handleFinishMatch, triggerHumanReload ]);

    const formatTime = (sec: number) =>
    {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${ String(m).padStart(2, '0') }:${ String(s).padStart(2, '0') }`;
    };

    const renderStars = (count: number) =>
    {
        const stars = [];
        for (let i = 0; i < 10; i++)
        {
            stars.push(<span key={ i } className={ i < count ? '' : 'star-empty' }>★</span>);
        }
        return <div className="ss-stars-row">{ stars }</div>;
    };

    // Derived post-match MVPs
    const mvpKo = useMemo(() =>
    {
        if (!finalFighters.length) return null;
        return [ ...finalFighters ].sort((a, b) => b.kos - a.kos || b.score - a.score)[0];
    }, [ finalFighters ]);

    const mvpHits = useMemo(() =>
    {
        if (!finalFighters.length) return null;
        return [ ...finalFighters ].sort((a, b) => b.hits - a.hits || b.score - a.score)[0];
    }, [ finalFighters ]);

    const topBlue = useMemo(() =>
        finalFighters.filter(f => f.team === 'blue').sort((a, b) => b.score - a.score)[0],
    [ finalFighters ]);
    const topRed = useMemo(() =>
        finalFighters.filter(f => f.team === 'red').sort((a, b) => b.score - a.score)[0],
    [ finalFighters ]);

    return (
        <div className="snowstorm-game-root">
            {/* ============================================================
                STAGE A: TEAM ROSTER & ARENA SELECTOR (Snowstom_second_lobby)
               ============================================================ */}
            { stage === 'lobby' && (
                <div
                    className="ss-horizon-screen"
                    style={{ backgroundImage: `url(${ ssHorizonBgImg })` }}
                >
                    <div className="ss-horizon-content">
                        <div className="ss-banner-header">
                            <div className="ss-mitten-badge">
                                <img src={ hudMittenBlueImg } alt="Equipo Azul" />
                            </div>
                            <img src={ snowstormLogoImg } alt="SNOW STORM" className="ss-logo-img" />
                            <div className="ss-mitten-badge is-red">
                                <img src={ hudMittenRedImg } alt="Equipo Rojo" />
                            </div>
                        </div>

                        <div className="ss-countdown-headline">
                            ¡{ lobbyCountdown } segundos para la tormenta!
                        </div>

                        <div className="ss-teams-grid">
                            {/* Blue Team */}
                            <div className="ss-team-column">
                                { rosterBlue.map(p => (
                                    <div key={ p.id } className="ss-roster-card">
                                        <div className={ `ss-avatar-box is-blue ${ p.isHuman ? 'is-me' : '' }` }>
                                            <SnowStormParkaAvatar figure={ p.figure } team="blue" scale={ 0.92 } />
                                        </div>
                                        <div className={ `ss-player-plate is-blue ${ p.isHuman ? 'is-me' : '' }` }>
                                            <div className="ss-plate-name">
                                                <span>{ p.name }</span>
                                                { p.isHuman && <span className="ss-me-tag">TÚ</span> }
                                            </div>
                                            <div className="ss-plate-body">{ renderStars(p.stars) }</div>
                                        </div>
                                        <div className="ss-snowball-slot" />
                                    </div>
                                )) }
                            </div>

                            {/* Center Random Arena Preview (authentic Snowstom_second_lobby.png) */}
                            <div className="ss-arena-picker">
                                <div className="ss-arena-preview">
                                    <img src={ selectedArena.preview } alt={ selectedArena.name } />
                                </div>
                                <div className="ss-arena-name">{ selectedArena.name }</div>
                            </div>

                            {/* Red Team */}
                            <div className="ss-team-column">
                                { rosterRed.map(p => (
                                    <div key={ p.id } className="ss-roster-card is-red">
                                        <div className="ss-avatar-box is-red">
                                            <SnowStormParkaAvatar figure={ p.figure } team="red" facing="left" scale={ 0.92 } />
                                        </div>
                                        <div className="ss-player-plate is-red">
                                            <div className="ss-plate-name">
                                                <span>{ p.name }</span>
                                            </div>
                                            <div className="ss-plate-body">{ renderStars(p.stars) }</div>
                                        </div>
                                        <div className="ss-snowball-slot is-red" />
                                    </div>
                                )) }
                            </div>
                        </div>

                        <div className="ss-controls-tip">
                            <b>Controles:</b> Clic en el suelo o <b>WASD</b> para moverte • <b>Clic en un rival</b> para lanzar • <b>SHIFT + Clic</b> tiro predictivo • <b>Clic derecho / CTRL + Clic</b> lanzamiento alto sobre obstáculos • <b>Espacio</b> o guante verde para recargar • <b>Enter</b> para chatear.
                        </div>

                        <button type="button" className="ss-text-link" onClick={ () => exitToLobby(false) }>
                            ◄ ¿Salir del juego?
                        </button>
                    </div>
                </div>
            ) }

            {/* ============================================================
                STAGE B: ISOMETRIC SNOWSTORM BATTLE ARENA (Snowstorm_fight)
               ============================================================ */}
            { stage === 'playing' && (
                <div className="ss-arena-wrapper">
                    <canvas ref={ canvasRef } className="ss-arena-canvas" />

                    {/* Top-Left Official Orange White-Flag Leave Button + Crisp SVG Sound Toggle */}
                    <div className="ss-hud-top-left">
                        <button
                            type="button"
                            className="ss-flag-img-btn"
                            title="Abandonar partida"
                            onClick={ () => setShowLeaveModal(true) }
                        >
                            <img src={ hudBtnLeaveImg } alt="Abandonar partida" />
                        </button>
                        <button
                            type="button"
                            className="ss-audio-btn"
                            title={ muted ? 'Activar sonido' : 'Silenciar' }
                            onClick={ toggleMute }
                        >
                            { muted ? (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
                                    <line x1="23" y1="9" x2="17" y2="15" />
                                    <line x1="17" y1="9" x2="23" y2="15" />
                                </svg>
                            ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
                                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                                </svg>
                            ) }
                        </button>
                    </div>

                    {/* Top-Right Official Blue/Red Mittens Holding Snowballs + 02:00 Timer */}
                    <div className="ss-hud-top-right">
                        <div className="ss-hud-mittens">
                            <div className="ss-hud-mitten">
                                <img src={ hudMittenBlueImg } alt="Azul" />
                                <span>{ hud.blueScore }</span>
                            </div>
                            <div className="ss-hud-mitten is-red">
                                <img src={ hudMittenRedImg } alt="Rojo" />
                                <span>{ hud.redScore }</span>
                            </div>
                        </div>
                        <div className={ `ss-hud-timer ${ hud.timeLeft <= 15 ? 'is-urgent' : '' }` }>
                            { formatTime(hud.timeLeft) }
                        </div>
                    </div>

                    {/* Left Vertical 5-Snowball Rack + Official Green Mitten Reload */}
                    <div className="ss-hud-snowballs">
                        <div className="ss-snowball-rack" title="Bolas de nieve (máx. 5)">
                            { [ 4, 3, 2, 1, 0 ].map(slot => (
                                <div key={ slot } className="ss-rack-slot">
                                    { hud.mySnowballs > slot && (
                                        <div className="ss-rack-ball" />
                                    ) }
                                </div>
                            )) }
                        </div>
                        <button
                            type="button"
                            className={ `ss-reload-img-btn ${ hud.myReloading ? 'is-reloading' : '' }` }
                            title="Hacer bolas de nieve (Espacio)"
                            onClick={ triggerHumanReload }
                        >
                            <img src={ hudBtnReloadImg } alt="Recargar bolas de nieve" />
                        </button>
                    </div>

                    {/* Bottom-Left Player Head + Green HP Bar + Score Circle */}
                    <div className="ss-hud-bottom-left">
                        <div className="ss-hud-my-head">
                            <HabboHeadImg figure={ myFigure } direction={ 2 } size={ 38 } />
                        </div>
                        <div className="ss-hud-hp-bar" title={ `Salud: ${ hud.myHp * 20 }%` }>
                            <div
                                className={ `ss-hud-hp-fill ${ hud.myHp <= 2 ? 'low' : '' }` }
                                style={{ height: `${ (hud.myHp / 5) * 100 }%` }}
                            />
                        </div>
                        <div className="ss-hud-score-circle" title="Tu puntuación">
                            { hud.myScore }
                        </div>
                    </div>

                    {/* Bottom-Center Quick Chat & Controls Hint */}
                    <div className="ss-hud-bottom-center">
                        { chatOpen && (
                            <form className="ss-chat-form" onSubmit={ handleChatSubmit }>
                                <input
                                    ref={ chatInputRef }
                                    type="text"
                                    maxLength={ 64 }
                                    placeholder="Escribe un mensaje en la arena..."
                                    value={ chatText }
                                    onKeyDown={ e => e.stopPropagation() }
                                    onChange={ e => setChatText(e.target.value) }
                                />
                                <button type="submit">Enviar</button>
                            </form>
                        ) }
                        <div className="ss-controls-bar">
                            { hud.myKo
                                ? '❄ ¡K.O.! Volverás a la batalla en un momento...'
                                : hud.myReloading
                                    ? 'Fabricando bolas de nieve...'
                                    : 'Clic / WASD: Mover • Clic rival: Tirar • Clic der./CTRL: Tiro alto • Espacio: Recargar • Enter: Chat' }
                        </div>
                    </div>

                    {/* Authentic Habbo Flash 2012 Leave Match Confirmation Dialog */}
                    { showLeaveModal && (
                        <div className="ss-modal-backdrop">
                            <div className="ss-leave-modal">
                                <div className="ss-leave-header">
                                    <span className="ss-leave-lines" />
                                    <span className="ss-leave-title">¿Salir de la partida?</span>
                                    <span className="ss-leave-lines" />
                                    <button
                                        type="button"
                                        className="ss-leave-close"
                                        title="Cerrar"
                                        onClick={ () => setShowLeaveModal(false) }
                                    >
                                        <img src={ closeUbuntuImg } alt="Cerrar" />
                                    </button>
                                </div>
                                <div className="ss-leave-body">
                                    <img src={ hudBtnLeaveImg } alt="" className="ss-leave-flag-icon" />
                                    <div>
                                        Si abandonas la partida de <b>SnowStorm</b> ahora, perderás los puntos acumulados y tendrás una penalización de <b>2 minutos</b> antes de poder entrar en otra batalla.
                                    </div>
                                </div>
                                <div className="ss-leave-actions">
                                    <button
                                        type="button"
                                        className="ss-btn-secondary"
                                        onClick={ () => setShowLeaveModal(false) }
                                    >
                                        Seguir jugando
                                    </button>
                                    <button
                                        type="button"
                                        className="ss-btn-danger"
                                        onClick={ () => exitToLobby(true) }
                                    >
                                        Abandonar
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) }
                </div>
            ) }

            {/* ============================================================
                STAGE C: POST-MATCH SCOREBOARD & REAL REWARDS
               ============================================================ */}
            { stage === 'results' && (
                <div
                    className="ss-horizon-screen"
                    style={{ backgroundImage: `url(${ ssHorizonBgImg })` }}
                >
                    <div className="ss-horizon-content">
                        <div className="ss-banner-header">
                            <div className="ss-mitten-badge">
                                <img src={ hudMittenBlueImg } alt="Azul" />
                                <span className="ss-mitten-score">{ finalBlueScore }</span>
                            </div>
                            <img src={ snowstormLogoImg } alt="SNOW STORM" className="ss-logo-img" />
                            <div className="ss-mitten-badge is-red">
                                <img src={ hudMittenRedImg } alt="Rojo" />
                                <span className="ss-mitten-score">{ finalRedScore }</span>
                            </div>
                        </div>

                        <div className={ `ss-countdown-headline ${ finalBlueScore > finalRedScore ? 'win-blue' : finalRedScore > finalBlueScore ? 'win-red' : 'win-draw' }` }>
                            { finalBlueScore > finalRedScore
                                ? '¡El Equipo Azul gana!'
                                : finalRedScore > finalBlueScore
                                    ? '¡El Equipo Rojo gana!'
                                    : '¡Empate en la tormenta!' }
                        </div>

                        <div className="ss-teams-grid">
                            {/* Blue Team Final Cards */}
                            <div className="ss-team-column">
                                { finalFighters
                                    .filter(f => f.team === 'blue')
                                    .sort((a, b) => b.score - a.score)
                                    .map(p => (
                                        <div key={ p.id } className="ss-roster-card">
                                            <div className={ `ss-avatar-box is-blue ${ p.isHuman ? 'is-me' : '' }` }>
                                                <SnowStormParkaAvatar figure={ p.figure } team="blue" scale={ 0.92 } />
                                            </div>
                                            <div className={ `ss-player-plate is-blue ${ p.isHuman ? 'is-me' : '' }` }>
                                                <div className="ss-plate-name">
                                                    <span>{ p.name }</span>
                                                    { p.isHuman && <span className="ss-me-tag">TÚ</span> }
                                                </div>
                                                <div className="ss-plate-body">
                                                    <div className="ss-score-stat-line"><span>IMPACTOS:</span><span>{ p.hits }</span></div>
                                                    <div className="ss-score-stat-line"><span>K.O.s:</span><span>{ p.kos }</span></div>
                                                </div>
                                            </div>
                                            <div className={ `ss-snowball-slot ${ topBlue?.id === p.id && p.score > 0 ? 'is-mvp' : '' }` }>
                                                { p.score }
                                            </div>
                                        </div>
                                    )) }
                            </div>

                            {/* Center MVPs (Most K.O.'s & Most Hits) */}
                            <div className="ss-mvp-center">
                                <div className="ss-mvp-row">
                                    { mvpKo && (
                                        <div className="ss-mvp-box">
                                            <div className="ss-mvp-label">Más K.O.s</div>
                                            <div className={ `ss-mvp-avatar ${ mvpKo.team === 'blue' ? 'is-blue' : '' }` }>
                                                <SnowStormParkaAvatar figure={ mvpKo.figure } team={ mvpKo.team } facing="right" scale={ 1.04 } />
                                            </div>
                                            <div className={ `ss-mvp-user ${ mvpKo.team === 'blue' ? 'is-blue' : '' }` }>
                                                { mvpKo.name } ({ mvpKo.kos })
                                            </div>
                                        </div>
                                    ) }
                                    { mvpHits && (
                                        <div className="ss-mvp-box">
                                            <div className="ss-mvp-label">Más Impactos</div>
                                            <div className={ `ss-mvp-avatar ${ mvpHits.team === 'blue' ? 'is-blue' : '' }` }>
                                                <SnowStormParkaAvatar figure={ mvpHits.figure } team={ mvpHits.team } facing="left" scale={ 1.04 } />
                                            </div>
                                            <div className={ `ss-mvp-user ${ mvpHits.team === 'blue' ? 'is-blue' : '' }` }>
                                                { mvpHits.name } ({ mvpHits.hits })
                                            </div>
                                        </div>
                                    ) }
                                </div>
                            </div>

                            {/* Red Team Final Cards */}
                            <div className="ss-team-column">
                                { finalFighters
                                    .filter(f => f.team === 'red')
                                    .sort((a, b) => b.score - a.score)
                                    .map(p => (
                                        <div key={ p.id } className="ss-roster-card is-red">
                                            <div className="ss-avatar-box is-red">
                                                <SnowStormParkaAvatar figure={ p.figure } team="red" facing="left" scale={ 0.92 } />
                                            </div>
                                            <div className="ss-player-plate is-red">
                                                <div className="ss-plate-name">
                                                    <span>{ p.name }</span>
                                                </div>
                                                <div className="ss-plate-body">
                                                    <div className="ss-score-stat-line"><span>IMPACTOS:</span><span>{ p.hits }</span></div>
                                                    <div className="ss-score-stat-line"><span>K.O.s:</span><span>{ p.kos }</span></div>
                                                </div>
                                            </div>
                                            <div className={ `ss-snowball-slot is-red ${ topRed?.id === p.id && p.score > 0 ? 'is-mvp' : '' }` }>
                                                { p.score }
                                            </div>
                                        </div>
                                    )) }
                            </div>
                        </div>

                        {/* Authentic Habbo Inline Rewards & Real Pixel-Art Badges */}
                        { finishData?.rewards ? (
                            <div className="ss-rewards-strip">
                                <div className="ss-rewards-currencies">
                                    <span className="ss-reward-stat">
                                        <img src={ snowballSmallImg } alt="Puntos" className="ss-reward-icon" />
                                        <span className="ss-reward-val">+{ finishData.rewards.score }</span>
                                        <span>pts</span>
                                    </span>
                                    <span className="ss-reward-stat is-duckets">
                                        <img src={ ducketIconImg } alt="Duckets" className="ss-reward-icon" />
                                        <span className="ss-reward-val">+{ finishData.rewards.duckets }</span>
                                        <span>Duckets</span>
                                    </span>
                                    { finishData.rewards.credits > 0 && (
                                        <span className="ss-reward-stat is-credits">
                                            <img src={ creditIconImg } alt="Créditos" className="ss-reward-icon" />
                                            <span className="ss-reward-val">+{ finishData.rewards.credits }</span>
                                            <span>Créditos</span>
                                        </span>
                                    ) }
                                </div>
                                { (finishData.unlocked_achievements && finishData.unlocked_achievements.length > 0) && (
                                    <div className="ss-badges-unlocked">
                                        { finishData.unlocked_achievements.map(a =>
                                        {
                                            const badgeTemplate = GetConfiguration<string>('badge.asset.url', '/game/swf/c_images/album1584/%badgename%.gif');
                                            const badgeSrc = badgeTemplate.replace('%badgename%', a.badge);
                                            return (
                                                <div key={ a.badge } className="ss-badge-unlock-item" title={ a.title }>
                                                    <div className="ss-badge-icon-frame">
                                                        <img src={ badgeSrc } alt={ a.title } />
                                                    </div>
                                                    <div className="ss-badge-info">
                                                        <span className="ss-badge-kicker">¡Placa desbloqueada!</span>
                                                        <span className="ss-badge-name">{ a.title }</span>
                                                    </div>
                                                </div>
                                            );
                                        }) }
                                    </div>
                                ) }
                            </div>
                        ) : (
                            <div style={{ fontSize: '12px', color: '#456a82', fontWeight: 700 }}>Registrando resultados...</div>
                        ) }

                        <div className="ss-games-left-row">
                            <span>Partidas restantes hoy:</span>
                            <span className="ss-games-num">
                                { finishData?.has_unlimited ? '∞ HC' : (finishData?.games_left ?? '—') }
                            </span>
                        </div>

                        { !finishData?.has_unlimited && (
                            <button type="button" className="ss-text-link" onClick={ handleQuickBuy10 }>
                                Comprar 10 partidas (5 créditos)
                            </button>
                        ) }

                        { rematchError && (
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#a8221e' }}>{ rematchError }</div>
                        ) }

                        <button type="button" className="ss-text-link" onClick={ () => exitToLobby(false) }>
                            ◄ Salir del juego
                        </button>

                        <button
                            type="button"
                            className="ss-green-cta"
                            disabled={ rematchBusy }
                            onClick={ handleRematch }
                        >
                            { rematchBusy ? 'Preparando...' : `Revancha (${ rematchCountdown })` }
                        </button>
                    </div>
                </div>
            ) }
        </div>
    );
};

