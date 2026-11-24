import { FC, useCallback, useEffect, useState } from 'react';
import { ILinkEventTracker } from '@nitrots/nitro-renderer';
import { AddEventLinkTracker, RemoveLinkEventTracker } from '../../api';
import { NitroCardContentView, NitroCardHeaderView, NitroCardView } from '../../common';

const API = '/api/client/discord';

type Settings = {
    show_in_status: boolean;
    share_activity: boolean;
    hide_hidden_rooms: boolean;
    allow_join: boolean;
};

type Pending = { code: string; discordUsername: string; expiresAt: number };

type Status = {
    linked: boolean;
    discord: { username: string; globalName?: string; via?: string; hasAgent?: boolean } | null;
    settings: Settings;
    pending: Pending | null;
};


async function api<T = any>(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T }>
{
    const response = await fetch(`${ API }${ path }`, {
        credentials: 'include',
        ...init,
        headers: { 'content-type': 'application/json', ...(init?.headers || {}) }
    });
    let data: any = null;
    try { data = await response.json(); } catch (_) { data = null; }
    return { ok: response.ok, status: response.status, data };
}

export const DiscordLinkModalView: FC<{}> = () =>
{
    const [ isVisible, setIsVisible ] = useState(false);
    const [ status, setStatus ] = useState<Status | null>(null);
    const [ discordUsername, setDiscordUsername ] = useState('');
    const [ busy, setBusy ] = useState(false);
    const [ message, setMessage ] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

    const refresh = useCallback(async () =>
    {
        const { ok, data } = await api<Status>('/status');
        if (ok && data) setStatus(data);
    }, []);

    useEffect(() =>
    {
        const tracker: ILinkEventTracker = {
            linkReceived: (url: string) =>
            {
                const parts = url.split('/');
                if(parts.length < 2) return;

                switch(parts[1])
                {
                    case 'show':
                    case 'open':
                        setIsVisible(true);
                        return;
                    case 'hide':
                    case 'close':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setIsVisible(prev => !prev);
                        return;
                }
            },
            eventUrlPrefix: 'discord/'
        };

        AddEventLinkTracker(tracker);
        return () => RemoveLinkEventTracker(tracker);
    }, []);

    useEffect(() =>
    {
        if(!isVisible) return;

        refresh();
        const interval = setInterval(refresh, 5000);
        return () => clearInterval(interval);
    }, [ isVisible, refresh ]);

    const startLink = async () =>
    {
        const username = discordUsername.trim();
        if(!username)
        {
            setMessage({ type: 'error', text: 'Escribe tu usuario de Discord.' });
            return;
        }

        setBusy(true);
        setMessage(null);

        const { ok, data } = await api('/link/start', { method: 'POST', body: JSON.stringify({ discordUsername: username }) });

        setBusy(false);

        if(ok)
        {
            setMessage({ type: 'ok', text: 'Te hemos enviado un mensaje privado en Discord. Ábrelo y pulsa «Confirmar».' });
            refresh();
            return;
        }

        const errors: Record<string, string> = {
            invalid_discord_username: 'Ese usuario de Discord no es válido.',
            already_linked: 'Esta cuenta ya está conectada a un Discord.',
            member_not_found: 'No estás en el servidor de Habbten o el usuario no existe.',
            guild_not_found: 'El bot de Habbten no está en el servidor. Avisa al staff.',
            guild_not_configured: 'El bot de Habbten no está configurado todavía.',
            dm_closed: 'No puedo enviarte un privado: abre los mensajes directos del servidor de Habbten.',
            bot_unreachable: 'El bot no está disponible ahora mismo.',
            too_many_attempts: 'Demasiados intentos. Espera unos minutos.'
        };

        setMessage({ type: 'error', text: errors[data?.error] || 'No se pudo enviar la solicitud.' });
    };

    const confirmPending = async () =>
    {
        if(!status?.pending) return;

        setBusy(true);
        const { ok, data } = await api('/link/confirm', { method: 'POST', body: JSON.stringify({ code: status.pending.code }) });
        setBusy(false);

        if(ok)
        {
            setMessage({ type: 'ok', text: `Conectado con ${ data?.discordUsername || 'Discord' }.` });
            refresh();
            return;
        }

        setMessage({ type: 'error', text: 'La solicitud ha caducado o ya no es válida.' });
        refresh();
    };

    const rejectPending = async () =>
    {
        if(!status?.pending) return;

        setBusy(true);
        await api('/link/cancel', { method: 'POST', body: JSON.stringify({ code: status.pending.code }) });
        setBusy(false);
        setMessage({ type: 'ok', text: 'Solicitud rechazada.' });
        refresh();
    };

    const toggleSetting = async (key: keyof Settings) =>
    {
        if(!status) return;

        const next = { ...status.settings, [key]: !status.settings[key] };
        setStatus({ ...status, settings: next });

        const { ok, data } = await api('/settings', { method: 'PUT', body: JSON.stringify(next) });
        if(ok && data?.settings) setStatus({ ...status, settings: data.settings });
    };

    const unlink = async () =>
    {
        if(!confirm('¿Seguro que quieres desconectar Habbten de Discord?')) return;

        setBusy(true);
        const { ok } = await api('/link', { method: 'DELETE' });
        setBusy(false);

        if(ok)
        {
            setMessage({ type: 'ok', text: 'Desconectado. Puedes volver a conectar cuando quieras.' });
            refresh();
        }
    };

    if(!isVisible) return null;

    return (
        <NitroCardView uniqueKey="nitro-discord-settings" theme="primary-slim" className="nitro-discord-settings" style={{ zIndex: 1050, width: 430, maxWidth: '95vw', backgroundColor: '#2d2847', color: '#ffffff', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
            <NitroCardHeaderView headerText="Habbten Actividad en Discord" onCloseClick={ () => setIsVisible(false) } />
            <NitroCardContentView className="p-3" style={{ backgroundColor: '#2d2847', color: '#ffffff' }}>

                { !status && <p className="mb-0 text-white">Cargando…</p> }

                { status?.pending && (
                    <div className="p-3 rounded mb-3" style={{ background: 'rgba(52, 152, 219, 0.18)', border: '1px solid #3498db' }}>
                        <div className="fw-bold mb-2 text-white">Solicitud desde Discord</div>
                        <p className="mb-2 small" style={{ color: '#cbd5e1' }}>
                            <strong>{ status.pending.discordUsername }</strong> quiere conectar su Discord con esta cuenta.
                        </p>
                        <div className="d-flex gap-2">
                            <button
                                type="button"
                                className="btn btn-success btn-sm fw-bold px-3"
                                disabled={ busy }
                                onClick={ confirmPending }
                            >
                                Aceptar
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm fw-bold px-3"
                                disabled={ busy }
                                onClick={ rejectPending }
                            >
                                Rechazar
                            </button>
                        </div>
                    </div>
                ) }

                { status && !status.pending && (
                    <>
                        <div className="d-flex align-items-center gap-3 mb-3">
                            <div style={{ width: 64, height: 64, minWidth: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="60" height="60" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M32 6L56 18V44L32 58L8 44V18L32 6Z" fill="#5865F2" stroke="#4752C4" strokeWidth="2" />
                                    <path d="M32 6L56 18L32 30L8 18L32 6Z" fill="#7983F5" />
                                    <path d="M32 30V58L8 44V18L32 30Z" fill="#4752C4" />
                                    <path d="M32 30V58L56 44V18L32 30Z" fill="#5865F2" />
                                    <path d="M24 24C22.5 24.5 21 25.5 20 27.5C20 33.5 23 39 27 41C28 40 29 38.5 30 37.5C27.5 36.8 26.5 35 26.5 35C26.5 35 27 35.3 28 35.8C30.5 37 33 37.5 35.5 37.5C38 37.5 40.5 37 43 35.8C44 35.3 44.5 35 44.5 35C44.5 35 43.5 36.8 41 37.5C42 38.5 43 40 44 41C48 39 51 33.5 51 27.5C50 25.5 48.5 24.5 47 24C45.5 26 44.5 28 44 30C41.5 29.5 39 29.5 35.5 29.5C32 29.5 29.5 29.5 27 30C26.5 28 25.5 26 24 24Z" fill="white" />
                                </svg>
                            </div>
                            <div>
                                <div className="fw-bold mb-1" style={{ fontSize: '15px', color: '#ffffff' }}>Conecta Habbten a Discord</div>
                                <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4' }}>
                                    ¡Hemos detectado que tienes un auténtico espíritu gamer! *Choca esos cinco*<br />
                                    ¿Quieres que tus amigos/as sepan lo que estás haciendo en este loco hotel?
                                </div>
                            </div>
                        </div>

                        <div className="mb-3 p-3 rounded" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div className="fw-bold mb-2 text-white" style={{ fontSize: '13px' }}>Ajustes:</div>
                            <div className="d-flex flex-column gap-2" style={{ fontSize: '12px' }}>
                                <label className="d-flex align-items-center gap-2 cursor-pointer mb-0 ps-1">
                                    <input
                                        type="checkbox"
                                        className="form-check-input mt-0"
                                        checked={ !!status.settings.show_in_status }
                                        onChange={ () => toggleSetting('show_in_status') }
                                    />
                                    <span className="text-white">Mostrar Habbten en mi estado de Discord</span>
                                </label>
                                <label className="d-flex align-items-center gap-2 cursor-pointer mb-0 ps-1">
                                    <input
                                        type="checkbox"
                                        className="form-check-input mt-0"
                                        checked={ !!status.settings.share_activity }
                                        onChange={ () => toggleSetting('share_activity') }
                                    />
                                    <span className="text-white">Compartir mi actividad dentro del juego</span>
                                </label>
                                <div className="ps-4 d-flex flex-column gap-2">
                                    <label className="d-flex align-items-center gap-2 cursor-pointer mb-0">
                                        <input
                                            type="checkbox"
                                            className="form-check-input mt-0"
                                            checked={ !!status.settings.hide_hidden_rooms }
                                            onChange={ () => toggleSetting('hide_hidden_rooms') }
                                        />
                                        <span style={{ color: '#cbd5e1' }}>Esconder actividad en salas ocultas</span>
                                    </label>
                                    <label className="d-flex align-items-center gap-2 cursor-pointer mb-0">
                                        <input
                                            type="checkbox"
                                            className="form-check-input mt-0"
                                            checked={ !!status.settings.allow_join }
                                            onChange={ () => toggleSetting('allow_join') }
                                        />
                                        <span style={{ color: '#cbd5e1' }}>Permitir que los/as usuarios/as se unan a mí</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="mb-3">
                            <div className="fw-bold mb-1.5 text-white" style={{ fontSize: '13px' }}>Paso 1: Servidor Oficial de Habbten</div>
                            <div className="d-flex align-items-center justify-content-between p-1 rounded mt-2" style={{ background: '#3f385c', border: '1px solid #5a4f7e', color: '#ffffff' }}>
                                <div className="d-flex align-items-center gap-3">
                                    <div style={{ width: 44, height: 44, minWidth: 44, background: '#261f38', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #5a4f7e', padding: '3px' }}>
                                        <img src="habbten_logo.png" onError={({ currentTarget }) => { currentTarget.src = '/game/habbten_logo.png'; }} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} alt="" />
                                    </div>
                                    <div>
                                        <div className="fw-bold text-white" style={{ fontSize: '13px' }}>Servidor Oficial de Habbten</div>
                                        <div style={{ fontSize: '12.5px', color: '#e2e8f0' }}>Únete a nuestra comunidad oficial</div>
                                    </div>
                                </div>
                                <a
                                    href="https://discord.com/invite/EVafmrDh"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-sm py-1.5 px-3 fw-bold text-decoration-none"
                                    style={{ background: '#5865F2', color: '#ffffff', border: 'none', fontSize: '12px', borderRadius: '6px', marginRight: '4px' }}
                                >
                                    Unirse
                                </a>
                            </div>
                        </div>

                        <div className="p-3 rounded mb-3" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div className="fw-bold mb-2 text-white" style={{ fontSize: '12px' }}>Paso 2: Escribe tu Usuario de Discord:</div>
                            <div className="input-group">
                                <span className="input-group-text bg-dark text-white border-secondary">@</span>
                                <input
                                    type="text"
                                    className="form-control bg-dark text-white border-secondary"
                                    placeholder="tu_usuario_discord"
                                    value={ discordUsername }
                                    onChange={ event => setDiscordUsername(event.target.value) }
                                    onKeyDown={ event => { if(event.key === 'Enter' && !busy) startLink(); } }
                                    style={{ fontSize: '12px' }}
                                />
                                <button
                                    type="button"
                                    className={`btn ${status.linked ? 'btn-success' : 'btn-primary'} fw-bold px-3`}
                                    style={{ fontSize: '12px' }}
                                    disabled={ busy }
                                    onClick={ status.linked ? unlink : startLink }
                                >
                                    { busy ? 'Enviando…' : status.linked ? '✓ Vinculado' : 'Vincular' }
                                </button>
                            </div>
                            { message && (
                                <div className="small text-center mt-1.5" style={{ color: message.type === 'ok' ? '#7ce850' : '#e74c3c' }}>
                                    { message.text }
                                </div>
                            ) }
                        </div>

                        <button
                            type="button"
                            className="btn w-100 py-2 fw-bold"
                            style={{ background: '#4a406b', color: '#ffffff', border: '2px solid #2b2344', borderRadius: '6px', fontSize: '12px' }}
                            onClick={ () => setIsVisible(false) }
                        >
                            ¿Habbten en Discord? ¿Con esta economía..? ¡Sácame de aquí!
                        </button>
                    </>
                ) }
            </NitroCardContentView>
        </NitroCardView>
    );
};
