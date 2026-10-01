import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Column, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredConditionBaseView } from './WiredConditionBaseView';

export const WiredConditionSelectorVariableView: FC<{}> = props =>
{
    const [ variableName, setVariableName ] = useState('');
    const [ targetType, setTargetType ] = useState(0); // 0: Furni, 1: User
    const [ checkValue, setCheckValue ] = useState(0); // 0: Just has var, 1: Value match
    const [ comparison, setComparison ] = useState(0); // 0: ==, 1: !=, 2: >, 3: <, 4: >=, 5: <=
    const [ targetValue, setTargetValue ] = useState(0);
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();

    const save = () =>
    {
        setStringParam(variableName.trim());
        setIntParams([ targetType, checkValue, comparison, targetValue ]);
    };

    useEffect(() =>
    {
        setVariableName(trigger.stringData || '');

        if(trigger.intData && trigger.intData.length >= 4)
        {
            setTargetType(trigger.intData[0]);
            setCheckValue(trigger.intData[1]);
            setComparison(trigger.intData[2]);
            setTargetValue(trigger.intData[3]);
        }
        else
        {
            setTargetType(0);
            setCheckValue(0);
            setComparison(0);
            setTargetValue(0);
        }
    }, [ trigger ]);

    return (
        <WiredConditionBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_NONE } hasSpecialInput={ true } save={ save }>
            <Column gap={ 1 }>
                <Text bold>Nombre de la Variable:</Text>
                <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="ej: puntos, rol, llave"
                    value={ variableName }
                    onChange={ event => setVariableName(event.target.value) }
                    maxLength={ 32 }
                />
            </Column>
            <Column gap={ 1 }>
                <Text bold>Tipo de Entidad a Seleccionar:</Text>
                <select
                    className="form-select form-select-sm"
                    value={ targetType }
                    onChange={ event => setTargetType(parseInt(event.target.value)) }
                >
                    <option value={ 0 }>Furnis (Objetos en sala con esta variable)</option>
                    <option value={ 1 }>Usuarios (Jugadores en sala con esta variable)</option>
                </select>
            </Column>
            <Column gap={ 1 }>
                <Text bold>Criterio de Selección:</Text>
                <select
                    className="form-select form-select-sm"
                    value={ checkValue }
                    onChange={ event => setCheckValue(parseInt(event.target.value)) }
                >
                    <option value={ 0 }>Cualquiera que posea la variable (sin importar valor)</option>
                    <option value={ 1 }>Filtrar por valor específico</option>
                </select>
            </Column>
            { checkValue === 1 && (
                <>
                    <Column gap={ 1 }>
                        <Text bold>Condición de Comparación:</Text>
                        <select
                            className="form-select form-select-sm"
                            value={ comparison }
                            onChange={ event => setComparison(parseInt(event.target.value)) }
                        >
                            <option value={ 0 }>Es igual a (==)</option>
                            <option value={ 1 }>Es diferente de (!=)</option>
                            <option value={ 2 }>Es mayor que (&gt;)</option>
                            <option value={ 3 }>Es menor que (&lt;)</option>
                            <option value={ 4 }>Es mayor o igual que (&gt;=)</option>
                            <option value={ 5 }>Es menor o igual que (&lt;=)</option>
                        </select>
                    </Column>
                    <Column gap={ 1 }>
                        <Text bold>Valor Objetivo:</Text>
                        <input
                            type="number"
                            className="form-control form-control-sm"
                            value={ targetValue }
                            onChange={ event => setTargetValue(parseInt(event.target.value) || 0) }
                        />
                    </Column>
                </>
            ) }
        </WiredConditionBaseView>
    );
}
