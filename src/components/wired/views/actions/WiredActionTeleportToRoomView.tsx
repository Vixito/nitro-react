import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Column, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionTeleportToRoomView: FC<{}> = props =>
{
    const [ roomId, setRoomId ] = useState(0);
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();

    const save = () =>
    {
        setIntParams([ roomId ]);
        setStringParam(roomId.toString());
    }

    useEffect(() =>
    {
        if(trigger.intData && trigger.intData.length >= 1)
        {
            setRoomId(trigger.intData[0]);
        }
        else if(trigger.stringData && trigger.stringData.trim().length > 0)
        {
            const parsed = parseInt(trigger.stringData.trim());
            setRoomId(isNaN(parsed) ? 0 : parsed);
        }
        else
        {
            setRoomId(0);
        }
    }, [ trigger ]);

    return (
        <WiredActionBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_NONE } hasSpecialInput={ true } save={ save }>
            <Column gap={ 1 }>
                <Text bold>ID de la Sala:</Text>
                <input
                    type="number"
                    min="1"
                    className="form-control form-control-sm"
                    value={ roomId || '' }
                    onChange={ event => setRoomId(parseInt(event.target.value) || 0) }
                    placeholder="Ej: 123" />
                <Text small muted>Introduce el ID de la sala de destino a la que se teletransportará al usuario cuando se active el efecto.</Text>
            </Column>
        </WiredActionBaseView>
    );
}
