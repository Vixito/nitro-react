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
    'Utilizar furnis de Selector',
    'Variables globales'
];

const REF_OPTIONS = [
    'Variables globales',
    'Utilizar usuarios de Selector',
    'Utilizar el usuario desencadenante',
    'Utilizar furnis de Selector',
    'Utilizar el furni desencadenante'
];

const COMPARISONS = [
    { value: 2, label: '>' },
    { value: 4, label: '>=' },
    { value: 0, label: '=' },
    { value: 5, label: '<=' },
    { value: 3, label: '<' },
    { value: 1, label: '!=' }
];

export const WiredConditionVariableValueMatchView: FC<{}> = props =>
{
    const [ variableName, setVariableName ] = useState('@state');
    const [ scope, setScope ] = useState<number>(2);
    const [ comparison, setComparison ] = useState<number>(0);
    const [ refMode, setRefMode ] = useState<number>(0); // 0: Direct value, 1: From variable
    const [ targetValue, setTargetValue ] = useState<number>(0);
    const [ refVariableName, setRefVariableName ] = useState('@room_id');
    const [ refScope, setRefScope ] = useState<number>(0);
    const [ matchAll, setMatchAll ] = useState<boolean>(true);
    const [ sourceIndex, setSourceIndex ] = useState<number>(0);
    const [ refIndex, setRefIndex ] = useState<number>(0);
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();

    const save = () =>
    {
        const varStr = refMode === 1 ? `${ variableName.trim() }|${ refVariableName.trim() }` : variableName.trim();
        setStringParam(varStr);
        setIntParams([ comparison, targetValue, scope, refMode, matchAll ? 1 : 0, sourceIndex, refIndex, refScope ]);
    };

    useEffect(() =>
    {
        if(!trigger) return;

        const rawStr = trigger.stringData || '@state';
        if(rawStr.includes('|'))
        {
            const parts = rawStr.split('|');
            setVariableName(parts[0] || '@state');
            setRefVariableName(parts[1] || '@room_id');
        }
        else
        {
            setVariableName(rawStr);
        }

        if(trigger.intData && trigger.intData.length >= 3)
        {
            setComparison(trigger.intData[0]);
            setTargetValue(trigger.intData[1]);
            setScope(trigger.intData[2]);

            if(trigger.intData.length >= 4) setRefMode(trigger.intData[3]);
            if(trigger.intData.length >= 5) setMatchAll(trigger.intData[4] === 1);
            if(trigger.intData.length >= 6) setSourceIndex(trigger.intData[5] % SOURCE_OPTIONS.length);
            if(trigger.intData.length >= 7) setRefIndex(trigger.intData[6] % REF_OPTIONS.length);
            if(trigger.intData.length >= 8) setRefScope(trigger.intData[7]);
        }
        else
        {
            setComparison(0);
            setTargetValue(0);
            setScope(1);
        }
    }, [ trigger ]);

    return (
        <WiredConditionBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_NONE } hasSpecialInput={ true } save={ save }>
            <WiredVariableSelect
                label="Elegir variable:"
                value={ variableName }
                scope={ scope }
                onScopeChange={ setScope }
                onChange={ (val, scp) => { setVariableName(val); if(scp !== undefined) setScope(scp); } }
                activeColor="green"
            />

            <Column gap={ 1 }>
                <Text bold>Elige tipo:</Text>
                <Flex alignItems="center" gap={ 3 }>
                    { COMPARISONS.map(cmp => (
                        <Flex key={ cmp.value } alignItems="center" gap={ 1 }>
                            <input
                                className="form-check-input"
                                type="radio"
                                name="varComparison"
                                id={ `cmp_${ cmp.value }` }
                                checked={ comparison === cmp.value }
                                onChange={ () => setComparison(cmp.value) }
                            />
                            <Text small bold>{ cmp.label }</Text>
                        </Flex>
                    )) }
                </Flex>
            </Column>

            <Column gap={ 1 }>
                <Text bold>Valor de referencia</Text>
                <Flex alignItems="center" gap={ 2 }>
                    <input
                        className="form-check-input"
                        type="radio"
                        name="condRefMode"
                        id="condRefModeDirect"
                        checked={ refMode === 0 }
                        onChange={ () => setRefMode(0) }
                    />
                    <Text small>Ajustar valor:</Text>
                    <input
                        type="number"
                        className="form-control form-control-sm"
                        style={{ width: '90px' }}
                        value={ targetValue }
                        disabled={ refMode !== 0 }
                        onChange={ event => setTargetValue(parseInt(event.target.value) || 0) }
                    />
                </Flex>

                <Flex alignItems="center" gap={ 2 } className="mt-1">
                    <input
                        className="form-check-input"
                        type="radio"
                        name="condRefMode"
                        id="condRefModeVar"
                        checked={ refMode === 1 }
                        onChange={ () => setRefMode(1) }
                    />
                    <div className="flex-grow-1">
                        <WiredVariableSelect
                            label="De la variable:"
                            value={ refVariableName }
                            scope={ refScope }
                            onScopeChange={ setRefScope }
                            onChange={ (val, scp) => { setRefVariableName(val); if(scp !== undefined) setRefScope(scp); } }
                            disabled={ refMode !== 1 }
                            activeColor="teal"
                            placeholder="Elige una variable"
                        />
                    </div>
                </Flex>
            </Column>

            <Column gap={ 1 }>
                <Text bold>Condición coincidencia si:</Text>
                <Flex alignItems="center" gap={ 1 }>
                    <input
                        className="form-check-input"
                        type="radio"
                        name="condMatch"
                        id="condMatchAll"
                        checked={ matchAll }
                        onChange={ () => setMatchAll(true) }
                    />
                    <Text small>Todas las variables coinciden</Text>
                </Flex>
                <Flex alignItems="center" gap={ 1 }>
                    <input
                        className="form-check-input"
                        type="radio"
                        name="condMatch"
                        id="condMatchAny"
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

            <WiredStepperSelect
                label="Variable de referencia:"
                options={ REF_OPTIONS }
                value={ refIndex }
                onChange={ setRefIndex }
                disabled={ refMode !== 1 }
            />
        </WiredConditionBaseView>
    );
};
