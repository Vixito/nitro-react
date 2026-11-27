import { FC, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    FaAmbulance,
    FaBolt,
    FaBriefcase,
    FaChevronLeft,
    FaChevronRight,
    FaClipboardList,
    FaCog,
    FaCommentDots,
    FaCrosshairs,
    FaDumbbell,
    FaFlag,
    FaHeart,
    FaMapMarkedAlt,
    FaMoneyBillWave,
    FaNewspaper,
    FaPhoneAlt,
    FaQuestion,
    FaShieldAlt,
    FaSignOutAlt,
    FaStar,
    FaTimes,
    FaTrophy,
    FaTshirt,
    FaUniversity,
    FaUserFriends,
    FaUtensils
} from 'react-icons/fa';
import { ChatMessageTypeEnum, CreateLinkEvent, GetRoomSession } from '../../api';
import { LayoutAvatarImageView } from '../../common';
import { useChatInputWidget, useSessionInfo } from '../../hooks';
import {
    isRoleplayMode,
    RpFullState,
    RpGang,
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

const SHOP_CATS: Array<{ id: string; label: string }> = [
    { id: 'all', label: 'Todo' },
    { id: 'food', label: 'Comida' },
    { id: 'medical', label: 'Salud' },
    { id: 'weapon', label: 'Armas' },
    { id: 'armor', label: 'Chalecos' },
    { id: 'vehicle', label: 'Autos' }
];

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

    const [ shopCategory, setShopCategory ] = useState<string>('all');
    const [ bankAmount, setBankAmount ] = useState<string>('250');
    const [ bankTarget, setBankTarget ] = useState<string>('');
    const [ targetPlayer, setTargetPlayer ] = useState<string>('');
    const [ arrestReason, setArrestReason ] = useState<string>('Delitos en Ciudad Habbten');
    const [ call911Msg, setCall911Msg ] = useState<string>('');
    const [ chatText, setChatText ] = useState<string>('');
    const [ mobileChatOpen, setMobileChatOpen ] = useState<boolean>(false);

    const [ gangsList, setGangsList ] = useState<RpGang[]>([]);
    const [ gangForm, setGangForm ] = useState({ name: '', tag: '', color: '#dc2626', motto: '' });
    const [ rankings, setRankings ] = useState<any>(null);
    const [ newsData, setNewsData ] = useState<{ articles: any[]; events: any[] }>({ articles: [], events: [] });
    const [ selectedArticle, setSelectedArticle ] = useState<any>(null);

    const lastServerLocRef = useRef<string>('');

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
                if(nextLocSlug && lastServerLocRef.current && nextLocSlug !== lastServerLocRef.current)
                {
                    const targetLoc = (json.locations || []).find(l => l.slug === nextLocSlug);
                    if(targetLoc && targetLoc.room_id > 0 && GetRoomSession()?.roomId !== targetLoc.room_id)
                    {
                        CreateLinkEvent(`navigator/goto/${ targetLoc.room_id }`);
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

    // Cargar datos dinámicos cuando se abren las apps del Smartphone
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

    // Animación del avatar sosteniendo el celular en la sala
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
            return 'Ciudad Habbten';
        }
    }, []);

    if(!rpActive || !state) return null;

    const { character, job, clock } = state;
    const hpPct = Math.max(0, Math.min(100, Math.round((character.hp / Math.max(1, character.max_hp)) * 100)));
    const enPct = Math.max(0, Math.min(100, Math.round((character.energy / Math.max(1, character.max_energy)) * 100)));
    const hunPct = Math.max(0, Math.min(100, Math.round(character.hunger)));
    const xpPct = Math.max(0, Math.min(100, Math.round((character.rp_xp / Math.max(1, character.xpForNextLevel)) * 100)));
    const claimableMissions = (state.missions || []).filter(m => m.canClaim).length;
    const filteredShop = state.catalog.filter(it => shopCategory === 'all' || it.category === shopCategory);

    const handleTravel = (slug: string, useTaxi: boolean) =>
    {
        runAction('/travel', { locationSlug: slug, useTaxi }, res =>
        {
            lastServerLocRef.current = slug;
            const targetRoomId = Number(res?.roomId || 0);
            if(targetRoomId > 0 && GetRoomSession()?.roomId !== targetRoomId)
            {
                CreateLinkEvent(`navigator/goto/${ targetRoomId }`);
            }
            togglePhone(false);
        });
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

    const unlockPhone = () =>
    {
        setPhoneUnlocked(true);
        setPhoneApp('home');
    };

    const phoneAppsGrid: Array<{ id: PhoneApp; label: string; color: string; badge?: number; icon: JSX.Element }> = [
        { id: 'news', label: 'Noticias', color: '#dc2626', icon: <FaNewspaper /> },
        { id: 'map', label: 'GPS Mapa', color: '#16a34a', icon: <FaMapMarkedAlt /> },
        { id: 'jobs', label: 'Empleos', color: '#2563eb', icon: <FaBriefcase /> },
        { id: 'bank', label: 'Banco', color: '#0d9488', icon: <FaUniversity /> },
        { id: 'gangs', label: 'Bandas', color: '#b91c1c', icon: <FaFlag /> },
        { id: 'actions', label: '911 / Calle', color: '#d97706', icon: <FaPhoneAlt /> },
        { id: 'missions', label: 'Misiones', color: '#7c3aed', badge: claimableMissions, icon: <FaClipboardList /> },
        { id: 'rankings', label: 'Rankings', color: '#ca8a04', icon: <FaTrophy /> },
        { id: 'settings', label: 'Ajustes', color: '#475569', icon: <FaCog /> }
    ];

    const phoneAppTitle: Record<PhoneApp, string> = {
        lock: 'Bloqueado',
        home: 'HabbtenOS',
        news: 'Noticias',
        map: 'GPS Ciudad',
        jobs: 'Empleos',
        bank: 'Banco Central',
        gangs: 'Bandas y Turfs',
        actions: '911 y Acciones',
        missions: 'Misiones',
        rankings: 'Rankings RP',
        settings: 'Mi Ciudadano'
    };

    return (
        <div className={ `rp-modern-root ${ isMobile ? 'is-mobile' : 'is-desktop' }` }>

            {/* ==================== AVISOS DE ESTADO CRITICO (ARRIBA CENTRO) ==================== */}
            { (character.jailSecondsLeft > 0 || character.hospitalSecondsLeft > 0 || character.cuffed_by > 0) && (
                <div className="rp-alert-strip">
                    { character.jailSecondsLeft > 0 && (
                        <span className="rp-alert-pill is-jail">Prisión · { character.jailSecondsLeft }s ({ character.jail_reason || 'Arrestado' })</span>
                    ) }
                    { character.hospitalSecondsLeft > 0 && (
                        <span className="rp-alert-pill is-hosp">Hospital Central · Recuperación { character.hospitalSecondsLeft }s</span>
                    ) }
                    { character.cuffed_by > 0 && (
                        <span className="rp-alert-pill is-cuff">Estás esposado por la Policía HPD</span>
                    ) }
                </div>
            ) }

            {/* ==================== TOASTS MODERNOS ==================== */}
            { toasts.length > 0 && (
                <div className="rp-toast-stack">
                    { toasts.map(t => (
                        <div key={ t.id } className={ `rp-toast is-${ t.type }` }>{ t.text }</div>
                    )) }
                </div>
            ) }

            {/* ==================== BOTONES SUPERIORES DERECHA (ESTILO HABBORP) ==================== */}
            <div className="rp-top-right-tools">
                <button
                    type="button"
                    className="rp-square-btn"
                    title="Cambiar Ropa / Look"
                    onClick={ () => CreateLinkEvent('avatar-editor/toggle') }>
                    <FaTshirt />
                </button>
                <button
                    type="button"
                    className={ `rp-square-btn ${ sideModal === 'help' ? 'is-active' : '' }` }
                    title="Ayuda y Comandos RP"
                    onClick={ () => openSideModal('help') }>
                    <FaQuestion />
                </button>
            </div>

            {/* ==================== DOCK VERTICAL IZQUIERDO (TIENDA · MOCHILA · CELULAR) ==================== */}
            <aside className="rp-left-dock" aria-label="Herramientas RP">
                <button
                    type="button"
                    className={ `rp-dock-btn ${ sideModal === 'shop' ? 'is-active' : '' }` }
                    title="Tiendas, Concesionario y Gimnasio"
                    onClick={ () => openSideModal('shop') }>
                    <img src="/mobile-assets/mob_shop.png" alt="Tienda" className="rp-dock-pixel" />
                </button>
                <button
                    type="button"
                    className={ `rp-dock-btn ${ sideModal === 'inventory' ? 'is-active' : '' }` }
                    title="Mochila e Inventario"
                    onClick={ () => openSideModal('inventory') }>
                    <img src="/mobile-assets/mob_inventory.png" alt="Mochila" className="rp-dock-pixel" />
                </button>
                <button
                    type="button"
                    className={ `rp-dock-btn is-phone ${ phoneOpen ? 'is-active' : '' }` }
                    title="Abrir Celular del Avatar"
                    onClick={ () => togglePhone() }>
                    <span className="rp-phone-glyph" aria-hidden="true">
                        <span className="rp-phone-glyph-screen" />
                        <span className="rp-phone-glyph-btn" />
                    </span>
                    { (claimableMissions > 0 || !phoneUnlocked) && <span className="rp-dock-dot" /> }
                </button>
            </aside>

            {/* ==================== TARJETA DE PERSONAJE + CHAT MODERNO INFERIOR ==================== */}
            <div className="rp-bottom-cluster">
                <div className="rp-char-hud" onClick={ () => { if(!phoneOpen) { setPhoneUnlocked(true); setPhoneApp('settings'); togglePhone(true); } } } title="Ver estado completo en tu celular">
                    <div className="rp-char-avatar-box">
                        <LayoutAvatarImageView figure={ state.user.look } direction={ 2 } headOnly={ true } />
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

                {/* Chat blanco moderno (Desktop siempre visible; Móvil botón desplegable) */}
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

            {/* ==================== SMARTPHONE INTERACTIVO DEL AVATAR (ESTILO HABBORP) ==================== */}
            { phoneOpen && (
                <section className="rp-phone-device" aria-label="Celular de Ciudad Habbten">
                    <div className="rp-phone-top-bezel">
                        <span className="rp-phone-cam" />
                        <span className="rp-phone-speaker" />
                        <button type="button" className="rp-phone-close" onClick={ () => togglePhone(false) } title="Guardar celular">
                            <FaTimes />
                        </button>
                    </div>

                    <div className="rp-phone-screen">
                        {/* Barra de estado iOS/HabboRP */}
                        <div className="rp-phone-statusbar">
                            <span className="rp-sb-carrier">HabbtenRP</span>
                            <span className="rp-sb-time">{ clock.formatted }</span>
                            <span className="rp-sb-battery" title="Batería 100%">
                                <span className="rp-sb-battery-fill" />
                            </span>
                        </div>

                        {/* PANTALLA DE BLOQUEO */}
                        { phoneApp === 'lock' && (
                            <div className="rp-phone-lock">
                                <div className="rp-lock-clock-wrap">
                                    <div className="rp-lock-time">{ clock.formatted }</div>
                                    <div className="rp-lock-date">{ formattedDate }</div>
                                    <div className="rp-lock-loc">{ currentLocation?.name || 'Plaza Central' } · { clock.label }</div>
                                </div>

                                <div className="rp-lock-notifs">
                                    { claimableMissions > 0 && (
                                        <div className="rp-lock-notif" onClick={ () => { setPhoneUnlocked(true); setPhoneApp('missions'); } }>
                                            <b>Misiones</b>
                                            <span>Tienes { claimableMissions } recompensa(s) lista(s) para cobrar.</span>
                                        </div>
                                    ) }
                                    <div className="rp-lock-notif" onClick={ () => { setPhoneUnlocked(true); setPhoneApp('news'); } }>
                                        <b>Ciudad Habbten</b>
                                        <span>{ job.name } · Efectivo ${ character.cash.toLocaleString() } · Banco ${ character.bank.toLocaleString() }</span>
                                    </div>
                                </div>

                                <button type="button" className="rp-unlock-bar" onClick={ unlockPhone }>
                                    <span className="rp-unlock-arrow"><FaChevronRight /></span>
                                    <span className="rp-unlock-text">Deslizar para desbloquear</span>
                                </button>
                            </div>
                        ) }

                        {/* PANTALLA PRINCIPAL DE APPS */}
                        { phoneApp === 'home' && (
                            <div className="rp-phone-home">
                                <div className="rp-home-mini-widget">
                                    <div className="rp-home-w-left">
                                        <b>{ currentLocation?.name || 'Ciudad Habbten' }</b>
                                        <span>{ job.name } · { character.on_duty ? 'En turno' : 'Libre' }</span>
                                    </div>
                                    <div className="rp-home-w-right">
                                        <span className="is-cash">${ character.cash.toLocaleString() }</span>
                                        <span className="is-bank">${ character.bank.toLocaleString() } Bco</span>
                                    </div>
                                </div>

                                <div className="rp-app-grid">
                                    { phoneAppsGrid.map(app => (
                                        <button
                                            key={ app.id }
                                            type="button"
                                            className="rp-app-tile"
                                            onClick={ () => { setSelectedArticle(null); setPhoneApp(app.id); } }>
                                            <span className="rp-app-icon" style={ { backgroundColor: app.color } }>
                                                { app.icon }
                                                { !!app.badge && app.badge > 0 && <span className="rp-app-badge">{ app.badge }</span> }
                                            </span>
                                            <span className="rp-app-label">{ app.label }</span>
                                        </button>
                                    )) }
                                </div>

                                <div className="rp-home-quickbar">
                                    <button type="button" className="rp-btn is-green is-sm" disabled={ busy } onClick={ () => runAction('/job/work') }>
                                        Trabajar
                                    </button>
                                    <button type="button" className="rp-btn is-dark is-sm" disabled={ busy } onClick={ () => runAction('/job/duty') }>
                                        { character.on_duty ? 'Salir Turno' : 'Entrar Turno' }
                                    </button>
                                </div>
                            </div>
                        ) }

                        {/* CABECERA COMÚN DE APPS INTERNAS */}
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
                                    {/* APP: NOTICIAS */}
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
                                                        <b>Ciudad Habbten en vivo</b>
                                                        <span>Recorre los 10 distritos, postúlate a empleos y conquista territorios con tu banda.</span>
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

                                                <div className="rp-app-sec-title" style={ { marginTop: 8 } }>Boletín de la Ciudad</div>
                                                { (newsData.events.length > 0 ? newsData.events : state.recentEvents || []).slice(0, 8).map(ev => (
                                                    <div key={ ev.id } className="rp-phone-card is-compact">
                                                        <span>{ ev.message }</span>
                                                    </div>
                                                )) }
                                            </div>
                                        )
                                    ) }

                                    {/* APP: GPS MAPA */}
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

                                    {/* APP: EMPLEOS */}
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

                                    {/* APP: BANCO */}
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

                                    {/* APP: BANDAS */}
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

                                    {/* APP: 911 / ACCIONES */}
                                    { phoneApp === 'actions' && (
                                        <div className="rp-app-stack">
                                            <div className="rp-phone-card">
                                                <div className="rp-app-sec-title">Llamada de Emergencia 911</div>
                                                <input className="rp-p-input" value={ call911Msg } onChange={ e => setCall911Msg(e.target.value) } placeholder="Describe la emergencia..." />
                                                <div className="rp-btn-row">
                                                    <button type="button" className="rp-btn is-blue is-sm" disabled={ busy } onClick={ () => runAction('/911', { service: 'police', message: call911Msg }, () => setCall911Msg('')) }>
                                                        <FaShieldAlt /> Policía
                                                    </button>
                                                    <button type="button" className="rp-btn is-green is-sm" disabled={ busy } onClick={ () => runAction('/911', { service: 'medic', message: call911Msg }, () => setCall911Msg('')) }>
                                                        <FaAmbulance /> Médicos
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="rp-phone-card">
                                                <div className="rp-app-sec-title">Acción Directa</div>
                                                <input className="rp-p-input" value={ targetPlayer } onChange={ e => setTargetPlayer(e.target.value) } placeholder="Nombre del jugador" />
                                                <input className="rp-p-input" value={ arrestReason } onChange={ e => setArrestReason(e.target.value) } placeholder="Motivo (si arrestas)" />
                                                <div className="rp-btn-grid2">
                                                    <button type="button" className="rp-btn is-red is-xs" disabled={ busy } onClick={ () => runAction('/combat/attack', { target: targetPlayer }) }>
                                                        <FaCrosshairs /> Golpear
                                                    </button>
                                                    <button type="button" className="rp-btn is-green is-xs" disabled={ busy } onClick={ () => runAction('/medic/heal', { target: targetPlayer }) }>
                                                        Curar
                                                    </button>
                                                    <button type="button" className="rp-btn is-blue is-xs" disabled={ busy } onClick={ () => runAction('/police/action', { action: 'cuff', target: targetPlayer }) }>
                                                        Esposar
                                                    </button>
                                                    <button type="button" className="rp-btn is-blue is-xs" disabled={ busy } onClick={ () => runAction('/police/action', { action: 'arrest', target: targetPlayer, reason: arrestReason }) }>
                                                        Arrestar
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) }

                                    {/* APP: MISIONES */}
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

                                    {/* APP: RANKINGS */}
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

                                    {/* APP: AJUSTES / PERFIL */}
                                    { phoneApp === 'settings' && (
                                        <div className="rp-app-stack">
                                            <div className="rp-phone-card">
                                                <div className="rp-pc-top">
                                                    <b>{ state.user.username }</b>
                                                    <span className="rp-tag is-safe">Nivel { character.rp_level } ({ xpPct }%)</span>
                                                </div>
                                                <div className="rp-vitals-mini">
                                                    <span><FaHeart style={ { color: '#ef4444' } } /> Vida: { character.hp }/{ character.max_hp }</span>
                                                    <span><FaBolt style={ { color: '#eab308' } } /> Energía: { character.energy }%</span>
                                                    <span><FaUtensils style={ { color: '#22c55e' } } /> Hambre: { hunPct }%</span>
                                                    <span><FaShieldAlt style={ { color: '#38bdf8' } } /> Chaleco: { character.armor }%</span>
                                                    <span>Fuerza: { character.strength } · Resist.: { character.stamina_stat }</span>
                                                    { character.wanted_level > 0 && (
                                                        <span style={ { color: '#f87171' } }><FaStar /> Buscado: { character.wanted_level }/5</span>
                                                    ) }
                                                </div>
                                            </div>

                                            <button type="button" className="rp-phone-menu-btn" onClick={ () => CreateLinkEvent('user-settings/toggle') }>
                                                <FaCog /> <span>Ajustes de Sonido y Cliente</span>
                                            </button>
                                            <button type="button" className="rp-phone-menu-btn" onClick={ () => CreateLinkEvent('avatar-editor/toggle') }>
                                                <FaTshirt /> <span>Cambiar Ropa / Aspecto</span>
                                            </button>
                                            <button type="button" className="rp-phone-menu-btn" onClick={ () => CreateLinkEvent('friends/toggle') }>
                                                <FaUserFriends /> <span>Contactos y Amigos</span>
                                            </button>
                                            <button type="button" className="rp-phone-menu-btn" onClick={ () => navigateParent('/rp') }>
                                                <FaNewspaper /> <span>Portal de Acceso Habbten RP</span>
                                            </button>
                                            <button type="button" className="rp-phone-menu-btn is-danger" onClick={ () => navigateParent('/') }>
                                                <FaSignOutAlt /> <span>Volver a Habbten Clásico</span>
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

            {/* ==================== VENTANAS MODERNAS COMPACTAS (TIENDA / MOCHILA / AYUDA) ==================== */}
            { sideModal && (
                <section className="rp-modern-modal" aria-label="Panel RP">
                    <div className="rp-mm-header">
                        <span>
                            { sideModal === 'shop' && 'Tiendas, Concesionario y Gimnasio' }
                            { sideModal === 'inventory' && 'Mochila e Inventario' }
                            { sideModal === 'help' && 'Guía y Comandos de Ciudad Habbten' }
                        </span>
                        <button type="button" className="rp-mm-close" onClick={ () => setSideModal(null) }><FaTimes /></button>
                    </div>

                    <div className="rp-mm-body">
                        { sideModal === 'shop' && (
                            <>
                                <div className="rp-gym-strip">
                                    <span><FaDumbbell /> Gimnasio · FUE { character.strength } · RES { character.stamina_stat }</span>
                                    <div className="rp-btn-row">
                                        <button type="button" className="rp-btn is-blue is-xs" disabled={ busy } onClick={ () => runAction('/gym/train', { stat: 'strength' }) }>+Fuerza ($35)</button>
                                        <button type="button" className="rp-btn is-green is-xs" disabled={ busy } onClick={ () => runAction('/gym/train', { stat: 'stamina' }) }>+Resist. ($35)</button>
                                    </div>
                                </div>

                                <div className="rp-cat-tabs">
                                    { SHOP_CATS.map(c => (
                                        <button
                                            key={ c.id }
                                            type="button"
                                            className={ `rp-cat-tab ${ shopCategory === c.id ? 'is-active' : '' }` }
                                            onClick={ () => setShopCategory(c.id) }>
                                            { c.label }
                                        </button>
                                    )) }
                                </div>

                                <div className="rp-mm-list">
                                    { filteredShop.map(item => (
                                        <div key={ item.slug } className="rp-phone-card">
                                            <div className="rp-pc-top">
                                                <b>{ item.name }</b>
                                                <span className="rp-pc-cash">${ item.price.toLocaleString() }</span>
                                            </div>
                                            <span className="rp-pc-desc">{ item.description }</span>
                                            <div className="rp-pc-foot">
                                                <span className="rp-pc-muted">
                                                    { item.damage > 0 ? `Daño +${ item.damage } ` : '' }
                                                    { item.heal_hp > 0 ? `HP +${ item.heal_hp } ` : '' }
                                                    { item.restore_hunger > 0 ? `HM +${ item.restore_hunger } ` : '' }
                                                    { item.armor_value > 0 ? `Chaleco +${ item.armor_value } ` : '' }
                                                    { item.speed_bonus > 0 ? `Vel +${ item.speed_bonus }% ` : '' }
                                                </span>
                                                <button type="button" className="rp-btn is-green is-xs" disabled={ busy } onClick={ () => runAction('/shop/buy', { itemSlug: item.slug }) }>
                                                    Comprar
                                                </button>
                                            </div>
                                        </div>
                                    )) }
                                </div>
                            </>
                        ) }

                        { sideModal === 'inventory' && (
                            <div className="rp-mm-list">
                                { state.inventory.length === 0 ? (
                                    <div className="rp-phone-card">
                                        <b>Tu mochila está vacía</b>
                                        <span className="rp-pc-desc">Compra comida, botiquines, chalecos o vehículos en la Tienda del dock izquierdo.</span>
                                    </div>
                                ) : state.inventory.map(item => (
                                    <div key={ item.item_slug || item.slug } className="rp-phone-card">
                                        <div className="rp-pc-top">
                                            <b>{ item.name } ×{ item.quantity || 1 }</b>
                                            <button
                                                type="button"
                                                className="rp-btn is-green is-xs"
                                                disabled={ busy }
                                                onClick={ () => runAction('/inventory/use', { itemSlug: item.item_slug || item.slug }) }>
                                                { item.category === 'weapon' || item.category === 'vehicle' ? 'Equipar' : 'Usar' }
                                            </button>
                                        </div>
                                        <span className="rp-pc-desc">{ item.description }</span>
                                    </div>
                                )) }
                            </div>
                        ) }

                        { sideModal === 'help' && (
                            <div className="rp-app-stack">
                                <div className="rp-phone-card">
                                    <b>Tu Celular es tu centro de control</b>
                                    <span className="rp-pc-desc">Pulsa el ícono del smartphone en la barra izquierda para abrir Noticias, GPS de la ciudad, Empleos, Banco, Bandas, 911, Misiones, Rankings y Ajustes.</span>
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
                        ) }
                    </div>
                </section>
            ) }
        </div>
    );
};
