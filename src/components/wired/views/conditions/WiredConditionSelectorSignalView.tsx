import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Column, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredConditionBaseView } from './WiredConditionBaseView';

export const WiredConditionSelectorSignalView: FC<{}> = props =>
{
    const [ channel, setChannel ] = useState(1);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([ channel ]);

    useEffect(() =>
    {
        if(trigger && trigger.intData && trigger.intData.length > 0)
        {
            setChannel(trigger.intData[0]);
        }
        else
        {
            setChannel(1);
        }
    }, [ trigger ]);

    return (
        <WiredConditionBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_NONE } hasSpecialInput={ true } save={ save }>
            <Column gap={ 1 }>
                <Text bold>Canal / Identificador de la Señal:</Text>
                <input
                    type="number"
                    className="form-control form-control-sm"
                    min={ 1 }
                    max={ 99999 }
                    value={ channel }
                    onChange={ event => setChannel(Math.max(1, parseInt(event.target.value) || 1)) } />
                <Text small variant="muted">Selecciona a los objetivos que coincidan con el canal de la señal transmitida.</Text>
            </Column>
        </WiredConditionBaseView>
    );
};
