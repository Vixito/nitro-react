import { FC, useEffect, useState } from 'react';
import ReactSlider from 'react-slider';
import { WiredFurniType } from '../../../../api';
import { Column, Flex, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredConditionBaseView } from './WiredConditionBaseView';

const FILTER_MODES = [
    { id: 0, label: 'Primeros encontrados' },
    { id: 1, label: 'Últimos encontrados' },
    { id: 2, label: 'Selección aleatoria' }
];

export const WiredConditionFilterCountView: FC<{}> = props =>
{
    const [ count, setCount ] = useState(1);
    const [ mode, setMode ] = useState(0);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([ count, mode ]);

    useEffect(() =>
    {
        if(trigger && trigger.intData && trigger.intData.length >= 2)
        {
            setCount(trigger.intData[0]);
            setMode(trigger.intData[1]);
        }
        else if(trigger && trigger.intData && trigger.intData.length === 1)
        {
            setCount(trigger.intData[0]);
            setMode(0);
        }
        else
        {
            setCount(1);
            setMode(0);
        }
    }, [ trigger ]);

    return (
        <WiredConditionBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_NONE } hasSpecialInput={ true } save={ save }>
            <Column gap={ 2 }>
                <Column gap={ 1 }>
                    <Text bold>Cantidad máxima a filtrar: { count }</Text>
                    <ReactSlider
                        className="nitro-slider"
                        min={ 1 }
                        max={ 50 }
                        value={ count }
                        onChange={ val => setCount(val) } />
                </Column>
                <Column gap={ 1 }>
                    <Text bold>Criterio de selección:</Text>
                    { FILTER_MODES.map(item => (
                        <Flex key={ item.id } gap={ 1 } alignItems="center">
                            <input
                                className="form-check-input"
                                type="radio"
                                name="wiredFilterMode"
                                id={ `wiredFilterMode_${ item.id }` }
                                checked={ mode === item.id }
                                onChange={ () => setMode(item.id) } />
                            <label className="cursor-pointer mb-0" htmlFor={ `wiredFilterMode_${ item.id }` }>
                                <Text>{ item.label }</Text>
                            </label>
                        </Flex>
                    )) }
                </Column>
            </Column>
        </WiredConditionBaseView>
    );
};
