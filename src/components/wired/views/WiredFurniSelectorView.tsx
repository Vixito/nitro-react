import { FC, ReactNode, useEffect, useState } from 'react';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import { LocalizeText } from '../../../api';
import { Button, Column, Flex, Text } from '../../../common';
import { useWired } from '../../../hooks';

export const WIRED_FURNI_SOURCE_SELECTED = 0;
export const WIRED_FURNI_SOURCE_TRIGGERING = 100;
export const WIRED_FURNI_SOURCE_SELECTOR = 200;
export const WIRED_FURNI_SOURCE_SIGNAL = 201;

export const WIRED_FURNI_SOURCE_LABELS: Record<number, string> = {
    [WIRED_FURNI_SOURCE_SELECTED]: 'Usar furnis seleccionados',
    [WIRED_FURNI_SOURCE_TRIGGERING]: 'Usar ítem desencadenante',
    [WIRED_FURNI_SOURCE_SELECTOR]: 'Usar furnis de Selector',
    [WIRED_FURNI_SOURCE_SIGNAL]: 'Usar furnis de Señal'
};

export interface WiredFurniSelectorViewProps
{
    allowedFurniSources?: number[];
    advancedChildren?: ReactNode;
    furniSourceLabel?: string;
}

export const WiredFurniSelectorView: FC<WiredFurniSelectorViewProps> = props =>
{
    const {
        allowedFurniSources = [
            WIRED_FURNI_SOURCE_SELECTED,
            WIRED_FURNI_SOURCE_TRIGGERING,
            WIRED_FURNI_SOURCE_SELECTOR,
            WIRED_FURNI_SOURCE_SIGNAL
        ],
        advancedChildren = null,
        furniSourceLabel = 'Seleccionar fuente de los furnis:'
    } = props;
    const { trigger = null, furniIds = [], furniSource = 0, setFurniSource = null } = useWired();
    const [ isAdvancedOpen, setIsAdvancedOpen ] = useState<boolean>(false);

    useEffect(() =>
    {
        if(furniSource !== WIRED_FURNI_SOURCE_SELECTED)
        {
            setIsAdvancedOpen(true);
        }
    }, [ trigger, furniSource ]);

    const hasSourceSelector = allowedFurniSources && allowedFurniSources.length > 1;
    const hasAdvanced = hasSourceSelector || !!advancedChildren;

    const activeIndex = Math.max(0, allowedFurniSources.indexOf(furniSource));
    const currentSource = allowedFurniSources[activeIndex] ?? WIRED_FURNI_SOURCE_SELECTED;

    const cycleSource = (delta: number) =>
    {
        if(!setFurniSource || !allowedFurniSources.length) return;
        const nextIndex = (activeIndex + delta + allowedFurniSources.length) % allowedFurniSources.length;
        setFurniSource(allowedFurniSources[nextIndex]);
    };

    return (
        <Column gap={ 1 }>
            <Text bold>{ LocalizeText('wiredfurni.pickfurnis.caption', [ 'count', 'limit' ], [ furniIds.length.toString(), (trigger?.maximumItemSelectionCount ?? 0).toString() ]) }</Text>
            <Text small>{ LocalizeText('wiredfurni.pickfurnis.desc') }</Text>
            { hasAdvanced && (
                <Column gap={ 2 } className="mt-1">
                    <Flex justifyContent="center">
                        <Text
                            small
                            underline
                            pointer
                            onClick={ () => setIsAdvancedOpen(prev => !prev) }
                        >
                            { isAdvancedOpen ? 'Ocultar ajustes avanzados' : 'Mostrar ajustes avanzados' }
                        </Text>
                    </Flex>
                    { isAdvancedOpen && (
                        <Column gap={ 2 }>
                            { hasSourceSelector && (
                                <>
                                    <hr className="m-0 bg-dark" />
                                    <Column gap={ 1 }>
                                        <Text bold>{ furniSourceLabel }</Text>
                                        <Flex alignItems="center" justifyContent="between" gap={ 2 }>
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={ () => cycleSource(-1) }
                                            >
                                                <FaArrowLeft className="fa-icon" />
                                            </Button>
                                            <Text bold center className="flex-grow-1">
                                                { WIRED_FURNI_SOURCE_LABELS[currentSource] || WIRED_FURNI_SOURCE_LABELS[WIRED_FURNI_SOURCE_SELECTED] }
                                            </Text>
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={ () => cycleSource(1) }
                                            >
                                                <FaArrowRight className="fa-icon" />
                                            </Button>
                                        </Flex>
                                    </Column>
                                </>
                            ) }
                            { !!advancedChildren && (
                                <>
                                    <hr className="m-0 bg-dark" />
                                    { advancedChildren }
                                </>
                            ) }
                        </Column>
                    ) }
                </Column>
            ) }
        </Column>
    );
}
