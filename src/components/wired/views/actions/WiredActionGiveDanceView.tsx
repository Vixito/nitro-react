import { FC, useEffect, useState } from 'react';
import { FaArrowLeft, FaArrowRight, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { WiredFurniType } from '../../../../api';
import { Button, Column, Flex, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredActionBaseView } from './WiredActionBaseView';

const DANCE_OPTIONS: { value: number; label: string }[] = [
    { value: 0, label: 'Parar de bailar' },
    { value: 1, label: 'Bailar' },
    { value: 2, label: 'Pogo Mogo' },
    { value: 3, label: 'Duck Funk' },
    { value: 4, label: 'The Rollie' }
];

const USER_SOURCES: { code: number; label: string }[] = [
    { code: 0, label: 'Utilizar el usuario desencadenante' },
    { code: 200, label: 'Usar usuarios del Selector' },
    { code: 201, label: 'Usar usuarios de la Señal' }
];

export const WiredActionGiveDanceView: FC<{}> = props =>
{
    const [ danceId, setDanceId ] = useState<number>(0);
    const [ userSource, setUserSource ] = useState<number>(0);
    const [ isTypeOpen, setIsTypeOpen ] = useState<boolean>(true);
    const [ isAdvancedOpen, setIsAdvancedOpen ] = useState<boolean>(false);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([ danceId, userSource ]);

    useEffect(() =>
    {
        if(!trigger || !trigger.intData) return;
        setDanceId(trigger.intData.length > 0 ? Math.max(0, Math.min(4, trigger.intData[0])) : 0);
        const src = trigger.intData.length > 1 ? trigger.intData[1] : 0;
        setUserSource(src);
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
                    <Flex alignItems="center" justifyContent="between" pointer onClick={ () => setIsTypeOpen(prev => !prev) }>
                        <Text bold>Elegir tipo:</Text>
                        { isTypeOpen ? <FaChevronUp className="fa-icon" /> : <FaChevronDown className="fa-icon" /> }
                    </Flex>
                    { isTypeOpen && (
                        <select
                            className="form-select form-select-sm"
                            value={ danceId }
                            onChange={ e => setDanceId(Number(e.target.value)) }
                        >
                            { DANCE_OPTIONS.map(opt => (
                                <option key={ opt.value } value={ opt.value }>{ opt.label }</option>
                            )) }
                        </select>
                    ) }
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
