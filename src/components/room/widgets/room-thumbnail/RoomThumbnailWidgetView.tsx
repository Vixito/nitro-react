import { NitroRenderTexture, TextureUtils } from '@nitrots/nitro-renderer';
import { FC, useState } from 'react';
import { GetRoomEngine } from '../../../../api';
import { LayoutMiniCameraView } from '../../../../common';
import { RoomWidgetThumbnailEvent } from '../../../../events';
import { useRoom, useUiEvent } from '../../../../hooks';

export const RoomThumbnailWidgetView: FC<{}> = props =>
{
    const [ isVisible, setIsVisible ] = useState(false);
    const { roomSession = null } = useRoom();

    useUiEvent([
        RoomWidgetThumbnailEvent.SHOW_THUMBNAIL,
        RoomWidgetThumbnailEvent.HIDE_THUMBNAIL,
        RoomWidgetThumbnailEvent.TOGGLE_THUMBNAIL ], event =>
    {
        switch(event.type)
        {
            case RoomWidgetThumbnailEvent.SHOW_THUMBNAIL:
                setIsVisible(true);
                return;
            case RoomWidgetThumbnailEvent.HIDE_THUMBNAIL:
                setIsVisible(false);
                return;   
            case RoomWidgetThumbnailEvent.TOGGLE_THUMBNAIL:
                setIsVisible(value => !value);
                return;
        }
    });

    const receiveTexture = async (texture: NitroRenderTexture) =>
    {
        setIsVisible(false);
        try {
            const base64Url = TextureUtils.generateImageUrl(texture);
            const base64Data = base64Url.split(',')[1];
            
            await fetch('/api/camera', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomId: roomSession.roomId,
                    thumbnail: base64Data
                })
            });
            console.log("Room thumbnail saved to R2 bucket successfully!");
        } catch (e) {
            console.error("Failed to upload room thumbnail to CMS:", e);
        }
    }

    if(!isVisible) return null;

    return <LayoutMiniCameraView roomId={ roomSession.roomId } textureReceiver={ receiveTexture } onClose={ () => setIsVisible(false) } />
};
