import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Column, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

export const WiredTriggerVariableChangedView: FC<{}> = props =>
{
    const [ variableName, setVariableName ] = useState('');
    const [ scope, setScope ] = useState(0);
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();

    const save = () =>
    {
        setStringParam(variableName.trim());
        setIntParams([ scope ]);
    };

    useEffect(() =>
    {
        setVariableName(trigger.stringData || '');
        setScope((trigger.intData && trigger.intData.length > 0) ? trigger.intData[0] : 0);
    }, [ trigger ]);

    return (
        <WiredTriggerBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_NONE } hasSpecialInput={ true } save={ save }>
            <Column gap={ 1 }>
                <Text bold>Nombre de la Variable:</Text>
                <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="ej: puntos (o dejar vacío para cualquiera)"
                    value={ variableName }
                    onChange={ event => setVariableName(event.target.value) }
                    maxLength={ 32 }
                />
            </Column>
            <Column gap={ 1 }>
                <Text bold>Ámbito a Monitorear:</Text>
                <select
                    className="form-select form-select-sm"
                    value={ scope }
                    onChange={ event => setScope(parseInt(event.target.value)) }
                >
                    <option value={ 0 }>Variable de Sala (Global)</option>
                    <option value={ 1 }>Variable de Usuario (Individual)</option>
                </select>
            </Column>
        </WiredTriggerBaseView>
    );
}
