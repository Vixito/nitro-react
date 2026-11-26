import { FC, useEffect, useState } from 'react';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import ReactSlider from 'react-slider';
import { WiredFurniType } from '../../../../api';
import { Button, Column, Flex, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

export const WiredTriggerExecutePeriodicallyShortView: FC<{}> = props =>
{
    const [ steps, setSteps ] = useState<number>(10);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([ steps ]);

    useEffect(() =>
    {
        if(!trigger || !trigger.intData) return;

        const raw = trigger.intData.length > 0 ? trigger.intData[0] : 10;
        setSteps(Math.max(1, Math.min(10, raw || 10)));
    }, [ trigger ]);

    return (
        <WiredTriggerBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_NONE } hasSpecialInput={ true } save={ save }>
            <Column gap={ 1 }>
                <Text bold>{ `Configurar tiempo: ${ steps * 50 } ms` }</Text>
                <Flex alignItems="center" gap={ 2 }>
                    <Button
                        size="sm"
                        variant="secondary"
                        disabled={ steps <= 1 }
                        onClick={ () => setSteps(prev => Math.max(1, prev - 1)) }
                    >
                        <FaArrowLeft className="fa-icon" />
                    </Button>
                    <div className="flex-grow-1">
                        <ReactSlider
                            className="nitro-slider"
                            min={ 1 }
                            max={ 10 }
                            step={ 1 }
                            value={ steps }
                            onChange={ event => setSteps(Number(event)) }
                        />
                    </div>
                    <Button
                        size="sm"
                        variant="secondary"
                        disabled={ steps >= 10 }
                        onClick={ () => setSteps(prev => Math.min(10, prev + 1)) }
                    >
                        <FaArrowRight className="fa-icon" />
                    </Button>
                </Flex>
            </Column>
        </WiredTriggerBaseView>
    );
}
