import { FloorHeightMapEvent, GetOccupiedTilesMessageComposer, GetRoomEntryTileMessageComposer, RoomEntryTileMessageEvent, RoomOccupiedTilesMessageEvent, RoomVariableEnum, RoomVisualizationSettingsEvent, UpdateFloorPropertiesMessageComposer, Vector3d } from '@nitrots/nitro-renderer';
import { FC, MouseEvent as ReactMouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaCheck, FaTimes, FaUndo } from 'react-icons/fa';
import toolFloorPlanIcon from '@/assets/images/roleplay/tool-floor-plan.png';
import toolRoomBuilderIcon from '@/assets/images/roleplay/tool-room-builder.png';
import toolRoomDimmerIcon from '@/assets/images/roleplay/tool-room-dimmer.png';
import toolRoomSettingsIcon from '@/assets/images/roleplay/tool-room-settings.png';
import toolWallDecorIcon from '@/assets/images/roleplay/tool-wall-decor.png';
import toolWallsFloorsIcon from '@/assets/images/roleplay/tool-walls-floors.png';
import toolWindowBgIcon from '@/assets/images/roleplay/tool-window-bg.png';
import { GetNitroInstance, GetRoomEngine, GetRoomSession, GetSessionDataManager, SendMessageComposer } from '../../api';
import { useMessageEvent } from '../../hooks';
import { convertNumbersForSaving, convertSettingToNumber } from '../floorplan-editor/common/Utils';

export type BuilderToolTab = null | 'settings' | 'lighting' | 'window' | 'walls' | 'decor' | 'floorplan';
type WallsSubTab = 'walls' | 'floors' | 'molding' | 'roof';
type FloorToolMode = 'add' | 'remove';

interface RoomStyleConfig
{
    roomName: string;
    roomBlocking: boolean;
    lightColor: string;
    lightIntensity: number;
    lightBrightness: number;
    windowBg: string;
    separateWalls: boolean;
    hideWalls: boolean;
    cornerAcross: number;
    cornerDepth: number;
    hideLeftWall: boolean;
    hideRightWall: boolean;
    leftLength: number;
    rightLength: number;
    leftSideWall: boolean;
    rightSideWall: boolean;
    wallFinish: string;
    wallShape: string;
    wallColor: string;
    wallEdgeColor: string;
    wallThickness: number;
    wallHeight: number;
    floorFinish: string;
    floorPrimary: string;
    floorSecondary: string;
    floorThickness: number;
    floorPatternSize: number;
    floorDirection: string;
    floorPlankWidth: number;
    moldingBaseboard: boolean;
    moldingWainscoting: boolean;
    moldingCrown: boolean;
    moldingChairRail: boolean;
    moldingFloorBorder: boolean;
    roofLeftWall: boolean;
    roofRightWall: boolean;
    roofAutoFill: boolean;
    wallDecorName: string;
    wallDecorSize: number;
}

const DEFAULT_ROOM_STYLE: RoomStyleConfig = {
    roomName: '',
    roomBlocking: false,
    lightColor: '#ffc47d',
    lightIntensity: 0,
    lightBrightness: 100,
    windowBg: 'Habbo · Default sky',
    separateWalls: false,
    hideWalls: false,
    cornerAcross: 0,
    cornerDepth: 0,
    hideLeftWall: false,
    hideRightWall: false,
    leftLength: 6,
    rightLength: 6,
    leftSideWall: false,
    rightSideWall: false,
    wallFinish: 'Color sólido',
    wallShape: 'Plano',
    wallColor: '#d2ceca',
    wallEdgeColor: '#93908d',
    wallThickness: 4,
    wallHeight: 100,
    floorFinish: 'Suelo de madera',
    floorPrimary: '#c6aa93',
    floorSecondary: '#cdb19a',
    floorThickness: 13,
    floorPatternSize: 100,
    floorDirection: '0 grados',
    floorPlankWidth: 100,
    moldingBaseboard: false,
    moldingWainscoting: false,
    moldingCrown: false,
    moldingChairRail: false,
    moldingFloorBorder: false,
    roofLeftWall: false,
    roofRightWall: false,
    roofAutoFill: false,
    wallDecorName: 'Logo Slice & Co.',
    wallDecorSize: 5
};

const WINDOW_BG_GROUPS: Array<{ group: string; options: string[] }> = [
    { group: 'Habbo · Default sky', options: [ 'Habbo · Default sky' ] },
    { group: 'Habbo · Cityscape', options: [ 1, 2, 3, 4, 5, 6, 7 ].map(n => `Habbo · Cityscape ${ n }`) },
    { group: 'Habbo · Coast', options: [ 1, 2, 3, 4, 5, 6, 7 ].map(n => `Habbo · Coast ${ n }`) },
    { group: 'Habbo · Mountain Top', options: [ 1, 2, 3, 4, 5, 6, 7 ].map(n => `Habbo · Mountain Top ${ n }`) },
    { group: 'Habbo · Forest', options: [ 1, 2, 3, 4, 5, 6, 7 ].map(n => `Habbo · Forest ${ n }`) },
    { group: 'Habbo · White Clouds', options: [ 1, 2, 3, 4, 5, 6, 7 ].map(n => `Habbo · White Clouds ${ n }`) },
    { group: 'Habbo · Dark Clouds', options: [ 1, 2, 3, 4, 5, 6, 7 ].map(n => `Habbo · Dark Clouds ${ n }`) },
    { group: 'Habbo · Alhambra', options: [ 1, 2, 3, 4, 5, 6, 7 ].map(n => `Habbo · Alhambra ${ n }`) },
    { group: 'Habbo · Moon Hills', options: [ 1, 2, 3, 4, 5, 6, 7 ].map(n => `Habbo · Moon Hills ${ n }`) },
    { group: 'Habbo · Arabian', options: [ 1, 2, 3, 4, 5, 6, 7 ].map(n => `Habbo · Arabian ${ n }`) },
    { group: 'Habbo · Under Water', options: [ 1, 2, 3, 4, 5, 6, 7 ].map(n => `Habbo · Under Water ${ n }`) },
    { group: 'Habbo · Audience', options: [ 1, 2, 3, 4, 5, 6, 7 ].map(n => `Habbo · Audience ${ n }`) },
    { group: 'Habbo · Classic', options: [ 1, 2, 3, 4, 5, 6, 7 ].map(n => `Habbo · Classic ${ n }`) }
];

const FLOOR_FINISHES = [
    'Color sólido',
    'Suelo de madera',
    'Tablones rústicos',
    'Tatami',
    'Baldosas bicolor',
    'Alfombra',
    'Mármol',
    'Senderos de jardín'
];

const WALL_FINISHES = [
    'Color sólido',
    'Ladrillo',
    'Piedra rústica',
    'Cabaña de madera',
    'Azulejos',
    'Papel tapiz a rayas',
    'Paneles de pared'
];

const WALL_DECORS = [
    'Logo Slice & Co.',
    'Logo Habbten RP',
    'Cartel Comisaría HPD',
    'Neón Ciudad Nocturna',
    'Espejo Urbano'
];

function loadRoomStyle(roomId: number, fallbackName: string): RoomStyleConfig
{
    try
    {
        const raw = localStorage.getItem(`habbten_rp_room_style_${ roomId }`);
        if(raw)
        {
            return { ...DEFAULT_ROOM_STYLE, roomName: fallbackName, ...JSON.parse(raw) };
        }
    }
    catch (_) {}
    return { ...DEFAULT_ROOM_STYLE, roomName: fallbackName };
}

function saveRoomStyle(roomId: number, cfg: RoomStyleConfig): void
{
    try
    {
        localStorage.setItem(`habbten_rp_room_style_${ roomId }`, JSON.stringify(cfg));
    }
    catch (_) {}
}

function parseTilemapToMap(tilemapStr: string): Map<string, string>
{
    const map = new Map<string, string>();
    if(!tilemapStr) return map;
    const rows = tilemapStr.replace(/\n/g, '').split('\r').filter(r => r.length > 0);
    for(let y = 0; y < rows.length; y++)
    {
        const row = rows[y];
        for(let x = 0; x < row.length; x++)
        {
            const ch = row.charAt(x).toLowerCase();
            if(ch && ch !== 'x') map.set(`${ x },${ y }`, ch);
        }
    }
    return map;
}

function getRoomScreenProjection(roomId: number)
{
    const engine = GetRoomEngine();
    const canvas = engine?.getRoomInstanceRenderingCanvas(roomId, 1);
    const geometry = canvas?.geometry;
    if(!canvas || !geometry) return null;

    const scale = canvas.scale || 1;
    const halfW = Math.round(canvas.width / 2) + canvas.screenOffsetX;
    const halfH = Math.round(canvas.height / 2) + canvas.screenOffsetY;

    const toScreen = (tx: number, ty: number, tz: number = 0): [ number, number ] | null =>
    {
        const pt = geometry.getScreenPoint(new Vector3d(tx, ty, tz));
        if(!pt) return null;
        return [
            (pt.x * scale) + halfW,
            (pt.y * scale) + halfH
        ];
    };

    const origin = toScreen(0, 0, 0);
    const px = toScreen(1, 0, 0);
    const py = toScreen(0, 1, 0);
    if(!origin || !px || !py) return null;

    const vxX = px[0] - origin[0];
    const vxY = px[1] - origin[1];
    const vyX = py[0] - origin[0];
    const vyY = py[1] - origin[1];
    const det = (vxX * vyY) - (vxY * vyX);
    if(Math.abs(det) < 1e-5) return null;

    const screenToTile = (sx: number, sy: number): [ number, number ] =>
    {
        const dx = sx - origin[0];
        const dy = sy - origin[1];
        const u = ((dx * vyY) - (dy * vyX)) / det;
        const v = ((vxX * dy) - (vxY * dx)) / det;
        return [ Math.floor(u + 0.5), Math.floor(v + 0.5) ];
    };

    return { canvas, scale, toScreen, screenToTile };
}

interface RoleplayRoomBuilderPanelProps
{
    isMobile: boolean;
    currentRoomName: string;
    onToast: (type: 'ok' | 'err' | 'warn', text: string) => void;
}

export const RoleplayRoomBuilderPanel: FC<RoleplayRoomBuilderPanelProps> = ({ isMobile, currentRoomName, onToast }) =>
{
    const [ barHovered, setBarHovered ] = useState<boolean>(false);
    const [ activeTab, setActiveTab ] = useState<BuilderToolTab>(null);
    const [ hoveredLabel, setHoveredLabel ] = useState<string>('');
    const [ wallsSubTab, setWallsSubTab ] = useState<WallsSubTab>('walls');
    const [ selectedRightUid, setSelectedRightUid ] = useState<string>('');
    const [ grantedRights, setGrantedRights ] = useState<Array<{ id: number; name: string }>>([]);
    const [ decorPlaced, setDecorPlaced ] = useState<boolean>(false);

    // Estado del Editor de plano en sala (estilo HabboRP)
    const [ floorTool, setFloorTool ] = useState<FloorToolMode>('add');
    const [ baseTilemapStr, setBaseTilemapStr ] = useState<string>(() => (window as any)?.__habbtenFloorplanCache?.tilemap || '');
    const [ floorWallHeight, setFloorWallHeight ] = useState<number>(() => (window as any)?.__habbtenFloorplanCache?.wallHeight ?? -1);
    const [ floorThickWall, setFloorThickWall ] = useState<number>(() => (window as any)?.__habbtenFloorplanCache?.thicknessWall ?? 1);
    const [ floorThickFloor, setFloorThickFloor ] = useState<number>(() => (window as any)?.__habbtenFloorplanCache?.thicknessFloor ?? 1);
    const [ doorPos, setDoorPos ] = useState<{ x: number; y: number; dir: number }>({ x: 0, y: 0, dir: 2 });
    const [ occupiedSet, setOccupiedSet ] = useState<Set<string>>(() => new Set());
    const [ undoDepth, setUndoDepth ] = useState<number>(0);

    const floorCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const baseTilesRef = useRef<Map<string, string>>(new Map());
    const draftTilesRef = useRef<Map<string, string>>(new Map());
    const historyRef = useRef<Array<Map<string, string>>>([]);
    const hoverTileRef = useRef<[ number, number ] | null>(null);
    const paintingRef = useRef<boolean>(false);
    const strokePushedRef = useRef<boolean>(false);
    const panningRef = useRef<{ active: boolean; lastX: number; lastY: number }>({ active: false, lastX: 0, lastY: 0 });
    const floorToolRef = useRef<FloorToolMode>('add');
    floorToolRef.current = floorTool;

    const roomId = GetRoomSession()?.roomId || GetRoomEngine()?.activeRoomId || 0;
    const [ cfg, setCfg ] = useState<RoomStyleConfig>(() => loadRoomStyle(roomId, currentRoomName));

    useEffect(() =>
    {
        setCfg(loadRoomStyle(roomId, currentRoomName));
        if(activeTab === 'floorplan') setActiveTab(null);
    }, [ roomId, currentRoomName ]);

    // Escuchar paquetes del plano de la sala en tiempo real
    useMessageEvent<FloorHeightMapEvent>(FloorHeightMapEvent, event =>
    {
        const parser = event.getParser();
        setBaseTilemapStr(parser.model);
        setFloorWallHeight(parser.wallHeight + 1);
    });

    useMessageEvent<RoomVisualizationSettingsEvent>(RoomVisualizationSettingsEvent, event =>
    {
        const parser = event.getParser();
        setFloorThickFloor(convertSettingToNumber(parser.thicknessFloor));
        setFloorThickWall(convertSettingToNumber(parser.thicknessWall));
    });

    useMessageEvent<RoomEntryTileMessageEvent>(RoomEntryTileMessageEvent, event =>
    {
        const parser = event.getParser();
        setDoorPos({ x: parser.x, y: parser.y, dir: parser.direction });
    });

    useMessageEvent<RoomOccupiedTilesMessageEvent>(RoomOccupiedTilesMessageEvent, event =>
    {
        const parser = event.getParser();
        const next = new Set<string>();
        const blocked = parser.blockedTilesMap;
        if(Array.isArray(blocked))
        {
            for(let y = 0; y < blocked.length; y++)
            {
                const row = blocked[y];
                if(!Array.isArray(row)) continue;
                for(let x = 0; x < row.length; x++)
                {
                    if(row[x]) next.add(`${ x },${ y }`);
                }
            }
        }
        setOccupiedSet(next);
    });

    // Inicializar borrador cuando se activa Editor de plano
    const initFloorplanDraft = useCallback(() =>
    {
        const cached = (window as any)?.__habbtenFloorplanCache || {};
        const modelStr = baseTilemapStr || cached.tilemap || '';
        const parsed = parseTilemapToMap(modelStr);

        if(parsed.size === 0 && roomId > 0)
        {
            const engine = GetRoomEngine();
            const minX = Math.max(0, Math.floor(engine?.getRoomInstanceVariable<number>(roomId, RoomVariableEnum.ROOM_MIN_X) || 0));
            const maxX = Math.min(40, Math.ceil(engine?.getRoomInstanceVariable<number>(roomId, RoomVariableEnum.ROOM_MAX_X) || 6));
            const minY = Math.max(0, Math.floor(engine?.getRoomInstanceVariable<number>(roomId, RoomVariableEnum.ROOM_MIN_Y) || 0));
            const maxY = Math.min(40, Math.ceil(engine?.getRoomInstanceVariable<number>(roomId, RoomVariableEnum.ROOM_MAX_Y) || 6));
            for(let y = minY; y <= maxY; y++)
            {
                for(let x = minX; x <= maxX; x++)
                {
                    parsed.set(`${ x },${ y }`, '0');
                }
            }
        }

        if(cached.wallHeight !== undefined && floorWallHeight === -1) setFloorWallHeight(cached.wallHeight);
        if(cached.thicknessFloor !== undefined) setFloorThickFloor(cached.thicknessFloor);
        if(cached.thicknessWall !== undefined) setFloorThickWall(cached.thicknessWall);

        baseTilesRef.current = new Map(parsed);
        draftTilesRef.current = new Map(parsed);
        historyRef.current = [];
        setUndoDepth(0);

        try
        {
            SendMessageComposer(new GetRoomEntryTileMessageComposer());
            SendMessageComposer(new GetOccupiedTilesMessageComposer());
        }
        catch (_) {}
    }, [ baseTilemapStr, floorWallHeight, roomId ]);

    // Render loop del grid isométrico en sala mientras activeTab === 'floorplan'
    useEffect(() =>
    {
        if(activeTab !== 'floorplan') return;
        initFloorplanDraft();

        const onKeyDown = (e: KeyboardEvent) =>
        {
            if(e.key === 'Escape') setActiveTab(null);
        };
        window.addEventListener('keydown', onKeyDown);

        let rafId = 0;
        const drawFrame = () =>
        {
            const canvasEl = floorCanvasRef.current;
            const activeRoomId = GetRoomSession()?.roomId || GetRoomEngine()?.activeRoomId || 0;
            if(canvasEl && activeRoomId > 0)
            {
                const dpr = Math.min(2, window.devicePixelRatio || 1);
                const w = window.innerWidth;
                const h = window.innerHeight;
                if(canvasEl.width !== Math.floor(w * dpr) || canvasEl.height !== Math.floor(h * dpr))
                {
                    canvasEl.width = Math.floor(w * dpr);
                    canvasEl.height = Math.floor(h * dpr);
                }

                const ctx = canvasEl.getContext('2d');
                if(ctx)
                {
                    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                    ctx.clearRect(0, 0, w, h);

                    const proj = getRoomScreenProjection(activeRoomId);
                    if(proj)
                    {
                        const { toScreen, screenToTile } = proj;

                        // Determinar rango visible de tiles en pantalla
                        const corners = [
                            screenToTile(0, 0),
                            screenToTile(w, 0),
                            screenToTile(0, h),
                            screenToTile(w, h)
                        ];
                        let minX = Math.min(...corners.map(c => c[0])) - 2;
                        let maxX = Math.max(...corners.map(c => c[0])) + 2;
                        let minY = Math.min(...corners.map(c => c[1])) - 2;
                        let maxY = Math.max(...corners.map(c => c[1])) + 2;

                        // Limitar al máximo razonable de plano Habbo para mantener 60fps fluidos
                        minX = Math.max(-16, minX);
                        maxX = Math.min(64, maxX);
                        minY = Math.max(-16, minY);
                        maxY = Math.min(64, maxY);

                        // 1. Cuadrícula isométrica sutil sobre toda la vista (idéntica a captura HabboRP)
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.085)';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        for(let x = minX; x <= maxX + 1; x++)
                        {
                            const p1 = toScreen(x - 0.5, minY - 0.5, 0);
                            const p2 = toScreen(x - 0.5, maxY + 0.5, 0);
                            if(p1 && p2)
                            {
                                ctx.moveTo(p1[0], p1[1]);
                                ctx.lineTo(p2[0], p2[1]);
                            }
                        }
                        for(let y = minY; y <= maxY + 1; y++)
                        {
                            const p1 = toScreen(minX - 0.5, y - 0.5, 0);
                            const p2 = toScreen(maxX + 0.5, y - 0.5, 0);
                            if(p1 && p2)
                            {
                                ctx.moveTo(p1[0], p1[1]);
                                ctx.lineTo(p2[0], p2[1]);
                            }
                        }
                        ctx.stroke();

                        const drawDiamond = (tx: number, ty: number, fill: string, stroke: string, lineWidth: number = 1.5, withX: boolean = false) =>
                        {
                            const pTop = toScreen(tx - 0.5, ty - 0.5, 0);
                            const pRight = toScreen(tx + 0.5, ty - 0.5, 0);
                            const pBot = toScreen(tx + 0.5, ty + 0.5, 0);
                            const pLeft = toScreen(tx - 0.5, ty + 0.5, 0);
                            if(!pTop || !pRight || !pBot || !pLeft) return;

                            ctx.beginPath();
                            ctx.moveTo(pTop[0], pTop[1]);
                            ctx.lineTo(pRight[0], pRight[1]);
                            ctx.lineTo(pBot[0], pBot[1]);
                            ctx.lineTo(pLeft[0], pLeft[1]);
                            ctx.closePath();

                            if(fill)
                            {
                                ctx.fillStyle = fill;
                                ctx.fill();
                            }
                            if(stroke)
                            {
                                ctx.strokeStyle = stroke;
                                ctx.lineWidth = lineWidth;
                                ctx.stroke();
                            }
                            if(withX)
                            {
                                ctx.beginPath();
                                ctx.moveTo(pTop[0] + (pBot[0] - pTop[0]) * 0.25, pTop[1] + (pBot[1] - pTop[1]) * 0.25);
                                ctx.lineTo(pTop[0] + (pBot[0] - pTop[0]) * 0.75, pTop[1] + (pBot[1] - pTop[1]) * 0.75);
                                ctx.moveTo(pLeft[0] + (pRight[0] - pLeft[0]) * 0.25, pLeft[1] + (pRight[1] - pLeft[1]) * 0.25);
                                ctx.lineTo(pLeft[0] + (pRight[0] - pLeft[0]) * 0.75, pLeft[1] + (pRight[1] - pLeft[1]) * 0.75);
                                ctx.strokeStyle = 'rgba(254, 202, 202, 0.9)';
                                ctx.lineWidth = 1.5;
                                ctx.stroke();
                            }
                        };

                        // 2. Baldosas añadidas (azul/verde) y eliminadas (rojo) en borrador
                        const base = baseTilesRef.current;
                        const draft = draftTilesRef.current;

                        draft.forEach((_, key) =>
                        {
                            if(!base.has(key))
                            {
                                const [ tx, ty ] = key.split(',').map(Number);
                                drawDiamond(tx, ty, 'rgba(34, 197, 94, 0.34)', 'rgba(134, 239, 172, 0.92)', 1.5);
                            }
                        });

                        base.forEach((_, key) =>
                        {
                            if(!draft.has(key))
                            {
                                const [ tx, ty ] = key.split(',').map(Number);
                                drawDiamond(tx, ty, 'rgba(220, 38, 38, 0.42)', 'rgba(248, 113, 113, 0.95)', 1.5, true);
                            }
                        });

                        // 3. Baldosa bajo el cursor (rombo azul exacto a la captura de HabboRP en modo añadir, rojo en modo borrar)
                        const hov = hoverTileRef.current;
                        if(hov)
                        {
                            const isAdd = floorToolRef.current === 'add';
                            drawDiamond(
                                hov[0],
                                hov[1],
                                isAdd ? 'rgba(96, 165, 250, 0.42)' : 'rgba(239, 68, 68, 0.42)',
                                isAdd ? 'rgba(226, 232, 240, 0.95)' : 'rgba(254, 202, 202, 0.95)',
                                1.6
                            );
                        }
                    }
                }
            }
            rafId = requestAnimationFrame(drawFrame);
        };

        rafId = requestAnimationFrame(drawFrame);
        return () =>
        {
            cancelAnimationFrame(rafId);
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [ activeTab, initFloorplanDraft ]);

    const applyTileEdit = useCallback((tx: number, ty: number) =>
    {
        if(tx < 0 || ty < 0 || tx >= 64 || ty >= 64) return;
        const key = `${ tx },${ ty }`;
        const draft = draftTilesRef.current;

        if(floorToolRef.current === 'add')
        {
            if(draft.has(key)) return;
            if(!strokePushedRef.current)
            {
                historyRef.current.push(new Map(draft));
                strokePushedRef.current = true;
                setUndoDepth(historyRef.current.length);
            }
            draft.set(key, '0');
        }
        else
        {
            if(!draft.has(key)) return;
            if(tx === doorPos.x && ty === doorPos.y)
            {
                if(!strokePushedRef.current) onToast('warn', 'No puedes borrar la baldosa de la puerta.');
                return;
            }
            if(occupiedSet.has(key))
            {
                if(!strokePushedRef.current) onToast('warn', 'Quita primero el furni sobre esa baldosa.');
                return;
            }
            if(!strokePushedRef.current)
            {
                historyRef.current.push(new Map(draft));
                strokePushedRef.current = true;
                setUndoDepth(historyRef.current.length);
            }
            draft.delete(key);
        }
    }, [ doorPos.x, doorPos.y, occupiedSet, onToast ]);

    const handleFloorPointerDown = (e: ReactMouseEvent<HTMLCanvasElement>) =>
    {
        if(e.button === 2 || e.button === 1)
        {
            panningRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };
            return;
        }
        if(e.button !== 0) return;
        const activeRoomId = GetRoomSession()?.roomId || GetRoomEngine()?.activeRoomId || 0;
        const proj = getRoomScreenProjection(activeRoomId);
        if(!proj) return;

        paintingRef.current = true;
        strokePushedRef.current = false;
        const [ tx, ty ] = proj.screenToTile(e.clientX, e.clientY);
        hoverTileRef.current = [ tx, ty ];
        applyTileEdit(tx, ty);
    };

    const handleFloorPointerMove = (e: ReactMouseEvent<HTMLCanvasElement>) =>
    {
        const activeRoomId = GetRoomSession()?.roomId || GetRoomEngine()?.activeRoomId || 0;
        if(panningRef.current.active)
        {
            const canvas = GetRoomEngine()?.getRoomInstanceRenderingCanvas(activeRoomId, 1);
            if(canvas)
            {
                canvas.screenOffsetX += (e.clientX - panningRef.current.lastX);
                canvas.screenOffsetY += (e.clientY - panningRef.current.lastY);
                GetNitroInstance()?.application?.render();
            }
            panningRef.current.lastX = e.clientX;
            panningRef.current.lastY = e.clientY;
            return;
        }

        const proj = getRoomScreenProjection(activeRoomId);
        if(!proj) return;
        const [ tx, ty ] = proj.screenToTile(e.clientX, e.clientY);
        hoverTileRef.current = [ tx, ty ];
        if(paintingRef.current) applyTileEdit(tx, ty);
    };

    const handleFloorPointerUp = () =>
    {
        paintingRef.current = false;
        strokePushedRef.current = false;
        panningRef.current.active = false;
    };

    const handleFloorUndo = () =>
    {
        if(historyRef.current.length === 0) return;
        const prev = historyRef.current.pop();
        if(prev) draftTilesRef.current = prev;
        setUndoDepth(historyRef.current.length);
    };

    const handleFloorCancel = () =>
    {
        draftTilesRef.current = new Map(baseTilesRef.current);
        historyRef.current = [];
        setUndoDepth(0);
        setActiveTab(null);
    };

    const handleFloorSave = () =>
    {
        const draft = draftTilesRef.current;
        if(draft.size === 0)
        {
            onToast('err', 'La sala debe tener al menos una baldosa.');
            return;
        }

        let maxX = 0;
        let maxY = 0;
        draft.forEach((_, key) =>
        {
            const [ x, y ] = key.split(',').map(Number);
            if(x > maxX) maxX = x;
            if(y > maxY) maxY = y;
        });

        const width = Math.min(64, maxX + 1);
        const height = Math.min(64, maxY + 1);
        const rows: string[] = [];
        for(let y = 0; y < height; y++)
        {
            let row = '';
            for(let x = 0; x < width; x++)
            {
                row += draft.get(`${ x },${ y }`) || 'x';
            }
            rows.push(row);
        }

        let doorX = doorPos.x;
        let doorY = doorPos.y;
        if(!draft.has(`${ doorX },${ doorY }`))
        {
            const firstKey = draft.keys().next().value as string;
            const [ fx, fy ] = firstKey.split(',').map(Number);
            doorX = fx;
            doorY = fy;
        }

        const tilemapString = rows.join('\r');

        try
        {
            SendMessageComposer(new UpdateFloorPropertiesMessageComposer(
                tilemapString,
                doorX,
                doorY,
                doorPos.dir,
                convertNumbersForSaving(floorThickWall),
                convertNumbersForSaving(floorThickFloor),
                (floorWallHeight - 1)
            ));
            onToast('ok', 'Plano de suelo guardado.');
            setActiveTab(null);
        }
        catch (_)
        {
            onToast('err', 'No tienes permisos para editar el plano de esta sala.');
        }
    };

    const roomUsers = useMemo(() =>
    {
        try
        {
            const session = GetRoomSession();
            const ownId = GetSessionDataManager()?.userId;
            const list: Array<{ id: number; name: string }> = [];
            const mgr: any = session?.userDataManager;
            const map = mgr?._usersByIndex || mgr?._userDataByIndex;
            if(map && typeof map.forEach === 'function')
            {
                map.forEach((u: any) =>
                {
                    if(u && u.type === 1 && u.webID && u.webID !== ownId)
                    {
                        list.push({ id: u.webID, name: u.name || `Usuario #${ u.webID }` });
                    }
                });
            }
            return list;
        }
        catch (_)
        {
            return [];
        }
    }, [ activeTab, roomId ]);

    const applyVisualLive = useCallback((next: RoomStyleConfig) =>
    {
        const activeRoomId = GetRoomSession()?.roomId || GetRoomEngine()?.activeRoomId || -1;
        if(activeRoomId <= 0) return;

        try
        {
            const engine = GetRoomEngine();
            if(engine)
            {
                engine.updateRoomInstancePlaneVisibility(activeRoomId, !next.hideWalls, true);
                const wThick = next.wallThickness <= 2 ? -2 : next.wallThickness <= 4 ? -1 : next.wallThickness <= 8 ? 0 : 1;
                const fThick = next.floorThickness <= 6 ? -2 : next.floorThickness <= 10 ? -1 : next.floorThickness <= 16 ? 0 : 1;
                engine.updateRoomInstancePlaneThickness(activeRoomId, wThick, fThick);
                GetNitroInstance()?.application?.render();
            }
        }
        catch (_) {}
    }, []);

    const updateCfg = (patch: Partial<RoomStyleConfig>) =>
    {
        setCfg(prev =>
        {
            const next = { ...prev, ...patch };
            applyVisualLive(next);
            return next;
        });
    };

    const handleReset = () =>
    {
        const reset = { ...DEFAULT_ROOM_STYLE, roomName: currentRoomName };
        setCfg(reset);
        applyVisualLive(reset);
        onToast('ok', 'Configuración de sala restablecida.');
    };

    const handleSave = () =>
    {
        if(roomId > 0) saveRoomStyle(roomId, cfg);
        applyVisualLive(cfg);
        onToast('ok', 'Cambios de la sala guardados.');
        setActiveTab(null);
    };

    const handleCancel = () =>
    {
        const restored = loadRoomStyle(roomId, currentRoomName);
        setCfg(restored);
        applyVisualLive(restored);
        setActiveTab(null);
    };

    const handleGiveRights = () =>
    {
        const uid = Number(selectedRightUid);
        if(!uid) return;
        const user = roomUsers.find(u => u.id === uid);
        try
        {
            GetRoomSession()?.sendGiveRightsMessage(uid);
            if(user && !grantedRights.some(g => g.id === uid))
            {
                setGrantedRights(prev => [ ...prev, user ]);
            }
            onToast('ok', `Permisos otorgados a ${ user?.name || 'usuario' }.`);
        }
        catch (_)
        {
            onToast('err', 'Necesitas ser dueño de esta sala para dar permisos.');
        }
    };

    const openTool = (tab: BuilderToolTab) =>
    {
        setActiveTab(prev => (prev === tab ? null : tab));
    };

    const tools: Array<{ id: Exclude<BuilderToolTab, null>; label: string; icon: string }> = [
        { id: 'settings', label: 'Ajustes de sala', icon: toolRoomSettingsIcon },
        { id: 'lighting', label: 'Iluminación', icon: toolRoomDimmerIcon },
        { id: 'window', label: 'Fondo de ventana', icon: toolWindowBgIcon },
        { id: 'walls', label: 'Paredes y suelos', icon: toolWallsFloorsIcon },
        { id: 'decor', label: 'Decoración de pared', icon: toolWallDecorIcon },
        { id: 'floorplan', label: 'Editor de plano', icon: toolFloorPlanIcon }
    ];

    const ribbonTitle: Record<Exclude<BuilderToolTab, null>, string> = {
        settings: 'Ajustes Generales',
        lighting: 'Iluminación',
        window: 'Fondo de ventana',
        walls: 'Paredes y suelos',
        decor: 'Decoración de pared',
        floorplan: 'Editor de plano'
    };

    const isExpanded = barHovered || activeTab !== null;

    return (
        <>
            {/* OVERLAY ISOMÉTRICO EN SALA DEL EDITOR DE PLANO (EXACTO A HABBORP, VIA PORTAL DEBAJO DEL HUD) */}
            { activeTab === 'floorplan' && typeof document !== 'undefined' && createPortal(
                <canvas
                    ref={ floorCanvasRef }
                    className="rp-floorplan-canvas"
                    onMouseDown={ handleFloorPointerDown }
                    onMouseMove={ handleFloorPointerMove }
                    onMouseUp={ handleFloorPointerUp }
                    onMouseLeave={ () => { hoverTileRef.current = null; handleFloorPointerUp(); } }
                    onContextMenu={ e => e.preventDefault() } />,
                document.body
            ) }

            <div
                className={ `rp-builder-hover-wrap ${ isExpanded ? 'is-open' : '' }` }
                onMouseEnter={ () => !isMobile && setBarHovered(true) }
                onMouseLeave={ () => { if(!isMobile) { setBarHovered(false); setHoveredLabel(''); } } }>

                <div className={ `rp-builder-dock-card ${ isExpanded ? 'is-open' : '' } ${ activeTab ? 'has-panel' : '' }` }>
                    <div className="rp-builder-icon-row" role="menu" aria-label="Herramientas de sala">
                        { tools.map(tool => (
                            <button
                                key={ tool.id }
                                type="button"
                                className={ `rp-builder-sq-btn ${ activeTab === tool.id ? 'is-selected' : '' }` }
                                title={ tool.label }
                                onMouseEnter={ () => setHoveredLabel(tool.label) }
                                onMouseLeave={ () => setHoveredLabel('') }
                                onClick={ () => openTool(tool.id) }>
                                <img src={ tool.icon } alt={ tool.label } className="rp-builder-sprite" />
                            </button>
                        )) }
                    </div>

                    { activeTab && (
                        <div className="rp-builder-drawer">
                            <div className="rp-builder-divider-top" />
                            <div className="rp-builder-ribbon">
                                <span>{ ribbonTitle[activeTab] }</span>
                            </div>

                            {/* 1. AJUSTES GENERALES */}
                            { activeTab === 'settings' && (
                                <div className="rp-builder-content">
                                    <label className="rp-b-field-label">Nombre de sala</label>
                                    <input
                                        type="text"
                                        className="rp-b-white-input"
                                        value={ cfg.roomName }
                                        onChange={ e => updateCfg({ roomName: e.target.value }) }
                                        placeholder="Nombre de la sala" />

                                    <label className="rp-b-check-row">
                                        <span>Bloqueo de sala</span>
                                        <input
                                            type="checkbox"
                                            checked={ cfg.roomBlocking }
                                            onChange={ e => updateCfg({ roomBlocking: e.target.checked }) } />
                                    </label>

                                    <div className="rp-b-hr" />

                                    <div className="rp-b-sec-title">Permisos de sala</div>
                                    <label className="rp-b-field-label">Usuarios en esta sala</label>
                                    <select
                                        className="rp-b-select is-muted"
                                        value={ selectedRightUid }
                                        onChange={ e => setSelectedRightUid(e.target.value) }>
                                        <option value="">{ roomUsers.length === 0 ? 'No hay usuarios disponibles' : 'Selecciona un usuario...' }</option>
                                        { roomUsers.map(u => (
                                            <option key={ u.id } value={ String(u.id) }>{ u.name }</option>
                                        )) }
                                    </select>

                                    <button
                                        type="button"
                                        className="rp-b-rights-btn"
                                        disabled={ !selectedRightUid }
                                        onClick={ handleGiveRights }>
                                        Dar permisos
                                    </button>

                                    { grantedRights.length === 0 ? (
                                        <div className="rp-b-note">Ningún usuario tiene permisos todavía.</div>
                                    ) : (
                                        <div className="rp-b-rights-list">
                                            { grantedRights.map(u => (
                                                <span key={ u.id } className="rp-b-right-chip">{ u.name }</span>
                                            )) }
                                        </div>
                                    ) }
                                </div>
                            ) }

                            {/* 2. ILUMINACIÓN */}
                            { activeTab === 'lighting' && (
                                <div className="rp-builder-content">
                                    <div className="rp-b-inline-row">
                                        <span>Color de luz</span>
                                        <div className="rp-b-color-pair">
                                            <input
                                                type="color"
                                                className="rp-b-color-swatch"
                                                value={ cfg.lightColor }
                                                onChange={ e => updateCfg({ lightColor: e.target.value }) } />
                                            <input
                                                type="text"
                                                className="rp-b-hex-input"
                                                value={ cfg.lightColor }
                                                onChange={ e => updateCfg({ lightColor: e.target.value }) } />
                                        </div>
                                    </div>

                                    <div className="rp-b-slider-row">
                                        <span>Intensidad</span>
                                        <input
                                            type="range"
                                            min={ 0 }
                                            max={ 100 }
                                            value={ cfg.lightIntensity }
                                            onChange={ e => updateCfg({ lightIntensity: Number(e.target.value) }) } />
                                        <b>{ cfg.lightIntensity }</b>
                                    </div>

                                    <div className="rp-b-slider-row">
                                        <span>Brillo</span>
                                        <input
                                            type="range"
                                            min={ 10 }
                                            max={ 100 }
                                            value={ cfg.lightBrightness }
                                            onChange={ e => updateCfg({ lightBrightness: Number(e.target.value) }) } />
                                        <b>{ cfg.lightBrightness }</b>
                                    </div>
                                </div>
                            ) }

                            {/* 3. FONDO DE VENTANA (TODAS LAS CATEGORÍAS HABBO 1–7) */}
                            { activeTab === 'window' && (
                                <div className="rp-builder-content">
                                    <label className="rp-b-field-label">Fondo de ventana</label>
                                    <select
                                        className="rp-b-white-select"
                                        value={ cfg.windowBg }
                                        onChange={ e => updateCfg({ windowBg: e.target.value }) }>
                                        { WINDOW_BG_GROUPS.map(g => (
                                            <optgroup key={ g.group } label={ g.group }>
                                                { g.options.map(opt => (
                                                    <option key={ opt } value={ opt }>{ opt }</option>
                                                )) }
                                            </optgroup>
                                        )) }
                                    </select>
                                    <div className="rp-b-note">El fondo se aplica a todas las ventanas de esta sala.</div>
                                </div>
                            ) }

                            {/* 4. PAREDES Y SUELOS */}
                            { activeTab === 'walls' && (
                                <div className="rp-builder-content is-compact">
                                    <div className="rp-b-subtabs">
                                        <button type="button" className={ wallsSubTab === 'walls' ? 'is-active' : '' } onClick={ () => setWallsSubTab('walls') }>Paredes</button>
                                        <button type="button" className={ wallsSubTab === 'floors' ? 'is-active' : '' } onClick={ () => setWallsSubTab('floors') }>Suelos</button>
                                        <button type="button" className={ wallsSubTab === 'molding' ? 'is-active' : '' } onClick={ () => setWallsSubTab('molding') }>Molduras</button>
                                        <button type="button" className={ wallsSubTab === 'roof' ? 'is-active' : '' } onClick={ () => setWallsSubTab('roof') }>Techo</button>
                                    </div>

                                    <div className="rp-b-subscroll">
                                        { wallsSubTab === 'walls' && (
                                            <div className="rp-b-stack">
                                                <div className="rp-b-sec-title">Acabado de pared</div>
                                                <label className="rp-b-check-row">
                                                    <span>Paredes separadas</span>
                                                    <input type="checkbox" checked={ cfg.separateWalls } onChange={ e => updateCfg({ separateWalls: e.target.checked }) } />
                                                </label>
                                                <label className="rp-b-check-row">
                                                    <span>Ocultar paredes</span>
                                                    <input type="checkbox" checked={ cfg.hideWalls } onChange={ e => updateCfg({ hideWalls: e.target.checked }) } />
                                                </label>

                                                <div className="rp-b-field-label">Posición de esquina</div>
                                                <div className="rp-b-grid2">
                                                    <div>
                                                        <span className="rp-b-mini-lbl">Ancho</span>
                                                        <input type="number" className="rp-b-white-input is-sm" value={ cfg.cornerAcross } onChange={ e => updateCfg({ cornerAcross: Number(e.target.value) || 0 }) } />
                                                    </div>
                                                    <div>
                                                        <span className="rp-b-mini-lbl">Fondo</span>
                                                        <input type="number" className="rp-b-white-input is-sm" value={ cfg.cornerDepth } onChange={ e => updateCfg({ cornerDepth: Number(e.target.value) || 0 }) } />
                                                    </div>
                                                </div>

                                                <label className="rp-b-check-row">
                                                    <span>Ocultar pared izquierda</span>
                                                    <input type="checkbox" checked={ cfg.hideLeftWall } onChange={ e => updateCfg({ hideLeftWall: e.target.checked }) } />
                                                </label>
                                                <label className="rp-b-check-row">
                                                    <span>Ocultar pared derecha</span>
                                                    <input type="checkbox" checked={ cfg.hideRightWall } onChange={ e => updateCfg({ hideRightWall: e.target.checked }) } />
                                                </label>

                                                <div className="rp-b-slider-row">
                                                    <span>Largo izq.</span>
                                                    <input type="range" min={ 2 } max={ 24 } value={ cfg.leftLength } onChange={ e => updateCfg({ leftLength: Number(e.target.value) }) } />
                                                    <b>{ cfg.leftLength } bal.</b>
                                                </div>
                                                <div className="rp-b-slider-row">
                                                    <span>Largo der.</span>
                                                    <input type="range" min={ 2 } max={ 24 } value={ cfg.rightLength } onChange={ e => updateCfg({ rightLength: Number(e.target.value) }) } />
                                                    <b>{ cfg.rightLength } bal.</b>
                                                </div>

                                                <label className="rp-b-check-row">
                                                    <span>Pared lateral izquierda</span>
                                                    <input type="checkbox" checked={ cfg.leftSideWall } onChange={ e => updateCfg({ leftSideWall: e.target.checked }) } />
                                                </label>
                                                <label className="rp-b-check-row">
                                                    <span>Pared lateral derecha</span>
                                                    <input type="checkbox" checked={ cfg.rightSideWall } onChange={ e => updateCfg({ rightSideWall: e.target.checked }) } />
                                                </label>

                                                <div className="rp-b-inline-row">
                                                    <span>Acabado</span>
                                                    <select className="rp-b-white-select is-sm" value={ cfg.wallFinish } onChange={ e => updateCfg({ wallFinish: e.target.value }) }>
                                                        { WALL_FINISHES.map(f => <option key={ f } value={ f }>{ f }</option>) }
                                                    </select>
                                                </div>
                                                <div className="rp-b-inline-row">
                                                    <span>Forma</span>
                                                    <select className="rp-b-white-select is-sm" value={ cfg.wallShape } onChange={ e => updateCfg({ wallShape: e.target.value }) }>
                                                        <option value="Plano">Plano</option>
                                                        <option value="Biselado">Biselado</option>
                                                        <option value="Escalonado">Escalonado</option>
                                                    </select>
                                                </div>

                                                <div className="rp-b-inline-row">
                                                    <span>Color</span>
                                                    <div className="rp-b-color-pair">
                                                        <input type="color" className="rp-b-color-swatch" value={ cfg.wallColor } onChange={ e => updateCfg({ wallColor: e.target.value }) } />
                                                        <input type="text" className="rp-b-hex-input" value={ cfg.wallColor } onChange={ e => updateCfg({ wallColor: e.target.value }) } />
                                                    </div>
                                                </div>
                                                <div className="rp-b-inline-row">
                                                    <span>Color borde</span>
                                                    <div className="rp-b-color-pair">
                                                        <input type="color" className="rp-b-color-swatch" value={ cfg.wallEdgeColor } onChange={ e => updateCfg({ wallEdgeColor: e.target.value }) } />
                                                        <input type="text" className="rp-b-hex-input" value={ cfg.wallEdgeColor } onChange={ e => updateCfg({ wallEdgeColor: e.target.value }) } />
                                                    </div>
                                                </div>

                                                <div className="rp-b-slider-row">
                                                    <span>Grosor</span>
                                                    <input type="range" min={ 1 } max={ 16 } value={ cfg.wallThickness } onChange={ e => updateCfg({ wallThickness: Number(e.target.value) }) } />
                                                    <b>{ cfg.wallThickness } px</b>
                                                </div>
                                                <div className="rp-b-slider-row">
                                                    <span>Altura</span>
                                                    <input type="range" min={ 60 } max={ 200 } value={ cfg.wallHeight } onChange={ e => updateCfg({ wallHeight: Number(e.target.value) }) } />
                                                    <b>{ cfg.wallHeight } px</b>
                                                </div>
                                            </div>
                                        ) }

                                        { wallsSubTab === 'floors' && (
                                            <div className="rp-b-stack">
                                                <div className="rp-b-sec-title">Acabado de suelo</div>
                                                <div className="rp-b-inline-row">
                                                    <span>Acabado</span>
                                                    <select className="rp-b-white-select is-sm" value={ cfg.floorFinish } onChange={ e => updateCfg({ floorFinish: e.target.value }) }>
                                                        { FLOOR_FINISHES.map(f => <option key={ f } value={ f }>{ f }</option>) }
                                                    </select>
                                                </div>
                                                <div className="rp-b-inline-row">
                                                    <span>Primario</span>
                                                    <div className="rp-b-color-pair">
                                                        <input type="color" className="rp-b-color-swatch" value={ cfg.floorPrimary } onChange={ e => updateCfg({ floorPrimary: e.target.value }) } />
                                                        <input type="text" className="rp-b-hex-input" value={ cfg.floorPrimary } onChange={ e => updateCfg({ floorPrimary: e.target.value }) } />
                                                    </div>
                                                </div>
                                                <div className="rp-b-inline-row">
                                                    <span>Secundario</span>
                                                    <div className="rp-b-color-pair">
                                                        <input type="color" className="rp-b-color-swatch" value={ cfg.floorSecondary } onChange={ e => updateCfg({ floorSecondary: e.target.value }) } />
                                                        <input type="text" className="rp-b-hex-input" value={ cfg.floorSecondary } onChange={ e => updateCfg({ floorSecondary: e.target.value }) } />
                                                    </div>
                                                </div>
                                                <div className="rp-b-slider-row">
                                                    <span>Grosor</span>
                                                    <input type="range" min={ 2 } max={ 24 } value={ cfg.floorThickness } onChange={ e => updateCfg({ floorThickness: Number(e.target.value) }) } />
                                                    <b>{ cfg.floorThickness } px</b>
                                                </div>
                                                <div className="rp-b-slider-row">
                                                    <span>Patrón</span>
                                                    <input type="range" min={ 50 } max={ 200 } value={ cfg.floorPatternSize } onChange={ e => updateCfg({ floorPatternSize: Number(e.target.value) }) } />
                                                    <b>{ cfg.floorPatternSize }%</b>
                                                </div>
                                                <div className="rp-b-inline-row">
                                                    <span>Dirección</span>
                                                    <select className="rp-b-white-select is-sm" value={ cfg.floorDirection } onChange={ e => updateCfg({ floorDirection: e.target.value }) }>
                                                        <option value="0 grados">0 grados</option>
                                                        <option value="90 grados">90 grados</option>
                                                    </select>
                                                </div>
                                                <div className="rp-b-slider-row">
                                                    <span>Tablón</span>
                                                    <input type="range" min={ 50 } max={ 200 } value={ cfg.floorPlankWidth } onChange={ e => updateCfg({ floorPlankWidth: Number(e.target.value) }) } />
                                                    <b>{ cfg.floorPlankWidth }%</b>
                                                </div>
                                            </div>
                                        ) }

                                        { wallsSubTab === 'molding' && (
                                            <div className="rp-b-stack">
                                                <div className="rp-b-sec-title">Molduras de pared</div>
                                                <label className="rp-b-check-row">
                                                    <span>Zócalo</span>
                                                    <input type="checkbox" checked={ cfg.moldingBaseboard } onChange={ e => updateCfg({ moldingBaseboard: e.target.checked }) } />
                                                </label>
                                                <label className="rp-b-check-row">
                                                    <span>Arrimadero</span>
                                                    <input type="checkbox" checked={ cfg.moldingWainscoting } onChange={ e => updateCfg({ moldingWainscoting: e.target.checked }) } />
                                                </label>
                                                <label className="rp-b-check-row">
                                                    <span>Cornisa</span>
                                                    <input type="checkbox" checked={ cfg.moldingCrown } onChange={ e => updateCfg({ moldingCrown: e.target.checked }) } />
                                                </label>
                                                <label className="rp-b-check-row">
                                                    <span>Guardasillas</span>
                                                    <input type="checkbox" checked={ cfg.moldingChairRail } onChange={ e => updateCfg({ moldingChairRail: e.target.checked }) } />
                                                </label>
                                                <label className="rp-b-check-row">
                                                    <span>Borde de suelo</span>
                                                    <input type="checkbox" checked={ cfg.moldingFloorBorder } onChange={ e => updateCfg({ moldingFloorBorder: e.target.checked }) } />
                                                </label>
                                            </div>
                                        ) }

                                        { wallsSubTab === 'roof' && (
                                            <div className="rp-b-stack">
                                                <div className="rp-b-sec-title">Voladizo del techo</div>
                                                <label className="rp-b-check-row">
                                                    <span>Techo pared izquierda</span>
                                                    <input type="checkbox" checked={ cfg.roofLeftWall } onChange={ e => updateCfg({ roofLeftWall: e.target.checked }) } />
                                                </label>
                                                <label className="rp-b-check-row">
                                                    <span>Techo pared derecha</span>
                                                    <input type="checkbox" checked={ cfg.roofRightWall } onChange={ e => updateCfg({ roofRightWall: e.target.checked }) } />
                                                </label>
                                                <label className="rp-b-check-row">
                                                    <span>Auto-rellenar techo</span>
                                                    <input type="checkbox" checked={ cfg.roofAutoFill } onChange={ e => updateCfg({ roofAutoFill: e.target.checked }) } />
                                                </label>
                                                <div className="rp-b-note">El relleno del techo sigue el largo lateral de la pared.</div>
                                            </div>
                                        ) }
                                    </div>
                                </div>
                            ) }

                            {/* 5. DECORACIÓN DE PARED */}
                            { activeTab === 'decor' && (
                                <div className="rp-builder-content">
                                    <button
                                        type="button"
                                        className="rp-furni-white-btn"
                                        style={ { alignSelf: 'flex-start', flex: 'none', padding: '0 14px' } }
                                        onClick={ () => { setDecorPlaced(false); onToast('ok', 'Nueva decoración lista para colocar.'); } }>
                                        Nuevo
                                    </button>

                                    <div className="rp-b-inline-row">
                                        <span>Decoración</span>
                                        <select className="rp-b-white-select is-sm" value={ cfg.wallDecorName } onChange={ e => updateCfg({ wallDecorName: e.target.value }) }>
                                            { WALL_DECORS.map(d => <option key={ d } value={ d }>{ d }</option>) }
                                        </select>
                                    </div>

                                    <div className="rp-b-slider-row">
                                        <span>Tamaño</span>
                                        <input type="range" min={ 1 } max={ 8 } value={ cfg.wallDecorSize } onChange={ e => updateCfg({ wallDecorSize: Number(e.target.value) }) } />
                                        <b>{ cfg.wallDecorSize } bal.</b>
                                    </div>

                                    <div className="rp-b-decor-btns">
                                        <button
                                            type="button"
                                            className="rp-b-green-btn"
                                            onClick={ () => { setDecorPlaced(true); onToast('ok', `${ cfg.wallDecorName } colocada (${ cfg.wallDecorSize } baldosas).`); } }>
                                            Colocar
                                        </button>
                                        <button
                                            type="button"
                                            className="rp-b-muted-btn"
                                            disabled={ !decorPlaced }
                                            onClick={ handleSave }>
                                            Guardar
                                        </button>
                                        <button
                                            type="button"
                                            className="rp-b-gray-btn"
                                            disabled={ !decorPlaced }
                                            onClick={ () => { setDecorPlaced(false); onToast('warn', 'Decoración eliminada.'); } }>
                                            Eliminar
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        className="rp-furni-white-btn"
                                        style={ { width: '100%', flex: 'none' } }
                                        onClick={ () => setActiveTab(null) }>
                                        Listo
                                    </button>
                                </div>
                            ) }

                            {/* 6. EDITOR DE PLANO EN SALA (5 BOTONES EXACTOS A HABBORP) */}
                            { activeTab === 'floorplan' && (
                                <div className="rp-builder-content is-floorbar">
                                    <div className="rp-b-floor-tools">
                                        <button
                                            type="button"
                                            className={ `rp-b-floor-btn ${ floorTool === 'add' ? 'is-active' : '' }` }
                                            title="Añadir baldosas (clic o arrastrar en la cuadrícula)"
                                            onClick={ () => setFloorTool('add') }>
                                            <svg viewBox="0 0 22 18" width="18" height="15" aria-hidden="true">
                                                <polygon points="8,3 15,7 8,11 1,7" fill="#d6c5b3" stroke="#181a1e" strokeWidth="1.3" />
                                                <path d="M16 4v7M12.5 7.5h7" stroke="#16a34a" strokeWidth="2.4" strokeLinecap="round" />
                                            </svg>
                                        </button>
                                        <button
                                            type="button"
                                            className={ `rp-b-floor-btn ${ floorTool === 'remove' ? 'is-active' : '' }` }
                                            title="Quitar baldosas (clic o arrastrar sobre baldosas)"
                                            onClick={ () => setFloorTool('remove') }>
                                            <svg viewBox="0 0 22 18" width="18" height="15" aria-hidden="true">
                                                <polygon points="8,3 15,7 8,11 1,7" fill="#d6c5b3" stroke="#181a1e" strokeWidth="1.3" />
                                                <path d="M13.5 4.5l5.5 5.5M19 4.5l-5.5 5.5" stroke="#dc2626" strokeWidth="2.3" strokeLinecap="round" />
                                            </svg>
                                        </button>
                                        <button
                                            type="button"
                                            className="rp-b-floor-btn is-gray"
                                            title="Deshacer último trazo"
                                            disabled={ undoDepth === 0 }
                                            onClick={ handleFloorUndo }>
                                            <FaUndo />
                                        </button>
                                        <button
                                            type="button"
                                            className="rp-b-floor-btn is-red"
                                            title="Cancelar cambios"
                                            onClick={ handleFloorCancel }>
                                            <FaTimes />
                                        </button>
                                        <button
                                            type="button"
                                            className="rp-b-floor-btn is-green"
                                            title="Guardar plano en la sala"
                                            onClick={ handleFloorSave }>
                                            <FaCheck />
                                        </button>
                                    </div>
                                </div>
                            ) }

                            {/* FOOTER REUTILIZABLE (Reiniciar / Cancelar / Guardar) */}
                            { activeTab !== 'decor' && activeTab !== 'floorplan' && (
                                <div className="rp-builder-footer">
                                    <button type="button" className="rp-furni-white-btn is-foot" onClick={ handleReset }>Reiniciar</button>
                                    <div className="rp-builder-footer-right">
                                        <button type="button" className="rp-furni-white-btn is-foot" onClick={ handleCancel }>Cancelar</button>
                                        <button type="button" className="rp-b-green-btn is-foot" onClick={ handleSave }>Guardar</button>
                                    </div>
                                </div>
                            ) }
                        </div>
                    ) }
                </div>

                <div className="rp-builder-trigger-box">
                    <button
                        type="button"
                        className={ `rp-square-btn ${ isExpanded ? 'is-active' : '' }` }
                        title="Herramientas de sala"
                        onMouseEnter={ () => setHoveredLabel('Herramientas de sala') }
                        onMouseLeave={ () => setHoveredLabel('') }
                        onClick={ () => {
                            if(activeTab) setActiveTab(null);
                            else setBarHovered(v => !v);
                        } }>
                        <img src={ toolRoomBuilderIcon } alt="Herramientas de sala" className="rp-pixel-sprite" />
                    </button>

                    { hoveredLabel && !activeTab && (
                        <div className="rp-builder-tooltip" role="tooltip">{ hoveredLabel }</div>
                    ) }
                </div>
            </div>
        </>
    );
};
