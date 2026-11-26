import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Column, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

const USER_ACTIONS: { value: number; label: string }[] = [
    { value: 1, label: 'Saludar' },
    { value: 2, label: 'Lanzar beso' },
    { value: 3, label: 'Risas' },
    { value: 7, label: 'Confirmado' },
    { value: 6, label: 'Despierto' },
    { value: 5, label: 'Ausente' },
    { value: 4, label: 'Sentarse' },
    { value: 9, label: 'De pie' },
    { value: 10, label: 'Tumbado' },
    { value: 11, label: 'Señales' },
    { value: 8, label: 'Bailar' }
];

export const WiredTriggerUserPerformsActionView: FC<{}> = props =>
{
    const [ action, setAction ] = useState<number>(1);
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();

    const save = () =>
    {
        setStringParam('');
        setIntParams([ action ]);
    };

    useEffect(() =>
    {
        if(!trigger) return;
        setAction((trigger.intData && trigger.intData.length > 0) ? trigger.intData[0] : 1);
    }, [ trigger ]);

    return (
        <WiredTriggerBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_NONE } hasSpecialInput={ true } save={ save }>
            <Column gap={ 1 }>
                <Text bold>Acción:</Text>
                <select
                    className="form-select form-select-sm"
                    value={ action }
                    onChange={ event => setAction(parseInt(event.target.value, 10)) }
                >
                    { USER_ACTIONS.map(opt => (
                        <option key={ opt.value } value={ opt.value }>{ opt.label }</option>
                    )) }
                </select>
            </Column>
        </WiredTriggerBaseView>
    );
}
