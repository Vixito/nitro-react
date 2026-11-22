import { AvatarAction, AvatarScaleType, AvatarSetType } from '@nitrots/nitro-renderer';
import { FC, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GetAvatarRenderManager, GetClubMemberLevel, GetConfiguration, GetSessionDataManager, onShockwaveSmallAtlasReady, renderShockwaveSmallDataUrl } from '../../../api';
import { useGameCenter, useGamePresence } from '../../../hooks';
import { HabboHeadImg, trimTransparentImage } from './SnowStormAvatar';
import { MobileJoystick } from '../../mobile/MobileJoystick';

import creditIconImg from '../../../assets/images/eras/flash2012/purse/credit_icon.png';
import ducketIconImg from '../../../assets/images/eras/flash2012/purse/ducket_icon.png';
import clubClipboardImg from '../../../assets/images/eras/shockwave_v14/club_clipboard.png';
import bbArena0WideImg from '../../../assets/images/gamecenter/battleball/bb_arena_0_wide.png';
import bbArena2WideImg from '../../../assets/images/gamecenter/battleball/bb_arena_2_wide.png';
import bbArena3WideImg from '../../../assets/images/gamecenter/battleball/bb_arena_3_wide.png';
import bbArena4WideImg from '../../../assets/images/gamecenter/battleball/bb_arena_4_wide.png';
import bbArenaBackdropImg from '../../../assets/images/gamecenter/battleball/bb_arena_backdrop_wide.png';
import hudExitHotelImg from '../../../assets/images/gamecenter/battleball/hud_exit_hotel.png';
import hudHelpIconImg from '../../../assets/images/gamecenter/battleball/hud_help_icon.png';
import hudMarqueeTileImg from '../../../assets/images/gamecenter/battleball/hud_marquee_tile.png';
import hudMusicIconImg from '../../../assets/images/gamecenter/battleball/hud_music_icon.png';
import hudNoPowerupImg from '../../../assets/images/gamecenter/battleball/hud_no_powerup.png';
import hudSfxIconImg from '../../../assets/images/gamecenter/battleball/hud_sfx_icon.png';
import puBombImg from '../../../assets/images/gamecenter/battleball/pu_bomb.png';
import puCannonImg from '../../../assets/images/gamecenter/battleball/pu_cannon.png';
import puDrillImg from '../../../assets/images/gamecenter/battleball/pu_drill.png';
import puFlashlightImg from '../../../assets/images/gamecenter/battleball/pu_flashlight.png';
import puLightbulbImg from '../../../assets/images/gamecenter/battleball/pu_lightbulb.png';
import puPinsImg from '../../../assets/images/gamecenter/battleball/pu_pins.png';
import puSpringImg from '../../../assets/images/gamecenter/battleball/pu_spring.png';

import './BattleBallGameView.scss';

type Stage = 'lobby' | 'playing' | 'results';
type Team = 'red' | 'blue' | 'green' | 'yellow';
type PowerUpKind = 'bomb' | 'spring' | 'flashlight' | 'lightbulb' | 'cannon' | 'pins' | 'drill';

interface TileState
{
    walkable: boolean;
    colorable: boolean; // false on stone stairs!
    z: number; // height in 16px units (-2..+2)
    team: Team | null;
    level: 0 | 1 | 2 | 3; // 3 = LOCKED / SELLADA
    flash: number;
    pinTeam: Team | null;
    pinColor: 'red' | 'cyan' | 'yellow';
}

interface RosterMember
{
    id: string;
    name: string;
    figure: string;
    team: Team;
    isHuman?: boolean;
}

interface HopperPlayer
{
    id: string;
    name: string;
    figure: string;
    team: Team;
    isHuman: boolean;
    gx: number;
    gy: number;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    hopProgress: number; // 0..1
    hopping: boolean;
    dirX: number;
    dirY: number;
    isoDir: 0 | 2 | 4 | 6; // Real Habbo 4-way isometric riding direction!
    path: Array<[ number, number ]>;
    heldPowerUp: PowerUpKind | null;
    springTimer: number;
    stunTimer: number;
    cannonSteps: number;
    tilesLocked: number;
    tilesStolen: number;
    powerupsUsed: number;
    score: number;
    aiTimer: number;
}

interface BoardPowerUp
{
    id: number;
    x: number;
    y: number;
    kind: PowerUpKind;
    bobPhase: number;
}

interface FloatingPopup
{
    x: number;
    y: number;
    z: number;
    text: string;
    color: string;
    life: number;
    maxLife: number;
}

interface ChatBubble
{
    id: number;
    name: string;
    team: Team;
    text: string;
    shout: boolean;
    gx: number;
    gy: number;
    z: number;
    y: number; // current vertical position drifting upward like real Habbo chat!
    life: number;
}

interface LeaderboardEntry
{
    rank: number;
    userId: number;
    username: string;
    figure: string;
    score: number;
    wins: number;
    tilesLocked: number;
    gamesPlayed: number;
}

interface HistoryRow
{
    id: number;
    arena_name: string;
    team: string;
    winner_team: string;
    score: number;
    tiles_locked: number;
    reward_duckets: number;
    reward_credits: number;
    played_at: string;
}

interface FinishResp
{
    success: boolean;
    rewards?: {
        score: number;
        duckets: number;
        credits: number;
        won: boolean;
        hc_bonus?: boolean;
    };
    unlocked_achievements?: Array<{
        badge: string;
        title: string;
        desc: string;
    }>;
    games_left?: number;
    has_unlimited?: boolean;
}

// =============================================================================
// 5 PIXEL-EXACT OFFICIAL HABBO BATTLE BALL ARENAS (Widescreen 1120x484)
// Measured directly from the 5 official Habbo Battle Ball screenshots (Bb.a.0..4)
// =============================================================================
const BG_W = 1120;
const BG_H = 484;
const TILE_W = 32;
const TILE_H = 16;
const MATCH_DURATION = 120; // 2:00 classic Battle Ball round
const PRE_MATCH_SECONDS = 4;
const YT_VIDEO_ID = 'hNqAvTN2B3s'; // Official Battle Ball track requested by user

interface ArenaConfig
{
    id: number;
    name: string;
    backdropImg: string;
    bgColor: string;
    originX: number;
    originY: number;
    centerX: number;
    rows: string[];
    spawns: Record<Team, Array<[ number, number ]>>;
}

// Tile codes:
// '.' = void, '0' = mid floor (z=0), '+' = upper plateau (z=+2), '-' = lower plateau (z=-2)
// '1' = raised floor (z=+1), 'n' = lowered floor (z=-1)
// 's' = flat bridge/stairs (z=0), 'a' = stair z=+0.67, 'm' = stair z=+1.0, 'b' = stair z=+1.33,
// 'c' = stair z=-0.67, 'd' = stair z=-1.33
const ARENAS: ArenaConfig[] = [
    {
        id: 1,
        name: 'Escenario Clásico',
        backdropImg: bbArena0WideImg,
        bgColor: '#000000',
        originX: 560,
        originY: 121,
        centerX: 560,
        rows: [
            '....000000000000000....',
            '....000000000000000....',
            '....000000000000000....',
            '....000000000000000....',
            '00000000000000000000000',
            '00000000000000000000000',
            '00000000000000000000000',
            '00000000000000000000000',
            '00000000000000000000000',
            '00000000000000000000000',
            '00000000000000000000000',
            '00000000000000000000000',
            '00000000000000000000000',
            '00000000000000000000000',
            '00000000000000000000000',
            '00000000000000000000000',
            '00000000000000000000000',
            '00000000000000000000000',
            '00000000000000000000000',
            '....000000000000000....',
            '....000000000000000....',
            '....000000000000000....',
            '....000000000000000....'
        ],
        spawns: {
            red: [ [ 1, 10 ], [ 2, 12 ] ],
            blue: [ [ 10, 1 ], [ 12, 2 ] ],
            green: [ [ 10, 20 ], [ 12, 21 ] ],
            yellow: [ [ 20, 10 ], [ 21, 12 ] ]
        }
    },
    {
        id: 2,
        name: 'En la cima de la montaña',
        backdropImg: bbArenaBackdropImg,
        bgColor: '#6faeca',
        originX: 469,
        originY: 88,
        centerX: 472,
        rows: [
            '.............++++++.......',
            '.............++++++.......',
            '..00000000...++++++.......',
            '..00000000...++++++.......',
            '..00000000...bbbbbb.......',
            '..00000000...aaaaaa.......',
            '..000000000000000000......',
            '..000000000000000000cd----',
            '..000000000000000000cd----',
            '..000000000000000000cd----',
            '......00000000000000cd----',
            '......00000000000000cd----',
            '......00000000000000cd----',
            '++++ba00000000000000......',
            '++++ba00000000000000......',
            '++++ba00000000000000......',
            '++++ba000000000000000000..',
            '++++ba000000000000000000..',
            '++++ba000000000000000000..',
            '......000000000000000000..',
            '.......cccccc...00000000..',
            '.......dddddd...00000000..',
            '.......------...00000000..',
            '.......------...00000000..',
            '.......------.............',
            '.......------.............'
        ],
        spawns: {
            red: [ [ 1, 14 ], [ 2, 16 ] ],
            blue: [ [ 15, 1 ], [ 17, 2 ] ],
            green: [ [ 9, 23 ], [ 11, 24 ] ],
            yellow: [ [ 22, 9 ], [ 23, 11 ] ]
        }
    },
    {
        id: 3,
        name: 'Costa Soleada',
        backdropImg: bbArena2WideImg,
        bgColor: '#3782c4',
        originX: 363,
        originY: 110,
        centerX: 465,
        rows: [
            '.......00000000...00000000......',
            '.......00000000...00000000......',
            '.......00000000...00000000......',
            '.......00000000...00000000......',
            '.......00000000sss00000000......',
            '.......00000000sss00000000......',
            '.......00000000...00000000aa1111',
            '++++...00000000...00000000aa1111',
            '++++...00000000...00000000aa1111',
            '++++bma00000000...00000000..1111',
            '++++bma00000000...00000000..1111',
            '++++bma00000000...00000000..1111',
            '++++...00000000...00000000......',
            '.......00000000...00000000......',
            '.......00000000sss00000000......',
            '.......00000000sss00000000......',
            '.......00000000...00000000......',
            '.......00000000...00000000......',
            '.......00000000...00000000......',
            '.......00000000...00000000......'
        ],
        spawns: {
            red: [ [ 1, 9 ], [ 2, 11 ] ],
            blue: [ [ 10, 2 ], [ 12, 2 ] ],
            green: [ [ 20, 17 ], [ 22, 17 ] ],
            yellow: [ [ 29, 8 ], [ 30, 10 ] ]
        }
    },
    {
        id: 4,
        name: 'Laberinto del Parque',
        backdropImg: bbArena3WideImg,
        bgColor: '#4a7a2c',
        originX: 474,
        originY: 78,
        centerX: 485,
        rows: [
            '............0000.....',
            '............0000.....',
            '............0000.....',
            '............0000.....',
            '............ssss.....',
            '............ssss.....',
            '......0000000s0000000',
            '......0000000s0000000',
            '......0000000s0000000',
            '......0000000s0000000',
            '......0000..sss..0000',
            '......0000saaaaas0000',
            '0000ss0000sa111as0000',
            '0000sssssssa111asssss',
            '0000ss0000sa111as0000',
            '0000ss0000saaaaas0000',
            '......0000..sss..0000',
            '......0000000s0000000',
            '......0000000s0000000',
            '......0000000s0000000',
            '......0000000s0000000'
        ],
        spawns: {
            red: [ [ 1, 13 ], [ 2, 14 ] ],
            blue: [ [ 13, 1 ], [ 14, 2 ] ],
            green: [ [ 8, 19 ], [ 10, 19 ] ],
            yellow: [ [ 18, 18 ], [ 19, 19 ] ]
        }
    },
    {
        id: 5,
        name: 'Biblioteca Gótica',
        backdropImg: bbArena4WideImg,
        bgColor: '#2c3034',
        originX: 447,
        originY: 99,
        centerX: 485,
        rows: [
            '.....000000000000000..........',
            '.....000000000000000..........',
            '.....000000000000000..........',
            '.....000000000000000..........',
            '.....000000000000000..........',
            '....s000000000000000..........',
            '...ss000000000000000ssss0000..',
            'sssss000000000000000ssss0000..',
            'sssss000000000000000ssss0000..',
            'sss..000000000000000....0000..',
            'ss...000000000000000.....sss..',
            '00...000000000000000.....sss..',
            '000..000000000000000.....sss..',
            '0000.000000000000000...0000000',
            '0000.000000000000000...0000000',
            '0000.000000000000000...0000000',
            '0000.000000000000000...0000000',
            '0000..........................',
            '00000.........................',
            '000000........................',
            '.0000000000000000000000.......',
            '..000000000000000000000.......',
            '...00000000000000000000.......',
            '....0000000000000000000.......'
        ],
        spawns: {
            red: [ [ 1, 15 ], [ 2, 18 ] ],
            blue: [ [ 12, 2 ], [ 15, 2 ] ],
            green: [ [ 10, 21 ], [ 14, 22 ] ],
            yellow: [ [ 25, 14 ], [ 27, 15 ] ]
        }
    }
];

const TEAM_META: Record<Team, {
    label: string;
    lv1Fill: string;
    lv2Fill: string;
    lv3Border: string;
    lv3Core: string;
    hopper: string;
    hopperDark: string;
}> = {
    red: {
        label: 'Equipo Rojo',
        lv1Fill: 'rgba(218, 42, 42, 0.45)',
        lv2Fill: '#d92828',
        lv3Border: '#c91c1c',
        lv3Core: '#ffb8bc',
        hopper: '#e52c27',
        hopperDark: '#96120e'
    },
    blue: {
        label: 'Equipo Azul',
        lv1Fill: 'rgba(34, 108, 235, 0.45)',
        lv2Fill: '#246de6',
        lv3Border: '#1b55c9',
        lv3Core: '#bdd7ff',
        hopper: '#1f70eb',
        hopperDark: '#0f3f94'
    },
    green: {
        label: 'Equipo Verde',
        lv1Fill: 'rgba(36, 178, 56, 0.45)',
        lv2Fill: '#22a638',
        lv3Border: '#188229',
        lv3Core: '#bdfac5',
        hopper: '#26b83a',
        hopperDark: '#12691e'
    },
    yellow: {
        label: 'Equipo Amarillo',
        lv1Fill: 'rgba(232, 176, 14, 0.48)',
        lv2Fill: '#dba20b',
        lv3Border: '#b88202',
        lv3Core: '#fff3ad',
        hopper: '#f0b60c',
        hopperDark: '#9c7002'
    }
};

const POWERUP_META: Record<PowerUpKind, { name: string; desc: string; img: string }> = {
    spring: { name: 'Resorte', desc: 'Sella casillas en 1 solo salto durante 8s', img: puSpringImg },
    lightbulb: { name: 'Bombilla', desc: 'Sella al instante las 8 casillas alrededor', img: puLightbulbImg },
    flashlight: { name: 'Linterna', desc: 'Pinta una línea recta frente a ti', img: puFlashlightImg },
    bomb: { name: 'Bomba', desc: 'Borra un área 3×3 (¡incluso selladas!) y aturde', img: puBombImg },
    cannon: { name: 'Cañón', desc: 'Te dispara en línea recta sellando todo', img: puCannonImg },
    pins: { name: 'Chinchetas', desc: 'Suelta trampas que aturden a rivales', img: puPinsImg },
    drill: { name: 'Taladro', desc: 'Roba y convierte casillas rivales cercanas', img: puDrillImg }
};

const POWERUP_KINDS: PowerUpKind[] = [ 'spring', 'lightbulb', 'flashlight', 'bomb', 'cannon', 'pins', 'drill' ];

const BOT_MEMBERS: RosterMember[] = [
    { id: 'bb-r2', name: 'SaltoRojo', figure: 'hr-893-61.hd-180-3.ch-255-64.lg-280-110.sh-305-64', team: 'red' },
    { id: 'bb-b1', name: 'ReboteAzul', figure: 'hr-115-45.hd-180-1.ch-255-66.lg-280-110.sh-305-62', team: 'blue' },
    { id: 'bb-b2', name: 'SaltarinPro', figure: 'hr-515-33.hd-600-2.ch-635-70.lg-715-66.sh-730-62', team: 'blue' },
    { id: 'bb-g1', name: 'BolaVerde', figure: 'hr-828-61.hd-190-2.ch-215-82.lg-275-110.sh-290-82', team: 'green' },
    { id: 'bb-g2', name: 'MuelleMax', figure: 'hr-155-42.hd-205-2.ch-210-82.lg-270-82.sh-290-82', team: 'green' },
    { id: 'bb-y1', name: 'RayoDorado', figure: 'hr-540-31.hd-620-1.ch-665-92.lg-700-110.sh-725-92', team: 'yellow' },
    { id: 'bb-y2', name: 'BoteSolar', figure: 'hr-100-45.hd-195-1.ch-225-92.lg-285-92.sh-300-92', team: 'yellow' }
];

const BOT_SHOUTS = [
    '¡Al otro lado rápido!',
    '¡Cierren esa plataforma!',
    '¡Cuidado con las chinchetas!',
    '¡Sube por la escalera!',
    '¡Esa esquina es nuestra!',
    '¡Bomba en el centro!',
    '¡Vamos a sellar el centro!'
];

// Pixel-art Golden Trophy SVG (matches Habbo Origins Results Window!)
const PixelTrophySvg: FC<{ size?: number }> = ({ size = 18 }) => (
    <svg width={ size } height={ size } viewBox="0 0 16 16" shapeRendering="crispEdges">
        <rect x="4" y="1" width="8" height="1" fill="#000" />
        <rect x="2" y="2" width="2" height="4" fill="#000" />
        <rect x="12" y="2" width="2" height="4" fill="#000" />
        <rect x="3" y="2" width="10" height="6" fill="#000" />
        <rect x="4" y="2" width="8" height="5" fill="#f5c418" />
        <rect x="5" y="3" width="2" height="3" fill="#fff29c" />
        <rect x="3" y="3" width="1" height="2" fill="#f5c418" />
        <rect x="12" y="3" width="1" height="2" fill="#d49808" />
        <rect x="5" y="7" width="6" height="2" fill="#000" />
        <rect x="6" y="7" width="4" height="2" fill="#d49808" />
        <rect x="6" y="9" width="4" height="3" fill="#000" />
        <rect x="7" y="9" width="2" height="3" fill="#f5c418" />
        <rect x="4" y="12" width="8" height="3" fill="#000" />
        <rect x="5" y="13" width="6" height="1" fill="#d49808" />
    </svg>
);

// Pixel-art Pink Lollipop SVG (matches Habbo Origins runner-up icon!)
const PixelLollipopSvg: FC<{ size?: number }> = ({ size = 18 }) => (
    <svg width={ size } height={ size } viewBox="0 0 16 16" shapeRendering="crispEdges">
        <rect x="5" y="1" width="6" height="1" fill="#000" />
        <rect x="4" y="2" width="8" height="6" fill="#000" />
        <rect x="5" y="8" width="6" height="1" fill="#000" />
        <rect x="5" y="2" width="6" height="6" fill="#ff9eb5" />
        <rect x="6" y="3" width="3" height="2" fill="#ffffff" />
        <rect x="7" y="5" width="3" height="2" fill="#e65c82" />
        <rect x="7" y="9" width="2" height="6" fill="#000" />
        <rect x="7" y="9" width="1" height="5" fill="#d6b48a" />
    </svg>
);

// Classic Habbo Spiky Golden Starburst SVG behind MVP Avatar!
const MvpStarburstSvg: FC = () =>
{
    const pts = useMemo(() =>
    {
        const spikes = 24;
        const cx = 60;
        const cy = 62;
        const outerR = 54;
        const innerR = 45;
        const list: string[] = [];
        for (let i = 0; i < spikes * 2; i++)
        {
            const a = (i * Math.PI) / spikes - Math.PI / 2;
            const r = i % 2 === 0 ? outerR : innerR;
            list.push(`${ (cx + Math.cos(a) * r).toFixed(1) },${ (cy + Math.sin(a) * r).toFixed(1) }`);
        }
        return list.join(' ');
    }, []);

    return (
        <svg className="bb-mvp-starburst-svg" viewBox="0 0 120 116">
            <polygon points={ pts } fill="#ffc454" stroke="#995b00" strokeWidth="1.5" />
        </svg>
    );
};

// Full-body Habbo Avatar component (used inside MVP starburst — authentic SMALL avatar scaled up crisply!)
const HabboFullAvatarImg: FC<{ figure: string; direction?: number; className?: string }> = ({ figure, direction = 2, className }) =>
{
    const [ src, setSrc ] = useState<string>('');

    useEffect(() =>
    {
        let alive = true;
        const renderSmall = () =>
        {
            if (!alive) return;
            const raw = renderShockwaveSmallDataUrl(figure, { direction, headDirection: direction, posture: 'std' });
            if (raw)
            {
                trimTransparentImage(raw, url =>
                {
                    if (alive) setSrc(url);
                });
            }
        };
        const unsub = onShockwaveSmallAtlasReady(renderSmall);
        return () =>
        {
            alive = false;
            unsub();
        };
    }, [ figure, direction ]);

    if (!src) return null;
    return <img src={ src } alt="" className={ className } />;
};

class BattleBallAudio
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
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        return this.ctx;
    }

    public playBounce(level: number)
    {
        const ctx = this.ensure();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        const base = 220 + level * 95;
        osc.frequency.setValueAtTime(base, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(base * 1.45, ctx.currentTime + 0.08);
        g.gain.setValueAtTime(0.06, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
        osc.connect(g).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    }

    public playLock()
    {
        const ctx = this.ensure();
        if (!ctx) return;
        [ 523.25, 659.25, 783.99 ].forEach((freq, idx) =>
        {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'triangle';
            const t = ctx.currentTime + idx * 0.04;
            osc.frequency.setValueAtTime(freq, t);
            g.gain.setValueAtTime(0.075, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
            osc.connect(g).connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.15);
        });
    }

    public playFastLock()
    {
        const ctx = this.ensure();
        if (!ctx) return;
        [ 523.25, 659.25, 783.99, 1046.5 ].forEach((freq, idx) =>
        {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'square';
            const t = ctx.currentTime + idx * 0.055;
            osc.frequency.setValueAtTime(freq, t);
            g.gain.setValueAtTime(0.05, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
            osc.connect(g).connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.19);
        });
    }

    public playPowerUp()
    {
        const ctx = this.ensure();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(340, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(980, ctx.currentTime + 0.18);
        g.gain.setValueAtTime(0.055, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
        osc.connect(g).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.23);
    }

    public playBomb()
    {
        const ctx = this.ensure();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.32);
        g.gain.setValueAtTime(0.11, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.34);
        osc.connect(g).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
    }

    public playWhistle()
    {
        const ctx = this.ensure();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1450, ctx.currentTime);
        osc.frequency.setValueAtTime(1680, ctx.currentTime + 0.08);
        osc.frequency.setValueAtTime(1500, ctx.currentTime + 0.16);
        g.gain.setValueAtTime(0.06, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
        osc.connect(g).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    }
}

function buildArenaTiles(arena: ArenaConfig): { tiles: TileState[][]; totalColorable: number; gridW: number; gridH: number }
{
    let totalColorable = 0;
    const gridH = arena.rows.length;
    const gridW = arena.rows[0].length;
    const tiles: TileState[][] = [];
    for (let y = 0; y < gridH; y++)
    {
        const row: TileState[] = [];
        for (let x = 0; x < gridW; x++)
        {
            const ch = arena.rows[y][x];
            let walkable = false;
            let colorable = false;
            let z = 0;
            if (ch === '0') { walkable = true; colorable = true; z = 0; }
            else if (ch === '+') { walkable = true; colorable = true; z = 2; }
            else if (ch === '-') { walkable = true; colorable = true; z = -2; }
            else if (ch === '1') { walkable = true; colorable = true; z = 1; }
            else if (ch === 'n') { walkable = true; colorable = true; z = -1; }
            else if (ch === 's') { walkable = true; colorable = false; z = 0; }
            else if (ch === 'a') { walkable = true; colorable = false; z = 0.67; }
            else if (ch === 'm') { walkable = true; colorable = false; z = 1.0; }
            else if (ch === 'b') { walkable = true; colorable = false; z = 1.33; }
            else if (ch === 'c') { walkable = true; colorable = false; z = -0.67; }
            else if (ch === 'd') { walkable = true; colorable = false; z = -1.33; }
            if (colorable) totalColorable++;
            row.push({ walkable, colorable, z, team: null, level: 0, flash: 0, pinTeam: null, pinColor: 'red' });
        }
        tiles.push(row);
    }
    return { tiles, totalColorable, gridW, gridH };
}

function findPathBFS(
    tiles: TileState[][],
    sx: number,
    sy: number,
    tx: number,
    ty: number
): Array<[ number, number ]>
{
    const gridH = tiles.length;
    const gridW = tiles[0]?.length || 0;
    if (sx === tx && sy === ty) return [];
    if (tx < 0 || ty < 0 || tx >= gridW || ty >= gridH || !tiles[ty][tx].walkable) return [];

    const visited: boolean[][] = Array.from({ length: gridH }, () => Array(gridW).fill(false));
    const parent: Array<Array<[ number, number ] | null>> = Array.from({ length: gridH }, () => Array(gridW).fill(null));
    const q: Array<[ number, number ]> = [ [ sx, sy ] ];
    visited[sy][sx] = true;

    // 8-directional Battle Ball movement (4 orthogonal + 4 diagonal!)
    const dirs: Array<[ number, number ]> = [
        [ 1, 0 ], [ -1, 0 ], [ 0, 1 ], [ 0, -1 ],
        [ 1, 1 ], [ 1, -1 ], [ -1, 1 ], [ -1, -1 ]
    ];
    let found = false;

    while (q.length > 0)
    {
        const [ cx, cy ] = q.shift()!;
        if (cx === tx && cy === ty) { found = true; break; }
        const cz = tiles[cy][cx].z;
        for (const [ dx, dy ] of dirs)
        {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= gridW || ny >= gridH || visited[ny][nx]) continue;
            const nt = tiles[ny][nx];
            if (!nt.walkable) continue;
            // Cannot jump straight off a 2-unit cliff; must use stairs (|dz| <= 1.0)
            if (Math.abs(nt.z - cz) > 1.05) continue;
            // Diagonal corner clearance: at least one adjacent orthogonal tile must be walkable
            if (dx !== 0 && dy !== 0)
            {
                const adjA = tiles[cy]?.[nx];
                const adjB = tiles[ny]?.[cx];
                if (!(adjA?.walkable || adjB?.walkable)) continue;
            }
            visited[ny][nx] = true;
            parent[ny][nx] = [ cx, cy ];
            q.push([ nx, ny ]);
        }
    }

    if (!found) return [];
    const path: Array<[ number, number ]> = [];
    let cur: [ number, number ] | null = [ tx, ty ];
    while (cur && !(cur[0] === sx && cur[1] === sy))
    {
        path.push(cur);
        cur = parent[cur[1]][cur[0]];
    }
    path.reverse();
    return path;
}

export const BattleBallGameView: FC = () =>
{
    const { setIsBattleBallPlaying, setIsVisible } = useGameCenter();
    const { setMyGamePresence } = useGamePresence();
    const session = GetSessionDataManager();
    const myUsername = session?.userName || 'Jugador';
    const myFigure = session?.figure || 'hr-115-42.hd-195-19.ch-3030-82.lg-275-1408.sh-295-1321';

    const [ stage, setStage ] = useState<Stage>('lobby');
    const [ arenaId, setArenaId ] = useState<number>(() => Math.floor(Math.random() * ARENAS.length) + 1);
    const [ preProgress, setPreProgress ] = useState<number>(0);
    const [ musicMuted, setMusicMuted ] = useState<boolean>(false);
    const [ sfxMuted, setSfxMuted ] = useState<boolean>(false);
    const [ showLeaveModal, setShowLeaveModal ] = useState<boolean>(false);
    const [ showHelpModal, setShowHelpModal ] = useState<boolean>(false);
    const [ showLeaderboardModal, setShowLeaderboardModal ] = useState<boolean>(false);
    const [ lbTab, setLbTab ] = useState<'week' | 'all' | 'friends' | 'history'>('week');
    const [ lbEntries, setLbEntries ] = useState<LeaderboardEntry[]>([]);
    const [ historyRows, setHistoryRows ] = useState<HistoryRow[]>([]);
    const [ lbLoading, setLbLoading ] = useState<boolean>(false);

    const [ chatText, setChatText ] = useState<string>('');
    const [ chatMode, setChatMode ] = useState<'say' | 'shout'>('say');
    const [ chatModeOpen, setChatModeOpen ] = useState<boolean>(false);
    const [ hoverLabel, setHoverLabel ] = useState<string>('');
    const [ puToast, setPuToast ] = useState<{ kind: PowerUpKind; label: string } | null>(null);
    const puToastTimerRef = useRef<number | null>(null);
    const [ rematchCountdown, setRematchCountdown ] = useState<number>(22);
    const [ rematchBusy, setRematchBusy ] = useState<boolean>(false);
    const [ rematchError, setRematchError ] = useState<string | null>(null);
    const [ finishData, setFinishData ] = useState<FinishResp | null>(null);
    const [ finalPlayers, setFinalPlayers ] = useState<HopperPlayer[]>([]);
    const [ finalTeamScores, setFinalTeamScores ] = useState<Record<Team, number>>({ red: 0, blue: 0, green: 0, yellow: 0 });
    const [ gamesLeftInfo, setGamesLeftInfo ] = useState<{ gamesLeft: number; hasUnlimited: boolean }>({
        gamesLeft: 5,
        hasUnlimited: GetClubMemberLevel() > 0
    });

    const [ hud, setHud ] = useState<{
        timeLeft: number;
        scores: Record<Team, number>;
        lockPct: number;
        heldPowerUp: PowerUpKind | null;
        springLeft: number;
        stunLeft: number;
    }>({
        timeLeft: MATCH_DURATION,
        scores: { red: 0, blue: 0, green: 0, yellow: 0 },
        lockPct: 0,
        heldPowerUp: null,
        springLeft: 0,
        stunLeft: 0
    });

    const activeArena = useMemo(() => ARENAS.find(a => a.id === arenaId) || ARENAS[0], [ arenaId ]);

    const roster: RosterMember[] = useMemo(() => ([
        { id: 'human', name: myUsername, figure: myFigure, team: 'red', isHuman: true },
        ...BOT_MEMBERS
    ]), [ myUsername, myFigure ]);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const ytIframeRef = useRef<HTMLIFrameElement | null>(null);
    const chatInputRef = useRef<HTMLInputElement | null>(null);
    const audioRef = useRef<BattleBallAudio>(new BattleBallAudio());
    const keysRef = useRef<Set<string>>(new Set());
    const joyVecRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const joyPendingTapRef = useRef<{ x: number; y: number } | null>(null);

    // Preloaded assets: all 5 official arena backdrops, power-ups, and seated Habbo avatars
    const backdropImgsRef = useRef<Record<number, HTMLImageElement>>({});
    const puSpritesRef = useRef<Partial<Record<PowerUpKind, HTMLImageElement>>>({});
    const bodyCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

    const engineRef = useRef<{
        running: boolean;
        finished: boolean;
        arena: ArenaConfig;
        gridW: number;
        gridH: number;
        tiles: TileState[][];
        totalColorable: number;
        timeLeft: number;
        players: HopperPlayer[];
        powerups: BoardPowerUp[];
        popups: FloatingPopup[];
        chats: ChatBubble[];
        nextPuId: number;
        nextChatId: number;
        puSpawnTimer: number;
        viewOffsetX: number;
        viewOffsetY: number;
        viewScale: number;
    } | null>(null);

    // Live presence ("está jugando un juego BATTLE BALL") + blur hotel chat focus
    useEffect(() =>
    {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        setMyGamePresence('battleball', 'BATTLE BALL');
        fetch('/api/games/battleball/status', { credentials: 'include' })
            .then(r => r.ok ? r.json() : null)
            .then(d =>
            {
                if (d?.success)
                {
                    setGamesLeftInfo({
                        gamesLeft: typeof d.games_left === 'number' ? d.games_left : 5,
                        hasUnlimited: !!d.has_unlimited
                    });
                }
            })
            .catch(() => {});
        return () => setMyGamePresence(null);
    }, [ setMyGamePresence ]);

    // Preload all 5 official Battle Ball arena backdrops & power-up sprites
    useEffect(() =>
    {
        ARENAS.forEach(a =>
        {
            const bg = new Image();
            bg.src = a.backdropImg;
            bg.onload = () => { backdropImgsRef.current[a.id] = bg; };
        });

        POWERUP_KINDS.forEach(k =>
        {
            const img = new Image();
            img.src = POWERUP_META[k].img;
            img.onload = () => { puSpritesRef.current[k] = img; };
        });
    }, []);

    // Preload trimmed authentic Shockwave SMALL (sh_) SEATED/MOUNTED Habbo avatars in all 4 isometric directions (0, 2, 4, 6)!
    useEffect(() =>
    {
        let alive = true;
        const dirs = [ 0, 2, 4, 6 ];

        const renderAllSmall = () =>
        {
            if (!alive) return;
            roster.forEach(r =>
            {
                dirs.forEach(d =>
                {
                    const key = `${ r.figure }__sit__${ d }`;
                    const raw = renderShockwaveSmallDataUrl(r.figure, { direction: d, headDirection: d, posture: 'sit' });
                    if (raw)
                    {
                        trimTransparentImage(raw, (_url, trimmedImg) =>
                        {
                            if (alive) bodyCacheRef.current.set(key, trimmedImg);
                        });
                    }
                });
            });
        };

        const unsub = onShockwaveSmallAtlasReady(renderAllSmall);
        return () =>
        {
            alive = false;
            unsub();
        };
    }, [ roster ]);

    // YouTube IFrame JS API control
    const postYouTubeCommand = useCallback((func: string) =>
    {
        try
        {
            const win = ytIframeRef.current?.contentWindow;
            if (!win) return;
            win.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*');
        }
        catch
        {
            // ignore
        }
    }, []);

    const toggleMusic = useCallback(() =>
    {
        setMusicMuted(prev =>
        {
            const next = !prev;
            postYouTubeCommand(next ? 'mute' : 'unMute');
            if (!next) postYouTubeCommand('playVideo');
            return next;
        });
    }, [ postYouTubeCommand ]);

    const toggleSfx = useCallback(() =>
    {
        setSfxMuted(prev =>
        {
            const next = !prev;
            audioRef.current.muted = next;
            return next;
        });
    }, []);

    // Load leaderboard when modal opens
    useEffect(() =>
    {
        if (!showLeaderboardModal) return;
        let cancelled = false;
        setLbLoading(true);
        const run = async () =>
        {
            try
            {
                if (lbTab === 'history')
                {
                    const r = await fetch('/api/games/battleball/history', { credentials: 'include' });
                    const d = await r.json();
                    if (!cancelled && d.success) setHistoryRows(d.matches || []);
                }
                else
                {
                    const period = lbTab === 'all' ? 'all' : 'week';
                    const scope = lbTab === 'friends' ? 'friends' : 'global';
                    const r = await fetch(`/api/games/battleball/leaderboard?period=${ period }&scope=${ scope }`, { credentials: 'include' });
                    const d = await r.json();
                    if (!cancelled && d.success) setLbEntries(d.entries || []);
                }
            }
            catch
            {
                // ignore
            }
            finally
            {
                if (!cancelled) setLbLoading(false);
            }
        };
        run();
        return () => { cancelled = true; };
    }, [ showLeaderboardModal, lbTab ]);

    const exitToGameCenter = useCallback(() =>
    {
        setMyGamePresence(null);
        setIsBattleBallPlaying(false);
        setIsVisible(true);
    }, [ setIsBattleBallPlaying, setIsVisible, setMyGamePresence ]);

    // Initialize a fresh arena board + 8 players (used immediately on mount AND rematch!)
    const initArenaEngine = useCallback((startImmediately: boolean, customArena?: ArenaConfig) =>
    {
        const targetArena = customArena || activeArena;
        const { tiles, totalColorable, gridW, gridH } = buildArenaTiles(targetArena);
        const players: HopperPlayer[] = [];
        const teamIdx: Record<Team, number> = { red: 0, blue: 0, green: 0, yellow: 0 };

        for (const r of roster)
        {
            const spawns = targetArena.spawns[r.team];
            const [ sx, sy ] = spawns[teamIdx[r.team] % spawns.length];
            teamIdx[r.team]++;
            players.push({
                id: r.id,
                name: r.name,
                figure: r.figure,
                team: r.team,
                isHuman: !!r.isHuman,
                gx: sx,
                gy: sy,
                fromX: sx,
                fromY: sy,
                toX: sx,
                toY: sy,
                hopProgress: 1,
                hopping: false,
                dirX: 1,
                dirY: 0,
                isoDir: (r.team === 'blue' ? 4 : r.team === 'green' ? 0 : r.team === 'yellow' ? 6 : 2),
                path: [],
                heldPowerUp: null,
                springTimer: 0,
                stunTimer: 0,
                cannonSteps: 0,
                tilesLocked: 0,
                tilesStolen: 0,
                powerupsUsed: 0,
                score: 0,
                aiTimer: 0.25 + Math.random() * 0.4
            });
        }

        engineRef.current = {
            running: startImmediately,
            finished: false,
            arena: targetArena,
            gridW,
            gridH,
            tiles,
            totalColorable,
            timeLeft: MATCH_DURATION,
            players,
            powerups: [],
            popups: [],
            chats: [],
            nextPuId: 1,
            nextChatId: 1,
            puSpawnTimer: 3.0,
            viewOffsetX: 0,
            viewOffsetY: 0,
            viewScale: 1
        };

        setFinishData(null);
        setRematchError(null);
        setRematchCountdown(22);
        setPuToast(null);
        setHud({
            timeLeft: MATCH_DURATION,
            scores: { red: 0, blue: 0, green: 0, yellow: 0 },
            lockPct: 0,
            heldPowerUp: null,
            springLeft: 0,
            stunLeft: 0
        });
    }, [ roster, activeArena ]);

    // Spawn initial board as soon as component mounts so the real arena is visible behind "El juego va a empezar"!
    useEffect(() =>
    {
        if (!engineRef.current) initArenaEngine(false);
    }, [ initArenaEngine ]);

    // Smooth pre-match "El juego va a empezar" red progress bar
    useEffect(() =>
    {
        if (stage !== 'lobby') return;
        setPreProgress(0);
        const startTs = performance.now();
        const totalMs = PRE_MATCH_SECONDS * 1000;
        let raf = 0;

        const tick = (now: number) =>
        {
            const pct = Math.min(100, ((now - startTs) / totalMs) * 100);
            setPreProgress(pct);
            if (pct >= 100)
            {
                if (!engineRef.current) initArenaEngine(true);
                else engineRef.current.running = true;
                setStage('playing');
                audioRef.current.playWhistle();
                return;
            }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [ stage, initArenaEngine ]);

    // Rematch countdown on Results window
    useEffect(() =>
    {
        if (stage !== 'results' || rematchCountdown <= 0) return;
        const t = setTimeout(() => setRematchCountdown(c => Math.max(0, c - 1)), 1000);
        return () => clearTimeout(t);
    }, [ stage, rematchCountdown ]);

    const handleFinishMatch = useCallback(async (eng: NonNullable<typeof engineRef.current>) =>
    {
        if (eng.finished) return;
        eng.finished = true;
        eng.running = false;
        audioRef.current.playWhistle();

        const playersCopy = eng.players.map(p => ({ ...p }));
        const teamScores: Record<Team, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
        for (const p of playersCopy) teamScores[p.team] += p.score;

        const me = playersCopy.find(p => p.isHuman);
        setFinalPlayers(playersCopy);
        setFinalTeamScores(teamScores);
        setStage('results');

        try
        {
            const res = await fetch('/api/games/battleball/finish', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    arenaId: eng.arena.id,
                    arenaName: eng.arena.name,
                    myTeam: 'red',
                    tilesLocked: me?.tilesLocked || 0,
                    tilesStolen: me?.tilesStolen || 0,
                    powerupsUsed: me?.powerupsUsed || 0,
                    myScore: me?.score || 0,
                    redScore: teamScores.red,
                    blueScore: teamScores.blue,
                    greenScore: teamScores.green,
                    yellowScore: teamScores.yellow,
                    durationSec: Math.max(10, Math.round(MATCH_DURATION - eng.timeLeft))
                })
            });
            const data: FinishResp = await res.json();
            if (data?.success)
            {
                setFinishData(data);
                if (typeof data.games_left === 'number')
                {
                    setGamesLeftInfo({ gamesLeft: data.games_left, hasUnlimited: !!data.has_unlimited });
                }
            }
        }
        catch
        {
            // Keep results visible
        }
    }, []);

    const handleRematch = useCallback(async () =>
    {
        setRematchBusy(true);
        setRematchError(null);
        try
        {
            const res = await fetch('/api/games/battleball/start', {
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
            const others = ARENAS.filter(a => a.id !== arenaId);
            const nextArena = others[Math.floor(Math.random() * others.length)] || ARENAS[0];
            setArenaId(nextArena.id);
            initArenaEngine(false, nextArena);
            setStage('lobby');
        }
        catch
        {
            setRematchError('Error de conexión.');
        }
        finally
        {
            setRematchBusy(false);
        }
    }, [ arenaId, initArenaEngine ]);

    // =========================================================================
    // BATTLE BALL CORE MECHANICS (3-Bounce Lock, BFS Fast-Lock, 7 Power-Ups)
    // =========================================================================
    const tryFastLock = (eng: NonNullable<typeof engineRef.current>, actor: HopperPlayer) =>
    {
        const { gridW, gridH } = eng;
        const visited: boolean[][] = Array.from({ length: gridH }, () => Array(gridW).fill(false));
        const q: Array<[ number, number ]> = [];

        const isWall = (x: number, y: number) =>
        {
            const t = eng.tiles[y][x];
            return t.colorable && t.team === actor.team && t.level === 3;
        };

        for (let y = 0; y < gridH; y++)
        {
            for (let x = 0; x < gridW; x++)
            {
                const t = eng.tiles[y][x];
                if (!t.colorable)
                {
                    visited[y][x] = true;
                    q.push([ x, y ]);
                }
                else if (x === 0 || y === 0 || x === gridW - 1 || y === gridH - 1)
                {
                    if (!isWall(x, y))
                    {
                        visited[y][x] = true;
                        q.push([ x, y ]);
                    }
                }
            }
        }

        const dirs = [ [ 1, 0 ], [ -1, 0 ], [ 0, 1 ], [ 0, -1 ] ];
        while (q.length > 0)
        {
            const [ cx, cy ] = q.shift()!;
            for (const [ dx, dy ] of dirs)
            {
                const nx = cx + dx;
                const ny = cy + dy;
                if (nx < 0 || ny < 0 || nx >= gridW || ny >= gridH || visited[ny][nx]) continue;
                if (!isWall(nx, ny))
                {
                    visited[ny][nx] = true;
                    q.push([ nx, ny ]);
                }
            }
        }

        let filled = 0;
        for (let y = 0; y < gridH; y++)
        {
            for (let x = 0; x < gridW; x++)
            {
                const t = eng.tiles[y][x];
                if (t.colorable && !visited[y][x] && !(t.team === actor.team && t.level === 3))
                {
                    if (t.level < 3)
                    {
                        t.team = actor.team;
                        t.level = 3;
                        t.flash = 1.0;
                        filled++;
                    }
                }
            }
        }

        if (filled > 0)
        {
            const bonus = filled * 14;
            actor.tilesLocked += filled;
            actor.score += bonus;
            const z = eng.tiles[actor.gy]?.[actor.gx]?.z || 0;
            eng.popups.push({
                x: actor.gx,
                y: actor.gy,
                z,
                text: `¡CIERRE x${ filled } (+${ bonus })!`,
                color: '#ffeb66',
                life: 1.5,
                maxLife: 1.5
            });
            if (actor.isHuman) audioRef.current.playFastLock();
        }
    };

    const showPowerUpToast = useCallback((kind: PowerUpKind) =>
    {
        setPuToast({ kind, label: POWERUP_META[kind].name });
        if (puToastTimerRef.current) window.clearTimeout(puToastTimerRef.current);
        puToastTimerRef.current = window.setTimeout(() => setPuToast(null), 2600);
    }, []);

    const applyTileBounce = (
        eng: NonNullable<typeof engineRef.current>,
        actor: HopperPlayer,
        x: number,
        y: number,
        instantLock = false
    ) =>
    {
        if (x < 0 || y < 0 || x >= eng.gridW || y >= eng.gridH) return;
        const t = eng.tiles[y][x];
        if (!t.walkable) return;

        if (t.pinTeam && t.pinTeam !== actor.team)
        {
            t.pinTeam = null;
            actor.stunTimer = 2.6;
            actor.path = [];
            eng.popups.push({ x, y, z: t.z, text: '¡CHINCHETA!', color: '#ff6b6b', life: 1.1, maxLife: 1.1 });
            if (actor.isHuman) audioRef.current.playBomb();
            return;
        }

        if (!t.colorable) return; // Stairs are walkable but never painted!

        if (t.level === 3) return; // Already permanently locked!

        if (instantLock || actor.springTimer > 0)
        {
            const wasRival = t.team !== null && t.team !== actor.team;
            t.team = actor.team;
            t.level = 3;
            t.flash = 1.0;
            actor.tilesLocked++;
            if (wasRival) actor.tilesStolen++;
            const pts = wasRival ? 18 : 14;
            actor.score += pts;
            eng.popups.push({ x, y, z: t.z, text: `+${ pts }`, color: TEAM_META[actor.team].lv3Core, life: 0.9, maxLife: 0.9 });
            if (actor.isHuman) audioRef.current.playLock();
            tryFastLock(eng, actor);
            return;
        }

        if (t.team === null)
        {
            t.team = actor.team;
            t.level = 1;
            t.flash = 0.55;
            actor.score += 2;
            if (actor.isHuman) audioRef.current.playBounce(1);
        }
        else if (t.team === actor.team)
        {
            t.level = Math.min(3, t.level + 1) as 1 | 2 | 3;
            t.flash = t.level === 3 ? 1.0 : 0.65;
            if (t.level === 3)
            {
                actor.tilesLocked++;
                actor.score += 14;
                eng.popups.push({ x, y, z: t.z, text: '+14', color: TEAM_META[actor.team].lv3Core, life: 0.9, maxLife: 0.9 });
                if (actor.isHuman) audioRef.current.playLock();
                tryFastLock(eng, actor);
            }
            else
            {
                actor.score += 2;
                if (actor.isHuman) audioRef.current.playBounce(2);
            }
        }
        else
        {
            t.team = actor.team;
            t.level = 1;
            t.flash = 0.7;
            actor.tilesStolen++;
            actor.score += 4;
            if (actor.isHuman) audioRef.current.playBounce(1);
        }
    };

    const activatePowerUp = useCallback((eng: NonNullable<typeof engineRef.current>, actor: HopperPlayer) =>
    {
        const kind = actor.heldPowerUp;
        if (!kind) return;
        actor.heldPowerUp = null;
        actor.powerupsUsed++;
        const cx = actor.gx;
        const cy = actor.gy;
        const cz = eng.tiles[cy]?.[cx]?.z || 0;

        if (actor.isHuman) showPowerUpToast(kind);

        if (kind === 'spring')
        {
            actor.springTimer = 8.0;
            eng.popups.push({ x: cx, y: cy, z: cz, text: '¡RESORTE 8s!', color: '#7fffa3', life: 1.2, maxLife: 1.2 });
            if (actor.isHuman) audioRef.current.playPowerUp();
        }
        else if (kind === 'lightbulb')
        {
            for (let dy = -1; dy <= 1; dy++)
            {
                for (let dx = -1; dx <= 1; dx++)
                {
                    applyTileBounce(eng, actor, cx + dx, cy + dy, true);
                }
            }
            eng.popups.push({ x: cx, y: cy, z: cz, text: '¡BOMBILLA!', color: '#fff176', life: 1.2, maxLife: 1.2 });
            if (actor.isHuman) audioRef.current.playFastLock();
        }
        else if (kind === 'flashlight')
        {
            const dx = actor.dirX || 1;
            const dy = actor.dirY;
            for (let step = 1; step <= 6; step++)
            {
                const nx = cx + dx * step;
                const ny = cy + dy * step;
                if (nx < 0 || ny < 0 || nx >= eng.gridW || ny >= eng.gridH || !eng.tiles[ny][nx].walkable) break;
                applyTileBounce(eng, actor, nx, ny, true);
            }
            eng.popups.push({ x: cx, y: cy, z: cz, text: '¡LINTERNA!', color: '#90e0ff', life: 1.2, maxLife: 1.2 });
            if (actor.isHuman) audioRef.current.playPowerUp();
        }
        else if (kind === 'bomb')
        {
            for (let dy = -1; dy <= 1; dy++)
            {
                for (let dx = -1; dx <= 1; dx++)
                {
                    const nx = cx + dx;
                    const ny = cy + dy;
                    if (nx >= 0 && ny >= 0 && nx < eng.gridW && ny < eng.gridH && eng.tiles[ny][nx].colorable)
                    {
                        eng.tiles[ny][nx].team = null;
                        eng.tiles[ny][nx].level = 0;
                        eng.tiles[ny][nx].pinTeam = null;
                        eng.tiles[ny][nx].flash = 1.0;
                    }
                }
            }
            for (const other of eng.players)
            {
                if (other.id !== actor.id && Math.abs(other.gx - cx) <= 2 && Math.abs(other.gy - cy) <= 2)
                {
                    other.stunTimer = 2.4;
                    other.path = [];
                }
            }
            eng.popups.push({ x: cx, y: cy, z: cz, text: '¡BOOM!', color: '#ff6b4a', life: 1.3, maxLife: 1.3 });
            audioRef.current.playBomb();
        }
        else if (kind === 'cannon')
        {
            actor.cannonSteps = 6;
            eng.popups.push({ x: cx, y: cy, z: cz, text: '¡CAÑÓN!', color: '#ffae42', life: 1.2, maxLife: 1.2 });
            if (actor.isHuman) audioRef.current.playPowerUp();
        }
        else if (kind === 'pins')
        {
            const pinPalette: Array<'red' | 'cyan' | 'yellow'> = [ 'red', 'cyan', 'yellow' ];
            let placed = 0;
            for (let dy = -1; dy <= 1 && placed < 5; dy++)
            {
                for (let dx = -1; dx <= 1 && placed < 5; dx++)
                {
                    if (dx === 0 && dy === 0) continue;
                    const nx = cx + dx;
                    const ny = cy + dy;
                    if (nx >= 0 && ny >= 0 && nx < eng.gridW && ny < eng.gridH && eng.tiles[ny][nx].walkable && !eng.tiles[ny][nx].pinTeam)
                    {
                        eng.tiles[ny][nx].pinTeam = actor.team;
                        eng.tiles[ny][nx].pinColor = pinPalette[placed % pinPalette.length];
                        placed++;
                    }
                }
            }
            eng.popups.push({ x: cx, y: cy, z: cz, text: '¡CHINCHETAS!', color: '#f59e0b', life: 1.2, maxLife: 1.2 });
            if (actor.isHuman) audioRef.current.playPowerUp();
        }
        else if (kind === 'drill')
        {
            let converted = 0;
            for (let dy = -2; dy <= 2; dy++)
            {
                for (let dx = -2; dx <= 2; dx++)
                {
                    const nx = cx + dx;
                    const ny = cy + dy;
                    if (nx >= 0 && ny >= 0 && nx < eng.gridW && ny < eng.gridH)
                    {
                        const t = eng.tiles[ny][nx];
                        if (t.colorable && t.team && t.team !== actor.team)
                        {
                            t.team = actor.team;
                            t.level = 3;
                            t.flash = 1.0;
                            converted++;
                        }
                    }
                }
            }
            if (converted > 0)
            {
                actor.tilesStolen += converted;
                actor.tilesLocked += converted;
                actor.score += converted * 16;
                tryFastLock(eng, actor);
            }
            eng.popups.push({ x: cx, y: cy, z: cz, text: `¡TALADRO x${ converted }!`, color: '#f472b6', life: 1.3, maxLife: 1.3 });
            if (actor.isHuman) audioRef.current.playFastLock();
        }
    }, [ showPowerUpToast ]);

    const triggerMyPowerUp = useCallback(() =>
    {
        const eng = engineRef.current;
        if (!eng || !eng.running) return;
        const me = eng.players.find(p => p.isHuman);
        if (me && me.heldPowerUp) activatePowerUp(eng, me);
    }, [ activatePowerUp ]);

    const pushChatBubble = useCallback((
        eng: NonNullable<typeof engineRef.current>,
        speaker: HopperPlayer,
        text: string,
        shout = false
    ) =>
    {
        const z = eng.tiles[speaker.gy]?.[speaker.gx]?.z || 0;
        const bgY = eng.arena.originY + (speaker.gx + speaker.gy) * (TILE_H / 2) - z * 16;
        const spawnY = Math.max(58, Math.min(240, Math.round(eng.viewOffsetY + bgY * eng.viewScale - 56 * eng.viewScale)));
        // Push existing bubbles smoothly upward so nothing overlaps (exact Habbo chat scroll!)
        for (const ch of eng.chats) ch.y -= 24;
        eng.chats.push({
            id: eng.nextChatId++,
            name: speaker.name,
            team: speaker.team,
            text,
            shout,
            gx: speaker.gx,
            gy: speaker.gy,
            z,
            y: spawnY,
            life: 6.5
        });
        if (eng.chats.length > 7) eng.chats.shift();
    }, []);

    const handleChatSubmit = useCallback((e: FormEvent) =>
    {
        e.preventDefault();
        const eng = engineRef.current;
        const raw = chatText.trim().slice(0, 64);
        const isShout = chatMode === 'shout';
        const txt = isShout ? raw.toUpperCase() : raw;
        if (eng && txt.length > 0)
        {
            const me = eng.players.find(p => p.isHuman);
            if (me) pushChatBubble(eng, me, txt, isShout);
        }
        setChatText('');
        chatInputRef.current?.blur();
    }, [ chatText, chatMode, pushChatBubble ]);

    // =========================================================================
    // MAIN 60 FPS ENGINE & OFFICIAL PIXEL-ALIGNED 5-ARENA RENDERER
    // (Stays live across lobby, playing & results so the arena is ALWAYS real!)
    // =========================================================================
    useEffect(() =>
    {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Convert logical tile (gx, gy, z) -> canvas CSS coordinates aligned pixel-for-pixel to the active arena backdrop!
        const tileToCanvas = (gx: number, gy: number, z: number, eng: NonNullable<typeof engineRef.current>) =>
        {
            const bgX = eng.arena.originX + (gx - gy) * (TILE_W / 2);
            const bgY = eng.arena.originY + (gx + gy) * (TILE_H / 2) - z * 16;
            return {
                sx: eng.viewOffsetX + bgX * eng.viewScale,
                sy: eng.viewOffsetY + bgY * eng.viewScale
            };
        };

        // Pick the exact walkable tile under mouse click (priority to power-up sprites & elevated plateaus!)
        const canvasToTile = (mx: number, my: number, eng: NonNullable<typeof engineRef.current>): { x: number; y: number } | null =>
        {
            const bx = (mx - eng.viewOffsetX) / eng.viewScale;
            const by = (my - eng.viewOffsetY) / eng.viewScale;

            // Clicking directly on a floating power-up sprite always targets its exact tile
            let bestPu: { x: number; y: number; dist: number } | null = null;
            for (const pu of eng.powerups)
            {
                const t = eng.tiles[pu.y]?.[pu.x];
                if (!t || !t.walkable) continue;
                const px = eng.arena.originX + (pu.x - pu.y) * 16;
                const py = eng.arena.originY + (pu.x + pu.y) * 8 + 8 - t.z * 16;
                if (Math.abs(bx - px) <= 13 && by >= py - 22 && by <= py + 6)
                {
                    const dist = Math.hypot(bx - px, by - (py - 9));
                    if (!bestPu || dist < bestPu.dist) bestPu = { x: pu.x, y: pu.y, dist };
                }
            }
            if (bestPu) return { x: bestPu.x, y: bestPu.y };

            let best: { x: number; y: number; score: number } | null = null;
            for (let y = 0; y < eng.gridH; y++)
            {
                for (let x = 0; x < eng.gridW; x++)
                {
                    const t = eng.tiles[y][x];
                    if (!t.walkable) continue;
                    const cx = eng.arena.originX + (x - y) * 16;
                    const cy = eng.arena.originY + (x + y) * 8 + 8 - t.z * 16;
                    const norm = Math.abs(bx - cx) / 16 + Math.abs(by - cy) / 8;
                    if (norm <= 1.08)
                    {
                        const depthScore = (x + y) * 0.01 + t.z * 0.2 - norm;
                        if (!best || depthScore > best.score) best = { x, y, score: depthScore };
                    }
                }
            }
            return best ? { x: best.x, y: best.y } : null;
        };

        const startHop = (
            eng: NonNullable<typeof engineRef.current>,
            p: HopperPlayer,
            nx: number,
            ny: number
        ): boolean =>
        {
            if (nx < 0 || ny < 0 || nx >= eng.gridW || ny >= eng.gridH) return false;
            const target = eng.tiles[ny][nx];
            const cur = eng.tiles[p.gy][p.gx];
            if (!target.walkable) return false;
            if (Math.abs(target.z - cur.z) > 1.05) return false;

            const dx = nx - p.gx;
            const dy = ny - p.gy;
            if (dx !== 0 && dy !== 0)
            {
                const adjA = eng.tiles[p.gy]?.[nx];
                const adjB = eng.tiles[ny]?.[p.gx];
                if (!(adjA?.walkable || adjB?.walkable)) return false;
            }
            p.fromX = p.gx;
            p.fromY = p.gy;
            p.toX = nx;
            p.toY = ny;
            p.dirX = Math.sign(dx);
            p.dirY = Math.sign(dy);
            // 8-way Habbo isometric facing mapped cleanly to seated angles (0=NE, 2=SE, 4=SW, 6=NW)
            if (dx > 0 && dy > 0) p.isoDir = 2;
            else if (dx > 0 && dy < 0) p.isoDir = 0;
            else if (dx < 0 && dy > 0) p.isoDir = 4;
            else if (dx < 0 && dy < 0) p.isoDir = 6;
            else if (dx > 0) p.isoDir = 2;
            else if (dy > 0) p.isoDir = 4;
            else if (dx < 0) p.isoDir = 6;
            else if (dy < 0) p.isoDir = 0;
            p.hopProgress = 0;
            p.hopping = true;
            return true;
        };

        const handlePointerDown = (e: MouseEvent) =>
        {
            if (e.button !== 0 || stage !== 'playing') return;
            if (showLeaveModal || showHelpModal || showLeaderboardModal) return;
            const eng = engineRef.current;
            if (!eng || !eng.running) return;
            if (document.activeElement instanceof HTMLElement) document.activeElement.blur();

            const rect = canvas.getBoundingClientRect();
            const picked = canvasToTile(e.clientX - rect.left, e.clientY - rect.top, eng);
            const me = eng.players.find(p => p.isHuman);
            if (!me || me.stunTimer > 0 || !picked) return;

            const path = findPathBFS(eng.tiles, me.hopping ? me.toX : me.gx, me.hopping ? me.toY : me.gy, picked.x, picked.y);
            if (path.length > 0) me.path = path;
        };

        const handleKeyDown = (e: KeyboardEvent) =>
        {
            if (stage !== 'playing') return;
            if (document.activeElement === chatInputRef.current)
            {
                if (e.key === 'Escape') chatInputRef.current?.blur();
                return;
            }
            if (e.key === 'Enter')
            {
                e.preventDefault();
                chatInputRef.current?.focus();
                return;
            }
            if (e.key === 'Escape')
            {
                if (showHelpModal) setShowHelpModal(false);
                else if (showLeaderboardModal) setShowLeaderboardModal(false);
                else setShowLeaveModal(prev => !prev);
                return;
            }
            if (showLeaveModal || showHelpModal || showLeaderboardModal) return;
            if (e.code === 'Space')
            {
                e.preventDefault();
                triggerMyPowerUp();
                return;
            }
            keysRef.current.add(e.code);
        };

        const handleKeyUp = (e: KeyboardEvent) =>
        {
            keysRef.current.delete(e.code);
        };

        canvas.addEventListener('mousedown', handlePointerDown);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        let rafId = 0;
        let lastTs = performance.now();
        let hudAcc = 0;
        let botChatTimer = 5.5;

        const update = (dt: number) =>
        {
            const eng = engineRef.current;
            if (!eng || !eng.running) return;
            const { gridW, gridH } = eng;

            eng.timeLeft = Math.max(0, eng.timeLeft - dt);

            for (let y = 0; y < gridH; y++)
            {
                for (let x = 0; x < gridW; x++)
                {
                    if (eng.tiles[y][x].flash > 0) eng.tiles[y][x].flash = Math.max(0, eng.tiles[y][x].flash - dt * 2.2);
                }
            }

            // Spawn official power-ups across colorable tiles (up to 6 on the arena!)
            eng.puSpawnTimer -= dt;
            if (eng.puSpawnTimer <= 0 && eng.powerups.length < 6)
            {
                eng.puSpawnTimer = 4.2 + Math.random() * 2.4;
                const candidates: Array<[ number, number ]> = [];
                for (let y = 0; y < gridH; y++)
                {
                    for (let x = 0; x < gridW; x++)
                    {
                        if (eng.tiles[y][x].colorable && !eng.powerups.some(pu => pu.x === x && pu.y === y))
                        {
                            candidates.push([ x, y ]);
                        }
                    }
                }
                if (candidates.length > 0)
                {
                    const [ px, py ] = candidates[Math.floor(Math.random() * candidates.length)];
                    const kind = POWERUP_KINDS[Math.floor(Math.random() * POWERUP_KINDS.length)];
                    eng.powerups.push({ id: eng.nextPuId++, x: px, y: py, kind, bobPhase: Math.random() * Math.PI * 2 });
                }
            }
            for (const pu of eng.powerups) pu.bobPhase += dt * 4.5;

            botChatTimer -= dt;
            if (botChatTimer <= 0)
            {
                botChatTimer = 9 + Math.random() * 7;
                const bots = eng.players.filter(p => !p.isHuman);
                const speaker = bots[Math.floor(Math.random() * bots.length)];
                if (speaker)
                {
                    pushChatBubble(eng, speaker, BOT_SHOUTS[Math.floor(Math.random() * BOT_SHOUTS.length)], false);
                }
            }

            for (const p of eng.players)
            {
                if (p.springTimer > 0) p.springTimer = Math.max(0, p.springTimer - dt);
                if (p.stunTimer > 0)
                {
                    p.stunTimer = Math.max(0, p.stunTimer - dt);
                    continue;
                }

                const tryPickupPowerUp = () =>
                {
                    const puIdx = eng.powerups.findIndex(pu => pu.x === p.gx && pu.y === p.gy);
                    if (puIdx < 0) return;
                    if (!p.isHuman && p.heldPowerUp) return;

                    const picked = eng.powerups.splice(puIdx, 1)[0];
                    p.heldPowerUp = picked.kind;
                    if (p.isHuman)
                    {
                        audioRef.current.playPowerUp();
                        showPowerUpToast(picked.kind);
                    }
                };

                if (p.hopping)
                {
                    const hopSpeed = p.cannonSteps > 0 ? 7.8 : (p.isHuman ? 4.3 : 3.5);
                    p.hopProgress += dt * hopSpeed;
                    if (p.hopProgress >= 1)
                    {
                        p.hopProgress = 1;
                        p.hopping = false;
                        p.gx = p.toX;
                        p.gy = p.toY;
                        applyTileBounce(eng, p, p.gx, p.gy, p.cannonSteps > 0);
                        tryPickupPowerUp();

                        if (p.cannonSteps > 0)
                        {
                            p.cannonSteps--;
                            if (!startHop(eng, p, p.gx + p.dirX, p.gy + p.dirY)) p.cannonSteps = 0;
                        }
                    }
                    continue;
                }

                tryPickupPowerUp();

                if (p.isHuman)
                {
                    const k = keysRef.current;
                    let kdx = 0;
                    let kdy = 0;
                    // 8-directional keyboard support (WASD / Arrow combos + Q/E/Z/C single-key diagonals)
                    if (k.has('KeyW') || k.has('ArrowUp')) kdy -= 1;
                    if (k.has('KeyS') || k.has('ArrowDown')) kdy += 1;
                    if (k.has('KeyA') || k.has('ArrowLeft')) kdx -= 1;
                    if (k.has('KeyD') || k.has('ArrowRight')) kdx += 1;
                    if (kdx === 0 && kdy === 0)
                    {
                        if (k.has('KeyQ')) { kdx = -1; kdy = -1; }
                        else if (k.has('KeyE')) { kdx = 1; kdy = -1; }
                        else if (k.has('KeyZ')) { kdx = -1; kdy = 1; }
                        else if (k.has('KeyC')) { kdx = 1; kdy = 1; }
                    }
                    if (kdx === 0 && kdy === 0)
                    {
                        let jx = joyVecRef.current.x;
                        let jy = joyVecRef.current.y;
                        if (Math.hypot(jx, jy) <= 0.18 && joyPendingTapRef.current)
                        {
                            jx = joyPendingTapRef.current.x;
                            jy = joyPendingTapRef.current.y;
                            joyPendingTapRef.current = null;
                        }
                        if (Math.hypot(jx, jy) > 0.18)
                        {
                            const deg = (Math.atan2(jy, jx) * 180) / Math.PI;
                            if (deg >= -22.5 && deg < 22.5) { kdx = 1; kdy = -1; }           // → Right
                            else if (deg >= 22.5 && deg < 67.5) { kdx = 1; kdy = 0; }        // ↘ Down-Right
                            else if (deg >= 67.5 && deg < 112.5) { kdx = 1; kdy = 1; }       // ↓ Down
                            else if (deg >= 112.5 && deg < 157.5) { kdx = 0; kdy = 1; }      // ↙ Down-Left
                            else if (deg >= 157.5 || deg < -157.5) { kdx = -1; kdy = 1; }    // ← Left
                            else if (deg >= -157.5 && deg < -112.5) { kdx = -1; kdy = 0; }   // ↖ Up-Left
                            else if (deg >= -112.5 && deg < -67.5) { kdx = -1; kdy = -1; }   // ↑ Up
                            else { kdx = 0; kdy = -1; }                                      // ↗ Up-Right
                        }
                    }

                    if (kdx !== 0 || kdy !== 0)
                    {
                        p.path = [];
                        startHop(eng, p, p.gx + kdx, p.gy + kdy);
                    }
                    else if (p.path.length > 0)
                    {
                        const [ nx, ny ] = p.path.shift()!;
                        if (!startHop(eng, p, nx, ny)) p.path = [];
                    }
                }
                else
                {
                    p.aiTimer -= dt;
                    if (p.aiTimer > 0) continue;
                    p.aiTimer = 0.06 + Math.random() * 0.1;

                    if (p.heldPowerUp && Math.random() < 0.25)
                    {
                        activatePowerUp(eng, p);
                    }

                    if (p.path.length > 0)
                    {
                        const [ nx, ny ] = p.path.shift()!;
                        if (startHop(eng, p, nx, ny)) continue;
                        p.path = [];
                    }

                    // Pick an appealing nearby neighbor (all 8 directions including diagonals!) OR pathfind to a power-up!
                    const dirs = [
                        [ 1, 0 ], [ -1, 0 ], [ 0, 1 ], [ 0, -1 ],
                        [ 1, 1 ], [ 1, -1 ], [ -1, 1 ], [ -1, -1 ]
                    ];
                    let bestMove: [ number, number ] | null = null;
                    let bestVal = -999;

                    // 25% chance to chase a nearby power-up via BFS across stairs
                    if (!p.heldPowerUp && eng.powerups.length > 0 && Math.random() < 0.25)
                    {
                        const targetPu = eng.powerups[Math.floor(Math.random() * eng.powerups.length)];
                        const path = findPathBFS(eng.tiles, p.gx, p.gy, targetPu.x, targetPu.y);
                        if (path.length > 0 && path.length <= 10)
                        {
                            p.path = path;
                            const [ nx, ny ] = p.path.shift()!;
                            if (startHop(eng, p, nx, ny)) continue;
                        }
                    }

                    for (const [ dx, dy ] of dirs)
                    {
                        const nx = p.gx + dx;
                        const ny = p.gy + dy;
                        if (nx < 0 || ny < 0 || nx >= gridW || ny >= gridH) continue;
                        const t = eng.tiles[ny][nx];
                        const cur = eng.tiles[p.gy][p.gx];
                        if (!t.walkable || Math.abs(t.z - cur.z) > 1.05) continue;
                        if (dx !== 0 && dy !== 0)
                        {
                            const adjA = eng.tiles[p.gy]?.[nx];
                            const adjB = eng.tiles[ny]?.[p.gx];
                            if (!(adjA?.walkable || adjB?.walkable)) continue;
                        }

                        let val = Math.random() * 5;
                        if (t.pinTeam && t.pinTeam !== p.team) val -= 35;
                        if (eng.powerups.some(pu => pu.x === nx && pu.y === ny)) val += 28;
                        if (!t.colorable) val += 3; // encourage traversing stairs!
                        else if (t.level === 3) val -= 6;
                        else if (t.team === p.team && t.level === 2) val += 18;
                        else if (t.team === p.team && t.level === 1) val += 12;
                        else if (t.team === null) val += 10;
                        else val += 13;

                        if (val > bestVal)
                        {
                            bestVal = val;
                            bestMove = [ nx, ny ];
                        }
                    }

                    // If trapped in a fully locked area, BFS to a random unlocked tile on the arena!
                    if (!bestMove || bestVal < 1)
                    {
                        for (let attempt = 0; attempt < 8; attempt++)
                        {
                            const rx = Math.floor(Math.random() * gridW);
                            const ry = Math.floor(Math.random() * gridH);
                            const rt = eng.tiles[ry][rx];
                            if (rt.colorable && rt.level < 3)
                            {
                                const path = findPathBFS(eng.tiles, p.gx, p.gy, rx, ry);
                                if (path.length > 0)
                                {
                                    p.path = path.slice(0, 12);
                                    const [ nx, ny ] = p.path.shift()!;
                                    startHop(eng, p, nx, ny);
                                    bestMove = null;
                                    break;
                                }
                            }
                        }
                    }
                    if (bestMove) startHop(eng, p, bestMove[0], bestMove[1]);
                }
            }

            // Check 100% board lockdown or 0:00 timeout
            let lockedCount = 0;
            for (let y = 0; y < gridH; y++)
            {
                for (let x = 0; x < gridW; x++)
                {
                    if (eng.tiles[y][x].colorable && eng.tiles[y][x].level === 3) lockedCount++;
                }
            }
            if (eng.timeLeft <= 0 || lockedCount >= eng.totalColorable)
            {
                handleFinishMatch(eng);
                return;
            }

            for (let i = eng.popups.length - 1; i >= 0; i--)
            {
                eng.popups[i].life -= dt;
                if (eng.popups[i].life <= 0) eng.popups.splice(i, 1);
            }
            for (let i = eng.chats.length - 1; i >= 0; i--)
            {
                eng.chats[i].life -= dt;
                eng.chats[i].y -= dt * 13; // Classic Habbo upward chat scroll!
                if (eng.chats[i].life <= 0 || eng.chats[i].y < -26) eng.chats.splice(i, 1);
            }

            hudAcc += dt;
            if (hudAcc >= 0.12)
            {
                hudAcc = 0;
                const me = eng.players.find(p => p.isHuman);
                const scores: Record<Team, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
                for (const pl of eng.players) scores[pl.team] += pl.score;
                setHud({
                    timeLeft: Math.ceil(eng.timeLeft),
                    scores,
                    lockPct: Math.round((lockedCount / Math.max(1, eng.totalColorable)) * 100),
                    heldPowerUp: me?.heldPowerUp || null,
                    springLeft: Math.ceil(me?.springTimer || 0),
                    stunLeft: Math.ceil(me?.stunTimer || 0)
                });
            }
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

            // Adaptive arena framing: keep entire diamond arena visible and clear of top-left scoreboard on mobile/compact screens
            const isCompactViewport = cssW < 960 || cssH < 540;
            const rawSc = isCompactViewport
                ? Math.min(cssW / 780, cssH / BG_H)
                : Math.max(cssH / BG_H, cssW / BG_W);
            const sc = (!isCompactViewport && (cssW / rawSc) < 760) ? (cssW / 760) : rawSc;
            const drawW = BG_W * sc;
            const drawH = BG_H * sc;
            const mobileShiftX = isCompactViewport ? Math.min(44, Math.round(cssW * 0.05)) : 0;
            const desiredOx = Math.round(cssW / 2 - eng.arena.centerX * sc + mobileShiftX);
            const ox = drawW >= cssW
                ? Math.min(0, Math.max(Math.round(cssW - drawW), desiredOx))
                : Math.floor((cssW - drawW) / 2 + mobileShiftX * 0.5);
            const oy = Math.floor((cssH - drawH) / 2);
            eng.viewScale = sc;
            eng.viewOffsetX = ox;
            eng.viewOffsetY = oy;

            // 1. Arena background fill fallback (only visible on ultra-tall windows)
            ctx.fillStyle = eng.arena.bgColor;
            ctx.fillRect(0, 0, cssW, cssH);

            // 2. ACTUAL OFFICIAL HABBO BATTLE BALL ARENA ARTWORK (seamless 1120x484!)
            const bgImg = backdropImgsRef.current[eng.arena.id];
            if (bgImg)
            {
                ctx.drawImage(bgImg, ox, oy, drawW, drawH);
            }

            // 3. Draw ONLY Colored / Locked Tiles + Chinchetas cleanly snapped onto the exact 32x16 tiles!
            const hw = (TILE_W / 2) * sc;
            const hh = (TILE_H / 2) * sc;

            for (let y = 0; y < eng.gridH; y++)
            {
                for (let x = 0; x < eng.gridW; x++)
                {
                    const t = eng.tiles[y][x];
                    if (!t.colorable) continue;
                    if (t.level === 0 && !t.pinTeam && t.flash <= 0) continue;

                    const p = tileToCanvas(x, y, t.z, eng);

                    if (t.team && t.level > 0)
                    {
                        const meta = TEAM_META[t.team];
                        // Outer colored tile diamond inside the 1px black pixel grid line
                        ctx.beginPath();
                        ctx.moveTo(p.sx, p.sy + 1 * sc);
                        ctx.lineTo(p.sx + hw - 1.2 * sc, p.sy + hh);
                        ctx.lineTo(p.sx, p.sy + hh * 2 - 1 * sc);
                        ctx.lineTo(p.sx - hw + 1.2 * sc, p.sy + hh);
                        ctx.closePath();

                        if (t.level === 1)
                        {
                            ctx.fillStyle = meta.lv1Fill;
                            ctx.fill();
                        }
                        else if (t.level === 2)
                        {
                            ctx.fillStyle = meta.lv2Fill;
                            ctx.fill();
                            ctx.strokeStyle = 'rgba(255,255,255,0.35)';
                            ctx.lineWidth = Math.max(1, 1 * sc);
                            ctx.stroke();
                        }
                        else
                        {
                            // Level 3 (LOCKED / SELLADA): iconic Habbo bold team border + glowing pastel-white center!
                            ctx.fillStyle = meta.lv3Border;
                            ctx.fill();

                            ctx.beginPath();
                            ctx.moveTo(p.sx, p.sy + 3.4 * sc);
                            ctx.lineTo(p.sx + hw * 0.66, p.sy + hh);
                            ctx.lineTo(p.sx, p.sy + hh * 2 - 3.4 * sc);
                            ctx.lineTo(p.sx - hw * 0.66, p.sy + hh);
                            ctx.closePath();
                            ctx.fillStyle = meta.lv3Core;
                            ctx.fill();
                        }
                    }

                    if (t.flash > 0.05)
                    {
                        ctx.beginPath();
                        ctx.moveTo(p.sx, p.sy + 1 * sc);
                        ctx.lineTo(p.sx + hw - 1.2 * sc, p.sy + hh);
                        ctx.lineTo(p.sx, p.sy + hh * 2 - 1 * sc);
                        ctx.lineTo(p.sx - hw + 1.2 * sc, p.sy + hh);
                        ctx.closePath();
                        ctx.fillStyle = `rgba(255,255,255,${ t.flash * 0.42 })`;
                        ctx.fill();
                    }
                }
            }

            // 4. Depth-sorted Chinchetas (real sharp Habbo thumbtacks!), Board Power-Ups & Mounted Habbo Players!
            type RenderEntity = { depth: number; draw: () => void };
            const entities: RenderEntity[] = [];

            // Authentic Habbo Chinchetas (chunky red/cyan/yellow plastic disc + tall sharp metallic vertical spike!)
            const PIN_PALETTE = {
                red: { base: '#d92828', rim: '#ff6b6b', dark: '#8c1414' },
                cyan: { base: '#2596e8', rim: '#7ad3ff', dark: '#11588f' },
                yellow: { base: '#e5be12', rim: '#fff280', dark: '#947404' }
            };
            for (let y = 0; y < eng.gridH; y++)
            {
                for (let x = 0; x < eng.gridW; x++)
                {
                    const t = eng.tiles[y][x];
                    if (!t.pinTeam) continue;
                    const colors = PIN_PALETTE[t.pinColor || 'red'];
                    entities.push({
                        depth: x + y + 0.08,
                        draw: () =>
                        {
                            const p = tileToCanvas(x, y, t.z, eng);
                            const cx = p.sx;
                            const cy = p.sy + hh;

                            // Ground shadow under thumbtack disc
                            ctx.fillStyle = 'rgba(0,0,0,0.34)';
                            ctx.beginPath();
                            ctx.ellipse(cx, cy + 2.4 * sc, 7.6 * sc, 4.1 * sc, 0, 0, Math.PI * 2);
                            ctx.fill();

                            // 3D bottom rim of colorful plastic thumbtack base
                            ctx.fillStyle = colors.dark;
                            ctx.strokeStyle = '#000000';
                            ctx.lineWidth = Math.max(1, 1.1 * sc);
                            ctx.beginPath();
                            ctx.ellipse(cx, cy + 1.3 * sc, 7.2 * sc, 3.8 * sc, 0, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.stroke();

                            // Top colorful disc surface
                            ctx.fillStyle = colors.base;
                            ctx.beginPath();
                            ctx.ellipse(cx, cy - 0.2 * sc, 6.8 * sc, 3.4 * sc, 0, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.stroke();

                            // Inner concentric highlight ring
                            ctx.strokeStyle = colors.rim;
                            ctx.lineWidth = Math.max(0.8, 0.9 * sc);
                            ctx.beginPath();
                            ctx.ellipse(cx, cy - 0.4 * sc, 4.0 * sc, 1.8 * sc, 0, 0, Math.PI * 2);
                            ctx.stroke();

                            // Tall sharp vertical metallic silver needle spike pointing straight UP!
                            const spikeH = 10.5 * sc;
                            const spikeW = 1.6 * sc;
                            ctx.fillStyle = '#000000';
                            ctx.beginPath();
                            ctx.moveTo(cx, cy - 1.2 * sc - spikeH - 1.2 * sc);
                            ctx.lineTo(cx + spikeW + 0.9 * sc, cy - 0.4 * sc);
                            ctx.lineTo(cx - spikeW - 0.9 * sc, cy - 0.4 * sc);
                            ctx.closePath();
                            ctx.fill();

                            ctx.fillStyle = '#dce4ea';
                            ctx.beginPath();
                            ctx.moveTo(cx, cy - 1.0 * sc - spikeH);
                            ctx.lineTo(cx + spikeW, cy - 0.8 * sc);
                            ctx.lineTo(cx - spikeW, cy - 0.8 * sc);
                            ctx.closePath();
                            ctx.fill();

                            // Bright white metallic glint on left edge of spike
                            ctx.fillStyle = '#ffffff';
                            ctx.fillRect(cx - 0.6 * sc, cy - spikeH + 1.5 * sc, 0.9 * sc, spikeH * 0.68);
                        }
                    });
                }
            }

            for (const pu of eng.powerups)
            {
                const z = eng.tiles[pu.y]?.[pu.x]?.z || 0;
                entities.push({
                    depth: pu.x + pu.y + 0.15,
                    draw: () =>
                    {
                        const p = tileToCanvas(pu.x, pu.y, z, eng);
                        const bob = Math.sin(pu.bobPhase) * 2.5 * sc;
                        // Subtle shadow + official crisp pixel power-up sprite!
                        ctx.fillStyle = 'rgba(0,0,0,0.3)';
                        ctx.beginPath();
                        ctx.ellipse(p.sx, p.sy + hh + 1 * sc, 8 * sc, 3.8 * sc, 0, 0, Math.PI * 2);
                        ctx.fill();

                        const sp = puSpritesRef.current[pu.kind];
                        const sz = 24 * sc;
                        if (sp)
                        {
                            ctx.drawImage(sp, p.sx - sz / 2, p.sy + hh - sz + 3 * sc + bob, sz, sz);
                        }
                    }
                });
            }

            for (const pl of eng.players)
            {
                const tProg = pl.hopping ? pl.hopProgress : 1;
                const fx = pl.hopping ? pl.fromX + (pl.toX - pl.fromX) * tProg : pl.gx;
                const fy = pl.hopping ? pl.fromY + (pl.toY - pl.fromY) * tProg : pl.gy;
                const zFrom = eng.tiles[pl.fromY]?.[pl.fromX]?.z || 0;
                const zTo = eng.tiles[pl.toY]?.[pl.toX]?.z || 0;
                const fz = pl.hopping ? zFrom + (zTo - zFrom) * tProg : (eng.tiles[pl.gy]?.[pl.gx]?.z || 0);

                entities.push({
                    depth: fx + fy + 0.4,
                    draw: () =>
                    {
                        const p = tileToCanvas(fx, fy, fz, eng);
                        const arc = pl.hopping ? Math.sin(tProg * Math.PI) * 14 * sc : Math.abs(Math.sin(performance.now() / 240 + pl.gx)) * 2.2 * sc;
                        const cx = p.sx;
                        const cy = p.sy + hh;
                        const meta = TEAM_META[pl.team];

                        // Ground shadow
                        ctx.fillStyle = 'rgba(0,0,0,0.34)';
                        ctx.beginPath();
                        ctx.ellipse(cx, cy + 1 * sc, (8.5 - arc * 0.14) * sc, (4.0 - arc * 0.06) * sc, 0, 0, Math.PI * 2);
                        ctx.fill();

                        // Crisp Habbo isometric tile diamond outline under human player (same shape as the floor square!)
                        if (pl.isHuman)
                        {
                            const curZ = eng.tiles[pl.gy]?.[pl.gx]?.z || 0;
                            const tp = tileToCanvas(pl.gx, pl.gy, curZ, eng);
                            ctx.strokeStyle = '#ffeb55';
                            ctx.lineWidth = Math.max(1.2, 1.5 * sc);
                            ctx.beginPath();
                            ctx.moveTo(tp.sx, tp.sy + 1.2 * sc);
                            ctx.lineTo(tp.sx + hw - 1.4 * sc, tp.sy + hh);
                            ctx.lineTo(tp.sx, tp.sy + hh * 2 - 1.2 * sc);
                            ctx.lineTo(tp.sx - hw + 1.4 * sc, tp.sy + hh);
                            ctx.closePath();
                            ctx.stroke();
                        }

                        // 1. Official plump round Habbo Battle Ball Space Hopper drawn UNDER the seated avatar!
                        //    Exact 1:1 Habbo Origins proportions on 32x16 tiles (~22x20px plump hopper, ~12px clearly visible below seated legs!)
                        const squash = pl.hopping ? (1 + Math.sin(tProg * Math.PI) * 0.08) : 1;
                        const ballRx = (11.0 / squash) * sc;
                        const ballRy = (9.8 * squash) * sc;
                        const ballY = cy - ballRy * 0.85 - arc;

                        ctx.fillStyle = meta.hopper;
                        ctx.strokeStyle = '#000000';
                        ctx.lineWidth = Math.max(1, 1.3 * sc);
                        ctx.beginPath();
                        ctx.ellipse(cx, ballY, ballRx, ballRy, 0, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.stroke();

                        // Rich lower-belly crescent shading (authentic Habbo pixel volume)
                        ctx.fillStyle = meta.hopperDark;
                        ctx.beginPath();
                        ctx.ellipse(cx, ballY + 2.2 * sc, ballRx * 0.86, ballRy * 0.72, 0, Math.PI * 0.08, Math.PI * 0.92);
                        ctx.fill();

                        // Soft glossy top-left rubber sheen on the Space Hopper
                        ctx.fillStyle = 'rgba(255,255,255,0.40)';
                        ctx.beginPath();
                        ctx.ellipse(cx - 3.6 * sc, ballY - 2.6 * sc, 3.2 * sc, 2.0 * sc, -0.35, 0, Math.PI * 2);
                        ctx.fill();

                        // 2. REAL Habbo Seated/Mounted Avatar (AvatarAction.POSTURE_SIT) perched HIGH ON TOP of the ball!
                        //    Bottom of seated avatar rests at `ballY - 2.5 * sc` so ~12px of plump hopper stays 100% visible underneath!
                        const sitImg = bodyCacheRef.current.get(`${ pl.figure }__sit__${ pl.isoDir }`)
                            || bodyCacheRef.current.get(`${ pl.figure }__sit__2`);
                        if (sitImg && sitImg.naturalWidth > 0)
                        {
                            const drawH = 34 * sc;
                            const drawW = (sitImg.naturalWidth / sitImg.naturalHeight) * drawH;
                            const prevSmooth = ctx.imageSmoothingEnabled;
                            ctx.imageSmoothingEnabled = false;
                            ctx.drawImage(
                                sitImg,
                                cx - drawW / 2,
                                ballY - drawH - 2.0 * sc,
                                drawW,
                                drawH
                            );
                            ctx.imageSmoothingEnabled = prevSmooth;
                        }

                        // Dizzy stars when stunned by Bomb or Chinchetas
                        if (pl.stunTimer > 0)
                        {
                            const ang = performance.now() / 160;
                            for (let s = 0; s < 3; s++)
                            {
                                const a = ang + (s * Math.PI * 2) / 3;
                                ctx.fillStyle = '#ffe640';
                                ctx.strokeStyle = '#000000';
                                ctx.lineWidth = 0.8;
                                ctx.beginPath();
                                ctx.arc(cx + Math.cos(a) * 9 * sc, ballY - 40 * sc + Math.sin(a) * 3 * sc, 2.2 * sc, 0, Math.PI * 2);
                                ctx.fill();
                                ctx.stroke();
                            }
                        }
                    }
                });
            }

            entities.sort((a, b) => a.depth - b.depth);
            for (const ent of entities) ent.draw();

            // 5. Floating Score Popups (+14, ¡CIERRE!, ¡BOOM!)
            for (const pop of eng.popups)
            {
                const p = tileToCanvas(pop.x, pop.y, pop.z, eng);
                const frac = 1 - pop.life / pop.maxLife;
                ctx.save();
                ctx.globalAlpha = Math.max(0, 1 - frac);
                ctx.font = `900 ${ Math.max(11, Math.round(11.5 * sc)) }px Ubuntu, Tahoma, sans-serif`;
                ctx.textAlign = 'center';
                ctx.lineWidth = 3;
                ctx.strokeStyle = '#000000';
                ctx.strokeText(pop.text, p.sx, p.sy - 14 * sc - frac * 24 * sc);
                ctx.fillStyle = pop.color;
                ctx.fillText(pop.text, p.sx, p.sy - 14 * sc - frac * 24 * sc);
                ctx.restore();
            }

            // 6. Authentic Habbo Room Speech Bubbles (anchored horizontally above each speaker + scrolling upward!)
            for (const ch of eng.chats)
            {
                ctx.save();
                const alpha = ch.life < 1.0 ? Math.max(0, ch.life) : (ch.y < 14 ? Math.max(0, (ch.y + 16) / 30) : 1);
                ctx.globalAlpha = alpha;
                ctx.font = '800 11.5px Ubuntu, Tahoma, sans-serif';
                const prefix = `${ ch.name }: `;
                const pw = ctx.measureText(prefix).width;
                ctx.font = `${ ch.shout ? '800' : '400' } 11.5px Ubuntu, Tahoma, sans-serif`;
                const mw = ctx.measureText(ch.text).width;
                const boxW = Math.round(pw + mw + 18);
                const boxH = 20;

                const sp = tileToCanvas(ch.gx, ch.gy, ch.z, eng);
                const bx = Math.max(14, Math.min(cssW - boxW - 14, Math.round(sp.sx - boxW / 2)));
                const by = Math.round(ch.y);

                ctx.fillStyle = '#ffffff';
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = ch.shout ? 2.0 : 1.2;
                ctx.beginPath();
                ctx.roundRect(bx, by, boxW, boxH, 9);
                ctx.fill();
                ctx.stroke();

                ctx.textAlign = 'left';
                ctx.fillStyle = '#000000';
                ctx.font = '800 11.5px Ubuntu, Tahoma, sans-serif';
                ctx.fillText(prefix, bx + 9, by + 14);
                ctx.font = `${ ch.shout ? '800' : '400' } 11.5px Ubuntu, Tahoma, sans-serif`;
                ctx.fillText(ch.text, bx + 9 + pw, by + 14);
                ctx.restore();
            }
        };

        const loop = (now: number) =>
        {
            const dt = Math.min(0.05, (now - lastTs) / 1000);
            lastTs = now;
            if (stage === 'playing' && !showLeaveModal && !showHelpModal && !showLeaderboardModal)
            {
                update(dt);
            }
            render();
            rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);

        return () =>
        {
            cancelAnimationFrame(rafId);
            canvas.removeEventListener('mousedown', handlePointerDown);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            keysRef.current.clear();
        };
    }, [ stage, showLeaveModal, showHelpModal, showLeaderboardModal, handleFinishMatch, triggerMyPowerUp, activatePowerUp, showPowerUpToast, pushChatBubble ]);

    const formatTime = (sec: number) => `${ Math.floor(sec / 60) }:${ String(sec % 60).padStart(2, '0') }`;

    const maxLiveScore = useMemo(() =>
    {
        return Math.max(40, hud.scores.red, hud.scores.blue, hud.scores.green, hud.scores.yellow);
    }, [ hud.scores ]);

    const sortedTeams = useMemo(() =>
    {
        return ([ 'red', 'blue', 'green', 'yellow' ] as Team[]).sort((a, b) => finalTeamScores[b] - finalTeamScores[a]);
    }, [ finalTeamScores ]);

    const mvpPlayer = useMemo(() =>
    {
        if (finalPlayers.length === 0) return null;
        return [ ...finalPlayers ].sort((a, b) => b.score - a.score)[0];
    }, [ finalPlayers ]);

    return (
        <div className="battleball-game-root">
            {/* Hidden looping official Battle Ball background soundtrack (https://www.youtube.com/watch?v=hNqAvTN2B3s) */}
            { stage === 'playing' && (
                <iframe
                    ref={ ytIframeRef }
                    className="bb-yt-hidden"
                    title="Battle Ball Soundtrack"
                    allow="autoplay; encrypted-media"
                    src={ `https://www.youtube.com/embed/${ YT_VIDEO_ID }?autoplay=1&loop=1&playlist=${ YT_VIDEO_ID }&enablejsapi=1&controls=0&playsinline=1&rel=0` }
                />
            ) }

            {/* ============================================================
                ALWAYS-LIVE OFFICIAL BATTLE BALL MOUNTAIN ARENA + TERRACOTTA HUD
               ============================================================ */}
            <div className="bb-arena-layout">
                <div className="bb-canvas-area">
                    <canvas ref={ canvasRef } className="bb-arena-canvas" />

                    {/* Top-Left Habbo Origins / Shockwave 2006 Scoreboard & Timer */}
                    { stage === 'playing' && (
                        <div className="bb-sw-scoreboard">
                            <div className={ `bb-sw-timer-pill ${ hud.timeLeft <= 15 ? 'is-urgent' : '' }` }>
                                Tiempo restante { formatTime(hud.timeLeft) }
                            </div>
                            <div className="bb-sw-bars-well">
                                { ([
                                    [ 'red', 'Rojo' ],
                                    [ 'blue', 'Azul' ],
                                    [ 'green', 'Verde' ],
                                    [ 'yellow', 'Amarillo' ]
                                ] as Array<[ Team, string ]>).map(([ team, label ]) =>
                                {
                                    const val = hud.scores[team];
                                    const pct = Math.min(100, Math.round((val / maxLiveScore) * 100));
                                    return (
                                        <div key={ team } className={ `bb-sw-team-bar-row ${ team === 'red' ? 'is-mine' : '' }` }>
                                            <div className={ `bb-sw-team-bar-fill ${ team }` } style={{ width: `${ pct }%` }} />
                                            <div className="bb-sw-team-bar-label">
                                                <span>{ label }</span>
                                                <span>{ val }</span>
                                            </div>
                                        </div>
                                    );
                                }) }
                            </div>
                            <div className="bb-sw-lock-foot">
                                <span>{ activeArena.name }</span>
                                <span>{ hud.lockPct }% sellado</span>
                            </div>
                        </div>
                    ) }

                    {/* Top-Right Authentic Habbo Battle Ball Power-Up Toast (matches Bomba ref!) */}
                    { stage === 'playing' && (
                        <MobileJoystick
                            className="is-battleball"
                            onVectorChange={ (vx, vy, phase) =>
                            {
                                if (phase === 'end')
                                {
                                    joyVecRef.current = { x: 0, y: 0 };
                                    return;
                                }
                                joyVecRef.current = { x: vx, y: vy };
                                if (phase === 'start' && Math.hypot(vx, vy) > 0.18)
                                {
                                    joyPendingTapRef.current = { x: vx, y: vy };
                                }
                                else if (phase === 'move')
                                {
                                    joyPendingTapRef.current = null;
                                }
                            } }
                        />
                    ) }
                    { stage === 'playing' && puToast && (
                        <div className="bb-sw-pu-toast">
                            <div className="bb-sw-pu-toast-orb">
                                <div className="bb-sw-pu-toast-inner">
                                    <img src={ POWERUP_META[puToast.kind].img } alt={ puToast.label } />
                                </div>
                            </div>
                            <div className="bb-sw-pu-toast-pill">
                                <span>{ puToast.label }</span>
                            </div>
                        </div>
                    ) }

                    { stage === 'playing' && (hud.springLeft > 0 || hud.stunLeft > 0) && (
                        <div className="bb-effect-banner">
                            { hud.stunLeft > 0
                                ? `¡Aturdido! (${ hud.stunLeft }s)`
                                : `¡Resorte activo — sella en 1 salto! (${ hud.springLeft }s)` }
                        </div>
                    ) }

                    {/* ============================================================
                        STAGE A OVERLAY: "El juego va a empezar" (matches screenshot #3!)
                       ============================================================ */}
                    { stage === 'lobby' && (
                        <div className="bb-overlay-center">
                            <div className="bb-starting-box">
                                <div className="bb-starting-title-pill">El juego va a empezar</div>
                                <div className="bb-starting-well">
                                    <div className="bb-starting-bar-track">
                                        <div className="bb-starting-bar-fill" style={{ width: `${ Math.round(preProgress) }%` }} />
                                    </div>
                                    <div className="bb-starting-divider" />
                                    <button type="button" className="bb-sw-pill-btn" onClick={ exitToGameCenter }>
                                        Abandonar
                                    </button>
                                </div>
                                <div className="bb-starting-footer-pills">
                                    <span className="bb-starting-pill">
                                        { gamesLeftInfo.hasUnlimited ? '∞ HC' : `${ String(gamesLeftInfo.gamesLeft).padStart(3, '0') }` }
                                    </span>
                                    <span className="bb-starting-pill is-wide">
                                        Equipo Rojo · { activeArena.name }
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) }

                    {/* ============================================================
                        STAGE C OVERLAY: "Resultados finales:" + "El mejor jugador ha sido:"
                        (matches screenshot #2 directly over the finished painted arena!)
                       ============================================================ */}
                    { stage === 'results' && (
                        <div className="bb-overlay-center">
                            <div className="bb-results-window">
                                <div className="bb-results-top-bar">
                                    <div className="bb-results-title-pill">Battle Ball</div>
                                </div>

                                <div className="bb-results-columns">
                                    {/* Left Column: Resultados finales */}
                                    <div className="bb-results-col-left">
                                        <div className="bb-results-heading">Resultados finales:</div>

                                        { sortedTeams.map((team, idx) => (
                                            <div key={ team } className="bb-res-team-row">
                                                <div className="bb-res-team-badge">
                                                    <div className={ `bb-res-hopper-dot ${ team }` } />
                                                    <div className="bb-res-team-total">{ finalTeamScores[team] }</div>
                                                </div>
                                                <div className="bb-res-team-players">
                                                    <div className="bb-res-rank-icon">
                                                        { idx === 0 ? <PixelTrophySvg size={ 18 } /> : <PixelLollipopSvg size={ 18 } /> }
                                                    </div>
                                                    <div className="bb-res-player-list">
                                                        { finalPlayers
                                                            .filter(p => p.team === team)
                                                            .sort((a, b) => b.score - a.score)
                                                            .map(p => (
                                                                <div key={ p.id } className={ `bb-res-player-line ${ p.isHuman ? 'is-me' : '' }` }>
                                                                    <span className="bb-res-pname">
                                                                        { p.name }
                                                                        { p.isHuman && <span className="bb-res-me-tag">TÚ</span> }
                                                                    </span>
                                                                    <span className="bb-res-pscore">{ p.score }</span>
                                                                </div>
                                                            )) }
                                                    </div>
                                                </div>
                                            </div>
                                        )) }
                                    </div>

                                    {/* Right Column: El mejor jugador ha sido: + Starburst MVP + Siguiente Juego */}
                                    <div className="bb-results-col-right">
                                        <div className="bb-mvp-section">
                                            <div className="bb-results-heading">El mejor jugador ha sido:</div>
                                            <div className="bb-mvp-starburst-wrap">
                                                <MvpStarburstSvg />
                                                { mvpPlayer && (
                                                    <HabboFullAvatarImg
                                                        figure={ mvpPlayer.figure }
                                                        direction={ 2 }
                                                        className="bb-mvp-avatar-img"
                                                    />
                                                ) }
                                            </div>
                                        </div>

                                        { mvpPlayer && (
                                            <div className="bb-mvp-name-bar">
                                                <span className="bb-mvp-name-left">
                                                    <PixelTrophySvg size={ 17 } />
                                                    <span>{ mvpPlayer.name }</span>
                                                </span>
                                                <span>{ mvpPlayer.score }</span>
                                            </div>
                                        ) }

                                        <div className="bb-next-game-section">
                                            <div className="bb-next-title">Siguiente Juego</div>
                                            <div className="bb-next-timer-bar">
                                                { formatTime(rematchCountdown) } segundos para entrar
                                            </div>
                                            <div className="bb-next-progress-track">
                                                <div
                                                    className="bb-next-progress-fill"
                                                    style={{ width: `${ Math.round(((22 - rematchCountdown) / 22) * 100) }%` }}
                                                />
                                                <span className="bb-next-star">★</span>
                                            </div>
                                        </div>

                                        <div className="bb-next-actions-box">
                                            <button
                                                type="button"
                                                className="bb-sw-pill-btn"
                                                disabled={ rematchBusy }
                                                onClick={ handleRematch }
                                            >
                                                { rematchBusy ? 'Cargando...' : 'Juega otra vez' }
                                            </button>
                                            <button
                                                type="button"
                                                className="bb-sw-pill-btn"
                                                onClick={ exitToGameCenter }
                                            >
                                                Abandonar
                                            </button>
                                            { rematchError && (
                                                <div style={{ fontSize: '10px', fontWeight: 800, color: '#8f1111', textAlign: 'center' }}>
                                                    { rematchError }
                                                </div>
                                            ) }
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Rewards Strip (Real Habbten currencies + Official Battle Ball Badges!) */}
                                <div className="bb-results-rewards-bar">
                                    { finishData?.rewards ? (
                                        <>
                                            <div className="bb-rewards-currencies">
                                                <span className="bb-reward-stat">
                                                    <img src={ puSpringImg } alt="Puntos" />
                                                    <span>+{ finishData.rewards.score } pts</span>
                                                </span>
                                                <span className="bb-reward-stat is-duckets">
                                                    <img src={ ducketIconImg } alt="Duckets" />
                                                    <span>+{ finishData.rewards.duckets } Duckets</span>
                                                </span>
                                                { finishData.rewards.credits > 0 && (
                                                    <span className="bb-reward-stat is-credits">
                                                        <img src={ creditIconImg } alt="Créditos" />
                                                        <span>+{ finishData.rewards.credits } Créditos</span>
                                                    </span>
                                                ) }
                                            </div>
                                            { (finishData.unlocked_achievements && finishData.unlocked_achievements.length > 0) && (
                                                <div className="bb-badges-unlocked">
                                                    { finishData.unlocked_achievements.map(a =>
                                                    {
                                                        const badgeTemplate = GetConfiguration<string>('badge.asset.url', '/game/swf/c_images/album1584/%badgename%.gif');
                                                        const badgeSrc = badgeTemplate.replace('%badgename%', a.badge);
                                                        return (
                                                            <div key={ a.badge } className="bb-badge-unlock-item">
                                                                <img src={ badgeSrc } alt={ a.title } />
                                                                <div>
                                                                    <span className="bb-badge-kicker">¡Placa desbloqueada!</span>
                                                                    <span className="bb-badge-name">{ a.title }</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    }) }
                                                </div>
                                            ) }
                                        </>
                                    ) : (
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#ffffff' }}>
                                            Registrando recompensas en Habbten...
                                        </span>
                                    ) }
                                </div>
                            </div>
                        </div>
                    ) }
                </div>

                {/* Authentic Terracotta Shockwave 2006 Battle Ball Bottom Bar (1:1 Habbten 2006 Client Toolbar Structure!) */}
                <div className="bb-bottom-hud" onClick={ () => { if (chatModeOpen) setChatModeOpen(false); } }>
                    <div className="bb-hud-marquee" style={{ backgroundImage: `url(${ hudMarqueeTileImg })` }} />

                    <div
                        className="bb-hud-zone-avatar"
                        onMouseEnter={ () => setHoverLabel('Mi Personaje') }
                        onMouseLeave={ () => setHoverLabel('') }
                    >
                        <HabboHeadImg figure={ myFigure } direction={ 3 } size={ 36 } shockwaveSmall={ true } />
                    </div>

                    <div className="bb-hud-zone-chat">
                        <div className="bb-sw2006-chat-pill">
                            <button
                                type="button"
                                className="bb-sw2006-mode-btn"
                                onMouseEnter={ () => setHoverLabel('Modo de chat') }
                                onMouseLeave={ () => setHoverLabel('') }
                                onClick={ e => { e.stopPropagation(); setChatModeOpen(prev => !prev); } }
                            >
                                <span className="bb-mode-label">
                                    { chatMode === 'say' ? 'Decir' : 'Gritar' }
                                </span>
                                <span className="bb-mode-divider" />
                                <span className="bb-mode-arrow">▼</span>
                            </button>

                            { chatModeOpen && (
                                <div className="bb-sw2006-mode-menu" onClick={ e => e.stopPropagation() }>
                                    <button
                                        type="button"
                                        className={ `bb-sw2006-mode-item ${ chatMode === 'say' ? 'is-active' : '' }` }
                                        onClick={ () => { setChatMode('say'); setChatModeOpen(false); chatInputRef.current?.focus(); } }
                                    >
                                        Decir
                                    </button>
                                    <button
                                        type="button"
                                        className={ `bb-sw2006-mode-item ${ chatMode === 'shout' ? 'is-active' : '' }` }
                                        onClick={ () => { setChatMode('shout'); setChatModeOpen(false); chatInputRef.current?.focus(); } }
                                    >
                                        Gritar
                                    </button>
                                </div>
                            ) }

                            <form className="bb-sw-chat-form" onSubmit={ handleChatSubmit }>
                                <input
                                    ref={ chatInputRef }
                                    type="text"
                                    maxLength={ 64 }
                                    placeholder=""
                                    aria-label="Hablar en Battle Ball"
                                    value={ chatText }
                                    onKeyDown={ e => e.stopPropagation() }
                                    onChange={ e => setChatText(e.target.value) }
                                />
                            </form>
                        </div>

                        <div className="bb-sw2006-hover-label">{ hoverLabel }</div>
                    </div>

                    <div className="bb-hud-zone-powerup">
                        <div
                            className="bb-pu-preview-box"
                            onMouseEnter={ () => setHoverLabel(hud.springLeft > 0 ? `Resorte activo (${ hud.springLeft }s)` : 'Ranura de poder') }
                            onMouseLeave={ () => setHoverLabel('') }
                        >
                            { hud.springLeft > 0 ? (
                                <span className="bb-pu-preview-timer">{ hud.springLeft }s</span>
                            ) : hud.heldPowerUp ? (
                                <img src={ POWERUP_META[hud.heldPowerUp].img } alt="" />
                            ) : null }
                        </div>
                        <span className="bb-pu-arrow" />
                        <button
                            type="button"
                            className={ `bb-pu-trigger-btn ${ hud.heldPowerUp ? 'has-powerup' : '' }` }
                            onClick={ triggerMyPowerUp }
                            onMouseEnter={ () => setHoverLabel(hud.heldPowerUp ? `Usar ${ POWERUP_META[hud.heldPowerUp].name } (Espacio)` : 'Sin poder activo') }
                            onMouseLeave={ () => setHoverLabel('') }
                        >
                            { hud.heldPowerUp ? (
                                <img src={ POWERUP_META[hud.heldPowerUp].img } alt={ POWERUP_META[hud.heldPowerUp].name } />
                            ) : (
                                <img src={ hudNoPowerupImg } alt="Sin poder" className="bb-pu-empty-img" />
                            ) }
                        </button>
                    </div>

                    <div className="bb-hud-zone-icons">
                        <button
                            type="button"
                            className={ `bb-sw-icon-btn ${ musicMuted ? 'is-muted' : '' }` }
                            onMouseEnter={ () => setHoverLabel(musicMuted ? 'Activar música' : 'Silenciar música') }
                            onMouseLeave={ () => setHoverLabel('') }
                            onClick={ toggleMusic }
                        >
                            <img src={ hudMusicIconImg } alt="Música" className="bb-ico-audio" />
                        </button>
                        <button
                            type="button"
                            className={ `bb-sw-icon-btn ${ sfxMuted ? 'is-muted' : '' }` }
                            onMouseEnter={ () => setHoverLabel(sfxMuted ? 'Activar sonidos' : 'Silenciar sonidos') }
                            onMouseLeave={ () => setHoverLabel('') }
                            onClick={ toggleSfx }
                        >
                            <img src={ hudSfxIconImg } alt="Sonidos" className="bb-ico-audio" />
                        </button>
                        <button
                            type="button"
                            className="bb-sw-icon-btn"
                            onMouseEnter={ () => setHoverLabel('Clasificación de Battle Ball') }
                            onMouseLeave={ () => setHoverLabel('') }
                            onClick={ () => setShowLeaderboardModal(true) }
                        >
                            <img src={ clubClipboardImg } alt="Ranking" className="bb-ico-rank" />
                        </button>
                        <button
                            type="button"
                            className="bb-sw-icon-btn"
                            onMouseEnter={ () => setHoverLabel('Salir al Hotel') }
                            onMouseLeave={ () => setHoverLabel('') }
                            onClick={ () => setShowLeaveModal(true) }
                        >
                            <img src={ hudExitHotelImg } alt="Salir" className="bb-ico-hotel" />
                        </button>
                        <button
                            type="button"
                            className="bb-sw-icon-btn"
                            onMouseEnter={ () => setHoverLabel('Ayuda de Battle Ball') }
                            onMouseLeave={ () => setHoverLabel('') }
                            onClick={ () => setShowHelpModal(true) }
                        >
                            <img src={ hudHelpIconImg } alt="Ayuda" className="bb-ico-help" />
                        </button>
                    </div>
                </div>

                {/* Authentic Shockwave 2006 Leave Confirmation Modal */}
                { showLeaveModal && (
                    <div className="bb-modal-backdrop">
                        <div className="bb-sw-window is-compact">
                            <div className="bb-sw-header">
                                <span className="bb-sw-dots" />
                                <span className="bb-sw-title">¿Salir de Battle Ball?</span>
                                <span className="bb-sw-dots" />
                                <button type="button" className="bb-sw-close" title="Cerrar" aria-label="Cerrar" onClick={ () => setShowLeaveModal(false) }>
                                </button>
                            </div>
                            <div className="bb-sw-body">
                                <div style={{ fontSize: '12px', lineHeight: 1.45, color: '#111827' }}>
                                    Si sales de la partida de <b>Battle Ball</b> antes de terminar, no se guardarán los puntos ni las recompensas acumuladas en esta ronda.
                                </div>
                                <div className="bb-sw-footer">
                                    <button type="button" className="bb-sw-btn" onClick={ () => setShowLeaveModal(false) }>
                                        Seguir jugando
                                    </button>
                                    <button type="button" className="bb-sw-btn is-danger" onClick={ exitToGameCenter }>
                                        Salir al Game Center
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) }

                {/* Authentic Shockwave 2006 Help Modal */}
                { showHelpModal && (
                    <div className="bb-modal-backdrop">
                        <div className="bb-sw-window is-wide">
                            <div className="bb-sw-header">
                                <span className="bb-sw-dots" />
                                <span className="bb-sw-title">Cómo jugar a Battle Ball</span>
                                <span className="bb-sw-dots" />
                                <button type="button" className="bb-sw-close" title="Cerrar" aria-label="Cerrar" onClick={ () => setShowHelpModal(false) }>
                                </button>
                            </div>
                            <div className="bb-sw-body">
                                <div style={{ fontSize: '11.5px', lineHeight: 1.5, color: '#111827', background: '#ffffff', border: '1px solid #8a9599', borderRadius: '3px', padding: '8px 10px' }}>
                                    • <b>Mover tu saltador:</b> haz clic en cualquier casilla (incluso en las plataformas con escaleras) o usa <b>W A S D / Flechas</b>.<br />
                                    • <b>Sellar casillas:</b> salta <b>3 veces</b> sobre una casilla para bloquearla definitivamente (+14 pts).<br />
                                    • <b>Cierre de área (Fast-Lock):</b> rodea un área con tus casillas selladas para capturar todo el interior al instante.<br />
                                    • <b>Usar poder:</b> recoge objetos del suelo y pulsa <b>Espacio</b> (o haz clic en la ranura de poder).
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', fontSize: '11px' }}>
                                    { POWERUP_KINDS.map(k => (
                                        <div key={ k } style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', padding: '4px 6px', borderRadius: '3px', border: '1px solid #7d878c' }}>
                                            <img src={ POWERUP_META[k].img } alt="" style={{ width: '20px', height: '20px' }} />
                                            <div><b>{ POWERUP_META[k].name }:</b> { POWERUP_META[k].desc }</div>
                                        </div>
                                    )) }
                                </div>
                                <div className="bb-sw-footer is-center">
                                    <button type="button" className="bb-sw-btn is-primary" onClick={ () => setShowHelpModal(false) }>
                                        Entendido
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) }

                {/* Authentic Shockwave 2006 Live Leaderboard Modal */}
                { showLeaderboardModal && (
                    <div className="bb-modal-backdrop">
                        <div className="bb-sw-window is-wide">
                            <div className="bb-sw-header">
                                <span className="bb-sw-dots" />
                                <span className="bb-sw-title">Clasificación de Battle Ball</span>
                                <span className="bb-sw-dots" />
                                <button type="button" className="bb-sw-close" title="Cerrar" aria-label="Cerrar" onClick={ () => setShowLeaderboardModal(false) }>
                                </button>
                            </div>
                            <div className="bb-sw-body">
                                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                    { ([
                                        [ 'week', 'Semana' ],
                                        [ 'all', 'Histórico' ],
                                        [ 'friends', 'Amigos' ],
                                        [ 'history', 'Mis partidas' ]
                                    ] as const).map(([ k, label ]) => (
                                        <button
                                            key={ k }
                                            type="button"
                                            className={ `bb-sw-btn ${ lbTab === k ? 'is-active' : '' }` }
                                            onClick={ () => setLbTab(k) }
                                        >
                                            { label }
                                        </button>
                                    )) }
                                </div>
                                <div className="bb-sw-list-box">
                                    { lbLoading ? (
                                        <div style={{ textAlign: 'center', padding: '24px', color: '#4b5563' }}>Cargando...</div>
                                    ) : lbTab === 'history' ? (
                                        historyRows.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '24px', color: '#4b5563' }}>Aún no has completado partidas de Battle Ball.</div>
                                        ) : (
                                            historyRows.map(m => (
                                                <div key={ m.id } className="bb-sw-list-row" style={{ justifyContent: 'space-between' }}>
                                                    <span><b>{ m.arena_name }</b> ({ m.tiles_locked } selladas)</span>
                                                    <span style={{ fontWeight: 800, color: m.winner_team === m.team ? '#15803d' : '#b91c1c' }}>
                                                        { m.score } pts · +{ m.reward_duckets }D{ m.reward_credits > 0 ? ` +${ m.reward_credits }C` : '' }
                                                    </span>
                                                </div>
                                            ))
                                        )
                                    ) : lbEntries.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '24px', color: '#4b5563' }}>¡Sé el primero en entrar en el ranking!</div>
                                    ) : (
                                        lbEntries.map(e => (
                                            <div key={ e.userId } className="bb-sw-list-row">
                                                <b style={{ width: '20px', color: e.rank === 1 ? '#b45309' : '#1e40af' }}>{ e.rank }</b>
                                                <HabboHeadImg figure={ e.figure } direction={ 2 } size={ 28 } shockwaveSmall={ true } />
                                                <div style={{ flex: 1 }}>
                                                    <b>{ e.username }</b>
                                                    <div style={{ fontSize: '10px', color: '#4b5563' }}>{ e.wins } victorias · { e.tilesLocked } casillas selladas</div>
                                                </div>
                                                <b style={{ color: '#0e7490' }}>{ e.score.toLocaleString('es-ES') }</b>
                                            </div>
                                        ))
                                    ) }
                                </div>
                                <div className="bb-sw-footer is-center">
                                    <button type="button" className="bb-sw-btn" onClick={ () => setShowLeaderboardModal(false) }>
                                        Cerrar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) }
            </div>
        </div>
    );
};
