import { FC, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    FaAmbulance,
    FaBriefcase,
    FaCar,
    FaClipboardList,
    FaCog,
    FaCommentDots,
    FaCrosshairs,
    FaDumbbell,
    FaExclamationTriangle,
    FaFlag,
    FaHome,
    FaMapMarkedAlt,
    FaPhoneAlt,
    FaShoppingBag,
    FaSkull,
    FaStar,
    FaTrophy,
    FaTshirt,
    FaUniversity,
    FaUserFriends
} from 'react-icons/fa';
import { ChatMessageTypeEnum, CreateLinkEvent, GetRoomSession } from '../../api';
import { LayoutAvatarImageView, NitroCardContentView, NitroCardHeaderView, NitroCardView } from '../../common';
import { useChatInputWidget, useSessionInfo } from '../../hooks';
import {
    isRoleplayMode,
    RpFullState,
    RpGang,
    rpGetGangs,
    rpGetRankings,
    rpGetState,
    rpPost
} from './RoleplayService';
import './RoleplayHudView.scss';

type RpPanelTab = null | 'map' | 'jobs' | 'missions' | 'bag' | 'shop' | 'bank' | 'gangs' | 'actions' | 'rankings';

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

export const RoleplayHudView: FC<RoleplayHudViewProps> = ({ isMobile = false, isInRoom = false }) =>
{
    const rpActive = isRoleplayMode();
    const { sendChat = null } = useChatInputWidget();
    const { chatStyleId = 0 } = useSessionInfo();

    const [ state, setState ] = useState<RpFullState | null>(null);
    const [ activePanel, setActivePanel ] = useState<RpPanelTab>(null);
    const [ busy, setBusy ] = useState(false);
    const [ toasts, setToasts ] = useState<ToastMsg[]>([]);
    const [ shopCategory, setShopCategory ] = useState<string>('all');
    const [ bankAmount, setBankAmount ] = useState<string>('250');
    const [ bankTarget, setBankTarget ] = useState<string>('');
    const [ targetPlayer, setTargetPlayer ] = useState<string>('');
    const [ arrestReason, setArrestReason ] = useState<string>('Delitos en Ciudad Habbten');
    const [ call911Msg, setCall911Msg ] = useState<string>('');
    const [ chatText, setChatText ] = useState<string>('');
    const [ shoutMode, setShoutMode ] = useState<boolean>(false);
    const [ mobileChatOpen, setMobileChatOpen ] = useState<boolean>(false);
    const [ gangsList, setGangsList ] = useState<RpGang[]>([]);
    const [ gangForm, setGangForm ] = useState({ name: '', tag: '', color: '#b91c1c', motto: '' });
    const [ rankings, setRankings ] = useState<any>(null);

    const pushToast = useCallback((type: 'ok' | 'err' | 'warn', text: string) =>
    {
        const id = Date.now() + Math.floor(Math.random() * 999);
        setToasts(prev => [ ...prev.slice(-3), { id, type, text } ]);
        setTimeout(() =>
        {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4500);
    }, []);

    const lastServerLocRef = useRef<string>('');

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

    useEffect(() =>
    {
        if(!rpActive) return;
        if(activePanel === 'gangs')
        {
            rpGetGangs().then(r => { if(r?.success) setGangsList(r.gangs || []); }).catch(() => {});
        }
        else if(activePanel === 'rankings')
        {
            rpGetRankings().then(r => { if(r?.success) setRankings(r); }).catch(() => {});
        }
    }, [ rpActive, activePanel ]);

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
            setActivePanel(null);
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
            sendChat(text, shoutMode ? ChatMessageTypeEnum.CHAT_SHOUT : ChatMessageTypeEnum.CHAT_DEFAULT, '', chatStyleId);
        }
        if(isMobile) setMobileChatOpen(false);
    };

    const togglePanel = (tab: RpPanelTab) => setActivePanel(prev => (prev === tab ? null : tab));

    const panelTitleMap: Record<Exclude<RpPanelTab, null>, string> = {
        map: 'GPS — Mapa de Ciudad Habbten',
        jobs: 'Bolsa de Empleo & Turnos',
        missions: 'Contratos y Misiones Diarias',
        bag: 'Mochila RP, Armas y Vehículos',
        shop: 'Tiendas de Ciudad Habbten & Gimnasio',
        bank: 'Banco Central, Atracos y Propiedades',
        gangs: 'Bandas, Mafias y Territorios',
        actions: 'Combate, Policía HPD, Médicos y 911',
        rankings: 'Clasificación de Ciudad Habbten'
    };

    return (
        <div className={ `habbten-rp-root ${ isMobile ? 'is-mobile' : 'is-desktop' }` }>
            {/* Filtro ambiental sutil Día/Noche */}
            <div className={ `rp-ambient-tint phase-${ clock.phase }` } />

            {/* ==================== BARRA SUPERIOR ANCLADA (NO INVADE LA SALA) ==================== */}
            <header className="rp-topbar">
                <div className="rp-topbar-left">
                    { state.user.look && (
                        <div className="rp-head-frame" title={ `${ state.user.username } — Nivel RP ${ character.rp_level }` }>
                            <LayoutAvatarImageView figure={ state.user.look } direction={ 2 } headOnly={ true } />
                        </div>
                    ) }
                    <div className="rp-identity-col">
                        <div className="rp-identity-top">
                            <span className="rp-lvl">NV.{ character.rp_level }</span>
                            <strong className="rp-name">{ state.user.username }</strong>
                            { state.gang && (
                                <span className="rp-gang-chip" style={ { backgroundColor: state.gang.color } }>
                                    [{ state.gang.tag }]
                                </span>
                            ) }
                        </div>
                        <div className="rp-identity-sub">
                            <span className="rp-job-label" style={ { color: job.color } }>{ job.name } R{ character.job_rank }</span>
                            <button
                                type="button"
                                className={ `rp-duty-toggle ${ character.on_duty ? 'is-on' : '' }` }
                                disabled={ busy }
                                onClick={ () => runAction('/job/duty') }
                            >
                                { character.on_duty ? 'EN TURNO' : 'SIN TURNO' }
                            </button>
                        </div>
                    </div>
                </div>

                {/* Barras vitales inline (sin flotar sobre la sala) */}
                <div className="rp-topbar-vitals">
                    <div className="rp-meter" title={ `Vida: ${ character.hp }/${ character.max_hp }` }>
                        <span className="rp-meter-tag">HP</span>
                        <div className="rp-meter-track"><div className="rp-meter-fill is-hp" style={ { width: `${ hpPct }%` } } /></div>
                        <span className="rp-meter-num">{ character.hp }</span>
                    </div>
                    { character.armor > 0 && (
                        <div className="rp-meter" title={ `Blindaje: ${ character.armor }` }>
                            <span className="rp-meter-tag">BL</span>
                            <div className="rp-meter-track"><div className="rp-meter-fill is-armor" style={ { width: `${ character.armor }%` } } /></div>
                            <span className="rp-meter-num">{ character.armor }</span>
                        </div>
                    ) }
                    <div className="rp-meter" title={ `Energía: ${ character.energy }%` }>
                        <span className="rp-meter-tag">EN</span>
                        <div className="rp-meter-track"><div className="rp-meter-fill is-en" style={ { width: `${ enPct }%` } } /></div>
                        <span className="rp-meter-num">{ character.energy }</span>
                    </div>
                    <div className="rp-meter" title={ `Hambre: ${ character.hunger }%` }>
                        <span className="rp-meter-tag">HM</span>
                        <div className="rp-meter-track"><div className="rp-meter-fill is-hm" style={ { width: `${ hunPct }%` } } /></div>
                        <span className="rp-meter-num">{ character.hunger }</span>
                    </div>
                    <div className="rp-xp-strip" title={ `Experiencia RP: ${ character.rp_xp }/${ character.xpForNextLevel }` }>
                        <div className="rp-xp-fill" style={ { width: `${ xpPct }%` } } />
                    </div>
                </div>

                {/* Economía RP + Estrellas + Distrito + Reloj */}
                <div className="rp-topbar-right">
                    <div className="rp-wallet-group">
                        <span className="rp-money-pill is-cash" title="Efectivo en mano">${ character.cash.toLocaleString() }</span>
                        { !isMobile && (
                            <span className="rp-money-pill is-bank" title="Banco Central">B: ${ character.bank.toLocaleString() }</span>
                        ) }
                    </div>

                    { character.wanted_level > 0 && (
                        <div className="rp-stars-pill" title={ `Nivel de búsqueda: ${ character.wanted_level } estrellas` }>
                            { [ 1, 2, 3, 4, 5 ].map(n => (
                                <FaStar key={ n } className={ n <= character.wanted_level ? 'lit' : 'dim' } />
                            )) }
                        </div>
                    ) }

                    { !isMobile && (
                        <button type="button" className="rp-loc-btn" onClick={ () => togglePanel('map') } title="Abrir Mapa de Ciudad Habbten">
                            <span>{ currentLocation?.name || 'Ciudad Habbten' }</span>
                            <em className={ currentLocation?.is_safe_zone ? 'safe' : 'pvp' }>
                                { currentLocation?.is_safe_zone ? 'SEGURA' : 'PVP' }
                            </em>
                        </button>
                    ) }

                    <span className="rp-clock-box" title={ `Hora de Ciudad Habbten (${ clock.label })` }>
                        { clock.formatted }
                    </span>
                </div>
            </header>

            {/* Banners críticos debajo de la barra superior (Prisión / Hospital / Esposas) */}
            { (character.jailSecondsLeft > 0 || character.hospitalSecondsLeft > 0 || character.cuffed_by > 0) && (
                <div className="rp-alert-ribbon">
                    { character.jailSecondsLeft > 0 && (
                        <span className="ribbon-item is-jail">PRISIÓN ESTATAL · { character.jailSecondsLeft }s ({ character.jail_reason || 'Condena' })</span>
                    ) }
                    { character.hospitalSecondsLeft > 0 && (
                        <span className="ribbon-item is-hosp">HOSPITAL CENTRAL · Recuperación { character.hospitalSecondsLeft }s</span>
                    ) }
                    { character.cuffed_by > 0 && (
                        <span className="ribbon-item is-cuff">ESPOSADO POR LA POLICÍA HPD</span>
                    ) }
                </div>
            ) }

            {/* Notificaciones breves RP */}
            { toasts.length > 0 && (
                <div className="rp-toasts">
                    { toasts.map(t => (
                        <div key={ t.id } className={ `rp-toast is-${ t.type }` }>{ t.text }</div>
                    )) }
                </div>
            ) }

            {/* Entrada de chat flotante en Móvil RP */}
            { isMobile && mobileChatOpen && (
                <form className="rp-mobile-chat-bar" onSubmit={ handleChatSubmit }>
                    <button type="button" className={ `rp-chat-mode ${ shoutMode ? 'is-shout' : '' }` } onClick={ () => setShoutMode(v => !v) }>
                        { shoutMode ? 'Gritar' : 'Decir' }
                    </button>
                    <input
                        type="text"
                        value={ chatText }
                        onChange={ e => setChatText(e.target.value) }
                        placeholder="Escribe mensaje o :me / :do / :911..."
                        autoFocus
                    />
                    <button type="submit" className="rp-chat-send">Enviar</button>
                </form>
            ) }

            {/* ==================== BARRA INFERIOR ANCLADA (REEMPLAZA TOOLBAR CLÁSICO) ==================== */}
            <footer className="rp-bottombar">
                <div className="rp-bar-group">
                    <button type="button" className={ `rp-bar-btn ${ activePanel === 'map' ? 'active' : '' }` } onClick={ () => togglePanel('map') } title="Mapa GPS de Ciudad Habbten">
                        <FaMapMarkedAlt /><span>Mapa</span>
                    </button>
                    <button type="button" className={ `rp-bar-btn ${ activePanel === 'jobs' ? 'active' : '' }` } onClick={ () => togglePanel('jobs') } title="Bolsa de Empleo y Turnos">
                        <FaBriefcase /><span>Empleo</span>
                    </button>
                    <button type="button" className={ `rp-bar-btn ${ activePanel === 'missions' ? 'active' : '' } ${ claimableMissions > 0 ? 'has-dot' : '' }` } onClick={ () => togglePanel('missions') } title="Misiones Diarias">
                        <FaClipboardList /><span>Misiones</span>
                    </button>
                    <button type="button" className={ `rp-bar-btn ${ activePanel === 'bag' ? 'active' : '' }` } onClick={ () => togglePanel('bag') } title="Mochila, Armas y Vehículos">
                        <FaShoppingBag /><span>Mochila</span>
                    </button>
                    { !isMobile && (
                        <button type="button" className={ `rp-bar-btn ${ activePanel === 'shop' ? 'active' : '' }` } onClick={ () => togglePanel('shop') } title="Tiendas y Gimnasio">
                            <FaCar /><span>Tiendas</span>
                        </button>
                    ) }
                </div>

                {/* Chat nativo integrado (Escritorio) o botón de chat (Móvil) */}
                { !isMobile ? (
                    <form className="rp-chat-form" onSubmit={ handleChatSubmit }>
                        <button
                            type="button"
                            className={ `rp-chat-mode ${ shoutMode ? 'is-shout' : '' }` }
                            onClick={ () => setShoutMode(v => !v) }
                            title="Alternar entre Decir y Gritar"
                        >
                            { shoutMode ? 'Gritar' : 'Decir' }
                        </button>
                        <input
                            type="text"
                            value={ chatText }
                            onChange={ e => setChatText(e.target.value) }
                            placeholder={ isInRoom ? 'Chatea aquí o usa :me, :do, :golpear, :esposar, :curar, :911...' : 'Cargando Ciudad Habbten...' }
                            maxLength={ 120 }
                        />
                        <button type="button" className="rp-quick-work" disabled={ busy } onClick={ () => runAction('/job/work') } title="Completar tarea laboral rápida">
                            Trabajar
                        </button>
                    </form>
                ) : (
                    <button type="button" className={ `rp-bar-btn is-primary ${ mobileChatOpen ? 'active' : '' }` } onClick={ () => setMobileChatOpen(v => !v) }>
                        <FaCommentDots /><span>Chat</span>
                    </button>
                ) }

                <div className="rp-bar-group">
                    { isMobile && (
                        <button type="button" className={ `rp-bar-btn ${ activePanel === 'shop' ? 'active' : '' }` } onClick={ () => togglePanel('shop') }>
                            <FaCar /><span>Tienda</span>
                        </button>
                    ) }
                    <button type="button" className={ `rp-bar-btn ${ activePanel === 'bank' ? 'active' : '' }` } onClick={ () => togglePanel('bank') } title="Banco, Atracos y Propiedades">
                        <FaUniversity /><span>Banco</span>
                    </button>
                    <button type="button" className={ `rp-bar-btn ${ activePanel === 'gangs' ? 'active' : '' }` } onClick={ () => togglePanel('gangs') } title="Bandas y Territorios">
                        <FaFlag /><span>Bandas</span>
                    </button>
                    <button type="button" className={ `rp-bar-btn ${ activePanel === 'actions' ? 'active' : '' }` } onClick={ () => togglePanel('actions') } title="Combate, Policía, Médicos y 911">
                        <FaCrosshairs /><span>911</span>
                    </button>
                    { !isMobile && (
                        <>
                            <button type="button" className={ `rp-bar-btn ${ activePanel === 'rankings' ? 'active' : '' }` } onClick={ () => togglePanel('rankings') } title="Top Ciudad Habbten">
                                <FaTrophy /><span>Top</span>
                            </button>
                            <button type="button" className="rp-bar-btn is-icon" onClick={ () => CreateLinkEvent('avatar-editor/toggle') } title="Cambiar ropa">
                                <FaTshirt />
                            </button>
                            <button type="button" className="rp-bar-btn is-icon" onClick={ () => CreateLinkEvent('friends/toggle') } title="Amigos">
                                <FaUserFriends />
                            </button>
                            <button type="button" className="rp-bar-btn is-icon" onClick={ () => CreateLinkEvent('user-settings/toggle') } title="Ajustes">
                                <FaCog />
                            </button>
                        </>
                    ) }
                </div>
            </footer>

            {/* ==================== VENTANA NATIVA HABBO ARRASTRABLE (NitroCardView) ==================== */}
            { activePanel && (
                <NitroCardView uniqueKey={ `rp-window-${ activePanel }` } className="habbten-rp-card" theme="primary-slim">
                    <NitroCardHeaderView headerText={ panelTitleMap[activePanel] } onCloseClick={ () => setActivePanel(null) } />
                    <NitroCardContentView className="rp-card-content">
                        {/* 1. MAPA GPS */}
                        { activePanel === 'map' && (
                            <div className="rp-win-stack">
                                <div className="rp-city-map-board">
                                    <div className="rp-city-roads" />
                                    { state.locations.map(loc =>
                                    {
                                        const isHere = character.current_location === loc.slug;
                                        return (
                                            <button
                                                key={ loc.slug }
                                                type="button"
                                                className={ `rp-map-marker ${ isHere ? 'is-here' : '' }` }
                                                style={ { left: `${ loc.map_x }%`, top: `${ loc.map_y }%` } }
                                                onClick={ () => handleTravel(loc.slug, false) }
                                            >
                                                <span className="m-dot" style={ { backgroundColor: loc.color } } />
                                                <span className="m-name">{ loc.name }</span>
                                                <span className="m-cnt">{ loc.online_users }</span>
                                            </button>
                                        );
                                    }) }
                                </div>

                                <div className="rp-list-rows">
                                    { state.locations.map(loc => (
                                        <div key={ loc.slug } className="rp-item-row">
                                            <div className="rp-item-info">
                                                <div className="rp-item-title">
                                                    <span className="swatch" style={ { background: loc.color } } />
                                                    <strong>{ loc.name }</strong>
                                                    <span className={ `rp-tag ${ loc.is_safe_zone ? 'is-safe' : 'is-pvp' }` }>
                                                        { loc.is_safe_zone ? 'SEGURA' : 'PVP' }
                                                    </span>
                                                </div>
                                                <small>{ loc.description }</small>
                                            </div>
                                            <div className="rp-row-actions">
                                                <button type="button" className="hb-win-btn is-blue" disabled={ busy } onClick={ () => handleTravel(loc.slug, false) }>
                                                    { character.active_vehicle ? 'Conducir' : 'Ir (-5 EN)' }
                                                </button>
                                                { !character.active_vehicle && (
                                                    <button type="button" className="hb-win-btn is-amber" disabled={ busy } onClick={ () => handleTravel(loc.slug, true) }>
                                                        Taxi $25
                                                    </button>
                                                ) }
                                            </div>
                                        </div>
                                    )) }
                                </div>
                            </div>
                        ) }

                        {/* 2. EMPLEOS */}
                        { activePanel === 'jobs' && (
                            <div className="rp-win-stack">
                                <div className="rp-strip-bar">
                                    <span><b>Tu empleo:</b> { job.name } (Rango { character.job_rank }/{ job.max_rank })</span>
                                    <div className="rp-row-actions">
                                        <button type="button" className="hb-win-btn is-blue" disabled={ busy } onClick={ () => runAction('/job/duty') }>
                                            { character.on_duty ? 'Terminar Turno' : 'Iniciar Turno' }
                                        </button>
                                        <button type="button" className="hb-win-btn is-green" disabled={ busy } onClick={ () => runAction('/job/work') }>
                                            Tarea Rápida
                                        </button>
                                    </div>
                                </div>
                                <div className="rp-win-grid">
                                    { state.jobs.map(j =>
                                    {
                                        const isMine = character.job_slug === j.slug;
                                        return (
                                            <div key={ j.slug } className={ `rp-box-card ${ isMine ? 'is-active' : '' }` }>
                                                <div className="rp-box-head">
                                                    <strong style={ { color: j.color } }>{ j.name }</strong>
                                                    <span className="rp-price-chip">${ j.base_pay }/turno</span>
                                                </div>
                                                <p>{ j.description }</p>
                                                <div className="rp-box-foot">
                                                    <small>En turno: { state.onDutyCounts[j.slug] || 0 }</small>
                                                    <button type="button" className="hb-win-btn is-blue" disabled={ busy || isMine } onClick={ () => runAction('/job/join', { jobSlug: j.slug }) }>
                                                        { isMine ? 'Empleo actual' : 'Postularme' }
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    }) }
                                </div>
                            </div>
                        ) }

                        {/* 3. MISIONES DIARIAS */}
                        { activePanel === 'missions' && (
                            <div className="rp-win-stack">
                                <div className="rp-strip-bar">
                                    <span>Contratos diarios de Ciudad Habbten</span>
                                    <span>Completadas: <b>{ (state.missions || []).filter(m => m.claimed).length }/{ (state.missions || []).length }</b></span>
                                </div>
                                <div className="rp-win-grid">
                                    { (state.missions || []).map(m =>
                                    {
                                        const pct = Math.min(100, Math.round((m.progress / Math.max(1, m.target)) * 100));
                                        return (
                                            <div key={ m.slug } className={ `rp-box-card ${ m.canClaim ? 'is-active' : '' }` }>
                                                <div className="rp-box-head">
                                                    <strong>{ m.title }</strong>
                                                    <span className="rp-price-chip">+${ m.rewardCash } · +{ m.rewardXp } XP</span>
                                                </div>
                                                <p>{ m.description }</p>
                                                <div className="rp-prog-track"><div className="rp-prog-fill" style={ { width: `${ pct }%` } } /></div>
                                                <div className="rp-box-foot">
                                                    <small>{ m.progress }/{ m.target }</small>
                                                    <button
                                                        type="button"
                                                        className={ `hb-win-btn ${ m.canClaim ? 'is-green' : 'is-gray' }` }
                                                        disabled={ busy || !m.canClaim }
                                                        onClick={ () => runAction('/missions/claim', { missionSlug: m.slug }) }
                                                    >
                                                        { m.claimed ? 'Reclamada' : m.canClaim ? 'Reclamar' : 'En curso' }
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    }) }
                                </div>
                            </div>
                        ) }

                        {/* 4. MOCHILA */}
                        { activePanel === 'bag' && (
                            <div className="rp-win-stack">
                                <div className="rp-strip-bar">
                                    <span><b>Arma:</b> { character.equipped_weapon }</span>
                                    <span><b>Vehículo:</b> { character.active_vehicle || 'A pie' }</span>
                                    <span><b>Fuerza:</b> { character.strength } · <b>Resistencia:</b> { character.stamina_stat }</span>
                                </div>
                                { state.inventory.length === 0 ? (
                                    <p className="rp-empty-txt">Tu mochila RP está vacía.</p>
                                ) : (
                                    <div className="rp-win-grid">
                                        { state.inventory.map(item =>
                                        {
                                            const slug = item.item_slug || item.slug || '';
                                            const isEq = character.equipped_weapon === slug || character.active_vehicle === slug;
                                            return (
                                                <div key={ slug } className={ `rp-box-card ${ isEq ? 'is-active' : '' }` }>
                                                    <div className="rp-box-head">
                                                        <strong>{ item.name }</strong>
                                                        <span className="rp-qty-chip">x{ item.quantity }</span>
                                                    </div>
                                                    <p>{ item.description }</p>
                                                    <div className="rp-box-foot">
                                                        <small>{ item.category.toUpperCase() }</small>
                                                        <button type="button" className="hb-win-btn is-green" disabled={ busy } onClick={ () => runAction('/inventory/use', { itemSlug: slug }) }>
                                                            { item.category === 'weapon' ? (isEq ? 'Equipada' : 'Equipar') : item.category === 'vehicle' ? (isEq ? 'Estacionar' : 'Conducir') : 'Usar' }
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        }) }
                                    </div>
                                ) }
                            </div>
                        ) }

                        {/* 5. TIENDAS & GIMNASIO */}
                        { activePanel === 'shop' && (
                            <div className="rp-win-stack">
                                <div className="rp-strip-bar">
                                    <span><FaDumbbell /> <b>Gimnasio:</b> Fuerza { character.strength }/100 · Resistencia { character.stamina_stat }/100</span>
                                    <div className="rp-row-actions">
                                        <button type="button" className="hb-win-btn is-blue" disabled={ busy } onClick={ () => runAction('/gym/train', { stat: 'strength' }) }>+Fuerza (-20 EN)</button>
                                        <button type="button" className="hb-win-btn is-blue" disabled={ busy } onClick={ () => runAction('/gym/train', { stat: 'stamina' }) }>+Resistencia (-20 EN)</button>
                                    </div>
                                </div>
                                <div className="rp-tabs-row">
                                    { [
                                        [ 'all', 'Todo' ], [ 'food', 'Comida' ], [ 'medical', 'Farmacia' ],
                                        [ 'weapon', 'Armas' ], [ 'armor', 'Chalecos' ], [ 'vehicle', 'Vehículos' ], [ 'tool', 'Equipo' ]
                                    ].map(([ key, label ]) => (
                                        <button key={ key } type="button" className={ `rp-subtab ${ shopCategory === key ? 'active' : '' }` } onClick={ () => setShopCategory(key) }>
                                            { label }
                                        </button>
                                    )) }
                                </div>
                                <div className="rp-win-grid">
                                    { filteredShop.map(item => (
                                        <div key={ item.slug } className="rp-box-card">
                                            <div className="rp-box-head">
                                                <strong>{ item.name }</strong>
                                                <span className="rp-price-chip">${ item.price.toLocaleString() }</span>
                                            </div>
                                            <p>{ item.description }</p>
                                            <div className="rp-box-foot">
                                                <small>Nv.{ item.min_level }+ { !item.legal ? '· Clandestino' : '' }</small>
                                                <button type="button" className="hb-win-btn is-green" disabled={ busy } onClick={ () => runAction('/shop/buy', { itemSlug: item.slug, quantity: 1 }) }>Comprar</button>
                                            </div>
                                        </div>
                                    )) }
                                </div>
                            </div>
                        ) }

                        {/* 6. BANCO, ATRACOS & PROPIEDADES */}
                        { activePanel === 'bank' && (
                            <div className="rp-win-stack">
                                <div className="rp-box-card">
                                    <div className="rp-box-head">
                                        <strong>Banco Central de Ciudad Habbten</strong>
                                        <span>Efectivo: <b className="c-green">${ character.cash.toLocaleString() }</b> · Banco: <b className="c-blue">${ character.bank.toLocaleString() }</b></span>
                                    </div>
                                    <div className="rp-form-row">
                                        <input type="number" min="1" value={ bankAmount } onChange={ e => setBankAmount(e.target.value) } placeholder="Cantidad $" />
                                        <button type="button" className="hb-win-btn is-green" disabled={ busy } onClick={ () => runAction('/bank', { action: 'deposit', amount: Number(bankAmount) }) }>Depositar</button>
                                        <button type="button" className="hb-win-btn is-blue" disabled={ busy } onClick={ () => runAction('/bank', { action: 'withdraw', amount: Number(bankAmount) }) }>Retirar</button>
                                    </div>
                                    <div className="rp-form-row">
                                        <input type="text" value={ bankTarget } onChange={ e => setBankTarget(e.target.value) } placeholder="Ciudadano destinatario" />
                                        <button type="button" className="hb-win-btn is-blue" disabled={ busy } onClick={ () => runAction('/bank', { action: 'transfer', amount: Number(bankAmount), targetUsername: bankTarget }) }>Transferir</button>
                                        <button type="button" className="hb-win-btn is-green" disabled={ busy } onClick={ () => runAction('/bank', { action: 'pay', amount: Number(bankAmount), targetUsername: bankTarget }) }>Pagar Efectivo</button>
                                    </div>
                                </div>

                                <div className="rp-box-card">
                                    <div className="rp-box-head"><strong><FaSkull /> Atracos (generan alerta 911)</strong></div>
                                    <div className="rp-row-actions">
                                        <button type="button" className="hb-win-btn is-red" disabled={ busy } onClick={ () => runAction('/crime/heist', { target: 'supermarket' }) }>Asaltar Supermercado ($350–$720)</button>
                                        <button type="button" className="hb-win-btn is-red" disabled={ busy } onClick={ () => runAction('/crime/heist', { target: 'bank' }) }>Asaltar Banco Central ($1,600–$3,200)</button>
                                    </div>
                                </div>

                                <div className="rp-section-hdr"><FaHome /> Propiedades RP</div>
                                <div className="rp-win-grid">
                                    { state.properties.map(pr => (
                                        <div key={ pr.slug } className="rp-box-card">
                                            <div className="rp-box-head">
                                                <strong>{ pr.name }</strong>
                                                <span className="rp-price-chip">${ pr.price.toLocaleString() }</span>
                                            </div>
                                            <p>{ pr.description }</p>
                                            <div className="rp-box-foot">
                                                <small>{ pr.owner_id > 0 ? `Dueño: ${ pr.owner_name }` : pr.district }</small>
                                                <button type="button" className="hb-win-btn is-blue" disabled={ busy || pr.owner_id > 0 } onClick={ () => runAction('/property/buy', { propSlug: pr.slug }) }>
                                                    { pr.owner_id > 0 ? 'Vendida' : 'Comprar' }
                                                </button>
                                            </div>
                                        </div>
                                    )) }
                                </div>
                            </div>
                        ) }

                        {/* 7. BANDAS & TERRITORIOS */}
                        { activePanel === 'gangs' && (
                            <div className="rp-win-stack">
                                { state.gang ? (
                                    <div className="rp-strip-bar">
                                        <span>
                                            <span className="rp-gang-chip" style={ { backgroundColor: state.gang.color } }>[{ state.gang.tag }]</span>
                                            {' '}<b>{ state.gang.name }</b> · { state.gang.member_count } miembros · Caja: ${ state.gang.bank_balance.toLocaleString() }
                                        </span>
                                        <button type="button" className="hb-win-btn is-red" disabled={ busy } onClick={ () => runAction('/gang/leave') }>Abandonar</button>
                                    </div>
                                ) : (
                                    <div className="rp-box-card">
                                        <div className="rp-box-head"><strong>Fundar Nueva Banda ($1,500)</strong></div>
                                        <div className="rp-form-row">
                                            <input type="text" value={ gangForm.name } onChange={ e => setGangForm({ ...gangForm, name: e.target.value }) } placeholder="Nombre de la banda" />
                                            <input type="text" maxLength={ 5 } style={ { maxWidth: 80 } } value={ gangForm.tag } onChange={ e => setGangForm({ ...gangForm, tag: e.target.value.toUpperCase() }) } placeholder="TAG" />
                                            <input type="color" value={ gangForm.color } onChange={ e => setGangForm({ ...gangForm, color: e.target.value }) } style={ { width: 38, padding: 1 } } />
                                            <button type="button" className="hb-win-btn is-green" disabled={ busy } onClick={ () => runAction('/gang/create', gangForm, () => rpGetGangs().then(r => r?.success && setGangsList(r.gangs || []))) }>Fundar</button>
                                        </div>
                                    </div>
                                ) }

                                <div className="rp-section-hdr">Territorios Capturables</div>
                                <div className="rp-win-grid">
                                    { state.turfs.map(t => (
                                        <div key={ t.slug } className="rp-box-card">
                                            <div className="rp-box-head">
                                                <strong>{ t.name }</strong>
                                                <span className="rp-price-chip">+${ t.income_per_cycle }/ciclo</span>
                                            </div>
                                            <p>
                                                Control: { t.owner_gang_id > 0 ? <b style={ { color: t.owner_gang_color } }>[{ t.owner_gang_tag }] { t.owner_gang_name }</b> : 'Sin dueño' }
                                            </p>
                                            <div className="rp-box-foot">
                                                <small>{ t.district }</small>
                                                <button type="button" className="hb-win-btn is-red" disabled={ busy || !state.gang } onClick={ () => runAction('/turf/capture', { turfSlug: t.slug }) }>Capturar</button>
                                            </div>
                                        </div>
                                    )) }
                                </div>

                                { !state.gang && gangsList.length > 0 && (
                                    <>
                                        <div className="rp-section-hdr">Bandas Activas</div>
                                        <div className="rp-win-grid">
                                            { gangsList.map(g => (
                                                <div key={ g.id } className="rp-box-card">
                                                    <div className="rp-box-head">
                                                        <strong><span className="rp-gang-chip" style={ { backgroundColor: g.color } }>[{ g.tag }]</span> { g.name }</strong>
                                                        <small>{ g.member_count } m.</small>
                                                    </div>
                                                    <p>{ g.motto }</p>
                                                    <div className="rp-box-foot">
                                                        <small>Líder: { g.leader_name || 'N/A' }</small>
                                                        <button type="button" className="hb-win-btn is-blue" disabled={ busy } onClick={ () => runAction('/gang/join', { gangId: g.id }) }>Unirme</button>
                                                    </div>
                                                </div>
                                            )) }
                                        </div>
                                    </>
                                ) }
                            </div>
                        ) }

                        {/* 8. COMBATE, POLICÍA, MÉDICOS Y 911 */}
                        { activePanel === 'actions' && (
                            <div className="rp-win-stack">
                                <div className="rp-box-card">
                                    <div className="rp-box-head"><strong><FaCrosshairs /> Acción Directa sobre Ciudadano</strong></div>
                                    <div className="rp-form-row">
                                        <input type="text" value={ targetPlayer } onChange={ e => setTargetPlayer(e.target.value) } placeholder="Nombre del jugador" />
                                        <input type="text" value={ arrestReason } onChange={ e => setArrestReason(e.target.value) } placeholder="Motivo (arresto)" />
                                    </div>
                                    <div className="rp-row-actions">
                                        <button type="button" className="hb-win-btn is-red" disabled={ busy } onClick={ () => runAction('/combat/attack', { target: targetPlayer }) }>Atacar</button>
                                        <button type="button" className="hb-win-btn is-blue" disabled={ busy } onClick={ () => runAction('/police/action', { action: 'cuff', target: targetPlayer }) }>Esposar</button>
                                        <button type="button" className="hb-win-btn is-blue" disabled={ busy } onClick={ () => runAction('/police/action', { action: 'arrest', target: targetPlayer, reason: arrestReason }) }>Arrestar</button>
                                        <button type="button" className="hb-win-btn is-green" disabled={ busy } onClick={ () => runAction('/medic/heal', { target: targetPlayer }) }><FaAmbulance /> Curar</button>
                                    </div>
                                </div>

                                <div className="rp-box-card">
                                    <div className="rp-box-head"><strong><FaPhoneAlt /> Central 911</strong></div>
                                    <div className="rp-form-row">
                                        <input type="text" value={ call911Msg } onChange={ e => setCall911Msg(e.target.value) } placeholder="Describe tu emergencia..." />
                                        <button type="button" className="hb-win-btn is-blue" disabled={ busy } onClick={ () => runAction('/911', { service: 'police', message: call911Msg }, () => setCall911Msg('')) }>Llamar HPD</button>
                                        <button type="button" className="hb-win-btn is-green" disabled={ busy } onClick={ () => runAction('/911', { service: 'medic', message: call911Msg }, () => setCall911Msg('')) }>Llamar Médico</button>
                                    </div>
                                </div>

                                <div className="rp-section-hdr"><FaExclamationTriangle /> Sucesos Recientes</div>
                                <div className="rp-list-rows">
                                    { state.recentEvents.length === 0 ? (
                                        <p className="rp-empty-txt">Ciudad tranquila por ahora.</p>
                                    ) : state.recentEvents.map(ev => (
                                        <div key={ ev.id } className="rp-item-row">
                                            <span className="rp-feed-txt">{ ev.message }</span>
                                            { ev.room_id && ev.room_id > 0 ? (
                                                <button type="button" className="hb-win-btn is-blue" onClick={ () => { if(GetRoomSession()?.roomId !== ev.room_id) CreateLinkEvent(`navigator/goto/${ ev.room_id }`); setActivePanel(null); } }>
                                                    Acudir
                                                </button>
                                            ) : null }
                                        </div>
                                    )) }
                                </div>
                            </div>
                        ) }

                        {/* 9. TOP RP */}
                        { activePanel === 'rankings' && (
                            <div className="rp-win-stack">
                                { !rankings ? (
                                    <p className="rp-empty-txt">Cargando clasificaciones...</p>
                                ) : (
                                    <div className="rp-rank-cols">
                                        <div className="rp-box-card">
                                            <div className="rp-box-head"><strong>Más Ricos</strong></div>
                                            { (rankings.richest || []).map((r: any, i: number) => (
                                                <div key={ r.user_id } className="rp-rank-line">
                                                    <span>#{ i + 1 } <b>{ r.username }</b></span>
                                                    <span className="c-green">${ Number(r.net_worth || 0).toLocaleString() }</span>
                                                </div>
                                            )) }
                                        </div>
                                        <div className="rp-box-card">
                                            <div className="rp-box-head"><strong>Más Peligrosos</strong></div>
                                            { (rankings.fighters || []).map((r: any, i: number) => (
                                                <div key={ r.user_id } className="rp-rank-line">
                                                    <span>#{ i + 1 } <b>{ r.username }</b></span>
                                                    <span className="c-red">{ r.kills } KO / { r.deaths } M</span>
                                                </div>
                                            )) }
                                        </div>
                                        <div className="rp-box-card">
                                            <div className="rp-box-head"><strong>Bandas Dominantes</strong></div>
                                            { (rankings.gangs || []).length === 0 ? (
                                                <small>Sin bandas aún.</small>
                                            ) : rankings.gangs.map((g: any, i: number) => (
                                                <div key={ g.id } className="rp-rank-line">
                                                    <span>#{ i + 1 } <b style={ { color: g.color } }>[{ g.tag }] { g.name }</b></span>
                                                    <span>{ g.turfs } zonas</span>
                                                </div>
                                            )) }
                                        </div>
                                    </div>
                                ) }
                            </div>
                        ) }
                    </NitroCardContentView>
                </NitroCardView>
            ) }
        </div>
    );
};
