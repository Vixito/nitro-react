import { FC, useEffect, useState } from 'react';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import ReactSlider from 'react-slider';
import { WiredFurniType } from '../../../../api';
import { Button, Column, Flex, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

export const WiredTriggerClockCounterView: FC<{}> = props =>
{
    const [ minutes, setMinutes ] = useState<number>(0);
    const [ seconds, setSeconds ] = useState<number>(0);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([ minutes, seconds ]);

    useEffect(() =>
    {
        if(!trigger || !trigger.intData) return;

        setMinutes((trigger.intData.length > 0) ? Math.max(0, Math.min(10, trigger.intData[0])) : 0);
        setSeconds((trigger.intData.length > 1) ? Math.max(0, Math.min(59, trigger.intData[1])) : 0);
    }, [ trigger ]);

    return (
        <WiredTriggerBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_BY_ID } hasSpecialInput={ true } save={ save }>
            <Column gap={ 2 }>
                <Column gap={ 1 }>
                    <Text bold>{ minutes } { minutes === 1 ? 'minuto' : 'minutos' }</Text>
                    <Flex alignItems="center" gap={ 2 }>
                        <Button
                            size="sm"
                            variant="secondary"
                            disabled={ minutes <= 0 }
                            onClick={ () => setMinutes(prev => Math.max(0, prev - 1)) }
                        >
                            <FaArrowLeft className="fa-icon" />
                        </Button>
                        <div className="flex-grow-1">
                            <ReactSlider
                                className="nitro-slider"
                                min={ 0 }
                                max={ 10 }
                                value={ minutes }
                                onChange={ value => setMinutes(Number(value)) }
                            />
                        </div>
                        <Button
                            size="sm"
                            variant="secondary"
                            disabled={ minutes >= 10 }
                            onClick={ () => setMinutes(prev => Math.min(10, prev + 1)) }
                        >
                            <FaArrowRight className="fa-icon" />
                        </Button>
                    </Flex>
                </Column>
                <hr className="m-0 bg-dark" />
                <Column gap={ 1 }>
                    <Text bold>{ seconds } { seconds === 1 ? 'segundo' : 'segundos' }</Text>
                    <Flex alignItems="center" gap={ 2 }>
                        <Button
                            size="sm"
                            variant="secondary"
                            disabled={ seconds <= 0 }
                            onClick={ () => setSeconds(prev => Math.max(0, prev - 1)) }
                        >
                            <FaArrowLeft className="fa-icon" />
                        </Button>
                        <div className="flex-grow-1">
                            <ReactSlider
                                className="nitro-slider"
                                min={ 0 }
                                max={ 59 }
                                value={ seconds }
                                onChange={ value => setSeconds(Number(value)) }
                            />
                        </div>
                        <Button
                            size="sm"
                            variant="secondary"
                            disabled={ seconds >= 59 }
                            onClick={ () => setSeconds(prev => Math.min(59, prev + 1)) }
                        >
                            <FaArrowRight className="fa-icon" />
                        </Button>
                    </Flex>
                </Column>
            </Column>
        </WiredTriggerBaseView>
    );
}
