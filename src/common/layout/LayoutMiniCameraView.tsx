import { NitroRectangle, NitroRenderTexture } from '@nitrots/nitro-renderer';
import { FC, useRef } from 'react';
import { GetRoomEngine, LocalizeText, PlaySound, SoundNames } from '../../api';
import { DraggableWindow } from '../draggable-window';

interface LayoutMiniCameraViewProps
{
    roomId: number;
    textureReceiver: (texture: NitroRenderTexture) => void;
    onClose: () => void;
}

export const LayoutMiniCameraView: FC<LayoutMiniCameraViewProps> = props =>
{
    const { roomId = -1, textureReceiver = null, onClose = null } = props;
    const elementRef = useRef<HTMLDivElement>();

    const getCameraBounds = () =>
    {
        if(!elementRef || !elementRef.current) return null;

        const frameBounds = elementRef.current.getBoundingClientRect();
        
        return new NitroRectangle(Math.floor(frameBounds.x), Math.floor(frameBounds.y), Math.floor(frameBounds.width), Math.floor(frameBounds.height));
    }

    const takePicture = () =>
    {
        PlaySound(SoundNames.CAMERA_SHUTTER);
        const texture = GetRoomEngine().createTextureFromRoom(roomId, 1, getCameraBounds());
        if(textureReceiver && texture)
        {
            textureReceiver(texture);
        }
    }
    
    return (
        <DraggableWindow handleSelector=".nitro-room-thumbnail-camera">
            <div className="nitro-room-thumbnail-camera">
                <div ref={ elementRef } className={ 'camera-frame' } />
                <div className="camera-buttons">
                    <button className="btn btn-sm btn-danger flex-grow-1" onClick={ onClose }>{ LocalizeText('cancel') }</button>
                    <button className="btn btn-sm btn-success flex-grow-1" onClick={ takePicture }>{ LocalizeText('navigator.thumbeditor.save') }</button>
                </div>
            </div>
        </DraggableWindow>
    );
};
