import { FC, useEffect, useRef } from 'react';
import { CreateLinkEvent, GetRoomSession, GetSessionDataManager } from '../../api';

/**
 * Informa al CMS de la sala actual para que el agente de rich presence
 * pueda mostrarla (o esconderla si es una sala oculta).
 *
 * Además atiende los enlaces del tipo `/client?room=<id>` que genera el botón
 * «Unirme a su sala» de la presencia de Discord.
 */
export const DiscordActivityReporter: FC<{}> = () =>
{
    const lastRoomId = useRef<number | null>(null);

    useEffect(() =>
    {
        const params = new URLSearchParams(window.location.search);
        const target = parseInt(params.get('room') || '', 10);

        if(!Number.isInteger(target) || target <= 0) return;

        // Quitamos el parámetro para que no se repita al recargar.
        params.delete('room');
        const query = params.toString();
        window.history.replaceState({}, '', `${ window.location.pathname }${ query ? `?${ query }` : '' }`);

        let attempts = 0;
        const timer = setInterval(() =>
        {
            attempts++;

            let ready = false;

            try { ready = GetSessionDataManager()?.userId > 0; }
            catch (_) { ready = false; }

            if(ready)
            {
                clearInterval(timer);
                setTimeout(() => CreateLinkEvent(`navigator/goto/${ target }`), 1500);
                return;
            }

            if(attempts > 60) clearInterval(timer);
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    useEffect(() =>
    {
        let cancelled = false;
        let lastSentAt = 0;

        const postActivity = async (roomId: number, keepalive: boolean = false) =>
        {
            lastRoomId.current = roomId;
            lastSentAt = Date.now();

            try
            {
                await fetch('/api/client/discord/activity', {
                    method: 'POST',
                    credentials: 'include',
                    keepalive,
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ roomId })
                });
            }
            catch (_) { /* silencioso: no debe afectar al juego */ }
        };

        const tick = async () =>
        {
            if(cancelled) return;

            let roomId = 0;

            try
            {
                const session = GetRoomSession();
                roomId = session ? (session.roomId || 0) : 0;
            }
            catch (_)
            {
                roomId = 0;
            }

            const elapsed = Date.now() - lastSentAt;
            const changed = (roomId !== lastRoomId.current);
            const needsHeartbeat = (roomId > 0) && (elapsed >= 60000);

            if(!changed && !needsHeartbeat) return;

            await postActivity(roomId);
        };

        const onPageLeave = () =>
        {
            if(lastRoomId.current && lastRoomId.current > 0)
            {
                try
                {
                    if(navigator.sendBeacon)
                    {
                        const blob = new Blob([ JSON.stringify({ roomId: 0 }) ], { type: 'application/json' });
                        navigator.sendBeacon('/api/client/discord/activity', blob);
                    }
                    else
                    {
                        postActivity(0, true);
                    }
                }
                catch (_) {}
            }
        };

        tick();
        const interval = setInterval(tick, 5000);
        window.addEventListener('pagehide', onPageLeave);
        window.addEventListener('beforeunload', onPageLeave);

        return () =>
        {
            cancelled = true;
            clearInterval(interval);
            window.removeEventListener('pagehide', onPageLeave);
            window.removeEventListener('beforeunload', onPageLeave);
        };
    }, []);

    return null;
};
