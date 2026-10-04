import { FC, useEffect, useState } from 'react';
import { useWired } from '../../../../hooks';
import { WiredModernBaseView } from '../WiredModernBaseView';

export const WiredVariableUserView: FC<{}> = props =>
{
    const [ variableName, setVariableName ] = useState('punto_de_control');
    const [ hasValue, setHasValue ] = useState(false);
    const [ availability, setAvailability ] = useState(1); // 0: Mientras en sala, 1: Permanente, 2: Entre salas
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();

    const save = () =>
    {
        setStringParam(variableName.trim());
        setIntParams([ hasValue ? 1 : 0, availability ]);
    };

    useEffect(() =>
    {
        if(!trigger) return;

        setVariableName(trigger.stringData || '');

        if(trigger.intData && trigger.intData.length >= 2)
        {
            setHasValue(trigger.intData[0] === 1);
            setAvailability(trigger.intData[1]);
        }
        else if(trigger.intData && trigger.intData.length === 1)
        {
            setHasValue(trigger.intData[0] === 1);
            setAvailability(1);
        }
        else
        {
            setHasValue(false);
            setAvailability(1);
        }
    }, [ trigger ]);

    return (
        <WiredModernBaseView
            headerVariant="green"
            headerTitle="Variable Wired: Variable de usuario"
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
                        placeholder="ej: punto_de_control"
                        value={ variableName }
                        onChange={ event => setVariableName(event.target.value) }
                        maxLength={ 32 }
                    />
                </div>

                <div className="wired-modern-field-group">
                    <label className="wired-modern-label">Opciones de la variable:</label>
                    <div className="wired-modern-checkbox" onClick={ () => setHasValue(!hasValue) }>
                        <span className={ `checkbox-box ${ hasValue ? 'checked' : '' }` }>
                            { hasValue && '✓' }
                        </span>
                        <span className="checkbox-label">Tiene valor</span>
                    </div>
                </div>

                <div className="wired-modern-field-group">
                    <label className="wired-modern-label">Opciones de disponibilidad:</label>
                    <div className="d-flex flex-column gap-1">
                        <div className="wired-modern-radio" onClick={ () => setAvailability(0) }>
                            <span className={ `radio-circle ${ availability === 0 ? 'checked' : '' }` }>
                                { availability === 0 && <span className="radio-dot" /> }
                            </span>
                            <span className="radio-label">Mientras el usuario esté en la sala</span>
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
