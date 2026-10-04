import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Column, Flex, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredVariableRoomView: FC<{}> = props =>
{
    const [ variableName, setVariableName ] = useState('');
    const [ availability, setAvailability ] = useState(0);
    const [ currentValue, setCurrentValue ] = useState(0);
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();

    const save = () =>
    {
        setStringParam(variableName.trim());
        setIntParams([ availability, currentValue ]);
    };

    useEffect(() =>
    {
        if(!trigger) return;

        setVariableName(trigger.stringData || '');

        if(trigger.intData && trigger.intData.length >= 2)
        {
            setAvailability(trigger.intData[0]);
            setCurrentValue(trigger.intData[1]);
        }
        else if(trigger.intData && trigger.intData.length === 1)
        {
            setAvailability(trigger.intData[0]);
            setCurrentValue(0);
        }
        else
        {
            setAvailability(0);
            setCurrentValue(0);
        }
    }, [ trigger ]);

    return (
        <WiredActionBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_NONE } hasSpecialInput={ true } save={ save }>
            <Column gap={ 1 }>
                <Text bold>Nombre de la variable:</Text>
                <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="ej: estado_juego, tiempo"
                    value={ variableName }
                    onChange={ event => setVariableName(event.target.value) }
                    maxLength={ 32 }
                />
            </Column>
            <Column gap={ 1 }>
                <Text bold>Inspección de variables</Text>
                <Text small className="text-muted">Valor actual: { currentValue }</Text>
            </Column>
            <Column gap={ 1 }>
                <Text bold>Opciones de disponibilidad:</Text>
                <Flex alignItems="center" gap={ 1 }>
                    <input
                        className="form-check-input"
                        type="radio"
                        name="roomVarAvailability"
                        id="roomAvailActive"
                        checked={ availability === 0 }
                        onChange={ () => setAvailability(0) }
                    />
                    <Text small>Mientras la sala esté activa</Text>
                </Flex>
                <Flex alignItems="center" gap={ 1 }>
                    <input
                        className="form-check-input"
                        type="radio"
                        name="roomVarAvailability"
                        id="roomAvailPerm"
                        checked={ availability === 1 }
                        onChange={ () => setAvailability(1) }
                    />
                    <Text small>Permanente</Text>
                </Flex>
                <Flex alignItems="center" gap={ 1 }>
                    <input
                        className="form-check-input"
                        type="radio"
                        name="roomVarAvailability"
                        id="roomAvailCross"
                        checked={ availability === 2 }
                        onChange={ () => setAvailability(2) }
                    />
                    <Text small>Permanente, compartida entre salas</Text>
                </Flex>
            </Column>
        </WiredActionBaseView>
    );
};
