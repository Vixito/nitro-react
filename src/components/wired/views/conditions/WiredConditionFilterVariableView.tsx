import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Column, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredConditionBaseView } from './WiredConditionBaseView';

export const WiredConditionFilterVariableView: FC<{}> = props =>
{
    const [ variableName, setVariableName ] = useState('');
    const [ targetType, setTargetType ] = useState(0); // 0: Furnis, 1: Usuarios
    const [ filterMode, setFilterMode ] = useState(0); // 0: Highest, 1: Lowest
    const [ count, setCount ] = useState(1);
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();

    const save = () =>
    {
        setStringParam(variableName.trim());
        setIntParams([ targetType, filterMode, count ]);
    };

    useEffect(() =>
    {
        setVariableName(trigger.stringData || '');

        if(trigger.intData && trigger.intData.length >= 3)
        {
            setTargetType(trigger.intData[0]);
            setFilterMode(trigger.intData[1]);
            setCount(trigger.intData[2]);
        }
        else
        {
            setTargetType(0);
            setFilterMode(0);
            setCount(1);
        }
    }, [ trigger ]);

    return (
        <WiredConditionBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_NONE } hasSpecialInput={ true } save={ save }>
            <Column gap={ 1 }>
                <Text bold>Nombre de la Variable:</Text>
                <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="ej: puntuacion, tiempo, nivel"
                    value={ variableName }
                    onChange={ event => setVariableName(event.target.value) }
                    maxLength={ 32 }
                />
            </Column>
            <Column gap={ 1 }>
                <Text bold>Filtrar entre:</Text>
                <select
                    className="form-select form-select-sm"
                    value={ targetType }
                    onChange={ event => setTargetType(parseInt(event.target.value)) }
                >
                    <option value={ 0 }>Furnis en la sala</option>
                    <option value={ 1 }>Usuarios en la sala</option>
                </select>
            </Column>
            <Column gap={ 1 }>
                <Text bold>Criterio del Filtro:</Text>
                <select
                    className="form-select form-select-sm"
                    value={ filterMode }
                    onChange={ event => setFilterMode(parseInt(event.target.value)) }
                >
                    <option value={ 0 }>Seleccionar con el valor más alto (Top)</option>
                    <option value={ 1 }>Seleccionar con el valor más bajo (Bottom)</option>
                </select>
            </Column>
            <Column gap={ 1 }>
                <Text bold>Cantidad de Entidades a Seleccionar:</Text>
                <input
                    type="number"
                    className="form-control form-control-sm"
                    value={ count }
                    min={ 1 }
                    max={ 50 }
                    onChange={ event => setCount(parseInt(event.target.value) || 1) }
                />
            </Column>
        </WiredConditionBaseView>
    );
}
