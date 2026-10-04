import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Column, Flex, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredVariableUserView: FC<{}> = props =>
{
    const [ variableName, setVariableName ] = useState('punto_de_control');
    const [ hasValue, setHasValue ] = useState(false);
    const [ availability, setAvailability ] = useState(1);
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();

    const save = () =>
    {
        setStringParam(variableName.trim());
        setIntParams([ hasValue ? 1 : 0, availability ]);
    };

    useEffect(() =>
    {
        if(!trigger) return;

        setVariableName(trigger.stringData || '');

        if(trigger.intData && trigger.intData.length >= 2)
        {
            setHasValue(trigger.intData[0] === 1);
            setAvailability(trigger.intData[1]);
        }
        else if(trigger.intData && trigger.intData.length === 1)
        {
            setHasValue(trigger.intData[0] === 1);
            setAvailability(1);
        }
        else
        {
            setHasValue(false);
            setAvailability(1);
        }
    }, [ trigger ]);

    return (
        <WiredActionBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_NONE } hasSpecialInput={ true } save={ save }>
            <Column gap={ 1 }>
                <Text bold>Nombre de la variable:</Text>
                <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="ej: punto_de_control"
                    value={ variableName }
                    onChange={ event => setVariableName(event.target.value) }
                    maxLength={ 32 }
                />
            </Column>
            <Column gap={ 1 }>
                <Text bold>Opciones de la variable:</Text>
                <Flex alignItems="center" gap={ 1 }>
                    <input
                        className="form-check-input"
                        type="checkbox"
                        id="hasValueCheck"
                        checked={ hasValue }
                        onChange={ event => setHasValue(event.target.checked) }
                    />
                    <Text small>Tiene valor</Text>
                </Flex>
            </Column>
            <Column gap={ 1 }>
                <Text bold>Opciones de disponibilidad:</Text>
                <Flex alignItems="center" gap={ 1 }>
                    <input
                        className="form-check-input"
                        type="radio"
                        name="userVarAvailability"
                        id="availRoom"
                        checked={ availability === 0 }
                        onChange={ () => setAvailability(0) }
                    />
                    <Text small>Mientras el usuario esté en la sala</Text>
                </Flex>
                <Flex alignItems="center" gap={ 1 }>
                    <input
                        className="form-check-input"
                        type="radio"
                        name="userVarAvailability"
                        id="availPerm"
                        checked={ availability === 1 }
                        onChange={ () => setAvailability(1) }
                    />
                    <Text small>Permanente</Text>
                </Flex>
                <Flex alignItems="center" gap={ 1 }>
                    <input
                        className="form-check-input"
                        type="radio"
                        name="userVarAvailability"
                        id="availCross"
                        checked={ availability === 2 }
                        onChange={ () => setAvailability(2) }
                    />
                    <Text small>Permanente, compartida entre salas</Text>
                </Flex>
            </Column>
        </WiredActionBaseView>
    );
};
