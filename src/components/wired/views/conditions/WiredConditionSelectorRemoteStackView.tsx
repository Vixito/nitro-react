import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Column, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredConditionBaseView } from './WiredConditionBaseView';

export const WiredConditionSelectorRemoteStackView: FC<{}> = props =>
{
    const [ mode, setMode ] = useState(0); // 0: Union, 1: Intersection
    const [ filterCount, setFilterCount ] = useState(0); // 0: All, >0: Random N
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();

    const save = () =>
    {
        setStringParam('');
        setIntParams([ mode, filterCount ]);
    };

    useEffect(() =>
    {
        if(trigger.intData && trigger.intData.length >= 2)
        {
            setMode(trigger.intData[0]);
            setFilterCount(trigger.intData[1]);
        }
        else
        {
            setMode(0);
            setFilterCount(0);
        }
    }, [ trigger ]);

    return (
        <WiredConditionBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT } hasSpecialInput={ true } save={ save }>
            <Column gap={ 1 }>
                <Text bold>Modo de Selección Remota:</Text>
                <select
                    className="form-select form-select-sm"
                    value={ mode }
                    onChange={ event => setMode(parseInt(event.target.value)) }
                >
                    <option value={ 0 }>Unión (Combinar todos los furnis/usuarios de las pilas)</option>
                    <option value={ 1 }>Intersección (Solo los que coincidan en todas las pilas)</option>
                </select>
            </Column>
            <Column gap={ 1 }>
                <Text bold>Filtro de Cantidad de Pilas:</Text>
                <select
                    className="form-select form-select-sm"
                    value={ filterCount === 0 ? 0 : 1 }
                    onChange={ event => setFilterCount(parseInt(event.target.value)) }
                >
                    <option value={ 0 }>Usar todas las pilas seleccionadas</option>
                    <option value={ 1 }>Seleccionar una cantidad aleatoria de pilas</option>
                </select>
            </Column>
            { filterCount > 0 && (
                <Column gap={ 1 }>
                    <Text bold>Número de Pilas al Azar:</Text>
                    <input
                        type="number"
                        className="form-control form-control-sm"
                        value={ filterCount }
                        min={ 1 }
                        max={ 50 }
                        onChange={ event => setFilterCount(parseInt(event.target.value) || 1) }
                    />
                </Column>
            ) }
        </WiredConditionBaseView>
    );
}
