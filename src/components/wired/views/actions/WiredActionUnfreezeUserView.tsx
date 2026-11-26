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

export const WiredActionUnfreezeUserView: FC<{}> = props =>
{
    const [ userSource, setUserSource ] = useState<number>(0);
    const [ message, setMessage ] = useState<string>('');
    const [ isAdvancedOpen, setIsAdvancedOpen ] = useState<boolean>(false);
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();

    const save = () =>
    {
        setIntParams([ userSource ]);
        setStringParam(message);
    };

    useEffect(() =>
    {
        if(!trigger) return;
        const data = trigger.intData || [];
        const src = data.length > 0 ? data[0] : 0;
        setUserSource(src);
        setMessage(trigger.stringData || '');
        if(src !== 0) setIsAdvancedOpen(true);
    }, [ trigger ]);

    const userIdx = Math.max(0, USER_SOURCES.findIndex(u => u.code === userSource));

    const cycleUserSource = (delta: number) =>
    {
        const next = (userIdx + delta + USER_SOURCES.length) % USER_SOURCES.length;
        setUserSource(USER_SOURCES[next].code);
    };

    return (
        <WiredActionBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_NONE } hasSpecialInput={ true } save={ save }>
            <Column gap={ 2 }>
                <Column gap={ 1 }>
                    <Text bold>Mensaje:</Text>
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Opcional: mensaje al descongelar"
                        maxLength={ 100 }
                        value={ message }
                        onChange={ e => setMessage(e.target.value) }
                    />
                </Column>
                <hr className="m-0 bg-dark" />
                <Column gap={ 1 }>
                    <Flex justifyContent="center">
                        <Text small underline pointer onClick={ () => setIsAdvancedOpen(prev => !prev) }>
                            { isAdvancedOpen ? 'Ocultar ajustes avanzados' : 'Mostrar ajustes avanzados' }
                        </Text>
                    </Flex>
                    { isAdvancedOpen && (
                        <Column gap={ 1 } className="mt-1">
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
                    ) }
                </Column>
            </Column>
        </WiredActionBaseView>
    );
}
