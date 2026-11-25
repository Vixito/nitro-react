import { WiredActionDefinition } from '@nitrots/nitro-renderer';
import { FC, PropsWithChildren, ReactNode, useEffect } from 'react';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import ReactSlider from 'react-slider';
import { GetWiredTimeLocale, LocalizeText, WiredFurniType } from '../../../../api';
import { Button, Column, Flex, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredBaseView } from '../WiredBaseView';

export interface WiredActionBaseViewProps
{
    hasSpecialInput: boolean;
    requiresFurni: number;
    save: () => void;
    allowedFurniSources?: number[];
    advancedChildren?: ReactNode;
}

export const WiredActionBaseView: FC<PropsWithChildren<WiredActionBaseViewProps>> = props =>
{
    const {
        requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_NONE,
        save = null,
        hasSpecialInput = false,
        allowedFurniSources = undefined,
        advancedChildren = null,
        children = null
    } = props;
    const { trigger = null, actionDelay = 0, setActionDelay = null } = useWired();

    useEffect(() =>
    {
        setActionDelay((trigger as WiredActionDefinition).delayInPulses);
    }, [ trigger, setActionDelay ]);

    return (
        <WiredBaseView
            wiredType="action"
            requiresFurni={ requiresFurni }
            save={ save }
            hasSpecialInput={ hasSpecialInput }
            allowedFurniSources={ allowedFurniSources }
            advancedChildren={ advancedChildren }
        >
            { children }
            { !!children && <hr className="m-0 bg-dark" /> }
            <Column gap={ 1 }>
                <Text bold>{ LocalizeText('wiredfurni.params.delay', [ 'seconds' ], [ GetWiredTimeLocale(actionDelay) ]) }</Text>
                <Flex alignItems="center" gap={ 2 }>
                    <Button
                        size="sm"
                        variant="secondary"
                        disabled={ actionDelay <= 0 }
                        onClick={ () => setActionDelay(Math.max(0, actionDelay - 1)) }
                    >
                        <FaArrowLeft className="fa-icon" />
                    </Button>
                    <div className="flex-grow-1">
                        <ReactSlider
                            className="nitro-slider"
                            min={ 0 }
                            max={ 20 }
                            value={ actionDelay }
                            onChange={ event => setActionDelay(Number(event)) } />
                    </div>
                    <Button
                        size="sm"
                        variant="secondary"
                        disabled={ actionDelay >= 20 }
                        onClick={ () => setActionDelay(Math.min(20, actionDelay + 1)) }
                    >
                        <FaArrowRight className="fa-icon" />
                    </Button>
                </Flex>
            </Column>
        </WiredBaseView>
    );
}
