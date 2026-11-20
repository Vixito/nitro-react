import { AvatarAction, AvatarScaleType, AvatarSetType, IAvatarImageListener } from '@nitrots/nitro-renderer';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GetAvatarRenderManager, GetConfiguration, GetSessionDataManager } from '../../../api';
import { useGameCenter } from '../../../hooks';
import { HabboHeadImg, trimTransparentImage } from './SnowStormAvatar';

// Official cleaned Fast Food assets (restaurant, 5 food sprites, Habbten logo, original Sulake buttons, theme music)
import ffArenaClassicImg from '../../../assets/images/gamecenter/fastfood/ff_arena_classic.png';
import ffLogoHabbtenImg from '../../../assets/images/gamecenter/fastfood/ff_logo_habbten.png';
import ffFoodSoupImg from '../../../assets/images/gamecenter/fastfood/ff_food_soup.png';
import ffFoodPizzaImg from '../../../assets/images/gamecenter/fastfood/ff_food_pizza.png';
import ffFoodBurgerImg from '../../../assets/images/gamecenter/fastfood/ff_food_burger.png';
import ffFoodDrinksImg from '../../../assets/images/gamecenter/fastfood/ff_food_drinks.png';
import ffFoodCakeImg from '../../../assets/images/gamecenter/fastfood/ff_food_cake.png';
import ffBtnDropImg from '../../../assets/images/gamecenter/fastfood/ff_btn_drop.png';
import ffBtnOpenChuteImg from '../../../assets/images/gamecenter/fastfood/ff_btn_open_chute.png';
import ffBtnParachuteImg from '../../../assets/images/gamecenter/fastfood/ff_btn_parachute.png';
import ffBtnMissileImg from '../../../assets/images/gamecenter/fastfood/ff_btn_missile.png';
import ffBtnShieldImg from '../../../assets/images/gamecenter/fastfood/ff_btn_shield.png';
import ffBtnAudioImg from '../../../assets/images/gamecenter/fastfood/ff_btn_audio.png';
import ffBtnTrophyImg from '../../../assets/images/gamecenter/fastfood/ff_btn_trophy.png';
import ffThemeAudioUrl from '../../../assets/images/gamecenter/fastfood/ff_theme.ogg';

import creditIconImg from '../../../assets/images/eras/flash2012/purse/credit_icon.png';
import ducketIconImg from '../../../assets/images/eras/flash2012/purse/ducket_icon.png';

import './FastFoodGameView.scss';

// =============================================================================
// EXACT GEOMETRY OF ff_arena_classic.png (1327x658)
// =============================================================================
const BG_W = 1327;
const BG_H = 658;
const LANE_X = [ 338, 665, 993 ];
const RIBBON_Y = 14;
const ARCH_CLIP_BOTTOM_Y = 132;
const LEDGE_FOOD_Y = 134;
const STAR_BOARD_Y = 171;
const DROP_START_Y = 148;
const TABLE_LAND_Y = 556;
const TARGET_STARS = 6;
const MAX_POWERUP_PER_MATCH = 3;

type Stage = 'lobby' | 'playing' | 'results';
type FoodKey = 'soup' | 'pizza' | 'burger' | 'drinks' | 'cake';
type PowerUpKey = 'missile' | 'parachute' | 'shield';

interface FoodSpec {
    key: FoodKey;
    label: string;
    imgSrc: string;
    weight: 1 | 2 | 3;
    gravity: number;       // px/s^2
    prepSec: number;       // base ready wait
    penaltySec: number;    // extra wait if smashed/blown up
    safeSpeed: number;     // max vy (px/s) for safe landing without shield
}

const FOOD_SPECS: Record<FoodKey, FoodSpec> = {
    soup: { key: 'soup', label: 'Sopa', imgSrc: ffFoodSoupImg, weight: 1, gravity: 245, prepSec: 0.9, penaltySec: 1.4, safeSpeed: 145 },
    pizza: { key: 'pizza', label: 'Pizza', imgSrc: ffFoodPizzaImg, weight: 1, gravity: 260, prepSec: 0.95, penaltySec: 1.5, safeSpeed: 145 },
    burger: { key: 'burger', label: 'Hamburguesa', imgSrc: ffFoodBurgerImg, weight: 2, gravity: 325, prepSec: 1.15, penaltySec: 1.85, safeSpeed: 138 },
    drinks: { key: 'drinks', label: 'Bebidas', imgSrc: ffFoodDrinksImg, weight: 3, gravity: 385, prepSec: 1.35, penaltySec: 2.1, safeSpeed: 130 },
    cake: { key: 'cake', label: 'Tarta', imgSrc: ffFoodCakeImg, weight: 3, gravity: 415, prepSec: 1.55, penaltySec: 2.35, safeSpeed: 128 }
};

// Authentic 6-course progression (Appetizer Soup -> Entree -> Drinks -> Dessert Cake!)
const COURSE_SEQUENCE: FoodKey[] = [ 'soup', 'pizza', 'burger', 'drinks', 'burger', 'cake' ];

const RIVAL_WAITERS: Array<{ name: string; figure: string; skill: number; badges: string[] }> = [
    { name: 'ChefLuna', figure: 'hr-515-33.hd-600-1.ch-635-70.lg-710-64.sh-730-62', skill: 0.88, badges: [ 'ACH_BaseJumpWins3', 'ACH_BaseJumpMissile2' ] },
    { name: 'DonSalsa', figure: 'hr-155-42.hd-180-2.ch-210-66.lg-270-82.sh-290-80', skill: 0.94, badges: [ 'ACH_BaseJumpWins5', 'ACH_BaseJumpBigParachute4' ] },
    { name: 'BistroMax', figure: 'hr-165-45.hd-190-3.ch-255-76.lg-280-64.sh-300-64', skill: 0.91, badges: [ 'ACH_BaseJumpWins2', 'ACH_BaseJumpShield3' ] },
    { name: 'TartaPro', figure: 'hr-545-39.hd-605-2.ch-665-92.lg-700-66.sh-725-92', skill: 0.97, badges: [ 'ACH_BaseJumpWins6', 'ACH_BaseJumpDaysPlayed4' ] },
    { name: 'MeseroX', figure: 'hr-115-61.hd-185-4.ch-215-73.lg-275-62.sh-295-62', skill: 0.86, badges: [ 'ACH_BaseJumpWins1', 'ACH_BaseJumpMissile3' ] }
];

interface LaneState {
    index: number;
    name: string;
    figure: string;
    waiterFigure: string;
    isHuman: boolean;
    skill: number;
    badges: string[];
    stars: number;
    smashed: number;
    platePhase: 'prepping' | 'ready' | 'falling' | 'landed';
    prepTimer: number;
    prepTotal: number;
    foodKey: FoodKey;
    plateY: number;
    plateVy: number;
    chute: 'none' | 'normal' | 'big';
    chuteOpenAnim: number;
    shielded: boolean;
    landedTimer: number;
    splatTimer: number;
    happyTimer: number;
    missilesLeft: number;
    parachutesLeft: number;
    shieldsLeft: number;
    missilesUsed: number;
    parachutesUsed: number;
    shieldsUsed: number;
    aiThinkTimer: number;
    aiTargetOpenY: number;
}

interface HomingMissile {
    id: number;
    fromLane: number;
    targetLane: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    angle: number;
    smokeTimer: number;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
    color: string;
    life: number;
    maxLife: number;
    gravity: number;
}

interface FloatingBanner {
    x: number;
    y: number;
    text: string;
    color: string;
    life: number;
    maxLife: number;
}

interface Inventory {
    missiles: number;
    parachutes: number;
    shields: number;
}

interface LeaderboardEntry {
    rank: number;
    userId: number;
    username: string;
    figure: string;
    score: number;
    wins: number;
    platesLanded: number;
}

interface HistoryRow {
    id: number;
    won: number;
    stars: number;
    plates_smashed: number;
    score: number;
    reward_credits: number;
    reward_duckets: number;
    bonus_powerup: string;
    created_at: number;
}

interface FinishResp {
    success: boolean;
    won?: boolean;
    bonus_powerup?: string;
    duckets?: number;
    inventory?: Inventory;
    rewards?: { score: number; duckets: number; credits: number };
    unlocked_achievements?: Array<{ badge: string; tier: number; title: string }>;
    games_left?: number;
    has_unlimited?: boolean;
}

/**
 * Dresses any Habbo avatar in the classic FastFood white-shirt / black-vest waiter uniform
 * while preserving their real head, hair, face, and accessories!
 */
function toWaiterFigure(rawFigure: string): string
{
    const base = rawFigure && rawFigure.includes('-')
        ? rawFigure
        : 'hr-100-61.hd-180-1.ch-210-66.lg-270-82.sh-290-80';
    const kept: string[] = [];
    let hasHead = false;
    for (const part of base.split('.'))
    {
        const seg = part.split('-')[0];
        if (seg === 'hd') { hasHead = true; kept.push(part); }
        else if (seg === 'hr' || seg === 'ha' || seg === 'he' || seg === 'ea' || seg === 'fa') kept.push(part);
    }
    if (!hasHead) kept.push('hd-180-1');
    kept.push('ch-255-110'); // Crisp white dress shirt
    kept.push('cc-260-61');  // Black waiter waistcoat / vest
    kept.push('lg-275-61');
    return kept.join('.');
}

// =============================================================================
// RETRO WEB AUDIO SFX ENGINE FOR FAST FOOD
// =============================================================================
class FastFoodSfx
{
    private ctx: AudioContext | null = null;
    public muted = false;

    private getCtx(): AudioContext | null
    {
        if (this.muted) return null;
        if (!this.ctx && typeof window !== 'undefined')
        {
            const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (AC) this.ctx = new AC();
        }
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        return this.ctx;
    }

    public playBeep(high = false)
    {
        const ctx = this.getCtx();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(high ? 880 : 520, now);
        gain.gain.setValueAtTime(0.13, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (high ? 0.25 : 0.14));
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.28);
    }

    public playDrop()
    {
        const ctx = this.getCtx();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(580, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.14);
        gain.gain.setValueAtTime(0.11, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.16);
    }

    public playParachute(big = false)
    {
        const ctx = this.getCtx();
        if (!ctx) return;
        const now = ctx.currentTime;
        const len = Math.floor(ctx.sampleRate * (big ? 0.26 : 0.18));
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.sin((i / len) * Math.PI);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.setValueAtTime(big ? 420 : 680, now);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(big ? 0.24 : 0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (big ? 0.26 : 0.18));
        src.connect(f);
        f.connect(gain);
        gain.connect(ctx.destination);
        src.start(now);
    }

    public playMissileLaunch()
    {
        const ctx = this.getCtx();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(860, now + 0.22);
        gain.gain.setValueAtTime(0.11, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
    }

    public playExplosion()
    {
        const ctx = this.getCtx();
        if (!ctx) return;
        const now = ctx.currentTime;
        const len = Math.floor(ctx.sampleRate * 0.35);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.5);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.setValueAtTime(620, now);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        src.connect(f);
        f.connect(gain);
        gain.connect(ctx.destination);
        src.start(now);
    }

    public playShield()
    {
        const ctx = this.getCtx();
        if (!ctx) return;
        const now = ctx.currentTime;
        [ 587, 880, 1175 ].forEach((freq, i) =>
        {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.045);
            gain.gain.setValueAtTime(0.09, now + i * 0.045);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.045 + 0.14);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.045);
            osc.stop(now + i * 0.045 + 0.15);
        });
    }

    public playLandSafe()
    {
        const ctx = this.getCtx();
        if (!ctx) return;
        const now = ctx.currentTime;
        [ 660, 990 ].forEach((freq, i) =>
        {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.06);
            gain.gain.setValueAtTime(0.14, now + i * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.18);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.06);
            osc.stop(now + i * 0.06 + 0.2);
        });
    }

    public playSplat()
    {
        const ctx = this.getCtx();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(190, now);
        osc.frequency.exponentialRampToValueAtTime(52, now + 0.22);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
    }

    public playVictory(won: boolean)
    {
        const ctx = this.getCtx();
        if (!ctx) return;
        const now = ctx.currentTime;
        const notes = won ? [ 523.25, 659.25, 783.99, 1046.5 ] : [ 392.0, 349.23, 311.13, 261.63 ];
        notes.forEach((freq, i) =>
        {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.11);
            gain.gain.setValueAtTime(0.14, now + i * 0.11);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.11 + 0.24);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.11);
            osc.stop(now + i * 0.11 + 0.26);
        });
    }
}

// =============================================================================
// CRISP VECTOR POWER-UP & BUTTON ICONS (MATCHES FASTFOOD 2012 ARTWORK!)
// =============================================================================
const MissileIconSvg: FC<{ size?: number }> = ({ size = 40 }) => (
    <svg width={ size } height={ size } viewBox="0 0 48 48">
        <g transform="rotate(35 24 24)">
            <path d="M24 5 C29 12 31 20 31 30 L17 30 C17 20 19 12 24 5 Z" fill="#f3f4f6" stroke="#111827" strokeWidth="2.2" />
            <path d="M24 5 C28 10 30 15 30.5 18 L17.5 18 C18 15 20 10 24 5 Z" fill="#ef4444" stroke="#111827" strokeWidth="2" />
            <path d="M17 25 L10 33 L17 33 Z" fill="#dc2626" stroke="#111827" strokeWidth="2" />
            <path d="M31 25 L38 33 L31 33 Z" fill="#dc2626" stroke="#111827" strokeWidth="2" />
            <rect x="20" y="30" width="8" height="4" fill="#374151" stroke="#111827" strokeWidth="1.8" />
            <path d="M21 34 L24 43 L27 34 Z" fill="#fbbf24" />
            <circle cx="24" cy="23" r="3" fill="#38bdf8" stroke="#111827" strokeWidth="1.6" />
        </g>
    </svg>
);

const BigParachuteIconSvg: FC<{ size?: number }> = ({ size = 40 }) => (
    <svg width={ size } height={ size } viewBox="0 0 48 48">
        <path d="M5 24 C5 12 13 6 24 6 C35 6 43 12 43 24 C39 21 35 21 31 24 C27 21 21 21 17 24 C13 21 9 21 5 24 Z" fill="#16a34a" stroke="#111827" strokeWidth="2.2" />
        <path d="M13 10 C18 7 30 7 35 10 C32 14 16 14 13 10 Z" fill="#dcfce7" />
        <path d="M8 17 C16 14 32 14 40 17 C38 20 10 20 8 17 Z" fill="#bbf7d0" />
        <line x1="7" y1="24" x2="24" y2="40" stroke="#f8fafc" strokeWidth="1.6" />
        <line x1="17" y1="24" x2="24" y2="40" stroke="#f8fafc" strokeWidth="1.6" />
        <line x1="31" y1="24" x2="24" y2="40" stroke="#f8fafc" strokeWidth="1.6" />
        <line x1="41" y1="24" x2="24" y2="40" stroke="#f8fafc" strokeWidth="1.6" />
        <circle cx="24" cy="40" r="3.5" fill="#fbbf24" stroke="#111827" strokeWidth="1.6" />
    </svg>
);

const RedParachuteIconSvg: FC<{ size?: number }> = ({ size = 48 }) => (
    <svg width={ size } height={ size } viewBox="0 0 48 48">
        <path d="M6 24 C6 12 14 6 24 6 C34 6 42 12 42 24 C38 21 34 21 30 24 C26 21 22 21 18 24 C14 21 10 21 6 24 Z" fill="#ffffff" stroke="#111827" strokeWidth="2.2" />
        <path d="M16 7 C19 6 29 6 32 7 L30 23 C26 21 22 21 18 23 Z" fill="#fee2e2" />
        <line x1="8" y1="24" x2="24" y2="41" stroke="#ffffff" strokeWidth="2" />
        <line x1="18" y1="24" x2="24" y2="41" stroke="#ffffff" strokeWidth="2" />
        <line x1="30" y1="24" x2="24" y2="41" stroke="#ffffff" strokeWidth="2" />
        <line x1="40" y1="24" x2="24" y2="41" stroke="#ffffff" strokeWidth="2" />
        <ellipse cx="24" cy="41" rx="7" ry="3" fill="#ffffff" stroke="#111827" strokeWidth="1.6" />
    </svg>
);

const ShieldIconSvg: FC<{ size?: number }> = ({ size = 40 }) => (
    <svg width={ size } height={ size } viewBox="0 0 48 48">
        <path d="M24 5 L40 11 L38 27 C37 35 31 41 24 44 C17 41 11 35 10 27 L8 11 Z" fill="#2dd4bf" stroke="#111827" strokeWidth="2.4" />
        <path d="M24 9 L36 14 L34 26 C33 32 29 37 24 39 C19 37 15 32 14 26 L12 14 Z" fill="#67e8f9" stroke="#0e7490" strokeWidth="1.5" />
        <circle cx="24" cy="23" r="7" fill="#0891b2" stroke="#ecfeff" strokeWidth="1.8" />
        <circle cx="22" cy="21" r="2.2" fill="#ffffff" />
    </svg>
);

const GreenDropArrowSvg: FC<{ size?: number }> = ({ size = 50 }) => (
    <svg width={ size } height={ size } viewBox="0 0 48 48">
        <rect x="17" y="6" width="14" height="5" rx="1.5" fill="#84cc16" stroke="#1a2e05" strokeWidth="2" />
        <path d="M17 14 L31 14 L31 25 L39 25 L24 42 L9 25 L17 25 Z" fill="#84cc16" stroke="#1a2e05" strokeWidth="2.4" />
        <path d="M20 16 L24 16 L24 34 L16 26 L20 26 Z" fill="#bef264" />
    </svg>
);

const SpeakerIconSvg: FC<{ size?: number }> = ({ size = 28 }) => (
    <svg width={ size } height={ size } viewBox="0 0 32 32">
        <path d="M6 12 L13 12 L22 5 L22 27 L13 20 L6 20 Z" fill="#f59e0b" stroke="#000000" strokeWidth="2" />
        <path d="M25 11 C27 13 27 19 25 21" fill="none" stroke="#fde047" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
);

const TrophyIconSvg: FC<{ size?: number }> = ({ size = 26 }) => (
    <svg width={ size } height={ size } viewBox="0 0 32 32">
        <path d="M9 6 L23 6 L22 15 C22 19 19 22 16 22 C13 22 10 19 10 15 Z" fill="#facc15" stroke="#000000" strokeWidth="2" />
        <path d="M9 8 L5 8 C5 13 7 15 10 15" fill="none" stroke="#facc15" strokeWidth="2.4" />
        <path d="M23 8 L27 8 C27 13 25 15 22 15" fill="none" stroke="#facc15" strokeWidth="2.4" />
        <rect x="14" y="22" width="4" height="4" fill="#ca8a04" stroke="#000000" strokeWidth="1.5" />
        <rect x="10" y="26" width="12" height="3" rx="1" fill="#f59e0b" stroke="#000000" strokeWidth="1.5" />
    </svg>
);

// =============================================================================
// MAIN COMPONENT: FAST FOOD (HABBTEN BASEJUMP 2012)
// =============================================================================
export const FastFoodGameView: FC = () =>
{
    const { setIsFastFoodPlaying, setIsVisible } = useGameCenter();
    const session = GetSessionDataManager();
    const myUsername = session?.userName || 'Jugador';
    const myFigure = session?.figure || 'hr-100-61.hd-180-1.ch-210-66.lg-270-82.sh-290-80';

    const [ stage, setStage ] = useState<Stage>('lobby');
    const [ audioMuted, setAudioMuted ] = useState<boolean>(false);
    const [ countdownText, setCountdownText ] = useState<string | null>(null);
    const [ inventory, setInventory ] = useState<Inventory>({ missiles: 3, parachutes: 3, shields: 3 });
    const [ duckets, setDuckets ] = useState<number>(0);
    const [ myBadges, setMyBadges ] = useState<string[]>([]);
    const [ weeklyGames, setWeeklyGames ] = useState<number>(0);
    const [ gamesLeftInfo, setGamesLeftInfo ] = useState<{ gamesLeft: number; hasUnlimited: boolean }>({
        gamesLeft: 5,
        hasUnlimited: false
    });
    const [ shopBusy, setShopBusy ] = useState<boolean>(false);
    const [ shopMsg, setShopMsg ] = useState<{ text: string; isErr?: boolean } | null>(null);
    const [ startBusy, setStartBusy ] = useState<boolean>(false);

    const [ showLeaderboard, setShowLeaderboard ] = useState<boolean>(false);
    const [ lbTab, setLbTab ] = useState<'week' | 'all' | 'friends' | 'history'>('week');
    const [ lbLoading, setLbLoading ] = useState<boolean>(false);
    const [ lbEntries, setLbEntries ] = useState<LeaderboardEntry[]>([]);
    const [ historyRows, setHistoryRows ] = useState<HistoryRow[]>([]);

    const [ actionHud, setActionHud ] = useState<{
        phase: 'prepping' | 'ready' | 'falling' | 'landed';
        chute: 'none' | 'normal' | 'big';
        shielded: boolean;
        prepPct: number;
        missilesLeft: number;
        parachutesLeft: number;
        shieldsLeft: number;
        canFireMissile: boolean;
    }>({
        phase: 'prepping',
        chute: 'none',
        shielded: false,
        prepPct: 0,
        missilesLeft: 3,
        parachutesLeft: 3,
        shieldsLeft: 3,
        canFireMissile: false
    });

    const [ matchResult, setMatchResult ] = useState<{
        won: boolean;
        winnerName: string;
        standings: Array<{ name: string; stars: number; isHuman: boolean }>;
        platesSmashed: number;
        durationSec: number;
    } | null>(null);
    const [ finishData, setFinishData ] = useState<FinishResp | null>(null);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const audioElRef = useRef<HTMLAudioElement | null>(null);
    const sfxRef = useRef<FastFoodSfx>(new FastFoodSfx());
    const arenaImgRef = useRef<HTMLImageElement | null>(null);
    const foodImgsRef = useRef<Partial<Record<FoodKey, HTMLImageElement>>>({});
    const waiterImgsRef = useRef<Map<string, HTMLImageElement>>(new Map());
    const waiterReadyRef = useRef<Set<string>>(new Set());
    const badgeImgsRef = useRef<Map<string, HTMLImageElement>>(new Map());
    const matchFinishedRef = useRef<boolean>(false);

    const engineRef = useRef<{
        running: boolean;
        started: boolean;
        matchStartMs: number;
        lanes: LaneState[];
        missiles: HomingMissile[];
        particles: Particle[];
        banners: FloatingBanner[];
        nextId: number;
    } | null>(null);

    // Pick 2 distinct rivals per match
    const pickRivals = useCallback(() =>
    {
        const shuffled = [ ...RIVAL_WAITERS ].sort(() => Math.random() - 0.5);
        return [ shuffled[0], shuffled[1] ];
    }, []);

    // Load status, inventory, badges & Duckets from backend
    const refreshStatus = useCallback(() =>
    {
        fetch('/api/games/fastfood/status', { credentials: 'include' })
            .then(r => r.ok ? r.json() : null)
            .then(data =>
            {
                if (!data?.success) return;
                setGamesLeftInfo({
                    gamesLeft: typeof data.games_left === 'number' ? data.games_left : 5,
                    hasUnlimited: !!data.has_unlimited
                });
                if (data.inventory) setInventory(data.inventory);
                if (typeof data.duckets === 'number') setDuckets(data.duckets);
                if (Array.isArray(data.badges)) setMyBadges(data.badges.slice(0, 6));
                if (data.stats) setWeeklyGames(Number(data.stats.weekly_games || 0));
            })
            .catch(() => {});
    }, []);

    useEffect(() => { refreshStatus(); }, [ refreshStatus ]);

    // Preload arena image + all 5 official food sprites + official OGG theme song
    useEffect(() =>
    {
        const bg = new Image();
        bg.src = ffArenaClassicImg;
        bg.onload = () => { arenaImgRef.current = bg; };

        (Object.keys(FOOD_SPECS) as FoodKey[]).forEach(k =>
        {
            const fImg = new Image();
            fImg.src = FOOD_SPECS[k].imgSrc;
            fImg.onload = () => { foodImgsRef.current[k] = fImg; };
        });

        const audio = new Audio(ffThemeAudioUrl);
        audio.loop = true;
        audio.volume = 0.28;
        audioElRef.current = audio;

        return () =>
        {
            audio.pause();
            audio.src = '';
            audioElRef.current = null;
        };
    }, []);

    // Sync audio mute state
    useEffect(() =>
    {
        sfxRef.current.muted = audioMuted;
        if (audioElRef.current)
        {
            audioElRef.current.muted = audioMuted;
            if (!audioMuted && stage === 'playing')
            {
                audioElRef.current.play().catch(() => {});
            }
        }
    }, [ audioMuted, stage ]);

    // Preload real trimmed Habbo Waiter avatar sprite
    const ensureWaiterSprite = useCallback((waiterFigure: string) =>
    {
        if (waiterReadyRef.current.has(waiterFigure)) return;
        try
        {
            const mgr = GetAvatarRenderManager();
            if (!mgr) return;
            const load = () =>
            {
                const listener: IAvatarImageListener = {
                    resetFigure: () => { load(); },
                    dispose: () => {},
                    disposed: false
                };
                const avatar = mgr.createAvatarImage(waiterFigure, AvatarScaleType.LARGE, null, listener);
                if (!avatar) return;
                avatar.initActionAppends();
                avatar.appendAction(AvatarAction.POSTURE, AvatarAction.POSTURE_STAND);
                avatar.endActionAppends();
                avatar.setDirection(AvatarSetType.FULL, 3);
                const img = avatar.getCroppedImage(AvatarSetType.FULL);
                if (img && img.src)
                {
                    const ready = !avatar.isPlaceholder();
                    trimTransparentImage(img.src, (_url, trimmed) =>
                    {
                        waiterImgsRef.current.set(waiterFigure, trimmed);
                        if (ready) waiterReadyRef.current.add(waiterFigure);
                    });
                }
            };
            load();
        }
        catch
        {
            // Ignore transient render init
        }
    }, []);

    const ensureBadgeSprite = useCallback((badgeCode: string) =>
    {
        if (badgeImgsRef.current.has(badgeCode)) return;
        const tpl = GetConfiguration<string>('badge.asset.url', '/game/swf/c_images/album1584/%badgename%.gif');
        const img = new Image();
        img.src = tpl.replace('%badgename%', badgeCode);
        img.onload = () => { badgeImgsRef.current.set(badgeCode, img); };
    }, []);

    // Buy Power-Up pack in Lobby
    const handleBuyPowerUp = useCallback(async (item: PowerUpKey) =>
    {
        if (shopBusy) return;
        setShopBusy(true);
        setShopMsg(null);
        try
        {
            const res = await fetch('/api/games/fastfood/buy', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item })
            });
            const data = await res.json();
            if (!res.ok || !data.success)
            {
                setShopMsg({ text: data.error || 'No tienes suficientes Duckets.', isErr: true });
            }
            else
            {
                if (data.inventory) setInventory(data.inventory);
                if (typeof data.duckets === 'number') setDuckets(data.duckets);
                setShopMsg({ text: `¡Compraste ${ data.purchased }!` });
                sfxRef.current.playShield();
            }
        }
        catch
        {
            setShopMsg({ text: 'Error de conexión al comprar.', isErr: true });
        }
        finally
        {
            setShopBusy(false);
        }
    }, [ shopBusy ]);

    // Spawn bursts & floating banners
    const spawnBurst = useCallback((
        eng: NonNullable<typeof engineRef.current>,
        x: number,
        y: number,
        colors: string[],
        count = 18
    ) =>
    {
        for (let i = 0; i < count; i++)
        {
            const a = Math.random() * Math.PI * 2;
            const spd = 45 + Math.random() * 140;
            eng.particles.push({
                x,
                y,
                vx: Math.cos(a) * spd,
                vy: Math.sin(a) * spd - 45,
                r: 3 + Math.random() * 4.5,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 0.45 + Math.random() * 0.35,
                maxLife: 0.8,
                gravity: 240
            });
        }
    }, []);

    const spawnBanner = useCallback((
        eng: NonNullable<typeof engineRef.current>,
        x: number,
        y: number,
        text: string,
        color: string
    ) =>
    {
        eng.banners.push({ x, y, text, color, life: 1.0, maxLife: 1.0 });
    }, []);

    // Start a fresh 3-lane FastFood match!
    const startMatch = useCallback(async () =>
    {
        if (startBusy) return;
        setStartBusy(true);
        setShopMsg(null);
        try
        {
            const res = await fetch('/api/games/fastfood/start', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (!res.ok || !data.success)
            {
                setShopMsg({ text: data.error || 'Has agotado tus partidas gratuitas de hoy.', isErr: true });
                setStartBusy(false);
                return;
            }
            const curInv: Inventory = data.inventory || inventory;
            setInventory(curInv);
            if (typeof data.games_left === 'number')
            {
                setGamesLeftInfo({ gamesLeft: data.games_left, hasUnlimited: !!data.has_unlimited });
            }

            const [ r1, r2 ] = pickRivals();
            const mkLane = (
                idx: number,
                name: string,
                fig: string,
                isHuman: boolean,
                skill: number,
                badges: string[],
                inv: Inventory
            ): LaneState =>
            {
                const wf = toWaiterFigure(fig);
                ensureWaiterSprite(wf);
                badges.forEach(b => ensureBadgeSprite(b));
                return {
                    index: idx,
                    name,
                    figure: fig,
                    waiterFigure: wf,
                    isHuman,
                    skill,
                    badges,
                    stars: 0,
                    smashed: 0,
                    platePhase: 'ready',
                    prepTimer: 0,
                    prepTotal: 1,
                    foodKey: COURSE_SEQUENCE[0],
                    plateY: LEDGE_FOOD_Y,
                    plateVy: 0,
                    chute: 'none',
                    chuteOpenAnim: 0,
                    shielded: false,
                    landedTimer: 0,
                    splatTimer: 0,
                    happyTimer: 0,
                    missilesLeft: Math.min(MAX_POWERUP_PER_MATCH, inv.missiles),
                    parachutesLeft: Math.min(MAX_POWERUP_PER_MATCH, inv.parachutes),
                    shieldsLeft: Math.min(MAX_POWERUP_PER_MATCH, inv.shields),
                    missilesUsed: 0,
                    parachutesUsed: 0,
                    shieldsUsed: 0,
                    aiThinkTimer: 0.25 + Math.random() * 0.4,
                    aiTargetOpenY: 360
                };
            };

            const playerBadges = myBadges.length > 0 ? myBadges.slice(0, 4) : [ 'ACH_BaseJumpDaysPlayed1' ];
            matchFinishedRef.current = false;
            setMatchResult(null);
            setFinishData(null);

            engineRef.current = {
                running: true,
                started: false,
                matchStartMs: performance.now(),
                lanes: [
                    mkLane(0, myUsername, myFigure, true, 1, playerBadges, curInv),
                    mkLane(1, r1.name, r1.figure, false, r1.skill, r1.badges, { missiles: 2, parachutes: 2, shields: 1 }),
                    mkLane(2, r2.name, r2.figure, false, r2.skill, r2.badges, { missiles: 2, parachutes: 2, shields: 1 })
                ],
                missiles: [],
                particles: [],
                banners: [],
                nextId: 1
            };

            setStage('playing');

            // Start looping official FastFood theme music
            if (audioElRef.current && !audioMuted)
            {
                audioElRef.current.currentTime = 0;
                audioElRef.current.play().catch(() => {});
            }

            // Classic "3... 2... 1... ¡YA!" countdown
            setCountdownText('3');
            sfxRef.current.playBeep(false);
            setTimeout(() => { setCountdownText('2'); sfxRef.current.playBeep(false); }, 650);
            setTimeout(() => { setCountdownText('1'); sfxRef.current.playBeep(false); }, 1300);
            setTimeout(() =>
            {
                setCountdownText('¡A SERVIR!');
                sfxRef.current.playBeep(true);
                if (engineRef.current)
                {
                    engineRef.current.started = true;
                    engineRef.current.matchStartMs = performance.now();
                }
            }, 1950);
            setTimeout(() => setCountdownText(null), 2600);
        }
        catch
        {
            setShopMsg({ text: 'Error al conectar con el servidor de FastFood.', isErr: true });
        }
        finally
        {
            setStartBusy(false);
        }
    }, [ startBusy, inventory, pickRivals, myUsername, myFigure, myBadges, audioMuted, ensureWaiterSprite, ensureBadgeSprite ]);

    // Lane Actions: Drop / Open Normal Chute / Big Green Chute / Missile / Shield
    const triggerMainAction = useCallback((laneIdx: number) =>
    {
        const eng = engineRef.current;
        if (!eng || !eng.running || !eng.started) return;
        const lane = eng.lanes[laneIdx];
        if (!lane) return;

        if (lane.platePhase === 'ready')
        {
            lane.platePhase = 'falling';
            lane.plateY = DROP_START_Y;
            lane.plateVy = 32;
            lane.chute = 'none';
            lane.chuteOpenAnim = 0;
            lane.shielded = false;
            if (lane.isHuman) sfxRef.current.playDrop();
        }
        else if (lane.platePhase === 'falling' && lane.chute === 'none')
        {
            lane.chute = 'normal';
            lane.chuteOpenAnim = 0.01;
            if (lane.isHuman) sfxRef.current.playParachute(false);
        }
    }, []);

    const triggerBigParachute = useCallback((laneIdx: number) =>
    {
        const eng = engineRef.current;
        if (!eng || !eng.running || !eng.started) return;
        const lane = eng.lanes[laneIdx];
        if (!lane || lane.parachutesLeft <= 0) return;
        if (lane.platePhase !== 'falling' || lane.chute === 'big') return;

        lane.parachutesLeft -= 1;
        lane.parachutesUsed += 1;
        lane.chute = 'big';
        lane.chuteOpenAnim = 0.01;
        lane.plateVy = Math.min(lane.plateVy, 66); // Instant emergency air-brake!
        spawnBanner(eng, LANE_X[laneIdx], lane.plateY - 36, '¡PARACAÍDAS!', '#4ade80');
        if (lane.isHuman) sfxRef.current.playParachute(true);
    }, [ spawnBanner ]);

    const triggerShield = useCallback((laneIdx: number) =>
    {
        const eng = engineRef.current;
        if (!eng || !eng.running || !eng.started) return;
        const lane = eng.lanes[laneIdx];
        if (!lane || lane.shieldsLeft <= 0) return;
        if (lane.platePhase !== 'falling' || lane.shielded) return;

        lane.shieldsLeft -= 1;
        lane.shieldsUsed += 1;
        lane.shielded = true;
        spawnBanner(eng, LANE_X[laneIdx], lane.plateY - 36, '¡ESCUDO!', '#38bdf8');
        if (lane.isHuman) sfxRef.current.playShield();
    }, [ spawnBanner ]);

    const triggerMissile = useCallback((laneIdx: number) =>
    {
        const eng = engineRef.current;
        if (!eng || !eng.running || !eng.started) return;
        const lane = eng.lanes[laneIdx];
        if (!lane || lane.missilesLeft <= 0) return;

        // Target the leading opponent who currently has a falling plate!
        const candidates = eng.lanes
            .filter(l => l.index !== laneIdx && l.platePhase === 'falling')
            .sort((a, b) => (b.stars - a.stars) || (b.plateY - a.plateY));
        if (candidates.length === 0) return;

        const target = candidates[0];
        lane.missilesLeft -= 1;
        lane.missilesUsed += 1;

        const sx = LANE_X[laneIdx];
        const sy = DROP_START_Y + 12;
        const dx = LANE_X[target.index] - sx;
        const dy = target.plateY - sy;
        const len = Math.max(1, Math.hypot(dx, dy));

        eng.missiles.push({
            id: eng.nextId++,
            fromLane: laneIdx,
            targetLane: target.index,
            x: sx,
            y: sy,
            vx: (dx / len) * 520,
            vy: (dy / len) * 520,
            angle: Math.atan2(dy, dx),
            smokeTimer: 0
        });
        sfxRef.current.playMissileLaunch();
    }, []);

    // Finish match and submit to Habbten CMS API
    const handleFinishMatch = useCallback(async (eng: NonNullable<typeof engineRef.current>, winnerLane: LaneState) =>
    {
        if (matchFinishedRef.current) return;
        matchFinishedRef.current = true;
        eng.running = false;

        const durationSec = Math.max(10, Math.round((performance.now() - eng.matchStartMs) / 1000));
        const me = eng.lanes[0];
        const won = winnerLane.isHuman;
        sfxRef.current.playVictory(won);

        const standings = [ ...eng.lanes ]
            .sort((a, b) => (b.stars - a.stars) || (a.smashed - b.smashed))
            .map(l => ({ name: l.name, stars: l.stars, isHuman: l.isHuman }));

        setMatchResult({
            won,
            winnerName: winnerLane.name,
            standings,
            platesSmashed: me.smashed,
            durationSec
        });
        setStage('results');

        try
        {
            const res = await fetch('/api/games/fastfood/finish', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    winnerName: winnerLane.name,
                    playerStars: me.stars,
                    rival1Stars: eng.lanes[1].stars,
                    rival2Stars: eng.lanes[2].stars,
                    platesSmashed: me.smashed,
                    missilesUsed: me.missilesUsed,
                    parachutesUsed: me.parachutesUsed,
                    shieldsUsed: me.shieldsUsed,
                    durationSec
                })
            });
            const data: FinishResp = await res.json();
            if (data?.success)
            {
                setFinishData(data);
                if (data.inventory) setInventory(data.inventory);
                if (typeof data.duckets === 'number') setDuckets(data.duckets);
                if (typeof data.games_left === 'number')
                {
                    setGamesLeftInfo({ gamesLeft: data.games_left, hasUnlimited: !!data.has_unlimited });
                }
                refreshStatus();
            }
        }
        catch
        {
            // Offline fallback
        }
    }, [ refreshStatus ]);

    // Leaderboard fetch
    useEffect(() =>
    {
        if (!showLeaderboard) return;
        let cancelled = false;
        setLbLoading(true);
        const url = lbTab === 'history'
            ? '/api/games/fastfood/history'
            : `/api/games/fastfood/leaderboard?type=${ lbTab }`;
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
    }, [ showLeaderboard, lbTab ]);

    // Keyboard controls during gameplay (SPACE = Drop/Parachute, 1 = Big Parachute, 2 = Missile, 3 = Shield)
    useEffect(() =>
    {
        if (stage !== 'playing') return;
        const onKey = (e: KeyboardEvent) =>
        {
            if (showLeaderboard)
            {
                if (e.key === 'Escape') setShowLeaderboard(false);
                return;
            }
            if (e.code === 'Space' || e.code === 'ArrowDown' || e.code === 'KeyS')
            {
                e.preventDefault();
                if (!e.repeat) triggerMainAction(0);
            }
            else if (e.key === '1' || e.code === 'KeyQ')
            {
                e.preventDefault();
                if (!e.repeat) triggerBigParachute(0);
            }
            else if (e.key === '2' || e.code === 'KeyW')
            {
                e.preventDefault();
                if (!e.repeat) triggerMissile(0);
            }
            else if (e.key === '3' || e.code === 'KeyE')
            {
                e.preventDefault();
                if (!e.repeat) triggerShield(0);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [ stage, showLeaderboard, triggerMainAction, triggerBigParachute, triggerMissile, triggerShield ]);

    // =========================================================================
    // MAIN 60 FPS FASTFOOD PHYSICS & 3-LANE RESTAURANT CANVAS RENDERER
    // =========================================================================
    useEffect(() =>
    {
        if (stage === 'lobby') return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let rafId = 0;
        let lastTs = performance.now();
        let hudAcc = 0;

        const startPrepNext = (lane: LaneState, wasPenalty: boolean) =>
        {
            const nextKey = COURSE_SEQUENCE[Math.min(COURSE_SEQUENCE.length - 1, lane.stars)];
            const spec = FOOD_SPECS[nextKey];
            lane.foodKey = nextKey;
            lane.platePhase = 'prepping';
            lane.prepTotal = wasPenalty ? (spec.prepSec + spec.penaltySec) : spec.prepSec;
            lane.prepTimer = lane.prepTotal;
            lane.plateY = LEDGE_FOOD_Y;
            lane.plateVy = 0;
            lane.chute = 'none';
            lane.chuteOpenAnim = 0;
            lane.shielded = false;
        };

        const update = (dt: number) =>
        {
            const eng = engineRef.current;
            if (!eng) return;

            // Update particles & floating banners
            for (let i = eng.particles.length - 1; i >= 0; i--)
            {
                const p = eng.particles[i];
                p.life -= dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.vy += p.gravity * dt;
                if (p.life <= 0) eng.particles.splice(i, 1);
            }
            for (let i = eng.banners.length - 1; i >= 0; i--)
            {
                const b = eng.banners[i];
                b.life -= dt;
                b.y -= 34 * dt;
                if (b.life <= 0) eng.banners.splice(i, 1);
            }

            if (!eng.running || !eng.started) return;

            // Update homing missiles
            for (let i = eng.missiles.length - 1; i >= 0; i--)
            {
                const m = eng.missiles[i];
                const target = eng.lanes[m.targetLane];
                if (!target || target.platePhase !== 'falling')
                {
                    // Target already landed or gone -> fizzle harmlessly
                    spawnBurst(eng, m.x, m.y, [ '#9ca3af', '#fbbf24' ], 10);
                    eng.missiles.splice(i, 1);
                    continue;
                }

                const tx = LANE_X[target.index];
                const ty = target.plateY;
                const dx = tx - m.x;
                const dy = ty - m.y;
                const dist = Math.hypot(dx, dy);

                if (dist < 24)
                {
                    if (target.shielded)
                    {
                        // Shield blocks missile!
                        target.shielded = false;
                        spawnBurst(eng, tx, ty, [ '#67e8f9', '#38bdf8', '#ffffff' ], 20);
                        spawnBanner(eng, tx, ty - 28, '¡BLOQUEADO!', '#67e8f9');
                        sfxRef.current.playShield();
                    }
                    else
                    {
                        // BOOM! Dish destroyed mid-air!
                        target.smashed += 1;
                        spawnBurst(eng, tx, ty, [ '#ef4444', '#f97316', '#fde047', '#ffffff' ], 28);
                        spawnBanner(eng, tx, ty - 26, '¡BOOM!', '#fbbf24');
                        sfxRef.current.playExplosion();
                        startPrepNext(target, true);
                    }
                    eng.missiles.splice(i, 1);
                    continue;
                }

                const spd = 540;
                m.vx = (dx / dist) * spd;
                m.vy = (dy / dist) * spd;
                m.angle = Math.atan2(dy, dx);
                m.x += m.vx * dt;
                m.y += m.vy * dt;

                m.smokeTimer -= dt;
                if (m.smokeTimer <= 0)
                {
                    m.smokeTimer = 0.025;
                    eng.particles.push({
                        x: m.x - Math.cos(m.angle) * 14,
                        y: m.y - Math.sin(m.angle) * 14,
                        vx: (Math.random() - 0.5) * 20,
                        vy: (Math.random() - 0.5) * 20,
                        r: 4 + Math.random() * 4,
                        color: Math.random() < 0.4 ? '#fb923c' : '#4b5563',
                        life: 0.32,
                        maxLife: 0.32,
                        gravity: -15
                    });
                }
            }

            // Update all 3 lanes
            for (const lane of eng.lanes)
            {
                if (lane.splatTimer > 0) lane.splatTimer = Math.max(0, lane.splatTimer - dt);
                if (lane.happyTimer > 0) lane.happyTimer = Math.max(0, lane.happyTimer - dt);

                if (lane.platePhase === 'prepping')
                {
                    lane.prepTimer -= dt;
                    if (lane.prepTimer <= 0)
                    {
                        lane.prepTimer = 0;
                        lane.platePhase = 'ready';
                        // Pick next AI target open height based on food weight & skill
                        if (!lane.isHuman)
                        {
                            const sp = FOOD_SPECS[lane.foodKey];
                            const baseOpen = sp.weight === 3 ? 330 : (sp.weight === 2 ? 365 : 405);
                            lane.aiTargetOpenY = baseOpen + (Math.random() - 0.45) * (95 * (1.2 - lane.skill));
                            lane.aiThinkTimer = 0.18 + Math.random() * 0.32;
                        }
                    }
                }
                else if (lane.platePhase === 'landed')
                {
                    lane.landedTimer -= dt;
                    if (lane.landedTimer <= 0)
                    {
                        if (lane.stars >= TARGET_STARS)
                        {
                            handleFinishMatch(eng, lane);
                            return;
                        }
                        startPrepNext(lane, false);
                    }
                }
                else if (lane.platePhase === 'falling')
                {
                    const spec = FOOD_SPECS[lane.foodKey];
                    if (lane.chute === 'none')
                    {
                        lane.plateVy += spec.gravity * dt;
                    }
                    else if (lane.chute === 'normal')
                    {
                        lane.chuteOpenAnim = Math.min(1, lane.chuteOpenAnim + dt * 6);
                        // Smooth aerodynamic braking toward safe terminal speed (78 px/s)
                        // Heavy foods brake slower, so opening too late still causes a SPLAT!
                        const brakeRate = spec.weight === 3 ? 3.5 : (spec.weight === 2 ? 4.4 : 5.4);
                        lane.plateVy += (78 - lane.plateVy) * Math.min(1, dt * brakeRate);
                    }
                    else if (lane.chute === 'big')
                    {
                        lane.chuteOpenAnim = Math.min(1, lane.chuteOpenAnim + dt * 9);
                        lane.plateVy += (60 - lane.plateVy) * Math.min(1, dt * 11);
                    }

                    lane.plateY += lane.plateVy * dt;

                    // Table contact!
                    if (lane.plateY >= TABLE_LAND_Y)
                    {
                        lane.plateY = TABLE_LAND_Y;
                        const safe = lane.shielded || lane.chute === 'big' || lane.plateVy <= spec.safeSpeed;
                        if (safe)
                        {
                            lane.stars += 1;
                            lane.platePhase = 'landed';
                            lane.landedTimer = 0.72;
                            lane.happyTimer = 1.2;
                            spawnBurst(eng, LANE_X[lane.index], TABLE_LAND_Y - 8, [ '#fde047', '#f59e0b', '#ffffff' ], 18);
                            spawnBanner(eng, LANE_X[lane.index], TABLE_LAND_Y - 38, `★ ${ lane.stars }/${ TARGET_STARS }`, '#fde047');
                            if (lane.isHuman) sfxRef.current.playLandSafe();

                            if (lane.stars >= TARGET_STARS)
                            {
                                handleFinishMatch(eng, lane);
                                return;
                            }
                        }
                        else
                        {
                            // SPLAT! Crashed too fast!
                            lane.smashed += 1;
                            lane.splatTimer = 1.6;
                            spawnBurst(eng, LANE_X[lane.index], TABLE_LAND_Y, [ '#ef4444', '#f97316', '#ffffff', '#fef08a' ], 24);
                            spawnBanner(eng, LANE_X[lane.index], TABLE_LAND_Y - 30, '¡PLAF!', '#f87171');
                            if (lane.isHuman) sfxRef.current.playSplat();
                            startPrepNext(lane, true);
                        }
                    }
                }

                // Rival Waiter AI logic
                if (!lane.isHuman)
                {
                    if (lane.platePhase === 'ready')
                    {
                        lane.aiThinkTimer -= dt;
                        if (lane.aiThinkTimer <= 0) triggerMainAction(lane.index);
                    }
                    else if (lane.platePhase === 'falling')
                    {
                        // Emergency Big Parachute if late
                        if (lane.chute === 'none' && lane.plateY >= 460 && lane.parachutesLeft > 0 && Math.random() < 0.7)
                        {
                            triggerBigParachute(lane.index);
                        }
                        else if (lane.chute === 'none' && lane.plateY >= lane.aiTargetOpenY)
                        {
                            triggerMainAction(lane.index);
                        }
                        // Shield if an enemy missile is heading toward this lane
                        const incoming = eng.missiles.some(m => m.targetLane === lane.index);
                        if (incoming && !lane.shielded && lane.shieldsLeft > 0 && Math.random() < 0.08)
                        {
                            triggerShield(lane.index);
                        }
                    }

                    // Occasional rival missile launch against a leading player
                    if (lane.missilesLeft > 0 && Math.random() < dt * 0.085)
                    {
                        triggerMissile(lane.index);
                    }
                }
            }

            // Sync compact HUD state at ~20Hz
            hudAcc += dt;
            if (hudAcc >= 0.05)
            {
                hudAcc = 0;
                const me = eng.lanes[0];
                const anyRivalFalling = eng.lanes.some(l => !l.isHuman && l.platePhase === 'falling');
                setActionHud({
                    phase: me.platePhase,
                    chute: me.chute,
                    shielded: me.shielded,
                    prepPct: me.platePhase === 'prepping' ? Math.max(0, Math.min(100, Math.round((1 - me.prepTimer / Math.max(0.1, me.prepTotal)) * 100))) : 100,
                    missilesLeft: me.missilesLeft,
                    parachutesLeft: me.parachutesLeft,
                    shieldsLeft: me.shieldsLeft,
                    canFireMissile: me.missilesLeft > 0 && anyRivalFalling
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
            ctx.fillStyle = '#0d0603';
            ctx.fillRect(0, 0, cssW, cssH);

            // Cover-fit scaling centered on the 3-lane restaurant
            const sc = Math.max(cssW / BG_W, cssH / BG_H);
            const drawW = BG_W * sc;
            const drawH = BG_H * sc;
            const ox = Math.floor((cssW - drawW) / 2);
            const oy = Math.floor((cssH - drawH) / 2);

            const toX = (x: number) => ox + x * sc;
            const toY = (y: number) => oy + y * sc;

            // 1. Official 2012 Luxury Restaurant Backdrop
            if (arenaImgRef.current)
            {
                ctx.imageSmoothingEnabled = true;
                ctx.drawImage(arenaImgRef.current, ox, oy, drawW, drawH);
            }

            const nowSec = performance.now() / 1000;

            // 2. Render each of the 3 Waiter Lanes
            for (const lane of eng.lanes)
            {
                const lx = LANE_X[lane.index];
                const sx = toX(lx);

                // 2a. Username inside red ribbon + HBT tag
                ctx.save();
                ctx.font = `900 ${ Math.max(11, Math.round(14 * sc)) }px Ubuntu, Tahoma, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#000000';
                ctx.fillText(lane.name, sx + 1, toY(RIBBON_Y) + 1);
                ctx.fillStyle = lane.isHuman ? '#fef08a' : '#ffffff';
                ctx.fillText(lane.name, sx, toY(RIBBON_Y));

                // Mini HBT badge below username
                ctx.fillStyle = '#111827';
                ctx.fillRect(sx - 15 * sc, toY(32), 30 * sc, 13 * sc);
                ctx.font = `900 ${ Math.max(8, Math.round(9 * sc)) }px Ubuntu, sans-serif`;
                ctx.fillStyle = '#facc15';
                ctx.fillText('HBT', sx, toY(38.5));
                ctx.restore();

                // 2b. Real Habbo Waiter Avatar inside the stone arch (clipped behind serving ledge!)
                const wImg = waiterImgsRef.current.get(lane.waiterFigure);
                if (wImg && wImg.naturalWidth > 0)
                {
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(toX(lx - 34), toY(46), 68 * sc, (ARCH_CLIP_BOTTOM_Y - 46) * sc);
                    ctx.clip();
                    ctx.imageSmoothingEnabled = false;
                    const dh = 104 * sc;
                    const dw = (wImg.naturalWidth / wImg.naturalHeight) * dh;
                    const bob = lane.platePhase === 'ready' ? Math.sin(nowSec * 5) * 1.5 * sc : 0;
                    ctx.drawImage(wImg, Math.round(sx - dw / 2), Math.round(toY(54) + bob), Math.round(dw), Math.round(dh));
                    ctx.restore();
                }

                // 2c. Unlocked BaseJump badges beside the arch (crisp pixel-art, exact Screenshot #2 look!)
                lane.badges.slice(0, 4).forEach((bCode, bi) =>
                {
                    const bImg = badgeImgsRef.current.get(bCode);
                    if (bImg && bImg.naturalWidth > 0)
                    {
                        const col = bi % 2;
                        const row = Math.floor(bi / 2);
                        const bx = Math.round(toX(lx + 68 + col * 32));
                        const by = Math.round(toY(48 + row * 34));
                        const bSize = Math.round(30 * sc);
                        ctx.save();
                        ctx.imageSmoothingEnabled = false;
                        ctx.drawImage(bImg, bx, by, bSize, bSize);
                        ctx.restore();
                    }
                });

                // 2d. 6-Star Progress Board (lighting up gold for each landed plate!)
                for (let s = 0; s < TARGET_STARS; s++)
                {
                    const starX = toX(lx - 52 + s * 20.8);
                    const starY = toY(STAR_BOARD_Y);
                    const lit = s < lane.stars;
                    ctx.save();
                    ctx.translate(starX, starY);
                    const rOut = 8.5 * sc;
                    const rIn = 3.8 * sc;
                    ctx.beginPath();
                    for (let k = 0; k < 10; k++)
                    {
                        const a = -Math.PI / 2 + (k * Math.PI) / 5;
                        const r = k % 2 === 0 ? rOut : rIn;
                        if (k === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
                        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
                    }
                    ctx.closePath();
                    ctx.fillStyle = lit ? '#facc15' : '#3d2511';
                    ctx.strokeStyle = lit ? '#78350f' : '#1f1207';
                    ctx.lineWidth = Math.max(1, 1.4 * sc);
                    ctx.fill();
                    ctx.stroke();
                    ctx.restore();
                }

                // 2e. Messy Splat stain on table after crash
                if (lane.splatTimer > 0)
                {
                    ctx.save();
                    ctx.globalAlpha = Math.min(1, lane.splatTimer);
                    ctx.fillStyle = '#b91c1c';
                    ctx.beginPath();
                    ctx.ellipse(sx, toY(TABLE_LAND_Y + 4), 24 * sc, 10 * sc, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#fb923c';
                    ctx.beginPath();
                    ctx.ellipse(sx + 8 * sc, toY(TABLE_LAND_Y + 2), 11 * sc, 5 * sc, 0.2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }

                // 2f. Happy hearts above table after safe delivery!
                if (lane.happyTimer > 0)
                {
                    ctx.save();
                    ctx.globalAlpha = Math.min(1, lane.happyTimer);
                    ctx.font = `900 ${ Math.round(18 * sc) }px sans-serif`;
                    ctx.fillStyle = '#f43f5e';
                    ctx.textAlign = 'center';
                    ctx.fillText('♥', sx - 28 * sc, toY(TABLE_LAND_Y - 42 - (1.2 - lane.happyTimer) * 24));
                    ctx.fillText('♥', sx + 28 * sc, toY(TABLE_LAND_Y - 34 - (1.2 - lane.happyTimer) * 28));
                    ctx.restore();
                }

                // 2g. The Dish (Ready on Ledge / Falling with Parachute / Landed on Table!)
                const fImg = foodImgsRef.current[lane.foodKey];
                if (lane.platePhase === 'ready' || lane.platePhase === 'falling' || lane.platePhase === 'landed')
                {
                    const sway = lane.platePhase === 'falling' && lane.chute !== 'none'
                        ? Math.sin(nowSec * 5.2 + lane.index) * (lane.chute === 'big' ? 7 : 5) * sc
                        : 0;
                    const px = sx + sway;
                    const py = toY(lane.plateY);

                    // Draw Parachute canopy & cords above falling dish!
                    if (lane.platePhase === 'falling')
                    {
                        if (lane.chute === 'none')
                        {
                            // Folded un-opened ribbon/pack trailing behind the fast-falling dish
                            ctx.save();
                            ctx.strokeStyle = '#e5e7eb';
                            ctx.lineWidth = Math.max(1.2, 1.8 * sc);
                            ctx.beginPath();
                            ctx.moveTo(px, py - 10 * sc);
                            ctx.lineTo(px, py - 24 * sc);
                            ctx.stroke();
                            ctx.fillStyle = lane.isHuman ? '#ef4444' : '#3b82f6';
                            ctx.beginPath();
                            ctx.ellipse(px, py - 30 * sc, 5 * sc, 10 * sc, Math.sin(nowSec * 14) * 0.2, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.restore();
                        }
                        else
                        {
                            const isBig = lane.chute === 'big';
                            const open = Math.max(0.25, lane.chuteOpenAnim);
                            const rx = (isBig ? 46 : 31) * open * sc;
                            const ry = (isBig ? 28 : 20) * open * sc;
                            const cy = py - (isBig ? 62 : 48) * sc;

                            // Cords
                            ctx.save();
                            ctx.strokeStyle = '#f8fafc';
                            ctx.lineWidth = Math.max(1, 1.4 * sc);
                            for (const frac of [ -0.9, -0.45, 0, 0.45, 0.9 ])
                            {
                                ctx.beginPath();
                                ctx.moveTo(px + rx * frac, cy + ry * 0.15);
                                ctx.lineTo(px, py - 6 * sc);
                                ctx.stroke();
                            }

                            // Canopy dome
                            ctx.beginPath();
                            ctx.ellipse(px, cy, rx, ry, 0, Math.PI, Math.PI * 2);
                            ctx.closePath();
                            ctx.fillStyle = isBig ? '#16a34a' : (lane.isHuman ? '#dc2626' : '#2563eb');
                            ctx.strokeStyle = '#000000';
                            ctx.lineWidth = Math.max(1.2, 1.8 * sc);
                            ctx.fill();
                            ctx.stroke();

                            // Authentic white stripes on canopy (Green/White for Big Parachute!)
                            ctx.beginPath();
                            ctx.ellipse(px, cy, rx * 0.62, ry * 0.92, 0, Math.PI, Math.PI * 2);
                            ctx.closePath();
                            ctx.fillStyle = isBig ? '#dcfce7' : 'rgba(255,255,255,0.28)';
                            ctx.fill();

                            if (isBig)
                            {
                                ctx.beginPath();
                                ctx.ellipse(px, cy, rx * 0.28, ry * 0.85, 0, Math.PI, Math.PI * 2);
                                ctx.closePath();
                                ctx.fillStyle = '#16a34a';
                                ctx.fill();
                            }
                            ctx.restore();
                        }
                    }

                    // Draw official food sprite
                    if (fImg && fImg.naturalWidth > 0)
                    {
                        const fw = fImg.naturalWidth * 0.92 * sc;
                        const fh = fImg.naturalHeight * 0.92 * sc;
                        ctx.drawImage(fImg, Math.round(px - fw / 2), Math.round(py - fh / 2), Math.round(fw), Math.round(fh));
                    }

                    // Draw Glowing Cyan Energy Shield Bubble around plate (Shields.png 1:1!)
                    if (lane.shielded && lane.platePhase === 'falling')
                    {
                        ctx.save();
                        const r = 34 * sc;
                        const grad = ctx.createRadialGradient(px - r * 0.3, py - r * 0.3, r * 0.1, px, py, r);
                        grad.addColorStop(0, 'rgba(224, 242, 254, 0.55)');
                        grad.addColorStop(0.65, 'rgba(56, 189, 248, 0.26)');
                        grad.addColorStop(1, 'rgba(14, 116, 144, 0.65)');
                        ctx.fillStyle = grad;
                        ctx.strokeStyle = '#67e8f9';
                        ctx.lineWidth = Math.max(1.5, 2.2 * sc);
                        ctx.beginPath();
                        ctx.arc(px, py, r, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.stroke();

                        // Specular bubble shine
                        ctx.fillStyle = 'rgba(255,255,255,0.75)';
                        ctx.beginPath();
                        ctx.ellipse(px + r * 0.32, py - r * 0.25, 5 * sc, 7 * sc, -0.4, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                    }
                }
                else if (lane.platePhase === 'prepping')
                {
                    // Kitchen prep progress bar on the ledge
                    const pct = Math.max(0, Math.min(1, 1 - lane.prepTimer / Math.max(0.1, lane.prepTotal)));
                    ctx.save();
                    ctx.fillStyle = 'rgba(0,0,0,0.72)';
                    ctx.fillRect(sx - 28 * sc, toY(LEDGE_FOOD_Y - 5), 56 * sc, 10 * sc);
                    ctx.fillStyle = '#facc15';
                    ctx.fillRect(sx - 26 * sc, toY(LEDGE_FOOD_Y - 3), 52 * pct * sc, 6 * sc);
                    ctx.restore();
                }
            }

            // 3. Render Flying Homing Missiles
            for (const m of eng.missiles)
            {
                ctx.save();
                ctx.translate(toX(m.x), toY(m.y));
                ctx.rotate(m.angle + Math.PI / 2);
                const ms = sc;
                // Flame
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath();
                ctx.moveTo(-4 * ms, 12 * ms);
                ctx.lineTo(4 * ms, 12 * ms);
                ctx.lineTo(0, 24 * ms);
                ctx.closePath();
                ctx.fill();
                // Body
                ctx.fillStyle = '#f3f4f6';
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.moveTo(0, -16 * ms);
                ctx.quadraticCurveTo(8 * ms, -4 * ms, 7 * ms, 12 * ms);
                ctx.lineTo(-7 * ms, 12 * ms);
                ctx.quadraticCurveTo(-8 * ms, -4 * ms, 0, -16 * ms);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                // Red nosecone
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.moveTo(0, -16 * ms);
                ctx.quadraticCurveTo(6 * ms, -8 * ms, 6 * ms, -3 * ms);
                ctx.lineTo(-6 * ms, -3 * ms);
                ctx.quadraticCurveTo(-6 * ms, -8 * ms, 0, -16 * ms);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }

            // 4. Particles (explosions, smoke, sauce splatters, gold star sparkles)
            for (const p of eng.particles)
            {
                ctx.save();
                ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(toX(p.x), toY(p.y), p.r * sc, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // 5. Floating Banners ("★ 3/6", "¡BOOM!", "¡PLAF!", "¡ESCUDO!")
            for (const b of eng.banners)
            {
                ctx.save();
                ctx.globalAlpha = Math.max(0, b.life / b.maxLife);
                ctx.font = `900 ${ Math.max(13, Math.round(18 * sc)) }px Ubuntu, sans-serif`;
                ctx.textAlign = 'center';
                ctx.lineWidth = 3.5;
                ctx.strokeStyle = '#000000';
                ctx.strokeText(b.text, toX(b.x), toY(b.y));
                ctx.fillStyle = b.color;
                ctx.fillText(b.text, toX(b.x), toY(b.y));
                ctx.restore();
            }
        };

        const loop = (now: number) =>
        {
            const dt = Math.min(0.05, (now - lastTs) / 1000);
            lastTs = now;
            update(dt);
            render();
            rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    }, [ stage, triggerMainAction, triggerBigParachute, triggerShield, triggerMissile, spawnBurst, spawnBanner, handleFinishMatch ]);

    const exitToGameCenter = useCallback(() =>
    {
        if (audioElRef.current) audioElRef.current.pause();
        setIsFastFoodPlaying(false);
        setIsVisible(true);
    }, [ setIsFastFoodPlaying, setIsVisible ]);

    const backToLobby = useCallback(() =>
    {
        if (audioElRef.current) audioElRef.current.pause();
        setStage('lobby');
        refreshStatus();
    }, [ refreshStatus ]);

    const bonusPowerUpLabel = useMemo(() =>
    {
        const b = finishData?.bonus_powerup;
        if (b === 'missile') return '+1 Misil gratis';
        if (b === 'parachute') return '+1 Paracaídas grande gratis';
        if (b === 'shield') return '+1 Escudo gratis';
        return null;
    }, [ finishData ]);

    return (
        <div className="fastfood-game-root">
            {/* TOP-LEFT RED EXIT BUTTON (Matches Screenshot #1 & #2!) */}
            <div className="ff-top-left-bar">
                <button
                    type="button"
                    className="ff-exit-btn"
                    onClick={ stage === 'playing' ? backToLobby : exitToGameCenter }
                >
                    EXIT
                </button>
            </div>

            {/* TOP-RIGHT GOLDEN RANKING + AUDIO TOGGLE BUTTONS (Original Sulake Audio Button!) */}
            <div className="ff-top-right-bar">
                <button
                    type="button"
                    className="ff-gold-circle-btn"
                    title="Clasificación de FastFood"
                    onClick={ () => setShowLeaderboard(true) }
                >
                    <img src={ ffBtnTrophyImg } alt="Clasificación" className="ff-btn-sprite" />
                </button>
                <button
                    type="button"
                    className={ `ff-gold-circle-btn ${ audioMuted ? 'is-muted' : '' }` }
                    title={ audioMuted ? 'Activar música y sonidos' : 'Silenciar música y sonidos' }
                    onClick={ () => setAudioMuted(prev => !prev) }
                >
                    <img src={ ffBtnAudioImg } alt="Sonido" className="ff-btn-sprite" />
                </button>
            </div>

            {/* =================================================================
                STAGE 1: AUTHENTIC FAST FOOD LOBBY (Matches Screenshot #1 1:1!)
               ================================================================= */}
            { stage === 'lobby' && (
                <div className="ff-lobby-shell">
                    <div className="ff-lobby-grid">
                        {/* LEFT COLUMN: Tus poderes + Comprar más */}
                        <div>
                            <div className="ff-lobby-col-title">Tus poderes:</div>
                            <div className="ff-powers-stack">
                                <div className="ff-power-card">
                                    <div className="ff-power-name">Misil</div>
                                    <div className="ff-power-desc">
                                        Se dirige automáticamente y vuela el mejor plato de tu oponente. Se pueden usar TRES misiles por partida.
                                    </div>
                                    <div className="ff-power-bottom">
                                        <div className="ff-power-icon-wrap">
                                            <MissileIconSvg size={ 42 } />
                                            <span className="ff-power-qty">x { inventory.missiles }</span>
                                        </div>
                                        <button
                                            type="button"
                                            className="ff-buy-btn"
                                            disabled={ shopBusy }
                                            onClick={ () => handleBuyPowerUp('missile') }
                                        >
                                            Comprar más (+5 · 25D)
                                        </button>
                                    </div>
                                </div>

                                <div className="ff-power-card">
                                    <div className="ff-power-name">Paracaídas grande</div>
                                    <div className="ff-power-desc">
                                        Se puede abrir en el último momento para frenar en seco. Se pueden usar TRES paracaídas grandes por partida.
                                    </div>
                                    <div className="ff-power-bottom">
                                        <div className="ff-power-icon-wrap">
                                            <BigParachuteIconSvg size={ 42 } />
                                            <span className="ff-power-qty">x { inventory.parachutes }</span>
                                        </div>
                                        <button
                                            type="button"
                                            className="ff-buy-btn"
                                            disabled={ shopBusy }
                                            onClick={ () => handleBuyPowerUp('parachute') }
                                        >
                                            Comprar más (+3 · 25D)
                                        </button>
                                    </div>
                                </div>

                                <div className="ff-power-card">
                                    <div className="ff-power-name">Escudo</div>
                                    <div className="ff-power-desc">
                                        Protege de los misiles enemigos y evita que el plato se estrelle. Se pueden usar TRES escudos por partida.
                                    </div>
                                    <div className="ff-power-bottom">
                                        <div className="ff-power-icon-wrap">
                                            <ShieldIconSvg size={ 42 } />
                                            <span className="ff-power-qty">x { inventory.shields }</span>
                                        </div>
                                        <button
                                            type="button"
                                            className="ff-buy-btn"
                                            disabled={ shopBusy }
                                            onClick={ () => handleBuyPowerUp('shield') }
                                        >
                                            Comprar más (+3 · 30D)
                                        </button>
                                    </div>
                                </div>

                                { shopMsg && (
                                    <div className={ `ff-shop-feedback ${ shopMsg.isErr ? 'is-err' : '' }` }>
                                        { shopMsg.text }
                                    </div>
                                ) }
                            </div>
                        </div>

                        {/* CENTER COLUMN: Logo + Night Window + Big Green "Jugar" */}
                        <div className="ff-center-col">
                            <img src={ ffLogoHabbtenImg } alt="Fast Food Habbten" className="ff-logo-img" />

                            <div className="ff-vignette-window">
                                <div className="ff-vig-chute">
                                    <RedParachuteIconSvg size={ 56 } />
                                    <img src={ ffFoodSoupImg } alt="Sopa" />
                                </div>
                                <div className="ff-vig-table" />
                            </div>

                            <button
                                type="button"
                                className="ff-play-btn"
                                disabled={ startBusy }
                                onClick={ startMatch }
                            >
                                { startBusy ? 'Preparando...' : 'Jugar' }
                            </button>

                            <div className="ff-lobby-meta">
                                Juegos jugados esta semana: <b>{ weeklyGames }</b> · Tus Duckets: <b>{ duckets.toLocaleString('es-ES') }</b><br />
                                { gamesLeftInfo.hasUnlimited
                                    ? 'Partidas ilimitadas activas (Habbten Club)'
                                    : `Partidas gratuitas restantes hoy: ${ gamesLeftInfo.gamesLeft } / 5` }
                            </div>
                        </div>

                        {/* RIGHT COLUMN: ¡Sé veloz! ¡El más rápido ganará! */}
                        <div>
                            <div className="ff-lobby-col-title">¡Sé veloz! ¡El más rápido ganará!</div>
                            <div className="ff-rules-stack">
                                <div className="ff-rule-card">
                                    <div className="ff-rule-text">
                                        ¡Cuando esté listo el botón verde, haz clic en él (o pulsa <b>Espacio</b>) para que la comida empiece a caer!
                                    </div>
                                    <div className="ff-rule-sketch">
                                        <GreenDropArrowSvg size={ 42 } />
                                        <img src={ ffFoodPizzaImg } alt="Pizza" style={{ width: 42 }} />
                                    </div>
                                </div>

                                <div className="ff-rule-card">
                                    <div className="ff-rule-text">
                                        ¡Haz clic en el botón rojo del paracaídas (o <b>Espacio</b>) a tiempo para que la comida no se estrelle en la mesa! Los platos pesados (<b>Tarta / Bebidas</b>) caen más rápido.
                                    </div>
                                    <div className="ff-rule-sketch">
                                        <RedParachuteIconSvg size={ 44 } />
                                        <img src={ ffFoodCakeImg } alt="Tarta" style={{ width: 42 }} />
                                    </div>
                                </div>

                                <div className="ff-rule-card">
                                    <div className="ff-rule-text">
                                        ¡Usa tus poderes con cabeza! Teclas <b>1</b> (Paracaídas grande), <b>2</b> (Misil) y <b>3</b> (Escudo). ¡El primero en servir <b>6 platos</b> gana!
                                    </div>
                                    <div className="ff-rule-sketch">
                                        <BigParachuteIconSvg size={ 34 } />
                                        <MissileIconSvg size={ 34 } />
                                        <ShieldIconSvg size={ 34 } />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) }

            {/* =================================================================
                STAGE 2 & 3: LIVE 3-LANE RESTAURANT CANVAS + 4 CIRCULAR HUD BUTTONS
               ================================================================= */}
            { (stage === 'playing' || stage === 'results') && (
                <div className="ff-arena-stage">
                    <canvas ref={ canvasRef } className="ff-game-canvas" />

                    {/* Countdown "3... 2... 1... ¡A SERVIR!" */}
                    { stage === 'playing' && countdownText && (
                        <div className="ff-countdown-overlay">
                            <div key={ countdownText } className="ff-countdown-num">{ countdownText }</div>
                        </div>
                    ) }

                    {/* LEFT 4-BUTTON CIRCULAR ACTION HUD (100% Original 2012 Sulake Button Artwork!) */}
                    { stage === 'playing' && (
                        <div className="ff-action-hud">
                            <button
                                type="button"
                                className={ `ff-main-action-btn ${ actionHud.phase === 'falling' && actionHud.chute === 'none' ? 'is-parachute' : '' } ${ actionHud.phase === 'prepping' || actionHud.phase === 'landed' || (actionHud.phase === 'falling' && actionHud.chute !== 'none') ? 'is-cooldown' : '' }` }
                                disabled={ actionHud.phase === 'prepping' || actionHud.phase === 'landed' || (actionHud.phase === 'falling' && actionHud.chute !== 'none') }
                                onMouseDown={ () => triggerMainAction(0) }
                                title="Soltar plato / Abrir paracaídas (Espacio)"
                            >
                                { actionHud.phase === 'ready' ? (
                                    <img src={ ffBtnDropImg } alt="Soltar plato" className="ff-btn-sprite" />
                                ) : actionHud.phase === 'falling' && actionHud.chute === 'none' ? (
                                    <img src={ ffBtnOpenChuteImg } alt="Abrir paracaídas" className="ff-btn-sprite" />
                                ) : (
                                    <span className="ff-main-cd-ring">
                                        { actionHud.phase === 'prepping' ? `${ actionHud.prepPct }%` : 'OK' }
                                    </span>
                                ) }
                                <span className="ff-hotkey-tag">SPACE</span>
                            </button>

                            <button
                                type="button"
                                className="ff-pu-circle-btn pos-parachute"
                                disabled={ actionHud.parachutesLeft <= 0 || actionHud.phase !== 'falling' || actionHud.chute === 'big' }
                                onMouseDown={ () => triggerBigParachute(0) }
                                title="Paracaídas grande — freno instantáneo (Tecla 1)"
                            >
                                <img src={ ffBtnParachuteImg } alt="Paracaídas grande" className="ff-btn-sprite" />
                                <span className="ff-pu-key">1</span>
                                <span className="ff-pu-count">{ actionHud.parachutesLeft }</span>
                            </button>

                            <button
                                type="button"
                                className="ff-pu-circle-btn pos-missile"
                                disabled={ !actionHud.canFireMissile }
                                onMouseDown={ () => triggerMissile(0) }
                                title="Misil — destruye el plato rival en el aire (Tecla 2)"
                            >
                                <img src={ ffBtnMissileImg } alt="Misil" className="ff-btn-sprite" />
                                <span className="ff-pu-key">2</span>
                                <span className="ff-pu-count">{ actionHud.missilesLeft }</span>
                            </button>

                            <button
                                type="button"
                                className="ff-pu-circle-btn pos-shield"
                                disabled={ actionHud.shieldsLeft <= 0 || actionHud.phase !== 'falling' || actionHud.shielded }
                                onMouseDown={ () => triggerShield(0) }
                                title="Escudo — protege contra misiles y golpes (Tecla 3)"
                            >
                                <img src={ ffBtnShieldImg } alt="Escudo" className="ff-btn-sprite" />
                                <span className="ff-pu-key">3</span>
                                <span className="ff-pu-count">{ actionHud.shieldsLeft }</span>
                            </button>
                        </div>
                    ) }

                    {/* STAGE 3: AUTHENTIC MAROON WAITER CLIPBOARD RESULTS */}
                    { stage === 'results' && matchResult && (
                        <div className="ff-results-backdrop">
                            <div className="ff-clipboard">
                                <div className="ff-clip-metal" />
                                <div className="ff-paper">
                                    <img src={ ffLogoHabbtenImg } alt="Fast Food" className="ff-paper-logo" />
                                    <div className={ `ff-paper-verdict ${ matchResult.won ? 'is-win' : 'is-lose' }` }>
                                        { matchResult.won ? '¡GANADOR!' : `GANÓ ${ matchResult.winnerName.toUpperCase() }` }
                                    </div>
                                    <div className="ff-paper-stars">
                                        { Array.from({ length: TARGET_STARS }).map((_, idx) =>
                                        {
                                            const myRow = matchResult.standings.find(s => s.isHuman);
                                            const lit = idx < (myRow?.stars || 0);
                                            return <span key={ idx } style={{ opacity: lit ? 1 : 0.25 }}>★</span>;
                                        }) }
                                    </div>

                                    <div className="ff-paper-standings">
                                        { matchResult.standings.map((row, idx) => (
                                            <div key={ row.name } className={ `ff-stand-row ${ row.isHuman ? 'is-me' : '' }` }>
                                                <span>#{ idx + 1 } { row.name } { row.isHuman ? '(Tú)' : '' }</span>
                                                <span style={{ color: '#b45309' }}>{ row.stars } / { TARGET_STARS } ★</span>
                                            </div>
                                        )) }
                                    </div>

                                    <div className="ff-paper-rewards">
                                        { finishData?.rewards ? (
                                            <>
                                                <div className="ff-rew-line">
                                                    <span>+{ finishData.rewards.score } pts</span>
                                                    <span style={{ color: '#e9d5ff' }}>
                                                        <img src={ ducketIconImg } alt="Duckets" />
                                                        +{ finishData.rewards.duckets } Duckets
                                                    </span>
                                                    { finishData.rewards.credits > 0 && (
                                                        <span style={{ color: '#fde047' }}>
                                                            <img src={ creditIconImg } alt="Créditos" />
                                                            +{ finishData.rewards.credits } Créditos
                                                        </span>
                                                    ) }
                                                </div>
                                                { bonusPowerUpLabel && (
                                                    <div className="ff-rew-bonus">Regalo por partida: { bonusPowerUpLabel }</div>
                                                ) }
                                                { finishData.unlocked_achievements && finishData.unlocked_achievements.length > 0 && (
                                                    <div className="ff-rew-badges">
                                                        { finishData.unlocked_achievements.map(a =>
                                                        {
                                                            const tpl = GetConfiguration<string>('badge.asset.url', '/game/swf/c_images/album1584/%badgename%.gif');
                                                            return (
                                                                <div key={ a.badge } className="ff-rew-badge">
                                                                    <img src={ tpl.replace('%badgename%', a.badge) } alt={ a.title } />
                                                                    <span>{ a.title }</span>
                                                                </div>
                                                            );
                                                        }) }
                                                    </div>
                                                ) }
                                            </>
                                        ) : (
                                            <div className="ff-rew-bonus">Guardando puntuación y recompensas en Habbten...</div>
                                        ) }
                                    </div>

                                    <div className="ff-paper-actions">
                                        <button
                                            type="button"
                                            className="ff-clip-btn is-green"
                                            disabled={ startBusy }
                                            onClick={ startMatch }
                                        >
                                            { startBusy ? 'Cargando...' : 'Jugar otra vez' }
                                        </button>
                                        <button type="button" className="ff-clip-btn is-gray" onClick={ backToLobby }>
                                            Menú
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) }
                </div>
            ) }

            {/* LEADERBOARD MODAL */}
            { showLeaderboard && (
                <div className="ff-modal-backdrop" onClick={ () => setShowLeaderboard(false) }>
                    <div className="ff-modal-box" onClick={ e => e.stopPropagation() }>
                        <div className="ff-modal-header">
                            <span>Clasificación de FastFood</span>
                            <button type="button" title="Cerrar" aria-label="Cerrar" onClick={ () => setShowLeaderboard(false) }>✕</button>
                        </div>
                        <div className="ff-modal-body">
                            <div className="ff-lb-tabs">
                                { ([
                                    [ 'week', 'Semana' ],
                                    [ 'all', 'Histórico' ],
                                    [ 'friends', 'Amigos' ],
                                    [ 'history', 'Mis partidas' ]
                                ] as const).map(([ k, label ]) => (
                                    <button
                                        key={ k }
                                        type="button"
                                        className={ lbTab === k ? 'is-active' : '' }
                                        onClick={ () => setLbTab(k) }
                                    >
                                        { label }
                                    </button>
                                )) }
                            </div>
                            <div className="ff-lb-list">
                                { lbLoading ? (
                                    <div style={{ textAlign: 'center', padding: 24, color: '#d6c5b3' }}>Cargando...</div>
                                ) : lbTab === 'history' ? (
                                    historyRows.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: 24, color: '#d6c5b3' }}>Aún no has completado partidas de FastFood.</div>
                                    ) : (
                                        historyRows.map(m => (
                                            <div key={ m.id } className="ff-lb-row" style={{ justifyContent: 'space-between' }}>
                                                <span>
                                                    <b style={{ color: m.won ? '#4ade80' : '#fca5a5' }}>{ m.won ? 'Victoria' : 'Partida' }</b> · { m.stars }/6 ★ ({ m.plates_smashed } rotos)
                                                </span>
                                                <span style={{ fontWeight: 800, color: '#fde68a' }}>
                                                    { m.score } pts · +{ m.reward_duckets }D{ m.reward_credits > 0 ? ` +${ m.reward_credits }C` : '' }
                                                </span>
                                            </div>
                                        ))
                                    )
                                ) : lbEntries.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: 24, color: '#d6c5b3' }}>¡Sé el primer camarero en entrar al ranking!</div>
                                ) : (
                                    lbEntries.map(e => (
                                        <div key={ e.userId } className="ff-lb-row">
                                            <b style={{ width: 22, color: e.rank === 1 ? '#facc15' : '#93c5fd' }}>#{ e.rank }</b>
                                            <HabboHeadImg figure={ e.figure } direction={ 2 } size={ 30 } />
                                            <div style={{ flex: 1 }}>
                                                <b>{ e.username }</b>
                                                <div style={{ fontSize: 10.5, color: '#d6c5b3' }}>{ e.wins } victorias · { e.platesLanded } platos servidos</div>
                                            </div>
                                            <b style={{ color: '#fde047' }}>{ e.score.toLocaleString('es-ES') }</b>
                                        </div>
                                    ))
                                ) }
                            </div>
                        </div>
                    </div>
                </div>
            ) }
        </div>
    );
};

