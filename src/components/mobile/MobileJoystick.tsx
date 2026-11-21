import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { useIsMobile, useMobileDpadSettings } from '../../hooks/mobile/useIsMobile';

export type JoystickPhase = 'start' | 'move' | 'end';

interface MobileJoystickProps
{
    onVectorChange: (vx: number, vy: number, phase: JoystickPhase) => void;
    className?: string;
}

export const MobileJoystick: FC<MobileJoystickProps> = ({ onVectorChange, className = '' }) =>
{
    const isMobile = useIsMobile();
    const { enabled, side } = useMobileDpadSettings();
    const [ knob, setKnob ] = useState<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
    const padRef = useRef<HTMLDivElement>(null);
    const pointerIdRef = useRef<number | null>(null);
    const isActiveRef = useRef<boolean>(false);
    const cbRef = useRef(onVectorChange);
    cbRef.current = onVectorChange;

    const release = useCallback(() =>
    {
        if(!isActiveRef.current && pointerIdRef.current === null) return;
        isActiveRef.current = false;
        pointerIdRef.current = null;
        setKnob({ x: 0, y: 0, active: false });
        cbRef.current(0, 0, 'end');
    }, []);

    const updateFromPoint = useCallback((clientX: number, clientY: number, phase: 'start' | 'move') =>
    {
        const pad = padRef.current;
        if(!pad) return;

        const rect = pad.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const rawX = clientX - cx;
        const rawY = clientY - cy;
        const dist = Math.hypot(rawX, rawY);
        const maxRadius = rect.width * 0.34;
        const deadZone = 7;

        if(dist < deadZone)
        {
            setKnob({ x: rawX * 0.4, y: rawY * 0.4, active: true });
            if(phase === 'move') cbRef.current(0, 0, 'move');
            return;
        }

        const clamped = Math.min(dist, maxRadius);
        const nx = rawX / dist;
        const ny = rawY / dist;
        setKnob({ x: nx * clamped, y: ny * clamped, active: true });
        cbRef.current(nx, ny, phase);
    }, []);

    // Global release failsafe so the avatar NEVER gets stuck walking if a touch ends outside WebView bounds
    useEffect(() =>
    {
        const onWindowUp = (e: PointerEvent) =>
        {
            if(pointerIdRef.current !== null && e.pointerId === pointerIdRef.current) release();
        };
        const onWindowTouchEnd = (e: TouchEvent) =>
        {
            if(isActiveRef.current && e.touches.length === 0) release();
        };
        const onBlur = () => release();

        window.addEventListener('pointerup', onWindowUp);
        window.addEventListener('pointercancel', onWindowUp);
        window.addEventListener('touchend', onWindowTouchEnd);
        window.addEventListener('touchcancel', onWindowTouchEnd);
        window.addEventListener('blur', onBlur);

        return () =>
        {
            window.removeEventListener('pointerup', onWindowUp);
            window.removeEventListener('pointercancel', onWindowUp);
            window.removeEventListener('touchend', onWindowTouchEnd);
            window.removeEventListener('touchcancel', onWindowTouchEnd);
            window.removeEventListener('blur', onBlur);
        };
    }, [ release ]);

    useEffect(() =>
    {
        if(!isMobile || !enabled) release();
        return () =>
        {
            isActiveRef.current = false;
            pointerIdRef.current = null;
            cbRef.current(0, 0, 'end');
        };
    }, [ isMobile, enabled, release ]);

    if(!isMobile || !enabled) return null;

    return (
        <div
            ref={ padRef }
            className={ `hmob-joystick ${ side === 'left' ? 'is-left' : 'is-right' } ${ knob.active ? 'is-active' : '' } ${ className }`.trim() }
            role="application"
            aria-label="Joystick de movimiento"
            onPointerDown={ e =>
            {
                e.preventDefault();
                e.stopPropagation();
                isActiveRef.current = true;
                pointerIdRef.current = e.pointerId;
                try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
                updateFromPoint(e.clientX, e.clientY, 'start');
            } }
            onPointerMove={ e =>
            {
                if(!isActiveRef.current || pointerIdRef.current !== e.pointerId) return;
                e.preventDefault();
                e.stopPropagation();
                updateFromPoint(e.clientX, e.clientY, 'move');
            } }
            onPointerUp={ e =>
            {
                if(pointerIdRef.current !== e.pointerId) return;
                e.preventDefault();
                try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
                release();
            } }
            onPointerCancel={ e =>
            {
                if(pointerIdRef.current !== e.pointerId) return;
                release();
            } }
            onLostPointerCapture={ () => release() }
        >
            <span className="hmob-joy-arrow is-up" aria-hidden="true">▲</span>
            <span className="hmob-joy-arrow is-down" aria-hidden="true">▼</span>
            <span className="hmob-joy-arrow is-left" aria-hidden="true">◀</span>
            <span className="hmob-joy-arrow is-right" aria-hidden="true">▶</span>
            <div
                className="hmob-joy-knob"
                style={ { transform: `translate(${ knob.x }px, ${ knob.y }px)` } }
            />
        </div>
    );
};
