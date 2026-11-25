import { FC, useEffect, useState } from 'react';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import ReactSlider from 'react-slider';
import { WiredFurniType } from '../../../../api';
import { Button, Column, Flex, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredActionBaseView } from './WiredActionBaseView';

const ALTITUDE_MODES: { value: number; label: string }[] = [
    { value: 0, label: 'Aumentar' },
    { value: 1, label: 'Disminuir' },
    { value: 2, label: 'Establecer valor' }
];

export const WiredActionSetAltitudeView: FC<{}> = props =>
{
    const [ mode, setMode ] = useState<number>(0);
    // Stored in centis (0..4000 => 0.00..40.00)
    const [ altitudeCentis, setAltitudeCentis ] = useState<number>(0);
    const [ altitudeText, setAltitudeText ] = useState<string>('0');
    const { trigger = null, setIntParams = null } = useWired();

    const formatAlt = (centis: number) =>
    {
        const val = Math.round(Math.max(0, Math.min(4000, centis))) / 100;
        return Number.isInteger(val) ? val.toString() : val.toFixed(2).replace(/0+$/, '');
    };

    const applyAltitudeCentis = (centis: number) =>
    {
        const clamped = Math.max(0, Math.min(4000, Math.round(centis)));
        setAltitudeCentis(clamped);
        setAltitudeText(formatAlt(clamped));
    };

    const handleTextChange = (raw: string) =>
    {
        setAltitudeText(raw);
        const normalized = raw.replace(',', '.');
        const parsed = parseFloat(normalized);
        if(!isNaN(parsed))
        {
            const clamped = Math.max(0, Math.min(40, parsed));
            setAltitudeCentis(Math.round(clamped * 100));
        }
    };

    const handleTextBlur = () =>
    {
        setAltitudeText(formatAlt(altitudeCentis));
    };

    const save = () => setIntParams([ mode, altitudeCentis ]);

    useEffect(() =>
    {
        if(!trigger || !trigger.intData) return;

        setMode((trigger.intData.length > 0) ? Math.max(0, Math.min(2, trigger.intData[0])) : 0);
        const initialCentis = (trigger.intData.length > 1) ? Math.max(0, Math.min(4000, trigger.intData[1])) : 0;
        setAltitudeCentis(initialCentis);
        setAltitudeText(formatAlt(initialCentis));
    }, [ trigger ]);

    return (
        <WiredActionBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_BY_ID } hasSpecialInput={ true } save={ save }>
            <Column gap={ 2 }>
                <Column gap={ 1 }>
                    <Text bold>Opciones:</Text>
                    { ALTITUDE_MODES.map(opt => (
                        <Flex key={ opt.value } alignItems="center" gap={ 1 }>
                            <input
                                className="form-check-input"
                                type="radio"
                                name="setAltitudeMode"
                                id={ `altMode_${ opt.value }` }
                                checked={ mode === opt.value }
                                onChange={ () => setMode(opt.value) }
                            />
                            <Text pointer onClick={ () => setMode(opt.value) }>{ opt.label }</Text>
                        </Flex>
                    )) }
                </Column>
                <hr className="m-0 bg-dark" />
                <Column gap={ 1 }>
                    <Flex alignItems="center" gap={ 2 }>
                        <Text bold>Elegir altitud:</Text>
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            style={{ width: '76px' }}
                            value={ altitudeText }
                            onChange={ e => handleTextChange(e.target.value) }
                            onBlur={ handleTextBlur }
                        />
                    </Flex>
                    <Flex alignItems="center" gap={ 2 }>
                        <Button
                            size="sm"
                            variant="secondary"
                            disabled={ altitudeCentis <= 0 }
                            onClick={ () => applyAltitudeCentis(altitudeCentis - 10) }
                        >
                            <FaArrowLeft className="fa-icon" />
                        </Button>
                        <div className="flex-grow-1">
                            <ReactSlider
                                className="nitro-slider"
                                min={ 0 }
                                max={ 4000 }
                                step={ 10 }
                                value={ altitudeCentis }
                                onChange={ value => applyAltitudeCentis(Number(value)) }
                            />
                        </div>
                        <Button
                            size="sm"
                            variant="secondary"
                            disabled={ altitudeCentis >= 4000 }
                            onClick={ () => applyAltitudeCentis(altitudeCentis + 10) }
                        >
                            <FaArrowRight className="fa-icon" />
                        </Button>
                    </Flex>
                </Column>
            </Column>
        </WiredActionBaseView>
    );
}
