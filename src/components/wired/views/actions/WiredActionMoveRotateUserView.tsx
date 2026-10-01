import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Column, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionMoveRotateUserView: FC<{}> = props =>
{
    const [ direction, setDirection ] = useState(0);
    const [ rotation, setRotation ] = useState(0);
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();

    const save = () =>
    {
        setStringParam('');
        setIntParams([ direction, rotation ]);
    };

    useEffect(() =>
    {
        if(trigger.intData && trigger.intData.length >= 2)
        {
            setDirection(trigger.intData[0]);
            setRotation(trigger.intData[1]);
        }
        else
        {
            setDirection(0);
            setRotation(0);
        }
    }, [ trigger ]);

    return (
        <WiredActionBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_NONE } hasSpecialInput={ true } save={ save }>
            <Column gap={ 1 }>
                <Text bold>Dirección del Movimiento del Usuario:</Text>
                <select
                    className="form-select form-select-sm"
                    value={ direction }
                    onChange={ event => setDirection(parseInt(event.target.value)) }
                >
                    <option value={ 0 }>Ningún movimiento (solo rotar o quieto)</option>
                    <option value={ 1 }>Norte (Arriba-Derecha)</option>
                    <option value={ 2 }>Noreste (Derecha)</option>
                    <option value={ 3 }>Este (Abajo-Derecha)</option>
                    <option value={ 4 }>Sureste (Abajo)</option>
                    <option value={ 5 }>Sur (Abajo-Izquierda)</option>
                    <option value={ 6 }>Suroeste (Izquierda)</option>
                    <option value={ 7 }>Oeste (Arriba-Izquierda)</option>
                    <option value={ 8 }>Noroeste (Arriba)</option>
                </select>
            </Column>
            <Column gap={ 1 }>
                <Text bold>Rotación del Usuario:</Text>
                <select
                    className="form-select form-select-sm"
                    value={ rotation }
                    onChange={ event => setRotation(parseInt(event.target.value)) }
                >
                    <option value={ 0 }>No rotar (mantener orientación actual)</option>
                    <option value={ 1 }>Girar 45° en sentido horario</option>
                    <option value={ 2 }>Girar 90° a la derecha</option>
                    <option value={ 3 }>Girar 135° en sentido horario</option>
                    <option value={ 4 }>Girar 180° (Media vuelta)</option>
                    <option value={ 5 }>Girar 135° en sentido antihorario</option>
                    <option value={ 6 }>Girar 90° a la izquierda</option>
                    <option value={ 7 }>Girar 45° en sentido antihorario</option>
                </select>
            </Column>
        </WiredActionBaseView>
    );
}
