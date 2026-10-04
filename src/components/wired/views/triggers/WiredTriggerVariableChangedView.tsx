import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Column, Flex, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredVariableSelect } from '../WiredVariableSelect';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

export const WiredTriggerVariableChangedView: FC<{}> = props =>
{
    const [ variableName, setVariableName ] = useState('Monedas De Oro');
    const [ scope, setScope ] = useState<number>(1);
    const [ onCreated, setOnCreated ] = useState(false);
    const [ onChanged, setOnChanged ] = useState(true);
    const [ onDeleted, setOnDeleted ] = useState(false);
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();

    const save = () =>
    {
        setStringParam(variableName.trim());
        setIntParams([ scope, onCreated ? 1 : 0, onChanged ? 1 : 0, onDeleted ? 1 : 0 ]);
    };

    useEffect(() =>
    {
        if(!trigger) return;

        setVariableName(trigger.stringData || 'Monedas De Oro');

        if(trigger.intData && trigger.intData.length >= 4)
        {
            setScope(trigger.intData[0]);
            setOnCreated(trigger.intData[1] === 1);
            setOnChanged(trigger.intData[2] === 1);
            setOnDeleted(trigger.intData[3] === 1);
        }
        else if(trigger.intData && trigger.intData.length >= 1)
        {
            setScope(trigger.intData[0]);
            setOnCreated(false);
            setOnChanged(true);
            setOnDeleted(false);
        }
        else
        {
            setScope(1);
            setOnCreated(false);
            setOnChanged(true);
            setOnDeleted(false);
        }
    }, [ trigger ]);

    return (
        <WiredTriggerBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_NONE } hasSpecialInput={ true } save={ save }>
            <WiredVariableSelect
                label="Elegir variable:"
                value={ variableName }
                scope={ scope }
                onScopeChange={ setScope }
                onChange={ (val, scp) => { setVariableName(val); if(scp !== undefined) setScope(scp); } }
                activeColor="green"
            />

            <Column gap={ 1 }>
                <Text bold>Activar cuando la variable es:</Text>
                <Flex alignItems="center" gap={ 1 }>
                    <input
                        className="form-check-input"
                        type="checkbox"
                        id="trgVarCreated"
                        checked={ onCreated }
                        onChange={ event => setOnCreated(event.target.checked) }
                    />
                    <Text small>Creada</Text>
                </Flex>
                <Flex alignItems="center" gap={ 1 }>
                    <input
                        className="form-check-input"
                        type="checkbox"
                        id="trgVarChanged"
                        checked={ onChanged }
                        onChange={ event => setOnChanged(event.target.checked) }
                    />
                    <Text small>Valor cambiado</Text>
                </Flex>
                <Flex alignItems="center" gap={ 1 }>
                    <input
                        className="form-check-input"
                        type="checkbox"
                        id="trgVarDeleted"
                        checked={ onDeleted }
                        onChange={ event => setOnDeleted(event.target.checked) }
                    />
                    <Text small>Eliminada</Text>
                </Flex>
            </Column>
        </WiredTriggerBaseView>
    );
};
