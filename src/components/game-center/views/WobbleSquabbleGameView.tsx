import { AvatarAction, AvatarScaleType, AvatarSetType, IAvatarImageListener } from '@nitrots/nitro-renderer';
import { FC, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GetAvatarRenderManager, GetConfiguration, GetSessionDataManager, isShockwaveSmallFigureReady, onShockwaveSmallAtlasReady, renderShockwaveSmallDataUrl } from '../../../api';
import { useGameCenter, useGamePresence } from '../../../hooks';
import { HabboHeadImg, trimTransparentImage } from './SnowStormAvatar';

// Authentic widescreen (1120x484) Habbo Rooftop Rumble Pool backdrop + Shockwave pixel-art FX bursts
import wsRooftopWideImg from '../../../assets/images/gamecenter/wobblesquabble/ws_rooftop_wide.png';
import wsFxWhackImg from '../../../assets/images/gamecenter/wobblesquabble/ws_fx_whack.png';
import wsFxZzzapImg from '../../../assets/images/gamecenter/wobblesquabble/ws_fx_zzzap.png';
import wsFxClunkImg from '../../../assets/images/gamecenter/wobblesquabble/ws_fx_clunk.png';
import wsFxSwoooshImg from '../../../assets/images/gamecenter/wobblesquabble/ws_fx_swooosh.png';
import wsFxSplashImg from '../../../assets/images/gamecenter/wobblesquabble/ws_fx_splash.png';

// Authentic Shockwave 2006 HUD icons (shared with Battle Ball / Habbten 2006)
import hudSfxIconImg from '../../../assets/images/gamecenter/battleball/hud_sfx_icon.png';
import hudExitHotelImg from '../../../assets/images/gamecenter/battleball/hud_exit_hotel.png';
import hudHelpIconImg from '../../../assets/images/gamecenter/battleball/hud_help_icon.png';
import clubClipboardImg from '../../../assets/images/eras/shockwave_v14/club_clipboard.png';
import shockwaveArrowOrangeImg from '../../../assets/images/eras/shockwave_v14/shockwave_arrow_orange.png';
import creditIconImg from '../../../assets/images/eras/flash2012/purse/credit_icon.png';
import ducketIconImg from '../../../assets/images/eras/flash2012/purse/ducket_icon.png';

import './WobbleSquabbleGameView.scss';

// =============================================================================
// CONSTANTS & EXACT ROOFTOP RUMBLE PIXEL GEOMETRY (1120x484)
// =============================================================================
const BG_W = 1120;
const BG_H = 484;
const SCENE_CENTER_X = 560;

// Giant Live Jumbotron TV Screen ("FUSE SHOW SYSTEM" billboard on the right cliff)
const TV_X = 775;
const TV_Y = 112;
const TV_W = 111;
const TV_H = 105;

// 11 inflatable buoys along the pool bar (exact +16, -8 isometric pitch)
// Buoy 0..1 = left queue, Buoy 2..8 = 7 battle positions (pos 0..6), Buoy 9..10 = right queue
const BUOY_BASE_X = 507;
const BUOY_BASE_Y = 412;
const BUOY_STEP_X = 16;
const BUOY_STEP_Y = -8;
const BATTLE_MIN_POS = 0;
const BATTLE_MAX_POS = 6;

const buoyXY = (buoyIndex: number) => ({
    x: BUOY_BASE_X + buoyIndex * BUOY_STEP_X,
    y: BUOY_BASE_Y + buoyIndex * BUOY_STEP_Y
});

const ROUND_DURATION = 45;
const WINS_NEEDED = 2;
const STABILISE_COOLDOWN = 1.65;
const PUSH_COOLDOWN = 0.36;
const MOVE_COOLDOWN = 0.22;

type GameStage = 'lobby' | 'playing' | 'results';
type ComicKind = 'WHACK!' | 'ZZZAP!' | 'CLUNK!' | 'SWOOOSH!' | '¡AL AGUA!';

interface FighterState {
    name: string;
    figure: string;
    swimFigure: string;
    isHuman: boolean;
    pos: number;            // integer buoy battle slot 0..6
    visualPos: number;      // smoothly interpolated 0..6
    balance: number;        // -100 (left/green) .. +100 (right/orange)
    balanceVel: number;
    leanVis: number;        // visual lean angle factor
    pushAnim: number;       // >0 during push lunge
    pushDir: -1 | 1;        // -1 = left push (A), +1 = right push (D)
    pushCd: number;
    moveCd: number;
    stabCd: number;
    lastPushTs: number;
    falling: boolean;
    fallTime: number;
    fallSide: -1 | 1;       // falls off left/front or right/back of buoy into pool
    inWater: boolean;
    roundsWon: number;
    hitsLanded: number;
    knockoffs: number;
}

interface ComicPopup {
    id: number;
    text: ComicKind;
    bx: number;
    by: number;
    life: number;
    maxLife: number;
    color: string;
    bg: string;
}

interface SplashDrop {
    bx: number;
    by: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    size: number;
}

interface WaterRipple {
    bx: number;
    by: number;
    r: number;
    maxR: number;
    life: number;
    maxLife: number;
}

interface ChatBubble {
    id: number;
    name: string;
    text: string;
    shout: boolean;
    bx: number;
    by: number;
    y: number;
    life: number;
}

interface SpectatorNpc {
    name: string;
    figure: string;
    bx: number;
    by: number;
    dir: number;
    kind: 'sofa' | 'swimmer' | 'queue';
    phase: number;
}

interface LeaderboardEntry {
    rank: number;
    userId: number;
    username: string;
    figure: string;
    score: number;
    wins: number;
    knockoffs: number;
}

interface HistoryRow {
    id: number;
    opponent_name: string;
    won: number;
    rounds_won: number;
    rounds_lost: number;
    hits_landed: number;
    knockoffs: number;
    score: number;
    reward_credits: number;
    reward_duckets: number;
    created_at: number;
}

interface FinishResp {
    success: boolean;
    won?: boolean;
    rewards?: { score: number; duckets: number; credits: number };
    unlocked_achievements?: Array<{ badge: string; tier: number; title: string }>;
    games_left?: number;
    has_unlimited?: boolean;
}

const OPPONENT_POOL: Array<{ name: string; figure: string; difficulty: number; swimColor: string }> = [
    { name: 'BoyaMaster', figure: 'hr-155-42.hd-180-2.ch-210-66.lg-270-82.sh-290-80', difficulty: 0.92, swimColor: '66' },
    { name: 'OlaBrava', figure: 'hr-515-33.hd-600-1.ch-635-70.lg-710-64.sh-730-62', difficulty: 1.0, swimColor: '70' },
    { name: 'LidoKing', figure: 'hr-165-45.hd-190-3.ch-255-76.lg-280-64.sh-300-64', difficulty: 1.05, swimColor: '82' },
    { name: 'SplashPro', figure: 'hr-545-39.hd-605-2.ch-665-92.lg-700-66.sh-725-92', difficulty: 0.96, swimColor: '92' },
    { name: 'Tiburón99', figure: 'hr-115-61.hd-185-4.ch-215-73.lg-275-62.sh-295-62', difficulty: 1.08, swimColor: '73' }
];

const ROOFTOP_NPCS: SpectatorNpc[] = [
    // Queue challengers standing on outer orange buoys (buoy 0 & buoy 10)
    { name: 'Flotador', figure: 'hr-100-45.hd-180-1.lg-280-76', bx: 507, by: 412, dir: 1, kind: 'queue', phase: 0.4 },
    { name: 'Salpicón', figure: 'hr-515-39.hd-600-2.ch-665-66.lg-280-66', bx: 667, by: 332, dir: 5, kind: 'queue', phase: 1.8 },
    // Pool swimmers bobbing in the turquoise pool
    { name: 'NadadorX', figure: 'hr-125-31.hd-190-2.lg-280-82', bx: 498, by: 342, dir: 2, kind: 'swimmer', phase: 0.2 },
    { name: 'SirenaSol', figure: 'hr-545-33.hd-605-1.ch-665-70.lg-280-70', bx: 682, by: 298, dir: 4, kind: 'swimmer', phase: 1.4 },
    { name: 'BuzoMax', figure: 'hr-165-61.hd-185-3.lg-280-92', bx: 565, by: 320, dir: 2, kind: 'swimmer', phase: 2.6 },
    { name: 'Coralita', figure: 'hr-515-45.hd-600-3.ch-665-82.lg-280-82', bx: 632, by: 382, dir: 6, kind: 'swimmer', phase: 3.7 },
    // Lounge sofa spectators cheering from the deck
    { name: 'DjLido', figure: 'hr-155-42.hd-180-1.ch-215-73.lg-270-64.sh-290-62', bx: 438, by: 224, dir: 2, kind: 'sofa', phase: 0.5 },
    { name: 'Verano88', figure: 'hr-545-39.hd-605-2.ch-635-70.lg-710-64.sh-730-62', bx: 376, by: 256, dir: 2, kind: 'sofa', phase: 1.5 },
    { name: 'CocoFrio', figure: 'hr-115-61.hd-190-4.ch-255-76.lg-280-64.sh-300-64', bx: 472, by: 244, dir: 4, kind: 'sofa', phase: 2.4 },
    { name: 'MareaAzul', figure: 'hr-515-33.hd-600-1.ch-665-92.lg-700-66.sh-725-92', bx: 468, by: 312, dir: 2, kind: 'sofa', phase: 3.2 }
];

const CROWD_SHOUTS = [
    '¡A por él!',
    '¡Empújalo con A o D!',
    '¡Qué equilibrio!',
    '¡Casi se cae al agua!',
    '¡Usa Espacio para estabilizarte!',
    '¡Buen golpe!',
    '¡Wobble Squabble clásico!',
    '¡Al agua patos!'
];

/**
 * Converts a Habbo avatar figure into authentic Lido Rooftop swimwear
 * while keeping the player's exact face, skin tone, hair & glasses.
 */
function toSwimwearFigure(rawFigure: string, swimColor: string): string
{
    const base = rawFigure && rawFigure.includes('-')
        ? rawFigure
        : 'hr-100-61.hd-180-1.ch-210-66.lg-270-82.sh-290-80';
    const parts = base.split('.');
    const kept: string[] = [];
    let hasHead = false;
    let isFemale = false;

    for (const part of parts)
    {
        const seg = part.split('-')[0];
        if (seg === 'hd')
        {
            hasHead = true;
            const idNum = parseInt(part.split('-')[1] || '180', 10);
            if (idNum >= 600) isFemale = true;
            kept.push(part);
        }
        else if (seg === 'hr' || seg === 'ha' || seg === 'he' || seg === 'ea' || seg === 'fa')
        {
            kept.push(part);
        }
    }

    if (!hasHead) kept.push('hd-180-1');
    // Classic Lido swimwear (swim shorts / swimsuit top, barefoot!)
    if (isFemale) kept.push(`ch-665-${ swimColor }`);
    kept.push(`lg-280-${ swimColor }`);
    return kept.join('.');
}

// =============================================================================
// RETRO WEB AUDIO SYNTHESIZER (AUTHENTIC SHOCKWAVE WOBBLE SQUABBLE SFX!)
// =============================================================================
class WobbleAudio
{
    private ctx: AudioContext | null = null;
    public sfxMuted = false;

    private ensureCtx(): AudioContext | null
    {
        if (this.sfxMuted) return null;
        if (!this.ctx && typeof window !== 'undefined')
        {
            const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (AC) this.ctx = new AC();
        }
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        return this.ctx;
    }

    public playWhack(critical = false)
    {
        const ctx = this.ensureCtx();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = critical ? 'sawtooth' : 'square';
        osc.frequency.setValueAtTime(critical ? 420 : 280, now);
        osc.frequency.exponentialRampToValueAtTime(75, now + 0.14);
        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.16);
    }

    public playClunk()
    {
        const ctx = this.ensureCtx();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(190, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.11);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.13);
    }

    public playSwoosh()
    {
        const ctx = this.ensureCtx();
        if (!ctx) return;
        const now = ctx.currentTime;
        const len = Math.floor(ctx.sampleRate * 0.16);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(950, now);
        filter.frequency.exponentialRampToValueAtTime(260, now + 0.16);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        src.start(now);
    }

    public playSplash()
    {
        const ctx = this.ensureCtx();
        if (!ctx) return;
        const now = ctx.currentTime;
        const len = Math.floor(ctx.sampleRate * 0.55);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++)
        {
            const env = Math.pow(1 - i / len, 1.4);
            data[i] = (Math.random() * 2 - 1) * env;
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1600, now);
        filter.frequency.exponentialRampToValueAtTime(320, now + 0.55);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        src.start(now);
    }

    public playStep()
    {
        const ctx = this.ensureCtx();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(210, now);
        osc.frequency.exponentialRampToValueAtTime(310, now + 0.06);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
    }

    public playStabilise()
    {
        const ctx = this.ensureCtx();
        if (!ctx) return;
        const now = ctx.currentTime;
        [ 520, 680 ].forEach((freq, i) =>
        {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.05);
            gain.gain.setValueAtTime(0.09, now + i * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.09);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.05);
            osc.stop(now + i * 0.05 + 0.1);
        });
    }

    public playWhistle()
    {
        const ctx = this.ensureCtx();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2100, now);
        osc.frequency.setValueAtTime(2350, now + 0.08);
        osc.frequency.setValueAtTime(2050, now + 0.16);
        gain.gain.setValueAtTime(0.11, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.31);
    }

    public playVictory(won: boolean)
    {
        const ctx = this.ensureCtx();
        if (!ctx) return;
        const now = ctx.currentTime;
        const notes = won ? [ 523.25, 659.25, 783.99, 1046.5 ] : [ 392.0, 349.23, 311.13, 261.63 ];
        notes.forEach((freq, i) =>
        {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.11);
            gain.gain.setValueAtTime(0.12, now + i * 0.11);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.11 + 0.22);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.11);
            osc.stop(now + i * 0.11 + 0.24);
        });
    }
}

// =============================================================================
// AUTHENTIC ANALOG METAL BALANCE METER SVG (Wobble_controls_main.png 1:1!)
// =============================================================================
const AnalogBalanceGauge: FC<{ balance: number }> = ({ balance }) =>
{
    const clamped = Math.max(-100, Math.min(100, balance));
    // Angle from -68 deg (far left / green) to +68 deg (far right / orange-red)
    const angle = (clamped / 100) * 68;
    const isDanger = Math.abs(clamped) >= 72;

    return (
        <svg viewBox="0 0 110 70" className="ws-meter-svg" shapeRendering="crispEdges">
            {/* Outer metal bezel */}
            <path
                d="M 8 58 A 47 47 0 0 1 102 58 L 102 62 Q 102 66 96 66 L 14 66 Q 8 66 8 62 Z"
                fill="#e2e6e6"
                stroke="#000000"
                strokeWidth="2"
            />
            {/* Recessed dark gauge face */}
            <path
                d="M 13 58 A 42 42 0 0 1 97 58 L 97 60 Q 97 62 94 62 L 16 62 Q 13 62 13 60 Z"
                fill={ isDanger ? '#381e1e' : '#3a4042' }
                stroke="#000000"
                strokeWidth="1.5"
            />
            {/* Left GREEN arc (Q side) */}
            <path
                d="M 20 55 A 35 35 0 0 1 52 21"
                fill="none"
                stroke="#16c637"
                strokeWidth="4.5"
            />
            {/* Green dotted fill wedge */}
            <path
                d="M 23 55 A 32 32 0 0 1 48 25 L 55 56 Z"
                fill="#16c637"
                fillOpacity="0.22"
            />
            {/* Right ORANGE-RED arc (E side) */}
            <path
                d="M 58 21 A 35 35 0 0 1 90 55"
                fill="none"
                stroke="#ff5e1a"
                strokeWidth="4.5"
            />
            {/* Orange dotted fill wedge */}
            <path
                d="M 62 25 A 32 32 0 0 1 87 55 L 55 56 Z"
                fill="#ff5e1a"
                fillOpacity="0.22"
            />
            {/* Tick marks */}
            <line x1="55" y1="18" x2="55" y2="25" stroke="#ffffff" strokeWidth="1.5" />
            <line x1="27" y1="34" x2="32" y2="38" stroke="#16c637" strokeWidth="1.5" />
            <line x1="83" y1="34" x2="78" y2="38" stroke="#ff5e1a" strokeWidth="1.5" />
            {/* Animated white Shockwave triangle needle */}
            <g transform={ `rotate(${ angle } 55 56)` }>
                <polygon
                    points="55,20 50,56 60,56"
                    fill="#ffffff"
                    stroke="#000000"
                    strokeWidth="1.5"
                />
            </g>
            {/* Center metal pivot rivet */}
            <circle cx="55" cy="56" r="5.5" fill="#9ea6a8" stroke="#000000" strokeWidth="1.5" />
            <circle cx="55" cy="56" r="2.2" fill="#525a5c" />
        </svg>
    );
};

// =============================================================================
// MAIN COMPONENT: WOBBLE SQUABBLE (HABBO SHOCKWAVE / ORIGINS ROOFTOP RUMBLE)
// =============================================================================
export const WobbleSquabbleGameView: FC = () =>
{
    const { setIsWobbleSquabblePlaying, setIsVisible } = useGameCenter();
    const { setMyGamePresence } = useGamePresence();

    useEffect(() =>
    {
        if (document.activeElement instanceof HTMLElement)
        {
            document.activeElement.blur();
        }
        setMyGamePresence('wobblesquabble', 'WOBBLE SQUABBLE');
        return () => setMyGamePresence(null);
    }, [ setMyGamePresence ]);
    const session = GetSessionDataManager();
    const myUsername = session?.userName || 'Jugador';
    const myFigure = session?.figure || 'hr-100-61.hd-180-1.ch-210-66.lg-270-82.sh-290-80';

    const [ stage, setStage ] = useState<GameStage>('lobby');
    const [ preProgress, setPreProgress ] = useState<number>(0);
    const [ opponentIdx, setOpponentIdx ] = useState<number>(() => Math.floor(Math.random() * OPPONENT_POOL.length));
    const [ roundBanner, setRoundBanner ] = useState<{ kicker: string; main: string } | null>(null);
    const [ pressedKeys, setPressedKeys ] = useState<Record<string, boolean>>({});
    const [ sfxMuted, setSfxMuted ] = useState<boolean>(false);
    const [ hoverLabel, setHoverLabel ] = useState<string>('');
    const [ chatMode, setChatMode ] = useState<'say' | 'shout'>('say');
    const [ chatModeOpen, setChatModeOpen ] = useState<boolean>(false);
    const [ chatText, setChatText ] = useState<string>('');

    const [ showLeaveModal, setShowLeaveModal ] = useState<boolean>(false);
    const [ showHelpModal, setShowHelpModal ] = useState<boolean>(false);
    const [ showLeaderboardModal, setShowLeaderboardModal ] = useState<boolean>(false);
    const [ lbTab, setLbTab ] = useState<'week' | 'all' | 'friends' | 'history'>('week');
    const [ lbLoading, setLbLoading ] = useState<boolean>(false);
    const [ lbEntries, setLbEntries ] = useState<LeaderboardEntry[]>([]);
    const [ historyRows, setHistoryRows ] = useState<HistoryRow[]>([]);

    const [ gamesLeftInfo, setGamesLeftInfo ] = useState<{ gamesLeft: number; hasUnlimited: boolean }>({
        gamesLeft: 5,
        hasUnlimited: false
    });
    const [ finishData, setFinishData ] = useState<FinishResp | null>(null);
    const [ rematchBusy, setRematchBusy ] = useState<boolean>(false);
    const [ rematchError, setRematchError ] = useState<string | null>(null);

    const [ hud, setHud ] = useState<{
        round: number;
        timeLeft: number;
        playerRounds: number;
        opponentRounds: number;
        playerBalance: number;
        opponentBalance: number;
        stabCdPct: number;
        score: number;
        hitsLanded: number;
        knockoffs: number;
    }>({
        round: 1,
        timeLeft: ROUND_DURATION,
        playerRounds: 0,
        opponentRounds: 0,
        playerBalance: 0,
        opponentBalance: 0,
        stabCdPct: 0,
        score: 0,
        hitsLanded: 0,
        knockoffs: 0
    });

    const [ finalSummary, setFinalSummary ] = useState<{
        won: boolean;
        playerRounds: number;
        opponentRounds: number;
        hitsLanded: number;
        knockoffs: number;
        score: number;
        opponentName: string;
        opponentFigure: string;
    } | null>(null);

    const activeOpponent = useMemo(() => OPPONENT_POOL[opponentIdx % OPPONENT_POOL.length], [ opponentIdx ]);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const chatInputRef = useRef<HTMLInputElement | null>(null);
    const audioRef = useRef<WobbleAudio>(new WobbleAudio());
    const backdropImgRef = useRef<HTMLImageElement | null>(null);
    const arrowImgRef = useRef<HTMLImageElement | null>(null);
    const fxImgsRef = useRef<Partial<Record<ComicKind, HTMLImageElement>>>({});
    const avatarCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
    const avatarReadyRef = useRef<Set<string>>(new Set());
    const keysDownRef = useRef<Set<string>>(new Set());
    const matchFinishedRef = useRef<boolean>(false);

    // Core mutable 60fps engine ref
    const engineRef = useRef<{
        running: boolean;
        roundActive: boolean;
        roundPauseTimer: number;
        round: number;
        timeLeft: number;
        matchStartMs: number;
        score: number;
        player: FighterState;
        opponent: FighterState;
        popups: ComicPopup[];
        splashes: SplashDrop[];
        ripples: WaterRipple[];
        chats: ChatBubble[];
        nextId: number;
        aiActionTimer: number;
        crowdChatTimer: number;
        viewScale: number;
        viewOffsetX: number;
        viewOffsetY: number;
    } | null>(null);

    // Load widescreen Rooftop Rumble backdrop + official 2006 Shockwave avatar arrow + pixel-art FX sprites
    useEffect(() =>
    {
        const img = new Image();
        img.src = wsRooftopWideImg;
        img.onload = () => { backdropImgRef.current = img; };

        const arrow = new Image();
        arrow.src = shockwaveArrowOrangeImg;
        arrow.onload = () => { arrowImgRef.current = arrow; };

        const fxEntries: Array<[ ComicKind, string ]> = [
            [ 'WHACK!', wsFxWhackImg ],
            [ 'ZZZAP!', wsFxZzzapImg ],
            [ 'CLUNK!', wsFxClunkImg ],
            [ 'SWOOOSH!', wsFxSwoooshImg ],
            [ '¡AL AGUA!', wsFxSplashImg ]
        ];
        for (const [ kind, src ] of fxEntries)
        {
            const fImg = new Image();
            fImg.src = src;
            fImg.onload = () => { fxImgsRef.current[kind] = fImg; };
        }
    }, []);

    // Fetch daily games status
    useEffect(() =>
    {
        fetch('/api/games/wobblesquabble/status', { credentials: 'include' })
            .then(r => r.ok ? r.json() : null)
            .then(data =>
            {
                if (data?.success)
                {
                    setGamesLeftInfo({
                        gamesLeft: typeof data.games_left === 'number' ? data.games_left : 5,
                        hasUnlimited: !!data.has_unlimited
                    });
                }
            })
            .catch(() => {});
    }, []);

    // Authentic Shockwave SMALL (sh_) Habbo avatar sprite loader (full body, seated, head-only, wobble, push & step!)
    const avatarPendingRef = useRef<Set<string>>(new Set());
    const ensureAvatarSprite = useCallback((
        figure: string,
        dir: number,
        posture: 'std' | 'sit' | 'head' | 'push' | 'wobble0' | 'wobble1' | 'step0' | 'step1'
    ) =>
    {
        const key = `${ figure }__${ posture }__${ dir }`;
        if (avatarReadyRef.current.has(key) || avatarPendingRef.current.has(key)) return;
        avatarPendingRef.current.add(key);

        let unsub: (() => void) | null = null;
        const renderSmall = () =>
        {
            if (avatarReadyRef.current.has(key))
            {
                unsub?.();
                return;
            }
            const raw = renderShockwaveSmallDataUrl(figure, {
                direction: dir,
                headDirection: dir,
                posture: posture === 'sit'
                    ? 'sit'
                    : (posture === 'wobble0' || posture === 'wobble1' || posture === 'step0' || posture === 'step1')
                        ? 'wlk'
                        : 'std',
                arms: posture === 'push'
                    ? 'push'
                    : (posture === 'wobble0' || posture === 'wobble1' ? posture : 'normal'),
                panicFace: posture === 'wobble0' || posture === 'wobble1',
                frame: (posture === 'wobble1' || posture === 'step1') ? 3 : 1,
                headOnly: posture === 'head'
            });
            if (raw)
            {
                const fullyReady = isShockwaveSmallFigureReady(figure);
                trimTransparentImage(raw, (_url, trimmedImg) =>
                {
                    avatarCacheRef.current.set(key, trimmedImg);
                    if (fullyReady)
                    {
                        avatarReadyRef.current.add(key);
                        avatarPendingRef.current.delete(key);
                        unsub?.();
                    }
                });
            }
        };

        unsub = onShockwaveSmallAtlasReady(renderSmall);
    }, []);

    // Preload fighters (idle + wobble flailing + pushing + stepping) + rooftop audience sprites
    useEffect(() =>
    {
        const mySwim = toSwimwearFigure(myFigure, '64');
        const oppSwim = toSwimwearFigure(activeOpponent.figure, activeOpponent.swimColor);
        const fighterStates: Array<'std' | 'push' | 'wobble0' | 'wobble1' | 'step0' | 'step1'> = [
            'std', 'push', 'wobble0', 'wobble1', 'step0', 'step1'
        ];
        [ 1, 2, 5, 6 ].forEach(d =>
        {
            fighterStates.forEach(st =>
            {
                ensureAvatarSprite(mySwim, d, st);
                ensureAvatarSprite(oppSwim, d, st);
            });
        });
        ensureAvatarSprite(mySwim, 2, 'head');
        ensureAvatarSprite(oppSwim, 5, 'head');

        for (const npc of ROOFTOP_NPCS)
        {
            const posture = npc.kind === 'sofa' ? 'sit' : (npc.kind === 'swimmer' ? 'head' : 'std');
            ensureAvatarSprite(npc.figure, npc.dir, posture);
        }
    }, [ myFigure, activeOpponent, ensureAvatarSprite ]);

    const createFighter = useCallback((
        name: string,
        figure: string,
        swimColor: string,
        isHuman: boolean,
        startPos: number
    ): FighterState => ({
        name,
        figure,
        swimFigure: toSwimwearFigure(figure, swimColor),
        isHuman,
        pos: startPos,
        visualPos: startPos,
        balance: (Math.random() - 0.5) * 10,
        balanceVel: 0,
        leanVis: 0,
        pushAnim: 0,
        pushDir: isHuman ? 1 : -1,
        pushCd: 0,
        moveCd: 0,
        stabCd: 0,
        lastPushTs: 0,
        falling: false,
        fallTime: 0,
        fallSide: 1,
        inWater: false,
        roundsWon: 0,
        hitsLanded: 0,
        knockoffs: 0
    }), []);

    const initMatchEngine = useCallback((opp: typeof OPPONENT_POOL[number]) =>
    {
        matchFinishedRef.current = false;
        const player = createFighter(myUsername, myFigure, '64', true, 2);
        const opponent = createFighter(opp.name, opp.figure, opp.swimColor, false, 4);

        engineRef.current = {
            running: false,
            roundActive: false,
            roundPauseTimer: 0,
            round: 1,
            timeLeft: ROUND_DURATION,
            matchStartMs: performance.now(),
            score: 0,
            player,
            opponent,
            popups: [],
            splashes: [],
            ripples: [],
            chats: [],
            nextId: 1,
            aiActionTimer: 0.45,
            crowdChatTimer: 4.5,
            viewScale: 1,
            viewOffsetX: 0,
            viewOffsetY: 0
        };
    }, [ myUsername, myFigure, createFighter ]);

    // Initialize engine & run brief pre-match progress bar ("El juego va a empezar")
    useEffect(() =>
    {
        if (stage !== 'lobby') return;
        initMatchEngine(activeOpponent);
        setPreProgress(0);
        setFinishData(null);
        setFinalSummary(null);
        setRematchError(null);

        const start = performance.now();
        const duration = 2200;
        let raf = 0;
        const tick = (now: number) =>
        {
            const pct = Math.min(100, ((now - start) / duration) * 100);
            setPreProgress(pct);
            if (pct >= 100)
            {
                const eng = engineRef.current;
                if (eng)
                {
                    eng.running = true;
                    eng.roundActive = true;
                    eng.matchStartMs = performance.now();
                }
                audioRef.current.playWhistle();
                setRoundBanner({ kicker: `Ronda 1 · Al mejor de 3`, main: '¡A LOS FLOTADORES!' });
                setTimeout(() => setRoundBanner(null), 1500);
                setStage('playing');
                return;
            }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [ stage, activeOpponent, initMatchEngine ]);

    const spawnComicPopup = useCallback((
        eng: NonNullable<typeof engineRef.current>,
        text: ComicKind,
        bx: number,
        by: number
    ) =>
    {
        const palette: Record<ComicKind, { color: string; bg: string }> = {
            'WHACK!': { color: '#7c2d12', bg: '#ffea00' },
            'ZZZAP!': { color: '#991b1b', bg: '#fde047' },
            'CLUNK!': { color: '#1e3a8a', bg: '#fef08a' },
            'SWOOOSH!': { color: '#374151', bg: '#e5e7eb' },
            '¡AL AGUA!': { color: '#075985', bg: '#7dd3fc' }
        };
        const pal = palette[text];
        eng.popups.push({
            id: eng.nextId++,
            text,
            bx,
            by,
            life: text === '¡AL AGUA!' ? 1.45 : 0.72,
            maxLife: text === '¡AL AGUA!' ? 1.45 : 0.72,
            color: pal.color,
            bg: pal.bg
        });
    }, []);

    const spawnSplash = useCallback((
        eng: NonNullable<typeof engineRef.current>,
        bx: number,
        by: number
    ) =>
    {
        for (let i = 0; i < 24; i++)
        {
            const ang = -Math.PI * 0.15 - Math.random() * Math.PI * 0.7;
            const spd = 28 + Math.random() * 68;
            eng.splashes.push({
                bx: bx + (Math.random() - 0.5) * 14,
                by: by + (Math.random() - 0.5) * 6,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd - 22,
                life: 0.55 + Math.random() * 0.35,
                maxLife: 0.9,
                size: 2 + Math.random() * 2.5
            });
        }
        eng.ripples.push({ bx, by: by + 6, r: 4, maxR: 34, life: 0.85, maxLife: 0.85 });
        eng.ripples.push({ bx, by: by + 6, r: 2, maxR: 22, life: 0.65, maxLife: 0.65 });
    }, []);

    const pushChatBubble = useCallback((
        eng: NonNullable<typeof engineRef.current>,
        name: string,
        text: string,
        bx: number,
        by: number,
        shout = false
    ) =>
    {
        const startY = Math.max(54, Math.min(200, Math.round(eng.viewOffsetY + by * eng.viewScale - 74)));
        for (const existing of eng.chats) existing.y -= 24;
        eng.chats.push({
            id: eng.nextId++,
            name,
            text,
            shout,
            bx,
            by,
            y: startY,
            life: 6.2
        });
        if (eng.chats.length > 6) eng.chats.shift();
    }, []);

    // Execute any official Wobble Squabble action (Q, E, A, D, N, M, SPACE) for either fighter
    const performFighterAction = useCallback((
        eng: NonNullable<typeof engineRef.current>,
        actor: FighterState,
        target: FighterState,
        action: 'Q' | 'E' | 'A' | 'D' | 'N' | 'M' | 'SPACE'
    ) =>
    {
        if (!eng.running || !eng.roundActive || actor.falling || target.falling) return;
        const now = performance.now();

        if (action === 'Q')
        {
            // Balance Left (green side)
            actor.balanceVel -= 46;
            actor.balance -= 6.5;
            return;
        }
        if (action === 'E')
        {
            // Balance Right (orange side)
            actor.balanceVel += 46;
            actor.balance += 6.5;
            return;
        }
        if (action === 'SPACE')
        {
            if (actor.stabCd > 0) return;
            actor.stabCd = STABILISE_COOLDOWN;
            actor.balance *= 0.28;
            actor.balanceVel *= 0.18;
            if (actor.isHuman) audioRef.current.playStabilise();
            return;
        }
        if (action === 'N' || action === 'M')
        {
            if (actor.moveCd > 0) return;
            const delta = action === 'N' ? -1 : 1;
            const nextPos = actor.pos + delta;
            if (nextPos < BATTLE_MIN_POS || nextPos > BATTLE_MAX_POS) return;
            if (nextPos === target.pos) return;
            actor.pos = nextPos;
            actor.moveCd = MOVE_COOLDOWN;
            // Stepping on a floating buoy slightly rocks balance
            actor.balanceVel += delta * (14 + Math.random() * 10);
            if (actor.isHuman) audioRef.current.playStep();
            return;
        }
        if (action === 'A' || action === 'D')
        {
            if (actor.pushCd > 0) return;
            actor.pushCd = PUSH_COOLDOWN;
            actor.pushAnim = 0.24;
            actor.pushDir = action === 'A' ? -1 : 1;
            actor.lastPushTs = now;

            const dist = Math.abs(actor.pos - target.pos);
            const midBuoy = buoyXY(2 + (actor.visualPos + target.visualPos) / 2);

            // Out of melee reach -> SWOOOSH! (whiff throws off attacker's own balance!)
            if (dist > 2)
            {
                const selfKick = (action === 'A' ? -1 : 1) * 20;
                actor.balance += selfKick * 0.55;
                actor.balanceVel += selfKick * 1.4;
                spawnComicPopup(eng, 'SWOOOSH!', midBuoy.x, midBuoy.y - 28);
                audioRef.current.playSwoosh();
                return;
            }

            // Simultaneous clash -> CLUNK!
            if (now - target.lastPushTs < 150)
            {
                actor.balanceVel += (Math.random() < 0.5 ? -1 : 1) * 18;
                target.balanceVel += (Math.random() < 0.5 ? -1 : 1) * 18;
                spawnComicPopup(eng, 'CLUNK!', midBuoy.x, midBuoy.y - 30);
                audioRef.current.playClunk();
                return;
            }

            // Solid hit! Pushing target in the same direction they are ALREADY leaning deals a critical ZZZAP!
            const pushSign = action === 'A' ? -1 : 1;
            const sameDirAsTargetLean = (target.balance * pushSign) > 14;
            const closeBonus = dist <= 1 ? 1.25 : 0.85;
            const isCrit = sameDirAsTargetLean && Math.abs(actor.balance) < 48;

            const baseImpact = (isCrit ? 34 : 23) * closeBonus;
            target.balance += pushSign * baseImpact * 0.62;
            target.balanceVel += pushSign * baseImpact * 1.95;

            // Recoil on attacker (keeps the classic Habbo risk/reward!)
            actor.balance -= pushSign * 7.5;
            actor.balanceVel -= pushSign * 16;

            actor.hitsLanded += 1;
            if (actor.isHuman) eng.score += isCrit ? 45 : 25;

            // Heavy hit can slide target back 1 buoy!
            if (isCrit && Math.random() < 0.55)
            {
                const slideDir = target.pos > actor.pos ? 1 : -1;
                const pushedPos = target.pos + slideDir;
                if (pushedPos >= BATTLE_MIN_POS && pushedPos <= BATTLE_MAX_POS && pushedPos !== actor.pos)
                {
                    target.pos = pushedPos;
                }
            }

            spawnComicPopup(eng, isCrit ? 'ZZZAP!' : 'WHACK!', midBuoy.x, midBuoy.y - 32);
            audioRef.current.playWhack(isCrit);
        }
    }, [ spawnComicPopup ]);

    const handleControlClick = useCallback((action: 'Q' | 'E' | 'A' | 'D' | 'N' | 'M' | 'SPACE') =>
    {
        const eng = engineRef.current;
        if (!eng) return;
        performFighterAction(eng, eng.player, eng.opponent, action);
        setPressedKeys(prev => ({ ...prev, [action]: true }));
        setTimeout(() => setPressedKeys(prev => ({ ...prev, [action]: false })), 130);
    }, [ performFighterAction ]);

    // Finish full Best-of-3 match and submit to Habbten CMS API
    const finishMatch = useCallback(async (eng: NonNullable<typeof engineRef.current>) =>
    {
        if (matchFinishedRef.current) return;
        matchFinishedRef.current = true;
        eng.running = false;
        eng.roundActive = false;

        const won = eng.player.roundsWon > eng.opponent.roundsWon;
        const durationSec = Math.max(8, Math.round((performance.now() - eng.matchStartMs) / 1000));
        const finalScore = eng.score + eng.player.roundsWon * 250 + (won ? 350 : 60);

        audioRef.current.playVictory(won);

        setFinalSummary({
            won,
            playerRounds: eng.player.roundsWon,
            opponentRounds: eng.opponent.roundsWon,
            hitsLanded: eng.player.hitsLanded,
            knockoffs: eng.player.knockoffs,
            score: finalScore,
            opponentName: eng.opponent.name,
            opponentFigure: eng.opponent.figure
        });
        setStage('results');

        try
        {
            const res = await fetch('/api/games/wobblesquabble/finish', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    opponentName: eng.opponent.name,
                    playerRounds: eng.player.roundsWon,
                    opponentRounds: eng.opponent.roundsWon,
                    hitsLanded: eng.player.hitsLanded,
                    knockoffs: eng.player.knockoffs,
                    score: finalScore,
                    durationSec
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
            // Offline fallback
        }
    }, []);

    // Load leaderboard modal data
    useEffect(() =>
    {
        if (!showLeaderboardModal) return;
        let cancelled = false;
        setLbLoading(true);
        const url = lbTab === 'history'
            ? '/api/games/wobblesquabble/history'
            : `/api/games/wobblesquabble/leaderboard?type=${ lbTab }`;
        fetch(url, { credentials: 'include' })
            .then(r => r.ok ? r.json() : null)
            .then(data =>
            {
                if (cancelled || !data?.success) return;
                if (lbTab === 'history') setHistoryRows(data.matches || []);
                else setLbEntries(data.entries || []);
            })
            .catch(() => {})
            .finally(() => { if (!cancelled) setLbLoading(false); });
        return () => { cancelled = true; };
    }, [ showLeaderboardModal, lbTab ]);

    const exitToGameCenter = useCallback(() =>
    {
        setMyGamePresence(null);
        setIsWobbleSquabblePlaying(false);
        setIsVisible(true);
    }, [ setIsWobbleSquabblePlaying, setIsVisible, setMyGamePresence ]);

    const handleRematch = useCallback(async () =>
    {
        if (rematchBusy) return;
        setRematchBusy(true);
        setRematchError(null);
        try
        {
            const res = await fetch('/api/games/wobblesquabble/start', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (!res.ok || !data.success)
            {
                setRematchError(data.error || 'Has agotado tus partidas gratuitas de hoy.');
                setRematchBusy(false);
                return;
            }
            if (typeof data.games_left === 'number')
            {
                setGamesLeftInfo({ gamesLeft: data.games_left, hasUnlimited: !!data.has_unlimited });
            }
            setOpponentIdx(prev => (prev + 1 + Math.floor(Math.random() * (OPPONENT_POOL.length - 1))) % OPPONENT_POOL.length);
            setStage('lobby');
        }
        catch
        {
            setRematchError('Error al conectar con el servidor de Wobble Squabble.');
        }
        finally
        {
            setRematchBusy(false);
        }
    }, [ rematchBusy ]);

    const toggleSfx = useCallback(() =>
    {
        setSfxMuted(prev =>
        {
            const next = !prev;
            audioRef.current.sfxMuted = next;
            return next;
        });
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
            const b = buoyXY(2 + eng.player.visualPos);
            pushChatBubble(eng, myUsername, txt, b.x, b.y, isShout);
        }
        setChatText('');
        chatInputRef.current?.blur();
    }, [ chatText, chatMode, myUsername, pushChatBubble ]);

    // =========================================================================
    // MAIN 60 FPS WOBBLE SQUABBLE ENGINE + LIVE ROOFTOP + JUMBOTRON TV RENDERER
    // =========================================================================
    useEffect(() =>
    {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Offscreen buffer for crisp 2.5x zoomed live Jumbotron TV camera!
        const tvCanvas = document.createElement('canvas');
        tvCanvas.width = 240;
        tvCanvas.height = 220;
        const tvCtx = tvCanvas.getContext('2d');

        const mapCodeToAction = (code: string): 'Q' | 'E' | 'A' | 'D' | 'N' | 'M' | 'SPACE' | null =>
        {
            if (code === 'KeyQ') return 'Q';
            if (code === 'KeyE') return 'E';
            if (code === 'KeyA') return 'A';
            if (code === 'KeyD') return 'D';
            if (code === 'KeyN' || code === 'ArrowLeft') return 'N';
            if (code === 'KeyM' || code === 'ArrowRight') return 'M';
            if (code === 'Space') return 'SPACE';
            return null;
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

            const action = mapCodeToAction(e.code);
            if (!action) return;
            e.preventDefault();
            keysDownRef.current.add(action);
            setPressedKeys(prev => (prev[action] ? prev : { ...prev, [action]: true }));

            const eng = engineRef.current;
            if (eng && !e.repeat)
            {
                performFighterAction(eng, eng.player, eng.opponent, action);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) =>
        {
            const action = mapCodeToAction(e.code);
            if (!action) return;
            keysDownRef.current.delete(action);
            setPressedKeys(prev => (prev[action] ? { ...prev, [action]: false } : prev));
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        const triggerKnockoff = (
            eng: NonNullable<typeof engineRef.current>,
            loser: FighterState,
            winner: FighterState
        ) =>
        {
            if (loser.falling) return;
            loser.falling = true;
            loser.fallTime = 0;
            loser.fallSide = loser.balance >= 0 ? 1 : -1;
            eng.roundActive = false;
            eng.roundPauseTimer = 2.4;

            winner.roundsWon += 1;
            winner.knockoffs += 1;
            if (winner.isHuman) eng.score += 180 + Math.round(eng.timeLeft * 4);

            const lb = buoyXY(2 + loser.visualPos);
            spawnComicPopup(eng, '¡AL AGUA!', lb.x, lb.y - 34);
            spawnSplash(eng, lb.x + loser.fallSide * 14, lb.y + 18);
            audioRef.current.playSplash();

            setRoundBanner({
                kicker: winner.isHuman ? `¡Ronda ${ eng.round } ganada!` : `Ronda ${ eng.round } para ${ winner.name }`,
                main: winner.isHuman ? '¡RIVAL AL AGUA!' : '¡CAÍSTE A LA PISCINA!'
            });
        };

        const resetRoundPositions = (eng: NonNullable<typeof engineRef.current>) =>
        {
            eng.round += 1;
            eng.timeLeft = ROUND_DURATION;
            eng.roundActive = true;
            const resetOne = (f: FighterState, startPos: number) =>
            {
                f.pos = startPos;
                f.visualPos = startPos;
                f.balance = (Math.random() - 0.5) * 12;
                f.balanceVel = 0;
                f.leanVis = 0;
                f.pushAnim = 0;
                f.pushCd = 0;
                f.moveCd = 0;
                f.stabCd = 0;
                f.falling = false;
                f.fallTime = 0;
                f.inWater = false;
            };
            resetOne(eng.player, 2);
            resetOne(eng.opponent, 4);
            audioRef.current.playWhistle();
            setRoundBanner({ kicker: `Ronda ${ eng.round }`, main: '¡A LOS FLOTADORES!' });
            setTimeout(() => setRoundBanner(null), 1300);
        };

        let rafId = 0;
        let lastTs = performance.now();
        let hudAcc = 0;

        const update = (dt: number) =>
        {
            const eng = engineRef.current;
            if (!eng) return;

            // Crowd atmosphere chat bubbles
            if (eng.running)
            {
                eng.crowdChatTimer -= dt;
                if (eng.crowdChatTimer <= 0)
                {
                    eng.crowdChatTimer = 5.5 + Math.random() * 5.5;
                    const npc = ROOFTOP_NPCS[Math.floor(Math.random() * ROOFTOP_NPCS.length)];
                    const line = CROWD_SHOUTS[Math.floor(Math.random() * CROWD_SHOUTS.length)];
                    pushChatBubble(eng, npc.name, line, npc.bx, npc.by, false);
                }
            }

            // Update popups, splashes, ripples & chats
            for (let i = eng.popups.length - 1; i >= 0; i--)
            {
                eng.popups[i].life -= dt;
                if (eng.popups[i].life <= 0) eng.popups.splice(i, 1);
            }
            for (let i = eng.splashes.length - 1; i >= 0; i--)
            {
                const s = eng.splashes[i];
                s.life -= dt;
                s.bx += s.vx * dt;
                s.by += s.vy * dt;
                s.vy += 175 * dt;
                if (s.life <= 0) eng.splashes.splice(i, 1);
            }
            for (let i = eng.ripples.length - 1; i >= 0; i--)
            {
                const r = eng.ripples[i];
                r.life -= dt;
                r.r = r.maxR * (1 - r.life / r.maxLife);
                if (r.life <= 0) eng.ripples.splice(i, 1);
            }
            for (let i = eng.chats.length - 1; i >= 0; i--)
            {
                eng.chats[i].life -= dt;
                eng.chats[i].y -= dt * 13;
                if (eng.chats[i].life <= 0 || eng.chats[i].y < -26) eng.chats.splice(i, 1);
            }

            if (!eng.running) return;

            // Between-rounds pause or match end
            if (!eng.roundActive)
            {
                for (const f of [ eng.player, eng.opponent ])
                {
                    if (f.falling)
                    {
                        f.fallTime += dt;
                        if (f.fallTime >= 0.45 && !f.inWater)
                        {
                            f.inWater = true;
                            const fb = buoyXY(2 + f.visualPos);
                            spawnSplash(eng, fb.x + f.fallSide * 16, fb.y + 22);
                        }
                    }
                }
                eng.roundPauseTimer -= dt;
                if (eng.roundPauseTimer <= 0)
                {
                    setRoundBanner(null);
                    if (eng.player.roundsWon >= WINS_NEEDED || eng.opponent.roundsWon >= WINS_NEEDED)
                    {
                        finishMatch(eng);
                        return;
                    }
                    resetRoundPositions(eng);
                }
                return;
            }

            // Active round timer
            eng.timeLeft = Math.max(0, eng.timeLeft - dt);
            if (eng.timeLeft <= 0)
            {
                // Round timeout: fighter closer to center balance wins the round!
                if (Math.abs(eng.player.balance) <= Math.abs(eng.opponent.balance))
                {
                    triggerKnockoff(eng, eng.opponent, eng.player);
                }
                else
                {
                    triggerKnockoff(eng, eng.player, eng.opponent);
                }
                return;
            }

            // Continuous hold support for Q / E balance keys (smooth analog control!)
            if (keysDownRef.current.has('Q')) eng.player.balanceVel -= 145 * dt;
            if (keysDownRef.current.has('E')) eng.player.balanceVel += 145 * dt;

            // Update fighter physics (both player & opponent)
            const waveTime = performance.now() / 1000;
            for (const f of [ eng.player, eng.opponent ])
            {
                if (f.pushCd > 0) f.pushCd = Math.max(0, f.pushCd - dt);
                if (f.moveCd > 0) f.moveCd = Math.max(0, f.moveCd - dt);
                if (f.stabCd > 0) f.stabCd = Math.max(0, f.stabCd - dt);
                if (f.pushAnim > 0) f.pushAnim = Math.max(0, f.pushAnim - dt);

                // Smooth buoy movement interpolation
                f.visualPos += (f.pos - f.visualPos) * Math.min(1, dt * 12);

                // Authentic buoy physics: gentle instability when tilted + subtle water wave wobble
                const waveForce = Math.sin(waveTime * 2.4 + (f.isHuman ? 0 : 2.1)) * 12;
                const gravityTip = f.balance * 0.92;
                f.balanceVel += (gravityTip + waveForce) * dt;
                f.balanceVel *= Math.pow(0.26, dt); // water damping
                f.balance += f.balanceVel * dt;
                f.leanVis += (f.balance / 100 - f.leanVis) * Math.min(1, dt * 14);
            }

            // Smart, fair, fun Opponent AI (escalates slightly in Round 2/3!)
            eng.aiActionTimer -= dt;
            if (eng.aiActionTimer <= 0)
            {
                const opp = eng.opponent;
                const pl = eng.player;
                const diff = activeOpponent.difficulty + (eng.round - 1) * 0.08;
                eng.aiActionTimer = Math.max(0.14, (0.34 - diff * 0.07) + Math.random() * 0.16);

                const dist = Math.abs(opp.pos - pl.pos);
                // 1. Recover balance if tipping dangerously
                if (Math.abs(opp.balance) > 52 && opp.stabCd <= 0 && Math.random() < 0.65)
                {
                    performFighterAction(eng, opp, pl, 'SPACE');
                }
                else if (opp.balance > 22)
                {
                    performFighterAction(eng, opp, pl, 'Q');
                }
                else if (opp.balance < -22)
                {
                    performFighterAction(eng, opp, pl, 'E');
                }
                // 2. Step closer if too far to slap
                else if (dist > 2)
                {
                    performFighterAction(eng, opp, pl, opp.pos > pl.pos ? 'N' : 'M');
                }
                // 3. Push/slap aggressively when in melee range!
                else if (dist <= 2 && Math.random() < 0.62)
                {
                    // Aim toward the side the human is already leaning!
                    const smartDir: 'A' | 'D' = pl.balance >= 0 ? 'D' : 'A';
                    const chosen: 'A' | 'D' = Math.random() < 0.72 ? smartDir : (smartDir === 'A' ? 'D' : 'A');
                    performFighterAction(eng, opp, pl, chosen);
                }
                else if (Math.random() < 0.35)
                {
                    performFighterAction(eng, opp, pl, Math.random() < 0.5 ? 'N' : 'M');
                }
            }

            // Check balance knockout (>= 100 or <= -100 -> SPLASH INTO POOL!)
            if (Math.abs(eng.opponent.balance) >= 100)
            {
                triggerKnockoff(eng, eng.opponent, eng.player);
                return;
            }
            if (Math.abs(eng.player.balance) >= 100)
            {
                triggerKnockoff(eng, eng.player, eng.opponent);
                return;
            }

            // Throttle React HUD updates (~20 Hz for smooth analog needle without overhead)
            hudAcc += dt;
            if (hudAcc >= 0.045)
            {
                hudAcc = 0;
                setHud({
                    round: eng.round,
                    timeLeft: Math.ceil(eng.timeLeft),
                    playerRounds: eng.player.roundsWon,
                    opponentRounds: eng.opponent.roundsWon,
                    playerBalance: Math.max(-100, Math.min(100, eng.player.balance)),
                    opponentBalance: Math.max(-100, Math.min(100, eng.opponent.balance)),
                    stabCdPct: Math.min(100, Math.round((eng.player.stabCd / STABILISE_COOLDOWN) * 100)),
                    score: eng.score,
                    hitsLanded: eng.player.hitsLanded,
                    knockoffs: eng.player.knockoffs
                });
            }
        };

        // Helper to draw authentic Sulake Shockwave pixel-art FX sprites (WHACK, ZZZAP, CLUNK, SWOOOSH, SPLASH)
        const drawComicBurst = (
            c: CanvasRenderingContext2D,
            x: number,
            y: number,
            text: ComicKind,
            bg: string,
            fg: string,
            scale: number,
            alpha: number
        ) =>
        {
            const sprite = fxImgsRef.current[text];
            if (sprite && sprite.naturalWidth > 0)
            {
                const dw = Math.round(sprite.naturalWidth * scale);
                const dh = Math.round(sprite.naturalHeight * scale);
                c.save();
                c.globalAlpha = alpha;
                c.imageSmoothingEnabled = false;
                c.drawImage(sprite, Math.round(x - dw / 2), Math.round(y - dh / 2), dw, dh);
                c.restore();
                return;
            }

            c.save();
            c.globalAlpha = alpha;
            c.translate(x, y);
            const spikes = 12;
            const outerR = 26 * scale;
            const innerR = 16 * scale;
            c.beginPath();
            for (let i = 0; i < spikes * 2; i++)
            {
                const r = i % 2 === 0 ? outerR : innerR;
                const a = (i * Math.PI) / spikes;
                const px = Math.cos(a) * r * 1.45;
                const py = Math.sin(a) * r * 0.78;
                if (i === 0) c.moveTo(px, py);
                else c.lineTo(px, py);
            }
            c.closePath();
            c.fillStyle = bg;
            c.strokeStyle = '#000000';
            c.lineWidth = Math.max(1.2, 1.8 * scale);
            c.fill();
            c.stroke();

            c.font = `900 ${ Math.max(9, Math.round(10.5 * scale)) }px Ubuntu, Tahoma, sans-serif`;
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            c.lineWidth = Math.max(2, 2.5 * scale);
            c.strokeStyle = '#000000';
            c.strokeText(text, 0, 0);
            c.fillStyle = fg === '#7c2d12' ? '#ff9900' : '#ffffff';
            c.fillText(text, 0, 0);
            c.restore();
        };

        // Shared fighter renderer (used on BOTH main Rooftop canvas AND live 2.5x Jumbotron TV screen!)
        const drawFighterAt = (
            c: CanvasRenderingContext2D,
            f: FighterState,
            sx: number,
            sy: number,
            sc: number,
            nowSec: number,
            drawArrow: boolean
        ) =>
        {
            const bob = Math.sin(nowSec * 4.2 + (f.isHuman ? 0 : 1.7)) * 1.4 * sc;

            if (f.inWater)
            {
                // Swimming head bobbing in the turquoise pool!
                const wx = sx + f.fallSide * 18 * sc;
                const wy = sy + 20 * sc + Math.sin(nowSec * 5.2) * 1.6 * sc;
                c.save();
                c.strokeStyle = 'rgba(255,255,255,0.75)';
                c.lineWidth = Math.max(1, 1.3 * sc);
                c.beginPath();
                c.ellipse(wx, wy + 2 * sc, 11 * sc, 4.5 * sc, 0, 0, Math.PI * 2);
                c.stroke();

                const dir = f.isHuman ? 2 : 5;
                const headImg = avatarCacheRef.current.get(`${ f.swimFigure }__head__${ dir }`);
                if (headImg && headImg.naturalWidth > 0)
                {
                    const dh = 18 * sc;
                    const dw = (headImg.naturalWidth / headImg.naturalHeight) * dh;
                    c.imageSmoothingEnabled = false;
                    c.drawImage(headImg, wx - dw / 2, wy - dh + 3 * sc, dw, dh);
                }
                c.restore();
                return;
            }

            let drawX = sx;
            let drawY = sy + bob;
            let rot = f.leanVis * 0.48;

            if (f.falling)
            {
                const p = Math.min(1, f.fallTime / 0.45);
                drawX += f.fallSide * p * 18 * sc;
                drawY += (-20 * Math.sin(p * Math.PI) + p * 22) * sc;
                rot = f.fallSide * (0.4 + p * 1.4);
            }
            else if (f.pushAnim > 0)
            {
                const lunge = Math.sin((f.pushAnim / 0.24) * Math.PI);
                const forwardSign = f.isHuman ? 1 : -1;
                drawX += forwardSign * lunge * 5.5 * sc;
                drawY += -forwardSign * lunge * 2.5 * sc;
                rot += f.pushDir * lunge * 0.16;
            }

            // Buoy foot shadow
            if (!f.falling)
            {
                c.save();
                c.fillStyle = 'rgba(0,0,0,0.32)';
                c.beginPath();
                c.ellipse(sx, sy + 1 * sc, 8.5 * sc, 3.8 * sc, 0, 0, Math.PI * 2);
                c.fill();
                c.restore();
            }

            const dir = f.isHuman ? 1 : 5;
            const absBal = Math.abs(f.balance);
            const isWobbling = f.falling || absBal >= 30 || Math.abs(f.leanVis) >= 0.32;
            const isStepping = !f.falling && Math.abs(f.visualPos - f.pos) > 0.08;
            const wobbleTick = Math.floor(nowSec * (absBal > 60 ? 11 : 7)) % 2;

            let animKey: 'std' | 'push' | 'wobble0' | 'wobble1' | 'step0' | 'step1' = 'std';
            if (f.pushAnim > 0) animKey = 'push';
            else if (isWobbling) animKey = wobbleTick === 0 ? 'wobble0' : 'wobble1';
            else if (isStepping) animKey = (Math.floor(nowSec * 9) % 2 === 0) ? 'step0' : 'step1';

            // Extra frantic micro-shake & sway when perilously close to falling into the pool!
            if (isWobbling && !f.falling)
            {
                const panicAmt = Math.min(1, (absBal - 28) / 55);
                rot += Math.sin(nowSec * 16 + (f.isHuman ? 0 : 1.4)) * (0.08 + panicAmt * 0.14);
                drawX += Math.sin(nowSec * 20) * (0.8 + panicAmt * 1.4) * sc;
            }

            const sprite = avatarCacheRef.current.get(`${ f.swimFigure }__${ animKey }__${ dir }`)
                || avatarCacheRef.current.get(`${ f.swimFigure }__std__${ dir }`)
                || avatarCacheRef.current.get(`${ f.swimFigure }__std__${ f.isHuman ? 2 : 6 }`);

            c.save();
            c.translate(drawX, drawY);
            c.rotate(rot);
            if (sprite && sprite.naturalWidth > 0)
            {
                const dh = 44 * sc;
                const dw = (sprite.naturalWidth / sprite.naturalHeight) * dh;
                c.imageSmoothingEnabled = false;
                c.drawImage(sprite, -dw / 2, -dh + 4 * sc, dw, dh);
            }
            c.restore();

            // Official 2006 Shockwave avatar arrow sprite (shockwave_arrow_orange.png) above YOUR Habbo!
            if (drawArrow && !f.falling && arrowImgRef.current && arrowImgRef.current.naturalWidth > 0)
            {
                const aImg = arrowImgRef.current;
                const ah = aImg.naturalHeight * sc;
                const aw = aImg.naturalWidth * sc;
                const ay = drawY - 50 * sc - ah + Math.sin(nowSec * 6.5) * 3.0 * sc;
                c.save();
                c.imageSmoothingEnabled = false;
                c.drawImage(aImg, Math.round(drawX - aw / 2), Math.round(ay), Math.round(aw), Math.round(ah));
                c.restore();
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

            const rawSc = Math.max(cssH / BG_H, cssW / BG_W);
            const sc = (cssW / rawSc) < 760 ? (cssW / 760) : rawSc;
            const drawW = BG_W * sc;
            const drawH = BG_H * sc;
            const desiredOx = Math.round(cssW / 2 - SCENE_CENTER_X * sc);
            const ox = drawW >= cssW
                ? Math.min(0, Math.max(Math.round(cssW - drawW), desiredOx))
                : Math.floor((cssW - drawW) / 2);
            const oy = Math.floor((cssH - drawH) / 2);
            eng.viewScale = sc;
            eng.viewOffsetX = ox;
            eng.viewOffsetY = oy;

            const toScreen = (bx: number, by: number) => ({
                sx: ox + bx * sc,
                sy: oy + by * sc
            });

            const nowSec = performance.now() / 1000;

            // 1. Sky backdrop fallback + seamless widescreen Rooftop Rumble artwork
            ctx.fillStyle = '#9cceff';
            ctx.fillRect(0, 0, cssW, cssH);
            if (backdropImgRef.current)
            {
                ctx.drawImage(backdropImgRef.current, ox, oy, drawW, drawH);
            }

            // 2. Subtle animated waterfall cascade shimmer
            ctx.save();
            const wf = toScreen(692, 232);
            ctx.fillStyle = 'rgba(255,255,255,0.34)';
            for (let k = 0; k < 4; k++)
            {
                const wy = wf.sy + ((nowSec * 42 + k * 14) % 44) * sc;
                ctx.fillRect(wf.sx + (k % 2 === 0 ? 0 : 7) * sc, wy, 5 * sc, 5 * sc);
            }
            ctx.restore();

            // 3. Rooftop Spectators (lounge sofas, swimmers in pool, queue challengers)
            for (const npc of ROOFTOP_NPCS)
            {
                const sp = toScreen(npc.bx, npc.by);
                if (npc.kind === 'swimmer')
                {
                    const bobY = sp.sy + Math.sin(nowSec * 3.1 + npc.phase) * 1.4 * sc;
                    ctx.save();
                    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
                    ctx.lineWidth = Math.max(1, 1.1 * sc);
                    ctx.beginPath();
                    ctx.ellipse(sp.sx, bobY + 1 * sc, (8 + Math.sin(nowSec * 2.5 + npc.phase) * 1.5) * sc, 3.4 * sc, 0, 0, Math.PI * 2);
                    ctx.stroke();
                    const img = avatarCacheRef.current.get(`${ npc.figure }__head__${ npc.dir }`);
                    if (img && img.naturalWidth > 0)
                    {
                        const dh = 17 * sc;
                        const dw = (img.naturalWidth / img.naturalHeight) * dh;
                        ctx.imageSmoothingEnabled = false;
                        ctx.drawImage(img, sp.sx - dw / 2, bobY - dh + 3 * sc, dw, dh);
                    }
                    ctx.restore();
                }
                else
                {
                    const posture = npc.kind === 'sofa' ? 'sit' : 'std';
                    const img = avatarCacheRef.current.get(`${ npc.figure }__${ posture }__${ npc.dir }`);
                    if (img && img.naturalWidth > 0)
                    {
                        const dh = (npc.kind === 'sofa' ? 37 : 44) * sc;
                        const dw = (img.naturalWidth / img.naturalHeight) * dh;
                        const bobY = npc.kind === 'queue' ? Math.sin(nowSec * 3.4 + npc.phase) * 1.0 * sc : 0;
                        ctx.imageSmoothingEnabled = false;
                        ctx.drawImage(img, sp.sx - dw / 2, sp.sy - dh + 4 * sc + bobY, dw, dh);
                    }
                }
            }

            // 4. Water ripples in pool
            for (const r of eng.ripples)
            {
                const sp = toScreen(r.bx, r.by);
                ctx.save();
                ctx.globalAlpha = Math.max(0, r.life / r.maxLife);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = Math.max(1, 1.5 * sc);
                ctx.beginPath();
                ctx.ellipse(sp.sx, sp.sy, r.r * sc, r.r * 0.48 * sc, 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            // 5. Two Active Fighters on the 7 Center Battle Buoys (depth-sorted!)
            const fightersOrdered = [ eng.opponent, eng.player ].sort((a, b) =>
            {
                const ay = buoyXY(2 + a.visualPos).y;
                const by = buoyXY(2 + b.visualPos).y;
                return ay - by;
            });
            for (const f of fightersOrdered)
            {
                const b = buoyXY(2 + f.visualPos);
                const sp = toScreen(b.x, b.y);
                drawFighterAt(ctx, f, sp.sx, sp.sy, sc, nowSec, f.isHuman);
            }

            // 6. Water Splash Droplets
            for (const s of eng.splashes)
            {
                const sp = toScreen(s.bx, s.by);
                ctx.save();
                ctx.globalAlpha = Math.max(0, s.life / s.maxLife);
                ctx.fillStyle = '#e0f7ff';
                ctx.strokeStyle = '#0284c7';
                ctx.lineWidth = 1;
                ctx.fillRect(sp.sx - s.size * sc / 2, sp.sy - s.size * sc / 2, s.size * sc, s.size * sc);
                ctx.strokeRect(sp.sx - s.size * sc / 2, sp.sy - s.size * sc / 2, s.size * sc, s.size * sc);
                ctx.restore();
            }

            // 7. Authentic Habbo Comic-Book Starburst Popups (WHACK!, ZZZAP!, CLUNK!, SWOOOSH!)
            for (const pop of eng.popups)
            {
                const sp = toScreen(pop.bx, pop.by);
                const frac = 1 - pop.life / pop.maxLife;
                const popSc = sc * (0.85 + Math.sin(Math.min(1, frac * 3) * Math.PI * 0.5) * 0.25);
                drawComicBurst(ctx, sp.sx, sp.sy - frac * 12 * sc, pop.text, pop.bg, pop.color, popSc, Math.min(1, pop.life * 2.5));
            }

            // 8. LIVE 2.5x ZOOMED JUMBOTRON TV SCREEN ("FUSE SHOW SYSTEM" billboard on the right cliff!)
            if (tvCtx && backdropImgRef.current)
            {
                const tvRect = toScreen(TV_X, TV_Y);
                const tvW = TV_W * sc;
                const tvH = TV_H * sc;

                // Focus camera on the live midpoint between the two fighters!
                const pBuoy = buoyXY(2 + eng.player.visualPos);
                const oBuoy = buoyXY(2 + eng.opponent.visualPos);
                const midX = (pBuoy.x + oBuoy.x) / 2;
                const midY = (pBuoy.y + oBuoy.y) / 2 - 18;

                // Source crop window in backdrop coords (~105x100 -> ~2.3x zoom!)
                const cropW = 104;
                const cropH = 98;
                const sx0 = midX - cropW / 2;
                const sy0 = midY - cropH / 2;

                tvCtx.imageSmoothingEnabled = false;
                tvCtx.fillStyle = '#3899b5';
                tvCtx.fillRect(0, 0, tvCanvas.width, tvCanvas.height);
                tvCtx.drawImage(
                    backdropImgRef.current,
                    sx0, sy0, cropW, cropH,
                    0, 0, tvCanvas.width, tvCanvas.height
                );

                const tvScale = tvCanvas.width / cropW;
                for (const f of fightersOrdered)
                {
                    const b = buoyXY(2 + f.visualPos);
                    drawFighterAt(
                        tvCtx,
                        f,
                        (b.x - sx0) * tvScale,
                        (b.y - sy0) * tvScale,
                        tvScale,
                        nowSec,
                        false
                    );
                }
                for (const pop of eng.popups)
                {
                    const frac = 1 - pop.life / pop.maxLife;
                    drawComicBurst(
                        tvCtx,
                        (pop.bx - sx0) * tvScale,
                        (pop.by - sy0 - frac * 10) * tvScale,
                        pop.text,
                        pop.bg,
                        pop.color,
                        tvScale * 0.72,
                        Math.min(1, pop.life * 2.5)
                    );
                }

                // Draw live Jumbotron onto the Rooftop TV billboard with crisp border + subtle CRT scanlines!
                ctx.save();
                ctx.beginPath();
                ctx.rect(tvRect.sx, tvRect.sy, tvW, tvH);
                ctx.clip();
                ctx.drawImage(tvCanvas, tvRect.sx, tvRect.sy, tvW, tvH);
                ctx.fillStyle = 'rgba(0, 20, 35, 0.08)';
                for (let ly = 0; ly < tvH; ly += Math.max(2, Math.round(3 * sc)))
                {
                    ctx.fillRect(tvRect.sx, tvRect.sy + ly, tvW, 1);
                }
                // Live red REC indicator dot in top-left of billboard
                if (Math.floor(nowSec * 2) % 2 === 0)
                {
                    ctx.fillStyle = '#ef4444';
                    ctx.beginPath();
                    ctx.arc(tvRect.sx + 8 * sc, tvRect.sy + 8 * sc, 2.5 * sc, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }

            // 9. Authentic Habbo Room Speech Bubbles
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

                const sp = toScreen(ch.bx, ch.by);
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
            if (!showLeaveModal && !showHelpModal && !showLeaderboardModal)
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
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            keysDownRef.current.clear();
        };
    }, [ stage, activeOpponent, showLeaveModal, showHelpModal, showLeaderboardModal, performFighterAction, spawnComicPopup, spawnSplash, pushChatBubble, finishMatch ]);

    const formatTime = (sec: number) => `${ Math.floor(sec / 60) }:${ String(sec % 60).padStart(2, '0') }`;
    const isDanger = Math.abs(hud.playerBalance) >= 72;
    const balanceHint = isDanger
        ? (hud.playerBalance < 0 ? '¡PULSA E / ESPACIO!' : '¡PULSA Q / ESPACIO!')
        : (hud.playerBalance < -25 ? 'Inclinado Izq. (E)' : (hud.playerBalance > 25 ? 'Inclinado Der. (Q)' : 'Equilibrado'));

    return (
        <div className="wobble-game-root">
            <div className="ws-layout">
                <div className="ws-canvas-area">
                    <canvas ref={ canvasRef } className="ws-arena-canvas" />

                    {/* Top-Left Shockwave Scoreboard (Best of 3 Rounds + Timer + Rival Balance) */}
                    { stage === 'playing' && (
                        <div className="ws-scoreboard">
                            <div className={ `ws-timer-pill ${ hud.timeLeft <= 10 ? 'is-urgent' : '' }` }>
                                <span>Ronda { hud.round }</span>
                                <span>·</span>
                                <span>{ formatTime(hud.timeLeft) }</span>
                            </div>

                            <div className="ws-match-well">
                                <div className="ws-fighter-row">
                                    <span className="ws-fighter-name">
                                        <span className="ws-side-dot is-player" />
                                        <span>{ myUsername } (Tú)</span>
                                    </span>
                                    <span className="ws-round-pips">
                                        {[ 0, 1 ].map(i => (
                                            <span key={ i } className={ `ws-pip ${ i < hud.playerRounds ? 'is-won' : '' }` } />
                                        ))}
                                    </span>
                                </div>

                                <div className="ws-fighter-row">
                                    <span className="ws-fighter-name">
                                        <span className="ws-side-dot is-rival" />
                                        <span>{ activeOpponent.name }</span>
                                    </span>
                                    <span className="ws-round-pips">
                                        {[ 0, 1 ].map(i => (
                                            <span key={ i } className={ `ws-pip ${ i < hud.opponentRounds ? 'is-rival-won' : '' }` } />
                                        ))}
                                    </span>
                                </div>

                                <div className="ws-rival-bal-bar" title="Equilibrio del rival">
                                    <div className="ws-rival-bal-center" />
                                    <div
                                        className="ws-rival-bal-marker"
                                        style={{ left: `${ Math.max(4, Math.min(96, 50 + hud.opponentBalance * 0.46)) }%` }}
                                    />
                                </div>
                            </div>

                            <div className="ws-score-foot">
                                <span>Rooftop Rumble</span>
                                <span>{ hud.score } pts · { hud.hitsLanded } golpes</span>
                            </div>
                        </div>
                    ) }

                    {/* Center Round Banner ("¡A LOS FLOTADORES!" / "¡RIVAL AL AGUA!") */}
                    { stage === 'playing' && roundBanner && (
                        <div className="ws-round-banner">
                            <div className="ws-banner-kicker">{ roundBanner.kicker }</div>
                            <div className="ws-banner-main">{ roundBanner.main }</div>
                        </div>
                    ) }

                    {/* AUTHENTIC HABBO SHOCKWAVE YELLOW CONTROL WINDOW (Wobble_controls_main.png 1:1!) */}
                    { stage === 'playing' && (
                        <div className={ `ws-control-panel ${ isDanger ? 'is-danger' : '' }` }>
                            <div className="ws-ctrl-header">
                                <span>Wobble Squabble</span>
                                <span>Q/E · A/D · N/M</span>
                            </div>
                            <div className="ws-ctrl-body">
                                <div className="ws-ctrl-keys-col">
                                    <div className="ws-key-group">
                                        <span className="ws-key-label">Equilibrio</span>
                                        <div className="ws-key-row">
                                            <button
                                                type="button"
                                                className={ `ws-keycap ${ pressedKeys.Q ? 'is-pressed' : '' }` }
                                                onMouseDown={ () => handleControlClick('Q') }
                                                title="Inclinar / Equilibrar Izquierda (Q)"
                                            >
                                                <span className="ws-keycap-inner">Q</span>
                                            </button>
                                            <button
                                                type="button"
                                                className={ `ws-keycap ${ pressedKeys.E ? 'is-pressed' : '' }` }
                                                onMouseDown={ () => handleControlClick('E') }
                                                title="Inclinar / Equilibrar Derecha (E)"
                                            >
                                                <span className="ws-keycap-inner">E</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="ws-key-group">
                                        <span className="ws-key-label">Empujar</span>
                                        <div className="ws-key-row">
                                            <button
                                                type="button"
                                                className={ `ws-keycap ${ pressedKeys.A ? 'is-pressed' : '' }` }
                                                onMouseDown={ () => handleControlClick('A') }
                                                title="Empujar hacia Izquierda (A)"
                                            >
                                                <span className="ws-keycap-inner">A</span>
                                            </button>
                                            <button
                                                type="button"
                                                className={ `ws-keycap ${ pressedKeys.D ? 'is-pressed' : '' }` }
                                                onMouseDown={ () => handleControlClick('D') }
                                                title="Empujar hacia Derecha (D)"
                                            >
                                                <span className="ws-keycap-inner">D</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="ws-key-group">
                                        <span className="ws-key-label">Moverse</span>
                                        <div className="ws-key-row">
                                            <button
                                                type="button"
                                                className={ `ws-keycap ${ pressedKeys.N ? 'is-pressed' : '' }` }
                                                onMouseDown={ () => handleControlClick('N') }
                                                title="Paso Izquierda (N o Flecha Izq)"
                                            >
                                                <span className="ws-keycap-inner">N</span>
                                            </button>
                                            <button
                                                type="button"
                                                className={ `ws-keycap ${ pressedKeys.M ? 'is-pressed' : '' }` }
                                                onMouseDown={ () => handleControlClick('M') }
                                                title="Paso Derecha (M o Flecha Der)"
                                            >
                                                <span className="ws-keycap-inner">M</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="ws-key-group">
                                        <span className="ws-key-label">Estabilizar</span>
                                        <button
                                            type="button"
                                            className={ `ws-space-btn ${ pressedKeys.SPACE ? 'is-pressed' : '' } ${ hud.stabCdPct > 0 ? 'is-cooldown' : '' }` }
                                            onMouseDown={ () => handleControlClick('SPACE') }
                                            title="Estabilizar equilibrio al centro (Espacio)"
                                        >
                                            <span className="ws-space-inner">
                                                { hud.stabCdPct > 0 && (
                                                    <span className="ws-space-cd-mask" style={{ transform: `scaleX(${ hud.stabCdPct / 100 })` }} />
                                                ) }
                                                <span>SPACE</span>
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                {/* Official Brushed-Metal Analog Balance Meter */}
                                <div className="ws-metal-meter">
                                    <span className="ws-screw tl" />
                                    <span className="ws-screw tr" />
                                    <span className="ws-screw bl" />
                                    <span className="ws-screw br" />
                                    <span className="ws-meter-title">Balance</span>
                                    <AnalogBalanceGauge balance={ hud.playerBalance } />
                                    <span
                                        className={ `ws-meter-hint ${ isDanger ? 'is-danger' : (hud.playerBalance < -25 ? 'is-left' : (hud.playerBalance > 25 ? 'is-right' : '')) }` }
                                    >
                                        { balanceHint }
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) }

                    {/* STAGE A OVERLAY: Pre-Match "El juego va a empezar" */}
                    { stage === 'lobby' && (
                        <div className="ws-overlay-center">
                            <div className="ws-starting-box">
                                <div className="ws-starting-title-pill">El juego va a empezar</div>
                                <div className="ws-starting-well">
                                    <div className="ws-vs-preview">
                                        <div className="ws-vs-card">
                                            <HabboHeadImg figure={ myFigure } direction={ 2 } size={ 40 } shockwaveSmall={ true } />
                                            <span>{ myUsername }</span>
                                        </div>
                                        <span className="ws-vs-badge">VS</span>
                                        <div className="ws-vs-card">
                                            <HabboHeadImg figure={ activeOpponent.figure } direction={ 4 } size={ 40 } shockwaveSmall={ true } />
                                            <span>{ activeOpponent.name }</span>
                                        </div>
                                    </div>
                                    <div className="ws-starting-bar-track">
                                        <div className="ws-starting-bar-fill" style={{ width: `${ Math.round(preProgress) }%` }} />
                                    </div>
                                    <button type="button" className="ws-sw-pill-btn" onClick={ exitToGameCenter }>
                                        Abandonar
                                    </button>
                                </div>
                                <div className="ws-starting-footer-pills">
                                    <span className="ws-starting-pill">
                                        { gamesLeftInfo.hasUnlimited ? '∞ HC' : `${ String(gamesLeftInfo.gamesLeft).padStart(3, '0') }` }
                                    </span>
                                    <span className="ws-starting-pill is-wide">
                                        Wobble Squabble · Rooftop Rumble
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) }

                    {/* STAGE C OVERLAY: Post-Match Results & Real Habbten Rewards */}
                    { stage === 'results' && finalSummary && (
                        <div className="ws-overlay-center">
                            <div className="ws-results-window">
                                <div className="ws-results-title-pill">Wobble Squabble · Resultados</div>
                                <div className="ws-results-card">
                                    <div className="ws-results-hero">
                                        <div className="ws-res-fighter">
                                            <HabboHeadImg figure={ myFigure } direction={ 2 } size={ 46 } shockwaveSmall={ true } />
                                            <span className="ws-res-name">{ myUsername }</span>
                                            <span className="ws-res-rounds">{ finalSummary.playerRounds }</span>
                                        </div>
                                        <div className="ws-res-verdict">
                                            <span className={ `ws-verdict-title ${ finalSummary.won ? 'is-win' : 'is-lose' }` }>
                                                { finalSummary.won ? '¡VICTORIA EN LA PISCINA!' : '¡AL AGUA! DERROTA' }
                                            </span>
                                            <span className="ws-verdict-sub">
                                                Al mejor de 3 rondas
                                            </span>
                                        </div>
                                        <div className="ws-res-fighter">
                                            <HabboHeadImg figure={ finalSummary.opponentFigure } direction={ 4 } size={ 46 } shockwaveSmall={ true } />
                                            <span className="ws-res-name">{ finalSummary.opponentName }</span>
                                            <span className="ws-res-rounds">{ finalSummary.opponentRounds }</span>
                                        </div>
                                    </div>

                                    <div className="ws-results-stats-grid">
                                        <div className="ws-stat-box">
                                            <div className="ws-stat-val">{ finalSummary.score }</div>
                                            <div className="ws-stat-lbl">Puntos Totales</div>
                                        </div>
                                        <div className="ws-stat-box">
                                            <div className="ws-stat-val">{ finalSummary.hitsLanded }</div>
                                            <div className="ws-stat-lbl">Golpes Acertados</div>
                                        </div>
                                        <div className="ws-stat-box">
                                            <div className="ws-stat-val">{ finalSummary.knockoffs }</div>
                                            <div className="ws-stat-lbl">Caídas Provocadas</div>
                                        </div>
                                    </div>

                                    <div className="ws-results-actions">
                                        <button
                                            type="button"
                                            className="ws-sw-pill-btn"
                                            disabled={ rematchBusy }
                                            onClick={ handleRematch }
                                        >
                                            { rematchBusy ? 'Cargando...' : 'Juega otra vez' }
                                        </button>
                                        <button type="button" className="ws-sw-pill-btn" onClick={ exitToGameCenter }>
                                            Abandonar
                                        </button>
                                    </div>
                                    { rematchError && (
                                        <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#991b1b', textAlign: 'center' }}>
                                            { rematchError }
                                        </div>
                                    ) }
                                </div>

                                <div className="ws-results-rewards-bar">
                                    { finishData?.rewards ? (
                                        <>
                                            <div className="ws-rewards-currencies">
                                                <span className="ws-reward-stat">
                                                    <span>+{ finishData.rewards.score } pts</span>
                                                </span>
                                                <span className="ws-reward-stat is-duckets">
                                                    <img src={ ducketIconImg } alt="Duckets" />
                                                    <span>+{ finishData.rewards.duckets } Duckets</span>
                                                </span>
                                                { finishData.rewards.credits > 0 && (
                                                    <span className="ws-reward-stat is-credits">
                                                        <img src={ creditIconImg } alt="Créditos" />
                                                        <span>+{ finishData.rewards.credits } Créditos</span>
                                                    </span>
                                                ) }
                                            </div>
                                            { finishData.unlocked_achievements && finishData.unlocked_achievements.length > 0 && (
                                                <div className="ws-badges-unlocked">
                                                    { finishData.unlocked_achievements.map(a =>
                                                    {
                                                        const tpl = GetConfiguration<string>('badge.asset.url', '/game/swf/c_images/album1584/%badgename%.gif');
                                                        const badgeSrc = tpl.replace('%badgename%', a.badge);
                                                        return (
                                                            <div key={ a.badge } className="ws-badge-unlock-item">
                                                                <img src={ badgeSrc } alt={ a.title } />
                                                                <div>
                                                                    <span className="ws-badge-kicker">¡Placa desbloqueada!</span>
                                                                    <span className="ws-badge-name">{ a.title }</span>
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

                {/* AUTHENTIC SHOCKWAVE 2006 BOTTOM TOOLBAR */}
                <div className="ws-bottom-hud" onClick={ () => { if (chatModeOpen) setChatModeOpen(false); } }>
                    <div
                        className="ws-hud-zone-avatar"
                        onMouseEnter={ () => setHoverLabel('Mi Personaje') }
                        onMouseLeave={ () => setHoverLabel('') }
                    >
                        <HabboHeadImg figure={ myFigure } direction={ 3 } size={ 36 } shockwaveSmall={ true } />
                    </div>

                    <div className="ws-hud-zone-chat">
                        <div className="ws-sw2006-chat-pill">
                            <button
                                type="button"
                                className="ws-sw2006-mode-btn"
                                onMouseEnter={ () => setHoverLabel('Modo de chat') }
                                onMouseLeave={ () => setHoverLabel('') }
                                onClick={ e => { e.stopPropagation(); setChatModeOpen(prev => !prev); } }
                            >
                                <span className="ws-mode-label">{ chatMode === 'say' ? 'Decir' : 'Gritar' }</span>
                                <span className="ws-mode-divider" />
                                <span className="ws-mode-arrow">▼</span>
                            </button>

                            { chatModeOpen && (
                                <div className="ws-sw2006-mode-menu" onClick={ e => e.stopPropagation() }>
                                    <button
                                        type="button"
                                        className={ `ws-sw2006-mode-item ${ chatMode === 'say' ? 'is-active' : '' }` }
                                        onClick={ () => { setChatMode('say'); setChatModeOpen(false); chatInputRef.current?.focus(); } }
                                    >
                                        Decir
                                    </button>
                                    <button
                                        type="button"
                                        className={ `ws-sw2006-mode-item ${ chatMode === 'shout' ? 'is-active' : '' }` }
                                        onClick={ () => { setChatMode('shout'); setChatModeOpen(false); chatInputRef.current?.focus(); } }
                                    >
                                        Gritar
                                    </button>
                                </div>
                            ) }

                            <form className="ws-sw-chat-form" onSubmit={ handleChatSubmit }>
                                <input
                                    ref={ chatInputRef }
                                    type="text"
                                    maxLength={ 64 }
                                    placeholder=""
                                    aria-label="Hablar en Wobble Squabble"
                                    value={ chatText }
                                    onKeyDown={ e => e.stopPropagation() }
                                    onChange={ e => setChatText(e.target.value) }
                                />
                            </form>
                        </div>
                        <div className="ws-sw2006-hover-label">{ hoverLabel }</div>
                    </div>

                    <div className="ws-hud-zone-icons">
                        <button
                            type="button"
                            className={ `ws-sw-icon-btn ${ sfxMuted ? 'is-muted' : '' }` }
                            onMouseEnter={ () => setHoverLabel(sfxMuted ? 'Activar sonidos' : 'Silenciar sonidos') }
                            onMouseLeave={ () => setHoverLabel('') }
                            onClick={ toggleSfx }
                        >
                            <img src={ hudSfxIconImg } alt="Sonidos" className="ws-ico-audio" />
                        </button>
                        <button
                            type="button"
                            className="ws-sw-icon-btn"
                            onMouseEnter={ () => setHoverLabel('Clasificación de Wobble Squabble') }
                            onMouseLeave={ () => setHoverLabel('') }
                            onClick={ () => setShowLeaderboardModal(true) }
                        >
                            <img src={ clubClipboardImg } alt="Ranking" className="ws-ico-rank" />
                        </button>
                        <button
                            type="button"
                            className="ws-sw-icon-btn"
                            onMouseEnter={ () => setHoverLabel('Salir al Hotel') }
                            onMouseLeave={ () => setHoverLabel('') }
                            onClick={ () => setShowLeaveModal(true) }
                        >
                            <img src={ hudExitHotelImg } alt="Salir" className="ws-ico-hotel" />
                        </button>
                        <button
                            type="button"
                            className="ws-sw-icon-btn"
                            onMouseEnter={ () => setHoverLabel('Ayuda de Wobble Squabble') }
                            onMouseLeave={ () => setHoverLabel('') }
                            onClick={ () => setShowHelpModal(true) }
                        >
                            <img src={ hudHelpIconImg } alt="Ayuda" className="ws-ico-help" />
                        </button>
                    </div>
                </div>

                {/* LEAVE MODAL */}
                { showLeaveModal && (
                    <div className="ws-modal-backdrop">
                        <div className="ws-sw-window is-compact">
                            <div className="ws-sw-header">
                                <span className="ws-sw-dots" />
                                <span className="ws-sw-title">¿Salir de Wobble Squabble?</span>
                                <span className="ws-sw-dots" />
                                <button type="button" className="ws-sw-close" title="Cerrar" aria-label="Cerrar" onClick={ () => setShowLeaveModal(false) }>
                                </button>
                            </div>
                            <div className="ws-sw-body">
                                <div style={{ fontSize: '12px', lineHeight: 1.45, color: '#111827' }}>
                                    Si sales de la piscina ahora, no se guardarán los puntos ni las recompensas de este duelo de <b>Wobble Squabble</b>.
                                </div>
                                <div className="ws-sw-footer">
                                    <button type="button" className="ws-sw-btn" onClick={ () => setShowLeaveModal(false) }>
                                        Seguir jugando
                                    </button>
                                    <button type="button" className="ws-sw-btn is-danger" onClick={ exitToGameCenter }>
                                        Salir al Game Center
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) }

                {/* HELP MODAL */}
                { showHelpModal && (
                    <div className="ws-modal-backdrop">
                        <div className="ws-sw-window is-wide">
                            <div className="ws-sw-header">
                                <span className="ws-sw-dots" />
                                <span className="ws-sw-title">Cómo jugar a Wobble Squabble</span>
                                <span className="ws-sw-dots" />
                                <button type="button" className="ws-sw-close" title="Cerrar" aria-label="Cerrar" onClick={ () => setShowHelpModal(false) }>
                                </button>
                            </div>
                            <div className="ws-sw-body">
                                <div style={{ fontSize: '11.5px', lineHeight: 1.55, color: '#111827', background: '#ffffff', border: '1px solid #8a9599', borderRadius: '3px', padding: '9px 11px' }}>
                                    <b>Objetivo:</b> Mantén el equilibrio sobre los flotadores de la piscina Rooftop Rumble mientras empujas a tu oponente al agua. ¡El primero en ganar <b>2 rondas</b> gana el duelo!<br /><br />
                                    • <b>Q / E (Equilibrio):</b> Contrarresta la inclinación de la aguja del medidor <i>Balance</i> hacia la izquierda o derecha.<br />
                                    • <b>A / D (Empujar):</b> Lanza un empujón hacia la izquierda (<b>A</b>) o derecha (<b>D</b>). Si empujas hacia el mismo lado al que tu rival ya se inclina, ¡harás un golpe crítico <b>ZZZAP!</b>!<br />
                                    • <b>N / M o Flechas Izq/Der (Moverse):</b> Avanza o retrocede por los 7 flotadores centrales.<br />
                                    • <b>SPACE (Estabilizar):</b> Centra rápidamente tu equilibrio cuando estés a punto de caer.<br />
                                    • <b>Cuidado:</b> Si lanzas un golpe estando demasiado lejos (<b>SWOOOSH!</b>), perderás tu propio equilibrio.
                                </div>
                                <div className="ws-sw-footer is-center">
                                    <button type="button" className="ws-sw-btn is-primary" onClick={ () => setShowHelpModal(false) }>
                                        ¡Entendido!
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) }

                {/* LEADERBOARD MODAL */}
                { showLeaderboardModal && (
                    <div className="ws-modal-backdrop">
                        <div className="ws-sw-window is-wide">
                            <div className="ws-sw-header">
                                <span className="ws-sw-dots" />
                                <span className="ws-sw-title">Clasificación de Wobble Squabble</span>
                                <span className="ws-sw-dots" />
                                <button type="button" className="ws-sw-close" title="Cerrar" aria-label="Cerrar" onClick={ () => setShowLeaderboardModal(false) }>
                                </button>
                            </div>
                            <div className="ws-sw-body">
                                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                    { ([
                                        [ 'week', 'Semana' ],
                                        [ 'all', 'Histórico' ],
                                        [ 'friends', 'Amigos' ],
                                        [ 'history', 'Mis duelos' ]
                                    ] as const).map(([ k, label ]) => (
                                        <button
                                            key={ k }
                                            type="button"
                                            className={ `ws-sw-btn ${ lbTab === k ? 'is-active' : '' }` }
                                            onClick={ () => setLbTab(k) }
                                        >
                                            { label }
                                        </button>
                                    )) }
                                </div>
                                <div className="ws-sw-list-box">
                                    { lbLoading ? (
                                        <div style={{ textAlign: 'center', padding: '24px', color: '#4b5563' }}>Cargando...</div>
                                    ) : lbTab === 'history' ? (
                                        historyRows.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '24px', color: '#4b5563' }}>Aún no has completado duelos de Wobble Squabble.</div>
                                        ) : (
                                            historyRows.map(m => (
                                                <div key={ m.id } className="ws-sw-list-row" style={{ justifyContent: 'space-between' }}>
                                                    <span>
                                                        <b>vs { m.opponent_name }</b> ({ m.rounds_won }-{ m.rounds_lost }) · { m.hits_landed } golpes
                                                    </span>
                                                    <span style={{ fontWeight: 800, color: m.won ? '#15803d' : '#b91c1c' }}>
                                                        { m.score } pts · +{ m.reward_duckets }D{ m.reward_credits > 0 ? ` +${ m.reward_credits }C` : '' }
                                                    </span>
                                                </div>
                                            ))
                                        )
                                    ) : lbEntries.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '24px', color: '#4b5563' }}>¡Sé el primero en entrar en el ranking de la piscina!</div>
                                    ) : (
                                        lbEntries.map(e => (
                                            <div key={ e.userId } className="ws-sw-list-row">
                                                <b style={{ width: '20px', color: e.rank === 1 ? '#b45309' : '#1e40af' }}>{ e.rank }</b>
                                                <HabboHeadImg figure={ e.figure } direction={ 2 } size={ 28 } shockwaveSmall={ true } />
                                                <div style={{ flex: 1 }}>
                                                    <b>{ e.username }</b>
                                                    <div style={{ fontSize: '10px', color: '#4b5563' }}>{ e.wins } victorias · { e.knockoffs } al agua</div>
                                                </div>
                                                <b style={{ color: '#0e7490' }}>{ e.score.toLocaleString('es-ES') }</b>
                                            </div>
                                        ))
                                    ) }
                                </div>
                                <div className="ws-sw-footer is-center">
                                    <button type="button" className="ws-sw-btn" onClick={ () => setShowLeaderboardModal(false) }>
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
