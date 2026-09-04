import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Column, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionClickConfView: FC<{}> = props =>
{
    const [ clickAction, setClickAction ] = useState(0);
    const [ permissions, setPermissions ] = useState(0);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([ clickAction, permissions ]);

    useEffect(() =>
    {
        if(trigger.intData && trigger.intData.length >= 2)
        {
            setClickAction(trigger.intData[0]);
            setPermissions(trigger.intData[1]);
        }
        else if(trigger.intData && trigger.intData.length === 1)
        {
            setClickAction(trigger.intData[0]);
            setPermissions(0);
        }
        else
        {
            setClickAction(0);
            setPermissions(0);
        }
    }, [ trigger ]);

    return (
        <WiredActionBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_BY_ID } hasSpecialInput={ true } save={ save }>
            <Column gap={ 1 }>
                <Text bold>Comportamiento al hacer clic:</Text>
                <select
                    className="form-select form-select-sm"
                    value={ clickAction }
                    onChange={ event => setClickAction(parseInt(event.target.value)) }>
                    <option value={ 0 }>Interacción por defecto (normal)</option>
                    <option value={ 1 }>Bloquear clic (sin interacción)</option>
                    <option value={ 2 }>Caminar hacia el furni al hacer clic</option>
                </select>
            </Column>
            <Column gap={ 1 }>
                <Text bold>Permisos de interacción:</Text>
                <select
                    className="form-select form-select-sm"
                    value={ permissions }
                    onChange={ event => setPermissions(parseInt(event.target.value)) }>
                    <option value={ 0 }>Todos los usuarios</option>
                    <option value={ 1 }>Solo usuarios con derechos o dueño</option>
                </select>
                <Text small muted>Configura el comportamiento y permisos de interacción por clic sobre los furnis seleccionados.</Text>
            </Column>
        </WiredActionBaseView>
    );
}
