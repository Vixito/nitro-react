import { FC, useEffect, useState } from 'react';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import { WiredFurniType } from '../../../../api';
import { Button, Column, Flex, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredActionBaseView } from './WiredActionBaseView';

const USER_SOURCES: { code: number; label: string }[] = [
    { code: 0, label: 'Utilizar el usuario desencadenante' },
    { code: 200, label: 'Usar usuarios del Selector' },
    { code: 201, label: 'Usar usuarios de la Señal' }
];

export const WiredActionFurniToUserView: FC<{}> = props =>
{
    const [ userSource, setUserSource ] = useState<number>(0);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([ userSource ]);

    useEffect(() =>
    {
        if(!trigger || !trigger.intData) return;

        setUserSource((trigger.intData.length > 0) ? trigger.intData[0] : 0);
    }, [ trigger ]);

    const userIdx = Math.max(0, USER_SOURCES.findIndex(u => u.code === userSource));

    const cycleUserSource = (delta: number) =>
    {
        const next = (userIdx + delta + USER_SOURCES.length) % USER_SOURCES.length;
        setUserSource(USER_SOURCES[next].code);
    };

    const advancedChildren = (
        <Column gap={ 1 }>
            <Text bold>Seleccionar fuente de usuarios:</Text>
            <Flex alignItems="center" justifyContent="between" gap={ 2 }>
                <Button size="sm" variant="secondary" onClick={ () => cycleUserSource(-1) }>
                    <FaArrowLeft className="fa-icon" />
                </Button>
                <Text bold center className="flex-grow-1">
                    { USER_SOURCES[userIdx]?.label || USER_SOURCES[0].label }
                </Text>
                <Button size="sm" variant="secondary" onClick={ () => cycleUserSource(1) }>
                    <FaArrowRight className="fa-icon" />
                </Button>
            </Flex>
        </Column>
    );

    return (
        <WiredActionBaseView
            requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_BY_ID }
            hasSpecialInput={ true }
            save={ save }
            advancedChildren={ advancedChildren }
        />
    );
}
