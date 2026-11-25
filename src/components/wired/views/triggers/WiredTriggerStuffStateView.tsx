import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Column, Flex, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

export const WiredTriggerStuffStateView: FC<{}> = props =>
{
    const [ mode, setMode ] = useState<number>(0);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([ mode ]);

    useEffect(() =>
    {
        if(!trigger || !trigger.intData) return;

        setMode((trigger.intData.length > 0 && trigger.intData[0] === 1) ? 1 : 0);
    }, [ trigger ]);

    return (
        <WiredTriggerBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_BY_ID } hasSpecialInput={ true } save={ save }>
            <Column gap={ 1 }>
                <Text bold>Elegir opciones:</Text>
                <Flex alignItems="center" gap={ 1 }>
                    <input
                        className="form-check-input"
                        type="radio"
                        name="stuffStateMode"
                        id="stuffStateCurrent"
                        checked={ mode === 0 }
                        onChange={ () => setMode(0) }
                    />
                    <Text pointer onClick={ () => setMode(0) }>Causante para el estado actual</Text>
                </Flex>
                <Flex alignItems="center" gap={ 1 }>
                    <input
                        className="form-check-input"
                        type="radio"
                        name="stuffStateMode"
                        id="stuffStateAll"
                        checked={ mode === 1 }
                        onChange={ () => setMode(1) }
                    />
                    <Text pointer onClick={ () => setMode(1) }>Para todos los estados</Text>
                </Flex>
            </Column>
        </WiredTriggerBaseView>
    );
}
