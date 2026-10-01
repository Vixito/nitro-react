import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Column, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredConditionBaseView } from './WiredConditionBaseView';

export const WiredConditionSelectorUsersByNameView: FC<{}> = props =>
{
    const [ username, setUsername ] = useState('');
    const { trigger = null, setStringParam = null } = useWired();

    const save = () => setStringParam(username);

    useEffect(() =>
    {
        setUsername(trigger ? (trigger.stringData || '') : '');
    }, [ trigger ]);

    return (
        <WiredConditionBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_NONE } hasSpecialInput={ true } save={ save }>
            <Column gap={ 1 }>
                <Text bold>Nombre de usuario:</Text>
                <input
                    type="text"
                    className="form-control form-control-sm"
                    maxLength={ 32 }
                    value={ username }
                    placeholder="Introduce el nombre de usuario..."
                    onChange={ event => setUsername(event.target.value) } />
                <Text small variant="muted">Solo se seleccionará al usuario que coincida exactamente con este nombre.</Text>
            </Column>
        </WiredConditionBaseView>
    );
};
