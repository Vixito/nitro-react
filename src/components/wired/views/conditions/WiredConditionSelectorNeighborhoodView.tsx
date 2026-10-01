import { FC, useEffect, useState } from 'react';
import ReactSlider from 'react-slider';
import { WiredFurniType } from '../../../../api';
import { Column, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredConditionBaseView } from './WiredConditionBaseView';

export const WiredConditionSelectorNeighborhoodView: FC<{}> = props =>
{
    const [ radius, setRadius ] = useState(1);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([ radius ]);

    useEffect(() =>
    {
        if(trigger && trigger.intData && trigger.intData.length > 0)
        {
            setRadius(trigger.intData[0]);
        }
        else
        {
            setRadius(1);
        }
    }, [ trigger ]);

    return (
        <WiredConditionBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_NONE } hasSpecialInput={ true } save={ save }>
            <Column gap={ 1 }>
                <Text bold>Radio de cercanía: { radius } { radius === 1 ? 'baldosa' : 'baldosas' }</Text>
                <ReactSlider
                    className="nitro-slider"
                    min={ 1 }
                    max={ 15 }
                    value={ radius }
                    onChange={ val => setRadius(val) } />
                <Text small variant="muted">Selecciona a los objetivos situados en las baldosas vecinas dentro del radio especificado.</Text>
            </Column>
        </WiredConditionBaseView>
    );
};
