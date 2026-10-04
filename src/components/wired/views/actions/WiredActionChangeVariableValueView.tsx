import { FC, useEffect, useState } from 'react';
import ReactSlider from 'react-slider';
import { useWired } from '../../../../hooks';
import { WiredModernBaseView } from '../WiredModernBaseView';

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
    const [ operation, setOperation ] = useState(1); // 1: Añadir, 0: Asignar, 2: Restar, 3: Multiplicar, 4: Dividir
    const [ refMode, setRefMode ] = useState<number>(0); // 0: Ajustar valor (directo), 1: De la variable
    const [ operand, setOperand ] = useState(0);
    const [ refVariableName, setRefVariableName ] = useState('Monedas De Oro');
    const [ targetIndex, setTargetIndex ] = useState(0);
    const [ refIndex, setRefIndex ] = useState(0);
    const { trigger = null, setStringParam = null, setIntParams = null, actionDelay = 0, setActionDelay = null } = useWired();

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

    const handlePrevTarget = () =>
    {
        setTargetIndex(prev => (prev === 0 ? TARGET_OPTIONS.length - 1 : prev - 1));
    };

    const handleNextTarget = () =>
    {
        setTargetIndex(prev => (prev + 1) % TARGET_OPTIONS.length);
    };

    const handlePrevRef = () =>
    {
        setRefIndex(prev => (prev === 0 ? REFERENCE_OPTIONS.length - 1 : prev - 1));
    };

    const handleNextRef = () =>
    {
        setRefIndex(prev => (prev + 1) % REFERENCE_OPTIONS.length);
    };

    const handlePrevDelay = () =>
    {
        if(setActionDelay) setActionDelay(Math.max(0, actionDelay - 1));
    };

    const handleNextDelay = () =>
    {
        if(setActionDelay) setActionDelay(Math.min(20, actionDelay + 1));
    };

    const illustration = (
        <div className="wired-modern-actor-badge">
            <span className="badge-tag">
                { targetIndex === 0 ? '(Causante)' : '(Perdedor)' }
            </span>
        </div>
    );

    return (
        <WiredModernBaseView
            headerVariant="dark"
            headerTitle="Efecto Wired: Cambiar valor de variable"
            iconType="effect"
            illustrationGraphic={ illustration }
            hasSpecialInput={ true }
            save={ save }
        >
            <div className="d-flex flex-column gap-2">
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
                    <label className="wired-modern-label">Operación:</label>
                    <select
                        className="wired-modern-select"
                        value={ operation }
                        onChange={ event => setOperation(parseInt(event.target.value)) }
                    >
                        <option value={ 1 }>Añadir</option>
                        <option value={ 0 }>Asignar</option>
                        <option value={ 2 }>Restar</option>
                        <option value={ 3 }>Multiplicar</option>
                        <option value={ 4 }>Dividir</option>
                    </select>
                </div>

                <div className="wired-modern-field-group">
                    <label className="wired-modern-label">Valor de referencia</label>
                    <div className="d-flex flex-column gap-2 mt-1">
                        <div className="d-flex align-items-center gap-2">
                            <div className="wired-modern-radio" onClick={ () => setRefMode(0) }>
                                <span className={ `radio-circle ${ refMode === 0 ? 'checked' : '' }` }>
                                    { refMode === 0 && <span className="radio-dot" /> }
                                </span>
                                <span className="radio-label">Ajustar valor:</span>
                            </div>
                            <input
                                type="number"
                                className="wired-modern-input"
                                style={{ width: '80px' }}
                                value={ operand }
                                disabled={ refMode !== 0 }
                                onChange={ event => setOperand(parseInt(event.target.value) || 0) }
                            />
                        </div>

                        <div className="d-flex align-items-center gap-2">
                            <div className="wired-modern-radio" onClick={ () => setRefMode(1) }>
                                <span className={ `radio-circle ${ refMode === 1 ? 'checked' : '' }` }>
                                    { refMode === 1 && <span className="radio-dot" /> }
                                </span>
                                <span className="radio-label">De la variable:</span>
                            </div>
                            <input
                                type="text"
                                className="wired-modern-input flex-grow-1"
                                placeholder="Elige una variable"
                                value={ refVariableName }
                                disabled={ refMode !== 1 }
                                onChange={ event => setRefVariableName(event.target.value) }
                            />
                        </div>
                    </div>
                </div>

                <div className="wired-modern-field-group">
                    <label className="wired-modern-label">
                        Retrasar Efecto unos { actionDelay / 2 } segundos
                    </label>
                    <div className="wired-modern-slider-container">
                        <button className="slider-step-btn" onClick={ handlePrevDelay }>&lt;</button>
                        <div className="flex-grow-1">
                            <ReactSlider
                                className="nitro-slider"
                                min={ 0 }
                                max={ 20 }
                                value={ actionDelay }
                                onChange={ event => setActionDelay(event) }
                            />
                        </div>
                        <button className="slider-step-btn" onClick={ handleNextDelay }>&gt;</button>
                    </div>
                </div>

                <div className="wired-modern-field-group">
                    <label className="wired-modern-label">Variable de destino:</label>
                    <div className="wired-modern-stepper">
                        <button className="stepper-arrow-btn" onClick={ handlePrevTarget }>&lt;</button>
                        <span className="stepper-label">{ TARGET_OPTIONS[targetIndex] }</span>
                        <button className="stepper-arrow-btn" onClick={ handleNextTarget }>&gt;</button>
                    </div>
                </div>

                <div className="wired-modern-field-group">
                    <label className="wired-modern-label">Variable de referencia:</label>
                    <div className="wired-modern-stepper">
                        <button className="stepper-arrow-btn" onClick={ handlePrevRef }>&lt;</button>
                        <span className="stepper-label">{ REFERENCE_OPTIONS[refIndex] }</span>
                        <button className="stepper-arrow-btn" onClick={ handleNextRef }>&gt;</button>
                    </div>
                </div>
            </div>
        </WiredModernBaseView>
    );
};
