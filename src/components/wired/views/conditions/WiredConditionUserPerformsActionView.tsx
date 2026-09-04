import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Column, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredConditionBaseView } from './WiredConditionBaseView';

export const WiredConditionUserPerformsActionView: FC<{}> = props =>
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
        <WiredConditionBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_NONE } hasSpecialInput={ true } save={ save }>
            <Column gap={ 1 }>
                <Text bold>Acción del usuario:</Text>
                <select
                    className="form-select form-select-sm"
                    value={ action }
                    onChange={ event => setAction(parseInt(event.target.value)) }
                >
                    <option value={ 1 }>Saludar</option>
                    <option value={ 8 }>Bailar</option>
                    <option value={ 2 }>Lanzar beso</option>
                    <option value={ 3 }>Reír</option>
                    <option value={ 4 }>Sentarse</option>
                    <option value={ 5 }>Ponerse ausente</option>
                    <option value={ 7 }>Respetar</option>
                </select>
            </Column>
        </WiredConditionBaseView>
    );
};
