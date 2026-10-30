import { GetTicker, RoomObjectCategory } from '@nitrots/nitro-renderer';
import { FC, useEffect, useRef } from 'react';
import { GetRoomEngine, GetRoomObjectBounds, GetRoomObjectScreenLocation, GetRoomSession } from '../../../../../api';
import arrowImage from '../../../../../assets/images/eras/shockwave_v14/shockwave_arrow_orange.png';
import { useObjectDeselectedEvent } from '../../../../../hooks';

interface ShockwaveAvatarPointerViewProps
{
    objectId: number;
    userType?: number;
    onClose: () => void;
}

export const ShockwaveAvatarPointerView: FC<ShockwaveAvatarPointerViewProps> = ({ objectId, userType, onClose }) =>
{
    const elementRef = useRef<HTMLDivElement>(null);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useObjectDeselectedEvent(() =>
    {
        onCloseRef.current();
    });

    useEffect(() =>
    {
        const update = () =>
        {
            const roomSession = GetRoomSession();
            if(!roomSession)
            {
                onCloseRef.current();
                return;
            }

            // Desactivar y silenciar permanentemente la flecha 3D amarilla móvil del RoomEngine en Shockwave 2006
            const engineArrow = (GetRoomEngine() as any)?.getRoomObjectSelectionArrow(roomSession.roomId);
            if(engineArrow)
            {
                engineArrow.setState(1, 0);
                if(engineArrow.logic && !(engineArrow.logic as any)._suppressedShockwave)
                {
                    (engineArrow.logic as any)._suppressedShockwave = true;
                    engineArrow.logic.processUpdateMessage = () => engineArrow.setState(1, 0);
                }
            }

            const bounds = GetRoomObjectBounds(roomSession.roomId, objectId, RoomObjectCategory.UNIT);
            const location = GetRoomObjectScreenLocation(roomSession.roomId, objectId, RoomObjectCategory.UNIT);

            if(!bounds && !location) return;

            // Posición centrada sobre la cabeza del avatar (estática, sin bobbing/movimiento)
            const x = location ? Math.round(location.x - 15) : Math.round((bounds.x || bounds.left) + (bounds.width / 2) - 15);
            const y = bounds ? Math.round(bounds.top - 18) : Math.round(location.y - 70);

            if(elementRef.current)
            {
                elementRef.current.style.left = `${ x }px`;
                elementRef.current.style.top = `${ y }px`;
                if(elementRef.current.style.display !== 'block')
                {
                    elementRef.current.style.display = 'block';
                }
            }
        };

        const ticker = GetTicker();
        ticker.add(update);

        return () =>
        {
            ticker.remove(update);
        };
    }, [ objectId ]);

    return (
        <div
            ref={ elementRef }
            className="shockwave-avatar-pointer-standalone"
            style={ {
                position: 'absolute',
                left: 0,
                top: 0,
                display: 'none',
                pointerEvents: 'none',
                zIndex: 25
            } }
        >
            <div
                className="shockwave-avatar-pointer-arrow"
                style={ {
                    width: '30px',
                    height: '42px',
                    backgroundImage: `url(${ arrowImage })`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    backgroundSize: '30px 42px',
                    imageRendering: 'pixelated',
                    filter: 'drop-shadow(0 2px 3px rgba(0, 0, 0, 0.45))'
                    // Estática: sin animaciones ni translateY para que permanezca completamente quieta
                } }
            />
        </div>
    );
};
