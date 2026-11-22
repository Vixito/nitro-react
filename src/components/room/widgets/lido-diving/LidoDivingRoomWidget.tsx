import { RoomUnitWalkComposer } from '@nitrots/nitro-renderer';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GetOwnRoomObject, GetSessionDataManager, onShockwaveSmallAtlasReady, renderShockwaveSmallDataUrl, SendMessageComposer } from '../../../../api';
import signHeartPng from '../../../../assets/images/icons/sign-heart.png';
import signSkullPng from '../../../../assets/images/icons/sign-skull.png';
import iconStarPng from '../../../../assets/images/eras/flash2012/streak/icon_star_streak.png';
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

type TrickId = 'star' | 'air_guitar' | 'flex' | 'cannonball' | 'air_punch' | 'front_flip' | 'flip_dive';
type DivePhase = 'idle' | 'elevator' | 'sprint' | 'airborne' | 'splash' | 'replay';

// Real vibrant non-club Palette 3 color IDs from FigureData.json
const SWIM_COLORS: Array<{ id: string; label: string; hex: string }> = [
    { id: '106', label: 'Celeste', hex: '#1BD2FF' },
    { id: '107', label: 'Azul', hex: '#1F55FF' },
    { id: '96', label: 'Rojo', hex: '#FF1300' },
    { id: '94', label: 'Naranja', hex: '#FF9211' },
    { id: '93', label: 'Amarillo', hex: '#FFF41D' },
    { id: '102', label: 'Verde', hex: '#1CDC00' },
    { id: '95', label: 'Rosa', hex: '#FF27A6' },
    { id: '99', label: 'Morado', hex: '#C600AD' },
    { id: '92', label: 'Blanco', hex: '#FFFFFF' },
    { id: '110', label: 'Negro', hex: '#1E1E1E' }
];

const LEGACY_SWIM_MAP: Record<string, string> = {
    '64': '107',
    '66': '96',
    '50': '93',
    '48': '102',
    '70': '95',
    '61': '110'
};

function normalizeSwimColor(id: string): string
{
    const clean = String(id || '106').replace(/[^0-9]/g, '') || '106';
    return LEGACY_SWIM_MAP[clean] || clean;
}

// Crisp Habbo-style pixel-art SVGs (zero OS emojis)
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
        <rect x="11" y="2" width="4" height="10" fill="#000" />
        <rect x="12" y="3" width="2" height="8" fill="#a8d4f0" />
        <rect x="2" y="6" width="10" height="3" fill="#000" />
        <rect x="5" y="7" width="6" height="1" fill="#96f0cc" />
        <rect x="3" y="7" width="2" height="1" fill="#5e6e66" />
        <rect x="0" y="11" width="16" height="3" fill="#3bb0c4" />
        <rect x="2" y="12" width="4" height="1" fill="#a8eef8" />
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

// Authentic official Habbo pixel-art PNG sign icons (zero generic SVGs!)
const PixelSymbol: FC<{ kind: 'star' | 'heart' | 'skull' }> = ({ kind }) =>
{
    if (kind === 'heart') return <img src={ signHeartPng } alt="Corazón" className="lido-px-icon" style={{ width: 15, height: 13 }} />;
    if (kind === 'star') return <img src={ iconStarPng } alt="Estrella" className="lido-px-icon" style={{ width: 11, height: 13 }} />;
    return <img src={ signSkullPng } alt="Calavera" className="lido-px-icon" style={{ width: 12, height: 12 }} />;
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
    const col = normalizeSwimColor(swimColor);
    const segs = (rawFigure || 'hr-115-42.hd-195-19').split('.').filter(Boolean);
    const keep = new Set([ 'hd', 'hr', 'ey', 'fc', 'ea', 'fa', 'ha', 'he' ]);
    const kept: string[] = [];
    for (const seg of segs)
    {
        const type = seg.split('-')[0];
        if (keep.has(type)) kept.push(seg);
    }
    if (!kept.some(s => s.startsWith('hd-'))) kept.push('hd-195-19');
    if (String(gender).toUpperCase() === 'F') kept.push(`ch-665-${ col }`);
    kept.push(`lg-280-${ col }`);
    return kept.join('.');
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTHENTIC HABBO SHOCKWAVE / ORIGINS ISOMETRIC LIDO TOWER & POOL PAINTER
// Pre-rendered offscreen at crisp 1:1 Habbo pixel resolution (720 x 1040)
// ═══════════════════════════════════════════════════════════════════════════
const WORLD_W = 720;
const WORLD_H = 1040;
const VIEW_W = 720;
const VIEW_H = 450;

const DOOR_X = 532;
const DOOR_Y = 128;
const BOARD_START_X = 486;
const BOARD_START_Y = 152;
const BOARD_END_X = 344;
const BOARD_END_Y = 223;
const POOL_WATER_Y = 892;

function drawPoly(ctx: CanvasRenderingContext2D, pts: Array<[ number, number ]>, fill: string, stroke?: string)
{
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke)
    {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

function drawHabboTreeCluster(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, seed: number)
{
    let s = seed | 0;
    const rand = () =>
    {
        s = (s * 1664525 + 1013904223) | 0;
        return ((s >>> 0) % 1000) / 1000;
    };

    const grid = 2;
    const minX = Math.floor(cx - rx - 4);
    const maxX = Math.ceil(cx + rx + 4);
    const minY = Math.floor(cy - ry - 4);
    const maxY = Math.ceil(cy + ry + 4);

    const cols = Math.ceil((maxX - minX) / grid) + 2;
    const rows = Math.ceil((maxY - minY) / grid) + 2;
    const mask = new Uint8Array(cols * rows);

    for (let gy = 0; gy < rows; gy++)
    {
        for (let gx = 0; gx < cols; gx++)
        {
            const px = minX + gx * grid;
            const py = minY + gy * grid;
            const nx = (px - cx) / rx;
            const ny = (py - cy) / ry;
            const wobble = Math.sin(px * 0.14 + seed) * 0.14 + Math.cos(py * 0.16 - seed) * 0.12;
            if (nx * nx + ny * ny <= 1.0 + wobble) mask[gy * cols + gx] = 1;
        }
    }

    for (let gy = 0; gy < rows; gy++)
    {
        for (let gx = 0; gx < cols; gx++)
        {
            if (!mask[gy * cols + gx]) continue;
            const px = minX + gx * grid;
            const py = minY + gy * grid;

            const isEdge = gx === 0 || gy === 0 || gx === cols - 1 || gy === rows - 1
                || !mask[(gy - 1) * cols + gx]
                || !mask[(gy + 1) * cols + gx]
                || !mask[gy * cols + (gx - 1)]
                || !mask[gy * cols + (gx + 1)];

            if (isEdge)
            {
                ctx.fillStyle = '#0c1808';
                ctx.fillRect(px, py, grid, grid);
                continue;
            }

            const shade = ((py - (cy - ry)) / (ry * 2)) + ((px - (cx - rx)) / (rx * 2)) * 0.35;
            const r = rand();
            if (shade < 0.36 && r > 0.34) ctx.fillStyle = '#5c9430';
            else if (shade < 0.56 && r > 0.28) ctx.fillStyle = '#3b6f1e';
            else if (shade < 0.80 && r > 0.22) ctx.fillStyle = '#234a13';
            else ctx.fillStyle = '#122909';

            if (shade < 0.30 && r > 0.82) ctx.fillStyle = '#7eb644';
            ctx.fillRect(px, py, grid, grid);
        }
    }
}

function drawBrownPyramidalRoof(ctx: CanvasRenderingContext2D, apexX: number, apexY: number, halfW: number, depthH: number, h: number)
{
    const leftPt: [ number, number ] = [ apexX - halfW, apexY + h ];
    const frontPt: [ number, number ] = [ apexX, apexY + h + depthH ];
    const rightPt: [ number, number ] = [ apexX + halfW, apexY + h ];
    const topL: [ number, number ] = [ apexX - halfW * 0.28, apexY + h * 0.16 ];
    const topF: [ number, number ] = [ apexX, apexY + h * 0.16 + depthH * 0.28 ];
    const topR: [ number, number ] = [ apexX + halfW * 0.28, apexY + h * 0.16 ];
    const cap: [ number, number ] = [ apexX, apexY ];

    drawPoly(ctx, [ leftPt, frontPt, topF, topL ], '#915c26', '#180e04');
    drawPoly(ctx, [ frontPt, rightPt, topR, topF ], '#5c3612', '#180e04');
    drawPoly(ctx, [ topL, topF, cap ], '#ad7132', '#180e04');
    drawPoly(ctx, [ topF, topR, cap ], '#734519', '#180e04');

    ctx.strokeStyle = '#c48640';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(leftPt[0] + 2, leftPt[1] - 1);
    ctx.lineTo(frontPt[0], frontPt[1] - 1);
    ctx.stroke();
}

function drawHabboParasol(ctx: CanvasRenderingContext2D, cx: number, baseY: number)
{
    // Authentic Habbo Lido red-and-white striped beach umbrella (matching 9V3NpI2Mnto_3!)
    // Ground shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.beginPath();
    ctx.ellipse(cx + 4, baseY + 2, 20, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stand base + pole
    ctx.fillStyle = '#000000';
    ctx.fillRect(cx - 5, baseY - 2, 10, 4);
    ctx.fillStyle = '#d4dee6';
    ctx.fillRect(cx - 4, baseY - 1, 8, 2);
    ctx.fillStyle = '#000000';
    ctx.fillRect(cx - 2, baseY - 30, 4, 29);
    ctx.fillStyle = '#f2f7fa';
    ctx.fillRect(cx - 1, baseY - 29, 2, 28);

    // 8-segment red & white canopy
    const topY = baseY - 40;
    const rimY = baseY - 26;
    const segments: Array<[ [ number, number ], [ number, number ], string ]> = [
        [ [ cx - 24, rimY ], [ cx - 16, rimY + 7 ], '#d92626' ],
        [ [ cx - 16, rimY + 7 ], [ cx - 4, rimY + 10 ], '#ffffff' ],
        [ [ cx - 4, rimY + 10 ], [ cx + 8, rimY + 10 ], '#d92626' ],
        [ [ cx + 8, rimY + 10 ], [ cx + 18, rimY + 6 ], '#ffffff' ],
        [ [ cx + 18, rimY + 6 ], [ cx + 24, rimY ], '#c41d1d' ],
        [ [ cx + 24, rimY ], [ cx + 14, rimY - 6 ], '#ececec' ],
        [ [ cx + 14, rimY - 6 ], [ cx - 14, rimY - 6 ], '#e33434' ],
        [ [ cx - 14, rimY - 6 ], [ cx - 24, rimY ], '#f5f5f5' ]
    ];
    for (const [ p1, p2, col ] of segments)
    {
        drawPoly(ctx, [ [ cx, topY ], p1, p2 ], col, '#181818');
    }
    // Finial dot on top
    ctx.fillStyle = '#000000';
    ctx.fillRect(cx - 2, topY - 2, 4, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 1, topY - 1, 2, 1);
}

function buildIsometricLidoWorld(): HTMLCanvasElement
{
    const c = document.createElement('canvas');
    c.width = WORLD_W;
    c.height = WORLD_H;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    // 1. AUTHENTIC HABBO LIDO SKY BLUE (#92c8ff)
    ctx.fillStyle = '#92c8ff';
    ctx.fillRect(0, 0, WORLD_W, 690);

    // Distant Lido lawn behind trees
    ctx.fillStyle = '#5c9c38';
    ctx.fillRect(0, 440, WORLD_W, 250);

    // 2. MIDGROUND PIXEL-ART PARK TREES & WOODEN TURRETS
    drawHabboTreeCluster(ctx, 132, 412, 118, 86, 17);
    drawHabboTreeCluster(ctx, 290, 456, 98, 72, 42);
    drawHabboTreeCluster(ctx, 415, 442, 92, 68, 77);
    drawHabboTreeCluster(ctx, 515, 396, 86, 78, 93);
    drawHabboTreeCluster(ctx, 44, 488, 96, 72, 121);
    drawHabboTreeCluster(ctx, 224, 535, 115, 76, 155);
    drawHabboTreeCluster(ctx, 430, 520, 108, 74, 203);

    drawBrownPyramidalRoof(ctx, 228, 392, 24, 12, 46);
    drawBrownPyramidalRoof(ctx, 355, 384, 38, 18, 62);
    drawBrownPyramidalRoof(ctx, 468, 428, 28, 14, 52);

    // 3. CLEAN ISOMETRIC LIDO II POOL DECK & TURQUOISE SWIMMING POOL (y = 630..1040)
    // Light blue tiled poolside wall backdrop
    ctx.fillStyle = '#9ec6e4';
    ctx.fillRect(0, 618, WORLD_W, 68);
    ctx.strokeStyle = '#7ea9cc';
    for (let y = 626; y < 684; y += 10)
    {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(WORLD_W, y);
        ctx.stroke();
    }
    for (let x = 0; x < WORLD_W; x += 14)
    {
        ctx.beginPath();
        ctx.moveTo(x, 618);
        ctx.lineTo(x, 686);
        ctx.stroke();
    }

    // White isometric mosaic pool deck slab (clean - zero ugly flat yellow blocks!)
    drawPoly(ctx, [ [ 0, 682 ], [ WORLD_W, 682 ], [ WORLD_W, 776 ], [ 0, 776 ] ], '#edf3f7', '#000000');

    // Crisp 2:1 isometric tile grid across deck
    ctx.strokeStyle = '#c5d6e2';
    ctx.lineWidth = 1;
    for (let i = -WORLD_W; i < WORLD_W * 2; i += 28)
    {
        ctx.beginPath();
        ctx.moveTo(i, 682);
        ctx.lineTo(i + 188, 776);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(i, 682);
        ctx.lineTo(i - 188, 776);
        ctx.stroke();
    }

    // Authentic Habbo Lido red-and-white striped beach umbrellas on the deck
    drawHabboParasol(ctx, 88, 742);
    drawHabboParasol(ctx, 438, 742);

    // Deep vertical teal pool rim wall
    drawPoly(ctx, [ [ 0, 774 ], [ WORLD_W, 774 ], [ WORLD_W, 818 ], [ 0, 818 ] ], '#2a8fa2', '#0d3b45');
    ctx.strokeStyle = '#1f7485';
    for (let x = 0; x < WORLD_W; x += 24)
    {
        ctx.beginPath();
        ctx.moveTo(x, 774);
        ctx.lineTo(x, 818);
        ctx.stroke();
    }

    // Authentic Habbo Lido Turquoise Diamond-Pattern Pool Water
    ctx.fillStyle = '#40b3c6';
    ctx.fillRect(0, 818, WORLD_W, WORLD_H - 818);

    ctx.strokeStyle = '#339eb0';
    ctx.lineWidth = 1;
    for (let i = -WORLD_H; i < WORLD_W + WORLD_H; i += 24)
    {
        ctx.beginPath();
        ctx.moveTo(i, 818);
        ctx.lineTo(i + 440, WORLD_H);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(i, 818);
        ctx.lineTo(i - 440, WORLD_H);
        ctx.stroke();
    }

    ctx.fillStyle = '#7ad4e3';
    for (let wy = 830; wy < WORLD_H - 12; wy += 18)
    {
        for (let wx = (wy % 36) + 12; wx < WORLD_W - 12; wx += 48)
        {
            ctx.fillRect(wx, wy, 4, 1);
            ctx.fillRect(wx + 22, wy + 7, 3, 1);
        }
    }

    // Chrome pool exit ladders
    for (const lx of [ 132, 224, 520 ])
    {
        ctx.fillStyle = '#000000';
        ctx.fillRect(lx - 1, 756, 3, 66);
        ctx.fillRect(lx + 14, 756, 3, 66);
        ctx.fillStyle = '#d8e6ee';
        ctx.fillRect(lx, 757, 1, 64);
        ctx.fillRect(lx + 15, 757, 1, 64);
        for (let ry = 768; ry <= 812; ry += 10)
        {
            ctx.fillStyle = '#000000';
            ctx.fillRect(lx, ry, 16, 3);
            ctx.fillStyle = '#e8f4fa';
            ctx.fillRect(lx + 1, ry + 1, 14, 1);
        }
    }

    // Floating diving-zone lane buoy ropes
    const drawBuoyLine = (x1: number, y1: number, x2: number, y2: number, steps: number) =>
    {
        ctx.strokeStyle = '#1b5d6b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        for (let i = 0; i <= steps; i++)
        {
            const t = i / steps;
            const bx = Math.round(x1 + (x2 - x1) * t);
            const by = Math.round(y1 + (y2 - y1) * t);
            ctx.fillStyle = '#000000';
            ctx.fillRect(bx - 3, by - 2, 6, 4);
            ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#ff5050';
            ctx.fillRect(bx - 2, by - 1, 4, 2);
        }
    };
    drawBuoyLine(128, 822, 128, 976, 10);
    drawBuoyLine(128, 976, 420, 976, 16);
    drawBuoyLine(420, 976, 420, 822, 10);

    // 4. ICONIC TALL ISOMETRIC BLUE-TILED HABBO DIVING TOWER (RIGHT SIDE)
    const towerTopY = 58;
    const towerBotY = 824;
    const tLeftX = 516;
    const tMidX = 564;
    const tRightX = 636;
    const tMidDrop = 24;
    const tRightRise = 36;

    const leftFace: Array<[ number, number ]> = [
        [ tLeftX, towerTopY ],
        [ tMidX, towerTopY + tMidDrop ],
        [ tMidX, towerBotY + tMidDrop ],
        [ tLeftX, towerBotY ]
    ];
    drawPoly(ctx, leftFace, '#cde6fa', '#102030');

    const rightFace: Array<[ number, number ]> = [
        [ tMidX, towerTopY + tMidDrop ],
        [ tRightX, towerTopY + tMidDrop - tRightRise ],
        [ tRightX, towerBotY + tMidDrop - tRightRise ],
        [ tMidX, towerBotY + tMidDrop ]
    ];
    drawPoly(ctx, rightFace, '#86b5dc', '#102030');

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(leftFace[0][0], leftFace[0][1]);
    leftFace.forEach(p => ctx.lineTo(p[0], p[1]));
    ctx.closePath();
    ctx.clip();
    for (let y = towerTopY; y < towerBotY + 30; y += 9)
    {
        ctx.strokeStyle = ((y - towerTopY) % 72 < 9) ? '#4f7fa6' : '#96c2e4';
        ctx.lineWidth = ((y - towerTopY) % 72 < 9) ? 1.4 : 1;
        ctx.beginPath();
        ctx.moveTo(tLeftX, y);
        ctx.lineTo(tMidX, y + tMidDrop);
        ctx.stroke();
    }
    for (let x = tLeftX + 8; x < tMidX; x += 8)
    {
        ctx.strokeStyle = '#9ec8e8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, towerTopY);
        ctx.lineTo(x, towerBotY + 30);
        ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(rightFace[0][0], rightFace[0][1]);
    rightFace.forEach(p => ctx.lineTo(p[0], p[1]));
    ctx.closePath();
    ctx.clip();
    for (let y = towerTopY - 40; y < towerBotY + 30; y += 9)
    {
        ctx.strokeStyle = ((y - towerTopY + 144) % 72 < 9) ? '#325a7c' : '#5e90ba';
        ctx.lineWidth = ((y - towerTopY + 144) % 72 < 9) ? 1.4 : 1;
        ctx.beginPath();
        ctx.moveTo(tMidX, y + tMidDrop);
        ctx.lineTo(tRightX, y + tMidDrop - tRightRise);
        ctx.stroke();
    }
    for (let x = tMidX + 9; x < tRightX; x += 9)
    {
        ctx.strokeStyle = '#6293bc';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, towerTopY - 40);
        ctx.lineTo(x, towerBotY + 30);
        ctx.stroke();
    }
    ctx.restore();

    drawPoly(ctx, leftFace, 'rgba(0,0,0,0)', '#102030');
    drawPoly(ctx, rightFace, 'rgba(0,0,0,0)', '#102030');

    drawBrownPyramidalRoof(ctx, tMidX + 12, 4, 66, 28, 52);

    const wingTopY = 308;
    const wingBotY = 810;
    const wLeft: Array<[ number, number ]> = [ [ 610, wingTopY ], [ 642, wingTopY + 16 ], [ 642, wingBotY + 16 ], [ 610, wingBotY ] ];
    const wRight: Array<[ number, number ]> = [ [ 642, wingTopY + 16 ], [ 678, wingTopY - 2 ], [ 678, wingBotY - 2 ], [ 642, wingBotY + 16 ] ];
    drawPoly(ctx, wLeft, '#bddcf5', '#102030');
    drawPoly(ctx, wRight, '#7caad3', '#102030');
    ctx.strokeStyle = '#73a4cc';
    for (let y = wingTopY; y < wingBotY; y += 9)
    {
        ctx.beginPath();
        ctx.moveTo(610, y);
        ctx.lineTo(642, y + 16);
        ctx.lineTo(678, y - 2);
        ctx.stroke();
    }
    drawBrownPyramidalRoof(ctx, 644, 244, 38, 18, 66);

    drawPoly(ctx, [
        [ 522, 82 ],
        [ 556, 99 ],
        [ 556, 146 ],
        [ 522, 129 ]
    ], '#2c2c2c', '#000000');
    drawPoly(ctx, [
        [ 526, 88 ],
        [ 552, 101 ],
        [ 552, 142 ],
        [ 526, 129 ]
    ], '#404040');

    const deckTop: Array<[ number, number ]> = [
        [ 516, 126 ],
        [ 564, 150 ],
        [ 496, 184 ],
        [ 448, 160 ]
    ];
    const deckFrontL: Array<[ number, number ]> = [
        [ 448, 160 ],
        [ 496, 184 ],
        [ 496, 194 ],
        [ 448, 170 ]
    ];
    const deckFrontR: Array<[ number, number ]> = [
        [ 496, 184 ],
        [ 564, 150 ],
        [ 564, 160 ],
        [ 496, 194 ]
    ];
    drawPoly(ctx, deckFrontL, '#b8d0e2', '#102030');
    drawPoly(ctx, deckFrontR, '#89adc9', '#102030');
    drawPoly(ctx, deckTop, '#f7fbff', '#102030');

    ctx.strokeStyle = '#b4c9db';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++)
    {
        const t = i / 4;
        ctx.beginPath();
        ctx.moveTo(516 + (564 - 516) * t, 126 + (150 - 126) * t);
        ctx.lineTo(448 + (496 - 448) * t, 160 + (184 - 160) * t);
        ctx.stroke();
    }
    for (let i = 1; i < 5; i++)
    {
        const t = i / 5;
        ctx.beginPath();
        ctx.moveTo(516 + (448 - 516) * t, 126 + (160 - 126) * t);
        ctx.lineTo(564 + (496 - 564) * t, 150 + (184 - 150) * t);
        ctx.stroke();
    }

    return c;
}

function drawIsometricSpringboard(ctx: CanvasRenderingContext2D, bendPx: number)
{
    const rootL: [ number, number ] = [ 476, 150 ];
    const rootR: [ number, number ] = [ 496, 160 ];
    const gripL: [ number, number ] = [ 374, 201 + bendPx * 0.72 ];
    const gripR: [ number, number ] = [ 394, 211 + bendPx * 0.72 ];
    const tipL: [ number, number ] = [ 334, 221 + bendPx ];
    const tipR: [ number, number ] = [ 354, 231 + bendPx ];

    drawPoly(ctx, [ tipL, tipR, [ tipR[0], tipR[1] + 5 ], [ tipL[0], tipL[1] + 5 ] ], '#4fa382', '#102030');
    drawPoly(ctx, [ tipR, rootR, [ rootR[0], rootR[1] + 5 ], [ tipR[0], tipR[1] + 5 ] ], '#62bc99', '#102030');
    drawPoly(ctx, [ rootL, rootR, gripR, gripL ], '#a6f6d6', '#102030');
    drawPoly(ctx, [ gripL, gripR, tipR, tipL ], '#6c7c73', '#102030');

    ctx.strokeStyle = '#4c5952';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++)
    {
        const t = i / 4;
        ctx.beginPath();
        ctx.moveTo(gripL[0] + (tipL[0] - gripL[0]) * t, gripL[1] + (tipL[1] - gripL[1]) * t);
        ctx.lineTo(gripR[0] + (tipR[0] - gripR[0]) * t, gripR[1] + (tipR[1] - gripR[1]) * t);
        ctx.stroke();
    }
}

function drawIsometricCloud(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number)
{
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(scale, scale);

    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(-26, 8);
    ctx.lineTo(-22, 0);
    ctx.lineTo(-10, -8);
    ctx.lineTo(4, -14);
    ctx.lineTo(20, -10);
    ctx.lineTo(28, -2);
    ctx.lineTo(24, 6);
    ctx.lineTo(8, 12);
    ctx.lineTo(-14, 14);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-24, 7);
    ctx.lineTo(-20, 1);
    ctx.lineTo(-9, -7);
    ctx.lineTo(4, -12);
    ctx.lineTo(19, -9);
    ctx.lineTo(26, -2);
    ctx.lineTo(22, 5);
    ctx.lineTo(8, 10);
    ctx.lineTo(-13, 12);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#d4ecff';
    ctx.fillRect(-14, 7, 24, 3);
    ctx.restore();
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
    const [ swimColor, setSwimColor ] = useState<string>('106');
    const [ leaderboard, setLeaderboard ] = useState<LidoLeaderboardEntry[]>([]);
    const [ activeDive, setActiveDive ] = useState<LidoActiveDive | null>(null);

    const [ showDispenser, setShowDispenser ] = useState<boolean>(false);
    const [ showLeaderboard, setShowLeaderboard ] = useState<boolean>(false);
    const [ showVoteMenu, setShowVoteMenu ] = useState<boolean>(false);
    const [ statusBanner, setStatusBanner ] = useState<string>('');
    const [ busyBuy, setBusyBuy ] = useState<boolean>(false);
    const [ myVotedDiveId, setMyVotedDiveId ] = useState<string>('');
    const [ queueActive, setQueueActive ] = useState<boolean>(false);

    // Live preview in the swimwear booth
    const [ previewUrl, setPreviewUrl ] = useState<string>('');

    // Full-viewport isometric diving camera state
    const [ stageOpen, setStageOpen ] = useState<boolean>(false);
    const [ phase, setPhase ] = useState<DivePhase>('idle');
    const [ pressedKey, setPressedKey ] = useState<string>('');
    const [ resultAvg, setResultAvg ] = useState<number | null>(null);
    const [ resultCrowdVotes, setResultCrowdVotes ] = useState<number[]>([]);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const worldCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const elevatorCooldownRef = useRef<number>(0);
    const queueStepTimeRef = useRef<number>(0);
    const keyFlashTimerRef = useRef<number>(0);
    const lastRunKeyRef = useRef<string>('');
    const spritesRef = useRef<{
        std?: HTMLImageElement;
        wlk0?: HTMLImageElement;
        wlk1?: HTMLImageElement;
        front?: HTMLImageElement;
        armsUp?: HTMLImageElement;
        armsOut?: HTMLImageElement;
        punch?: HTMLImageElement;
        tuck?: HTMLImageElement;
        dive?: HTMLImageElement;
        head?: HTMLImageElement;
    }>({});

    const simRef = useRef({
        phase: 'idle' as DivePhase,
        phaseT: 0,
        camY: 0,
        boardT: 0,
        sprintSpeed: 0.24,
        boardBend: 0,
        airX: BOARD_END_X,
        airY: BOARD_END_Y,
        vx: 0,
        vy: 0,
        gravity: 340,
        rotDeg: 0,
        spinVel: 0,
        trick: null as TrickId | null,
        trickTimer: 0,
        tricks: [] as TrickId[],
        jumpQuality: 'good' as 'perfect' | 'good' | 'drop',
        entryType: 'clean_dive' as 'clean_dive' | 'cannonball' | 'belly_flop',
        swimX: 280,
        swimY: POOL_WATER_Y,
        splashPlume: null as { x: number; y: number; t: number; duration: number; scale: number } | null,
        splashRings: [] as Array<{ x: number; y: number; rx: number; maxRx: number; life: number; maxLife: number; width: number; color: string }>,
        splashDrops: [] as Array<{ x: number; y: number; vx: number; vy: number; r: number; life: number; maxLife: number; color: string }>,
        clouds: [
            { x: 148, y: 126, scale: 1.05, speed: 9 },
            { x: 328, y: 204, scale: 0.72, speed: 6 },
            { x: 64, y: 274, scale: 0.85, speed: 11 },
            { x: 432, y: 74, scale: 0.65, speed: 7 }
        ],
        replayLog: [] as Array<{ x: number; y: number; rot: number; trick: TrickId | null; camY: number }>,
        replayIdx: 0,
        replayHoldT: 0,
        replaySplashDone: false,
        finishedSubmitted: false,
        exited: false
    });

    const swimFigure = useMemo(() => toLidoSwimwear(myFigure, swimColor, myGender), [ myFigure, swimColor, myGender ]);

    useEffect(() =>
    {
        if (!isLidoRoom) return;
        let alive = true;

        const renderSprites = () =>
        {
            if (!alive) return;
            const stdRaw = renderShockwaveSmallDataUrl(swimFigure, { direction: 4, headDirection: 4, posture: 'std' });
            const wlk0Raw = renderShockwaveSmallDataUrl(swimFigure, { direction: 4, headDirection: 4, posture: 'wlk', frame: 1 });
            const wlk1Raw = renderShockwaveSmallDataUrl(swimFigure, { direction: 4, headDirection: 4, posture: 'wlk', frame: 3 });
            const frontRaw = renderShockwaveSmallDataUrl(swimFigure, { direction: 3, headDirection: 3, posture: 'std' });
            const armsUpRaw = renderShockwaveSmallDataUrl(swimFigure, { direction: 3, headDirection: 3, posture: 'std', arms: 'wobble1' });
            const armsOutRaw = renderShockwaveSmallDataUrl(swimFigure, { direction: 2, headDirection: 2, posture: 'wlk', arms: 'wobble0', frame: 1 });
            const punchRaw = renderShockwaveSmallDataUrl(swimFigure, { direction: 2, headDirection: 2, posture: 'std', arms: 'push' });
            const tuckRaw = renderShockwaveSmallDataUrl(swimFigure, { direction: 4, headDirection: 4, posture: 'sit', arms: 'push' });
            const diveRaw = renderShockwaveSmallDataUrl(swimFigure, { direction: 4, headDirection: 4, posture: 'lay' });
            const headRaw = renderShockwaveSmallDataUrl(swimFigure, { direction: 3, headDirection: 3, headOnly: true });

            if (frontRaw) setPreviewUrl(frontRaw);
            if (stdRaw) trimTransparentImage(stdRaw, (_u, img) => { if (alive) spritesRef.current.std = img; });
            if (wlk0Raw) trimTransparentImage(wlk0Raw, (_u, img) => { if (alive) spritesRef.current.wlk0 = img; });
            if (wlk1Raw) trimTransparentImage(wlk1Raw, (_u, img) => { if (alive) spritesRef.current.wlk1 = img; });
            if (frontRaw) trimTransparentImage(frontRaw, (_u, img) => { if (alive) spritesRef.current.front = img; });
            if (armsUpRaw) trimTransparentImage(armsUpRaw, (_u, img) => { if (alive) spritesRef.current.armsUp = img; });
            if (armsOutRaw) trimTransparentImage(armsOutRaw, (_u, img) => { if (alive) spritesRef.current.armsOut = img; });
            if (punchRaw) trimTransparentImage(punchRaw, (_u, img) => { if (alive) spritesRef.current.punch = img; });
            if (tuckRaw) trimTransparentImage(tuckRaw, (_u, img) => { if (alive) spritesRef.current.tuck = img; });
            if (diveRaw) trimTransparentImage(diveRaw, (_u, img) => { if (alive) spritesRef.current.dive = img; });
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
            if (data.swimColor) setSwimColor(normalizeSwimColor(data.swimColor));
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
            setShowVoteMenu(false);
            return;
        }

        fetchStatus();
        const interval = window.setInterval(fetchStatus, 2500);
        return () => window.clearInterval(interval);
    }, [ isLidoRoom, fetchStatus ]);

    const flashBanner = useCallback((msg: string) =>
    {
        setStatusBanner(msg);
        window.setTimeout(() => setStatusBanner(prev => (prev === msg ? '' : prev)), 3800);
    }, []);

    const flashKeycap = useCallback((k: string) =>
    {
        setPressedKey(k);
        window.clearTimeout(keyFlashTimerRef.current);
        keyFlashTimerRef.current = window.setTimeout(() => setPressedKey(''), 170);
    }, []);

    const closeStageAndExitPool = useCallback((scoreNotice?: number | null) =>
    {
        setStageOpen(false);
        setPhase('idle');
        elevatorCooldownRef.current = Date.now() + 3000;
        SendMessageComposer(new RoomUnitWalkComposer(POOL_EXIT_TILE.x, POOL_EXIT_TILE.y));
        if (typeof scoreNotice === 'number' && !isNaN(scoreNotice))
        {
            flashBanner(`Salto completado: ${ scoreNotice.toFixed(1) } / 10`);
        }
    }, [ flashBanner ]);

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
        const norm = normalizeSwimColor(colorId);
        setSwimColor(norm);
        fetch('/api/lido/swim-color', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ swimColor: norm })
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

            // Blur chat input immediately so diving keys never type into chat!
            if (document.activeElement instanceof HTMLElement)
            {
                document.activeElement.blur();
            }

            setTickets(Number(data.tickets || 0));
            if (data.dive) setActiveDive(data.dive);
            setShowDispenser(false);
            setShowLeaderboard(false);
            setShowVoteMenu(false);
            setResultAvg(null);
            setResultCrowdVotes([]);

            const sim = simRef.current;
            sim.phase = 'elevator';
            sim.phaseT = 0;
            sim.camY = 140;
            sim.boardT = 0;
            sim.sprintSpeed = 0.22;
            sim.boardBend = 0;
            sim.airX = BOARD_END_X;
            sim.airY = BOARD_END_Y;
            sim.vx = 0;
            sim.vy = 0;
            sim.rotDeg = 0;
            sim.spinVel = 0;
            sim.trick = null;
            sim.trickTimer = 0;
            sim.tricks = [];
            sim.jumpQuality = 'good';
            sim.entryType = 'clean_dive';
            sim.splashPlume = null;
            sim.splashRings = [];
            sim.splashDrops = [];
            sim.replayLog = [];
            sim.replayIdx = 0;
            sim.replayHoldT = 0;
            sim.replaySplashDone = false;
            sim.finishedSubmitted = false;
            sim.exited = false;

            setPhase('elevator');
            setStageOpen(true);
        }
        catch
        {
            flashBanner('No se pudo conectar con el ascensor del trampolín.');
        }
    }, [ stageOpen, swimColor, flashBanner ]);

    // Room 101 arrowplate roller queue auto-advance into elevator tile (11, 4)
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

    const triggerRunKey = useCallback((runKey: 'A' | 'D') =>
    {
        flashKeycap(`RUN_${ runKey }`);
        const sim = simRef.current;
        if (sim.phase !== 'sprint') return;
        const altBonus = lastRunKeyRef.current !== runKey ? 0.24 : 0.13;
        lastRunKeyRef.current = runKey;
        sim.sprintSpeed = Math.min(1.35, sim.sprintSpeed + altBonus);
    }, [ flashKeycap ]);

    const triggerBoardJump = useCallback(() =>
    {
        flashKeycap('SPACE');
        const sim = simRef.current;
        if (sim.phase !== 'sprint') return;

        const bt = sim.boardT;
        let q: 'perfect' | 'good' | 'drop' = 'drop';
        if (bt >= 0.72 && bt <= 0.98) q = 'perfect';
        else if (bt >= 0.45 && bt < 0.72) q = 'good';
        else q = 'drop';

        sim.jumpQuality = q;
        sim.phase = 'airborne';
        sim.phaseT = 0;
        sim.boardBend = q === 'perfect' ? 14 : (q === 'good' ? 9 : 4);
        sim.airX = BOARD_START_X + (BOARD_END_X - BOARD_START_X) * bt;
        sim.airY = BOARD_START_Y + (BOARD_END_Y - BOARD_START_Y) * bt - 4;

        if (q === 'perfect')
        {
            sim.vx = -62;
            sim.vy = -255;
            sim.gravity = 235;
        }
        else if (q === 'good')
        {
            sim.vx = -54;
            sim.vy = -180;
            sim.gravity = 250;
        }
        else
        {
            sim.vx = -42;
            sim.vy = -70;
            sim.gravity = 290;
        }

        setPhase('airborne');

        fetch('/api/lido/dive/trick', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ phase: 'airborne' })
        }).catch(() => {});
    }, [ flashKeycap ]);

    const triggerTrick = useCallback((trickId: TrickId, keyLabel: string) =>
    {
        flashKeycap(`MOVE_${ keyLabel }`);
        const sim = simRef.current;
        if (sim.phase !== 'airborne') return;

        sim.trick = trickId;
        sim.trickTimer = 0.55;
        if (sim.tricks.length < 24) sim.tricks.push(trickId);

        if (trickId === 'front_flip') sim.spinVel = -540;
        else if (trickId === 'flip_dive') sim.spinVel = 520;
        else if (trickId === 'cannonball') sim.spinVel = -420;
        else if (trickId === 'air_guitar') sim.spinVel = 95;
        else sim.spinVel = 0;

        fetch('/api/lido/dive/trick', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ phase: 'airborne', trick: trickId })
        }).catch(() => {});
    }, [ flashKeycap ]);

    // CAPTURE-PHASE keyboard interception while diving so keys NEVER focus or type into ChatInputView!
    useEffect(() =>
    {
        if (!stageOpen) return;

        const DIVING_KEYS = new Set([ 'a', 'd', 'w', 'e', 's', 'z', 'x', ' ', 'arrowleft', 'arrowright', 'arrowup', 'enter' ]);

        const onKeyDownCapture = (e: KeyboardEvent) =>
        {
            const k = e.key.toLowerCase();
            if (!DIVING_KEYS.has(k)) return;

            // Block ChatInputView from focusing or capturing these keys!
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement)
            {
                document.activeElement.blur();
            }

            const sim = simRef.current;
            if (sim.phase === 'sprint')
            {
                if (k === 'a' || k === 'arrowleft') triggerRunKey('A');
                else if (k === 'd' || k === 'arrowright') triggerRunKey('D');
                else if (k === ' ' || k === 'enter' || k === 'arrowup') triggerBoardJump();
                return;
            }

            if (sim.phase === 'airborne')
            {
                if (k === 'w') triggerTrick('star', 'W');
                else if (k === 'e') triggerTrick('air_guitar', 'E');
                else if (k === 'a') triggerTrick('flex', 'A');
                else if (k === 's') triggerTrick('cannonball', 'S');
                else if (k === 'd') triggerTrick('air_punch', 'D');
                else if (k === 'z') triggerTrick('front_flip', 'Z');
                else if (k === 'x') triggerTrick('flip_dive', 'X');
            }
        };

        const onKeyPressCapture = (e: KeyboardEvent) =>
        {
            const k = e.key.toLowerCase();
            if (!DIVING_KEYS.has(k)) return;
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
        };

        window.addEventListener('keydown', onKeyDownCapture, true);
        window.addEventListener('keypress', onKeyPressCapture, true);
        return () =>
        {
            window.removeEventListener('keydown', onKeyDownCapture, true);
            window.removeEventListener('keypress', onKeyPressCapture, true);
        };
    }, [ stageOpen, triggerRunKey, triggerBoardJump, triggerTrick ]);

    const resultAvgRef = useRef<number | null>(null);
    useEffect(() => { resultAvgRef.current = resultAvg; }, [ resultAvg ]);

    // Hide floating room/bot chat bubbles ONLY while the full-screen diving camera is active
    useEffect(() =>
    {
        document.body.classList.toggle('lido-diving-active', stageOpen);
        return () => { document.body.classList.remove('lido-diving-active'); };
    }, [ stageOpen ]);

    // Main 60FPS authentic isometric Habbo Lido Diving camera renderer with AUTO-REPLAY -> AUTO-EXIT!
    useEffect(() =>
    {
        if (!stageOpen) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (!worldCanvasRef.current)
        {
            worldCanvasRef.current = buildIsometricLidoWorld();
        }
        const worldCanvas = worldCanvasRef.current;

        let raf = 0;
        let lastTs = performance.now();

        const spawnWaterSplash = (sx: number, sy: number, intensity: number) =>
        {
            const sim = simRef.current;
            sim.splashPlume = { x: sx, y: sy, t: 0, duration: 0.92, scale: intensity };

            // Fine arcing teardrop water spray & foam mist (NO black square cubes!)
            const count = Math.round(34 * intensity);
            for (let i = 0; i < count; i++)
            {
                const spread = (Math.random() - 0.5) * Math.PI * 0.78;
                const angle = -Math.PI / 2 + spread;
                const spd = (95 + Math.random() * 195) * (0.78 + intensity * 0.28);
                const maxLife = 0.45 + Math.random() * 0.48;
                sim.splashDrops.push({
                    x: sx + (Math.random() - 0.5) * 16 * intensity,
                    y: sy - Math.random() * 6,
                    vx: Math.cos(angle) * spd,
                    vy: Math.sin(angle) * spd,
                    r: 1.4 + Math.random() * 2.4,
                    life: maxLife,
                    maxLife,
                    color: i % 3 === 0 ? '#ffffff' : (i % 3 === 1 ? '#d4faff' : '#7ae3f5')
                });
            }

            // Layered isometric water wave & white foam rings
            sim.splashRings.push({ x: sx, y: sy + 2, rx: 8, maxRx: 52 * intensity, life: 0.95, maxLife: 0.95, width: 2.5, color: '#ffffff' });
            sim.splashRings.push({ x: sx, y: sy + 2, rx: 4, maxRx: 72 * intensity, life: 1.25, maxLife: 1.25, width: 2.0, color: '#c4f8ff' });
            sim.splashRings.push({ x: sx, y: sy + 2, rx: 1, maxRx: 90 * intensity, life: 1.5, maxLife: 1.5, width: 1.4, color: '#7de0f2' });
        };

        const drawWaterSplashPlume = (plume: { x: number; y: number; t: number; duration: number; scale: number }) =>
        {
            const p = Math.min(1, plume.t / plume.duration);
            if (p >= 1) return;

            // Smooth rise-and-settle curve (fast vertical burst, gentle foam settle)
            const rise = p < 0.26 ? Math.sin((p / 0.26) * (Math.PI / 2)) : Math.cos(((p - 0.26) / 0.74) * (Math.PI / 2));
            const alpha = p < 0.65 ? 0.95 : Math.max(0, 0.95 * (1 - (p - 0.65) / 0.35));
            const s = plume.scale;
            const h = (54 * s) * rise;
            const w = (24 + p * 26) * s;
            const cx = Math.round(plume.x);
            const cy = Math.round(plume.y + 3);

            ctx.save();
            ctx.globalAlpha = alpha;

            // 1. Base frothy water foam cushion on the pool surface
            ctx.fillStyle = '#d9fbff';
            ctx.beginPath();
            ctx.ellipse(cx, cy, w * 0.92, w * 0.36, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(cx, cy - 1, w * 0.66, w * 0.24, 0, 0, Math.PI * 2);
            ctx.fill();

            // 2. Curved outer translucent aqua water crown wings
            if (h > 4)
            {
                ctx.fillStyle = 'rgba(130, 232, 248, 0.88)';
                ctx.beginPath();
                ctx.moveTo(cx - w * 0.72, cy);
                ctx.quadraticCurveTo(cx - w * 0.85, cy - h * 0.72, cx - w * 0.45, cy - h * 0.82);
                ctx.quadraticCurveTo(cx - w * 0.28, cy - h * 0.45, cx - w * 0.16, cy - h);
                ctx.quadraticCurveTo(cx, cy - h * 1.18, cx + w * 0.16, cy - h);
                ctx.quadraticCurveTo(cx + w * 0.28, cy - h * 0.45, cx + w * 0.45, cy - h * 0.82);
                ctx.quadraticCurveTo(cx + w * 0.85, cy - h * 0.72, cx + w * 0.72, cy);
                ctx.closePath();
                ctx.fill();

                // 3. Inner bright white frothy water plume & scalloped foam crests
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.moveTo(cx - w * 0.48, cy);
                ctx.quadraticCurveTo(cx - w * 0.56, cy - h * 0.55, cx - w * 0.28, cy - h * 0.66);
                ctx.quadraticCurveTo(cx - w * 0.14, cy - h * 0.35, cx, cy - h * 0.94);
                ctx.quadraticCurveTo(cx + w * 0.14, cy - h * 0.35, cx + w * 0.28, cy - h * 0.66);
                ctx.quadraticCurveTo(cx + w * 0.56, cy - h * 0.55, cx + w * 0.48, cy);
                ctx.closePath();
                ctx.fill();

                // Soft foam puffs crowning the jets
                const puffs = [
                    [ cx - w * 0.44, cy - h * 0.78, 5.5 * s * rise ],
                    [ cx, cy - h * 0.98, 7.0 * s * rise ],
                    [ cx + w * 0.44, cy - h * 0.78, 5.5 * s * rise ],
                    [ cx - w * 0.22, cy - h * 0.58, 4.8 * s * rise ],
                    [ cx + w * 0.22, cy - h * 0.58, 4.8 * s * rise ]
                ];
                for (const [ px, py, pr ] of puffs)
                {
                    if (pr <= 0.5) continue;
                    ctx.beginPath();
                    ctx.arc(px, py, pr, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            ctx.restore();
        };

        const drawDiverPose = (ax: number, ay: number, rotDeg: number, trick: TrickId | null, mode: 'std' | 'wlk' | 'head', wlkStep = 0) =>
        {
            const sprites = spritesRef.current;
            let sp = sprites.std;
            if (mode === 'head') sp = sprites.head || sprites.std;
            else if (mode === 'wlk') sp = wlkStep % 2 === 0 ? (sprites.wlk0 || sprites.std) : (sprites.wlk1 || sprites.std);
            else if (trick === 'star' || trick === 'flex') sp = sprites.armsUp || sprites.front || sprites.std;
            else if (trick === 'air_guitar') sp = sprites.armsOut || sprites.front || sprites.std;
            else if (trick === 'air_punch') sp = sprites.punch || sprites.front || sprites.std;
            else if (trick === 'cannonball' || trick === 'front_flip') sp = sprites.tuck || sprites.std;
            else if (trick === 'flip_dive') sp = sprites.dive || sprites.std;

            ctx.save();
            ctx.translate(Math.round(ax), Math.round(ay));
            if (rotDeg) ctx.rotate((rotDeg * Math.PI) / 180);

            // Pure authentic Habbo avatar sprites (ZERO fake rectangles/lines drawn on top!)
            const scale = 1.05;
            if (sp && sp.naturalWidth > 0)
            {
                const dw = Math.round(sp.naturalWidth * scale);
                const dh = Math.round(sp.naturalHeight * scale);
                ctx.drawImage(sp, Math.round(-dw / 2), -dh, dw, dh);
            }
            else
            {
                ctx.fillStyle = '#ffcc99';
                ctx.fillRect(-7, -28, 14, 28);
            }
            ctx.restore();
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
                if (c.x < -60) c.x = VIEW_W + 60;
            }

            if (Math.abs(sim.boardBend) > 0.1) sim.boardBend *= Math.pow(0.04, dt);
            else sim.boardBend = 0;

            if (sim.phase === 'elevator')
            {
                const p = Math.min(1, sim.phaseT / 0.8);
                sim.camY = Math.round(140 * (1 - p));
                if (p >= 1)
                {
                    sim.phase = 'sprint';
                    sim.phaseT = 0;
                    sim.camY = 0;
                    sim.boardT = 0.02;
                    sim.sprintSpeed = 0.24;
                    setPhase('sprint');
                }
            }
            else if (sim.phase === 'sprint')
            {
                sim.camY = 0;
                sim.boardT += sim.sprintSpeed * dt * 0.52;
                sim.sprintSpeed = Math.max(0.2, sim.sprintSpeed - dt * 0.14);

                if (sim.boardT >= 0.72)
                {
                    sim.boardBend = Math.sin(now / 55) * 2.5 + 2.5;
                }

                if (sim.boardT >= 1.0)
                {
                    sim.boardT = 1.0;
                    sim.jumpQuality = 'drop';
                    sim.phase = 'airborne';
                    sim.phaseT = 0;
                    sim.airX = BOARD_END_X;
                    sim.airY = BOARD_END_Y;
                    sim.vx = -36;
                    sim.vy = -40;
                    sim.gravity = 300;
                    setPhase('airborne');
                }
            }
            else if (sim.phase === 'airborne')
            {
                sim.airX = Math.max(155, sim.airX + sim.vx * dt);
                sim.vy += sim.gravity * dt;
                sim.airY += sim.vy * dt;
                sim.rotDeg += sim.spinVel * dt;
                if (sim.trickTimer > 0) sim.trickTimer = Math.max(0, sim.trickTimer - dt);

                const targetCam = Math.max(0, Math.min(WORLD_H - VIEW_H, sim.airY - 220));
                sim.camY += (targetCam - sim.camY) * Math.min(1, dt * 6.5);

                if (sim.replayLog.length < 360)
                {
                    sim.replayLog.push({ x: sim.airX, y: sim.airY, rot: sim.rotDeg, trick: sim.trick, camY: sim.camY });
                }

                if (sim.airY >= POOL_WATER_Y)
                {
                    sim.airY = POOL_WATER_Y;
                    const lastTrick = sim.tricks[sim.tricks.length - 1] || null;
                    let entry: 'clean_dive' | 'cannonball' | 'belly_flop' = 'clean_dive';
                    if (lastTrick === 'cannonball') entry = 'cannonball';
                    else if (lastTrick === 'star') entry = 'belly_flop';
                    else if (lastTrick === 'flip_dive' || lastTrick === 'front_flip' || sim.tricks.length >= 2) entry = 'clean_dive';
                    else if (sim.jumpQuality === 'drop') entry = 'belly_flop';

                    sim.entryType = entry;
                    sim.phase = 'splash';
                    sim.phaseT = 0;
                    sim.swimX = sim.airX;
                    sim.swimY = POOL_WATER_Y;

                    spawnWaterSplash(sim.airX, POOL_WATER_Y, entry === 'cannonball' ? 1.5 : (entry === 'belly_flop' ? 1.25 : 0.92));
                    setPhase('splash');

                    if (!sim.finishedSubmitted)
                    {
                        sim.finishedSubmitted = true;
                        submitDiveResult(sim.jumpQuality, sim.tricks, sim.entryType);
                    }
                }
            }
            else if (sim.phase === 'splash')
            {
                const targetCam = WORLD_H - VIEW_H;
                sim.camY += (targetCam - sim.camY) * Math.min(1, dt * 5);
                sim.swimX += (224 - sim.swimX) * Math.min(1, dt * 1.4);
                sim.swimY += (842 - sim.swimY) * Math.min(1, dt * 1.2);

                // Immediately cut to authentic Habbo Replay ('R') after the splash!
                if (sim.phaseT >= 1.15)
                {
                    sim.phase = 'replay';
                    sim.phaseT = 0;
                    sim.replayIdx = 0;
                    sim.replayHoldT = 0;
                    sim.replaySplashDone = false;
                    sim.splashPlume = null;
                    sim.splashDrops = [];
                    sim.splashRings = [];
                    setPhase('replay');
                }
            }
            else if (sim.phase === 'replay')
            {
                if (sim.replayLog.length > 0 && sim.replayIdx < sim.replayLog.length)
                {
                    // Play instant replay smoothly
                    sim.replayIdx += dt * 44;
                }
                else
                {
                    if (!sim.replaySplashDone)
                    {
                        sim.replaySplashDone = true;
                        const lastF = sim.replayLog[sim.replayLog.length - 1];
                        spawnWaterSplash(lastF ? lastF.x : sim.airX, POOL_WATER_Y, sim.entryType === 'cannonball' ? 1.45 : 0.98);
                    }
                    sim.camY = WORLD_H - VIEW_H;
                    sim.replayHoldT += dt;
                    // Automatically exit back into Room 101 right after the replay finishes!
                    if (sim.replayHoldT >= 1.45 && !sim.exited)
                    {
                        sim.exited = true;
                        closeStageAndExitPool(resultAvgRef.current);
                        return;
                    }
                }
            }

            if (sim.splashPlume)
            {
                sim.splashPlume.t += dt;
                if (sim.splashPlume.t >= sim.splashPlume.duration) sim.splashPlume = null;
            }

            for (const d of sim.splashDrops)
            {
                d.x += d.vx * dt;
                d.vy += 420 * dt;
                d.y += d.vy * dt;
                d.life -= dt;
            }
            sim.splashDrops = sim.splashDrops.filter(d => d.life > 0 && d.y <= POOL_WATER_Y + 14);

            for (const r of sim.splashRings)
            {
                const progress = 1 - r.life / r.maxLife;
                r.rx = 6 + (r.maxRx - 6) * (1 - Math.pow(1 - progress, 2));
                r.life -= dt;
            }
            sim.splashRings = sim.splashRings.filter(r => r.life > 0);

            // ── RENDER FRAME ──
            ctx.imageSmoothingEnabled = false;
            const activeReplayFrame = (sim.phase === 'replay' && sim.replayLog.length > 0 && sim.replayIdx < sim.replayLog.length)
                ? sim.replayLog[Math.floor(sim.replayIdx)]
                : null;
            const renderCamY = Math.round(activeReplayFrame ? activeReplayFrame.camY : sim.camY);

            ctx.drawImage(worldCanvas, 0, renderCamY, VIEW_W, VIEW_H, 0, 0, VIEW_W, VIEW_H);

            ctx.save();
            ctx.translate(0, -renderCamY);

            for (const c of sim.clouds)
            {
                drawIsometricCloud(ctx, c.x, c.y, c.scale);
            }

            drawIsometricSpringboard(ctx, sim.boardBend);

            if (activeReplayFrame)
            {
                drawDiverPose(activeReplayFrame.x, activeReplayFrame.y, activeReplayFrame.rot, activeReplayFrame.trick, 'std');
            }
            else if (sim.phase === 'elevator')
            {
                const p = Math.min(1, sim.phaseT / 0.8);
                const ex = DOOR_X + (BOARD_START_X - DOOR_X) * p;
                const ey = DOOR_Y + (BOARD_START_Y - DOOR_Y) * p;
                drawDiverPose(ex, ey, 0, null, 'wlk', Math.floor(now / 130));
            }
            else if (sim.phase === 'sprint')
            {
                const px = BOARD_START_X + (BOARD_END_X - BOARD_START_X) * sim.boardT;
                const py = BOARD_START_Y + (BOARD_END_Y - BOARD_START_Y) * sim.boardT + sim.boardBend * sim.boardT;
                drawDiverPose(px, py, 0, null, 'wlk', Math.floor(now / 95));
            }
            else if (sim.phase === 'airborne')
            {
                drawDiverPose(sim.airX, sim.airY, sim.rotDeg, sim.trick, 'std');
            }
            else if (sim.phase === 'splash' || (sim.phase === 'replay' && sim.replaySplashDone))
            {
                const bob = Math.sin(now / 180) * 1.5;
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.ellipse(Math.round(sim.swimX), Math.round(sim.swimY + 2), 14, 7, 0, 0, Math.PI * 2);
                ctx.stroke();
                drawDiverPose(sim.swimX, sim.swimY + 4 + bob, 0, null, 'head');
            }

            // Layered isometric water wave & foam rings
            for (const r of sim.splashRings)
            {
                ctx.save();
                ctx.globalAlpha = Math.max(0, Math.min(0.92, (r.life / r.maxLife) * 1.15));
                ctx.strokeStyle = r.color;
                ctx.lineWidth = r.width;
                ctx.beginPath();
                ctx.ellipse(Math.round(r.x), Math.round(r.y), Math.round(r.rx), Math.round(r.rx * 0.46), 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            // Billowing organic Habbo water splash plume/crown
            if (sim.splashPlume)
            {
                drawWaterSplashPlume(sim.splashPlume);
            }

            // Natural velocity-aligned teardrop water spray droplets (zero cubes!)
            for (const d of sim.splashDrops)
            {
                const a = Math.max(0, Math.min(0.95, (d.life / d.maxLife) * 1.25));
                const ang = Math.atan2(d.vy, d.vx);
                const spd = Math.hypot(d.vx, d.vy);
                const stretch = Math.min(2.6, 1 + spd / 160);
                ctx.save();
                ctx.globalAlpha = a;
                ctx.translate(d.x, d.y);
                ctx.rotate(ang);
                ctx.fillStyle = d.color;
                ctx.beginPath();
                ctx.ellipse(0, 0, d.r * stretch, d.r * 0.78, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            ctx.globalAlpha = 1;

            ctx.restore();
            raf = window.requestAnimationFrame(tick);
        };

        raf = window.requestAnimationFrame(tick);
        return () => window.cancelAnimationFrame(raf);
    }, [ stageOpen, submitDiveResult, closeStageAndExitPool ]);

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
                setShowVoteMenu(false);
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

    const showLiveMonitor = !stageOpen && !!activeDive && activeDive.username !== myUsername;
    const canVoteOnActive = !!(activeDive && myVotedDiveId !== activeDive.id);

    return (
        <div className="lido-room-widget-root">
            {/* Compact Era-Specific In-Room Lido Strip */}
            { !stageOpen && (
                <div className="lido-hud-bar">
                    <div className="lido-hud-title">
                        <PixelIconBoard />
                        <span>Lido II</span>
                    </div>
                    <div className="lido-hud-divider" />
                    <button type="button" className="lido-hud-tickets" title="Vestuario y tickets del Lido" onClick={ () => { setShowLeaderboard(false); setShowDispenser(v => !v); } }>
                        <PixelIconTicket />
                        <span>{ tickets }</span>
                    </button>
                    <button type="button" className="lido-btn lido-btn-neutral" onClick={ () => { setShowLeaderboard(false); setShowVoteMenu(false); setShowDispenser(v => !v); } }>
                        Cabina / Tickets
                    </button>
                    <button type="button" className="lido-btn lido-btn-green" onClick={ joinQueueInRoom }>
                        { queueActive ? 'En cola...' : 'Trampolín' }
                    </button>
                    { activeDive && canVoteOnActive && (
                        <button type="button" className="lido-btn lido-btn-vote" onClick={ () => { setShowDispenser(false); setShowLeaderboard(false); setShowVoteMenu(v => !v); } }>
                            <span>Votar salto</span>
                            <span className="lido-vote-caret">{ showVoteMenu ? '▲' : '▼' }</span>
                        </button>
                    ) }
                    <button type="button" className="lido-btn lido-btn-neutral" onClick={ () => { setShowDispenser(false); setShowVoteMenu(false); setShowLeaderboard(v => !v); } }>
                        <PixelIconTrophy />
                        <span>Top</span>
                    </button>
                </div>
            ) }

            { statusBanner && !stageOpen && !showDispenser && (
                <div className="lido-toast">{ statusBanner }</div>
            ) }

            {/* Ticket Dispenser & Swimwear Changing Cabin */}
            { showDispenser && !stageOpen && (
                <div className="lido-window lido-dispenser-panel">
                    <div className="lido-window-header">
                        <div className="lido-header-dots" />
                        <span className="lido-window-title">Cabina y Tickets del Lido</span>
                        <div className="lido-header-dots" />
                        <button type="button" className="lido-close-x" onClick={ () => setShowDispenser(false) } aria-label="Cerrar">X</button>
                    </div>
                    <div className="lido-window-body">
                        { statusBanner && (
                            <div className="lido-inline-alert">{ statusBanner }</div>
                        ) }

                        <div className="lido-cabin-top">
                            <div className="lido-cabin-avatar-box">
                                { previewUrl ? (
                                    <img src={ previewUrl } alt="Tu avatar en bañador" className="lido-cabin-avatar-img" />
                                ) : null }
                            </div>
                            <div className="lido-cabin-info">
                                <div className="lido-swim-label">Color de tu bañador:</div>
                                <div className="lido-swim-swatches">
                                    { SWIM_COLORS.map(c => (
                                        <span
                                            key={ c.id }
                                            role="button"
                                            tabIndex={ 0 }
                                            title={ c.label }
                                            className={ `lido-swatch ${ swimColor === c.id ? 'is-active' : '' }` }
                                            style={{ background: c.hex, backgroundColor: c.hex }}
                                            onClick={ () => handleSwimColorChange(c.id) }
                                            onKeyDown={ e => { if (e.key === 'Enter' || e.key === ' ') handleSwimColorChange(c.id); } }
                                        />
                                    )) }
                                </div>
                            </div>
                        </div>

                        <div className="lido-inset-box">
                            <div className="lido-ticket-row">
                                <PixelIconTicket />
                                <div>
                                    <div className="lido-ticket-title">5 Tickets de Trampolín</div>
                                    <div className="lido-ticket-sub">Precio oficial: 2 Créditos</div>
                                </div>
                            </div>
                            <button type="button" className="lido-btn lido-btn-green" disabled={ busyBuy } onClick={ handleBuyTickets }>
                                { busyBuy ? '...' : 'Comprar (2c)' }
                            </button>
                        </div>

                        <div className="lido-meta-row">
                            <span>Tickets: <b>{ tickets }</b></span>
                            <span>Créditos: <b>{ credits.toLocaleString() }</b></span>
                        </div>
                    </div>
                </div>
            ) }

            {/* Compact Top Divers Leaderboard */}
            { showLeaderboard && !stageOpen && (
                <div className="lido-window lido-lb-panel">
                    <div className="lido-window-header">
                        <div className="lido-header-dots" />
                        <span className="lido-window-title">Top Saltos del Lido</span>
                        <div className="lido-header-dots" />
                        <button type="button" className="lido-close-x" onClick={ () => setShowLeaderboard(false) } aria-label="Cerrar">X</button>
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
                                        <span className="lido-lb-dives">{ row.total_dives }</span>
                                        <span className="lido-lb-score">{ Number(row.best_score).toFixed(1) }</span>
                                    </div>
                                )) }
                            </div>
                        ) }
                    </div>
                </div>
            ) }

            {/* Compact Top-Right Jumbotron Mini-TV (when another user dives) */}
            { showLiveMonitor && activeDive && (
                <div className="lido-mini-jumbotron">
                    <div className="lido-mini-jumbo-bar">
                        <span>JUMBOTRON</span>
                        <span className="lido-mini-jumbo-user">{ activeDive.username }</span>
                    </div>
                    <div className="lido-mini-jumbo-screen">
                        { activeDive.phase === 'scoring' ? (
                            <span className="lido-mini-jumbo-score">
                                { activeDive.avgScore !== null ? `${ Number(activeDive.avgScore).toFixed(1) } / 10` : '...' }
                            </span>
                        ) : (
                            <span className="lido-mini-jumbo-trick">
                                { activeDive.activeTrick ? activeDive.activeTrick.replace('_', ' ').toUpperCase() : 'EN EL TRAMPOLÍN' }
                            </span>
                        ) }
                    </div>
                </div>
            ) }

            {/* Vote Scorecard Popover anchored cleanly under top-center Lido bar (never collides with Infostand!) */}
            { !stageOpen && activeDive && canVoteOnActive && showVoteMenu && (
                <div className="lido-window lido-vote-popover">
                    <div className="lido-window-header">
                        <div className="lido-header-dots" />
                        <span className="lido-window-title">Votar: { activeDive.username }</span>
                        <div className="lido-header-dots" />
                        <button type="button" className="lido-close-x" onClick={ () => setShowVoteMenu(false) } aria-label="Cerrar">X</button>
                    </div>
                    <div className="lido-window-body">
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
                    </div>
                </div>
            ) }

            {/* AUTHENTIC FULL-VIEWPORT ISOMETRIC LIDO DIVING CAMERA
                Sits BEHIND toolbars/camera/inventory (z-index: 5) and AUTO-REPLAYS -> AUTO-EXITS! */}
            { stageOpen && (
                <div className="lido-fullscreen-camera">
                    <canvas ref={ canvasRef } width={ VIEW_W } height={ VIEW_H } className="lido-fullscreen-canvas" />

                    {/* Classic big outlined 'R' Replay indicator in top-left during automatic replay */}
                    { phase === 'replay' && (
                        <>
                            <div className="lido-replay-badge">R</div>
                            { resultAvg !== null && (
                                <div className="lido-replay-score-pill">
                                    <span className="lido-replay-score-val">{ resultAvg.toFixed(1) } / 10</span>
                                    <div className="lido-replay-judges">
                                        { resultCrowdVotes.map((v, i) => (
                                            <span key={ i } className="lido-judge-card">{ v }</span>
                                        )) }
                                    </div>
                                </div>
                            ) }
                        </>
                    ) }

                    {/* AUTHENTIC FLOATING HABBO GREY 3D KEYCAP CONTROLS OVER THE SKY (TOP-LEFT) */}
                    { phase !== 'replay' && (
                        <div className="lido-sky-keys">
                            <div className={ `lido-key-group ${ phase === 'sprint' ? 'is-focused' : '' }` }>
                                <div className="lido-key-heading">RUN:</div>
                                <div className="lido-key-row">
                                    <button
                                        type="button"
                                        className={ `lido-keycap ${ pressedKey === 'RUN_A' ? 'is-down' : '' }` }
                                        onPointerDown={ () => triggerRunKey('A') }
                                    >A</button>
                                    <button
                                        type="button"
                                        className={ `lido-keycap ${ pressedKey === 'RUN_D' ? 'is-down' : '' }` }
                                        onPointerDown={ () => triggerRunKey('D') }
                                    >D</button>
                                </div>
                            </div>

                            <div className={ `lido-key-group ${ phase === 'sprint' ? 'is-focused' : '' }` }>
                                <div className="lido-key-heading">JUMP:</div>
                                <div className="lido-key-row">
                                    <button
                                        type="button"
                                        className={ `lido-keycap lido-keycap-space ${ pressedKey === 'SPACE' ? 'is-down' : '' }` }
                                        onPointerDown={ triggerBoardJump }
                                    >SPACEBAR</button>
                                </div>
                            </div>

                            <div className={ `lido-key-group ${ phase === 'airborne' ? 'is-focused' : '' }` }>
                                <div className="lido-key-heading">DIVING MOVES:</div>
                                <div className="lido-key-row">
                                    <button type="button" className={ `lido-keycap ${ pressedKey === 'MOVE_W' ? 'is-down' : '' }` } onPointerDown={ () => triggerTrick('star', 'W') }>W</button>
                                    <button type="button" className={ `lido-keycap ${ pressedKey === 'MOVE_E' ? 'is-down' : '' }` } onPointerDown={ () => triggerTrick('air_guitar', 'E') }>E</button>
                                </div>
                                <div className="lido-key-row">
                                    <button type="button" className={ `lido-keycap ${ pressedKey === 'MOVE_A' ? 'is-down' : '' }` } onPointerDown={ () => triggerTrick('flex', 'A') }>A</button>
                                    <button type="button" className={ `lido-keycap ${ pressedKey === 'MOVE_S' ? 'is-down' : '' }` } onPointerDown={ () => triggerTrick('cannonball', 'S') }>S</button>
                                    <button type="button" className={ `lido-keycap ${ pressedKey === 'MOVE_D' ? 'is-down' : '' }` } onPointerDown={ () => triggerTrick('air_punch', 'D') }>D</button>
                                </div>
                                <div className="lido-key-row">
                                    <button type="button" className={ `lido-keycap ${ pressedKey === 'MOVE_Z' ? 'is-down' : '' }` } onPointerDown={ () => triggerTrick('front_flip', 'Z') }>Z</button>
                                    <button type="button" className={ `lido-keycap ${ pressedKey === 'MOVE_X' ? 'is-down' : '' }` } onPointerDown={ () => triggerTrick('flip_dive', 'X') }>X</button>
                                </div>
                            </div>
                        </div>
                    ) }
                </div>
            ) }
        </div>
    );
};
