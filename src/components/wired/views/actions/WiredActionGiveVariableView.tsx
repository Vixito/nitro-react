import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Column, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionGiveVariableView: FC<{}> = props =>
{
    const [ variableName, setVariableName ] = useState('');
    const [ scope, setScope ] = useState(1); // 1: User, 2: Furni
    const [ initialValue, setInitialValue ] = useState(0);
    const [ hasValue, setHasValue ] = useState(1); // 1: Yes, 0: No
    const [ overwrite, setOverwrite ] = useState(1); // 1: Yes, 0: No
    const [ isPermanent, setIsPermanent ] = useState(1); // 1: Permanent, 0: Temporary
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();

    const save = () =>
    {
        setStringParam(variableName.trim());
        setIntParams([ scope, initialValue, hasValue, overwrite, isPermanent ]);
    };

    useEffect(() =>
    {
        setVariableName(trigger.stringData || '');

        if(trigger.intData && trigger.intData.length >= 5)
        {
            setScope(trigger.intData[0]);
            setInitialValue(trigger.intData[1]);
            setHasValue(trigger.intData[2]);
            setOverwrite(trigger.intData[3]);
            setIsPermanent(trigger.intData[4]);
        }
        else if(trigger.intData && trigger.intData.length >= 2)
        {
            setScope(trigger.intData[0]);
            setInitialValue(trigger.intData[1]);
            setHasValue(1);
            setOverwrite(1);
            setIsPermanent(1);
        }
        else
        {
            setScope(1);
            setInitialValue(0);
            setHasValue(1);
            setOverwrite(1);
            setIsPermanent(1);
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
                <Text bold>Asignar a (Ámbito):</Text>
                <select
                    className="form-select form-select-sm"
                    value={ scope }
                    onChange={ event => setScope(parseInt(event.target.value)) }
                >
                    <option value={ 1 }>Usuario (Jugador actual o seleccionado)</option>
                    <option value={ 2 }>Furni (Objeto activador o en contexto)</option>
                </select>
            </Column>
            <Column gap={ 1 }>
                <Text bold>¿Tiene valor numérico?:</Text>
                <select
                    className="form-select form-select-sm"
                    value={ hasValue }
                    onChange={ event => setHasValue(parseInt(event.target.value)) }
                >
                    <option value={ 1 }>Sí (asignar valor numérico)</option>
                    <option value={ 0 }>No (usar como bandera / flag booleano)</option>
                </select>
            </Column>
            { hasValue === 1 && (
                <Column gap={ 1 }>
                    <Text bold>Valor Inicial:</Text>
                    <input
                        type="number"
                        className="form-control form-control-sm"
                        value={ initialValue }
                        onChange={ event => setInitialValue(parseInt(event.target.value) || 0) }
                    />
                </Column>
            ) }
            <Column gap={ 1 }>
                <Text bold>Si la variable ya existe:</Text>
                <select
                    className="form-select form-select-sm"
                    value={ overwrite }
                    onChange={ event => setOverwrite(parseInt(event.target.value)) }
                >
                    <option value={ 1 }>Sobrescribir con el nuevo valor</option>
                    <option value={ 0 }>Conservar el valor existente sin modificar</option>
                </select>
            </Column>
            <Column gap={ 1 }>
                <Text bold>Duración / Persistencia:</Text>
                <select
                    className="form-select form-select-sm"
                    value={ isPermanent }
                    onChange={ event => setIsPermanent(parseInt(event.target.value)) }
                >
                    <option value={ 1 }>Permanente (se guarda en base de datos)</option>
                    <option value={ 0 }>Temporal (se elimina al salir de la sala)</option>
                </select>
            </Column>
        </WiredActionBaseView>
    );
}
