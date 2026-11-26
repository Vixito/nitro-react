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

interface WiredActionUserMessageViewProps
{
    label: string;
    placeholder?: string;
    showUserSource?: boolean;
    maxLength?: number;
}

export const WiredActionUserMessageView: FC<WiredActionUserMessageViewProps> = props =>
{
    const { label = 'Mensaje:', placeholder = '', showUserSource = false, maxLength = 100 } = props;
    const [ message, setMessage ] = useState<string>('');
    const [ userSource, setUserSource ] = useState<number>(0);
    const [ isAdvancedOpen, setIsAdvancedOpen ] = useState<boolean>(false);
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();

    const save = () =>
    {
        setIntParams(showUserSource ? [ userSource ] : []);
        setStringParam(message);
    };

    useEffect(() =>
    {
        if(!trigger) return;
        setMessage(trigger.stringData || '');
        if(showUserSource)
        {
            const src = (trigger.intData && trigger.intData.length > 0) ? trigger.intData[0] : 0;
            setUserSource(src);
            if(src !== 0) setIsAdvancedOpen(true);
        }
    }, [ trigger, showUserSource ]);

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
                    <Text bold>{ label }</Text>
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder={ placeholder }
                        maxLength={ maxLength }
                        value={ message }
                        onChange={ e => setMessage(e.target.value) }
                    />
                </Column>
                { showUserSource && (
                    <>
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
                    </>
                ) }
            </Column>
        </WiredActionBaseView>
    );
}
