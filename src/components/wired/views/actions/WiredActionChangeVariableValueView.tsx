import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Column, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionChangeVariableValueView: FC<{}> = props =>
{
    const [ variableName, setVariableName ] = useState('');
    const [ operation, setOperation ] = useState(1);
    const [ operand, setOperand ] = useState(1);
    const [ scope, setScope ] = useState(0);
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();

    const save = () =>
    {
        setStringParam(variableName.trim());
        setIntParams([ operation, operand, scope ]);
    };

    useEffect(() =>
    {
        setVariableName(trigger.stringData || '');

        if(trigger.intData && trigger.intData.length >= 3)
        {
            setOperation(trigger.intData[0]);
            setOperand(trigger.intData[1]);
            setScope(trigger.intData[2]);
        }
        else if(trigger.intData && trigger.intData.length >= 2)
        {
            setOperation(trigger.intData[0]);
            setOperand(trigger.intData[1]);
            setScope(0);
        }
        else
        {
            setOperation(1);
            setOperand(1);
            setScope(0);
        }
    }, [ trigger ]);

    return (
        <WiredActionBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_NONE } hasSpecialInput={ true } save={ save }>
            <Column gap={ 1 }>
                <Text bold>Nombre de la Variable:</Text>
                <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="ej: puntos, vidas, nivel"
                    value={ variableName }
                    onChange={ event => setVariableName(event.target.value) }
                    maxLength={ 32 }
                />
            </Column>
            <Column gap={ 1 }>
                <Text bold>Ámbito de la Variable:</Text>
                <select
                    className="form-select form-select-sm"
                    value={ scope }
                    onChange={ event => setScope(parseInt(event.target.value)) }
                >
                    <option value={ 0 }>Variable de Sala (Global en toda la sala)</option>
                    <option value={ 1 }>Variable de Usuario (Individual por cada jugador)</option>
                </select>
            </Column>
            <Column gap={ 1 }>
                <Text bold>Operación a Realizar:</Text>
                <select
                    className="form-select form-select-sm"
                    value={ operation }
                    onChange={ event => setOperation(parseInt(event.target.value)) }
                >
                    <option value={ 0 }>Fijar a valor (=)</option>
                    <option value={ 1 }>Sumar valor (+)</option>
                    <option value={ 2 }>Restar valor (-)</option>
                    <option value={ 3 }>Multiplicar por (*)</option>
                    <option value={ 4 }>Dividir entre (/)</option>
                    <option value={ 5 }>Número Aleatorio (1 a N)</option>
                </select>
            </Column>
            <Column gap={ 1 }>
                <Text bold>Valor del Operando:</Text>
                <input
                    type="number"
                    className="form-control form-control-sm"
                    value={ operand }
                    onChange={ event => setOperand(parseInt(event.target.value) || 0) }
                />
            </Column>
        </WiredActionBaseView>
    );
}
