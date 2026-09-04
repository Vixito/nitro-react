import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Column, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

export const WiredTriggerUserPerformsActionView: FC<{}> = props =>
{
    const [ action, setAction ] = useState(1);
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();

    const save = () =>
    {
        setStringParam('');
        setIntParams([ action ]);
    };

    useEffect(() =>
    {
        setAction((trigger.intData && trigger.intData.length > 0) ? trigger.intData[0] : 1);
    }, [ trigger ]);

    return (
        <WiredTriggerBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_NONE } hasSpecialInput={ true } save={ save }>
            <Column gap={ 1 }>
                <Text bold>Acción del Usuario:</Text>
                <select
                    className="form-select form-select-sm"
                    value={ action }
                    onChange={ event => setAction(parseInt(event.target.value)) }
                >
                    <option value={ 1 }>👋 Saludar (Wave)</option>
                    <option value={ 8 }>💃 Bailar (Dance)</option>
                    <option value={ 2 }>😘 Lanzar Beso (Blow Kiss)</option>
                    <option value={ 3 }>😂 Reír (Laugh)</option>
                    <option value={ 4 }>🪑 Sentarse (Sit)</option>
                    <option value={ 5 }>💤 Quedarse Ausente / Dormir (Idle)</option>
                    <option value={ 7 }>👍 Pulgar Arriba / Respeto (Thumb Up)</option>
                </select>
            </Column>
        </WiredTriggerBaseView>
    );
}
