import { FC, FormEvent, PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    FaBolt,
    FaChevronLeft,
    FaChevronRight,
    FaCommentDots,
    FaHeart,
    FaMoneyBillWave,
    FaSearch,
    FaTimes
} from 'react-icons/fa';
import helpTripleQIcon from '@/assets/images/roleplay/help-triple-q.png';
import iconBuildersClub from '@/assets/images/toolbar/icons/buildersclub.png';
import iconCamera from '@/assets/images/toolbar/icons/camera.png';
import iconCatalog from '@/assets/images/toolbar/icons/catalog.png';
import iconFriends from '@/assets/images/toolbar/icons/friend_all.png';
import iconHouse from '@/assets/images/toolbar/icons/house.png';
import iconInventory from '@/assets/images/toolbar/icons/inventory.png';
import iconMessage from '@/assets/images/toolbar/icons/message.png';
import iconModTools from '@/assets/images/toolbar/icons/modtools.png';
import iconQuest from '@/assets/images/toolbar/icons/quest.png';
import iconRooms from '@/assets/images/toolbar/icons/rooms.png';
import iconAnnouncements from '@/assets/images/toolbar/icons/me-menu/announcements.png';
import iconClothing from '@/assets/images/toolbar/icons/me-menu/clothing.png';
import iconCog from '@/assets/images/toolbar/icons/me-menu/cog.png';
import iconForums from '@/assets/images/toolbar/icons/me-menu/forums.png';
import iconHelperTool from '@/assets/images/toolbar/icons/me-menu/helper-tool.png';
import iconProfile from '@/assets/images/toolbar/icons/me-menu/profile.png';
import iconTalents from '@/assets/images/toolbar/icons/me-menu/talents.png';
import iconHeartSprite from '@/assets/images/icons/sign-heart.png';
import { ChatMessageTypeEnum, CreateLinkEvent, CreateRoomSession, GetRoomSession } from '../../api';
import { useChatInputWidget, useSessionInfo } from '../../hooks';
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

type SideModalTab = null | 'shop' | 'inventory' | 'help';
type PhoneApp = 'lock' | 'home' | 'news' | 'map' | 'jobs' | 'bank' | 'gangs' | 'actions' | 'missions' | 'rankings' | 'settings';

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
    const { sendChat = null } = useChatInputWidget();
    const { chatStyleId = 0 } = useSessionInfo();

    const [ state, setState ] = useState<RpFullState | null>(null);
    const [ sideModal, setSideModal ] = useState<SideModalTab>(null);
    const [ phoneOpen, setPhoneOpen ] = useState<boolean>(false);
    const [ phoneUnlocked, setPhoneUnlocked ] = useState<boolean>(false);
    const [ phoneApp, setPhoneApp ] = useState<PhoneApp>('lock');
    const [ busy, setBusy ] = useState<boolean>(false);
    const [ toasts, setToasts ] = useState<ToastMsg[]>([]);

    // Swipe-to-unlock real (arrastre físico mouse/touch)
    const unlockTrackRef = useRef<HTMLDivElement | null>(null);
    const dragStartXRef = useRef<number>(0);
    const maxDragRef = useRef<number>(0);
    const [ swipeX, setSwipeX ] = useState<number>(0);
    const [ isSwiping, setIsSwiping ] = useState<boolean>(false);

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

    const togglePhone = useCallback((forceState?: boolean) =>
    {
        setPhoneOpen(prev =>
        {
            const next = typeof forceState === 'boolean' ? forceState : !prev;
            if(next !== prev)
            {
                rpSetPhoneHolding(next);
                if(next)
                {
                    setSideModal(null);
                    setSelectedArticle(null);
                    setSwipeX(0);
                    setIsSwiping(false);
                    setPhoneApp(phoneUnlocked ? 'home' : 'lock');
                }
            }
            return next;
        });
    }, [ phoneUnlocked ]);

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

    // Artículos del catálogo (incluyendo entrenamientos del gimnasio en categoría gym)
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

    if(!rpActive || !state) return null;

    const { character, job, clock } = state;
    const hpPct = Math.max(0, Math.min(100, Math.round((character.hp / Math.max(1, character.max_hp)) * 100)));
    const enPct = Math.max(0, Math.min(100, Math.round((character.energy / Math.max(1, character.max_energy)) * 100)));
    const hunPct = Math.max(0, Math.min(100, Math.round(character.hunger)));
    const xpPct = Math.max(0, Math.min(100, Math.round((character.rp_xp / Math.max(1, character.xpForNextLevel)) * 100)));
    const claimableMissions = (state.missions || []).filter(m => m.canClaim).length;
    const activeShopMeta = SHOP_CATEGORIES.find(c => c.id === shopCategory) || SHOP_CATEGORIES[0];

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

    const handleChatSubmit = (e: FormEvent) =>
    {
        e.preventDefault();
        const text = chatText.trim();
        if(!text) return;
        setChatText('');

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

        if(sendChat)
        {
            sendChat(text, ChatMessageTypeEnum.CHAT_DEFAULT, '', chatStyleId);
        }
        if(isMobile) setMobileChatOpen(false);
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
        setSideModal(prev => (prev === tab ? null : tab));
    };

    // Handlers de arrastre físico para Deslizar para Desbloquear
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

    // Apps del Celular usando EXCLUSIVAMENTE los íconos pixel-art originales del juego
    const phoneApps: Array<{ id: string; label: string; icon: string; badge?: number; action: () => void }> = [
        { id: 'contacts', label: 'Contactos', icon: iconFriends, action: () => { CreateLinkEvent('friends/toggle'); } },
        { id: 'messages', label: 'Mensajes', icon: iconMessage, action: () => { CreateLinkEvent('friendlist/toggle'); } },
        { id: 'camera', label: 'Cámara', icon: iconCamera, action: () => { CreateLinkEvent('camera/toggle'); } },
        { id: 'settings', label: 'Ajustes', icon: iconCog, action: () => setPhoneApp('settings') },
        { id: 'missions', label: 'Misiones', icon: iconQuest, badge: claimableMissions, action: () => setPhoneApp('missions') },
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
        news: 'Noticias',
        map: 'GPS Mapa',
        jobs: 'Empleos',
        bank: 'Banco',
        gangs: 'Bandas',
        actions: '911 y Acciones',
        missions: 'Misiones',
        rankings: 'Rankings',
        settings: 'Ajustes'
    };

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

            {/* ==================== BOTONES SUPERIORES DERECHA (ÍCONOS ORIGINALES DEL JUEGO) ==================== */}
            <div className="rp-top-right-tools">
                <button
                    type="button"
                    className="rp-square-btn"
                    title="Cambiar Ropa / Aspecto"
                    onClick={ () => CreateLinkEvent('avatar-editor/toggle') }>
                    <img src={ iconBuildersClub } alt="Aspecto" className="rp-pixel-sprite" />
                </button>
                <button
                    type="button"
                    className={ `rp-square-btn ${ sideModal === 'help' ? 'is-active' : '' }` }
                    title="Ayuda y Comandos"
                    onClick={ () => openSideModal('help') }>
                    <img src={ helpTripleQIcon } alt="Ayuda" className="rp-pixel-sprite" />
                </button>
            </div>

            {/* ==================== DOCK VERTICAL IZQUIERDO (CATÁLOGO · INVENTARIO · CELULAR) ==================== */}
            <aside className="rp-left-dock" aria-label="Herramientas RP">
                <button
                    type="button"
                    className={ `rp-dock-btn ${ sideModal === 'shop' ? 'is-active' : '' }` }
                    title="Catálogo"
                    onClick={ () => openSideModal('shop') }>
                    <img src="/mobile-assets/mob_shop.png" alt="Catálogo" className="rp-dock-icon-hd" />
                </button>
                <button
                    type="button"
                    className={ `rp-dock-btn ${ sideModal === 'inventory' ? 'is-active' : '' }` }
                    title="Inventario"
                    onClick={ () => openSideModal('inventory') }>
                    <img src="/mobile-assets/mob_inventory.png" alt="Inventario" className="rp-dock-icon-hd" />
                </button>
                <button
                    type="button"
                    className={ `rp-dock-btn is-phone ${ phoneOpen ? 'is-active' : '' }` }
                    title="Celular"
                    onClick={ () => togglePhone() }>
                    <img src="/img/rp_phone_icon_hd.png" alt="Celular" className="rp-dock-icon-hd" />
                    { (claimableMissions > 0 || !phoneUnlocked) && <span className="rp-dock-dot" /> }
                </button>
            </aside>

            {/* ==================== HUD INFERIOR IZQUIERDA + BARRA CHAT BLANCA ==================== */}
            <div className="rp-bottom-cluster">
                <div className="rp-char-hud" onClick={ () => togglePhone(true) } title="Abrir celular">
                    <div className="rp-char-avatar-box">
                        <img
                            className="rp-char-head-img"
                            src={ `/habbo-imaging/avatarimage?figure=${ encodeURIComponent(state.user.look || '') }&headonly=1&size=m&direction=2&head_direction=2` }
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
                            type="text"
                            className="rp-chat-field"
                            value={ chatText }
                            onChange={ e => setChatText(e.target.value) }
                            placeholder="Di algo o escribe :me, :do, :trabajar, :911..."
                            maxLength={ 140 } />
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
                        onChange={ e => setChatText(e.target.value) }
                        placeholder="Escribe en sala o usa :me, :trabajar..."
                        maxLength={ 140 }
                        autoFocus />
                    <button type="submit" className="rp-btn is-green">Enviar</button>
                </form>
            ) }

            {/* ==================== SMARTPHONE DEL AVATAR ==================== */}
            { phoneOpen && (
                <section className="rp-phone-device" aria-label="Celular Habbten RP">
                    <div className="rp-phone-top-bezel">
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

                        {/* PANTALLA DE BLOQUEO CON SLIDER REAL DE ARRASTRE */}
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

                        {/* PANTALLA DE INICIO CON ÍCONOS ORIGINALES DEL JUEGO (EXACTO A REFERENCIA) */}
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

                        {/* APPS INTERNAS DEL CELULAR */}
                        { phoneApp !== 'lock' && phoneApp !== 'home' && (
                            <div className="rp-phone-appview">
                                <div className="rp-app-navbar">
                                    <button
                                        type="button"
                                        className="rp-app-back"
                                        onClick={ () => selectedArticle ? setSelectedArticle(null) : setPhoneApp('home') }>
                                        <FaChevronLeft />
                                        <span>{ selectedArticle ? 'Noticias' : 'Inicio' }</span>
                                    </button>
                                    <span className="rp-app-navtitle">{ phoneAppTitle[phoneApp] }</span>
                                    <span style={ { width: 48 } } />
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

                                    { phoneApp === 'missions' && (
                                        <div className="rp-app-stack">
                                            { (state.missions || []).map(m => {
                                                const pct = Math.min(100, Math.round((m.progress / Math.max(1, m.target)) * 100));
                                                return (
                                                    <div key={ m.slug } className="rp-phone-card">
                                                        <div className="rp-pc-top">
                                                            <b>{ m.title }</b>
                                                            <span className="rp-pc-cash">+${ m.rewardCash }</span>
                                                        </div>
                                                        <span className="rp-pc-desc">{ m.description }</span>
                                                        <div className="rp-mini-prog"><div style={ { width: `${ pct }%` } } /></div>
                                                        <div className="rp-pc-foot">
                                                            <span className="rp-pc-muted">{ m.progress }/{ m.target } · +{ m.rewardXp } XP</span>
                                                            { m.claimed ? (
                                                                <span className="rp-tag is-safe">Cobrada</span>
                                                            ) : m.canClaim ? (
                                                                <button type="button" className="rp-btn is-green is-xs" disabled={ busy } onClick={ () => runAction('/missions/claim', { missionSlug: m.slug }) }>Reclamar</button>
                                                            ) : (
                                                                <span className="rp-pc-muted">En curso</span>
                                                            ) }
                                                        </div>
                                                    </div>
                                                );
                                            }) }
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

                                    { phoneApp === 'settings' && (
                                        <div className="rp-app-stack">
                                            <div className="rp-phone-card">
                                                <div className="rp-pc-top">
                                                    <b>{ state.user.username }</b>
                                                    <span className="rp-tag is-safe">Nv.{ character.rp_level } ({ xpPct }%)</span>
                                                </div>
                                                <div className="rp-vitals-mini">
                                                    <span>Vida: { character.hp }/{ character.max_hp } · Energía: { character.energy }%</span>
                                                    <span>Hambre: { hunPct }% · Chaleco: { character.armor }%</span>
                                                    <span>Fuerza: { character.strength } · Resistencia: { character.stamina_stat }</span>
                                                    <span>Ubicación: { currentLocation?.name || 'Plaza Central' }</span>
                                                </div>
                                            </div>

                                            <button type="button" className="rp-phone-menu-btn" onClick={ () => CreateLinkEvent('user-settings/toggle') }>
                                                Ajustes de Sonido y Cliente
                                            </button>
                                            <button type="button" className="rp-phone-menu-btn" onClick={ () => CreateLinkEvent('avatar-editor/toggle') }>
                                                Cambiar Ropa / Aspecto
                                            </button>
                                            <button type="button" className="rp-phone-menu-btn" onClick={ () => navigateParent('/rp') }>
                                                Inicio de Habbten RP
                                            </button>
                                            <button type="button" className="rp-phone-menu-btn" onClick={ () => navigateParent('/') }>
                                                Entra a Habbten
                                            </button>
                                            <button type="button" className="rp-phone-menu-btn is-danger" onClick={ () => navigateParent('/logout') }>
                                                Cerrar sesión
                                            </button>
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
                            onClick={ () => { setSelectedArticle(null); setPhoneApp(phoneUnlocked ? 'home' : 'lock'); } } />
                    </div>
                </section>
            ) }

            {/* ==================== CATÁLOGO / TIENDA (3 COLUMNAS — EXACTO A IMAGEN 4) ==================== */}
            { sideModal === 'shop' && (
                <section className="rp-catalog-win" aria-label="Catálogo">
                    <div className="rp-win-header">
                        <span className="rp-win-title">Catálogo</span>
                        <button type="button" className="rp-habbo-close-btn" onClick={ () => setSideModal(null) } title="Cerrar">
                            <FaTimes />
                        </button>
                    </div>

                    <div className="rp-catalog-body">
                        {/* Columna izquierda: Buscador + Categorías */}
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

                        {/* Columna central: Banner + Cuadrícula de artículos con precio */}
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

                        {/* Columna derecha: Detalle, Precio, Saldo, Cantidad y Comprar */}
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

            {/* ==================== INVENTARIO (3 COLUMNAS — EXACTO A IMAGEN 5) ==================== */}
            { sideModal === 'inventory' && (
                <section className="rp-inventory-win" aria-label="Inventario">
                    <div className="rp-win-header">
                        <span className="rp-win-title">Inventario</span>
                        <button type="button" className="rp-habbo-close-btn" onClick={ () => setSideModal(null) } title="Cerrar">
                            <FaTimes />
                        </button>
                    </div>

                    <div className="rp-inventory-body">
                        {/* Columna izquierda: Categorías */}
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

                        {/* Columna central: Buscador + Contador + Cuadrícula */}
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

                        {/* Columna derecha: Detalle y botones */}
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

            {/* ==================== AYUDA Y COMANDOS ==================== */}
            { sideModal === 'help' && (
                <section className="rp-help-win" aria-label="Ayuda">
                    <div className="rp-win-header">
                        <span className="rp-win-title">Ayuda y Comandos</span>
                        <button type="button" className="rp-habbo-close-btn" onClick={ () => setSideModal(null) } title="Cerrar">
                            <FaTimes />
                        </button>
                    </div>
                    <div className="rp-help-body">
                        <div className="rp-phone-card">
                            <b>Celular</b>
                            <span className="rp-pc-desc">Pulsa el ícono del celular en el dock izquierdo y desliza la flecha verde para desbloquear Contactos, Mensajes, Cámara, GPS, Empleos, Banco, Bandas, Misiones y Ajustes.</span>
                        </div>
                        <div className="rp-phone-card">
                            <b>Comandos en la barra de chat</b>
                            <div className="rp-cmd-list">
                                <code>:me &lt;acción&gt;</code>
                                <code>:do &lt;entorno&gt;</code>
                                <code>:trabajar</code>
                                <code>:turno</code>
                                <code>:pagar &lt;user&gt; &lt;$&gt;</code>
                                <code>:golpear &lt;user&gt;</code>
                                <code>:esposar &lt;user&gt;</code>
                                <code>:arrestar &lt;user&gt;</code>
                                <code>:curar &lt;user&gt;</code>
                                <code>:robar [tienda|banco]</code>
                                <code>:911 &lt;mensaje&gt;</code>
                            </div>
                        </div>
                    </div>
                </section>
            ) }
        </div>
    );
};
