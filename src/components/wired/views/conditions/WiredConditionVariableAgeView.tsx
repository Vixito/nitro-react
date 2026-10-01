import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Column, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredConditionBaseView } from './WiredConditionBaseView';

export const WiredConditionVariableAgeView: FC<{}> = props =>
{
    const [ variableName, setVariableName ] = useState('');
    const [ scope, setScope ] = useState(1); // 1: User, 0: Room, 2: Furni
    const [ ageType, setAgeType ] = useState(0); // 0: Creation, 1: Update
    const [ comparison, setComparison ] = useState(3); // 3: >=
    const [ targetSeconds, setTargetSeconds ] = useState(60);
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();

    const save = () =>
    {
        setStringParam(variableName.trim());
        setIntParams([ scope, ageType, comparison, targetSeconds ]);
    };

    useEffect(() =>
    {
        setVariableName(trigger.stringData || '');

        if(trigger.intData && trigger.intData.length >= 4)
        {
            setScope(trigger.intData[0]);
            setAgeType(trigger.intData[1]);
            setComparison(trigger.intData[2]);
            setTargetSeconds(trigger.intData[3]);
        }
        else
        {
            setScope(1);
            setAgeType(0);
            setComparison(3);
            setTargetSeconds(60);
        }
    }, [ trigger ]);

    return (
        <WiredConditionBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_NONE } hasSpecialInput={ true } save={ save }>
            <Column gap={ 1 }>
                <Text bold>Nombre de la Variable:</Text>
                <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="ej: tiempo_juego, login_time"
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
                    <option value={ 1 }>En el Usuario (Jugador que activa la condición)</option>
                    <option value={ 0 }>En la Sala (Global de la sala)</option>
                    <option value={ 2 }>En el Furni (Objeto activador)</option>
                </select>
            </Column>
            <Column gap={ 1 }>
                <Text bold>Medir Antigüedad Desde:</Text>
                <select
                    className="form-select form-select-sm"
                    value={ ageType }
                    onChange={ event => setAgeType(parseInt(event.target.value)) }
                >
                    <option value={ 0 }>Momento de creación inicial de la variable</option>
                    <option value={ 1 }>Última vez que el valor fue modificado/actualizado</option>
                </select>
            </Column>
            <Column gap={ 1 }>
                <Text bold>Comparación de Tiempo:</Text>
                <select
                    className="form-select form-select-sm"
                    value={ comparison }
                    onChange={ event => setComparison(parseInt(event.target.value)) }
                >
                    <option value={ 3 }>Mayor o igual que (&gt;=)</option>
                    <option value={ 4 }>Mayor que (&gt;)</option>
                    <option value={ 2 }>Exactamente igual a (==)</option>
                    <option value={ 1 }>Menor o igual que (&lt;=)</option>
                    <option value={ 0 }>Menor que (&lt;)</option>
                </select>
            </Column>
            <Column gap={ 1 }>
                <Text bold>Tiempo Requerido (Segundos):</Text>
                <input
                    type="number"
                    className="form-control form-control-sm"
                    value={ targetSeconds }
                    onChange={ event => setTargetSeconds(parseInt(event.target.value) || 0) }
                    min={ 0 }
                />
            </Column>
        </WiredConditionBaseView>
    );
}
