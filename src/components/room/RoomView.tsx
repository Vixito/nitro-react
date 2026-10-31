import { FC, useEffect, useRef } from 'react';
import { DispatchMouseEvent, DispatchTouchEvent, GetNitroInstance } from '../../api';
import { Base } from '../../common';
import { useRoom } from '../../hooks';
import { RoomSpectatorView } from './spectator/RoomSpectatorView';
import { RoomWidgetsView } from './widgets/RoomWidgetsView';

export const RoomView: FC<{}> = props =>
{
    const { roomSession = null } = useRoom();
    const elementRef = useRef<HTMLDivElement>();

    useEffect(() =>
    {
        const canvas = GetNitroInstance().application.renderer.view;

        if(!canvas) return;

        canvas.onclick = event => DispatchMouseEvent(event);
        canvas.onmousemove = event => DispatchMouseEvent(event);
        canvas.onmousedown = event => DispatchMouseEvent(event);
        canvas.onmouseup = event => DispatchMouseEvent(event);
        canvas.onmouseleave = () =>
        {
            if(document.body.style.cursor === 'pointer') document.body.style.cursor = 'default';
        };

        canvas.ontouchstart = event => DispatchTouchEvent(event);
        canvas.ontouchmove = event => DispatchTouchEvent(event);
        canvas.ontouchend = event => DispatchTouchEvent(event);
        canvas.ontouchcancel = event => DispatchTouchEvent(event);

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
