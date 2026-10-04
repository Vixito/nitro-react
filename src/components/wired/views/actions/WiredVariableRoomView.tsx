import { FC, useEffect, useState } from 'react';
import { useWired } from '../../../../hooks';
import { WiredModernBaseView } from '../WiredModernBaseView';

export const WiredVariableRoomView: FC<{}> = props =>
{
    const [ variableName, setVariableName ] = useState('');
    const [ availability, setAvailability ] = useState(0); // 0: Mientras sala activa, 1: Permanente, 2: Entre salas
    const [ currentValue, setCurrentValue ] = useState(0);
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();

    const save = () =>
    {
        setStringParam(variableName.trim());
        setIntParams([ availability, currentValue ]);
    };

    useEffect(() =>
    {
        if(!trigger) return;

        setVariableName(trigger.stringData || '');

        if(trigger.intData && trigger.intData.length >= 2)
        {
            setAvailability(trigger.intData[0]);
            setCurrentValue(trigger.intData[1]);
        }
        else if(trigger.intData && trigger.intData.length === 1)
        {
            setAvailability(trigger.intData[0]);
            setCurrentValue(0);
        }
        else
        {
            setAvailability(0);
            setCurrentValue(0);
        }
    }, [ trigger ]);

    return (
        <WiredModernBaseView
            headerVariant="teal"
            headerTitle="Variable Wired: Variable global"
            subtitleLinkText="Ver en el menú Wired"
            iconType="variable"
            hasSpecialInput={ true }
            save={ save }
        >
            <div className="d-flex flex-column gap-3">
                <div className="wired-modern-field-group">
                    <label className="wired-modern-label">Nombre de la variable:</label>
                    <input
                        type="text"
                        className="wired-modern-input"
                        placeholder="ej: estado_juego, tiempo"
                        value={ variableName }
                        onChange={ event => setVariableName(event.target.value) }
                        maxLength={ 32 }
                    />
                </div>

                <div className="wired-modern-field-group">
                    <label className="wired-modern-label">Inspección de variables</label>
                    <div className="wired-modern-current-val-text">
                        Valor actual: { currentValue }
                    </div>
                </div>

                <div className="wired-modern-field-group">
                    <label className="wired-modern-label">Opciones de disponibilidad:</label>
                    <div className="d-flex flex-column gap-1">
                        <div className="wired-modern-radio" onClick={ () => setAvailability(0) }>
                            <span className={ `radio-circle ${ availability === 0 ? 'checked' : '' }` }>
                                { availability === 0 && <span className="radio-dot" /> }
                            </span>
                            <span className="radio-label">Mientras la sala esté activa</span>
                        </div>
                        <div className="wired-modern-radio" onClick={ () => setAvailability(1) }>
                            <span className={ `radio-circle ${ availability === 1 ? 'checked' : '' }` }>
                                { availability === 1 && <span className="radio-dot" /> }
                            </span>
                            <span className="radio-label">Permanente</span>
                        </div>
                        <div className="wired-modern-radio" onClick={ () => setAvailability(2) }>
                            <span className={ `radio-circle ${ availability === 2 ? 'checked' : '' }` }>
                                { availability === 2 && <span className="radio-dot" /> }
                            </span>
                            <span className="radio-label">Permanente, compartida entre salas</span>
                        </div>
                    </div>
                </div>
            </div>
        </WiredModernBaseView>
    );
};
