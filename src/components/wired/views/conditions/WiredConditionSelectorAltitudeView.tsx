import { FC, useEffect, useState } from 'react';
import ReactSlider from 'react-slider';
import { WiredFurniType } from '../../../../api';
import { Column, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredConditionBaseView } from './WiredConditionBaseView';

export const WiredConditionSelectorAltitudeView: FC<{}> = props =>
{
    const [ minAlt, setMinAlt ] = useState(0);
    const [ maxAlt, setMaxAlt ] = useState(40);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([ minAlt, maxAlt ]);

    useEffect(() =>
    {
        if(trigger && trigger.intData && trigger.intData.length >= 2)
        {
            setMinAlt(trigger.intData[0]);
            setMaxAlt(trigger.intData[1]);
        }
        else if(trigger && trigger.intData && trigger.intData.length === 1)
        {
            setMinAlt(trigger.intData[0]);
            setMaxAlt(40);
        }
        else
        {
            setMinAlt(0);
            setMaxAlt(40);
        }
    }, [ trigger ]);

    return (
        <WiredConditionBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_NONE } hasSpecialInput={ true } save={ save }>
            <Column gap={ 2 }>
                <Column gap={ 1 }>
                    <Text bold>Altitud mínima: { minAlt } baldosas</Text>
                    <ReactSlider
                        className="nitro-slider"
                        min={ 0 }
                        max={ 40 }
                        value={ minAlt }
                        onChange={ val => setMinAlt(Math.min(val, maxAlt)) } />
                </Column>
                <Column gap={ 1 }>
                    <Text bold>Altitud máxima: { maxAlt } baldosas</Text>
                    <ReactSlider
                        className="nitro-slider"
                        min={ 0 }
                        max={ 40 }
                        value={ maxAlt }
                        onChange={ val => setMaxAlt(Math.max(val, minAlt)) } />
                </Column>
                <Text small variant="muted">Selecciona los furnis cuya altura sobre el suelo esté dentro de este rango.</Text>
            </Column>
        </WiredConditionBaseView>
    );
};
