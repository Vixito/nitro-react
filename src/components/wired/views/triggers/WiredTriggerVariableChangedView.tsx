import { FC, useEffect, useState } from 'react';
import { useWired } from '../../../../hooks';
import { WiredModernBaseView } from '../WiredModernBaseView';

export const WiredTriggerVariableChangedView: FC<{}> = props =>
{
    const [ variableName, setVariableName ] = useState('Monedas De Oro');
    const [ onCreated, setOnCreated ] = useState(false);
    const [ onChanged, setOnChanged ] = useState(true);
    const [ onDeleted, setOnDeleted ] = useState(false);
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();

    const save = () =>
    {
        setStringParam(variableName.trim());
        setIntParams([ onCreated ? 1 : 0, onChanged ? 1 : 0, onDeleted ? 1 : 0 ]);
    };

    useEffect(() =>
    {
        if(!trigger) return;

        setVariableName(trigger.stringData || 'Monedas De Oro');

        if(trigger.intData && trigger.intData.length >= 3)
        {
            setOnCreated(trigger.intData[0] === 1);
            setOnChanged(trigger.intData[1] === 1);
            setOnDeleted(trigger.intData[2] === 1);
        }
        else if(trigger.intData && trigger.intData.length >= 1)
        {
            setOnCreated(false);
            setOnChanged(true);
            setOnDeleted(false);
        }
        else
        {
            setOnCreated(false);
            setOnChanged(true);
            setOnDeleted(false);
        }
    }, [ trigger ]);

    return (
        <WiredModernBaseView
            headerVariant="dark"
            headerTitle="Causante Wired: Variable cambiada"
            iconType="trigger"
            hasSpecialInput={ true }
            save={ save }
        >
            <div className="d-flex flex-column gap-3">
                <div className="wired-modern-field-group">
                    <label className="wired-modern-label">Elegir variable:</label>
                    <div className="d-flex gap-1 align-items-center">
                        <input
                            type="text"
                            className="wired-modern-input flex-grow-1"
                            placeholder="Monedas De Oro"
                            value={ variableName }
                            onChange={ event => setVariableName(event.target.value) }
                            maxLength={ 32 }
                        />
                    </div>
                </div>

                <div className="wired-modern-field-group">
                    <label className="wired-modern-label">Activar cuando la variable es:</label>
                    <div className="d-flex flex-column gap-2 mt-1">
                        <div className="wired-modern-checkbox" onClick={ () => setOnCreated(!onCreated) }>
                            <span className={ `checkbox-box ${ onCreated ? 'checked' : '' }` }>
                                { onCreated && '✓' }
                            </span>
                            <span className="checkbox-label">Creada</span>
                        </div>
                        <div className="wired-modern-checkbox" onClick={ () => setOnChanged(!onChanged) }>
                            <span className={ `checkbox-box ${ onChanged ? 'checked' : '' }` }>
                                { onChanged && '✓' }
                            </span>
                            <span className="checkbox-label">Valor cambiado</span>
                        </div>
                        <div className="wired-modern-checkbox" onClick={ () => setOnDeleted(!onDeleted) }>
                            <span className={ `checkbox-box ${ onDeleted ? 'checked' : '' }` }>
                                { onDeleted && '✓' }
                            </span>
                            <span className="checkbox-label">Eliminada</span>
                        </div>
                    </div>
                </div>
            </div>
        </WiredModernBaseView>
    );
};
