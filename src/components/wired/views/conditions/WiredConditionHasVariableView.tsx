import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Column, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredConditionBaseView } from './WiredConditionBaseView';

export const WiredConditionHasVariableView: FC<{}> = props =>
{
    const [ variableName, setVariableName ] = useState('');
    const [ scope, setScope ] = useState(1); // 1: User, 0: Room, 2: Furni
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();

    const save = () =>
    {
        setStringParam(variableName.trim());
        setIntParams([ scope ]);
    };

    useEffect(() =>
    {
        setVariableName(trigger.stringData || '');

        if(trigger.intData && trigger.intData.length >= 1)
        {
            setScope(trigger.intData[0]);
        }
        else
        {
            setScope(1);
        }
    }, [ trigger ]);

    return (
        <WiredConditionBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_NONE } hasSpecialInput={ true } save={ save }>
            <Column gap={ 1 }>
                <Text bold>Nombre de la Variable Requerida:</Text>
                <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="ej: puntos, vip, llave"
                    value={ variableName }
                    onChange={ event => setVariableName(event.target.value) }
                    maxLength={ 32 }
                />
            </Column>
            <Column gap={ 1 }>
                <Text bold>Ámbito a Comprobar:</Text>
                <select
                    className="form-select form-select-sm"
                    value={ scope }
                    onChange={ event => setScope(parseInt(event.target.value)) }
                >
                    <option value={ 1 }>En el Usuario (Jugador que activa la condición)</option>
                    <option value={ 0 }>En la Sala (Global de la sala)</option>
                    <option value={ 2 }>En el Furni (Objeto activador)</option>
                </select>
            </Column>
        </WiredConditionBaseView>
    );
}
