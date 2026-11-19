import { useCallback, useEffect, useRef, useState } from 'react';
import { useBetween } from 'use-between';

export interface ActiveGamePresence
{
    userId: number;
    username: string;
    game: string;
    label: string;
    state: string;
}

const useGamePresenceState = () =>
{
    const [ activePlayers, setActivePlayers ] = useState<Record<number, ActiveGamePresence>>({});
    const myGameRef = useRef<{ game: string; label: string } | null>(null);
    const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const refreshPresence = useCallback(async () =>
    {
        try
        {
            const res = await fetch('/api/games/presence', { credentials: 'include' });
            if (!res.ok) return;
            const data = await res.json();
            if (data && data.success && data.active)
            {
                setActivePlayers(data.active);
            }
        }
        catch
        {
            // Ignore transient network errors
        }
    }, []);

    const sendPresence = useCallback(async (game: string | null, label = 'SNOW STORM') =>
    {
        try
        {
            await fetch('/api/games/presence', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(game ? { game, label, state: 'playing' } : { game: null, state: 'clear' })
            });
            refreshPresence();
        }
        catch
        {
            // Ignore
        }
    }, [ refreshPresence ]);

    const setMyGamePresence = useCallback((game: string | null, label = 'SNOW STORM') =>
    {
        if (heartbeatRef.current)
        {
            clearInterval(heartbeatRef.current);
            heartbeatRef.current = null;
        }

        if (!game)
        {
            myGameRef.current = null;
            sendPresence(null);
            return;
        }

        myGameRef.current = { game, label };
        sendPresence(game, label);

        heartbeatRef.current = setInterval(() =>
        {
            if (myGameRef.current)
            {
                sendPresence(myGameRef.current.game, myGameRef.current.label);
            }
        }, 15000);
    }, [ sendPresence ]);

    // Poll active players every 12 seconds
    useEffect(() =>
    {
        refreshPresence();
        const timer = setInterval(refreshPresence, 12000);

        const handleUnload = () =>
        {
            if (myGameRef.current && navigator.sendBeacon)
            {
                navigator.sendBeacon('/api/games/presence', JSON.stringify({ game: null, state: 'clear' }));
            }
        };
        window.addEventListener('beforeunload', handleUnload);

        return () =>
        {
            clearInterval(timer);
            window.removeEventListener('beforeunload', handleUnload);
            if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        };
    }, [ refreshPresence ]);

    return {
        activePlayers,
        refreshPresence,
        setMyGamePresence
    };
};

export const useGamePresence = () => useBetween(useGamePresenceState);

