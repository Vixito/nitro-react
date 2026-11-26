import { FC, useEffect, useState } from 'react';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import { WiredFurniType } from '../../../../api';
import { Button, Column, Flex, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredActionBaseView } from './WiredActionBaseView';

const FORWARD_FURNI_SOURCES: { code: number; label: string }[] = [
    { code: 200, label: 'Usar furnis de Selector' },
    { code: 100, label: 'Usar ítem desencadenante' },
    { code: 201, label: 'Usar furnis de Señal' },
    { code: 0, label: 'Usar furnis seleccionados' },
    { code: -1, label: 'Ninguno' }
];

const FORWARD_USER_SOURCES: { code: number; label: string }[] = [
    { code: 200, label: 'Utilizar usuarios de Selector' },
    { code: 0, label: 'Utilizar el usuario desencadenante' },
    { code: 201, label: 'Utilizar usuarios de Señal' },
    { code: -1, label: 'Ninguno' }
];

export const WiredActionSendSignalView: FC<{}> = props =>
{
    const [ forwardFurniSource, setForwardFurniSource ] = useState<number>(200);
    const [ forwardUserSource, setForwardUserSource ] = useState<number>(200);
    const [ perFurni, setPerFurni ] = useState<number>(0);
    const [ perUser, setPerUser ] = useState<number>(0);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([ forwardFurniSource, forwardUserSource, perFurni, perUser ]);

    useEffect(() =>
    {
        if(!trigger || !trigger.intData) return;

        setForwardFurniSource((trigger.intData.length > 0) ? trigger.intData[0] : 200);
        setForwardUserSource((trigger.intData.length > 1) ? trigger.intData[1] : 200);
        setPerFurni((trigger.intData.length > 2 && trigger.intData[2] === 1) ? 1 : 0);
        setPerUser((trigger.intData.length > 3 && trigger.intData[3] === 1) ? 1 : 0);
    }, [ trigger ]);

    const furniIdx = Math.max(0, FORWARD_FURNI_SOURCES.findIndex(f => f.code === forwardFurniSource));
    const userIdx = Math.max(0, FORWARD_USER_SOURCES.findIndex(u => u.code === forwardUserSource));

    const cycleFwdFurni = (delta: number) =>
    {
        const next = (furniIdx + delta + FORWARD_FURNI_SOURCES.length) % FORWARD_FURNI_SOURCES.length;
        setForwardFurniSource(FORWARD_FURNI_SOURCES[next].code);
    };

    const cycleFwdUser = (delta: number) =>
    {
        const next = (userIdx + delta + FORWARD_USER_SOURCES.length) % FORWARD_USER_SOURCES.length;
        setForwardUserSource(FORWARD_USER_SOURCES[next].code);
    };

    const advancedOptions = (
        <Column gap={ 2 }>
            <Column gap={ 1 }>
                <Text bold>Furni a adelantar</Text>
                <Flex alignItems="center" justifyContent="between" gap={ 2 }>
                    <Button size="sm" variant="secondary" onClick={ () => cycleFwdFurni(-1) }>
                        <FaArrowLeft className="fa-icon" />
                    </Button>
                    <Text bold center className="flex-grow-1">
                        { FORWARD_FURNI_SOURCES[furniIdx]?.label || FORWARD_FURNI_SOURCES[0].label }
                    </Text>
                    <Button size="sm" variant="secondary" onClick={ () => cycleFwdFurni(1) }>
                        <FaArrowRight className="fa-icon" />
                    </Button>
                </Flex>
            </Column>
            <hr className="m-0 bg-dark" />
            <Column gap={ 1 }>
                <Text bold>Usuarios para avanzar</Text>
                <Flex alignItems="center" justifyContent="between" gap={ 2 }>
                    <Button size="sm" variant="secondary" onClick={ () => cycleFwdUser(-1) }>
                        <FaArrowLeft className="fa-icon" />
                    </Button>
                    <Text bold center className="flex-grow-1">
                        { FORWARD_USER_SOURCES[userIdx]?.label || FORWARD_USER_SOURCES[0].label }
                    </Text>
                    <Button size="sm" variant="secondary" onClick={ () => cycleFwdUser(1) }>
                        <FaArrowRight className="fa-icon" />
                    </Button>
                </Flex>
            </Column>
            <hr className="m-0 bg-dark" />
            <Column gap={ 1 }>
                <Text bold>Opciones de señal</Text>
                <Flex alignItems="center" gap={ 1 }>
                    <input
                        className="form-check-input"
                        type="checkbox"
                        id="signalPerFurni"
                        checked={ !!perFurni }
                        onChange={ e => setPerFurni(e.target.checked ? 1 : 0) }
                    />
                    <Text pointer onClick={ () => setPerFurni(prev => prev ? 0 : 1) }>
                        Enviar señal para cada furni
                    </Text>
                </Flex>
                <Flex alignItems="center" gap={ 1 }>
                    <input
                        className="form-check-input"
                        type="checkbox"
                        id="signalPerUser"
                        checked={ !!perUser }
                        onChange={ e => setPerUser(e.target.checked ? 1 : 0) }
                    />
                    <Text pointer onClick={ () => setPerUser(prev => prev ? 0 : 1) }>
                        Enviar señal para cada usuario
                    </Text>
                </Flex>
            </Column>
        </Column>
    );

    return (
        <WiredActionBaseView
            requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_BY_ID }
            hasSpecialInput={ true }
            save={ save }
            furniSourceLabel="Antenas"
            advancedChildren={ advancedOptions }
        />
    );
}
