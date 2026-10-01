import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Column, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredConditionBaseView } from './WiredConditionBaseView';

export const WiredConditionTextConnectorView: FC<{}> = props =>
{
    const [ variableName, setVariableName ] = useState('');
    const [ mappingText, setMappingText ] = useState('');
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();

    const save = () =>
    {
        const combined = `${ variableName.trim() };${ mappingText.trim() }`;
        setStringParam(combined);
        setIntParams([ 0 ]);
    };

    useEffect(() =>
    {
        const fullString = trigger.stringData || '';
        if(fullString.includes(';'))
        {
            const parts = fullString.split(';');
            setVariableName(parts[0] || '');
            setMappingText(parts[1] || '');
        }
        else
        {
            setVariableName(fullString);
            setMappingText('');
        }
    }, [ trigger ]);

    return (
        <WiredConditionBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_NONE } hasSpecialInput={ true } save={ save }>
            <Column gap={ 1 }>
                <Text bold>Nombre de la Variable Numérica:</Text>
                <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="ej: estado, resultado, fase"
                    value={ variableName }
                    onChange={ event => setVariableName(event.target.value) }
                    maxLength={ 32 }
                />
            </Column>
            <Column gap={ 1 }>
                <Text bold>Conexión de Textos (Valor=Texto):</Text>
                <textarea
                    className="form-control form-control-sm"
                    rows={ 4 }
                    placeholder="1=Victoria|2=Derrota|3=Empate"
                    value={ mappingText }
                    onChange={ event => setMappingText(event.target.value) }
                />
                <Text small variant="muted">Usa el formato: valor=texto separados por pleca (|). Ejemplo: 1=Rojo|2=Azul|3=Verde</Text>
            </Column>
        </WiredConditionBaseView>
    );
}
