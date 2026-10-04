import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Column, Flex, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredStepperSelect } from '../WiredStepperSelect';
import { WiredVariableSelect } from '../WiredVariableSelect';
import { WiredConditionBaseView } from './WiredConditionBaseView';

const SOURCE_OPTIONS = [
    'Utilizar el usuario desencadenante',
    'Utilizar usuarios de Selector',
    'Utilizar el furni desencadenante',
    'Utilizar furnis de Selector'
];

export const WiredConditionHasVariableView: FC<{}> = props =>
{
    const [ variableName, setVariableName ] = useState('Punto De Control');
    const [ scope, setScope ] = useState<number>(1); // 2: Furni, 1: User, 3: Context
    const [ matchAll, setMatchAll ] = useState<boolean>(true);
    const [ sourceIndex, setSourceIndex ] = useState<number>(0);
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();

    const save = () =>
    {
        setStringParam(variableName.trim());
        setIntParams([ scope, matchAll ? 1 : 0, sourceIndex ]);
    };

    useEffect(() =>
    {
        if(!trigger) return;

        setVariableName(trigger.stringData || 'Punto De Control');

        if(trigger.intData && trigger.intData.length >= 1)
        {
            setScope(trigger.intData[0]);
            if(trigger.intData.length >= 2) setMatchAll(trigger.intData[1] === 1);
            if(trigger.intData.length >= 3) setSourceIndex(trigger.intData[2] % SOURCE_OPTIONS.length);
        }
        else
        {
            setScope(1);
            setMatchAll(true);
            setSourceIndex(0);
        }
    }, [ trigger ]);

    return (
        <WiredConditionBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_NONE } hasSpecialInput={ true } save={ save }>
            <WiredVariableSelect
                label="Elegir variable:"
                value={ variableName }
                scope={ scope }
                onScopeChange={ setScope }
                availableScopes={ [ 2, 1, 3 ] }
                onChange={ (val, scp) => { setVariableName(val); if(scp !== undefined) setScope(scp); } }
                activeColor="green"
            />

            <Column gap={ 1 }>
                <Text bold>Condición coincidencia si:</Text>
                <Flex alignItems="center" gap={ 1 }>
                    <input
                        className="form-check-input"
                        type="radio"
                        name="hasVarMatch"
                        id="hasVarMatchAll"
                        checked={ matchAll }
                        onChange={ () => setMatchAll(true) }
                    />
                    <Text small>Todas las variables coinciden</Text>
                </Flex>
                <Flex alignItems="center" gap={ 1 }>
                    <input
                        className="form-check-input"
                        type="radio"
                        name="hasVarMatch"
                        id="hasVarMatchAny"
                        checked={ !matchAll }
                        onChange={ () => setMatchAll(false) }
                    />
                    <Text small>Alguna variable coincide</Text>
                </Flex>
            </Column>

            <WiredStepperSelect
                label="Fuente de la variable:"
                options={ SOURCE_OPTIONS }
                value={ sourceIndex }
                onChange={ setSourceIndex }
            />
        </WiredConditionBaseView>
    );
};
