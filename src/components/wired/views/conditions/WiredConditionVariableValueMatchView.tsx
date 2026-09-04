import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Column, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredConditionBaseView } from './WiredConditionBaseView';

export const WiredConditionVariableValueMatchView: FC<{}> = props =>
{
    const [ variableName, setVariableName ] = useState('');
    const [ comparison, setComparison ] = useState(0);
    const [ targetValue, setTargetValue ] = useState(0);
    const [ scope, setScope ] = useState(0);
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();

    const save = () =>
    {
        setStringParam(variableName.trim());
        setIntParams([ comparison, targetValue, scope ]);
    };

    useEffect(() =>
    {
        setVariableName(trigger.stringData || '');

        if(trigger.intData && trigger.intData.length >= 3)
        {
            setComparison(trigger.intData[0]);
            setTargetValue(trigger.intData[1]);
            setScope(trigger.intData[2]);
        }
        else if(trigger.intData && trigger.intData.length >= 2)
        {
            setComparison(trigger.intData[0]);
            setTargetValue(trigger.intData[1]);
            setScope(0);
        }
        else
        {
            setComparison(0);
            setTargetValue(0);
            setScope(0);
        }
    }, [ trigger ]);

    return (
        <WiredConditionBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_NONE } hasSpecialInput={ true } save={ save }>
            <Column gap={ 1 }>
                <Text bold>Nombre de la Variable:</Text>
                <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="ej: puntos, vidas, nivel"
                    value={ variableName }
                    onChange={ event => setVariableName(event.target.value) }
                    maxLength={ 32 }
                />
            </Column>
            <Column gap={ 1 }>
                <Text bold>Ámbito de la Variable:</Text>
                <select
                    className="form-select form-select-sm"
                    value={ scope }
                    onChange={ event => setScope(parseInt(event.target.value)) }
                >
                    <option value={ 0 }>Variable de Sala (Global en toda la sala)</option>
                    <option value={ 1 }>Variable de Usuario (Individual por jugador)</option>
                </select>
            </Column>
            <Column gap={ 1 }>
                <Text bold>Condición de Comparación:</Text>
                <select
                    className="form-select form-select-sm"
                    value={ comparison }
                    onChange={ event => setComparison(parseInt(event.target.value)) }
                >
                    <option value={ 0 }>Es igual a (=)</option>
                    <option value={ 1 }>Es diferente de (!=)</option>
                    <option value={ 2 }>Es mayor que (&gt;)</option>
                    <option value={ 3 }>Es menor que (&lt;)</option>
                    <option value={ 4 }>Es mayor o igual que (&gt;=)</option>
                    <option value={ 5 }>Es menor o igual que (&lt;=)</option>
                </select>
            </Column>
            <Column gap={ 1 }>
                <Text bold>Valor Objetivo a Comparar:</Text>
                <input
                    type="number"
                    className="form-control form-control-sm"
                    value={ targetValue }
                    onChange={ event => setTargetValue(parseInt(event.target.value) || 0) }
                />
            </Column>
        </WiredConditionBaseView>
    );
}
