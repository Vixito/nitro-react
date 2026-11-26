import { FC, useEffect, useState } from 'react';
import { FaArrowLeft, FaArrowRight, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { WiredFurniType } from '../../../../api';
import { Button, Column, Flex, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredActionBaseView } from './WiredActionBaseView';

const FREEZE_EFFECTS: { value: number; label: string }[] = [
    { value: 0, label: 'Sin efecto' },
    { value: 1, label: 'Wired Freeze' },
    { value: 2, label: 'Congelado' },
    { value: 3, label: 'Rayos X' },
    { value: 4, label: 'Pajaritos' },
    { value: 5, label: 'Trampa de arena' }
];

const USER_SOURCES: { code: number; label: string }[] = [
    { code: 0, label: 'Utilizar el usuario desencadenante' },
    { code: 200, label: 'Usar usuarios del Selector' },
    { code: 201, label: 'Usar usuarios de la Señal' }
];

export const WiredActionFreezeUserView: FC<{}> = props =>
{
    const [ effectType, setEffectType ] = useState<number>(1);
    const [ unfreezeOnTeleport, setUnfreezeOnTeleport ] = useState<number>(0);
    const [ userSource, setUserSource ] = useState<number>(0);
    const [ isEffectOpen, setIsEffectOpen ] = useState<boolean>(true);
    const [ isAdvancedOpen, setIsAdvancedOpen ] = useState<boolean>(false);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([ effectType, unfreezeOnTeleport, userSource ]);

    useEffect(() =>
    {
        if(!trigger || !trigger.intData) return;
        setEffectType(trigger.intData.length > 0 ? Math.max(0, Math.min(5, trigger.intData[0])) : 1);
        setUnfreezeOnTeleport((trigger.intData.length > 1 && trigger.intData[1] === 1) ? 1 : 0);
        const src = trigger.intData.length > 2 ? trigger.intData[2] : 0;
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
                    <Flex alignItems="center" justifyContent="between" pointer onClick={ () => setIsEffectOpen(prev => !prev) }>
                        <Text bold>Tipo de efecto:</Text>
                        { isEffectOpen ? <FaChevronUp className="fa-icon" /> : <FaChevronDown className="fa-icon" /> }
                    </Flex>
                    { isEffectOpen && (
                        <Column gap={ 2 }>
                            <select
                                className="form-select form-select-sm"
                                value={ effectType }
                                onChange={ e => setEffectType(Number(e.target.value)) }
                            >
                                { FREEZE_EFFECTS.map(opt => (
                                    <option key={ opt.value } value={ opt.value }>{ opt.label }</option>
                                )) }
                            </select>
                            <Flex alignItems="center" gap={ 1 }>
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id="freezeUnfreezeTp"
                                    checked={ !!unfreezeOnTeleport }
                                    onChange={ e => setUnfreezeOnTeleport(e.target.checked ? 1 : 0) }
                                />
                                <Text pointer onClick={ () => setUnfreezeOnTeleport(prev => prev ? 0 : 1) }>
                                    Descongelar al teletransportar
                                </Text>
                            </Flex>
                        </Column>
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
