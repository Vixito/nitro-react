import { AvatarExpressionEnum, RoomObjectCategory, RoomUnitChatComposer, RoomUnitChatShoutComposer, UserSettingsCameraFollowComposer } from '@nitrots/nitro-renderer';
import { FC, FormEvent, PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    FaBolt,
    FaChevronRight,
    FaCommentDots,
    FaDownload,
    FaHeart,
    FaLock,
    FaLockOpen,
    FaMinus,
    FaMoneyBillWave,
    FaPlus,
    FaSearch,
    FaTimes,
    FaTrash
} from 'react-icons/fa';
import dockInventoryIcon from '@/assets/images/roleplay/dock-inventory.png';
import dockShopIcon from '@/assets/images/roleplay/dock-shop.png';
import helpLifebuoyImg from '@/assets/images/roleplay/help-lifebuoy.png';
import helpTripleQIcon from '@/assets/images/roleplay/help-triple-q.png';
import phoneAchievementsIcon from '@/assets/images/roleplay/phone-achievements.png';
import phoneBackBtnIcon from '@/assets/images/roleplay/phone-back-btn.png';
import phoneCameraIcon from '@/assets/images/roleplay/phone-camera.png';
import phoneContactsIcon from '@/assets/images/roleplay/phone-contacts.png';
import phoneMessagesIcon from '@/assets/images/roleplay/phone-messages.png';
import phoneSettingsIcon from '@/assets/images/roleplay/phone-settings.png';
import questCombIcon from '@/assets/images/roleplay/quest-comb.png';
import questHangerIcon from '@/assets/images/roleplay/quest-hanger.png';
import toolFloorPlanIcon from '@/assets/images/roleplay/tool-floor-plan.png';
import toolRoomBuilderIcon from '@/assets/images/roleplay/tool-room-builder.png';
import toolRoomDimmerIcon from '@/assets/images/roleplay/tool-room-dimmer.png';
import toolRoomSettingsIcon from '@/assets/images/roleplay/tool-room-settings.png';
import toolWallDecorIcon from '@/assets/images/roleplay/tool-wall-decor.png';
import toolWallsFloorsIcon from '@/assets/images/roleplay/tool-walls-floors.png';
import toolWindowBgIcon from '@/assets/images/roleplay/tool-window-bg.png';
import iconCatalog from '@/assets/images/toolbar/icons/catalog.png';
import iconHouse from '@/assets/images/toolbar/icons/house.png';
import iconInventory from '@/assets/images/toolbar/icons/inventory.png';
import iconModTools from '@/assets/images/toolbar/icons/modtools.png';
import iconRooms from '@/assets/images/toolbar/icons/rooms.png';
import iconAnnouncements from '@/assets/images/toolbar/icons/me-menu/announcements.png';
import iconClothing from '@/assets/images/toolbar/icons/me-menu/clothing.png';
import iconForums from '@/assets/images/toolbar/icons/me-menu/forums.png';
import iconHelperTool from '@/assets/images/toolbar/icons/me-menu/helper-tool.png';
import iconProfile from '@/assets/images/toolbar/icons/me-menu/profile.png';
import iconTalents from '@/assets/images/toolbar/icons/me-menu/talents.png';
import iconHeartSprite from '@/assets/images/icons/sign-heart.png';
import { CreateLinkEvent, CreateRoomSession, GetNitroInstance, GetRoomEngine, GetRoomSession, GetSessionDataManager, GetUserProfile, MessengerThreadChat, SendMessageComposer } from '../../api';
import { useFriends, useMessenger, useObjectSelectedEvent, useSessionInfo } from '../../hooks';
import {
    isRoleplayMode,
    RpFullState,
    RpGang,
    RpItem,
    rpGetGangs,
    rpGetNews,
    rpGetRankings,
    rpGetState,
    rpPost,
    rpSetPhoneHolding
} from './RoleplayService';
import './RoleplayHudView.scss';

type SideModalTab = null | 'shop' | 'inventory' | 'help' | 'commands';
type HelpTopicId = 'around' | 'rooms' | 'character' | 'phone' | 'chat';
type PhoneApp = 'lock' | 'home' | 'contacts' | 'messages' | 'camera' | 'photos' | 'achievements' | 'news' | 'map' | 'jobs' | 'bank' | 'gangs' | 'actions' | 'rankings' | 'settings';

interface SavedPhoto
{
    id: string;
    dataUrl: string;
    roomName: string;
    takenAt: string;
}

interface RpClientPrefs
{
    furniPopup: boolean;
    furniGlow: boolean;
    followChar: boolean;
    roomZoom: number;
}

interface TargetHudInfo
{
    webId: number;
    name: string;
    figure: string;
    motto: string;
}

const RP_PHOTOS_KEY = 'habbten_rp_phone_photos_v1';
const RP_PREFS_KEY = 'habbten_rp_client_prefs_v1';
const RP_MAX_PHOTOS = 25;

const DEFAULT_RP_PREFS: RpClientPrefs = {
    furniPopup: true,
    furniGlow: true,
    followChar: true,
    roomZoom: 100
};

function loadRpPrefs(): RpClientPrefs
{
    try
    {
        const raw = localStorage.getItem(RP_PREFS_KEY);
        if(!raw) return DEFAULT_RP_PREFS;
        const p = JSON.parse(raw);
        return {
            furniPopup: typeof p.furniPopup === 'boolean' ? p.furniPopup : true,
            furniGlow: typeof p.furniGlow === 'boolean' ? p.furniGlow : true,
            followChar: typeof p.followChar === 'boolean' ? p.followChar : true,
            roomZoom: Math.max(50, Math.min(200, Number(p.roomZoom) || 100))
        };
    }
    catch (_)
    {
        return DEFAULT_RP_PREFS;
    }
}

function saveRpPrefs(prefs: RpClientPrefs): void
{
    try
    {
        localStorage.setItem(RP_PREFS_KEY, JSON.stringify(prefs));
    }
    catch (_) {}
}

function shouldShowContactAvatar(id?: number, name?: string, figure?: string): boolean
{
    if(!id || id <= 0) return false;
    if(!figure || !figure.trim()) return false;
    const n = (name || '').trim().toLowerCase();
    if(n.includes('staff chat') || n === 'staff' || n.includes('sistema')) return false;
    return true;
}

const RP_COMMANDS_CATALOG: Array<{ cmd: string; group: string; desc: string }> = [
    { cmd: ':me <acción>', group: 'Rol', desc: 'Describe una acción de tu personaje en sala.' },
    { cmd: ':do <entorno>', group: 'Rol', desc: 'Describe un detalle del entorno o escena.' },
    { cmd: ':comandos', group: 'General', desc: 'Abre esta tabla filtrable de comandos RP.' },
    { cmd: ':ayuda', group: 'General', desc: 'Muestra ayuda rápida de comandos RP.' },
    { cmd: ':trabajar', group: 'Empleo', desc: 'Realiza un turno de tu empleo actual.' },
    { cmd: ':turno', group: 'Empleo', desc: 'Activa o desactiva tu turno de servicio.' },
    { cmd: ':pagar <usuario> <monto>', group: 'Economía', desc: 'Entrega dinero en efectivo a otro jugador.' },
    { cmd: ':golpear <usuario>', group: 'Combate', desc: 'Ataque cuerpo a cuerpo en zonas PVP.' },
    { cmd: ':disparar <usuario>', group: 'Combate', desc: 'Dispara tu arma equipada al objetivo.' },
    { cmd: ':robar <usuario>', group: 'Combate', desc: 'Intenta robar efectivo en zonas PVP.' },
    { cmd: ':esposar <usuario>', group: 'Policía y Médicos', desc: 'Esposa a un sospechoso (Policía HPD).' },
    { cmd: ':arrestar <usuario>', group: 'Policía y Médicos', desc: 'Envía a prisión a un jugador esposado.' },
    { cmd: ':curar <usuario>', group: 'Policía y Médicos', desc: 'Sana heridas de un ciudadano (Médicos).' },
    { cmd: ':revivir <usuario>', group: 'Policía y Médicos', desc: 'Reanima a un ciudadano abatido.' },
    { cmd: ':911 <mensaje>', group: 'Policía y Médicos', desc: 'Envía una alerta de emergencia.' },
    { cmd: 'o/', group: 'Sala', desc: 'Saluda con la mano.' },
    { cmd: ':sit / :stand', group: 'Sala', desc: 'Sentarse o levantarse en la sala.' },
    { cmd: ':idle', group: 'Sala', desc: 'Pone tu personaje en estado ausente (zZz).' }
];

function loadSavedPhotos(): SavedPhoto[]
{
    try
    {
        const raw = localStorage.getItem(RP_PHOTOS_KEY);
        if(!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.slice(0, RP_MAX_PHOTOS) : [];
    }
    catch (_)
    {
        return [];
    }
}

function persistSavedPhotos(photos: SavedPhoto[]): void
{
    try
    {
        localStorage.setItem(RP_PHOTOS_KEY, JSON.stringify(photos.slice(0, RP_MAX_PHOTOS)));
    }
    catch (_) {}
}

interface ToastMsg
{
    id: number;
    type: 'ok' | 'err' | 'warn';
    text: string;
}

interface RoleplayHudViewProps
{
    isMobile?: boolean;
    isInRoom?: boolean;
}

const RP_CHAT_COMMANDS = new Set([
    'me', 'do', 'golpear', 'disparar', 'atacar', 'esposar', 'arrestar',
    'curar', 'revivir', 'pagar', '911', 'trabajar', 'turno', 'robar', 'ayuda', 'rp'
]);

const SHOP_CATEGORIES: Array<{ id: string; label: string; icon: string; banner: string }> = [
    { id: 'all', label: 'Todo', icon: iconCatalog, banner: '/img/rp_city_banner_hd.jpg' },
    { id: 'food', label: 'Comida y Café', icon: iconHeartSprite, banner: '/img/rp_city_night_hd.jpg' },
    { id: 'medical', label: 'Farmacia', icon: iconHelperTool, banner: '/img/rp_city_banner_hd.jpg' },
    { id: 'weapon', label: 'Armería', icon: iconModTools, banner: '/img/rp_city_night_hd.jpg' },
    { id: 'armor', label: 'Chalecos', icon: iconProfile, banner: '/img/rp_city_banner_hd.jpg' },
    { id: 'vehicle', label: 'Vehículos', icon: iconRooms, banner: '/img/rp_city_night_hd.jpg' },
    { id: 'gym', label: 'Gimnasio', icon: iconTalents, banner: '/img/rp_city_night_hd.jpg' }
];

const INV_CATEGORIES: Array<{ id: string; label: string; icon: string }> = [
    { id: 'all', label: 'Todo', icon: iconInventory },
    { id: 'weapon', label: 'Armas', icon: iconModTools },
    { id: 'armor', label: 'Chalecos', icon: iconClothing },
    { id: 'food', label: 'Comida', icon: iconHeartSprite },
    { id: 'medical', label: 'Salud', icon: iconHelperTool },
    { id: 'vehicle', label: 'Vehículos', icon: iconRooms }
];

function getItemSpriteIcon(category: string): string
{
    switch(category)
    {
        case 'food': return iconHeartSprite;
        case 'medical': return iconHelperTool;
        case 'weapon': return iconModTools;
        case 'armor': return iconClothing;
        case 'vehicle': return iconRooms;
        case 'gym': return iconTalents;
        default: return iconCatalog;
    }
}

export const RoleplayHudView: FC<RoleplayHudViewProps> = ({ isMobile = false }) =>
{
    const rpActive = isRoleplayMode();
    const { chatStyleId = 0 } = useSessionInfo();
    const { onlineFriends = [], offlineFriends = [], requests = [], requestResponse = null, followFriend = null } = useFriends();
    const { visibleThreads = [], activeThread = null, getMessageThread = null, setActiveThreadId = null, sendMessage = null } = useMessenger();

    const [ state, setState ] = useState<RpFullState | null>(null);
    const [ sideModal, setSideModal ] = useState<SideModalTab>(null);
    const [ helpTopic, setHelpTopic ] = useState<HelpTopicId>('around');
    const [ builderOpen, setBuilderOpen ] = useState<boolean>(false);
    const [ hoveredToolLabel, setHoveredToolLabel ] = useState<string>('');

    const [ phoneOpen, setPhoneOpen ] = useState<boolean>(false);
    const [ phoneUnlocked, setPhoneUnlocked ] = useState<boolean>(false);
    const [ phoneApp, setPhoneApp ] = useState<PhoneApp>('lock');
    const [ busy, setBusy ] = useState<boolean>(false);
    const [ toasts, setToasts ] = useState<ToastMsg[]>([]);

    // Logros / Misiones dentro del celular
    const [ achTab, setAchTab ] = useState<'quests' | 'achievements'>('quests');

    // Cámara (lente detrás del celular) y Fotos
    const [ cameraZoom, setCameraZoom ] = useState<number>(1);
    const [ cameraFlash, setCameraFlash ] = useState<boolean>(false);
    const [ savedPhotos, setSavedPhotos ] = useState<SavedPhoto[]>(() => loadSavedPhotos());
    const [ selectedPhoto, setSelectedPhoto ] = useState<SavedPhoto | null>(null);
    const camViewfinderRef = useRef<HTMLDivElement | null>(null);
    const camCanvasRef = useRef<HTMLCanvasElement | null>(null);

    // Arrastre del celular desde la barra superior (al lado del botón de cerrar)
    const phoneDeviceRef = useRef<HTMLElement | null>(null);
    const [ phonePos, setPhonePos ] = useState<{ x: number; y: number } | null>(null);
    const [ isDraggingPhone, setIsDraggingPhone ] = useState<boolean>(false);
    const phoneDragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

    // Preferencias del cliente RP + Zoom de sala
    const [ rpPrefs, setRpPrefs ] = useState<RpClientPrefs>(() => loadRpPrefs());

    // HUD de objetivo en sala (estilo PixelRP) + filtro :comandos
    const [ targetHud, setTargetHud ] = useState<TargetHudInfo | null>(null);
    const [ targetLocked, setTargetLocked ] = useState<boolean>(false);
    const [ cmdFilter, setCmdFilter ] = useState<string>('');

    // Swipe-to-unlock real (arrastre físico mouse/touch)
    const unlockTrackRef = useRef<HTMLDivElement | null>(null);
    const dragStartXRef = useRef<number>(0);
    const maxDragRef = useRef<number>(0);
    const [ swipeX, setSwipeX ] = useState<number>(0);
    const [ isSwiping, setIsSwiping ] = useState<boolean>(false);
    const chatInputRef = useRef<HTMLInputElement | null>(null);
    const typingSentRef = useRef<boolean>(false);

    // Contactos y Mensajes dentro del celular
    const [ contactSearch, setContactSearch ] = useState<string>('');
    const [ phoneChatInput, setPhoneChatInput ] = useState<string>('');
    const [ activeChatUserId, setActiveChatUserId ] = useState<number | null>(null);

    // Catálogo / Tienda 3 columnas
    const [ shopCategory, setShopCategory ] = useState<string>('all');
    const [ shopSearch, setShopSearch ] = useState<string>('');
    const [ selectedShopSlug, setSelectedShopSlug ] = useState<string>('');
    const [ shopQty, setShopQty ] = useState<number>(1);

    // Inventario 3 columnas
    const [ invCategory, setInvCategory ] = useState<string>('all');
    const [ invSearch, setInvSearch ] = useState<string>('');
    const [ selectedInvSlug, setSelectedInvSlug ] = useState<string>('');

    // Apps internas del celular
    const [ bankAmount, setBankAmount ] = useState<string>('250');
    const [ bankTarget, setBankTarget ] = useState<string>('');
    const [ targetPlayer, setTargetPlayer ] = useState<string>('');
    const [ arrestReason, setArrestReason ] = useState<string>('Delitos en Habbten RP');
    const [ call911Msg, setCall911Msg ] = useState<string>('');
    const [ chatText, setChatText ] = useState<string>('');
    const [ mobileChatOpen, setMobileChatOpen ] = useState<boolean>(false);

    const [ gangsList, setGangsList ] = useState<RpGang[]>([]);
    const [ gangForm, setGangForm ] = useState({ name: '', tag: '', color: '#dc2626', motto: '' });
    const [ rankings, setRankings ] = useState<any>(null);
    const [ newsData, setNewsData ] = useState<{ articles: any[]; events: any[] }>({ articles: [], events: [] });
    const [ selectedArticle, setSelectedArticle ] = useState<any>(null);

    const lastServerLocRef = useRef<string>('');
    const initialRoomEnteredRef = useRef<boolean>(false);

    const pushToast = useCallback((type: 'ok' | 'err' | 'warn', text: string) =>
    {
        const id = Date.now() + Math.floor(Math.random() * 999);
        setToasts(prev => [ ...prev.slice(-3), { id, type, text } ]);
        setTimeout(() =>
        {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4200);
    }, []);

    const refreshState = useCallback(async () =>
    {
        if(!rpActive) return;
        try
        {
            const json = await rpGetState();
            if(json && json.success)
            {
                const nextLocSlug = String(json.character?.current_location || '');
                const targetLoc = (json.locations || []).find(l => l.slug === nextLocSlug) || (json.locations || [])[0];

                if(!initialRoomEnteredRef.current && targetLoc && targetLoc.room_id > 0)
                {
                    initialRoomEnteredRef.current = true;
                    setTimeout(() =>
                    {
                        if(!GetRoomSession()?.roomId)
                        {
                            CreateRoomSession(targetLoc.room_id);
                        }
                    }, 1800);
                }
                else if(nextLocSlug && lastServerLocRef.current && nextLocSlug !== lastServerLocRef.current)
                {
                    if(targetLoc && targetLoc.room_id > 0 && GetRoomSession()?.roomId !== targetLoc.room_id)
                    {
                        CreateRoomSession(targetLoc.room_id);
                    }
                }
                if(nextLocSlug) lastServerLocRef.current = nextLocSlug;
                setState(json);
            }
        }
        catch (_) {}
    }, [ rpActive ]);

    useEffect(() =>
    {
        if(!rpActive) return;
        refreshState();
        const interval = setInterval(refreshState, 12000);
        const onFeedback = (ev: Event) =>
        {
            const detail = (ev as CustomEvent)?.detail;
            if(!detail) return;
            if(detail.state) setState(prev => prev ? { ...prev, ...detail.state } : detail.state);
            if(detail.message) pushToast(detail.ok ? 'ok' : 'err', detail.message);
        };
        window.addEventListener('habbten-rp-action-feedback', onFeedback);
        return () =>
        {
            clearInterval(interval);
            window.removeEventListener('habbten-rp-action-feedback', onFeedback);
        };
    }, [ rpActive, refreshState, pushToast ]);

    useEffect(() =>
    {
        if(!rpActive || !phoneOpen) return;
        if(phoneApp === 'gangs')
        {
            rpGetGangs().then(r => { if(r?.success) setGangsList(r.gangs || []); }).catch(() => {});
        }
        else if(phoneApp === 'rankings')
        {
            rpGetRankings().then(r => { if(r?.success) setRankings(r); }).catch(() => {});
        }
        else if(phoneApp === 'news')
        {
            rpGetNews().then(r => { if(r?.success) setNewsData({ articles: r.articles || [], events: r.events || [] }); }).catch(() => {});
        }
    }, [ rpActive, phoneOpen, phoneApp ]);

    // Lente real detrás del celular: enfoca exactamente lo que está detrás del visor de la cámara
    const renderCameraBehindPhone = useCallback(() =>
    {
        const vf = camViewfinderRef.current;
        const outCanvas = camCanvasRef.current;
        if(!vf || !outCanvas) return;

        const ctx = outCanvas.getContext('2d');
        if(!ctx) return;

        try
        {
            const nitro = GetNitroInstance();
            const srcCanvas = nitro?.application?.renderer?.view as HTMLCanvasElement | undefined;
            if(!srcCanvas || srcCanvas.width <= 0 || srcCanvas.height <= 0) return;

            nitro?.application?.render();

            const srcRect = srcCanvas.getBoundingClientRect();
            const vfRect = vf.getBoundingClientRect();
            if(srcRect.width <= 0 || srcRect.height <= 0 || vfRect.width <= 0 || vfRect.height <= 0) return;

            const scaleX = srcCanvas.width / srcRect.width;
            const scaleY = srcCanvas.height / srcRect.height;

            const rawW = vfRect.width * scaleX;
            const rawH = vfRect.height * scaleY;
            const zoom = Math.max(1, cameraZoom);
            const cropW = rawW / zoom;
            const cropH = rawH / zoom;

            const centerX = ((vfRect.left - srcRect.left) + (vfRect.width / 2)) * scaleX;
            const centerY = ((vfRect.top - srcRect.top) + (vfRect.height / 2)) * scaleY;

            const sx = centerX - (cropW / 2);
            const sy = centerY - (cropH / 2);

            ctx.fillStyle = '#1a1d21';
            ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(srcCanvas, sx, sy, cropW, cropH, 0, 0, outCanvas.width, outCanvas.height);
        }
        catch (_) {}
    }, [ cameraZoom ]);

    useEffect(() =>
    {
        if(!rpActive || !phoneOpen || phoneApp !== 'camera') return;
        renderCameraBehindPhone();
        const timer = setInterval(renderCameraBehindPhone, 65);
        return () => clearInterval(timer);
    }, [ rpActive, phoneOpen, phoneApp, phonePos, cameraZoom, renderCameraBehindPhone ]);

    // Aplicar zoom guardado y preferencias del cliente RP
    const updateRpPrefs = useCallback((patch: Partial<RpClientPrefs>) =>
    {
        setRpPrefs(prev =>
        {
            const next: RpClientPrefs = {
                ...prev,
                ...patch,
                roomZoom: Math.max(50, Math.min(200, patch.roomZoom ?? prev.roomZoom))
            };
            saveRpPrefs(next);

            if(typeof patch.roomZoom === 'number')
            {
                const roomId = GetRoomSession()?.roomId || GetRoomEngine()?.activeRoomId || -1;
                if(roomId > 0)
                {
                    try
                    {
                        GetRoomEngine().setRoomInstanceRenderingCanvasScale(roomId, 1, next.roomZoom / 100, null, null, false);
                    }
                    catch (_) {}
                }
            }
            if(typeof patch.followChar === 'boolean')
            {
                try { SendMessageComposer(new UserSettingsCameraFollowComposer(!next.followChar)); } catch (_) {}
            }
            return next;
        });
    }, []);

    // Escuchar selección de otro avatar para el HUD de objetivo (estilo PixelRP)
    useObjectSelectedEvent(event =>
    {
        if(!rpActive) return;
        if(event.category !== RoomObjectCategory.UNIT)
        {
            if(!targetLocked) setTargetHud(null);
            return;
        }
        const session = GetRoomSession();
        const userData = session?.userDataManager?.getUserDataByIndex(event.id);
        const ownId = GetSessionDataManager()?.userId;
        if(!userData || userData.type !== 1 || userData.webID === ownId)
        {
            if(!targetLocked) setTargetHud(null);
            return;
        }
        if(targetLocked && targetHud && targetHud.webId !== userData.webID) return;
        setTargetHud({
            webId: userData.webID,
            name: userData.name || 'Ciudadano',
            figure: userData.figure || '',
            motto: userData.custom || ''
        });
    });

    // Arrastrar el celular desde la barra superior (al lado del botón cerrar)
    const onPhoneDragStart = (e: PointerEvent<HTMLDivElement>) =>
    {
        if(isMobile) return;
        const target = e.target as HTMLElement | null;
        if(target && target.closest('button')) return;
        const dev = phoneDeviceRef.current;
        if(!dev) return;
        const rect = dev.getBoundingClientRect();
        e.currentTarget.setPointerCapture(e.pointerId);
        phoneDragOffsetRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
        setPhonePos({ x: rect.left, y: rect.top });
        setIsDraggingPhone(true);
    };

    const onPhoneDragMove = (e: PointerEvent<HTMLDivElement>) =>
    {
        if(!isDraggingPhone) return;
        const dev = phoneDeviceRef.current;
        const w = dev ? dev.offsetWidth : 294;
        const h = dev ? dev.offsetHeight : 552;
        const maxX = Math.max(8, window.innerWidth - w - 8);
        const maxY = Math.max(8, window.innerHeight - h - 8);
        const nextX = Math.max(8, Math.min(maxX, e.clientX - phoneDragOffsetRef.current.dx));
        const nextY = Math.max(8, Math.min(maxY, e.clientY - phoneDragOffsetRef.current.dy));
        setPhonePos({ x: nextX, y: nextY });
    };

    const onPhoneDragEnd = () =>
    {
        if(isDraggingPhone) setIsDraggingPhone(false);
    };

    // Enfocar la barra de chat al escribir directamente en la sala (como Habbo original)
    useEffect(() =>
    {
        if(!rpActive || isMobile) return;
        const onGlobalKey = (e: KeyboardEvent) =>
        {
            if(e.ctrlKey || e.metaKey || e.altKey) return;
            if(e.key.length !== 1) return;
            const active = document.activeElement;
            if(active && (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || (active as HTMLElement).isContentEditable)) return;
            if(chatInputRef.current) chatInputRef.current.focus();
        };
        window.addEventListener('keydown', onGlobalKey);
        return () => window.removeEventListener('keydown', onGlobalKey);
    }, [ rpActive, isMobile ]);

    // Al cerrar el celular se vuelve a bloquear siempre para deslizar al abrirlo de nuevo
    const togglePhone = useCallback((forceState?: boolean) =>
    {
        setPhoneOpen(prev =>
        {
            const next = typeof forceState === 'boolean' ? forceState : !prev;
            if(next !== prev)
            {
                rpSetPhoneHolding(next);
                setSwipeX(0);
                setIsSwiping(false);
                if(next)
                {
                    setSideModal(null);
                    setSelectedArticle(null);
                    setSelectedPhoto(null);
                    setPhoneUnlocked(false);
                    setPhoneApp('lock');
                }
                else
                {
                    setPhoneUnlocked(false);
                    setPhoneApp('lock');
                    setSelectedPhoto(null);
                    setActiveChatUserId(null);
                }
            }
            return next;
        });
    }, []);

    useEffect(() =>
    {
        return () =>
        {
            if(rpActive) rpSetPhoneHolding(false);
        };
    }, [ rpActive ]);

    const runAction = useCallback(async (path: string, body: Record<string, any> = {}, onSuccess?: (res: any) => void) =>
    {
        if(busy) return;
        setBusy(true);
        try
        {
            const res = await rpPost(path, body);
            if(res && res.success)
            {
                if(res.state) setState(prev => prev ? { ...prev, ...res.state } : res.state);
                if(res.message) pushToast('ok', res.message);
                if(onSuccess) onSuccess(res);
            }
            else
            {
                pushToast('err', res?.error || 'No se pudo completar la acción.');
            }
        }
        catch (_)
        {
            pushToast('err', 'Error de conexión con el servidor RP.');
        }
        finally
        {
            setBusy(false);
        }
    }, [ busy, pushToast ]);

    const currentLocation = useMemo(() =>
    {
        if(!state) return null;
        return state.locations.find(l => l.slug === state.character.current_location) || state.locations[0] || null;
    }, [ state ]);

    const formattedDate = useMemo(() =>
    {
        try
        {
            return new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
        }
        catch (_)
        {
            return 'Habbten RP';
        }
    }, []);

    const gymVirtualItems: RpItem[] = useMemo(() => ([
        {
            slug: '__gym_strength',
            name: 'Entrenar Fuerza',
            category: 'tool',
            description: 'Sesión de pesas en el Gimnasio para aumentar tu daño físico (+1 Fuerza).',
            price: 35,
            damage: 1,
            heal_hp: 0,
            restore_energy: 0,
            restore_hunger: 0,
            armor_value: 0,
            speed_bonus: 0,
            legal: 1,
            min_level: 1
        },
        {
            slug: '__gym_stamina',
            name: 'Entrenar Resistencia',
            category: 'tool',
            description: 'Entrenamiento cardiovascular en el Gimnasio (+1 Resistencia y mayor vida máxima).',
            price: 35,
            damage: 0,
            heal_hp: 5,
            restore_energy: 0,
            restore_hunger: 0,
            armor_value: 0,
            speed_bonus: 0,
            legal: 1,
            min_level: 1
        }
    ]), []);

    const filteredShop = useMemo(() =>
    {
        if(!state) return [];
        const base = shopCategory === 'gym'
            ? gymVirtualItems
            : state.catalog.filter(it => shopCategory === 'all' || it.category === shopCategory);
        const q = shopSearch.trim().toLowerCase();
        if(!q) return base;
        return base.filter(it => it.name.toLowerCase().includes(q) || (it.description || '').toLowerCase().includes(q));
    }, [ state, shopCategory, shopSearch, gymVirtualItems ]);

    const selectedShopItem = useMemo(() =>
    {
        if(filteredShop.length === 0) return null;
        return filteredShop.find(i => i.slug === selectedShopSlug) || filteredShop[0];
    }, [ filteredShop, selectedShopSlug ]);

    const filteredInv = useMemo(() =>
    {
        if(!state) return [];
        const base = state.inventory.filter(it => invCategory === 'all' || it.category === invCategory);
        const q = invSearch.trim().toLowerCase();
        if(!q) return base;
        return base.filter(it => it.name.toLowerCase().includes(q) || (it.description || '').toLowerCase().includes(q));
    }, [ state, invCategory, invSearch ]);

    const selectedInvItem = useMemo(() =>
    {
        if(filteredInv.length === 0) return null;
        return filteredInv.find(i => (i.item_slug || i.slug) === selectedInvSlug) || filteredInv[0];
    }, [ filteredInv, selectedInvSlug ]);

    const allContacts = useMemo(() =>
    {
        const merged = [ ...onlineFriends, ...offlineFriends ];
        const q = contactSearch.trim().toLowerCase();
        if(!q) return merged;
        return merged.filter(f => (f.name || '').toLowerCase().includes(q));
    }, [ onlineFriends, offlineFriends, contactSearch ]);

    const currentPhoneThread = useMemo(() =>
    {
        if(activeChatUserId !== null)
        {
            const byUser = visibleThreads.find(t => t.participant?.id === activeChatUserId);
            if(byUser) return byUser;
        }
        return activeThread || null;
    }, [ activeChatUserId, visibleThreads, activeThread ]);

    if(!rpActive || !state) return null;

    const { character, job, clock } = state;
    const hpPct = Math.max(0, Math.min(100, Math.round((character.hp / Math.max(1, character.max_hp)) * 100)));
    const enPct = Math.max(0, Math.min(100, Math.round((character.energy / Math.max(1, character.max_energy)) * 100)));
    const hunPct = Math.max(0, Math.min(100, Math.round(character.hunger)));
    const xpPct = Math.max(0, Math.min(100, Math.round((character.rp_xp / Math.max(1, character.xpForNextLevel)) * 100)));
    const claimableMissions = (state.missions || []).filter(m => m.canClaim).length;
    const activeShopMeta = SHOP_CATEGORIES.find(c => c.id === shopCategory) || SHOP_CATEGORIES[0];

    const openContactChat = (userId: number) =>
    {
        if(getMessageThread)
        {
            const thread = getMessageThread(userId);
            if(thread && setActiveThreadId) setActiveThreadId(thread.threadId);
        }
        setActiveChatUserId(userId);
        setPhoneApp('messages');
    };

    const handlePhoneMsgSend = (e: FormEvent) =>
    {
        e.preventDefault();
        const text = phoneChatInput.trim();
        if(!text || !currentPhoneThread || !sendMessage) return;
        sendMessage(currentPhoneThread, GetSessionDataManager().userId, text);
        setPhoneChatInput('');
    };

    const handleTravel = (slug: string, useTaxi: boolean) =>
    {
        runAction('/travel', { locationSlug: slug, useTaxi }, res =>
        {
            lastServerLocRef.current = slug;
            const targetRoomId = Number(res?.roomId || 0);
            if(targetRoomId > 0 && GetRoomSession()?.roomId !== targetRoomId)
            {
                CreateRoomSession(targetRoomId);
            }
            togglePhone(false);
        });
    };

    const handleShopBuy = async () =>
    {
        if(!selectedShopItem || busy) return;
        if(selectedShopItem.slug === '__gym_strength')
        {
            runAction('/gym/train', { stat: 'strength' });
            return;
        }
        if(selectedShopItem.slug === '__gym_stamina')
        {
            runAction('/gym/train', { stat: 'stamina' });
            return;
        }
        const count = Math.max(1, Math.min(20, Number(shopQty) || 1));
        setBusy(true);
        try
        {
            let lastRes: any = null;
            for(let i = 0; i < count; i++)
            {
                const res = await rpPost('/shop/buy', { itemSlug: selectedShopItem.slug });
                if(!res?.success)
                {
                    pushToast('err', res?.error || 'No se pudo completar la compra.');
                    break;
                }
                lastRes = res;
            }
            if(lastRes?.state) setState(prev => prev ? { ...prev, ...lastRes.state } : lastRes.state);
            if(lastRes?.message) pushToast('ok', count > 1 ? `Compraste ${ count }× ${ selectedShopItem.name }.` : lastRes.message);
        }
        catch (_)
        {
            pushToast('err', 'Error de conexión con el servidor RP.');
        }
        finally
        {
            setBusy(false);
        }
    };

    const submitRoomChat = (rawText: string, isShout: boolean = false) =>
    {
        const text = rawText.trim();
        if(!text) return;
        setChatText('');

        const session = GetRoomSession();
        if(typingSentRef.current)
        {
            typingSentRef.current = false;
            try { session?.sendChatTypingMessage(false); } catch (_) {}
        }

        const lower = text.toLowerCase();
        if(lower === 'o/' || lower === '_o/')
        {
            try { session?.sendExpressionMessage(AvatarExpressionEnum.WAVE.ordinal); } catch (_) {}
            if(isMobile) setMobileChatOpen(false);
            return;
        }
        if(lower === ':idle')
        {
            try { session?.sendExpressionMessage(AvatarExpressionEnum.IDLE.ordinal); } catch (_) {}
            if(isMobile) setMobileChatOpen(false);
            return;
        }
        if(lower === '_b')
        {
            try { session?.sendExpressionMessage(AvatarExpressionEnum.RESPECT.ordinal); } catch (_) {}
            if(isMobile) setMobileChatOpen(false);
            return;
        }

        if(lower === ':commands' || lower === ':comandos')
        {
            setCmdFilter('');
            openSideModal('commands');
            if(isMobile) setMobileChatOpen(false);
            return;
        }

        if(text.startsWith(':') || text.startsWith('/'))
        {
            const firstWord = text.slice(1).split(/\s+/)[0].toLowerCase();
            if(RP_CHAT_COMMANDS.has(firstWord))
            {
                runAction('/command', { command: text });
                if(isMobile) setMobileChatOpen(false);
                return;
            }
        }

        const style = Number.isFinite(chatStyleId) ? chatStyleId : 0;
        try
        {
            if(session)
            {
                if(isShout) session.sendShoutMessage(text, style);
                else session.sendChatMessage(text, style);
            }
            else
            {
                SendMessageComposer(isShout ? new RoomUnitChatShoutComposer(text, style) : new RoomUnitChatComposer(text, style));
            }
        }
        catch (_)
        {
            SendMessageComposer(isShout ? new RoomUnitChatShoutComposer(text, style) : new RoomUnitChatComposer(text, style));
        }

        if(isMobile) setMobileChatOpen(false);
    };

    const handleChatInputChange = (val: string) =>
    {
        setChatText(val);
        const session = GetRoomSession();
        if(!session) return;
        const hasText = val.trim().length > 0;
        if(hasText && !typingSentRef.current)
        {
            typingSentRef.current = true;
            try { session.sendChatTypingMessage(true); } catch (_) {}
        }
        else if(!hasText && typingSentRef.current)
        {
            typingSentRef.current = false;
            try { session.sendChatTypingMessage(false); } catch (_) {}
        }
    };

    const handleChatSubmit = (e: FormEvent) =>
    {
        e.preventDefault();
        submitRoomChat(chatText, false);
    };

    const handleTakePhonePhoto = () =>
    {
        if(savedPhotos.length >= RP_MAX_PHOTOS)
        {
            pushToast('warn', `Has alcanzado el límite de ${ RP_MAX_PHOTOS } fotos. Elimina alguna para tomar nuevas.`);
            return;
        }

        renderCameraBehindPhone();
        const outCanvas = camCanvasRef.current;
        if(!outCanvas)
        {
            pushToast('err', 'No se pudo capturar la imagen del visor.');
            return;
        }

        setCameraFlash(true);
        setTimeout(() => setCameraFlash(false), 180);

        try
        {
            const finalUrl = outCanvas.toDataURL('image/jpeg', 0.9);
            const photo: SavedPhoto = {
                id: `${ Date.now() }-${ Math.floor(Math.random() * 999) }`,
                dataUrl: finalUrl,
                roomName: currentLocation?.name || 'Habbten RP',
                takenAt: new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date())
            };
            setSavedPhotos(prev =>
            {
                const next = [ photo, ...prev ].slice(0, RP_MAX_PHOTOS);
                persistSavedPhotos(next);
                return next;
            });
            pushToast('ok', `Foto guardada (${ Math.min(RP_MAX_PHOTOS, savedPhotos.length + 1) } / ${ RP_MAX_PHOTOS }).`);
        }
        catch (_)
        {
            pushToast('err', 'Error al guardar la foto.');
        }
    };

    const handleDeletePhoto = (photoId: string) =>
    {
        setSavedPhotos(prev =>
        {
            const next = prev.filter(p => p.id !== photoId);
            persistSavedPhotos(next);
            return next;
        });
        if(selectedPhoto?.id === photoId) setSelectedPhoto(null);
    };

    const navigateParent = (path: string) =>
    {
        try
        {
            if(window.top && window.top !== window) window.top.location.href = path;
            else window.location.href = path;
        }
        catch (_)
        {
            window.location.href = path;
        }
    };

    const openSideModal = (tab: SideModalTab) =>
    {
        if(tab && phoneOpen) togglePhone(false);
        setBuilderOpen(false);
        setSideModal(prev => (prev === tab ? null : tab));
    };

    // Arrastre físico real para Deslizar para Desbloquear
    const onSwipeStart = (e: PointerEvent<HTMLDivElement>) =>
    {
        const track = unlockTrackRef.current;
        if(!track) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        maxDragRef.current = Math.max(0, track.clientWidth - 44);
        dragStartXRef.current = e.clientX;
        setIsSwiping(true);
    };

    const onSwipeMove = (e: PointerEvent<HTMLDivElement>) =>
    {
        if(!isSwiping) return;
        const delta = Math.max(0, Math.min(maxDragRef.current, e.clientX - dragStartXRef.current));
        setSwipeX(delta);
    };

    const onSwipeEnd = () =>
    {
        if(!isSwiping) return;
        setIsSwiping(false);
        if(maxDragRef.current > 0 && swipeX >= maxDragRef.current * 0.72)
        {
            setSwipeX(0);
            setPhoneUnlocked(true);
            setPhoneApp('home');
        }
        else
        {
            setSwipeX(0);
        }
    };

    // Herramientas de sala horizontales a la izquierda del botón Constructor (exacto a captura HabboRP)
    const roomBuilderTools: Array<{ id: string; label: string; icon: string; action: () => void }> = [
        {
            id: 'room-settings',
            label: 'Ajustes de sala',
            icon: toolRoomSettingsIcon,
            action: () => { setBuilderOpen(false); pushToast('ok', `Sala actual: ${ currentLocation?.name || 'Habbten RP' }`); }
        },
        {
            id: 'room-dimmer',
            label: 'Regulador de luz',
            icon: toolRoomDimmerIcon,
            action: () => { setBuilderOpen(false); pushToast('warn', 'Coloca un regulador de luz en tu sala para ajustar el brillo.'); }
        },
        {
            id: 'window-bg',
            label: 'Fondo de ventana',
            icon: toolWindowBgIcon,
            action: () => { setBuilderOpen(false); openSideModal('shop'); }
        },
        {
            id: 'walls-floors',
            label: 'Paredes y suelos',
            icon: toolWallsFloorsIcon,
            action: () => { setBuilderOpen(false); openSideModal('shop'); }
        },
        {
            id: 'wall-decor',
            label: 'Decoración de pared',
            icon: toolWallDecorIcon,
            action: () => { setBuilderOpen(false); openSideModal('inventory'); }
        },
        {
            id: 'floor-plan',
            label: 'Plano de suelo',
            icon: toolFloorPlanIcon,
            action: () => { setBuilderOpen(false); CreateLinkEvent('floor-editor/toggle'); }
        }
    ];

    // Apps del Celular con sprites HD 1:1 (Contactos, Mensajes, Cámara, Ajustes, Logros integrados DENTRO del celular)
    const phoneApps: Array<{ id: string; label: string; icon: string; badge?: number; action: () => void }> = [
        { id: 'contacts', label: 'Contactos', icon: phoneContactsIcon, badge: requests.length, action: () => setPhoneApp('contacts') },
        { id: 'messages', label: 'Mensajes', icon: phoneMessagesIcon, action: () => { setActiveChatUserId(null); setPhoneApp('messages'); } },
        { id: 'camera', label: 'Cámara', icon: phoneCameraIcon, action: () => { setSelectedPhoto(null); setPhoneApp('camera'); } },
        { id: 'settings', label: 'Ajustes', icon: phoneSettingsIcon, action: () => setPhoneApp('settings') },
        { id: 'achievements', label: 'Logros', icon: phoneAchievementsIcon, badge: claimableMissions, action: () => setPhoneApp('achievements') },
        { id: 'map', label: 'GPS Mapa', icon: iconRooms, action: () => setPhoneApp('map') },
        { id: 'jobs', label: 'Empleos', icon: iconProfile, action: () => setPhoneApp('jobs') },
        { id: 'bank', label: 'Banco', icon: iconHouse, action: () => setPhoneApp('bank') },
        { id: 'gangs', label: 'Bandas', icon: iconForums, action: () => setPhoneApp('gangs') },
        { id: 'news', label: 'Noticias', icon: iconAnnouncements, action: () => { setSelectedArticle(null); setPhoneApp('news'); } },
        { id: 'actions', label: '911', icon: iconModTools, action: () => setPhoneApp('actions') },
        { id: 'rankings', label: 'Rankings', icon: iconTalents, action: () => setPhoneApp('rankings') }
    ];

    const phoneAppTitle: Record<PhoneApp, string> = {
        lock: 'Bloqueado',
        home: state.user.username,
        contacts: 'Contactos',
        messages: 'Mensajes',
        camera: 'Cámara',
        photos: 'Fotos',
        achievements: 'Logros',
        news: 'Noticias',
        map: 'GPS Mapa',
        jobs: 'Empleos',
        bank: 'Banco',
        gangs: 'Bandas',
        actions: '911 y Acciones',
        rankings: 'Rankings',
        settings: 'Ajustes'
    };

    const getQuestSprite = (slug: string, idx: number): string =>
    {
        const s = (slug || '').toLowerCase();
        if(s.includes('foto') || s.includes('cam')) return phoneCameraIcon;
        if(s.includes('ropa') || s.includes('look') || s.includes('estilo')) return questCombIcon;
        if(idx % 3 === 0) return questHangerIcon;
        if(idx % 3 === 1) return questCombIcon;
        return phoneCameraIcon;
    };

    const rpAchievements = [
        {
            id: 'ach-photos',
            title: 'Captura un recuerdo',
            xp: 40,
            desc: 'Toma y guarda una foto con la cámara de tu celular.',
            progress: Math.min(1, savedPhotos.length),
            target: 1,
            icon: phoneCameraIcon
        },
        {
            id: 'ach-level',
            title: 'Ciudadano activo',
            xp: 60,
            desc: 'Alcanza el nivel 5 en Habbten RP.',
            progress: Math.min(5, character.rp_level),
            target: 5,
            icon: questHangerIcon
        },
        {
            id: 'ach-wealth',
            title: 'Ahorrador urbano',
            xp: 80,
            desc: 'Reúne $5,000 entre efectivo y cuenta bancaria.',
            progress: Math.min(5000, character.cash + character.bank),
            target: 5000,
            icon: questCombIcon
        }
    ];

    const helpTopics: Array<{ id: HelpTopicId; label: string; icon: string; title: string; paragraphs: string[]; ctaLabel: string; ctaAction: () => void }> = [
        {
            id: 'around',
            label: 'Moverse por la ciudad',
            icon: iconRooms,
            title: 'Moverse por la ciudad',
            paragraphs: [
                'Haz clic en cualquier baldosa del suelo para caminar. Usa la app GPS Mapa en tu celular para viajar a pie, en taxi o en tu vehículo entre los 10 distritos.',
                'Arrastra en el espacio vacío fuera de la sala para mover la cámara y centrar tu vista.',
                'Escribe en la barra blanca de chat inferior para hablar o ejecutar comandos rápidos como :me, :do, :trabajar o :911.'
            ],
            ctaLabel: 'Explorar catálogo',
            ctaAction: () => openSideModal('shop')
        },
        {
            id: 'rooms',
            label: 'Salas y mobiliario',
            icon: iconInventory,
            title: 'Salas y mobiliario',
            paragraphs: [
                'Compra equipamiento, vehículos, chalecos y artículos en el Catálogo (ícono del carrito a la izquierda) y guárdalos automáticamente en tu Inventario.',
                'Pasa el cursor sobre el ícono del casco arriba a la derecha para acceder a las herramientas de sala: Ajustes de sala, Regulador de luz, Fondo, Paredes y Plano de suelo.'
            ],
            ctaLabel: 'Abrir inventario',
            ctaAction: () => openSideModal('inventory')
        },
        {
            id: 'character',
            label: 'Tu personaje',
            icon: iconClothing,
            title: 'Tu personaje',
            paragraphs: [
                'Controla tu Vida (barra roja), Energía (barra dorada), Nivel RP y Efectivo desde la tarjeta inferior izquierda.',
                'Haz clic sobre tu propio avatar en la sala para cambiar tu aspecto, bailar o hacer gestos. También puedes postularte a empleos (Policía HPD, Médico, Banquero, Mecánico, Chef o Sindicato) desde tu celular.'
            ],
            ctaLabel: 'Cambiar aspecto',
            ctaAction: () => { setSideModal(null); CreateLinkEvent('avatar-editor/toggle'); }
        },
        {
            id: 'phone',
            label: 'Celular y contactos',
            icon: '/img/rp_phone_icon_hd.png',
            title: 'Celular y contactos',
            paragraphs: [
                'Pulsa el ícono del celular en el dock izquierdo y desliza la flecha verde hasta el final para desbloquearlo.',
                'Desde el celular puedes gestionar tus Contactos, enviar Mensajes privados, usar la Cámara, consultar el GPS, cobrar Misiones, operar en el Banco, crear Bandas y leer Noticias.'
            ],
            ctaLabel: 'Abrir celular',
            ctaAction: () => togglePhone(true)
        },
        {
            id: 'chat',
            label: 'Chat y comandos',
            icon: helpTripleQIcon,
            title: 'Chat y comandos RP',
            paragraphs: [
                'Además de chatear normalmente en sala, puedes escribir comandos directamente en la barra blanca inferior:',
                ':me <acción> · :do <entorno> · :trabajar · :turno · :pagar <usuario> <$> · :golpear <usuario> · :esposar <usuario> · :arrestar <usuario> · :curar <usuario> · :robar [tienda|banco] · :911 <mensaje>'
            ],
            ctaLabel: 'Entendido',
            ctaAction: () => setSideModal(null)
        }
    ];

    const activeHelp = helpTopics.find(t => t.id === helpTopic) || helpTopics[0];
    const swipeFade = maxDragRef.current > 0 ? Math.max(0, 1 - (swipeX / (maxDragRef.current * 0.65))) : 1;

    return (
        <div className={ `rp-modern-root ${ isMobile ? 'is-mobile' : 'is-desktop' }` }>

            {/* ==================== AVISOS DE ESTADO CRÍTICO ==================== */}
            { (character.jailSecondsLeft > 0 || character.hospitalSecondsLeft > 0 || character.cuffed_by > 0) && (
                <div className="rp-alert-strip">
                    { character.jailSecondsLeft > 0 && (
                        <span className="rp-alert-pill is-jail">Prisión · { character.jailSecondsLeft }s ({ character.jail_reason || 'Arrestado' })</span>
                    ) }
                    { character.hospitalSecondsLeft > 0 && (
                        <span className="rp-alert-pill is-hosp">Hospital · Recuperación { character.hospitalSecondsLeft }s</span>
                    ) }
                    { character.cuffed_by > 0 && (
                        <span className="rp-alert-pill is-cuff">Estás esposado por la Policía HPD</span>
                    ) }
                </div>
            ) }

            {/* ==================== TOASTS ==================== */}
            { toasts.length > 0 && (
                <div className="rp-toast-stack">
                    { toasts.map(t => (
                        <div key={ t.id } className={ `rp-toast is-${ t.type }` }>{ t.text }</div>
                    )) }
                </div>
            ) }

            {/* ==================== BOTONES SUPERIORES DERECHA (BARRA HORIZONTAL HOVER + AYUDA ???) ==================== */}
            <div className="rp-top-right-tools">
                <div
                    className={ `rp-builder-hover-wrap ${ builderOpen ? 'is-open' : '' }` }
                    onMouseEnter={ () => !isMobile && setBuilderOpen(true) }
                    onMouseLeave={ () => { if(!isMobile) { setBuilderOpen(false); setHoveredToolLabel(''); } } }>
                    { builderOpen && (
                        <div className="rp-builder-tray-horizontal" role="menu" aria-label="Herramientas de sala">
                            { roomBuilderTools.map(tool => (
                                <button
                                    key={ tool.id }
                                    type="button"
                                    className="rp-builder-sq-btn"
                                    title={ tool.label }
                                    onMouseEnter={ () => setHoveredToolLabel(tool.label) }
                                    onMouseLeave={ () => setHoveredToolLabel('') }
                                    onClick={ tool.action }>
                                    <img src={ tool.icon } alt={ tool.label } className="rp-builder-sprite" />
                                </button>
                            )) }
                        </div>
                    ) }

                    <div className="rp-builder-trigger-box">
                        <button
                            type="button"
                            className={ `rp-square-btn ${ builderOpen ? 'is-active' : '' }` }
                            title="Herramientas de sala"
                            onMouseEnter={ () => setHoveredToolLabel('Herramientas de sala') }
                            onMouseLeave={ () => setHoveredToolLabel('') }
                            onClick={ () => setBuilderOpen(v => !v) }>
                            <img src={ toolRoomBuilderIcon } alt="Herramientas de sala" className="rp-pixel-sprite" />
                        </button>
                        { builderOpen && (
                            <div className="rp-builder-tooltip">
                                { hoveredToolLabel || 'Herramientas de sala' }
                            </div>
                        ) }
                    </div>
                </div>

                <button
                    type="button"
                    className={ `rp-square-btn ${ sideModal === 'help' ? 'is-active' : '' }` }
                    title="Ayuda y Soporte"
                    onClick={ () => openSideModal('help') }>
                    <img src={ helpTripleQIcon } alt="Ayuda" className="rp-pixel-sprite" />
                </button>
            </div>

            {/* ==================== DOCK VERTICAL IZQUIERDO (SPRITES ORIGINALES HABBO) ==================== */}
            <aside className="rp-left-dock" aria-label="Herramientas RP">
                <button
                    type="button"
                    className={ `rp-dock-btn ${ sideModal === 'shop' ? 'is-active' : '' }` }
                    title="Catálogo"
                    onClick={ () => openSideModal('shop') }>
                    <img src={ dockShopIcon } alt="Catálogo" className="rp-dock-pixel-sprite" />
                </button>
                <button
                    type="button"
                    className={ `rp-dock-btn ${ sideModal === 'inventory' ? 'is-active' : '' }` }
                    title="Inventario"
                    onClick={ () => openSideModal('inventory') }>
                    <img src={ dockInventoryIcon } alt="Inventario" className="rp-dock-pixel-sprite" />
                </button>
                <button
                    type="button"
                    className={ `rp-dock-btn is-phone ${ phoneOpen ? 'is-active' : '' }` }
                    title="Celular"
                    onClick={ () => togglePhone() }>
                    <img src="/img/rp_phone_icon_hd.png" alt="Celular" className="rp-dock-icon-hd" />
                    { (claimableMissions > 0 || requests.length > 0 || !phoneUnlocked) && <span className="rp-dock-dot" /> }
                </button>
            </aside>

            {/* ==================== HUD INFERIOR IZQUIERDA (CABEZA FRONTAL) + CHAT BLANCO ==================== */}
            <div className="rp-bottom-cluster">
                <div className="rp-char-hud" onClick={ () => togglePhone(true) } title="Abrir celular">
                    <div className="rp-char-avatar-box">
                        <img
                            className="rp-char-head-img"
                            src={ `/habbo-imaging/avatarimage?figure=${ encodeURIComponent(state.user.look || '') }&headonly=1&size=m&direction=3&head_direction=3` }
                            alt={ state.user.username } />
                        <span className="rp-char-lvl">{ character.rp_level }</span>
                    </div>

                    <div className="rp-char-meta">
                        <div className="rp-char-row-top">
                            <span className="rp-char-name">{ state.user.username }</span>
                            <span className="rp-cash-chip" title={ `Efectivo: $${ character.cash.toLocaleString() } · Banco: $${ character.bank.toLocaleString() }` }>
                                <FaMoneyBillWave className="rp-cash-ico" />
                                <span>${ character.cash.toLocaleString() }</span>
                            </span>
                        </div>

                        <div className="rp-stat-bar">
                            <FaHeart className="rp-bar-ico is-hp" />
                            <div className="rp-bar-track">
                                <div className="rp-bar-fill is-hp" style={ { width: `${ hpPct }%` } } />
                                <span className="rp-bar-label">{ character.hp } / { character.max_hp }</span>
                            </div>
                        </div>

                        <div className="rp-stat-bar">
                            <FaBolt className="rp-bar-ico is-en" />
                            <div className="rp-bar-track">
                                <div className="rp-bar-fill is-en" style={ { width: `${ enPct }%` } } />
                                <span className="rp-bar-label">{ character.energy } / { character.max_energy }</span>
                            </div>
                        </div>
                    </div>
                </div>

                { !isMobile ? (
                    <form className="rp-chat-pill" onSubmit={ handleChatSubmit }>
                        <input
                            ref={ chatInputRef }
                            type="text"
                            className="rp-chat-field"
                            value={ chatText }
                            onChange={ e => handleChatInputChange(e.target.value) }
                            onKeyDown={ e => {
                                e.stopPropagation();
                                if(e.key === 'Enter' || e.key === 'NumpadEnter')
                                {
                                    e.preventDefault();
                                    submitRoomChat(chatText, e.shiftKey);
                                }
                            } }
                            placeholder="Di algo o escribe :me, :do, :trabajar, :911..."
                            maxLength={ 140 } />
                        <button type="submit" style={ { display: 'none' } } aria-hidden="true" tabIndex={ -1 } />
                    </form>
                ) : (
                    <div className="rp-mobile-chat-trigger">
                        <button
                            type="button"
                            className={ `rp-mob-chat-btn ${ mobileChatOpen ? 'is-active' : '' }` }
                            onClick={ () => setMobileChatOpen(v => !v) }>
                            <FaCommentDots />
                            <span>Chat</span>
                        </button>
                    </div>
                ) }
            </div>

            { isMobile && mobileChatOpen && (
                <form className="rp-mobile-chat-float" onSubmit={ handleChatSubmit }>
                    <input
                        type="text"
                        className="rp-chat-field"
                        value={ chatText }
                        onChange={ e => handleChatInputChange(e.target.value) }
                        onKeyDown={ e => {
                            e.stopPropagation();
                            if(e.key === 'Enter' || e.key === 'NumpadEnter')
                            {
                                e.preventDefault();
                                submitRoomChat(chatText, e.shiftKey);
                            }
                        } }
                        placeholder="Escribe en sala o usa :me, :trabajar..."
                        maxLength={ 140 }
                        autoFocus />
                    <button type="submit" className="rp-btn is-green">Enviar</button>
                </form>
            ) }

            {/* ==================== HUD DE OBJETIVO SELECCIONADO (ESTILO PIXELRP) ==================== */}
            { targetHud && (
                <div className="rp-target-hud" aria-label="Jugador seleccionado">
                    <div className="rp-target-avatar-box">
                        <img
                            className="rp-char-head-img"
                            src={ `/habbo-imaging/avatarimage?figure=${ encodeURIComponent(targetHud.figure) }&headonly=1&size=m&direction=3&head_direction=3` }
                            alt={ targetHud.name } />
                    </div>
                    <div className="rp-target-meta">
                        <div className="rp-target-top">
                            <span className="rp-target-name">{ targetHud.name }</span>
                            <div className="rp-target-ctrls">
                                <button
                                    type="button"
                                    className={ `rp-target-ico-btn ${ targetLocked ? 'is-locked' : '' }` }
                                    title={ targetLocked ? 'Desfijar objetivo' : 'Fijar objetivo' }
                                    onClick={ () => setTargetLocked(v => !v) }>
                                    { targetLocked ? <FaLock /> : <FaLockOpen /> }
                                </button>
                                <button
                                    type="button"
                                    className="rp-target-ico-btn"
                                    title="Cerrar"
                                    onClick={ () => { setTargetLocked(false); setTargetHud(null); } }>
                                    <FaTimes />
                                </button>
                            </div>
                        </div>
                        <div className="rp-target-actions">
                            <button type="button" className="rp-btn is-dark is-xs" onClick={ () => GetUserProfile(targetHud.webId) }>Perfil</button>
                            <button type="button" className="rp-btn is-green is-xs" onClick={ () => { setTargetPlayer(targetHud.name); togglePhone(true); } }>Acción</button>
                            <button type="button" className="rp-btn is-red is-xs" disabled={ busy } onClick={ () => runAction('/combat/attack', { target: targetHud.name }) }>Golpear</button>
                        </div>
                    </div>
                </div>
            ) }

            {/* ==================== SMARTPHONE DEL AVATAR (ARRASTRABLE) ==================== */}
            { phoneOpen && (
                <section
                    ref={ phoneDeviceRef }
                    className={ `rp-phone-device ${ isDraggingPhone ? 'is-dragging' : '' }` }
                    style={ phonePos && !isMobile ? { left: phonePos.x, top: phonePos.y, bottom: 'auto' } : undefined }
                    aria-label="Celular Habbten RP">
                    <div
                        className="rp-phone-top-bezel"
                        title="Arrastra para mover el celular"
                        onPointerDown={ onPhoneDragStart }
                        onPointerMove={ onPhoneDragMove }
                        onPointerUp={ onPhoneDragEnd }
                        onPointerCancel={ onPhoneDragEnd }>
                        <span className="rp-phone-cam" />
                        <span className="rp-phone-speaker" />
                        <button type="button" className="rp-phone-close" onClick={ () => togglePhone(false) } title="Guardar celular">
                            <FaTimes />
                        </button>
                    </div>

                    <div className="rp-phone-screen">
                        <div className="rp-phone-statusbar">
                            <span className="rp-sb-carrier">Habbten RP</span>
                            <span className="rp-sb-time">{ clock.formatted }</span>
                            <span className="rp-sb-battery" title="Batería 100%">
                                <span className="rp-sb-battery-fill" />
                            </span>
                        </div>

                        {/* PANTALLA DE BLOQUEO CON SLIDER REAL */}
                        { phoneApp === 'lock' && (
                            <div className="rp-phone-lock">
                                <div className="rp-lock-clock-wrap">
                                    <div className="rp-lock-time">{ clock.formatted }</div>
                                    <div className="rp-lock-date">{ formattedDate }</div>
                                </div>

                                <div className="rp-unlock-track" ref={ unlockTrackRef }>
                                    <div
                                        className={ `rp-unlock-thumb ${ isSwiping ? 'is-dragging' : '' }` }
                                        style={ { transform: `translateX(${ swipeX }px)` } }
                                        onPointerDown={ onSwipeStart }
                                        onPointerMove={ onSwipeMove }
                                        onPointerUp={ onSwipeEnd }
                                        onPointerCancel={ onSwipeEnd }
                                        role="slider"
                                        aria-label="Desliza para desbloquear"
                                        aria-valuemin={ 0 }
                                        aria-valuemax={ 100 }
                                        aria-valuenow={ maxDragRef.current > 0 ? Math.round((swipeX / maxDragRef.current) * 100) : 0 }>
                                        <FaChevronRight />
                                    </div>
                                    <span className="rp-unlock-text" style={ { opacity: swipeFade } }>
                                        Desliza para desbloquear
                                    </span>
                                </div>
                            </div>
                        ) }

                        {/* PANTALLA DE INICIO CON ÍCONOS ORIGINALES */}
                        { phoneApp === 'home' && (
                            <div className="rp-phone-home">
                                <div className="rp-phone-home-user">{ state.user.username }</div>
                                <div className="rp-app-grid">
                                    { phoneApps.map(app => (
                                        <button
                                            key={ app.id }
                                            type="button"
                                            className="rp-app-tile"
                                            onClick={ app.action }>
                                            <span className="rp-app-icon-box">
                                                <img src={ app.icon } alt={ app.label } className="rp-app-sprite" />
                                                { !!app.badge && app.badge > 0 && <span className="rp-app-badge">{ app.badge }</span> }
                                            </span>
                                            <span className="rp-app-label">{ app.label }</span>
                                        </button>
                                    )) }
                                </div>
                            </div>
                        ) }

                        {/* APP CONTACTOS DENTRO DEL CELULAR */}
                        { phoneApp === 'contacts' && (
                            <div className="rp-phone-appview rp-phone-solid-bg">
                                <div className="rp-phone-top-nav">
                                    <button type="button" className="rp-phone-back-imgbtn" onClick={ () => setPhoneApp('home') } title="Inicio">
                                        <img src={ phoneBackBtnIcon } alt="Volver" className="rp-back-btn-sprite" />
                                    </button>
                                    <span className="rp-phone-top-title">Contactos</span>
                                    <button type="button" className="rp-phone-right-square" onClick={ () => { setActiveChatUserId(null); setPhoneApp('messages'); } } title="Mensajes">
                                        <img src={ phoneMessagesIcon } alt="Mensajes" className="rp-mini-nav-sprite" />
                                    </button>
                                </div>

                                <div className="rp-phone-contacts-search">
                                    <div className="rp-white-search">
                                        <FaSearch className="rp-search-ico" />
                                        <input
                                            type="text"
                                            value={ contactSearch }
                                            onChange={ e => setContactSearch(e.target.value) }
                                            placeholder="Buscar contactos" />
                                    </div>
                                </div>

                                { requests.length > 0 && (
                                    <>
                                        <div className="rp-phone-sec-band">Solicitudes ({ requests.length })</div>
                                        <div className="rp-phone-contact-list" style={ { flex: 'none' } }>
                                            { requests.map(req => (
                                                <div key={ req.id } className="rp-contact-row">
                                                    <span className="rp-contact-name">{ req.name }</span>
                                                    <div className="rp-btn-row">
                                                        <button type="button" className="rp-btn is-green is-xs" onClick={ () => requestResponse && requestResponse(req.id, true) }>Aceptar</button>
                                                        <button type="button" className="rp-btn is-dark is-xs" onClick={ () => requestResponse && requestResponse(req.id, false) }>No</button>
                                                    </div>
                                                </div>
                                            )) }
                                        </div>
                                    </>
                                ) }

                                <div className="rp-phone-sec-band">Tus contactos</div>
                                <div className="rp-phone-contact-list">
                                    { allContacts.length === 0 ? (
                                        <div className="rp-phone-empty-note">
                                            Añade amigos desde el menú de un jugador.
                                        </div>
                                    ) : allContacts.map(friend => (
                                        <div key={ friend.id } className="rp-contact-row">
                                            <div className="rp-contact-left" onClick={ () => openContactChat(friend.id) }>
                                                <span className={ `rp-contact-dot ${ friend.online ? 'is-on' : '' }` } />
                                                { shouldShowContactAvatar(friend.id, friend.name, friend.figure) && (
                                                    <img
                                                        className="rp-contact-head"
                                                        src={ `/habbo-imaging/avatarimage?figure=${ encodeURIComponent(friend.figure || '') }&headonly=1&size=s&direction=3&head_direction=3` }
                                                        alt="" />
                                                ) }
                                                <span className="rp-contact-name">{ friend.name }</span>
                                            </div>
                                            <div className="rp-btn-row">
                                                { friend.online && followFriend && shouldShowContactAvatar(friend.id, friend.name, friend.figure) && (
                                                    <button type="button" className="rp-btn is-dark is-xs" onClick={ () => followFriend(friend) }>Ir</button>
                                                ) }
                                                <button type="button" className="rp-btn is-green is-xs" onClick={ () => openContactChat(friend.id) }>Chat</button>
                                            </div>
                                        </div>
                                    )) }
                                </div>
                            </div>
                        ) }

                        {/* APP MENSAJES DENTRO DEL CELULAR */}
                        { phoneApp === 'messages' && (
                            <div className="rp-phone-appview rp-phone-solid-bg">
                                <div className="rp-phone-top-nav">
                                    <button
                                        type="button"
                                        className="rp-phone-back-imgbtn"
                                        onClick={ () => {
                                            if(activeChatUserId !== null) setActiveChatUserId(null);
                                            else setPhoneApp('home');
                                        } }
                                        title="Volver">
                                        <img src={ phoneBackBtnIcon } alt="Volver" className="rp-back-btn-sprite" />
                                    </button>
                                    <span className="rp-phone-top-title">
                                        { activeChatUserId !== null && currentPhoneThread?.participant?.name
                                            ? currentPhoneThread.participant.name
                                            : 'Mensajes' }
                                    </span>
                                    <button type="button" className="rp-phone-right-square" onClick={ () => setPhoneApp('contacts') } title="Contactos">
                                        <img src={ phoneContactsIcon } alt="Contactos" className="rp-mini-nav-sprite" />
                                    </button>
                                </div>

                                { activeChatUserId !== null && currentPhoneThread ? (
                                    <div className="rp-phone-thread-view">
                                        <div className="rp-phone-thread-scroll">
                                            { currentPhoneThread.groups.map((grp, gIdx) => (
                                                <div key={ gIdx } className={ `rp-msg-group ${ grp.userId === GetSessionDataManager().userId ? 'is-own' : '' }` }>
                                                    { grp.chats.map((c, cIdx) => (
                                                        c.type === MessengerThreadChat.SECURITY_NOTIFICATION ? null : (
                                                            <div key={ cIdx } className="rp-msg-bubble">{ c.message }</div>
                                                        )
                                                    )) }
                                                </div>
                                            )) }
                                        </div>
                                        <form className="rp-phone-thread-form" onSubmit={ handlePhoneMsgSend }>
                                            <input
                                                type="text"
                                                value={ phoneChatInput }
                                                onChange={ e => setPhoneChatInput(e.target.value) }
                                                placeholder="Escribe un mensaje..."
                                                maxLength={ 220 } />
                                            <button type="submit" className="rp-btn is-green is-xs">Enviar</button>
                                        </form>
                                    </div>
                                ) : visibleThreads.length > 0 ? (
                                    <div className="rp-phone-contact-list">
                                        { visibleThreads.map(th => (
                                            <div
                                                key={ th.threadId }
                                                className="rp-contact-row"
                                                onClick={ () => { if(th.participant) openContactChat(th.participant.id); } }
                                                style={ { cursor: 'pointer' } }>
                                                <div className="rp-contact-left">
                                                    { shouldShowContactAvatar(th.participant?.id, th.participant?.name, th.participant?.figure) && (
                                                        <img
                                                            className="rp-contact-head"
                                                            src={ `/habbo-imaging/avatarimage?figure=${ encodeURIComponent(th.participant?.figure || '') }&headonly=1&size=s&direction=3&head_direction=3` }
                                                            alt="" />
                                                    ) }
                                                    <span className="rp-contact-name">{ th.participant?.name || 'Contacto' }</span>
                                                </div>
                                                { th.unreadCount > 0 && <span className="rp-tag is-pvp">{ th.unreadCount }</span> }
                                            </div>
                                        )) }
                                    </div>
                                ) : (
                                    <div className="rp-phone-msg-empty">
                                        <img src={ phoneMessagesIcon } alt="" className="rp-msg-empty-sprite" />
                                        <p>Elige un contacto para empezar a chatear.</p>
                                        <button type="button" className="rp-habbo-white-btn" onClick={ () => setPhoneApp('contacts') }>
                                            Contactos
                                        </button>
                                    </div>
                                ) }
                            </div>
                        ) }

                        {/* APP LOGROS Y MISIONES DENTRO DEL CELULAR */}
                        { phoneApp === 'achievements' && (
                            <div className="rp-phone-appview rp-phone-solid-bg">
                                <div className="rp-phone-top-nav">
                                    <button type="button" className="rp-phone-back-imgbtn" onClick={ () => setPhoneApp('home') } title="Volver">
                                        <img src={ phoneBackBtnIcon } alt="Volver" className="rp-back-btn-sprite" />
                                    </button>
                                    <span className="rp-phone-top-title">Logros</span>
                                    <span style={ { width: 32 } } />
                                </div>

                                <div className="rp-ach-body">
                                    <div className="rp-ach-level-box">
                                        <div className="rp-ach-level-row">
                                            <b>Nivel { character.rp_level }</b>
                                            <span>{ character.rp_xp } XP total</span>
                                        </div>
                                        <div className="rp-ach-xp-bar">
                                            <div className="rp-ach-xp-fill" style={ { width: `${ xpPct }%` } } />
                                            <span>{ character.rp_xp } / { character.xpForNextLevel } XP</span>
                                        </div>
                                    </div>

                                    <div className="rp-ach-tabs">
                                        <button
                                            type="button"
                                            className={ `rp-ach-tab-btn ${ achTab === 'quests' ? 'is-active' : '' }` }
                                            onClick={ () => setAchTab('quests') }>
                                            <span>Misiones</span>
                                            { claimableMissions > 0 && <span className="rp-ach-tab-badge">{ claimableMissions }</span> }
                                        </button>
                                        <button
                                            type="button"
                                            className={ `rp-ach-tab-btn ${ achTab === 'achievements' ? 'is-active' : '' }` }
                                            onClick={ () => setAchTab('achievements') }>
                                            <span>Logros</span>
                                        </button>
                                    </div>

                                    <div className="rp-ach-list">
                                        { achTab === 'quests' ? (
                                            (state.missions || []).map((m, idx) => (
                                                <div key={ m.slug } className={ `rp-ach-card ${ m.canClaim ? 'is-claimable' : '' }` }>
                                                    <div className="rp-ach-card-top">
                                                        <div className="rp-ach-card-ico">
                                                            <img src={ getQuestSprite(m.slug, idx) } alt="" className="rp-ach-sprite" />
                                                        </div>
                                                        <div className="rp-ach-card-meta">
                                                            <div className="rp-ach-card-title">{ m.title }</div>
                                                            <div className="rp-ach-card-xp">+{ m.rewardXp } XP{ m.rewardCash > 0 ? ` · +$${ m.rewardCash }` : '' }</div>
                                                        </div>
                                                    </div>
                                                    <p className="rp-ach-card-desc">{ m.description }</p>
                                                    <div className="rp-ach-card-foot">
                                                        <span className="rp-ach-card-prog">{ m.progress } / { m.target }</span>
                                                        { m.claimed ? (
                                                            <span className="rp-ach-card-status is-done">Completada</span>
                                                        ) : m.canClaim ? (
                                                            <button
                                                                type="button"
                                                                className="rp-ach-claim-btn"
                                                                disabled={ busy }
                                                                onClick={ () => runAction('/missions/claim', { missionSlug: m.slug }) }>
                                                                Reclamar XP
                                                            </button>
                                                        ) : (
                                                            <span className="rp-ach-card-status">En progreso</span>
                                                        ) }
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            rpAchievements.map(a => {
                                                const done = a.progress >= a.target;
                                                return (
                                                    <div key={ a.id } className={ `rp-ach-card ${ done ? 'is-claimable' : '' }` }>
                                                        <div className="rp-ach-card-top">
                                                            <div className="rp-ach-card-ico">
                                                                <img src={ a.icon } alt="" className="rp-ach-sprite" />
                                                            </div>
                                                            <div className="rp-ach-card-meta">
                                                                <div className="rp-ach-card-title">{ a.title }</div>
                                                                <div className="rp-ach-card-xp">+{ a.xp } XP</div>
                                                            </div>
                                                        </div>
                                                        <p className="rp-ach-card-desc">{ a.desc }</p>
                                                        <div className="rp-ach-card-foot">
                                                            <span className="rp-ach-card-prog">{ a.progress } / { a.target }</span>
                                                            <span className={ `rp-ach-card-status ${ done ? 'is-done' : '' }` }>
                                                                { done ? 'Desbloqueado' : 'En progreso' }
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) }
                                    </div>
                                </div>
                            </div>
                        ) }

                        {/* APP CÁMARA DENTRO DEL CELULAR (ENFOCA LO QUE ESTÁ DETRÁS DEL CELULAR) */}
                        { phoneApp === 'camera' && (
                            <div className="rp-phone-appview rp-phone-solid-bg">
                                <div className="rp-phone-top-nav">
                                    <button type="button" className="rp-phone-back-imgbtn" onClick={ () => setPhoneApp('home') } title="Volver">
                                        <img src={ phoneBackBtnIcon } alt="Volver" className="rp-back-btn-sprite" />
                                    </button>
                                    <span className="rp-phone-top-title">Cámara</span>
                                    <button type="button" className="rp-habbo-white-btn is-nav" onClick={ () => { setSelectedPhoto(null); setPhoneApp('photos'); } }>
                                        Fotos
                                    </button>
                                </div>

                                <div className="rp-cam-body">
                                    <div className="rp-cam-frame-outer">
                                        <div ref={ camViewfinderRef } className="rp-cam-viewfinder">
                                            <canvas ref={ camCanvasRef } className="rp-cam-preview-canvas" width={ 240 } height={ 240 } />
                                            <div className="rp-cam-grid" aria-hidden="true">
                                                <span /><span /><span /><span />
                                            </div>
                                            { cameraFlash && <div className="rp-cam-flash" /> }
                                        </div>
                                    </div>

                                    <div className="rp-cam-room-name">{ currentLocation?.name || 'Habbten RP' }</div>

                                    <div className="rp-cam-zoom-row">
                                        <span>Zoom</span>
                                        <input
                                            type="range"
                                            min={ 1 }
                                            max={ 3 }
                                            step={ 0.25 }
                                            value={ cameraZoom }
                                            onChange={ e => setCameraZoom(parseFloat(e.target.value)) } />
                                        <span className="rp-cam-zoom-val">{ cameraZoom }×</span>
                                    </div>
                                </div>

                                <div className="rp-cam-shutter-bar">
                                    <button
                                        type="button"
                                        className="rp-cam-shutter-btn"
                                        title="Tomar foto"
                                        onClick={ handleTakePhonePhoto }>
                                        <span className="rp-cam-shutter-inner" />
                                    </button>
                                </div>
                            </div>
                        ) }

                        {/* APP FOTOS DENTRO DEL CELULAR */}
                        { phoneApp === 'photos' && (
                            <div className="rp-phone-appview rp-phone-solid-bg">
                                <div className="rp-phone-top-nav">
                                    <button
                                        type="button"
                                        className="rp-phone-back-imgbtn"
                                        onClick={ () => selectedPhoto ? setSelectedPhoto(null) : setPhoneApp('camera') }
                                        title="Volver">
                                        <img src={ phoneBackBtnIcon } alt="Volver" className="rp-back-btn-sprite" />
                                    </button>
                                    <span className="rp-phone-top-title">Fotos</span>
                                    <span className="rp-photos-count">{ savedPhotos.length } / { RP_MAX_PHOTOS }</span>
                                </div>

                                { selectedPhoto ? (
                                    <div className="rp-photo-detail">
                                        <img src={ selectedPhoto.dataUrl } alt={ selectedPhoto.roomName } className="rp-photo-full" />
                                        <div className="rp-photo-meta">
                                            <b>{ selectedPhoto.roomName }</b>
                                            <span>{ selectedPhoto.takenAt }</span>
                                        </div>
                                        <div className="rp-btn-row" style={ { width: '100%' } }>
                                            <a
                                                href={ selectedPhoto.dataUrl }
                                                download={ `habbten-rp-${ selectedPhoto.id }.jpg` }
                                                className="rp-btn is-green is-sm"
                                                style={ { flex: 1, textDecoration: 'none' } }>
                                                <FaDownload /> Descargar
                                            </a>
                                            <button
                                                type="button"
                                                className="rp-btn is-red is-sm"
                                                onClick={ () => handleDeletePhoto(selectedPhoto.id) }>
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </div>
                                ) : savedPhotos.length === 0 ? (
                                    <div className="rp-photos-empty">
                                        Tus fotos guardadas aparecerán aquí.
                                    </div>
                                ) : (
                                    <div className="rp-photos-grid">
                                        { savedPhotos.map(p => (
                                            <button
                                                key={ p.id }
                                                type="button"
                                                className="rp-photo-thumb"
                                                onClick={ () => setSelectedPhoto(p) }
                                                title={ `${ p.roomName } (${ p.takenAt })` }>
                                                <img src={ p.dataUrl } alt={ p.roomName } />
                                            </button>
                                        )) }
                                    </div>
                                ) }
                            </div>
                        ) }

                        {/* APP AJUSTES DENTRO DEL CELULAR (PREFERENCIAS + ZOOM + ACCESOS RP) */}
                        { phoneApp === 'settings' && (
                            <div className="rp-phone-appview rp-phone-solid-bg">
                                <div className="rp-phone-top-nav">
                                    <button type="button" className="rp-phone-back-imgbtn" onClick={ () => setPhoneApp('home') } title="Volver">
                                        <img src={ phoneBackBtnIcon } alt="Volver" className="rp-back-btn-sprite" />
                                    </button>
                                    <span className="rp-phone-top-title">Ajustes</span>
                                    <span style={ { width: 32 } } />
                                </div>

                                <div className="rp-app-scroll rp-settings-scroll">
                                    <div className="rp-set-user-head">
                                        <img src={ phoneSettingsIcon } alt="" className="rp-set-gear-sprite" />
                                        <b>{ state.user.username }</b>
                                    </div>

                                    <fieldset className="rp-set-prefs-box">
                                        <legend>Preferencias del cliente</legend>

                                        <label className="rp-pref-row">
                                            <span>Ventana de furni al hacer clic</span>
                                            <input
                                                type="checkbox"
                                                checked={ rpPrefs.furniPopup }
                                                onChange={ e => updateRpPrefs({ furniPopup: e.target.checked }) } />
                                        </label>

                                        <label className="rp-pref-row">
                                            <span>Resaltado al seleccionar furni</span>
                                            <input
                                                type="checkbox"
                                                checked={ rpPrefs.furniGlow }
                                                onChange={ e => updateRpPrefs({ furniGlow: e.target.checked }) } />
                                        </label>

                                        <label className="rp-pref-row">
                                            <span>Seguir a mi personaje</span>
                                            <input
                                                type="checkbox"
                                                checked={ rpPrefs.followChar }
                                                onChange={ e => updateRpPrefs({ followChar: e.target.checked }) } />
                                        </label>

                                        <div className="rp-set-divider" />

                                        <div className="rp-zoom-title">Zoom de sala</div>
                                        <div className="rp-zoom-ctrl-row">
                                            <button
                                                type="button"
                                                className="rp-zoom-sq-btn"
                                                title="Alejar"
                                                onClick={ () => updateRpPrefs({ roomZoom: rpPrefs.roomZoom - 10 }) }>
                                                <FaMinus />
                                            </button>
                                            <span className="rp-zoom-pct">{ rpPrefs.roomZoom }%</span>
                                            <button
                                                type="button"
                                                className="rp-zoom-sq-btn"
                                                title="Acercar"
                                                onClick={ () => updateRpPrefs({ roomZoom: rpPrefs.roomZoom + 10 }) }>
                                                <FaPlus />
                                            </button>
                                        </div>
                                        <div className="rp-set-auto-note">Se guarda automáticamente en este dispositivo.</div>
                                    </fieldset>

                                    <div className="rp-app-stack" style={ { marginTop: 10 } }>
                                        <button type="button" className="rp-phone-menu-btn" onClick={ () => CreateLinkEvent('user-settings/toggle') }>
                                            Sonido y Notificaciones
                                        </button>
                                        <button type="button" className="rp-phone-menu-btn" onClick={ () => CreateLinkEvent('avatar-editor/toggle') }>
                                            Cambiar Ropa / Aspecto
                                        </button>
                                        <button type="button" className="rp-phone-menu-btn" onClick={ () => { setCmdFilter(''); openSideModal('commands'); } }>
                                            Lista de Comandos (:comandos)
                                        </button>
                                        <button type="button" className="rp-phone-menu-btn" onClick={ () => navigateParent('/rp') }>
                                            Inicio de Habbten RP
                                        </button>
                                        <button type="button" className="rp-phone-menu-btn" onClick={ () => navigateParent('/') }>
                                            Entra a Habbten
                                        </button>
                                        <button type="button" className="rp-signout-white-btn" onClick={ () => navigateParent('/logout') }>
                                            Cerrar sesión
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) }

                        {/* RESTO DE APPS INTERNAS DEL CELULAR */}
                        { phoneApp !== 'lock' && phoneApp !== 'home' && phoneApp !== 'contacts' && phoneApp !== 'messages' && phoneApp !== 'achievements' && phoneApp !== 'camera' && phoneApp !== 'photos' && phoneApp !== 'settings' && (
                            <div className="rp-phone-appview rp-phone-solid-bg">
                                <div className="rp-phone-top-nav">
                                    <button
                                        type="button"
                                        className="rp-phone-back-imgbtn"
                                        onClick={ () => selectedArticle ? setSelectedArticle(null) : setPhoneApp('home') }
                                        title="Volver">
                                        <img src={ phoneBackBtnIcon } alt="Volver" className="rp-back-btn-sprite" />
                                    </button>
                                    <span className="rp-phone-top-title">{ phoneAppTitle[phoneApp] }</span>
                                    <span style={ { width: 32 } } />
                                </div>

                                <div className="rp-app-scroll">
                                    { phoneApp === 'news' && (
                                        selectedArticle ? (
                                            <div className="rp-news-reader">
                                                <div
                                                    className="rp-news-reader-hero"
                                                    style={ { backgroundImage: `url('${ selectedArticle.image || selectedArticle.images || '/img/rp_city_banner_hd.jpg' }')` } } />
                                                <h4>{ selectedArticle.title }</h4>
                                                <p>{ String(selectedArticle.full_story || selectedArticle.short_story || '').replace(/<[^>]+>/g, '') }</p>
                                            </div>
                                        ) : (
                                            <div className="rp-app-stack">
                                                <div className="rp-app-sec-title">Últimas Noticias</div>
                                                { newsData.articles.length === 0 ? (
                                                    <div className="rp-phone-card">
                                                        <b>Habbten RP</b>
                                                        <span className="rp-pc-desc">Recorre los 10 distritos, postúlate a empleos y conquista territorios.</span>
                                                    </div>
                                                ) : newsData.articles.map(art => (
                                                    <div
                                                        key={ art.id }
                                                        className="rp-phone-news-banner"
                                                        style={ { backgroundImage: `url('${ art.image || art.images || '/img/rp_city_night_hd.jpg' }')` } }
                                                        onClick={ () => setSelectedArticle(art) }>
                                                        <span>{ art.title }</span>
                                                    </div>
                                                )) }

                                                <div className="rp-app-sec-title" style={ { marginTop: 6 } }>Sucesos recientes</div>
                                                { (newsData.events.length > 0 ? newsData.events : state.recentEvents || []).slice(0, 8).map(ev => (
                                                    <div key={ ev.id } className="rp-phone-card is-compact">
                                                        <span>{ ev.message }</span>
                                                    </div>
                                                )) }
                                            </div>
                                        )
                                    ) }

                                    { phoneApp === 'map' && (
                                        <div className="rp-app-stack">
                                            { state.locations.map(loc => {
                                                const here = loc.slug === character.current_location;
                                                return (
                                                    <div key={ loc.slug } className={ `rp-phone-card ${ here ? 'is-highlight' : '' }` }>
                                                        <div className="rp-pc-top">
                                                            <b>{ loc.name }</b>
                                                            <span className={ `rp-tag ${ loc.is_safe_zone ? 'is-safe' : 'is-pvp' }` }>
                                                                { loc.is_safe_zone ? 'SEGURA' : 'PVP' }
                                                            </span>
                                                        </div>
                                                        <span className="rp-pc-desc">{ loc.description }</span>
                                                        <div className="rp-pc-foot">
                                                            <span className="rp-pc-muted">{ loc.online_users || 0 } en sala</span>
                                                            { here ? (
                                                                <span className="rp-tag is-safe">Aquí</span>
                                                            ) : (
                                                                <div className="rp-btn-row">
                                                                    <button type="button" className="rp-btn is-dark is-xs" disabled={ busy } onClick={ () => handleTravel(loc.slug, false) }>
                                                                        { character.active_vehicle ? 'Auto' : 'Ir' }
                                                                    </button>
                                                                    { !character.active_vehicle && (
                                                                        <button type="button" className="rp-btn is-gold is-xs" disabled={ busy } onClick={ () => handleTravel(loc.slug, true) }>
                                                                            Taxi $25
                                                                        </button>
                                                                    ) }
                                                                </div>
                                                            ) }
                                                        </div>
                                                    </div>
                                                );
                                            }) }
                                        </div>
                                    ) }

                                    { phoneApp === 'jobs' && (
                                        <div className="rp-app-stack">
                                            <div className="rp-phone-card is-highlight">
                                                <div className="rp-pc-top">
                                                    <b>{ job.name } (Rango { character.job_rank })</b>
                                                    <span className="rp-tag is-safe">${ job.base_pay }/t</span>
                                                </div>
                                                <div className="rp-btn-row" style={ { marginTop: 6 } }>
                                                    <button type="button" className="rp-btn is-green is-sm" disabled={ busy } onClick={ () => runAction('/job/work') }>Trabajar</button>
                                                    <button type="button" className="rp-btn is-dark is-sm" disabled={ busy } onClick={ () => runAction('/job/duty') }>
                                                        { character.on_duty ? 'Salir Turno' : 'Entrar Turno' }
                                                    </button>
                                                </div>
                                            </div>
                                            { state.jobs.map(j => {
                                                const active = j.slug === character.job_slug;
                                                return (
                                                    <div key={ j.slug } className="rp-phone-card">
                                                        <div className="rp-pc-top">
                                                            <b>{ j.name }</b>
                                                            <span className="rp-pc-cash">${ j.base_pay }/t</span>
                                                        </div>
                                                        <span className="rp-pc-desc">{ j.description }</span>
                                                        <div className="rp-pc-foot">
                                                            <span className="rp-pc-muted">Nv.{ j.required_level }+</span>
                                                            { active ? (
                                                                <span className="rp-tag is-safe">Actual</span>
                                                            ) : (
                                                                <button type="button" className="rp-btn is-blue is-xs" disabled={ busy } onClick={ () => runAction('/job/join', { jobSlug: j.slug }) }>
                                                                    Postularme
                                                                </button>
                                                            ) }
                                                        </div>
                                                    </div>
                                                );
                                            }) }
                                        </div>
                                    ) }

                                    { phoneApp === 'bank' && (
                                        <div className="rp-app-stack">
                                            <div className="rp-bank-summary">
                                                <div><span>Efectivo</span><b className="is-cash">${ character.cash.toLocaleString() }</b></div>
                                                <div><span>Banco</span><b className="is-bank">${ character.bank.toLocaleString() }</b></div>
                                            </div>

                                            <div className="rp-phone-card">
                                                <div className="rp-app-sec-title">Operaciones</div>
                                                <input className="rp-p-input" type="number" min={ 1 } value={ bankAmount } onChange={ e => setBankAmount(e.target.value) } placeholder="Cantidad $" />
                                                <div className="rp-btn-row">
                                                    <button type="button" className="rp-btn is-green is-sm" disabled={ busy } onClick={ () => runAction('/bank', { action: 'deposit', amount: Number(bankAmount) }) }>Depositar</button>
                                                    <button type="button" className="rp-btn is-blue is-sm" disabled={ busy } onClick={ () => runAction('/bank', { action: 'withdraw', amount: Number(bankAmount) }) }>Retirar</button>
                                                </div>
                                                <input className="rp-p-input" style={ { marginTop: 6 } } value={ bankTarget } onChange={ e => setBankTarget(e.target.value) } placeholder="Usuario destinatario" />
                                                <div className="rp-btn-row">
                                                    <button type="button" className="rp-btn is-dark is-xs" disabled={ busy } onClick={ () => runAction('/bank', { action: 'transfer', amount: Number(bankAmount), targetUsername: bankTarget }) }>Transferir</button>
                                                    <button type="button" className="rp-btn is-dark is-xs" disabled={ busy } onClick={ () => runAction('/bank', { action: 'pay', amount: Number(bankAmount), targetUsername: bankTarget }) }>Pagar Efectivo</button>
                                                </div>
                                            </div>

                                            <div className="rp-phone-card">
                                                <div className="rp-app-sec-title">Atracos (Alerta 911)</div>
                                                <div className="rp-btn-row">
                                                    <button type="button" className="rp-btn is-red is-xs" disabled={ busy } onClick={ () => runAction('/heist', { targetType: 'supermarket' }) }>Atracar 24/7</button>
                                                    <button type="button" className="rp-btn is-red is-xs" disabled={ busy } onClick={ () => runAction('/heist', { targetType: 'bank' }) }>Atracar Banco</button>
                                                </div>
                                            </div>

                                            <div className="rp-app-sec-title">Propiedades</div>
                                            { state.properties.map(p => (
                                                <div key={ p.slug } className="rp-phone-card">
                                                    <div className="rp-pc-top">
                                                        <b>{ p.name }</b>
                                                        <span className="rp-pc-cash">${ p.price.toLocaleString() }</span>
                                                    </div>
                                                    <div className="rp-pc-foot">
                                                        <span className="rp-pc-muted">{ p.owner_name ? `Dueño: ${ p.owner_name }` : 'Disponible' }</span>
                                                        { p.owner_id === 0 && (
                                                            <button type="button" className="rp-btn is-green is-xs" disabled={ busy } onClick={ () => runAction('/properties/buy', { propertySlug: p.slug }) }>Comprar</button>
                                                        ) }
                                                    </div>
                                                </div>
                                            )) }
                                        </div>
                                    ) }

                                    { phoneApp === 'gangs' && (
                                        <div className="rp-app-stack">
                                            { state.gang ? (
                                                <div className="rp-phone-card is-highlight">
                                                    <div className="rp-pc-top">
                                                        <b>[{ state.gang.tag }] { state.gang.name }</b>
                                                        <button type="button" className="rp-btn is-red is-xs" disabled={ busy } onClick={ () => runAction('/gangs/leave') }>Salir</button>
                                                    </div>
                                                    <span className="rp-pc-desc">{ state.gang.motto }</span>
                                                    <span className="rp-pc-muted">{ state.gang.member_count } miembros · { state.gang.kills } KO · ${ state.gang.bank_balance.toLocaleString() }</span>
                                                </div>
                                            ) : (
                                                <div className="rp-phone-card">
                                                    <div className="rp-app-sec-title">Fundar Banda ($2,500)</div>
                                                    <input className="rp-p-input" placeholder="Nombre de banda" value={ gangForm.name } onChange={ e => setGangForm({ ...gangForm, name: e.target.value }) } />
                                                    <input className="rp-p-input" placeholder="TAG (ej: SUR)" maxLength={ 6 } value={ gangForm.tag } onChange={ e => setGangForm({ ...gangForm, tag: e.target.value }) } />
                                                    <button type="button" className="rp-btn is-red is-sm" disabled={ busy } onClick={ () => runAction('/gangs/create', gangForm, () => rpGetGangs().then(r => r?.success && setGangsList(r.gangs || []))) }>
                                                        Fundar Banda
                                                    </button>
                                                </div>
                                            ) }

                                            <div className="rp-app-sec-title">Territorios</div>
                                            { state.turfs.map(t => (
                                                <div key={ t.slug } className="rp-phone-card">
                                                    <div className="rp-pc-top">
                                                        <b>{ t.name }</b>
                                                        <span className="rp-pc-cash">+${ t.income_per_cycle }</span>
                                                    </div>
                                                    <div className="rp-pc-foot">
                                                        <span className="rp-pc-muted">{ t.owner_gang_tag ? `[${ t.owner_gang_tag }] ${ t.owner_gang_name }` : 'Sin dueño' }</span>
                                                        { state.gang && (
                                                            <button type="button" className="rp-btn is-red is-xs" disabled={ busy } onClick={ () => runAction('/turfs/capture', { turfSlug: t.slug }) }>Conquistar</button>
                                                        ) }
                                                    </div>
                                                </div>
                                            )) }

                                            { !state.gang && gangsList.length > 0 && (
                                                <>
                                                    <div className="rp-app-sec-title">Unirse a una Banda</div>
                                                    { gangsList.map(g => (
                                                        <div key={ g.id } className="rp-phone-card">
                                                            <div className="rp-pc-top">
                                                                <b>[{ g.tag }] { g.name }</b>
                                                                <button type="button" className="rp-btn is-blue is-xs" disabled={ busy } onClick={ () => runAction('/gangs/join', { gangId: g.id }) }>Unirme</button>
                                                            </div>
                                                        </div>
                                                    )) }
                                                </>
                                            ) }
                                        </div>
                                    ) }

                                    { phoneApp === 'actions' && (
                                        <div className="rp-app-stack">
                                            <div className="rp-phone-card">
                                                <div className="rp-app-sec-title">Emergencia 911</div>
                                                <input className="rp-p-input" value={ call911Msg } onChange={ e => setCall911Msg(e.target.value) } placeholder="Describe la emergencia..." />
                                                <div className="rp-btn-row">
                                                    <button type="button" className="rp-btn is-blue is-sm" disabled={ busy } onClick={ () => runAction('/911', { service: 'police', message: call911Msg }, () => setCall911Msg('')) }>
                                                        Policía
                                                    </button>
                                                    <button type="button" className="rp-btn is-green is-sm" disabled={ busy } onClick={ () => runAction('/911', { service: 'medic', message: call911Msg }, () => setCall911Msg('')) }>
                                                        Médicos
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="rp-phone-card">
                                                <div className="rp-app-sec-title">Acción Directa</div>
                                                <input className="rp-p-input" value={ targetPlayer } onChange={ e => setTargetPlayer(e.target.value) } placeholder="Nombre del jugador" />
                                                <input className="rp-p-input" value={ arrestReason } onChange={ e => setArrestReason(e.target.value) } placeholder="Motivo (si arrestas)" />
                                                <div className="rp-btn-grid2">
                                                    <button type="button" className="rp-btn is-red is-xs" disabled={ busy } onClick={ () => runAction('/combat/attack', { target: targetPlayer }) }>Golpear</button>
                                                    <button type="button" className="rp-btn is-green is-xs" disabled={ busy } onClick={ () => runAction('/medic/heal', { target: targetPlayer }) }>Curar</button>
                                                    <button type="button" className="rp-btn is-blue is-xs" disabled={ busy } onClick={ () => runAction('/police/action', { action: 'cuff', target: targetPlayer }) }>Esposar</button>
                                                    <button type="button" className="rp-btn is-blue is-xs" disabled={ busy } onClick={ () => runAction('/police/action', { action: 'arrest', target: targetPlayer, reason: arrestReason }) }>Arrestar</button>
                                                </div>
                                            </div>
                                        </div>
                                    ) }

                                    { phoneApp === 'rankings' && (
                                        <div className="rp-app-stack">
                                            <div className="rp-app-sec-title">Top Millonarios</div>
                                            { (rankings?.richest || []).slice(0, 6).map((r: any, i: number) => (
                                                <div key={ r.user_id } className="rp-rank-line">
                                                    <span>#{ i + 1 } { r.username }</span>
                                                    <b className="is-cash">${ Number(r.net_worth || 0).toLocaleString() }</b>
                                                </div>
                                            )) }
                                            <div className="rp-app-sec-title" style={ { marginTop: 8 } }>Top Combate</div>
                                            { (rankings?.fighters || []).slice(0, 6).map((f: any, i: number) => (
                                                <div key={ f.user_id } className="rp-rank-line">
                                                    <span>#{ i + 1 } { f.username }</span>
                                                    <b>{ f.kills } KO</b>
                                                </div>
                                            )) }
                                        </div>
                                    ) }

                                </div>
                            </div>
                        ) }
                    </div>

                    <div className="rp-phone-bottom-bezel">
                        <button
                            type="button"
                            className="rp-phone-home-btn"
                            title="Inicio del celular"
                            onClick={ () => { setSelectedArticle(null); setActiveChatUserId(null); setPhoneApp(phoneUnlocked ? 'home' : 'lock'); } } />
                    </div>
                </section>
            ) }

            {/* ==================== CATÁLOGO / TIENDA (3 COLUMNAS) ==================== */}
            { sideModal === 'shop' && (
                <section className="rp-catalog-win" aria-label="Catálogo">
                    <div className="rp-win-header">
                        <span className="rp-win-title">Catálogo</span>
                        <button type="button" className="rp-habbo-close-btn" onClick={ () => setSideModal(null) } title="Cerrar">
                            <FaTimes />
                        </button>
                    </div>

                    <div className="rp-catalog-body">
                        <div className="rp-cat-sidebar">
                            <div className="rp-white-search">
                                <FaSearch className="rp-search-ico" />
                                <input
                                    type="text"
                                    value={ shopSearch }
                                    onChange={ e => setShopSearch(e.target.value) }
                                    placeholder="Buscar" />
                            </div>

                            <div className="rp-cat-navlist">
                                { SHOP_CATEGORIES.map(cat => (
                                    <button
                                        key={ cat.id }
                                        type="button"
                                        className={ `rp-cat-navitem ${ shopCategory === cat.id ? 'is-active' : '' }` }
                                        onClick={ () => { setShopCategory(cat.id); setSelectedShopSlug(''); setShopQty(1); } }>
                                        <img src={ cat.icon } alt="" className="rp-cat-sprite" />
                                        <span>{ cat.label }</span>
                                    </button>
                                )) }
                            </div>
                        </div>

                        <div className="rp-cat-center">
                            <div className="rp-cat-banner" style={ { backgroundImage: `url('${ activeShopMeta.banner }')` } }>
                                <span>{ activeShopMeta.label }</span>
                            </div>

                            <div className="rp-cat-grid">
                                { filteredShop.map(item => {
                                    const active = selectedShopItem?.slug === item.slug;
                                    return (
                                        <button
                                            key={ item.slug }
                                            type="button"
                                            className={ `rp-cat-slot ${ active ? 'is-selected' : '' }` }
                                            onClick={ () => { setSelectedShopSlug(item.slug || ''); setShopQty(1); } }
                                            title={ item.name }>
                                            <img
                                                src={ getItemSpriteIcon(shopCategory === 'gym' ? 'gym' : item.category) }
                                                alt={ item.name }
                                                className="rp-slot-sprite" />
                                            <span className="rp-slot-price">${ item.price }</span>
                                        </button>
                                    );
                                }) }
                            </div>
                        </div>

                        <div className="rp-cat-detail">
                            { selectedShopItem ? (
                                <>
                                    <div className="rp-detail-name">{ selectedShopItem.name }</div>
                                    <div className="rp-detail-preview">
                                        <img
                                            src={ getItemSpriteIcon(shopCategory === 'gym' ? 'gym' : selectedShopItem.category) }
                                            alt={ selectedShopItem.name }
                                            className="rp-detail-sprite" />
                                    </div>
                                    <p className="rp-detail-desc">{ selectedShopItem.description }</p>

                                    <div className="rp-detail-divider" />

                                    <div className="rp-detail-pricing">
                                        <div className="rp-detail-total">${ (selectedShopItem.price * (shopCategory === 'gym' ? 1 : Math.max(1, shopQty))).toLocaleString() }</div>
                                        <div className="rp-detail-sub">${ selectedShopItem.price.toLocaleString() } c/u</div>
                                        <div className="rp-detail-sub">Saldo ${ character.cash.toLocaleString() }</div>
                                    </div>

                                    { shopCategory !== 'gym' && (
                                        <div className="rp-detail-qty-row">
                                            <span>Cantidad</span>
                                            <input
                                                type="number"
                                                min={ 1 }
                                                max={ 20 }
                                                value={ shopQty }
                                                onChange={ e => setShopQty(Math.max(1, Math.min(20, Number(e.target.value) || 1))) } />
                                        </div>
                                    ) }

                                    <button
                                        type="button"
                                        className="rp-catalog-buy-btn"
                                        disabled={ busy }
                                        onClick={ handleShopBuy }>
                                        { shopCategory === 'gym' ? 'Entrenar' : 'Comprar' }
                                    </button>
                                </>
                            ) : (
                                <div className="rp-detail-empty">No hay artículos en esta categoría.</div>
                            ) }
                        </div>
                    </div>
                </section>
            ) }

            {/* ==================== INVENTARIO (3 COLUMNAS) ==================== */}
            { sideModal === 'inventory' && (
                <section className="rp-inventory-win" aria-label="Inventario">
                    <div className="rp-win-header">
                        <span className="rp-win-title">Inventario</span>
                        <button type="button" className="rp-habbo-close-btn" onClick={ () => setSideModal(null) } title="Cerrar">
                            <FaTimes />
                        </button>
                    </div>

                    <div className="rp-inventory-body">
                        <div className="rp-inv-sidebar">
                            { INV_CATEGORIES.map(cat => (
                                <button
                                    key={ cat.id }
                                    type="button"
                                    className={ `rp-cat-navitem ${ invCategory === cat.id ? 'is-active' : '' }` }
                                    onClick={ () => { setInvCategory(cat.id); setSelectedInvSlug(''); } }>
                                    <img src={ cat.icon } alt="" className="rp-cat-sprite" />
                                    <span>{ cat.label }</span>
                                </button>
                            )) }
                        </div>

                        <div className="rp-inv-center">
                            <div className="rp-white-search">
                                <FaSearch className="rp-search-ico" />
                                <input
                                    type="text"
                                    value={ invSearch }
                                    onChange={ e => setInvSearch(e.target.value) }
                                    placeholder="Buscar en inventario" />
                            </div>
                            <div className="rp-inv-count">
                                { filteredInv.reduce((acc, it) => acc + Number(it.quantity || 1), 0) } objetos guardados
                            </div>

                            <div className="rp-cat-grid">
                                { filteredInv.map(item => {
                                    const slug = item.item_slug || item.slug || '';
                                    const active = (selectedInvItem?.item_slug || selectedInvItem?.slug) === slug;
                                    return (
                                        <button
                                            key={ slug }
                                            type="button"
                                            className={ `rp-cat-slot ${ active ? 'is-selected' : '' }` }
                                            onClick={ () => setSelectedInvSlug(slug) }
                                            title={ item.name }>
                                            <img src={ getItemSpriteIcon(item.category) } alt={ item.name } className="rp-slot-sprite" />
                                            <span className="rp-slot-price">×{ item.quantity || 1 }</span>
                                        </button>
                                    );
                                }) }
                            </div>
                        </div>

                        <div className="rp-inv-detail">
                            { selectedInvItem ? (
                                <>
                                    <div className="rp-detail-name">{ selectedInvItem.name }</div>
                                    <div className="rp-detail-preview">
                                        <img src={ getItemSpriteIcon(selectedInvItem.category) } alt={ selectedInvItem.name } className="rp-detail-sprite" />
                                    </div>
                                    <p className="rp-detail-desc">{ selectedInvItem.description }</p>
                                    <div className="rp-inv-actions">
                                        <button
                                            type="button"
                                            className="rp-inv-btn is-use"
                                            disabled={ busy }
                                            onClick={ () => runAction('/inventory/use', { itemSlug: selectedInvItem.item_slug || selectedInvItem.slug }) }>
                                            { selectedInvItem.category === 'weapon' || selectedInvItem.category === 'vehicle' ? 'Equipar' : 'Usar' }
                                        </button>
                                        <button
                                            type="button"
                                            className="rp-inv-btn is-cancel"
                                            onClick={ () => setSideModal(null) }>
                                            Cerrar
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="rp-detail-name">Tu inventario está vacío</div>
                                    <div className="rp-inv-actions">
                                        <button type="button" className="rp-inv-btn is-use" disabled>Usar</button>
                                        <button type="button" className="rp-inv-btn is-cancel" disabled>Cerrar</button>
                                    </div>
                                </>
                            ) }
                        </div>
                    </div>
                </section>
            ) }

            {/* ==================== AYUDA Y SOPORTE (EXACTA A IMAGEN 2) ==================== */}
            { sideModal === 'help' && (
                <section className="rp-help-win" aria-label="Ayuda y Soporte">
                    <div className="rp-win-header">
                        <span className="rp-win-title">Ayuda y Soporte</span>
                        <button type="button" className="rp-habbo-close-btn" onClick={ () => setSideModal(null) } title="Cerrar">
                            <FaTimes />
                        </button>
                    </div>

                    <div className="rp-help-hero">
                        <div className="rp-help-hero-copy">
                            <h3>¿Cómo podemos ayudarte?</h3>
                            <p>Elige un tema para ver una guía rápida.</p>
                        </div>
                        <img src={ helpLifebuoyImg } alt="" className="rp-help-lifebuoy" />
                    </div>

                    <div className="rp-help-split">
                        <div className="rp-help-nav">
                            { helpTopics.map(t => (
                                <button
                                    key={ t.id }
                                    type="button"
                                    className={ `rp-help-nav-btn ${ helpTopic === t.id ? 'is-active' : '' }` }
                                    onClick={ () => setHelpTopic(t.id) }>
                                    <img src={ t.icon } alt="" className="rp-help-nav-ico" />
                                    <span>{ t.label }</span>
                                </button>
                            )) }
                        </div>

                        <div className="rp-help-content">
                            <h4>{ activeHelp.title }</h4>
                            { activeHelp.paragraphs.map((p, idx) => (
                                <p key={ idx }>{ p }</p>
                            )) }
                            <button type="button" className="rp-help-cta" onClick={ activeHelp.ctaAction }>
                                { activeHelp.ctaLabel }
                            </button>
                        </div>
                    </div>
                </section>
            ) }
            {/* ==================== TABLA FILTRABLE DE COMANDOS (:comandos) ==================== */}
            { sideModal === 'commands' && (
                <section className="rp-commands-win" aria-label="Comandos de Habbten RP">
                    <div className="rp-win-header">
                        <span className="rp-win-title">Comandos de Habbten RP</span>
                        <button type="button" className="rp-habbo-close-btn" onClick={ () => setSideModal(null) } title="Cerrar">
                            <FaTimes />
                        </button>
                    </div>
                    <div className="rp-commands-body">
                        <div className="rp-white-search">
                            <FaSearch className="rp-search-ico" />
                            <input
                                type="text"
                                value={ cmdFilter }
                                onChange={ e => setCmdFilter(e.target.value) }
                                placeholder="Filtrar comandos (ej: :me, policía, curar...)" />
                        </div>
                        <div className="rp-commands-table-wrap">
                            <table className="rp-commands-table">
                                <thead>
                                    <tr>
                                        <th>Comando</th>
                                        <th>Categoría</th>
                                        <th>Descripción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    { RP_COMMANDS_CATALOG.filter(c => {
                                        const q = cmdFilter.trim().toLowerCase();
                                        if(!q) return true;
                                        return c.cmd.toLowerCase().includes(q) || c.group.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q);
                                    }).map(c => (
                                        <tr
                                            key={ c.cmd }
                                            onClick={ () => {
                                                const baseCmd = c.cmd.split(' ')[0];
                                                setChatText(baseCmd + ' ');
                                                setSideModal(null);
                                                setTimeout(() => chatInputRef.current?.focus(), 40);
                                            } }>
                                            <td><code>{ c.cmd }</code></td>
                                            <td><span className="rp-cmd-group">{ c.group }</span></td>
                                            <td>{ c.desc }</td>
                                        </tr>
                                    )) }
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            ) }
        </div>
    );
};
