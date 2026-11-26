import { FC, useEffect, useState } from 'react';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import ReactSlider from 'react-slider';
import { WiredFurniType } from '../../../../api';
import { Button, Column, Flex, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredActionBaseView } from './WiredActionBaseView';

const ADJUST_MODES: { value: number; label: string }[] = [
    { value: 0, label: 'Aumentar' },
    { value: 1, label: 'Disminuir' },
    { value: 2, label: 'Establecer valor' }
];

export const WiredActionAdjustClockView: FC<{}> = props =>
{
    const [ mode, setMode ] = useState<number>(0);
    const [ minutes, setMinutes ] = useState<number>(0);
    const [ seconds, setSeconds ] = useState<number>(0);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([ mode, minutes, seconds ]);

    useEffect(() =>
    {
        if(!trigger || !trigger.intData) return;

        setMode((trigger.intData.length > 0) ? Math.max(0, Math.min(2, trigger.intData[0])) : 0);
        setMinutes((trigger.intData.length > 1) ? Math.max(0, Math.min(99, trigger.intData[1])) : 0);
        setSeconds((trigger.intData.length > 2) ? Math.max(0, Math.min(59, trigger.intData[2])) : 0);
    }, [ trigger ]);

    return (
        <WiredActionBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_BY_ID } hasSpecialInput={ true } save={ save }>
            <Column gap={ 2 }>
                <Column gap={ 1 }>
                    <Text bold>Opciones:</Text>
                    { ADJUST_MODES.map(opt => (
                        <Flex key={ opt.value } alignItems="center" gap={ 1 }>
                            <input
                                className="form-check-input"
                                type="radio"
                                name="adjustClockMode"
                                id={ `adjClockMode_${ opt.value }` }
                                checked={ mode === opt.value }
                                onChange={ () => setMode(opt.value) }
                            />
                            <Text pointer onClick={ () => setMode(opt.value) }>{ opt.label }</Text>
                        </Flex>
                    )) }
                </Column>
                <hr className="m-0 bg-dark" />
                <Column gap={ 1 }>
                    <Text bold>{ minutes } minutos</Text>
                    <Flex alignItems="center" gap={ 2 }>
                        <Button size="sm" variant="secondary" disabled={ minutes <= 0 } onClick={ () => setMinutes(Math.max(0, minutes - 1)) }>
                            <FaArrowLeft className="fa-icon" />
                        </Button>
                        <div className="flex-grow-1">
                            <ReactSlider
                                className="nitro-slider"
                                min={ 0 }
                                max={ 99 }
                                value={ minutes }
                                onChange={ val => setMinutes(Number(val)) }
                            />
                        </div>
                        <Button size="sm" variant="secondary" disabled={ minutes >= 99 } onClick={ () => setMinutes(Math.min(99, minutes + 1)) }>
                            <FaArrowRight className="fa-icon" />
                        </Button>
                    </Flex>
                </Column>
                <Column gap={ 1 }>
                    <Text bold>{ seconds } segundos</Text>
                    <Flex alignItems="center" gap={ 2 }>
                        <Button size="sm" variant="secondary" disabled={ seconds <= 0 } onClick={ () => setSeconds(Math.max(0, seconds - 1)) }>
                            <FaArrowLeft className="fa-icon" />
                        </Button>
                        <div className="flex-grow-1">
                            <ReactSlider
                                className="nitro-slider"
                                min={ 0 }
                                max={ 59 }
                                value={ seconds }
                                onChange={ val => setSeconds(Number(val)) }
                            />
                        </div>
                        <Button size="sm" variant="secondary" disabled={ seconds >= 59 } onClick={ () => setSeconds(Math.min(59, seconds + 1)) }>
                            <FaArrowRight className="fa-icon" />
                        </Button>
                    </Flex>
                </Column>
            </Column>
        </WiredActionBaseView>
    );
}
