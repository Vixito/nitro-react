import { FC, useEffect, useState } from 'react';
import ReactSlider from 'react-slider';
import { WiredFurniType } from '../../../../api';
import { Column, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredConditionBaseView } from './WiredConditionBaseView';

export const WiredConditionSlcQuantityView: FC<{}> = props =>
{
    const [ min, setMin ] = useState(1);
    const [ max, setMax ] = useState(50);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([ min, max ]);

    useEffect(() =>
    {
        if(trigger && trigger.intData && trigger.intData.length >= 2)
        {
            setMin(trigger.intData[0]);
            setMax(trigger.intData[1]);
        }
        else
        {
            setMin(1);
            setMax(50);
        }
    }, [ trigger ]);

    return (
        <WiredConditionBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_NONE } hasSpecialInput={ true } save={ save }>
            <Column gap={ 1 }>
                <Text bold>Cantidad mínima: { min }</Text>
                <ReactSlider
                    className={ 'nitro-slider' }
                    min={ 1 }
                    max={ 50 }
                    value={ min }
                    onChange={ event => setMin(event) } />
            </Column>
            <Column gap={ 1 }>
                <Text bold>Cantidad máxima: { max }</Text>
                <ReactSlider
                    className={ 'nitro-slider' }
                    min={ 1 }
                    max={ 50 }
                    value={ max }
                    onChange={ event => setMax(event) } />
            </Column>
        </WiredConditionBaseView>
    );
};
