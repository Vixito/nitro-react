import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Column, Flex, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredActionBaseView } from './WiredActionBaseView';

const CLOCK_ACTIONS: { value: number; label: string }[] = [
    { value: 0, label: 'Iniciar' },
    { value: 1, label: 'Parar' },
    { value: 2, label: 'Reiniciar' },
    { value: 3, label: 'Pausar' },
    { value: 4, label: 'Reanudar' }
];

export const WiredActionControlClockView: FC<{}> = props =>
{
    const [ action, setAction ] = useState<number>(0);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([ action ]);

    useEffect(() =>
    {
        if(!trigger || !trigger.intData) return;

        setAction((trigger.intData.length > 0) ? Math.max(0, Math.min(4, trigger.intData[0])) : 0);
    }, [ trigger ]);

    return (
        <WiredActionBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_BY_ID } hasSpecialInput={ true } save={ save }>
            <Column gap={ 1 }>
                <Text bold>Opciones:</Text>
                { CLOCK_ACTIONS.map(opt => (
                    <Flex key={ opt.value } alignItems="center" gap={ 1 }>
                        <input
                            className="form-check-input"
                            type="radio"
                            name="clockControlAction"
                            id={ `clockAction_${ opt.value }` }
                            checked={ action === opt.value }
                            onChange={ () => setAction(opt.value) }
                        />
                        <Text pointer onClick={ () => setAction(opt.value) }>{ opt.label }</Text>
                    </Flex>
                )) }
            </Column>
        </WiredActionBaseView>
    );
}
