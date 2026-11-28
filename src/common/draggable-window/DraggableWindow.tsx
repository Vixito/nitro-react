import { MouseEventType, TouchEventType } from '@nitrots/nitro-renderer';
import { CSSProperties, FC, Key, MouseEvent as ReactMouseEvent, ReactNode, TouchEvent as ReactTouchEvent, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Base } from '..';
import { GetLocalStorage, SetLocalStorage, WindowSaveOptions } from '../../api';
import { DraggableWindowPosition } from './DraggableWindowPosition';

const CURRENT_WINDOWS: HTMLElement[] = [];
const BOUNDS_THRESHOLD_TOP: number = 0;
const BOUNDS_THRESHOLD_LEFT: number = 0;

export interface DraggableWindowProps
{
    uniqueKey?: Key;
    handleSelector?: string;
    windowPosition?: string;
    disableDrag?: boolean;
    dragStyle?: CSSProperties;
    offsetLeft?: number;
    offsetTop?: number;
    className?: string;
    children?: ReactNode;
}

export const DraggableWindow: FC<DraggableWindowProps> = props =>
{
    const { uniqueKey = null, handleSelector = '.drag-handler', windowPosition = DraggableWindowPosition.CENTER, disableDrag = false, dragStyle = {}, children = null, offsetLeft = 0, offsetTop = 0, className = '' } = props;
    const [ delta, setDelta ] = useState<{ x: number, y: number }>(null);
    const [ offset, setOffset ] = useState<{ x: number, y: number }>(null);
    const [ start, setStart ] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
    const [ isDragging, setIsDragging ] = useState(false);
    const [ dragHandler, setDragHandler ] = useState<HTMLElement>(null);
    const elementRef = useRef<HTMLDivElement>();

    const bringToTop = useCallback(() =>
    {
        let zIndex = 400;

        for(const existingWindow of CURRENT_WINDOWS)
        {
            zIndex += 1;

            existingWindow.style.zIndex = zIndex.toString();
        }
    }, []);

    const moveCurrentWindow = useCallback(() =>
    {
        const index = CURRENT_WINDOWS.indexOf(elementRef.current);

        if(index === -1)
        {
            CURRENT_WINDOWS.push(elementRef.current);
        }

        else if(index === (CURRENT_WINDOWS.length - 1)) return;

        else if(index >= 0)
        {
            CURRENT_WINDOWS.splice(index, 1);

            CURRENT_WINDOWS.push(elementRef.current);
        }

        bringToTop();
    }, [ bringToTop ]);

    const onMouseDown = useCallback((event: ReactMouseEvent<HTMLDivElement>) =>
    {
        moveCurrentWindow();
    }, [ moveCurrentWindow ]);

    const onTouchStart = useCallback((event: ReactTouchEvent<HTMLDivElement>) =>
    {
        moveCurrentWindow();
    }, [ moveCurrentWindow ]);

    const startDragging = useCallback((startX: number, startY: number) =>
    {
        setStart({ x: startX, y: startY });
        setIsDragging(true);
    }, []);

    const isInteractiveTarget = useCallback((target: EventTarget | null) =>
    {
        if(!(target instanceof HTMLElement)) return false;
        return !!target.closest('button, a, input, select, textarea, .camera-button, .header-close, .camera-frame-preview-actions, .nitro-card-header-close');
    }, []);

    const onDragMouseDown = useCallback((event: MouseEvent) =>
    {
        if(isInteractiveTarget(event.target)) return;
        startDragging(event.clientX, event.clientY);
    }, [ isInteractiveTarget, startDragging ]);

    const onTouchDown = useCallback((event: TouchEvent) =>
    {
        if(isInteractiveTarget(event.target)) return;
        const touch = event.touches[0];

        startDragging(touch.clientX, touch.clientY);
    }, [ isInteractiveTarget, startDragging ]);

    const onDragMouseMove = useCallback((event: MouseEvent) =>
    {
        setDelta({ x: (event.clientX - start.x), y: (event.clientY - start.y) });
    }, [ start ]);

    const onDragTouchMove = useCallback((event: TouchEvent) =>
    {
        const touch = event.touches[0];

        setDelta({ x: (touch.clientX - start.x), y: (touch.clientY - start.y) });
    }, [ start ]);

    const completeDrag = useCallback(() =>
    {
        if(!elementRef.current || !dragHandler) return;
        
        let offsetX = (offset.x + delta.x);
        let offsetY = (offset.y + delta.y);

        const elemRect = elementRef.current.getBoundingClientRect();
        const elemW = elemRect.width || elementRef.current.offsetWidth;
        const elemH = elemRect.height || elementRef.current.offsetHeight;
        const handleRect = dragHandler.getBoundingClientRect();
        const handleH = Math.min(48, handleRect.height || dragHandler.offsetHeight, elemH);

        const left = elementRef.current.offsetLeft + offsetX;
        const top = elementRef.current.offsetTop + offsetY;

        if(top < BOUNDS_THRESHOLD_TOP)
        {
            offsetY = -elementRef.current.offsetTop;
        }

        else if((top + handleH) >= (document.body.offsetHeight - BOUNDS_THRESHOLD_TOP))
        {
            offsetY = (document.body.offsetHeight - handleH) - elementRef.current.offsetTop;
        }

        if((left + elemW) < (BOUNDS_THRESHOLD_LEFT + 48))
        {
            offsetX = (BOUNDS_THRESHOLD_LEFT + 48 - elemW) - elementRef.current.offsetLeft;
        }

        else if(left >= (document.body.offsetWidth - BOUNDS_THRESHOLD_LEFT - 48))
        {
            offsetX = (document.body.offsetWidth - BOUNDS_THRESHOLD_LEFT - 48) - elementRef.current.offsetLeft;
        }

        setDelta({ x: 0, y: 0 });
        setOffset({ x: offsetX, y: offsetY });
        setIsDragging(false);

        if(uniqueKey !== null)
        {
            const newStorage = { ...GetLocalStorage<WindowSaveOptions>(`nitro.windows.${ uniqueKey }`) } as WindowSaveOptions;

            newStorage.offset = { x: offsetX, y: offsetY };

            SetLocalStorage<WindowSaveOptions>(`nitro.windows.${ uniqueKey }`, newStorage);
        }
    }, [ dragHandler, delta, offset, uniqueKey ]);

    const onDragMouseUp = useCallback((event: MouseEvent) =>
    {
        completeDrag();
    }, [ completeDrag ]);

    const onDragTouchUp = useCallback((event: TouchEvent) =>
    {
        completeDrag();
    }, [ completeDrag ]);

    useEffect(() =>
    {
        const element = (elementRef.current as HTMLElement);

        if(!element) return;

        CURRENT_WINDOWS.push(element);

        bringToTop();

        if(!disableDrag)
        {
            const handle = (element.querySelector(handleSelector) as HTMLElement);

            if(handle) setDragHandler(handle);
        }

        const isMobileUi = document.body.classList.contains('is-mobile-ui');
        let offsetX = 0;
        let offsetY = 0;

        const positionMobileWindow = () =>
        {
            const vw = window.innerWidth || document.documentElement.clientWidth;
            const vh = window.innerHeight || document.documentElement.clientHeight;
            // En Habbten RP no existe el dock móvil clásico inferior: no se reserva espacio
            const bottomDockReserve = document.body.classList.contains('habbten-rp-client') ? 8 : 66;
            const topPad = 8;
            const usableH = Math.max(120, vh - topPad - bottomDockReserve);
            const w = element.offsetWidth;
            const h = element.offsetHeight;
            const clampedLeft = Math.max(6, Math.round((vw - w) / 2));
            const clampedTop = Math.max(topPad, Math.round(topPad + Math.max(0, (usableH - h) / 2)));

            element.style.left = `${ clampedLeft }px`;
            element.style.top = `${ clampedTop }px`;
        };

        if(isMobileUi)
        {
            positionMobileWindow();
        }
        else
        {
            switch(windowPosition)
            {
                case DraggableWindowPosition.TOP_CENTER:
                    element.style.top = 50 + offsetTop + 'px';
                    element.style.left = `calc(50vw - ${ (element.offsetWidth / 2 + offsetLeft) }px)`;
                    break;
                case DraggableWindowPosition.CENTER:
                    element.style.top = `calc(50vh - ${ (element.offsetHeight / 2) + offsetTop }px)`;
                    element.style.left = `calc(50vw - ${ (element.offsetWidth / 2) + offsetLeft }px)`;
                    break;
                case DraggableWindowPosition.TOP_LEFT:
                    element.style.top = 50 + offsetTop + 'px';
                    element.style.left = 50 + offsetLeft + 'px';
                    break;
            }
        }

        setDelta({ x: 0, y: 0 });
        setOffset({ x: offsetX, y: offsetY });

        let resizeObserver: ResizeObserver = null;
        const onMobileViewportResize = () =>
        {
            if(document.body.classList.contains('is-mobile-ui')) positionMobileWindow();
        };

        if(isMobileUi)
        {
            window.addEventListener('resize', onMobileViewportResize);
            if(typeof ResizeObserver !== 'undefined')
            {
                resizeObserver = new ResizeObserver(() =>
                {
                    if(document.body.classList.contains('is-mobile-ui')) positionMobileWindow();
                });
                resizeObserver.observe(element);
            }
        }

        return () =>
        {
            if(isMobileUi)
            {
                window.removeEventListener('resize', onMobileViewportResize);
                if(resizeObserver) resizeObserver.disconnect();
            }

            const index = CURRENT_WINDOWS.indexOf(element);

            if(index >= 0) CURRENT_WINDOWS.splice(index, 1);
        }
    }, [ handleSelector, windowPosition, uniqueKey, disableDrag, offsetLeft, offsetTop, bringToTop ]);

    useEffect(() =>
    {
        if(!offset && !delta) return;
        
        const element = (elementRef.current as HTMLElement);

        if(!element) return;

        element.style.transform = `translate(${ offset.x + delta.x }px, ${ offset.y + delta.y }px)`;
        element.style.visibility = 'visible';
    }, [ offset, delta ]);

    useEffect(() =>
    {
        if(!dragHandler) return;

        dragHandler.addEventListener(MouseEventType.MOUSE_DOWN, onDragMouseDown);
        dragHandler.addEventListener(TouchEventType.TOUCH_START, onTouchDown);

        return () =>
        {
            dragHandler.removeEventListener(MouseEventType.MOUSE_DOWN, onDragMouseDown);
            dragHandler.removeEventListener(TouchEventType.TOUCH_START, onTouchDown);
        }
    }, [ dragHandler, onDragMouseDown, onTouchDown ]);

    useEffect(() =>
    {
        if(!isDragging) return;

        document.addEventListener(MouseEventType.MOUSE_UP, onDragMouseUp);
        document.addEventListener(TouchEventType.TOUCH_END, onDragTouchUp);
        document.addEventListener(MouseEventType.MOUSE_MOVE, onDragMouseMove);
        document.addEventListener(TouchEventType.TOUCH_MOVE, onDragTouchMove);

        return () =>
        {
            document.removeEventListener(MouseEventType.MOUSE_UP, onDragMouseUp);
            document.removeEventListener(TouchEventType.TOUCH_END, onDragTouchUp);
            document.removeEventListener(MouseEventType.MOUSE_MOVE, onDragMouseMove);
            document.removeEventListener(TouchEventType.TOUCH_MOVE, onDragTouchMove);
        }
    }, [ isDragging, onDragMouseUp, onDragMouseMove, onDragTouchUp, onDragTouchMove ]);

    // Restore saved offset from localStorage, but clamp it so the window stays visible.
    // Use requestAnimationFrame to wait until the element has real dimensions.
    useEffect(() =>
    {
        if(!uniqueKey || document.body.classList.contains('is-mobile-ui')) return;

        const localStorage = GetLocalStorage<WindowSaveOptions>(`nitro.windows.${ uniqueKey }`);

        if(!localStorage || !localStorage.offset) return;

        const savedOffset = localStorage.offset;

        // Wait for the element to have dimensions before validating
        const applyOffset = () =>
        {
            const element = elementRef.current;
            if(!element) return;

            const vw = window.innerWidth || document.documentElement.clientWidth;
            const vh = window.innerHeight || document.documentElement.clientHeight;
            const elemW = element.offsetWidth;
            const elemH = element.offsetHeight;

            // If the element hasn't been laid out yet, skip
            if(elemW === 0 || elemH === 0) return;

            // Center of the screen is the base position
            const centerX = (vw - elemW) / 2;
            const centerY = (vh - elemH) / 2;

            // Clamp the offset so at least 50px of the window remains visible on each edge
            const margin = 50;
            let clampedX = savedOffset.x;
            let clampedY = savedOffset.y;

            // Top edge: proposedTop = centerY + clampedY >= margin
            const minTop = margin - centerY;
            if(clampedY < minTop) clampedY = minTop;

            // Bottom edge: proposedTop + elemH <= vh - margin  =>  centerY + clampedY + elemH <= vh - margin
            const maxTop = vh - margin - elemH - centerY;
            if(clampedY > maxTop) clampedY = maxTop;

            // Left edge: proposedLeft = centerX + clampedX >= margin
            const minLeft = margin - centerX;
            if(clampedX < minLeft) clampedX = minLeft;

            // Right edge: proposedLeft + elemW <= vw - margin  =>  centerX + clampedX + elemW <= vw - margin
            const maxLeft = vw - margin - elemW - centerX;
            if(clampedX > maxLeft) clampedX = maxLeft;

            // If clamped values differ significantly from saved, update localStorage
            if(clampedX !== savedOffset.x || clampedY !== savedOffset.y)
            {
                const newStorage = { ...GetLocalStorage<WindowSaveOptions>(`nitro.windows.${ uniqueKey }`) } as WindowSaveOptions;
                newStorage.offset = { x: clampedX, y: clampedY };
                SetLocalStorage<WindowSaveOptions>(`nitro.windows.${ uniqueKey }`, newStorage);
            }

            setDelta({ x: 0, y: 0 });
            setOffset({ x: clampedX, y: clampedY });
        };

        // Try immediately; if dimensions aren't ready, retry on next frame
        if(elementRef.current && elementRef.current.offsetWidth > 0)
        {
            applyOffset();
        }
        else
        {
            const raf = requestAnimationFrame(applyOffset);
            return () => cancelAnimationFrame(raf);
        }
    }, [ uniqueKey ]);

    return (
        createPortal(
            <Base position="absolute" innerRef={ elementRef } className={ `draggable-window ${ className }`.trim() } onMouseDownCapture={ onMouseDown } onTouchStartCapture={ onTouchStart } style={ dragStyle }>
                { children }
            </Base>, document.getElementById('draggable-windows-container'))
    );
}
