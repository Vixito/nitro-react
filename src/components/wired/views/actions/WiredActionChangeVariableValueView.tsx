import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Column, Flex, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredActionBaseView } from './WiredActionBaseView';

const TARGET_OPTIONS = [
    'Utilizar el usuario desencadenante',
    'Utilizar usuarios de Selector',
    'Utilizar el furni desencadenante',
    'Utilizar furnis de Selector',
    'Variable de sala (Global)'
];

const REFERENCE_OPTIONS = [
    'Utilizar usuarios de Selector',
    'Utilizar el usuario desencadenante',
    'Utilizar furnis de Selector',
    'Utilizar el furni desencadenante',
    'Variable de sala (Global)'
];

export const WiredActionChangeVariableValueView: FC<{}> = props =>
{
    const [ variableName, setVariableName ] = useState('Monedas De Oro');
    const [ operation, setOperation ] = useState(1);
    const [ refMode, setRefMode ] = useState<number>(0);
    const [ operand, setOperand ] = useState(0);
    const [ refVariableName, setRefVariableName ] = useState('Monedas De Oro');
    const [ targetIndex, setTargetIndex ] = useState(0);
    const [ refIndex, setRefIndex ] = useState(0);
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();

    const save = () =>
    {
        const varStr = refMode === 1 ? `${ variableName.trim() }|${ refVariableName.trim() }` : variableName.trim();
        setStringParam(varStr);
        setIntParams([ operation, operand, targetIndex, refMode, refIndex ]);
    };

    useEffect(() =>
    {
        if(!trigger) return;

        const rawStr = trigger.stringData || 'Monedas De Oro';
        if(rawStr.includes('|'))
        {
            const parts = rawStr.split('|');
            setVariableName(parts[0] || 'Monedas De Oro');
            setRefVariableName(parts[1] || 'Monedas De Oro');
        }
        else
        {
            setVariableName(rawStr);
        }

        if(trigger.intData && trigger.intData.length >= 3)
        {
            setOperation(trigger.intData[0]);
            setOperand(trigger.intData[1]);
            setTargetIndex(trigger.intData[2] % TARGET_OPTIONS.length);

            if(trigger.intData.length >= 5)
            {
                setRefMode(trigger.intData[3]);
                setRefIndex(trigger.intData[4] % REFERENCE_OPTIONS.length);
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
            setOperand(0);
        }
    }, [ trigger ]);

    return (
        <WiredActionBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_NONE } hasSpecialInput={ true } save={ save }>
            <Column gap={ 1 }>
                <Text bold>Elegir variable:</Text>
                <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Monedas De Oro"
                    value={ variableName }
                    onChange={ event => setVariableName(event.target.value) }
                    maxLength={ 32 }
                />
            </Column>
            <Column gap={ 1 }>
                <Text bold>Operación:</Text>
                <select
                    className="form-select form-select-sm"
                    value={ operation }
                    onChange={ event => setOperation(parseInt(event.target.value)) }
                >
                    <option value={ 1 }>Añadir</option>
                    <option value={ 0 }>Asignar</option>
                    <option value={ 2 }>Restar</option>
                    <option value={ 3 }>Multiplicar</option>
                    <option value={ 4 }>Dividir</option>
                </select>
            </Column>
            <Column gap={ 1 }>
                <Text bold>Valor de referencia:</Text>
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
                    <Text small>De la variable:</Text>
                    <input
                        type="text"
                        className="form-control form-control-sm flex-grow-1"
                        placeholder="Elige una variable"
                        value={ refVariableName }
                        disabled={ refMode !== 1 }
                        onChange={ event => setRefVariableName(event.target.value) }
                    />
                </Flex>
            </Column>
            <Column gap={ 1 }>
                <Text bold>Variable de destino:</Text>
                <select
                    className="form-select form-select-sm"
                    value={ targetIndex }
                    onChange={ event => setTargetIndex(parseInt(event.target.value)) }
                >
                    { TARGET_OPTIONS.map((opt, i) => (
                        <option key={ i } value={ i }>{ opt }</option>
                    )) }
                </select>
            </Column>
            <Column gap={ 1 }>
                <Text bold>Variable de referencia:</Text>
                <select
                    className="form-select form-select-sm"
                    value={ refIndex }
                    onChange={ event => setRefIndex(parseInt(event.target.value)) }
                >
                    { REFERENCE_OPTIONS.map((opt, i) => (
                        <option key={ i } value={ i }>{ opt }</option>
                    )) }
                </select>
            </Column>
        </WiredActionBaseView>
    );
};
