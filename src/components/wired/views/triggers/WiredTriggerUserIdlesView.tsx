import { FC, useEffect, useState } from 'react';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import ReactSlider from 'react-slider';
import { WiredFurniType } from '../../../../api';
import { Button, Column, Flex, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

export const WiredTriggerUserIdlesView: FC<{}> = props =>
{
    const [ seconds, setSeconds ] = useState<number>(0);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([ seconds ]);

    useEffect(() =>
    {
        if(!trigger || !trigger.intData) return;

        setSeconds((trigger.intData.length > 0) ? Math.max(0, Math.min(60, trigger.intData[0])) : 0);
    }, [ trigger ]);

    return (
        <WiredTriggerBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_NONE } hasSpecialInput={ true } save={ save }>
            <Column gap={ 1 }>
                <Text bold>Establecer tiempo: { seconds } { seconds === 1 ? 'segundo' : 'segundos' }</Text>
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
                            max={ 60 }
                            value={ seconds }
                            onChange={ value => setSeconds(Number(value)) }
                        />
                    </div>
                    <Button
                        size="sm"
                        variant="secondary"
                        disabled={ seconds >= 60 }
                        onClick={ () => setSeconds(prev => Math.min(60, prev + 1)) }
                    >
                        <FaArrowRight className="fa-icon" />
                    </Button>
                </Flex>
            </Column>
        </WiredTriggerBaseView>
    );
}
