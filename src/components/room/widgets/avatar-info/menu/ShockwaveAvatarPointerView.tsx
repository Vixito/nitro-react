import { RoomObjectCategory } from '@nitrots/nitro-renderer';
import { FC } from 'react';
import { ContextMenuView } from '../../context-menu/ContextMenuView';

interface ShockwaveAvatarPointerViewProps
{
    objectId: number;
    userType?: number;
    onClose: () => void;
}

export const ShockwaveAvatarPointerView: FC<ShockwaveAvatarPointerViewProps> = ({ objectId, userType, onClose }) =>
{
    return (
        <ContextMenuView
            objectId={ objectId }
            category={ RoomObjectCategory.UNIT }
            userType={ userType }
            classNames={ [ 'shockwave-avatar-pointer-container', 'name-only' ] }
            onClose={ onClose }
        >
            <div className="shockwave-avatar-pointer-arrow" />
        </ContextMenuView>
    );
};
