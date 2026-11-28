import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { FaCheck, FaEraser, FaPlus, FaTimes, FaUndo } from 'react-icons/fa';
import toolFloorPlanIcon from '@/assets/images/roleplay/tool-floor-plan.png';
import toolRoomBuilderIcon from '@/assets/images/roleplay/tool-room-builder.png';
import toolRoomDimmerIcon from '@/assets/images/roleplay/tool-room-dimmer.png';
import toolRoomSettingsIcon from '@/assets/images/roleplay/tool-room-settings.png';
import toolWallDecorIcon from '@/assets/images/roleplay/tool-wall-decor.png';
import toolWallsFloorsIcon from '@/assets/images/roleplay/tool-walls-floors.png';
import toolWindowBgIcon from '@/assets/images/roleplay/tool-window-bg.png';
import { CreateLinkEvent, GetNitroInstance, GetRoomEngine, GetRoomSession, GetSessionDataManager } from '../../api';

export type BuilderToolTab = null | 'settings' | 'lighting' | 'window' | 'walls' | 'decor' | 'floorplan';
type WallsSubTab = 'walls' | 'floors' | 'molding' | 'roof';

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
    windowBg: 'Habbten · Cielo por defecto',
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

const WINDOW_BACKGROUNDS = [
    'Habbten · Cielo por defecto',
    'Noche estrellada',
    'Atardecer urbano',
    'Tormenta neón',
    'Amanecer costero',
    'Bosque brumoso'
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
    'Ladrillo urbano',
    'Estuco clásico',
    'Panel de madera',
    'Concreto moderno',
    'Azulejo'
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

    const roomId = GetRoomSession()?.roomId || GetRoomEngine()?.activeRoomId || 0;
    const [ cfg, setCfg ] = useState<RoomStyleConfig>(() => loadRoomStyle(roomId, currentRoomName));

    useEffect(() =>
    {
        setCfg(loadRoomStyle(roomId, currentRoomName));
    }, [ roomId, currentRoomName ]);

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
        if(tab === 'floorplan')
        {
            setActiveTab(prev => (prev === 'floorplan' ? null : 'floorplan'));
            CreateLinkEvent('floor-editor/toggle');
            return;
        }
        setActiveTab(prev => (prev === tab ? null : tab));
    };

    const tools: Array<{ id: Exclude<BuilderToolTab, null>; label: string; icon: string }> = [
        { id: 'settings', label: 'Ajustes de sala', icon: toolRoomSettingsIcon },
        { id: 'lighting', label: 'Iluminación', icon: toolRoomDimmerIcon },
        { id: 'window', label: 'Fondo de ventana', icon: toolWindowBgIcon },
        { id: 'walls', label: 'Paredes y suelos', icon: toolWallsFloorsIcon },
        { id: 'decor', label: 'Decoración de pared', icon: toolWallDecorIcon },
        { id: 'floorplan', label: 'Plano de suelo', icon: toolFloorPlanIcon }
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

                        {/* 3. FONDO DE VENTANA */}
                        { activeTab === 'window' && (
                            <div className="rp-builder-content">
                                <label className="rp-b-field-label">Fondo de ventana</label>
                                <select
                                    className="rp-b-white-select"
                                    value={ cfg.windowBg }
                                    onChange={ e => updateCfg({ windowBg: e.target.value }) }>
                                    { WINDOW_BACKGROUNDS.map(bg => (
                                        <option key={ bg } value={ bg }>{ bg }</option>
                                    )) }
                                </select>
                                <div className="rp-b-note">El fondo se aplica a todas las ventanas de esta sala.</div>
                            </div>
                        ) }

                        {/* 4. PAREDES Y SUELOS (4 SUB-PESTAÑAS EXACTAS A LAS CAPTURAS) */}
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

                        {/* 6. EDITOR DE PLANO */}
                        { activeTab === 'floorplan' && (
                            <div className="rp-builder-content is-floorbar">
                                <div className="rp-b-floor-tools">
                                    <button type="button" className="rp-b-floor-btn" title="Añadir baldosa" onClick={ () => CreateLinkEvent('floor-editor/show') }>
                                        <FaPlus style={ { color: '#16a34a' } } />
                                    </button>
                                    <button type="button" className="rp-b-floor-btn" title="Borrar baldosa" onClick={ () => CreateLinkEvent('floor-editor/show') }>
                                        <FaEraser style={ { color: '#dc2626' } } />
                                    </button>
                                    <button type="button" className="rp-b-floor-btn is-gray" title="Deshacer" onClick={ () => CreateLinkEvent('floor-editor/show') }>
                                        <FaUndo />
                                    </button>
                                    <button type="button" className="rp-b-floor-btn is-red" title="Cancelar" onClick={ () => { CreateLinkEvent('floor-editor/hide'); setActiveTab(null); } }>
                                        <FaTimes />
                                    </button>
                                    <button type="button" className="rp-b-floor-btn is-green" title="Aplicar plano" onClick={ () => { CreateLinkEvent('floor-editor/toggle'); setActiveTab(null); } }>
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
                { isExpanded && !activeTab && (
                    <div className="rp-builder-tooltip">
                        { hoveredLabel || 'Herramientas de sala' }
                    </div>
                ) }
            </div>
        </div>
    );
};
