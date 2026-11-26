import { FC, useEffect, useState } from 'react';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import { WiredFurniType } from '../../../../api';
import { Button, Column, Flex, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredActionBaseView } from './WiredActionBaseView';

const WALK_MODES: { value: number; label: string }[] = [
    { value: 0, label: 'Seguir andando si se ha movido cerca del objetivo' },
    { value: 1, label: 'Seguir andando' },
    { value: 2, label: 'Parar de andar' }
];

const USER_SOURCES: { code: number; label: string }[] = [
    { code: 0, label: 'Utilizar el usuario desencadenante' },
    { code: 200, label: 'Utilizar usuarios de Selector' },
    { code: 201, label: 'Utilizar usuarios de Señal' }
];

export const WiredActionTeleportView: FC<{}> = props =>
{
    const [ walkMode, setWalkMode ] = useState<number>(0);
    const [ userSource, setUserSource ] = useState<number>(0);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([ walkMode, userSource ]);

    useEffect(() =>
    {
        if(!trigger || !trigger.intData) return;

        setWalkMode((trigger.intData.length > 0) ? Math.max(0, Math.min(2, trigger.intData[0])) : 0);
        setUserSource((trigger.intData.length > 1) ? trigger.intData[1] : 0);
    }, [ trigger ]);

    const userIdx = Math.max(0, USER_SOURCES.findIndex(u => u.code === userSource));

    const cycleUserSource = (delta: number) =>
    {
        const next = (userIdx + delta + USER_SOURCES.length) % USER_SOURCES.length;
        setUserSource(USER_SOURCES[next].code);
    };

    const userSourceSelector = (
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
            requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT }
            hasSpecialInput={ true }
            save={ save }
            advancedChildren={ userSourceSelector }
        >
            <Column gap={ 1 }>
                <Text bold>Si el usuario estaba andando</Text>
                { WALK_MODES.map(opt => (
                    <Flex key={ opt.value } alignItems="center" gap={ 1 }>
                        <input
                            className="form-check-input"
                            type="radio"
                            name="teleportWalkMode"
                            id={ `tpWalkMode_${ opt.value }` }
                            checked={ walkMode === opt.value }
                            onChange={ () => setWalkMode(opt.value) }
                        />
                        <Text pointer onClick={ () => setWalkMode(opt.value) }>{ opt.label }</Text>
                    </Flex>
                )) }
            </Column>
        </WiredActionBaseView>
    );
}
