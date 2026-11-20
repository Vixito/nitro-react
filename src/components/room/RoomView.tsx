import { FC, useEffect, useRef } from 'react';
import { DispatchMouseEvent, DispatchTouchEvent, GetNitroInstance, GetRoomEngine } from '../../api';
import { Base } from '../../common';
import { useRoom } from '../../hooks';
import { detectIsMobileViewport, getMobileTouchMode } from '../../hooks/mobile/useIsMobile';
import { RoomSpectatorView } from './spectator/RoomSpectatorView';
import { RoomWidgetsView } from './widgets/RoomWidgetsView';

export const RoomView: FC<{}> = props =>
{
    const { roomSession = null } = useRoom();
    const elementRef = useRef<HTMLDivElement>();
    const roomIdRef = useRef<number>(-1);

    useEffect(() =>
    {
        roomIdRef.current = roomSession ? roomSession.roomId : -1;
    }, [ roomSession ]);

    useEffect(() =>
    {
        const canvas = GetNitroInstance().application.renderer.view;

        if(!canvas) return;

        let pinchStartDist = 0;
        let pinchStartScale = 1;
        let isPanning = false;
        let lastPanX = 0;
        let lastPanY = 0;

        canvas.onclick = event => DispatchMouseEvent(event);
        canvas.onmousemove = event => DispatchMouseEvent(event);
        canvas.onmousedown = event => DispatchMouseEvent(event);
        canvas.onmouseup = event => DispatchMouseEvent(event);
        canvas.onmouseleave = () =>
        {
            if(document.body.style.cursor === 'pointer') document.body.style.cursor = 'default';
        };

        canvas.ontouchstart = event =>
        {
            if(detectIsMobileViewport())
            {
                if(event.touches.length === 2 && roomIdRef.current > 0)
                {
                    event.preventDefault();
                    const dx = event.touches[0].clientX - event.touches[1].clientX;
                    const dy = event.touches[0].clientY - event.touches[1].clientY;
                    pinchStartDist = Math.hypot(dx, dy) || 1;
                    const rc = GetRoomEngine().getRoomInstanceRenderingCanvas(roomIdRef.current, 1);
                    pinchStartScale = rc ? (rc.scale || 1) : 1;
                    isPanning = false;
                    return;
                }

                if(event.touches.length === 1 && getMobileTouchMode() === 'pan' && roomIdRef.current > 0)
                {
                    event.preventDefault();
                    isPanning = true;
                    lastPanX = event.touches[0].clientX;
                    lastPanY = event.touches[0].clientY;
                    return;
                }
            }

            isPanning = false;
            DispatchTouchEvent(event);
        };

        canvas.ontouchmove = event =>
        {
            if(detectIsMobileViewport())
            {
                if(event.touches.length === 2 && pinchStartDist > 0 && roomIdRef.current > 0)
                {
                    event.preventDefault();
                    const dx = event.touches[0].clientX - event.touches[1].clientX;
                    const dy = event.touches[0].clientY - event.touches[1].clientY;
                    const dist = Math.hypot(dx, dy);
                    const nextScale = Math.max(0.5, Math.min(2.0, pinchStartScale * (dist / pinchStartDist)));
                    GetRoomEngine().setRoomInstanceRenderingCanvasScale(roomIdRef.current, 1, nextScale, null, null, false);
                    return;
                }

                if(isPanning && event.touches.length === 1 && roomIdRef.current > 0)
                {
                    event.preventDefault();
                    const cx = event.touches[0].clientX;
                    const cy = event.touches[0].clientY;
                    const rc = GetRoomEngine().getRoomInstanceRenderingCanvas(roomIdRef.current, 1);
                    if(rc)
                    {
                        rc.screenOffsetX += (cx - lastPanX);
                        rc.screenOffsetY += (cy - lastPanY);
                    }
                    lastPanX = cx;
                    lastPanY = cy;
                    return;
                }
            }

            DispatchTouchEvent(event);
        };

        canvas.ontouchend = event =>
        {
            if(pinchStartDist > 0 && event.touches.length < 2)
            {
                pinchStartDist = 0;
                return;
            }
            if(isPanning)
            {
                isPanning = false;
                return;
            }
            DispatchTouchEvent(event);
        };

        canvas.ontouchcancel = event =>
        {
            pinchStartDist = 0;
            isPanning = false;
            DispatchTouchEvent(event);
        };

        const element = elementRef.current;

        if(!element) return;

        element.appendChild(canvas);
    }, []);

    useEffect(() =>
    {
        if(!roomSession)
        {
            if(document.body.style.cursor === 'pointer') document.body.style.cursor = 'default';
        }
    }, [ roomSession ]);

    return (
        <Base fit innerRef={ elementRef } className={ (!roomSession && 'd-none') }>
            { roomSession &&
                <>
                    <RoomWidgetsView />
                    { roomSession.isSpectator && <RoomSpectatorView /> }
                </> }
        </Base>
    );
}
