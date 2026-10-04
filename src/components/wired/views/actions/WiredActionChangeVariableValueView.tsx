import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Column, Flex, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredStepperSelect } from '../WiredStepperSelect';
import { WiredVariableSelect } from '../WiredVariableSelect';
import { WiredActionBaseView } from './WiredActionBaseView';

const TARGET_OPTIONS = [
    'Utilizar el usuario desencadenante',
    'Utilizar usuarios de Selector',
    'Utilizar el furni desencadenante',
    'Utilizar furnis de Selector',
    'Variables globales'
];

const REFERENCE_OPTIONS = [
    'Utilizar usuarios de Selector',
    'Utilizar el usuario desencadenante',
    'Utilizar furnis de Selector',
    'Utilizar el furni desencadenante',
    'Variables globales'
];

export const WiredActionChangeVariableValueView: FC<{}> = props =>
{
    const [ variableName, setVariableName ] = useState('Monedas De Oro');
    const [ scope, setScope ] = useState<number>(1);
    const [ operation, setOperation ] = useState<number>(1);
    const [ refMode, setRefMode ] = useState<number>(0); // 0: Direct value, 1: From variable
    const [ operand, setOperand ] = useState<number>(1);
    const [ refVariableName, setRefVariableName ] = useState('Galletas');
    const [ refScope, setRefScope ] = useState<number>(0);
    const [ targetIndex, setTargetIndex ] = useState<number>(0);
    const [ refIndex, setRefIndex ] = useState<number>(0);
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();

    const save = () =>
    {
        const varStr = refMode === 1 ? `${ variableName.trim() }|${ refVariableName.trim() }` : variableName.trim();
        setStringParam(varStr);
        setIntParams([ operation, operand, scope, refMode, refIndex, targetIndex, refScope ]);
    };

    useEffect(() =>
    {
        if(!trigger) return;

        const rawStr = trigger.stringData || 'Monedas De Oro';
        if(rawStr.includes('|'))
        {
            const parts = rawStr.split('|');
            setVariableName(parts[0] || 'Monedas De Oro');
            setRefVariableName(parts[1] || 'Galletas');
        }
        else
        {
            setVariableName(rawStr);
        }

        if(trigger.intData && trigger.intData.length >= 3)
        {
            setOperation(trigger.intData[0]);
            setOperand(trigger.intData[1]);
            setScope(trigger.intData[2]);

            if(trigger.intData.length >= 5)
            {
                setRefMode(trigger.intData[3]);
                setRefIndex(trigger.intData[4] % REFERENCE_OPTIONS.length);
            }
            if(trigger.intData.length >= 6)
            {
                setTargetIndex(trigger.intData[5] % TARGET_OPTIONS.length);
            }
            if(trigger.intData.length >= 7)
            {
                setRefScope(trigger.intData[6]);
            }
        }
        else if(trigger.intData && trigger.intData.length >= 2)
        {
            setOperation(trigger.intData[0]);
            setOperand(trigger.intData[1]);
        }
        else
        {
            setOperation(1);
            setOperand(1);
            setScope(1);
        }
    }, [ trigger ]);

    return (
        <WiredActionBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_NONE } hasSpecialInput={ true } save={ save }>
            <WiredVariableSelect
                label="Elegir variable:"
                value={ variableName }
                scope={ scope }
                onScopeChange={ setScope }
                onChange={ (val, scp) => { setVariableName(val); if(scp !== undefined) setScope(scp); } }
                activeColor="green"
            />

            <Column gap={ 1 }>
                <Text bold>Operación:</Text>
                <select
                    className="form-select form-select-sm"
                    value={ operation }
                    onChange={ event => setOperation(parseInt(event.target.value)) }
                >
                    <option value={ 0 }>Asignar</option>
                    <option value={ 1 }>Añadir</option>
                    <option value={ 2 }>Restar</option>
                    <option value={ 3 }>Multiplicar</option>
                    <option value={ 4 }>Dividir</option>
                    <option value={ 7 }>Potencia</option>
                    <option value={ 6 }>Módulo</option>
                </select>
            </Column>

            <Column gap={ 1 }>
                <Text bold>Valor de referencia</Text>
                <Flex alignItems="center" gap={ 2 }>
                    <input
                        className="form-check-input"
                        type="radio"
                        name="refMode"
                        id="refModeDirect"
                        checked={ refMode === 0 }
                        onChange={ () => setRefMode(0) }
                    />
                    <Text small>Ajustar valor:</Text>
                    <input
                        type="number"
                        className="form-control form-control-sm"
                        style={{ width: '90px' }}
                        value={ operand }
                        disabled={ refMode !== 0 }
                        onChange={ event => setOperand(parseInt(event.target.value) || 0) }
                    />
                </Flex>

                <Flex alignItems="center" gap={ 2 } className="mt-1">
                    <input
                        className="form-check-input"
                        type="radio"
                        name="refMode"
                        id="refModeVar"
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

            <WiredStepperSelect
                label="Variable de destino:"
                options={ TARGET_OPTIONS }
                value={ targetIndex }
                onChange={ setTargetIndex }
            />

            <WiredStepperSelect
                label="Variable de referencia:"
                options={ REFERENCE_OPTIONS }
                value={ refIndex }
                onChange={ setRefIndex }
                disabled={ refMode !== 1 }
            />
        </WiredActionBaseView>
    );
};
