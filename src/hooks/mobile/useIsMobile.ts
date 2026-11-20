import { useEffect, useState } from 'react';

export type MobileTouchMode = 'walk' | 'pan';

const MOBILE_MODE_EVENT = 'habbten-mobile-touch-mode-changed';
let currentTouchMode: MobileTouchMode = 'walk';

export function getMobileTouchMode(): MobileTouchMode
{
    return currentTouchMode;
}

export function setMobileTouchMode(mode: MobileTouchMode): void
{
    if(currentTouchMode === mode) return;
    currentTouchMode = mode;
    if(typeof window !== 'undefined')
    {
        (window as any).__habbtenMobileTouchMode = mode;
        window.dispatchEvent(new CustomEvent<MobileTouchMode>(MOBILE_MODE_EVENT, { detail: mode }));
    }
}

export function detectIsMobileViewport(): boolean
{
    if(typeof window === 'undefined') return false;

    const path = (window.location.pathname || '').toLowerCase();
    if(path.indexOf('/game/mobile') === 0 || path.indexOf('/mobile') === 0) return true;

    try
    {
        if(window.parent && window.parent !== window)
        {
            const parentPath = (window.parent.location.pathname || '').toLowerCase();
            if(parentPath.indexOf('/app') === 0) return true;
        }
    }
    catch
    {
        // ignore cross-origin restrictions
    }

    const isStandalone = (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches)
        || (window.navigator as any).standalone === true;
    if(isStandalone) return true;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const isCoarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');

    // Compact phones (portrait or landscape) or touch tablets in compact viewport
    if(width <= 860) return true;
    if((isCoarse || isMobileUA) && (width <= 1024 || height <= 560)) return true;

    return false;
}

export function useIsMobile(): boolean
{
    const [ isMobile, setIsMobile ] = useState<boolean>(() => detectIsMobileViewport());

    useEffect(() =>
    {
        const update = () =>
        {
            const next = detectIsMobileViewport();
            setIsMobile(next);
            if(next)
            {
                document.body.classList.remove('era-modern', 'era-flash-2012', 'era-shockwave-2006');
                document.body.classList.add('is-mobile-ui');
                document.body.dataset.era = 'mobile';
            }
            else
            {
                document.body.classList.remove('is-mobile-ui');
            }
        };

        update();
        window.addEventListener('resize', update);
        window.addEventListener('orientationchange', update);

        return () =>
        {
            window.removeEventListener('resize', update);
            window.removeEventListener('orientationchange', update);
        };
    }, []);

    return isMobile;
}

export function useMobileTouchMode(): [ MobileTouchMode, (mode: MobileTouchMode) => void ]
{
    const [ mode, setMode ] = useState<MobileTouchMode>(() => getMobileTouchMode());

    useEffect(() =>
    {
        const handler = (e: Event) =>
        {
            const detail = (e as CustomEvent<MobileTouchMode>).detail;
            if(detail === 'walk' || detail === 'pan') setMode(detail);
        };
        window.addEventListener(MOBILE_MODE_EVENT, handler);
        return () => window.removeEventListener(MOBILE_MODE_EVENT, handler);
    }, []);

    return [ mode, setMobileTouchMode ];
}

