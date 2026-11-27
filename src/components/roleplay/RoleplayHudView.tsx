import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import {
    FaAmbulance,
    FaBriefcase,
    FaCar,
    FaClipboardList,
    FaCrosshairs,
    FaDumbbell,
    FaExclamationTriangle,
    FaFlag,
    FaHeartbeat,
    FaHome,
    FaMapMarkedAlt,
    FaMoneyBillWave,
    FaPhoneAlt,
    FaShieldAlt,
    FaShoppingBag,
    FaSkull,
    FaStar,
    FaTerminal,
    FaTimes,
    FaTrophy,
    FaUniversity,
    FaUtensils
} from 'react-icons/fa';
import { CreateLinkEvent } from '../../api';
import { LayoutAvatarImageView } from '../../common';
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

export const RoleplayHudView: FC<{}> = () =>
{
    const rpActive = isRoleplayMode();
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
    const [ cmdInput, setCmdInput ] = useState<string>('');
    const [ showCmdBar, setShowCmdBar ] = useState<boolean>(false);
    const [ gangsList, setGangsList ] = useState<RpGang[]>([]);
    const [ gangForm, setGangForm ] = useState({ name: '', tag: '', color: '#ef4444', motto: '' });
    const [ rankings, setRankings ] = useState<any>(null);

    const pushToast = useCallback((type: 'ok' | 'err' | 'warn', text: string) =>
    {
        const id = Date.now() + Math.floor(Math.random() * 999);
        setToasts(prev => [ ...prev.slice(-3), { id, type, text } ]);
        setTimeout(() =>
        {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4800);
    }, []);

    const refreshState = useCallback(async () =>
    {
        if(!rpActive) return;
        try
        {
            const json = await rpGetState();
            if(json && json.success) setState(json);
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

    const filteredShop = state.catalog.filter(it => shopCategory === 'all' || it.category === shopCategory);

    const handleTravel = (slug: string, useTaxi: boolean) =>
    {
        runAction('/travel', { locationSlug: slug, useTaxi }, res =>
        {
            if(res?.roomId > 0)
            {
                CreateLinkEvent(`navigator/goto/${ res.roomId }`);
            }
            setActivePanel(null);
        });
    };

    const handleCommandSubmit = (e: React.FormEvent) =>
    {
        e.preventDefault();
        if(!cmdInput.trim()) return;
        const cmd = cmdInput.trim();
        setCmdInput('');
        runAction('/command', { command: cmd });
    };

    return (
        <div className="habbten-rp-root">
            {/* Filtro ambiental sutil Día/Noche estilo HabboSK */}
            <div className={ `rp-ambient-tint phase-${ clock.phase }` } />

            {/* Notificaciones flotantes RP */}
            <div className="rp-toasts">
                { toasts.map(t => (
                    <div key={ t.id } className={ `rp-toast is-${ t.type }` }>
                        { t.text }
                    </div>
                )) }
            </div>

            {/* HUD Vital Superior Izquierdo (estilo Habbo Ciudad biselado) */}
            <div className="rp-vital-hud">
                <div className="rp-vital-header">
                    <div className="rp-vital-identity">
                        { state.user.look && (
                            <div className="rp-avatar-head-badge">
                                <LayoutAvatarImageView figure={ state.user.look } direction={ 2 } headOnly={ true } />
                            </div>
                        ) }
                        <span className="rp-level-pill">NV.{ character.rp_level }</span>
                        <span className="rp-username">{ state.user.username }</span>
                        { state.gang && (
                            <span className="rp-gang-tag" style={ { backgroundColor: state.gang.color } }>
                                [{ state.gang.tag }]
                            </span>
                        ) }
                    </div>
                    <div className="rp-clock-pill" title={ `Ciclo de Ciudad Habbten: ${ clock.label }` }>
                        { clock.formatted } · { clock.label }
                    </div>
                </div>

                <div className="rp-job-row">
                    <span className="rp-job-badge" style={ { borderColor: job.color, color: job.color } }>
                        { job.name } · R{ character.job_rank }
                    </span>
                    <button
                        type="button"
                        className={ `rp-duty-btn ${ character.on_duty ? 'is-on' : '' }` }
                        disabled={ busy }
                        onClick={ () => runAction('/job/duty') }
                    >
                        { character.on_duty ? '● EN TURNO' : '○ FUERA TURNO' }
                    </button>
                </div>

                {/* Barras vitales */}
                <div className="rp-bars">
                    <div className="rp-bar-row">
                        <span className="rp-bar-label"><FaHeartbeat /> HP</span>
                        <div className="rp-bar-track"><div className="rp-bar-fill is-hp" style={ { width: `${ hpPct }%` } } /></div>
                        <span className="rp-bar-val">{ character.hp }/{ character.max_hp }</span>
                    </div>
                    { character.armor > 0 && (
                        <div className="rp-bar-row">
                            <span className="rp-bar-label"><FaShieldAlt /> BL</span>
                            <div className="rp-bar-track"><div className="rp-bar-fill is-armor" style={ { width: `${ character.armor }%` } } /></div>
                            <span className="rp-bar-val">{ character.armor }</span>
                        </div>
                    ) }
                    <div className="rp-bar-row">
                        <span className="rp-bar-label">⚡ EN</span>
                        <div className="rp-bar-track"><div className="rp-bar-fill is-energy" style={ { width: `${ enPct }%` } } /></div>
                        <span className="rp-bar-val">{ character.energy }%</span>
                    </div>
                    <div className="rp-bar-row">
                        <span className="rp-bar-label"><FaUtensils /> HM</span>
                        <div className="rp-bar-track"><div className="rp-bar-fill is-hunger" style={ { width: `${ hunPct }%` } } /></div>
                        <span className="rp-bar-val">{ character.hunger }%</span>
                    </div>
                    <div className="rp-xp-thin" title={ `XP RP: ${ character.rp_xp } / ${ character.xpForNextLevel }` }>
                        <div className="rp-xp-fill" style={ { width: `${ xpPct }%` } } />
                    </div>
                </div>

                {/* Dinero + Estrellas de búsqueda */}
                <div className="rp-money-row">
                    <div className="rp-money-chip is-cash" title="Efectivo en mano (en riesgo si te noquean)">
                        <FaMoneyBillWave /> ${ character.cash.toLocaleString() }
                    </div>
                    <div className="rp-money-chip is-bank" title="Saldo seguro en el Banco Central">
                        <FaUniversity /> ${ character.bank.toLocaleString() }
                    </div>
                </div>

                <div className="rp-location-footer">
                    <span className="rp-loc-name">
                        📍 { currentLocation?.name || 'Ciudad Habbten' }
                    </span>
                    <span className={ `rp-zone-pill ${ currentLocation?.is_safe_zone ? 'is-safe' : 'is-pvp' }` }>
                        { currentLocation?.is_safe_zone ? 'SEGURA' : 'PVP' }
                    </span>
                </div>

                { character.wanted_level > 0 && (
                    <div className="rp-wanted-row" title="Nivel de búsqueda policial">
                        { [ 1, 2, 3, 4, 5 ].map(n => (
                            <FaStar key={ n } className={ n <= character.wanted_level ? 'is-lit' : 'is-dim' } />
                        )) }
                        <span>BUSCADO ({ character.wanted_level }★)</span>
                    </div>
                ) }

                { character.jailSecondsLeft > 0 && (
                    <div className="rp-status-banner is-jail">
                        🔒 PRISIÓN ESTATAL · { character.jailSecondsLeft }s ({ character.jail_reason || 'Condena activa' })
                    </div>
                ) }
                { character.hospitalSecondsLeft > 0 && (
                    <div className="rp-status-banner is-hosp">
                        🏥 HOSPITAL CENTRAL · Recuperación { character.hospitalSecondsLeft }s
                    </div>
                ) }
                { character.cuffed_by > 0 && (
                    <div className="rp-status-banner is-cuff">
                        ⛓️ ESPOSADO POR LA POLICÍA HPD
                    </div>
                ) }

                {/* Barra rápida de comandos RP */}
                <div className="rp-cmd-toggle-row">
                    <button type="button" className="rp-mini-btn" onClick={ () => setShowCmdBar(v => !v) }>
                        <FaTerminal /> { showCmdBar ? 'Ocultar :comandos' : 'Comandos RP (:me, :do...)' }
                    </button>
                    <button type="button" className="rp-mini-btn is-accent" disabled={ busy } onClick={ () => runAction('/job/work') }>
                        ⚡ Trabajar
                    </button>
                </div>

                { showCmdBar && (
                    <form className="rp-cmd-form" onSubmit={ handleCommandSubmit }>
                        <input
                            type="text"
                            value={ cmdInput }
                            onChange={ e => setCmdInput(e.target.value) }
                            placeholder=":me saluda | :golpear user | :911 ayuda"
                        />
                        <button type="submit" disabled={ busy }>OK</button>
                    </form>
                ) }
            </div>

            {/* Dock Táctico Derecho (Smartphone RP) */}
            <div className="rp-tactical-dock">
                <button type="button" className={ activePanel === 'map' ? 'active' : '' } onClick={ () => setActivePanel(p => p === 'map' ? null : 'map') } title="Mapa de Ciudad Habbten (GPS)">
                    <FaMapMarkedAlt /><span>Mapa</span>
                </button>
                <button type="button" className={ activePanel === 'jobs' ? 'active' : '' } onClick={ () => setActivePanel(p => p === 'jobs' ? null : 'jobs') } title="Trabajos y Turnos">
                    <FaBriefcase /><span>Trabajos</span>
                </button>
                <button type="button" className={ `${ activePanel === 'missions' ? 'active' : '' } ${ (state.missions || []).some(m => m.canClaim) ? 'has-badge' : '' }` } onClick={ () => setActivePanel(p => p === 'missions' ? null : 'missions') } title="Contratos y Misiones Diarias">
                    <FaClipboardList /><span>Misiones</span>
                </button>
                <button type="button" className={ activePanel === 'bag' ? 'active' : '' } onClick={ () => setActivePanel(p => p === 'bag' ? null : 'bag') } title="Mochila, Armas y Vehículos">
                    <FaShoppingBag /><span>Mochila</span>
                </button>
                <button type="button" className={ activePanel === 'shop' ? 'active' : '' } onClick={ () => setActivePanel(p => p === 'shop' ? null : 'shop') } title="Tiendas y Gimnasio">
                    <FaCar /><span>Tiendas</span>
                </button>
                <button type="button" className={ activePanel === 'bank' ? 'active' : '' } onClick={ () => setActivePanel(p => p === 'bank' ? null : 'bank') } title="Banco, Atracos y Propiedades">
                    <FaUniversity /><span>Banco</span>
                </button>
                <button type="button" className={ activePanel === 'gangs' ? 'active' : '' } onClick={ () => setActivePanel(p => p === 'gangs' ? null : 'gangs') } title="Bandas y Territorios">
                    <FaFlag /><span>Bandas</span>
                </button>
                <button type="button" className={ activePanel === 'actions' ? 'active' : '' } onClick={ () => setActivePanel(p => p === 'actions' ? null : 'actions') } title="Combate, Policía, Médicos y 911">
                    <FaCrosshairs /><span>Acción/911</span>
                </button>
                <button type="button" className={ activePanel === 'rankings' ? 'active' : '' } onClick={ () => setActivePanel(p => p === 'rankings' ? null : 'rankings') } title="Rankings de Ciudad Habbten">
                    <FaTrophy /><span>Top RP</span>
                </button>
            </div>

            {/* Modal Central del Smartphone / Panel RP */}
            { activePanel && (
                <div className="rp-modal-window">
                    <div className="rp-modal-header">
                        <div className="rp-modal-title">
                            { activePanel === 'map' && 'GPS — Mapa de Ciudad Habbten' }
                            { activePanel === 'jobs' && 'Bolsa de Empleo & Turnos' }
                            { activePanel === 'missions' && 'Contratos y Misiones Diarias' }
                            { activePanel === 'bag' && 'Mochila RP, Armas y Vehículos' }
                            { activePanel === 'shop' && 'Tiendas de Ciudad Habbten & Gimnasio' }
                            { activePanel === 'bank' && 'Banco Central, Atracos & Propiedades' }
                            { activePanel === 'gangs' && 'Bandas, Mafias y Territorios' }
                            { activePanel === 'actions' && 'Combate, Policía HPD, Médicos y 911' }
                            { activePanel === 'rankings' && 'Rankings de Ciudad Habbten' }
                        </div>
                        <button type="button" className="rp-modal-close" onClick={ () => setActivePanel(null) }>
                            <FaTimes />
                        </button>
                    </div>

                    <div className="rp-modal-body">
                        {/* 1. MAPA INTERACTIVO DE CIUDAD HABBTEN */}
                        { activePanel === 'map' && (
                            <div className="rp-map-view">
                                <div className="rp-city-canvas">
                                    <div className="rp-city-grid-lines" />
                                    { state.locations.map(loc =>
                                    {
                                        const isHere = character.current_location === loc.slug;
                                        return (
                                            <button
                                                key={ loc.slug }
                                                type="button"
                                                className={ `rp-map-pin ${ isHere ? 'is-here' : '' }` }
                                                style={ { left: `${ loc.map_x }%`, top: `${ loc.map_y }%`, borderColor: loc.color } }
                                                onClick={ () => handleTravel(loc.slug, false) }
                                                title={ `${ loc.name } (${ loc.district }) — Clic para ir` }
                                            >
                                                <span className="pin-dot" style={ { backgroundColor: loc.color } } />
                                                <span className="pin-label">{ loc.name }</span>
                                                <span className="pin-count">{ loc.online_users }</span>
                                            </button>
                                        );
                                    }) }
                                </div>
                                <div className="rp-map-list">
                                    { state.locations.map(loc => (
                                        <div key={ loc.slug } className="rp-loc-card">
                                            <div className="rp-loc-card-info">
                                                <div className="rp-loc-card-title">
                                                    <span className="dot" style={ { background: loc.color } } />
                                                    <strong>{ loc.name }</strong>
                                                    <span className={ `zone-tag ${ loc.is_safe_zone ? 'safe' : 'pvp' }` }>
                                                        { loc.is_safe_zone ? 'Segura' : 'PvP' }
                                                    </span>
                                                </div>
                                                <small>{ loc.description }</small>
                                            </div>
                                            <div className="rp-loc-card-actions">
                                                <button type="button" disabled={ busy } onClick={ () => handleTravel(loc.slug, false) }>
                                                    { character.active_vehicle ? '🚗 Conducir' : '🚶 Ir (-5 EN)' }
                                                </button>
                                                { !character.active_vehicle && (
                                                    <button type="button" className="is-taxi" disabled={ busy } onClick={ () => handleTravel(loc.slug, true) }>
                                                        🚕 Taxi $25
                                                    </button>
                                                ) }
                                            </div>
                                        </div>
                                    )) }
                                </div>
                            </div>
                        ) }

                        {/* 2. TRABAJOS Y TURNOS */}
                        { activePanel === 'jobs' && (
                            <div className="rp-jobs-view">
                                <div className="rp-summary-strip">
                                    <div>
                                        <strong>Profesión actual:</strong> { job.name } (Rango { character.job_rank }/{ job.max_rank })
                                    </div>
                                    <div className="rp-inline-btns">
                                        <button type="button" disabled={ busy } onClick={ () => runAction('/job/duty') }>
                                            { character.on_duty ? 'Terminar Turno' : 'Iniciar Turno' }
                                        </button>
                                        <button type="button" className="is-green" disabled={ busy } onClick={ () => runAction('/job/work') }>
                                            ⚡ Tarea Rápida
                                        </button>
                                    </div>
                                </div>
                                <div className="rp-cards-grid">
                                    { state.jobs.map(j =>
                                    {
                                        const isMine = character.job_slug === j.slug;
                                        return (
                                            <div key={ j.slug } className={ `rp-card ${ isMine ? 'is-selected' : '' }` }>
                                                <div className="rp-card-top">
                                                    <strong style={ { color: j.color } }>{ j.name }</strong>
                                                    <span className="rp-price-tag">${ j.base_pay }/pago</span>
                                                </div>
                                                <p>{ j.description }</p>
                                                <div className="rp-card-foot">
                                                    <small>En turno ahora: { state.onDutyCounts[j.slug] || 0 }</small>
                                                    <button
                                                        type="button"
                                                        disabled={ busy || isMine }
                                                        onClick={ () => runAction('/job/join', { jobSlug: j.slug }) }
                                                    >
                                                        { isMine ? '✓ Tu empleo' : 'Postularme' }
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    }) }
                                </div>
                            </div>
                        ) }

                        {/* 2B. MISIONES Y CONTRATOS DIARIOS */}
                        { activePanel === 'missions' && (
                            <div className="rp-missions-view">
                                <div className="rp-summary-strip">
                                    <span>Completa contratos diarios en Ciudad Habbten para ganar efectivo y XP RP extra.</span>
                                    <span>Completadas hoy: <b>{ (state.missions || []).filter(m => m.claimed).length }/{ (state.missions || []).length }</b></span>
                                </div>
                                <div className="rp-cards-grid">
                                    { (state.missions || []).map(m =>
                                    {
                                        const pct = Math.min(100, Math.round((m.progress / Math.max(1, m.target)) * 100));
                                        return (
                                            <div key={ m.slug } className={ `rp-card ${ m.canClaim ? 'is-selected' : '' }` }>
                                                <div className="rp-card-top">
                                                    <strong>{ m.title }</strong>
                                                    <span className="rp-price-tag">+${ m.rewardCash } · +{ m.rewardXp } XP</span>
                                                </div>
                                                <p>{ m.description }</p>
                                                <div className="rp-mission-bar">
                                                    <div className="rp-mission-bar-fill" style={ { width: `${ pct }%` } } />
                                                </div>
                                                <div className="rp-card-foot">
                                                    <small>Progreso: { m.progress }/{ m.target }</small>
                                                    <button
                                                        type="button"
                                                        className={ m.canClaim ? 'is-green' : '' }
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

                        {/* 3. MOCHILA RP */}
                        { activePanel === 'bag' && (
                            <div className="rp-bag-view">
                                <div className="rp-summary-strip">
                                    <span><b>Arma equipada:</b> { character.equipped_weapon }</span>
                                    <span><b>Vehículo activo:</b> { character.active_vehicle || 'A pie' }</span>
                                    <span><b>Fuerza:</b> { character.strength } · <b>Resistencia:</b> { character.stamina_stat }</span>
                                </div>
                                { state.inventory.length === 0 ? (
                                    <p className="rp-empty">Tu mochila RP está vacía. Visita Tiendas para comprar comida, armas o vehículos.</p>
                                ) : (
                                    <div className="rp-cards-grid">
                                        { state.inventory.map(item =>
                                        {
                                            const slug = item.item_slug || item.slug || '';
                                            const isEquipped = character.equipped_weapon === slug || character.active_vehicle === slug;
                                            return (
                                                <div key={ slug } className={ `rp-card ${ isEquipped ? 'is-selected' : '' }` }>
                                                    <div className="rp-card-top">
                                                        <strong>{ item.name }</strong>
                                                        <span className="rp-qty-tag">x{ item.quantity }</span>
                                                    </div>
                                                    <p>{ item.description }</p>
                                                    <div className="rp-card-foot">
                                                        <small>{ item.category.toUpperCase() }</small>
                                                        <button
                                                            type="button"
                                                            disabled={ busy }
                                                            onClick={ () => runAction('/inventory/use', { itemSlug: slug }) }
                                                        >
                                                            { item.category === 'weapon'
                                                                ? (isEquipped ? '✓ Equipada' : 'Equipar')
                                                                : item.category === 'vehicle'
                                                                    ? (isEquipped ? 'Estacionar' : 'Conducir')
                                                                    : 'Usar' }
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        }) }
                                    </div>
                                ) }
                            </div>
                        ) }

                        {/* 4. TIENDAS & GIMNASIO */}
                        { activePanel === 'shop' && (
                            <div className="rp-shop-view">
                                <div className="rp-gym-banner">
                                    <div>
                                        <FaDumbbell /> <strong>Gimnasio & Dojo:</strong> Fuerza { character.strength }/100 · Resistencia { character.stamina_stat }/100
                                    </div>
                                    <div className="rp-inline-btns">
                                        <button type="button" disabled={ busy } onClick={ () => runAction('/gym/train', { stat: 'strength' }) }>
                                            💪 Entrenar Fuerza (-20 EN)
                                        </button>
                                        <button type="button" disabled={ busy } onClick={ () => runAction('/gym/train', { stat: 'stamina' }) }>
                                            🏃 Entrenar Resistencia (-20 EN)
                                        </button>
                                    </div>
                                </div>
                                <div className="rp-filter-tabs">
                                    { [
                                        [ 'all', 'Todo' ],
                                        [ 'food', 'Comida' ],
                                        [ 'medical', 'Farmacia' ],
                                        [ 'weapon', 'Armas' ],
                                        [ 'armor', 'Chalecos' ],
                                        [ 'vehicle', 'Vehículos' ],
                                        [ 'tool', 'Herramientas' ]
                                    ].map(([ key, label ]) => (
                                        <button key={ key } type="button" className={ shopCategory === key ? 'active' : '' } onClick={ () => setShopCategory(key) }>
                                            { label }
                                        </button>
                                    )) }
                                </div>
                                <div className="rp-cards-grid">
                                    { filteredShop.map(item =>
                                    {
                                        const slug = item.slug || '';
                                        return (
                                            <div key={ slug } className="rp-card">
                                                <div className="rp-card-top">
                                                    <strong>{ item.name }</strong>
                                                    <span className="rp-price-tag">${ item.price.toLocaleString() }</span>
                                                </div>
                                                <p>{ item.description }</p>
                                                <div className="rp-card-foot">
                                                    <small>Nv.{ item.min_level }+ {!item.legal ? '· Mercado Negro' : ''}</small>
                                                    <button type="button" disabled={ busy } onClick={ () => runAction('/shop/buy', { itemSlug: slug, quantity: 1 }) }>
                                                        Comprar
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    }) }
                                </div>
                            </div>
                        ) }

                        {/* 5. BANCO CENTRAL, ATRACOS & PROPIEDADES */}
                        { activePanel === 'bank' && (
                            <div className="rp-bank-view">
                                <div className="rp-bank-panel">
                                    <div className="rp-bank-balances">
                                        <div>Efectivo: <strong className="text-emerald">${ character.cash.toLocaleString() }</strong></div>
                                        <div>Banco Central: <strong className="text-sky">${ character.bank.toLocaleString() }</strong></div>
                                    </div>
                                    <div className="rp-bank-controls">
                                        <input type="number" min="1" value={ bankAmount } onChange={ e => setBankAmount(e.target.value) } placeholder="Monto $" />
                                        <button type="button" disabled={ busy } onClick={ () => runAction('/bank', { action: 'deposit', amount: Number(bankAmount) }) }>
                                            Depositar
                                        </button>
                                        <button type="button" disabled={ busy } onClick={ () => runAction('/bank', { action: 'withdraw', amount: Number(bankAmount) }) }>
                                            Retirar
                                        </button>
                                    </div>
                                    <div className="rp-bank-controls">
                                        <input type="text" value={ bankTarget } onChange={ e => setBankTarget(e.target.value) } placeholder="Usuario destinatario" />
                                        <button type="button" disabled={ busy } onClick={ () => runAction('/bank', { action: 'transfer', amount: Number(bankAmount), targetUsername: bankTarget }) }>
                                            Transferir Banco
                                        </button>
                                        <button type="button" className="is-green" disabled={ busy } onClick={ () => runAction('/bank', { action: 'pay', amount: Number(bankAmount), targetUsername: bankTarget }) }>
                                            Pagar Efectivo
                                        </button>
                                    </div>
                                </div>

                                <div className="rp-heist-box">
                                    <div className="rp-section-title"><FaSkull /> Actividades Criminales (Alerta 911 en vivo)</div>
                                    <div className="rp-inline-btns">
                                        <button type="button" className="is-danger" disabled={ busy } onClick={ () => runAction('/crime/heist', { target: 'supermarket' }) }>
                                            🏪 Asaltar Supermercado 24/7 ($350–$720)
                                        </button>
                                        <button type="button" className="is-danger" disabled={ busy } onClick={ () => runAction('/crime/heist', { target: 'bank' }) }>
                                            🏦 Asaltar Bóveda Banco Central ($1,600–$3,200)
                                        </button>
                                    </div>
                                </div>

                                <div className="rp-section-title"><FaHome /> Bienes Raíces & Propiedades RP</div>
                                <div className="rp-cards-grid">
                                    { state.properties.map(pr => (
                                        <div key={ pr.slug } className="rp-card">
                                            <div className="rp-card-top">
                                                <strong>{ pr.name }</strong>
                                                <span className="rp-price-tag">${ pr.price.toLocaleString() }</span>
                                            </div>
                                            <p>{ pr.description }</p>
                                            <div className="rp-card-foot">
                                                <small>{ pr.owner_id > 0 ? `Dueño: ${ pr.owner_name }` : pr.district }</small>
                                                <button
                                                    type="button"
                                                    disabled={ busy || pr.owner_id > 0 }
                                                    onClick={ () => runAction('/property/buy', { propSlug: pr.slug }) }
                                                >
                                                    { pr.owner_id > 0 ? 'Vendida' : 'Comprar' }
                                                </button>
                                            </div>
                                        </div>
                                    )) }
                                </div>
                            </div>
                        ) }

                        {/* 6. BANDAS Y TERRITORIOS */}
                        { activePanel === 'gangs' && (
                            <div className="rp-gangs-view">
                                { state.gang ? (
                                    <div className="rp-summary-strip">
                                        <div>
                                            <span className="rp-gang-tag" style={ { backgroundColor: state.gang.color } }>[{ state.gang.tag }]</span>
                                            {' '}<strong>{ state.gang.name }</strong> · { state.gang.member_count } miembros · Caja: ${ state.gang.bank_balance.toLocaleString() }
                                        </div>
                                        <button type="button" className="is-danger" disabled={ busy } onClick={ () => runAction('/gang/leave') }>
                                            Abandonar Banda
                                        </button>
                                    </div>
                                ) : (
                                    <div className="rp-bank-panel">
                                        <div className="rp-section-title">Fundar Nueva Banda ($1,500)</div>
                                        <div className="rp-bank-controls">
                                            <input type="text" value={ gangForm.name } onChange={ e => setGangForm({ ...gangForm, name: e.target.value }) } placeholder="Nombre de la banda" />
                                            <input type="text" maxLength={ 5 } style={ { maxWidth: 86 } } value={ gangForm.tag } onChange={ e => setGangForm({ ...gangForm, tag: e.target.value.toUpperCase() }) } placeholder="TAG" />
                                            <input type="color" value={ gangForm.color } onChange={ e => setGangForm({ ...gangForm, color: e.target.value }) } style={ { width: 42, padding: 2 } } />
                                            <button type="button" disabled={ busy } onClick={ () => runAction('/gang/create', gangForm, () => rpGetGangs().then(r => r?.success && setGangsList(r.gangs || []))) }>
                                                Fundar ($1,500)
                                            </button>
                                        </div>
                                    </div>
                                ) }

                                <div className="rp-section-title">🏴 Territorios Capturables (Rentas automáticas)</div>
                                <div className="rp-cards-grid">
                                    { state.turfs.map(t => (
                                        <div key={ t.slug } className="rp-card">
                                            <div className="rp-card-top">
                                                <strong>{ t.name }</strong>
                                                <span className="rp-price-tag">+${ t.income_per_cycle }/ciclo</span>
                                            </div>
                                            <p>
                                                Controlado por:{' '}
                                                { t.owner_gang_id > 0
                                                    ? <b style={ { color: t.owner_gang_color || '#f43f5e' } }>[{ t.owner_gang_tag }] { t.owner_gang_name }</b>
                                                    : 'Sin dueño (Libre)' }
                                            </p>
                                            <div className="rp-card-foot">
                                                <small>{ t.district }</small>
                                                <button type="button" className="is-danger" disabled={ busy || !state.gang } onClick={ () => runAction('/turf/capture', { turfSlug: t.slug }) }>
                                                    Capturar Territorio
                                                </button>
                                            </div>
                                        </div>
                                    )) }
                                </div>

                                { !state.gang && gangsList.length > 0 && (
                                    <>
                                        <div className="rp-section-title">Bandas Activas en Ciudad Habbten</div>
                                        <div className="rp-cards-grid">
                                            { gangsList.map(g => (
                                                <div key={ g.id } className="rp-card">
                                                    <div className="rp-card-top">
                                                        <strong><span className="rp-gang-tag" style={ { backgroundColor: g.color } }>[{ g.tag }]</span> { g.name }</strong>
                                                        <small>{ g.member_count } miembros</small>
                                                    </div>
                                                    <p>{ g.motto }</p>
                                                    <div className="rp-card-foot">
                                                        <small>Líder: { g.leader_name || 'Anónimo' }</small>
                                                        <button type="button" disabled={ busy } onClick={ () => runAction('/gang/join', { gangId: g.id }) }>Unirme</button>
                                                    </div>
                                                </div>
                                            )) }
                                        </div>
                                    </>
                                ) }
                            </div>
                        ) }

                        {/* 7. COMBATE, POLICÍA, MÉDICOS, 911 Y FEED EN VIVO */}
                        { activePanel === 'actions' && (
                            <div className="rp-actions-view">
                                <div className="rp-bank-panel">
                                    <div className="rp-section-title"><FaCrosshairs /> Interactuar con un Ciudadano</div>
                                    <div className="rp-bank-controls">
                                        <input type="text" value={ targetPlayer } onChange={ e => setTargetPlayer(e.target.value) } placeholder="Nombre del jugador objetivo" />
                                        <input type="text" value={ arrestReason } onChange={ e => setArrestReason(e.target.value) } placeholder="Motivo (si arrestas)" />
                                    </div>
                                    <div className="rp-inline-btns">
                                        <button type="button" className="is-danger" disabled={ busy } onClick={ () => runAction('/combat/attack', { target: targetPlayer }) }>
                                            ⚔️ Atacar / Disparar
                                        </button>
                                        <button type="button" disabled={ busy } onClick={ () => runAction('/police/action', { action: 'cuff', target: targetPlayer }) }>
                                            ⛓️ Esposar (HPD)
                                        </button>
                                        <button type="button" disabled={ busy } onClick={ () => runAction('/police/action', { action: 'arrest', target: targetPlayer, reason: arrestReason }) }>
                                            🚔 Arrestar (HPD)
                                        </button>
                                        <button type="button" className="is-green" disabled={ busy } onClick={ () => runAction('/medic/heal', { target: targetPlayer }) }>
                                            <FaAmbulance /> Curar / Revivir (Médico)
                                        </button>
                                    </div>
                                </div>

                                <div className="rp-bank-panel">
                                    <div className="rp-section-title"><FaPhoneAlt /> Central de Emergencias 911</div>
                                    <div className="rp-bank-controls">
                                        <input type="text" value={ call911Msg } onChange={ e => setCall911Msg(e.target.value) } placeholder="Describe tu emergencia..." />
                                        <button type="button" disabled={ busy } onClick={ () => runAction('/911', { service: 'police', message: call911Msg }, () => setCall911Msg('')) }>
                                            🚔 Llamar Policía
                                        </button>
                                        <button type="button" className="is-green" disabled={ busy } onClick={ () => runAction('/911', { service: 'medic', message: call911Msg }, () => setCall911Msg('')) }>
                                            🚑 Llamar Médico
                                        </button>
                                    </div>
                                </div>

                                <div className="rp-section-title"><FaExclamationTriangle /> Sucesos Recientes en Ciudad Habbten</div>
                                <div className="rp-feed-list">
                                    { state.recentEvents.length === 0 ? (
                                        <p className="rp-empty">Ciudad tranquila por ahora...</p>
                                    ) : state.recentEvents.map(ev => (
                                        <div key={ ev.id } className="rp-feed-item">
                                            <span>{ ev.message }</span>
                                            { ev.room_id && ev.room_id > 0 ? (
                                                <button type="button" onClick={ () => { CreateLinkEvent(`navigator/goto/${ ev.room_id }`); setActivePanel(null); } }>
                                                    Acudir
                                                </button>
                                            ) : null }
                                        </div>
                                    )) }
                                </div>
                            </div>
                        ) }

                        {/* 8. RANKINGS RP */}
                        { activePanel === 'rankings' && (
                            <div className="rp-rankings-view">
                                { !rankings ? (
                                    <p className="rp-empty">Cargando clasificaciones de Ciudad Habbten...</p>
                                ) : (
                                    <div className="rp-rank-grid">
                                        <div className="rp-rank-col">
                                            <div className="rp-section-title">💰 Más Ricos</div>
                                            { (rankings.richest || []).map((r: any, i: number) => (
                                                <div key={ r.user_id } className="rp-rank-row">
                                                    <span>#{ i + 1 } <b>{ r.username }</b> (Nv.{ r.rp_level })</span>
                                                    <span className="text-emerald">${ Number(r.net_worth || 0).toLocaleString() }</span>
                                                </div>
                                            )) }
                                        </div>
                                        <div className="rp-rank-col">
                                            <div className="rp-section-title">⚔️ Más Peligrosos</div>
                                            { (rankings.fighters || []).map((r: any, i: number) => (
                                                <div key={ r.user_id } className="rp-rank-row">
                                                    <span>#{ i + 1 } <b>{ r.username }</b></span>
                                                    <span className="text-rose">{ r.kills } KO / { r.deaths } M</span>
                                                </div>
                                            )) }
                                        </div>
                                        <div className="rp-rank-col">
                                            <div className="rp-section-title">🏴 Bandas Dominantes</div>
                                            { (rankings.gangs || []).length === 0 ? (
                                                <p className="rp-empty">Sin bandas todavía.</p>
                                            ) : rankings.gangs.map((g: any, i: number) => (
                                                <div key={ g.id } className="rp-rank-row">
                                                    <span>#{ i + 1 } <b style={ { color: g.color } }>[{ g.tag }] { g.name }</b></span>
                                                    <span>{ g.turfs } zonas · { g.members } m.</span>
                                                </div>
                                            )) }
                                        </div>
                                    </div>
                                ) }
                            </div>
                        ) }
                    </div>
                </div>
            ) }
        </div>
    );
};
