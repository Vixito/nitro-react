import { FC, useEffect, useState } from 'react';
import { FaArrowLeft, FaArrowRight, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import ReactSlider from 'react-slider';
import { WiredFurniType } from '../../../../api';
import { Button, Column, Flex, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionRelativeMoveView: FC<{}> = props =>
{
    const [ dirX, setDirX ] = useState<number>(1);
    const [ stepsX, setStepsX ] = useState<number>(0);
    const [ dirY, setDirY ] = useState<number>(1);
    const [ stepsY, setStepsY ] = useState<number>(0);
    const [ isXOpen, setIsXOpen ] = useState<boolean>(true);
    const [ isYOpen, setIsYOpen ] = useState<boolean>(true);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([ dirX, stepsX, dirY, stepsY ]);

    useEffect(() =>
    {
        if(!trigger || !trigger.intData) return;

        setDirX((trigger.intData.length > 0 && trigger.intData[0] === 0) ? 0 : 1);
        setStepsX((trigger.intData.length > 1) ? Math.max(0, Math.min(10, trigger.intData[1])) : 0);
        setDirY((trigger.intData.length > 2 && trigger.intData[2] === 0) ? 0 : 1);
        setStepsY((trigger.intData.length > 3) ? Math.max(0, Math.min(10, trigger.intData[3])) : 0);
    }, [ trigger ]);

    return (
        <WiredActionBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT } hasSpecialInput={ true } save={ save }>
            <Column gap={ 2 }>
                <Column gap={ 1 }>
                    <Flex alignItems="center" justifyContent="between" pointer onClick={ () => setIsXOpen(prev => !prev) }>
                        <Text bold>Eje X</Text>
                        { isXOpen ? <FaChevronUp className="fa-icon" /> : <FaChevronDown className="fa-icon" /> }
                    </Flex>
                    { isXOpen && (
                        <Column gap={ 1 }>
                            <Flex alignItems="center" gap={ 3 }>
                                <Flex alignItems="center" gap={ 1 }>
                                    <input
                                        className="form-check-input"
                                        type="radio"
                                        name="relMoveDirX"
                                        id="relMoveDirX0"
                                        checked={ dirX === 0 }
                                        onChange={ () => setDirX(0) }
                                    />
                                    <i className="icon icon-nw" style={ { cursor: 'pointer' } } onClick={ () => setDirX(0) } />
                                </Flex>
                                <Flex alignItems="center" gap={ 1 }>
                                    <input
                                        className="form-check-input"
                                        type="radio"
                                        name="relMoveDirX"
                                        id="relMoveDirX1"
                                        checked={ dirX === 1 }
                                        onChange={ () => setDirX(1) }
                                    />
                                    <i className="icon icon-se" style={ { cursor: 'pointer' } } onClick={ () => setDirX(1) } />
                                </Flex>
                            </Flex>
                            <Text small>Mover { stepsX } baldosas en dirección</Text>
                            <Flex alignItems="center" gap={ 2 }>
                                <Button size="sm" variant="secondary" disabled={ stepsX <= 0 } onClick={ () => setStepsX(Math.max(0, stepsX - 1)) }>
                                    <FaArrowLeft className="fa-icon" />
                                </Button>
                                <div className="flex-grow-1">
                                    <ReactSlider
                                        className="nitro-slider"
                                        min={ 0 }
                                        max={ 10 }
                                        value={ stepsX }
                                        onChange={ val => setStepsX(Number(val)) }
                                    />
                                </div>
                                <Button size="sm" variant="secondary" disabled={ stepsX >= 10 } onClick={ () => setStepsX(Math.min(10, stepsX + 1)) }>
                                    <FaArrowRight className="fa-icon" />
                                </Button>
                            </Flex>
                        </Column>
                    ) }
                </Column>
                <hr className="m-0 bg-dark" />
                <Column gap={ 1 }>
                    <Flex alignItems="center" justifyContent="between" pointer onClick={ () => setIsYOpen(prev => !prev) }>
                        <Text bold>Eje Y</Text>
                        { isYOpen ? <FaChevronUp className="fa-icon" /> : <FaChevronDown className="fa-icon" /> }
                    </Flex>
                    { isYOpen && (
                        <Column gap={ 1 }>
                            <Flex alignItems="center" gap={ 3 }>
                                <Flex alignItems="center" gap={ 1 }>
                                    <input
                                        className="form-check-input"
                                        type="radio"
                                        name="relMoveDirY"
                                        id="relMoveDirY0"
                                        checked={ dirY === 0 }
                                        onChange={ () => setDirY(0) }
                                    />
                                    <i className="icon icon-sw" style={ { cursor: 'pointer' } } onClick={ () => setDirY(0) } />
                                </Flex>
                                <Flex alignItems="center" gap={ 1 }>
                                    <input
                                        className="form-check-input"
                                        type="radio"
                                        name="relMoveDirY"
                                        id="relMoveDirY1"
                                        checked={ dirY === 1 }
                                        onChange={ () => setDirY(1) }
                                    />
                                    <i className="icon icon-ne" style={ { cursor: 'pointer' } } onClick={ () => setDirY(1) } />
                                </Flex>
                            </Flex>
                            <Text small>Mover { stepsY } baldosas en dirección</Text>
                            <Flex alignItems="center" gap={ 2 }>
                                <Button size="sm" variant="secondary" disabled={ stepsY <= 0 } onClick={ () => setStepsY(Math.max(0, stepsY - 1)) }>
                                    <FaArrowLeft className="fa-icon" />
                                </Button>
                                <div className="flex-grow-1">
                                    <ReactSlider
                                        className="nitro-slider"
                                        min={ 0 }
                                        max={ 10 }
                                        value={ stepsY }
                                        onChange={ val => setStepsY(Number(val)) }
                                    />
                                </div>
                                <Button size="sm" variant="secondary" disabled={ stepsY >= 10 } onClick={ () => setStepsY(Math.min(10, stepsY + 1)) }>
                                    <FaArrowRight className="fa-icon" />
                                </Button>
                            </Flex>
                        </Column>
                    ) }
                </Column>
            </Column>
        </WiredActionBaseView>
    );
}
