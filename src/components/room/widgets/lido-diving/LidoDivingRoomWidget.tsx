import { RoomUnitWalkComposer } from '@nitrots/nitro-renderer';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GetOwnRoomObject, GetSessionDataManager, onShockwaveSmallAtlasReady, renderShockwaveSmallDataUrl, SendMessageComposer } from '../../../../api';
import { useRoom } from '../../../../hooks';
import { trimTransparentImage } from '../../../game-center/views/SnowStormAvatar';
import './LidoDivingRoomWidget.scss';

const LIDO_DIVING_ROOM_ID = 101;

// Exact Room 101 arrowplate roller queue leading into the diving tower elevator at (11, 4)
const QUEUE_TILES: Array<[ number, number ]> = [
    [ 7, 8 ],
    [ 8, 8 ],
    [ 9, 8 ],
    [ 10, 8 ],
    [ 11, 8 ],
    [ 11, 7 ],
    [ 11, 6 ],
    [ 11, 5 ],
    [ 11, 4 ]
];

const ELEVATOR_TILE = { x: 11, y: 4 };
const POOL_EXIT_TILE = { x: 16, y: 11 };

type TrickId = 'star' | 'air_guitar' | 'flex' | 'cannonball' | 'air_punch' | 'flip_dive';
type DivePhase = 'idle' | 'elevator' | 'sprint' | 'airborne' | 'splash' | 'scoring';

interface TrickDef
{
    id: TrickId;
    name: string;
    keyHint: string;
    desc: string;
    accent: string;
}

const LIDO_TRICKS: TrickDef[] = [
    { id: 'star', name: 'Star', keyHint: 'W / 1', desc: 'Abre brazos y piernas en el aire', accent: '#f0b400' },
    { id: 'air_guitar', name: 'Air Guitar', keyHint: 'E / 2', desc: 'Solo de guitarra hasta el 11', accent: '#9333ea' },
    { id: 'flex', name: 'The Flex', keyHint: 'A / 3', desc: 'Presume musculos ante las gradas', accent: '#ea580c' },
    { id: 'cannonball', name: 'Cannonball', keyHint: 'S / 4', desc: 'Bomba de agua para empapar a todos', accent: '#dc2626' },
    { id: 'air_punch', name: 'Air Punch', keyHint: 'D / 5', desc: 'Punetazos al aire en caida libre', accent: '#0284c7' },
    { id: 'flip_dive', name: 'Flip / Dive', keyHint: 'Z / X / 6', desc: 'Vuelta mortal y entrada limpia', accent: '#16a34a' }
];

const SWIM_COLORS: Array<{ id: string; label: string; hex: string }> = [
    { id: '64', label: 'Azul', hex: '#2b7bb9' },
    { id: '66', label: 'Rojo', hex: '#d94040' },
    { id: '50', label: 'Amarillo', hex: '#e8a325' },
    { id: '48', label: 'Verde', hex: '#2d9b5a' },
    { id: '70', label: 'Rosa', hex: '#e06699' },
    { id: '61', label: 'Negro', hex: '#2e2e2e' }
];

// Crisp Habbo-style pixel-art SVGs (zero OS emojis!)
const PixelIconTicket: FC = () => (
    <svg width="16" height="12" viewBox="0 0 16 12" shapeRendering="crispEdges" className="lido-px-icon">
        <rect x="1" y="0" width="14" height="12" fill="#000" />
        <rect x="0" y="1" width="16" height="3" fill="#000" />
        <rect x="0" y="8" width="16" height="3" fill="#000" />
        <rect x="1" y="1" width="14" height="10" fill="#ffcb00" />
        <rect x="0" y="4" width="2" height="4" fill="#000" />
        <rect x="14" y="4" width="2" height="4" fill="#000" />
        <rect x="2" y="2" width="12" height="2" fill="#fff099" />
        <rect x="5" y="4" width="1" height="4" fill="#b87600" />
        <rect x="7" y="5" width="5" height="1" fill="#8f5700" />
        <rect x="7" y="7" width="4" height="1" fill="#8f5700" />
    </svg>
);

const PixelIconBoard: FC = () => (
    <svg width="16" height="14" viewBox="0 0 16 14" shapeRendering="crispEdges" className="lido-px-icon">
        <rect x="1" y="3" width="4" height="9" fill="#000" />
        <rect x="2" y="4" width="2" height="7" fill="#c7d5de" />
        <rect x="2" y="3" width="12" height="4" fill="#000" />
        <rect x="3" y="4" width="7" height="2" fill="#ffffff" />
        <rect x="10" y="4" width="3" height="2" fill="#52c41a" />
        <rect x="0" y="11" width="16" height="3" fill="#1aa7cf" />
        <rect x="2" y="12" width="4" height="1" fill="#9ce8ff" />
        <rect x="9" y="12" width="5" height="1" fill="#9ce8ff" />
    </svg>
);

const PixelIconTrophy: FC = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" shapeRendering="crispEdges" className="lido-px-icon">
        <rect x="3" y="1" width="8" height="7" fill="#000" />
        <rect x="1" y="2" width="2" height="4" fill="#000" />
        <rect x="11" y="2" width="2" height="4" fill="#000" />
        <rect x="4" y="2" width="6" height="5" fill="#ffcb00" />
        <rect x="4" y="2" width="2" height="3" fill="#fff2a6" />
        <rect x="2" y="3" width="1" height="2" fill="#ffcb00" />
        <rect x="11" y="3" width="1" height="2" fill="#ffcb00" />
        <rect x="5" y="8" width="4" height="3" fill="#000" />
        <rect x="6" y="8" width="2" height="2" fill="#e09f00" />
        <rect x="3" y="10" width="8" height="3" fill="#000" />
        <rect x="4" y="11" width="6" height="1" fill="#ffcb00" />
    </svg>
);

const PixelIconTrick: FC<{ id: TrickId }> = ({ id }) =>
{
    if (id === 'star') return (
        <svg width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges" className="lido-px-icon">
            <rect x="7" y="1" width="2" height="4" fill="#000" />
            <rect x="1" y="6" width="14" height="2" fill="#000" />
            <rect x="4" y="4" width="8" height="6" fill="#000" />
            <rect x="3" y="10" width="4" height="4" fill="#000" />
            <rect x="9" y="10" width="4" height="4" fill="#000" />
            <rect x="7" y="2" width="2" height="10" fill="#ffcb00" />
            <rect x="2" y="6" width="12" height="2" fill="#ffcb00" />
            <rect x="5" y="5" width="6" height="5" fill="#ffe766" />
            <rect x="4" y="10" width="2" height="3" fill="#ffcb00" />
            <rect x="10" y="10" width="2" height="3" fill="#ffcb00" />
        </svg>
    );
    if (id === 'air_guitar') return (
        <svg width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges" className="lido-px-icon">
            <rect x="10" y="1" width="5" height="4" fill="#000" />
            <rect x="11" y="2" width="3" height="2" fill="#facc15" />
            <rect x="6" y="5" width="5" height="5" fill="#000" />
            <rect x="8" y="4" width="3" height="2" fill="#cbd5e1" />
            <rect x="2" y="8" width="7" height="7" fill="#000" />
            <rect x="3" y="9" width="5" height="5" fill="#9333ea" />
            <rect x="4" y="10" width="2" height="2" fill="#e9d5ff" />
            <rect x="7" y="6" width="3" height="2" fill="#94a3b8" />
        </svg>
    );
    if (id === 'flex') return (
        <svg width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges" className="lido-px-icon">
            <rect x="2" y="4" width="5" height="9" fill="#000" />
            <rect x="5" y="8" width="9" height="5" fill="#000" />
            <rect x="8" y="6" width="4" height="3" fill="#000" />
            <rect x="3" y="5" width="3" height="7" fill="#ffcc99" />
            <rect x="6" y="9" width="7" height="3" fill="#ffcc99" />
            <rect x="9" y="7" width="2" height="2" fill="#ffdfb8" />
            <rect x="3" y="3" width="3" height="2" fill="#000" />
            <rect x="4" y="4" width="1" height="1" fill="#ff9966" />
        </svg>
    );
    if (id === 'cannonball') return (
        <svg width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges" className="lido-px-icon">
            <rect x="4" y="4" width="8" height="10" fill="#000" />
            <rect x="3" y="5" width="10" height="8" fill="#000" />
            <rect x="4" y="5" width="8" height="8" fill="#334155" />
            <rect x="5" y="6" width="3" height="3" fill="#94a3b8" />
            <rect x="8" y="2" width="2" height="2" fill="#f97316" />
            <rect x="10" y="1" width="2" height="2" fill="#facc15" />
        </svg>
    );
    if (id === 'air_punch') return (
        <svg width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges" className="lido-px-icon">
            <rect x="2" y="4" width="9" height="8" fill="#000" />
            <rect x="3" y="5" width="7" height="6" fill="#dc2626" />
            <rect x="4" y="6" width="3" height="2" fill="#fca5a5" />
            <rect x="12" y="5" width="2" height="1" fill="#0284c7" />
            <rect x="12" y="8" width="3" height="1" fill="#0284c7" />
            <rect x="12" y="11" width="2" height="1" fill="#0284c7" />
        </svg>
    );
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges" className="lido-px-icon">
            <rect x="2" y="2" width="12" height="2" fill="#16a34a" />
            <rect x="12" y="2" width="2" height="10" fill="#16a34a" />
            <rect x="10" y="10" width="6" height="2" fill="#16a34a" />
            <rect x="11" y="12" width="4" height="2" fill="#16a34a" />
            <rect x="3" y="5" width="6" height="6" fill="#000" />
            <rect x="4" y="6" width="4" height="4" fill="#38bdf8" />
        </svg>
    );
};

const PixelSymbol: FC<{ kind: 'star' | 'heart' | 'skull' }> = ({ kind }) =>
{
    if (kind === 'heart') return (
        <svg width="11" height="10" viewBox="0 0 11 10" shapeRendering="crispEdges">
            <rect x="1" y="1" width="3" height="3" fill="#dc2626" />
            <rect x="7" y="1" width="3" height="3" fill="#dc2626" />
            <rect x="1" y="3" width="9" height="3" fill="#dc2626" />
            <rect x="2" y="6" width="7" height="2" fill="#dc2626" />
            <rect x="4" y="8" width="3" height="1" fill="#dc2626" />
            <rect x="2" y="2" width="1" height="1" fill="#fca5a5" />
        </svg>
    );
    if (kind === 'star') return (
        <svg width="11" height="11" viewBox="0 0 11 11" shapeRendering="crispEdges">
            <rect x="5" y="0" width="1" height="11" fill="#d97706" />
            <rect x="0" y="4" width="11" height="2" fill="#d97706" />
            <rect x="3" y="3" width="5" height="5" fill="#facc15" />
            <rect x="2" y="8" width="2" height="2" fill="#d97706" />
            <rect x="7" y="8" width="2" height="2" fill="#d97706" />
        </svg>
    );
    return (
        <svg width="11" height="11" viewBox="0 0 11 11" shapeRendering="crispEdges">
            <rect x="2" y="1" width="7" height="6" fill="#1e293b" />
            <rect x="3" y="2" width="5" height="4" fill="#e2e8f0" />
            <rect x="3" y="3" width="2" height="2" fill="#000" />
            <rect x="6" y="3" width="2" height="2" fill="#000" />
            <rect x="3" y="7" width="5" height="3" fill="#1e293b" />
            <rect x="4" y="8" width="1" height="1" fill="#e2e8f0" />
            <rect x="6" y="8" width="1" height="1" fill="#e2e8f0" />
        </svg>
    );
};

interface LidoActiveDive
{
    id: string;
    userId: number;
    username: string;
    figure: string;
    swimColor: string;
    phase: string;
    activeTrick: TrickId | null;
    tricks: TrickId[];
    jumpQuality: 'perfect' | 'good' | 'drop';
    entryType: 'clean_dive' | 'cannonball' | 'belly_flop';
    crowdVotes: number[];
    votes: Array<{ userId: number; username: string; score: number | null; symbol: string | null }>;
    avgScore: number | null;
}

interface LidoLeaderboardEntry
{
    username: string;
    figure: string;
    best_score: number;
    total_dives: number;
}

function toLidoSwimwear(rawFigure: string, swimColor: string, gender: string): string
{
    const segs = (rawFigure || 'hr-115-42.hd-195-19').split('.').filter(Boolean);
    const keep = new Set([ 'hd', 'hr', 'ey', 'fc', 'ea', 'fa', 'ha', 'he' ]);
    const kept: string[] = [];
    for (const seg of segs)
    {
        const type = seg.split('-')[0];
        if (keep.has(type)) kept.push(seg);
    }
    if (!kept.some(s => s.startsWith('hd-'))) kept.push('hd-195-19');
    if (String(gender).toUpperCase() === 'F') kept.push(`ch-665-${ swimColor }`);
    kept.push(`lg-280-${ swimColor }`);
    return kept.join('.');
}

export const LidoDivingRoomWidget: FC<{}> = () =>
{
    const { roomSession = null } = useRoom();
    const isLidoRoom = !!(roomSession && roomSession.roomId === LIDO_DIVING_ROOM_ID);

    const myUsername = GetSessionDataManager()?.userName || 'Habbten';
    const myFigure = GetSessionDataManager()?.figure || 'hr-115-42.hd-195-19.ch-3030-82.lg-275-1408';
    const myGender = GetSessionDataManager()?.gender || 'M';

    const [ tickets, setTickets ] = useState<number>(0);
    const [ credits, setCredits ] = useState<number>(0);
    const [ bestScore, setBestScore ] = useState<number>(0);
    const [ totalDives, setTotalDives ] = useState<number>(0);
    const [ swimColor, setSwimColor ] = useState<string>('64');
    const [ leaderboard, setLeaderboard ] = useState<LidoLeaderboardEntry[]>([]);
    const [ activeDive, setActiveDive ] = useState<LidoActiveDive | null>(null);

    const [ showDispenser, setShowDispenser ] = useState<boolean>(false);
    const [ showLeaderboard, setShowLeaderboard ] = useState<boolean>(false);
    const [ statusBanner, setStatusBanner ] = useState<string>('');
    const [ busyBuy, setBusyBuy ] = useState<boolean>(false);
    const [ myVotedDiveId, setMyVotedDiveId ] = useState<string>('');
    const [ queueActive, setQueueActive ] = useState<boolean>(false);

    // Diving stage state
    const [ stageOpen, setStageOpen ] = useState<boolean>(false);
    const [ phase, setPhase ] = useState<DivePhase>('idle');
    const [ activeTrick, setActiveTrick ] = useState<TrickId | null>(null);
    const [ performedTricks, setPerformedTricks ] = useState<TrickId[]>([]);
    const [ jumpQuality, setJumpQuality ] = useState<'perfect' | 'good' | 'drop'>('good');
    const [ entryType, setEntryType ] = useState<'clean_dive' | 'cannonball' | 'belly_flop'>('clean_dive');
    const [ resultAvg, setResultAvg ] = useState<number | null>(null);
    const [ resultCrowdVotes, setResultCrowdVotes ] = useState<number[]>([]);
    const [ sprintPct, setSprintPct ] = useState<number>(0);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const elevatorCooldownRef = useRef<number>(0);
    const queueStepTimeRef = useRef<number>(0);
    const spritesRef = useRef<{ std?: HTMLImageElement; front?: HTMLImageElement; head?: HTMLImageElement }>({});

    const simRef = useRef({
        phase: 'idle' as DivePhase,
        phaseT: 0,
        boardX: 0,
        sprintSpeed: 0,
        airX: 0,
        airY: 0,
        vx: 0,
        vy: 0,
        gravity: 540,
        rotDeg: 0,
        spinVel: 0,
        trick: null as TrickId | null,
        trickTimer: 0,
        tricks: [] as TrickId[],
        jumpQuality: 'good' as 'perfect' | 'good' | 'drop',
        entryType: 'clean_dive' as 'clean_dive' | 'cannonball' | 'belly_flop',
        swimX: 0,
        splashParticles: [] as Array<{ x: number; y: number; vx: number; vy: number; r: number; life: number; maxLife: number; color: string }>,
        trickParticles: [] as Array<{ x: number; y: number; vx: number; vy: number; text: string; life: number; color: string }>,
        clouds: [
            { x: 110, y: 34, w: 72, speed: 14 },
            { x: 310, y: 58, w: 94, speed: 10 },
            { x: 520, y: 26, w: 66, speed: 17 },
            { x: 640, y: 74, w: 80, speed: 12 }
        ],
        finishedSubmitted: false
    });

    const swimFigure = useMemo(() => toLidoSwimwear(myFigure, swimColor, myGender), [ myFigure, swimColor, myGender ]);

    useEffect(() =>
    {
        if (!isLidoRoom) return;
        let alive = true;

        const renderSprites = () =>
        {
            if (!alive) return;
            const stdRaw = renderShockwaveSmallDataUrl(swimFigure, { direction: 2, headDirection: 2, posture: 'std' });
            const frontRaw = renderShockwaveSmallDataUrl(swimFigure, { direction: 3, headDirection: 3, posture: 'std' });
            const headRaw = renderShockwaveSmallDataUrl(swimFigure, { direction: 2, headDirection: 2, headOnly: true });

            if (stdRaw) trimTransparentImage(stdRaw, (_u, img) => { if (alive) spritesRef.current.std = img; });
            if (frontRaw) trimTransparentImage(frontRaw, (_u, img) => { if (alive) spritesRef.current.front = img; });
            if (headRaw) trimTransparentImage(headRaw, (_u, img) => { if (alive) spritesRef.current.head = img; });
        };

        const unsub = onShockwaveSmallAtlasReady(renderSprites);
        return () =>
        {
            alive = false;
            unsub();
        };
    }, [ isLidoRoom, swimFigure ]);

    const fetchStatus = useCallback(async () =>
    {
        try
        {
            const res = await fetch('/api/lido/status', { credentials: 'same-origin' });
            if (!res.ok) return;
            const data = await res.json();
            if (!data?.success) return;
            setTickets(Number(data.tickets || 0));
            setCredits(Number(data.credits || 0));
            setBestScore(Number(data.bestScore || 0));
            setTotalDives(Number(data.totalDives || 0));
            if (data.swimColor) setSwimColor(String(data.swimColor));
            if (Array.isArray(data.leaderboard)) setLeaderboard(data.leaderboard);
            setActiveDive(data.activeDive || null);
        }
        catch
        {
            // Non-fatal
        }
    }, []);

    useEffect(() =>
    {
        if (!isLidoRoom)
        {
            setStageOpen(false);
            setShowDispenser(false);
            setShowLeaderboard(false);
            return;
        }

        fetchStatus();
        const interval = window.setInterval(fetchStatus, 2500);
        return () => window.clearInterval(interval);
    }, [ isLidoRoom, fetchStatus ]);

    const flashBanner = useCallback((msg: string) =>
    {
        setStatusBanner(msg);
        window.setTimeout(() => setStatusBanner(prev => (prev === msg ? '' : prev)), 3600);
    }, []);

    const handleBuyTickets = useCallback(async () =>
    {
        if (busyBuy) return;
        setBusyBuy(true);
        try
        {
            const res = await fetch('/api/lido/buy-tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin'
            });
            const data = await res.json();
            if (data?.success)
            {
                setTickets(Number(data.tickets || 0));
                setCredits(Number(data.credits || 0));
                flashBanner(data.message || '5 tickets añadidos.');
            }
            else
            {
                flashBanner(data?.error || 'No se pudieron comprar tickets.');
            }
        }
        catch
        {
            flashBanner('Error de conexión con el dispensador.');
        }
        finally
        {
            setBusyBuy(false);
        }
    }, [ busyBuy, flashBanner ]);

    const handleSwimColorChange = useCallback((colorId: string) =>
    {
        setSwimColor(colorId);
        fetch('/api/lido/swim-color', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ swimColor: colorId })
        }).catch(() => {});
    }, []);

    const submitDiveResult = useCallback(async (q: 'perfect' | 'good' | 'drop', tricks: TrickId[], entry: 'clean_dive' | 'cannonball' | 'belly_flop') =>
    {
        try
        {
            const res = await fetch('/api/lido/dive/finish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ jumpQuality: q, tricks, entryType: entry })
            });
            const data = await res.json();
            if (data?.success)
            {
                setResultAvg(Number(data.avgScore || 5));
                setResultCrowdVotes(Array.isArray(data.crowdVotes) ? data.crowdVotes : []);
                setBestScore(Number(data.bestScore || 0));
                setTotalDives(Number(data.totalDives || 0));
                setTickets(Number(data.tickets || 0));
                if (data.dive) setActiveDive(data.dive);
                fetchStatus();
            }
        }
        catch
        {
            setResultAvg(7.5);
            setResultCrowdVotes([ 7, 8, 7, 8 ]);
        }
    }, [ fetchStatus ]);

    const startElevatorAndDive = useCallback(async () =>
    {
        if (stageOpen) return;
        const now = Date.now();
        if (now < elevatorCooldownRef.current) return;
        elevatorCooldownRef.current = now + 2200;

        try
        {
            const res = await fetch('/api/lido/dive/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ swimColor })
            });
            const data = await res.json();
            if (!data?.success)
            {
                if (data?.needsTickets) setShowDispenser(true);
                flashBanner(data?.error || 'Necesitas 1 ticket para subir al trampolín.');
                return;
            }

            setTickets(Number(data.tickets || 0));
            if (data.dive) setActiveDive(data.dive);
            setShowDispenser(false);
            setShowLeaderboard(false);
            setResultAvg(null);
            setResultCrowdVotes([]);
            setPerformedTricks([]);
            setActiveTrick(null);
            setSprintPct(0);

            const sim = simRef.current;
            sim.phase = 'elevator';
            sim.phaseT = 0;
            sim.boardX = 0;
            sim.sprintSpeed = 0.28;
            sim.airX = 0;
            sim.airY = 0;
            sim.vx = 0;
            sim.vy = 0;
            sim.rotDeg = 0;
            sim.spinVel = 0;
            sim.trick = null;
            sim.trickTimer = 0;
            sim.tricks = [];
            sim.jumpQuality = 'good';
            sim.entryType = 'clean_dive';
            sim.swimX = 0;
            sim.splashParticles = [];
            sim.trickParticles = [];
            sim.finishedSubmitted = false;

            setPhase('elevator');
            setStageOpen(true);
        }
        catch
        {
            flashBanner('No se pudo conectar con el ascensor del trampolín.');
        }
    }, [ stageOpen, swimColor, flashBanner ]);

    useEffect(() =>
    {
        if (!isLidoRoom) return;

        const timer = window.setInterval(() =>
        {
            if (stageOpen) return;
            const ownObj = GetOwnRoomObject();
            if (!ownObj) return;
            const loc = ownObj.getLocation();
            if (!loc) return;

            const tx = Math.round(loc.x);
            const ty = Math.round(loc.y);

            if (tx === ELEVATOR_TILE.x && ty === ELEVATOR_TILE.y)
            {
                setQueueActive(false);
                if (Date.now() >= elevatorCooldownRef.current) startElevatorAndDive();
                return;
            }

            const qIdx = QUEUE_TILES.findIndex(([ qx, qy ]) => qx === tx && qy === ty);
            if (qIdx >= 0 && qIdx < QUEUE_TILES.length - 1)
            {
                setQueueActive(true);
                const now = Date.now();
                if (now - queueStepTimeRef.current >= 780)
                {
                    queueStepTimeRef.current = now;
                    const [ nx, ny ] = QUEUE_TILES[qIdx + 1];
                    SendMessageComposer(new RoomUnitWalkComposer(nx, ny));
                }
            }
            else
            {
                setQueueActive(false);
            }
        }, 220);

        return () => window.clearInterval(timer);
    }, [ isLidoRoom, stageOpen, startElevatorAndDive ]);

    const joinQueueInRoom = useCallback(() =>
    {
        if (tickets <= 0)
        {
            setShowDispenser(true);
            flashBanner('Compra tickets primero (2 créditos = 5 tickets).');
            return;
        }
        const ownObj = GetOwnRoomObject();
        const loc = ownObj?.getLocation();
        if (loc && Math.abs(Math.round(loc.x) - ELEVATOR_TILE.x) <= 1 && Math.abs(Math.round(loc.y) - ELEVATOR_TILE.y) <= 1)
        {
            startElevatorAndDive();
            return;
        }
        SendMessageComposer(new RoomUnitWalkComposer(QUEUE_TILES[0][0], QUEUE_TILES[0][1]));
        flashBanner('Entrando a la cola del trampolín...');
    }, [ tickets, startElevatorAndDive, flashBanner ]);

    const triggerSprintStep = useCallback(() =>
    {
        const sim = simRef.current;
        if (sim.phase !== 'sprint') return;
        sim.sprintSpeed = Math.min(1.45, sim.sprintSpeed + 0.24);
    }, []);

    const triggerBoardJump = useCallback(() =>
    {
        const sim = simRef.current;
        if (sim.phase !== 'sprint') return;

        const bx = sim.boardX;
        let q: 'perfect' | 'good' | 'drop' = 'drop';
        if (bx >= 0.72 && bx <= 0.96) q = 'perfect';
        else if (bx >= 0.48 && bx < 0.72) q = 'good';
        else q = 'drop';

        sim.jumpQuality = q;
        sim.phase = 'airborne';
        sim.phaseT = 0;
        sim.airX = 126 + bx * 126;
        sim.airY = 128;

        if (q === 'perfect')
        {
            sim.vx = 92;
            sim.vy = -310;
            sim.gravity = 235;
        }
        else if (q === 'good')
        {
            sim.vx = 84;
            sim.vy = -225;
            sim.gravity = 260;
        }
        else
        {
            sim.vx = 68;
            sim.vy = -85;
            sim.gravity = 310;
        }

        setJumpQuality(q);
        setPhase('airborne');

        fetch('/api/lido/dive/trick', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ phase: 'airborne' })
        }).catch(() => {});
    }, []);

    const triggerTrick = useCallback((trickId: TrickId) =>
    {
        const sim = simRef.current;
        if (sim.phase !== 'airborne') return;

        sim.trick = trickId;
        sim.trickTimer = 0.65;
        if (sim.tricks.length < 24) sim.tricks.push(trickId);

        if (trickId === 'flip_dive') sim.spinVel = 540;
        else if (trickId === 'cannonball') sim.spinVel = 420;
        else if (trickId === 'air_guitar') sim.spinVel = 90;
        else sim.spinVel = 0;

        const def = LIDO_TRICKS.find(t => t.id === trickId);
        if (def)
        {
            sim.trickParticles.push({
                x: sim.airX,
                y: sim.airY - 24,
                vx: (Math.random() - 0.5) * 28,
                vy: -36,
                text: def.name.toUpperCase(),
                life: 0.75,
                color: def.accent
            });
        }

        setActiveTrick(trickId);
        setPerformedTricks([ ...sim.tricks ]);

        fetch('/api/lido/dive/trick', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ phase: 'airborne', trick: trickId })
        }).catch(() => {});
    }, []);

    useEffect(() =>
    {
        if (!stageOpen) return;

        const onKeyDown = (e: KeyboardEvent) =>
        {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            const k = e.key.toLowerCase();
            const sim = simRef.current;

            if (sim.phase === 'sprint')
            {
                if (k === 'arrowright' || k === 'd')
                {
                    e.preventDefault();
                    triggerSprintStep();
                }
                else if (k === ' ' || k === 'arrowup' || k === 'w' || k === 'enter')
                {
                    e.preventDefault();
                    triggerBoardJump();
                }
                return;
            }

            if (sim.phase === 'airborne')
            {
                if (k === 'w' || k === '1') { e.preventDefault(); triggerTrick('star'); }
                else if (k === 'e' || k === '2') { e.preventDefault(); triggerTrick('air_guitar'); }
                else if (k === 'a' || k === '3') { e.preventDefault(); triggerTrick('flex'); }
                else if (k === 's' || k === '4') { e.preventDefault(); triggerTrick('cannonball'); }
                else if (k === 'd' || k === '5') { e.preventDefault(); triggerTrick('air_punch'); }
                else if (k === 'z' || k === 'x' || k === '6' || k === ' ') { e.preventDefault(); triggerTrick('flip_dive'); }
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [ stageOpen, triggerSprintStep, triggerBoardJump, triggerTrick ]);

    useEffect(() =>
    {
        if (!stageOpen) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let raf = 0;
        let lastTs = performance.now();

        const W = 620;
        const H = 360;
        const WATER_Y = 276;

        const spawnSplash = (sx: number, sy: number, intensity: number) =>
        {
            const sim = simRef.current;
            const count = Math.round(22 * intensity);
            for (let i = 0; i < count; i++)
            {
                const angle = -Math.PI * (0.15 + Math.random() * 0.7);
                const spd = (80 + Math.random() * 170) * intensity;
                sim.splashParticles.push({
                    x: sx + (Math.random() - 0.5) * 18,
                    y: sy,
                    vx: Math.cos(angle) * spd,
                    vy: Math.sin(angle) * spd,
                    r: 2.5 + Math.random() * 3.5,
                    life: 0.75 + Math.random() * 0.45,
                    maxLife: 1.1,
                    color: i % 3 === 0 ? '#ffffff' : '#9be8ff'
                });
            }
        };

        const tick = (now: number) =>
        {
            const dt = Math.min(0.05, (now - lastTs) / 1000);
            lastTs = now;
            const sim = simRef.current;
            sim.phaseT += dt;

            for (const c of sim.clouds)
            {
                c.x -= c.speed * dt;
                if (c.x + c.w < -20) c.x = W + 30;
            }

            if (sim.phase === 'elevator')
            {
                if (sim.phaseT >= 1.05)
                {
                    sim.phase = 'sprint';
                    sim.phaseT = 0;
                    sim.boardX = 0.04;
                    sim.sprintSpeed = 0.34;
                    setPhase('sprint');
                }
            }
            else if (sim.phase === 'sprint')
            {
                sim.boardX += sim.sprintSpeed * dt * 0.58;
                sim.sprintSpeed = Math.max(0.28, sim.sprintSpeed - dt * 0.12);
                setSprintPct(Math.min(100, Math.round(sim.boardX * 100)));

                if (sim.boardX >= 1.0)
                {
                    sim.boardX = 1.0;
                    sim.jumpQuality = 'drop';
                    sim.phase = 'airborne';
                    sim.phaseT = 0;
                    sim.airX = 252;
                    sim.airY = 130;
                    sim.vx = 52;
                    sim.vy = -55;
                    sim.gravity = 320;
                    setJumpQuality('drop');
                    setPhase('airborne');
                }
            }
            else if (sim.phase === 'airborne')
            {
                sim.airX += sim.vx * dt;
                sim.vy += sim.gravity * dt;
                sim.airY += sim.vy * dt;
                sim.rotDeg += sim.spinVel * dt;
                if (sim.trickTimer > 0) sim.trickTimer = Math.max(0, sim.trickTimer - dt);

                if (sim.airY >= WATER_Y)
                {
                    sim.airY = WATER_Y;
                    const lastTrick = sim.tricks[sim.tricks.length - 1] || null;
                    let entry: 'clean_dive' | 'cannonball' | 'belly_flop' = 'clean_dive';
                    if (lastTrick === 'cannonball') entry = 'cannonball';
                    else if (lastTrick === 'star') entry = 'belly_flop';
                    else if (lastTrick === 'flip_dive' || sim.tricks.length >= 2) entry = 'clean_dive';
                    else if (sim.jumpQuality === 'drop') entry = 'belly_flop';

                    sim.entryType = entry;
                    sim.phase = 'splash';
                    sim.phaseT = 0;
                    sim.swimX = sim.airX;

                    spawnSplash(sim.airX, WATER_Y, entry === 'cannonball' ? 1.55 : (entry === 'belly_flop' ? 1.3 : 0.78));
                    setEntryType(entry);
                    setPhase('splash');
                }
            }
            else if (sim.phase === 'splash')
            {
                sim.swimX += 78 * dt;
                if (sim.phaseT >= 1.55)
                {
                    sim.phase = 'scoring';
                    sim.phaseT = 0;
                    setPhase('scoring');
                    if (!sim.finishedSubmitted)
                    {
                        sim.finishedSubmitted = true;
                        submitDiveResult(sim.jumpQuality, sim.tricks, sim.entryType);
                    }
                }
            }

            for (const p of sim.splashParticles)
            {
                p.x += p.vx * dt;
                p.vy += 390 * dt;
                p.y += p.vy * dt;
                p.life -= dt;
            }
            sim.splashParticles = sim.splashParticles.filter(p => p.life > 0);

            for (const tp of sim.trickParticles)
            {
                tp.x += tp.vx * dt;
                tp.y += tp.vy * dt;
                tp.life -= dt;
            }
            sim.trickParticles = sim.trickParticles.filter(p => p.life > 0);

            ctx.imageSmoothingEnabled = false;

            const skyGrad = ctx.createLinearGradient(0, 0, 0, WATER_Y);
            skyGrad.addColorStop(0, '#3a9fd6');
            skyGrad.addColorStop(0.65, '#7bc8ef');
            skyGrad.addColorStop(1, '#bce8fc');
            ctx.fillStyle = skyGrad;
            ctx.fillRect(0, 0, W, WATER_Y);

            for (const c of sim.clouds)
            {
                const cx = Math.round(c.x);
                const cy = Math.round(c.y);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(cx + 10, cy, c.w - 20, 12);
                ctx.fillRect(cx, cy + 8, c.w, 12);
                ctx.fillStyle = '#cbe7f6';
                ctx.fillRect(cx + 4, cy + 18, c.w - 8, 4);
            }

            ctx.fillStyle = '#d7e2ea';
            ctx.fillRect(0, WATER_Y - 38, W, 38);
            ctx.fillStyle = '#6596a8';
            ctx.fillRect(0, WATER_Y - 40, W, 3);

            for (let row = 0; row < 3; row++)
            {
                const by = WATER_Y - 36 + row * 11;
                ctx.fillStyle = row % 2 === 0 ? '#f6c844' : '#e0ab25';
                ctx.fillRect(310, by, 280, 9);
                ctx.strokeStyle = '#6c4f0a';
                ctx.lineWidth = 1;
                ctx.strokeRect(310, by, 280, 9);
            }

            const crowdVotes = sim.phase === 'scoring' ? (resultCrowdVotes.length ? resultCrowdVotes : [ 8, 9, 8, 9 ]) : [];
            for (let i = 0; i < 6; i++)
            {
                const sx = 338 + i * 42;
                const bounce = sim.phase === 'scoring' ? Math.abs(Math.sin(now / 150 + i)) * 4 : Math.sin(now / 500 + i) * 1;
                const sy = WATER_Y - 22 - bounce;
                ctx.fillStyle = [ '#e74c3c', '#2ecc71', '#3498db', '#9b59b6', '#e67e22', '#1abc9c' ][i % 6];
                ctx.fillRect(sx - 5, sy, 10, 10);
                ctx.fillStyle = '#ffcc99';
                ctx.fillRect(sx - 4, sy - 8, 8, 8);
                ctx.fillStyle = '#1e293b';
                ctx.fillRect(sx - 4, sy - 10, 8, 3);

                if (sim.phase === 'scoring' && i < 4)
                {
                    const val = crowdVotes[i] ?? 8;
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(sx - 9, sy - 27, 18, 15);
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(sx - 9, sy - 27, 18, 15);
                    ctx.fillStyle = '#000000';
                    ctx.font = 'bold 10px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(String(val), sx, sy - 16);
                }
            }

            const waterGrad = ctx.createLinearGradient(0, WATER_Y, 0, H);
            waterGrad.addColorStop(0, '#1ab5d8');
            waterGrad.addColorStop(0.5, '#0c8eb8');
            waterGrad.addColorStop(1, '#085b7d');
            ctx.fillStyle = waterGrad;
            ctx.fillRect(0, WATER_Y, W, H - WATER_Y);

            ctx.fillStyle = 'rgba(255,255,255,0.28)';
            for (let r = 0; r < 6; r++)
            {
                const rx = ((r * 115 + now * 0.03) % (W + 60)) - 30;
                const ry = WATER_Y + 8 + (r % 4) * 18;
                ctx.fillRect(rx, ry, 34, 2);
            }

            for (let b = 0; b < 8; b++)
            {
                const bx = 268 + b * 44;
                const by = WATER_Y + 3 + Math.sin(now / 320 + b) * 1.5;
                ctx.fillStyle = b % 2 === 0 ? '#ffd43b' : '#f08c00';
                ctx.beginPath();
                ctx.ellipse(bx, by, 7, 4, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            ctx.fillStyle = '#b4c7d6';
            ctx.fillRect(58, 126, 68, WATER_Y - 126);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(58, 126, 68, WATER_Y - 126);

            ctx.fillStyle = '#1d4d6b';
            ctx.fillRect(72, 138, 40, WATER_Y - 144);
            ctx.fillStyle = 'rgba(130, 215, 255, 0.25)';
            ctx.fillRect(76, 142, 12, WATER_Y - 152);

            const boardFlex = sim.phase === 'sprint' && sim.boardX > 0.65 ? Math.sin(now / 45) * 3.5 : 0;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(118, 128, 108, 10);
            ctx.fillStyle = '#52c41a';
            ctx.fillRect(216, 128 + boardFlex * 0.4, 38, 10);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(118, 128, 136, 10);

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(60, 126);
            ctx.lineTo(60, 100);
            ctx.lineTo(122, 100);
            ctx.lineTo(122, 126);
            ctx.stroke();

            const drawAvatarAt = (ax: number, ay: number, rotDeg: number, trick: TrickId | null, headOnly = false) =>
            {
                const sp = headOnly ? spritesRef.current.head : (trick === 'star' || trick === 'flex' ? (spritesRef.current.front || spritesRef.current.std) : spritesRef.current.std);
                ctx.save();
                ctx.translate(Math.round(ax), Math.round(ay));
                if (rotDeg) ctx.rotate((rotDeg * Math.PI) / 180);

                let scaleX = 1.45;
                let scaleY = 1.45;
                if (trick === 'star') { scaleX = 1.85; scaleY = 1.32; }
                else if (trick === 'cannonball') { scaleX = 1.3; scaleY = 0.92; }
                else if (trick === 'flex') { scaleX = 1.65; scaleY = 1.5; }
                else if (trick === 'flip_dive') { scaleX = 1.3; scaleY = 1.55; }

                if (sp && sp.naturalWidth > 0)
                {
                    const dw = Math.round(sp.naturalWidth * scaleX);
                    const dh = Math.round(sp.naturalHeight * scaleY);
                    ctx.drawImage(sp, -dw / 2, -dh, dw, dh);
                }
                else
                {
                    ctx.fillStyle = '#ffcc99';
                    ctx.fillRect(-10, -40, 20, 40);
                }

                if (trick === 'air_guitar')
                {
                    ctx.strokeStyle = '#fde047';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(-18, -14);
                    ctx.lineTo(22, -32);
                    ctx.stroke();
                    ctx.fillStyle = '#9333ea';
                    ctx.beginPath();
                    ctx.arc(-15, -13, 6, 0, Math.PI * 2);
                    ctx.fill();
                }
                else if (trick === 'air_punch')
                {
                    ctx.strokeStyle = '#38bdf8';
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.arc(20, -28, 9, -0.7, 0.7);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(-20, -24, 9, Math.PI - 0.7, Math.PI + 0.7);
                    ctx.stroke();
                }
                else if (trick === 'flex')
                {
                    ctx.fillStyle = '#ffcb00';
                    ctx.fillRect(-24, -36, 4, 4);
                    ctx.fillRect(20, -36, 4, 4);
                }
                ctx.restore();
            };

            if (sim.phase === 'elevator')
            {
                const p = Math.min(1, sim.phaseT / 1.05);
                const ey = WATER_Y - 12 - p * (WATER_Y - 140);
                ctx.fillStyle = '#ffcb00';
                ctx.fillRect(74, ey, 36, 7);
                drawAvatarAt(92, ey, 0, null);
            }
            else if (sim.phase === 'sprint')
            {
                const px = 122 + sim.boardX * 130;
                const py = 128 + (sim.boardX > 0.65 ? boardFlex * 0.4 : 0) - Math.abs(Math.sin(now / 65)) * 4;
                drawAvatarAt(px, py, 0, null);

                ctx.fillStyle = '#000000';
                ctx.font = 'bold 10px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('SALTA AQUI', 235, 114);
                ctx.fillStyle = '#ffcb00';
                ctx.fillText('SALTA AQUI', 234, 113);
            }
            else if (sim.phase === 'airborne')
            {
                drawAvatarAt(sim.airX, sim.airY, sim.rotDeg, sim.trick);
            }
            else if (sim.phase === 'splash' || sim.phase === 'scoring')
            {
                const sx = Math.min(W - 44, sim.swimX);
                const bob = Math.sin(now / 180) * 2.5;
                ctx.strokeStyle = 'rgba(255,255,255,0.75)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.ellipse(sx, WATER_Y + 6, 18, 5, 0, 0, Math.PI * 2);
                ctx.stroke();
                drawAvatarAt(sx, WATER_Y + 8 + bob, 0, null, true);
            }

            for (const p of sim.splashParticles)
            {
                ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
                ctx.fillStyle = p.color;
                ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.round(p.r), Math.round(p.r));
            }
            ctx.globalAlpha = 1;

            for (const tp of sim.trickParticles)
            {
                ctx.globalAlpha = Math.min(1, tp.life * 1.6);
                ctx.font = 'bold 12px monospace';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#000000';
                ctx.fillText(tp.text, tp.x + 1, tp.y + 1);
                ctx.fillStyle = tp.color;
                ctx.fillText(tp.text, tp.x, tp.y);
            }
            ctx.globalAlpha = 1;

            // Authentic Lido LCD Jumbotron (top-right inside canvas)
            const jx = W - 154;
            const jy = 12;
            const jw = 142;
            const jh = 92;
            ctx.fillStyle = '#2a3542';
            ctx.fillRect(jx - 3, jy - 3, jw + 6, jh + 6);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.strokeRect(jx - 3, jy - 3, jw + 6, jh + 6);
            ctx.fillStyle = '#111c26';
            ctx.fillRect(jx, jy, jw, jh);
            ctx.fillStyle = '#6596a8';
            ctx.fillRect(jx, jy, jw, 15);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('LIDO JUMBOTRON', jx + jw / 2, jy + 11);

            if (sim.phase === 'scoring')
            {
                const headSp = spritesRef.current.head;
                if (headSp && headSp.naturalWidth > 0)
                {
                    ctx.drawImage(headSp, jx + jw / 2 - headSp.naturalWidth * 0.9, jy + 20, headSp.naturalWidth * 1.8, headSp.naturalHeight * 1.8);
                }
                ctx.fillStyle = '#ffe14d';
                ctx.font = 'bold 18px monospace';
                ctx.fillText(resultAvg !== null ? `${ resultAvg.toFixed(1) } / 10` : '...', jx + jw / 2, jy + 82);
            }
            else
            {
                const sp = spritesRef.current.front || spritesRef.current.std;
                if (sp && sp.naturalWidth > 0)
                {
                    const scale = 1.25;
                    ctx.drawImage(sp, jx + jw / 2 - (sp.naturalWidth * scale) / 2, jy + 22, sp.naturalWidth * scale, sp.naturalHeight * scale);
                }
                const label = sim.trick
                    ? (LIDO_TRICKS.find(t => t.id === sim.trick)?.name.toUpperCase() || '')
                    : (sim.phase === 'sprint' ? 'CORRE Y SALTA' : (sim.phase === 'elevator' ? 'SUBIENDO...' : 'EN EL AIRE'));
                ctx.fillStyle = '#64f4ff';
                ctx.font = 'bold 10px monospace';
                ctx.fillText(label, jx + jw / 2, jy + 85);
            }

            raf = window.requestAnimationFrame(tick);
        };

        raf = window.requestAnimationFrame(tick);
        return () => window.cancelAnimationFrame(raf);
    }, [ stageOpen, resultAvg, resultCrowdVotes, submitDiveResult ]);

    const closeStageAndExitPool = useCallback(() =>
    {
        setStageOpen(false);
        setPhase('idle');
        elevatorCooldownRef.current = Date.now() + 3000;
        SendMessageComposer(new RoomUnitWalkComposer(POOL_EXIT_TILE.x, POOL_EXIT_TILE.y));
    }, []);

    const handleVote = useCallback(async (score: number | null, symbol: string | null) =>
    {
        if (!activeDive) return;
        try
        {
            const res = await fetch('/api/lido/vote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ score, symbol })
            });
            const data = await res.json();
            if (data?.success)
            {
                setMyVotedDiveId(activeDive.id);
                if (data.dive) setActiveDive(data.dive);
                flashBanner(score ? `Cartilla de ${ score } puntos enviada.` : 'Cartilla enviada al Jumbotron.');
            }
        }
        catch
        {
            // ignore
        }
    }, [ activeDive, flashBanner ]);

    if (!isLidoRoom) return null;

    const showSpectatorJumbotron = !stageOpen && !!activeDive;
    const canVoteOnActive = !!(activeDive && myVotedDiveId !== activeDive.id);

    return (
        <div className="lido-room-widget-root">
            {/* Authentic Habbo Shockwave / Modern Lido Strip (zero emojis, pixel chrome) */}
            <div className="lido-hud-bar">
                <div className="lido-hud-title">
                    <PixelIconBoard />
                    <span>Habbten Lido</span>
                </div>
                <div className="lido-hud-divider" />
                <div className="lido-hud-tickets" title="Tickets para el trampolín">
                    <PixelIconTicket />
                    <span>{ tickets }</span>
                </div>
                <button type="button" className="lido-btn lido-btn-yellow" onClick={ () => setShowDispenser(v => !v) }>
                    Tickets (2c)
                </button>
                <button type="button" className="lido-btn lido-btn-green" onClick={ joinQueueInRoom }>
                    { queueActive ? 'En cola...' : 'Trampolín' }
                </button>
                <button type="button" className="lido-btn lido-btn-neutral" onClick={ () => setShowLeaderboard(v => !v) }>
                    <PixelIconTrophy />
                    <span>Top</span>
                </button>
            </div>

            { statusBanner && (
                <div className="lido-toast">{ statusBanner }</div>
            ) }

            {/* Ticket Dispenser & Swimwear Booth Modal */}
            { showDispenser && (
                <div className="lido-window lido-dispenser-panel">
                    <div className="lido-window-header">
                        <div className="lido-header-dots" />
                        <span className="lido-window-title">Dispensador del Lido</span>
                        <div className="lido-header-dots" />
                        <button type="button" className="lido-close-x" onClick={ () => setShowDispenser(false) } aria-label="Cerrar">✕</button>
                    </div>
                    <div className="lido-window-body">
                        <p className="lido-desc">
                            Necesitas <b>1 ticket</b> y llevar tu <b>bañador del Lido</b> para subir al trampolín. Al entrar al ascensor el ticket se canjea automáticamente.
                        </p>
                        <div className="lido-inset-box">
                            <div className="lido-ticket-row">
                                <PixelIconTicket />
                                <div>
                                    <div className="lido-ticket-title">5 Tickets de Trampolín</div>
                                    <div className="lido-ticket-sub">Precio oficial: 2 Créditos</div>
                                </div>
                            </div>
                            <button type="button" className="lido-btn lido-btn-green" disabled={ busyBuy } onClick={ handleBuyTickets }>
                                { busyBuy ? 'Comprando...' : 'Comprar (2c)' }
                            </button>
                        </div>
                        <div className="lido-meta-row">
                            <span>Tus tickets: <b>{ tickets }</b></span>
                            <span>Tus créditos: <b>{ credits.toLocaleString() }</b></span>
                        </div>
                        <div className="lido-swim-picker">
                            <div className="lido-swim-label">Color del bañador:</div>
                            <div className="lido-swim-swatches">
                                { SWIM_COLORS.map(c => (
                                    <button
                                        key={ c.id }
                                        type="button"
                                        title={ c.label }
                                        className={ `lido-swatch ${ swimColor === c.id ? 'is-active' : '' }` }
                                        style={{ backgroundColor: c.hex }}
                                        onClick={ () => handleSwimColorChange(c.id) }
                                    />
                                )) }
                            </div>
                        </div>
                    </div>
                </div>
            ) }

            {/* Top Clavadistas Leaderboard */}
            { showLeaderboard && (
                <div className="lido-window lido-lb-panel">
                    <div className="lido-window-header">
                        <div className="lido-header-dots" />
                        <span className="lido-window-title">Mejores Saltos del Lido</span>
                        <div className="lido-header-dots" />
                        <button type="button" className="lido-close-x" onClick={ () => setShowLeaderboard(false) } aria-label="Cerrar">✕</button>
                    </div>
                    <div className="lido-window-body">
                        <div className="lido-meta-row mb-2">
                            <span>Tu récord: <b>{ bestScore.toFixed(1) } / 10</b></span>
                            <span>Tus saltos: <b>{ totalDives }</b></span>
                        </div>
                        { leaderboard.length === 0 ? (
                            <div className="lido-empty">Sé el primero en saltar desde el trampolín.</div>
                        ) : (
                            <div className="lido-lb-list">
                                { leaderboard.map((row, idx) => (
                                    <div key={ row.username } className="lido-lb-row">
                                        <span className="lido-lb-rank">#{ idx + 1 }</span>
                                        <span className="lido-lb-name">{ row.username }</span>
                                        <span className="lido-lb-dives">{ row.total_dives } saltos</span>
                                        <span className="lido-lb-score">{ Number(row.best_score).toFixed(1) }</span>
                                    </div>
                                )) }
                            </div>
                        ) }
                    </div>
                </div>
            ) }

            {/* Live Spectator Jumbotron & Scorecard */}
            { showSpectatorJumbotron && activeDive && (
                <div className="lido-window lido-spectator-jumbotron">
                    <div className="lido-window-header">
                        <div className="lido-header-dots" />
                        <span className="lido-window-title">Jumbotron Lido — { activeDive.username }</span>
                        <div className="lido-header-dots" />
                    </div>
                    <div className="lido-window-body">
                        <div className="lido-jumbo-row">
                            <span>
                                { activeDive.phase === 'scoring'
                                    ? `Salto completado (${ activeDive.tricks.length } trucos) — Elige tu cartilla:`
                                    : (activeDive.activeTrick ? `Truco en vivo: ${ activeDive.activeTrick.toUpperCase() }` : 'En el trampolín...') }
                            </span>
                            { activeDive.avgScore !== null && (
                                <span className="lido-jumbo-score">{ Number(activeDive.avgScore).toFixed(1) } / 10</span>
                            ) }
                        </div>
                        { canVoteOnActive && (
                            <div className="lido-scorecards-row">
                                { [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ].map(n => (
                                    <button key={ n } type="button" className="lido-card-btn" onClick={ () => handleVote(n, null) }>
                                        { n }
                                    </button>
                                )) }
                                <button type="button" className="lido-card-btn lido-card-sym" onClick={ () => handleVote(10, 'star') } title="Estrella">
                                    <PixelSymbol kind="star" />
                                </button>
                                <button type="button" className="lido-card-btn lido-card-sym" onClick={ () => handleVote(9, 'heart') } title="Me encantó">
                                    <PixelSymbol kind="heart" />
                                </button>
                                <button type="button" className="lido-card-btn lido-card-sym" onClick={ () => handleVote(2, 'skull') } title="Panzazo">
                                    <PixelSymbol kind="skull" />
                                </button>
                            </div>
                        ) }
                    </div>
                </div>
            ) }

            {/* Main In-Room Lido Diving Stage Window */}
            { stageOpen && (
                <div className="lido-stage-backdrop">
                    <div className="lido-window lido-stage-window">
                        <div className="lido-window-header">
                            <div className="lido-header-dots" />
                            <span className="lido-window-title">Habbten Lido II — Trampolín ({ myUsername })</span>
                            <div className="lido-header-dots" />
                            <button type="button" className="lido-close-x" onClick={ closeStageAndExitPool } aria-label="Cerrar">✕</button>
                        </div>

                        <div className="lido-stage-inner">
                            <div className="lido-canvas-wrap">
                                <canvas ref={ canvasRef } width={ 620 } height={ 360 } className="lido-canvas" />
                            </div>

                            <div className="lido-controls-area">
                                { phase === 'elevator' && (
                                    <div className="lido-phase-tip">
                                        Subiendo por el ascensor al trampolín... Prepárate para correr y saltar en la zona verde.
                                    </div>
                                ) }

                                { phase === 'sprint' && (
                                    <div className="lido-sprint-controls">
                                        <div className="lido-sprint-meter">
                                            <div className="lido-sprint-fill" style={{ width: `${ sprintPct }%` }} />
                                            <div className="lido-sprint-zone" />
                                        </div>
                                        <div className="lido-sprint-btns">
                                            <button type="button" className="lido-btn lido-btn-neutral lido-big-btn" onClick={ triggerSprintStep }>
                                                CORRER (→ / D)
                                            </button>
                                            <button type="button" className="lido-btn lido-btn-green lido-big-btn" onClick={ triggerBoardJump }>
                                                SALTAR EN EL BORDE (Espacio / W)
                                            </button>
                                        </div>
                                    </div>
                                ) }

                                { phase === 'airborne' && (
                                    <div className="lido-tricks-panel">
                                        <div className="lido-tricks-header">
                                            <span>
                                                { jumpQuality === 'perfect' ? 'SALTO PERFECTO' : (jumpQuality === 'good' ? 'BUEN IMPULSO' : 'CAÍDA CORTA') }
                                                {' — '}Trucos encadenados: <b>{ performedTricks.length }</b>
                                            </span>
                                            { activeTrick && (
                                                <span className="lido-active-trick-pill">
                                                    { LIDO_TRICKS.find(t => t.id === activeTrick)?.name }
                                                </span>
                                            ) }
                                        </div>
                                        <div className="lido-tricks-grid">
                                            { LIDO_TRICKS.map(t => (
                                                <button
                                                    key={ t.id }
                                                    type="button"
                                                    className={ `lido-trick-btn ${ activeTrick === t.id ? 'is-active' : '' }` }
                                                    onClick={ () => triggerTrick(t.id) }
                                                >
                                                    <PixelIconTrick id={ t.id } />
                                                    <span className="lido-trick-name">{ t.name }</span>
                                                    <span className="lido-trick-key">{ t.keyHint }</span>
                                                </button>
                                            )) }
                                        </div>
                                    </div>
                                ) }

                                { phase === 'splash' && (
                                    <div className="lido-phase-tip">
                                        { entryType === 'clean_dive' ? 'Entrada limpia de campeonato.' : (entryType === 'cannonball' ? 'Bomba al agua: empapaste a media piscina.' : 'Panzazo directo al agua.') } Nadando fuera de la zona de salto...
                                    </div>
                                ) }

                                { phase === 'scoring' && (
                                    <div className="lido-scoring-panel">
                                        <div className="lido-score-summary">
                                            <div className="lido-score-big">
                                                { resultAvg !== null ? resultAvg.toFixed(1) : '...' }<span>/10</span>
                                            </div>
                                            <div className="lido-score-details">
                                                <div>
                                                    <b>Salto:</b> { jumpQuality === 'perfect' ? 'Perfecto' : (jumpQuality === 'good' ? 'Bueno' : 'Caída al borde') }
                                                    {' • '}<b>Entrada:</b> { entryType === 'clean_dive' ? 'Clavado limpio' : (entryType === 'cannonball' ? 'Bomba' : 'Panzazo') }
                                                    {' • '}<b>Trucos:</b> { performedTricks.length }
                                                </div>
                                                <div className="lido-judges-row">
                                                    <span>Cartillas:</span>
                                                    { resultCrowdVotes.map((v, i) => (
                                                        <span key={ i } className="lido-judge-card">{ v }</span>
                                                    )) }
                                                </div>
                                            </div>
                                        </div>
                                        <div className="lido-scoring-actions">
                                            { tickets > 0 ? (
                                                <button type="button" className="lido-btn lido-btn-green" onClick={ () => { setStageOpen(false); window.setTimeout(startElevatorAndDive, 80); } }>
                                                    Saltar otra vez (1 ticket • quedan { tickets })
                                                </button>
                                            ) : (
                                                <button type="button" className="lido-btn lido-btn-yellow" onClick={ () => { setStageOpen(false); setShowDispenser(true); } }>
                                                    Comprar tickets (2c = 5)
                                                </button>
                                            ) }
                                            <button type="button" className="lido-btn lido-btn-neutral" onClick={ closeStageAndExitPool }>
                                                Salir a la piscina
                                            </button>
                                        </div>
                                    </div>
                                ) }
                            </div>
                        </div>
                    </div>
                </div>
            ) }
        </div>
    );
};
