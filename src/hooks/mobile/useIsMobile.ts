import { useEffect, useState } from 'react';

export type MobileTouchMode = 'walk' | 'pan';
export type MobileDpadSide = 'right' | 'left';

const MOBILE_MODE_EVENT = 'habbten-mobile-touch-mode-changed';
const MOBILE_DPAD_EVENT = 'habbten-mobile-dpad-changed';
const DPAD_ENABLED_KEY = 'habbten_mobile_dpad_enabled';
const DPAD_SIDE_KEY = 'habbten_mobile_dpad_side';
let currentTouchMode: MobileTouchMode = 'walk';

export function getMobileDpadEnabled(): boolean
{
    if(typeof window === 'undefined') return true;
    try
    {
        const raw = window.localStorage.getItem(DPAD_ENABLED_KEY);
        if(raw === 'false' || raw === '0') return false;
        return true;
    }
    catch
    {
        return true;
    }
}

export function setMobileDpadEnabled(enabled: boolean): void
{
    if(typeof window === 'undefined') return;
    try
    {
        window.localStorage.setItem(DPAD_ENABLED_KEY, enabled ? 'true' : 'false');
    }
    catch {}
    window.dispatchEvent(new CustomEvent(MOBILE_DPAD_EVENT));
}

export function getMobileDpadSide(): MobileDpadSide
{
    if(typeof window === 'undefined') return 'right';
    try
    {
        const raw = window.localStorage.getItem(DPAD_SIDE_KEY);
        return raw === 'left' ? 'left' : 'right';
    }
    catch
    {
        return 'right';
    }
}

export function setMobileDpadSide(side: MobileDpadSide): void
{
    if(typeof window === 'undefined') return;
    const clean: MobileDpadSide = side === 'left' ? 'left' : 'right';
    try
    {
        window.localStorage.setItem(DPAD_SIDE_KEY, clean);
    }
    catch {}
    window.dispatchEvent(new CustomEvent(MOBILE_DPAD_EVENT));
}

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
    if(typeof (window as any).HabbtenNative !== 'undefined') return true;
    if(/HabbtenMobileApp/i.test(navigator.userAgent || '')) return true;

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

export function useMobileDpadSettings(): {
    enabled: boolean;
    side: MobileDpadSide;
    setEnabled: (enabled: boolean) => void;
    setSide: (side: MobileDpadSide) => void;
}
{
    const [ enabled, setEnabledState ] = useState<boolean>(() => getMobileDpadEnabled());
    const [ side, setSideState ] = useState<MobileDpadSide>(() => getMobileDpadSide());

    useEffect(() =>
    {
        const sync = () =>
        {
            setEnabledState(getMobileDpadEnabled());
            setSideState(getMobileDpadSide());
        };
        window.addEventListener(MOBILE_DPAD_EVENT, sync);
        return () => window.removeEventListener(MOBILE_DPAD_EVENT, sync);
    }, []);

    return {
        enabled,
        side,
        setEnabled: setMobileDpadEnabled,
        setSide: setMobileDpadSide
    };
}

