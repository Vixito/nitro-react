import { FC, useEffect, useState } from 'react';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import IconScopeFurni from '../../../../assets/images/wired/icon_scope_furni.png';
import IconScopeUser from '../../../../assets/images/wired/icon_scope_user.png';
import { WiredFurniType } from '../../../../api';
import { Button, Column, Flex, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredActionBaseView } from './WiredActionBaseView';
import { WIRED_FURNI_SOURCE_LABELS, WIRED_FURNI_SOURCE_SELECTED, WIRED_FURNI_SOURCE_SELECTOR, WIRED_FURNI_SOURCE_SIGNAL, WIRED_FURNI_SOURCE_TRIGGERING } from '../WiredFurniSelectorView';

const FURNI_SOURCES = [
    WIRED_FURNI_SOURCE_SELECTED,
    WIRED_FURNI_SOURCE_TRIGGERING,
    WIRED_FURNI_SOURCE_SELECTOR,
    WIRED_FURNI_SOURCE_SIGNAL
];

const USER_SOURCES: { code: number; label: string }[] = [
    { code: 0, label: 'Utilizar el usuario desencadenante' },
    { code: 200, label: 'Usar usuarios del Selector' },
    { code: 201, label: 'Usar usuarios de la Señal' },
    { code: 900, label: 'Usar todos los usuarios de la sala' }
];

export const WiredActionSetVisibilityView: FC<{}> = props =>
{
    const [ whoSees, setWhoSees ] = useState<number>(0);
    const [ visibility, setVisibility ] = useState<number>(0);
    const [ clickThrough, setClickThrough ] = useState<number>(0);
    const [ easing, setEasing ] = useState<number>(0);
    const [ targetType, setTargetType ] = useState<number>(0);
    const [ userSource, setUserSource ] = useState<number>(0);
    const { trigger = null, furniIds = [], furniSource = 0, setFurniSource = null, setIntParams = null } = useWired();

    const save = () => setIntParams([ whoSees, visibility, clickThrough, easing, targetType, userSource ]);

    useEffect(() =>
    {
        if(!trigger || !trigger.intData) return;

        setWhoSees((trigger.intData.length > 0 && trigger.intData[0] === 1) ? 1 : 0);
        setVisibility((trigger.intData.length > 1 && trigger.intData[1] === 1) ? 1 : 0);
        setClickThrough((trigger.intData.length > 2 && trigger.intData[2] === 1) ? 1 : 0);
        setEasing((trigger.intData.length > 3 && trigger.intData[3] === 1) ? 1 : 0);
        setTargetType((trigger.intData.length > 4 && trigger.intData[4] === 1) ? 1 : 0);
        setUserSource((trigger.intData.length > 5) ? trigger.intData[5] : 0);
    }, [ trigger ]);

    const furniIdx = Math.max(0, FURNI_SOURCES.indexOf(furniSource));
    const userIdx = Math.max(0, USER_SOURCES.findIndex(u => u.code === userSource));

    const cycleFurniSource = (delta: number) =>
    {
        if(!setFurniSource) return;
        const next = (furniIdx + delta + FURNI_SOURCES.length) % FURNI_SOURCES.length;
        setFurniSource(FURNI_SOURCES[next]);
    };

    const cycleUserSource = (delta: number) =>
    {
        const next = (userIdx + delta + USER_SOURCES.length) % USER_SOURCES.length;
        setUserSource(USER_SOURCES[next].code);
    };

    const advancedChildren = (
        <Column gap={ 2 }>
            <Column gap={ 1 }>
                <Flex alignItems="center" justifyContent="between">
                    <Text bold>Seleccionar objetivo:</Text>
                    <div className="wired-scope-selector">
                        <button
                            type="button"
                            className={ `scope-btn ${ targetType === 0 ? 'active' : '' }` }
                            title="Furnis"
                            onClick={ () => setTargetType(0) }
                        >
                            <img src={ IconScopeFurni } alt="Furnis" className="scope-icon-img" />
                        </button>
                        <button
                            type="button"
                            className={ `scope-btn ${ targetType === 1 ? 'active' : '' }` }
                            title="Usuarios"
                            onClick={ () => setTargetType(1) }
                        >
                            <img src={ IconScopeUser } alt="Usuarios" className="scope-icon-img" />
                        </button>
                    </div>
                </Flex>
                <Flex alignItems="center" justifyContent="between" gap={ 2 }>
                    <Button size="sm" variant="secondary" onClick={ () => cycleFurniSource(-1) }>
                        <FaArrowLeft className="fa-icon" />
                    </Button>
                    <Text bold center className="flex-grow-1">
                        { WIRED_FURNI_SOURCE_LABELS[FURNI_SOURCES[furniIdx]] }
                        { furniSource === WIRED_FURNI_SOURCE_SELECTED && trigger ? ` [${ furniIds.length }/${ trigger.maximumItemSelectionCount }]` : '' }
                    </Text>
                    <Button size="sm" variant="secondary" onClick={ () => cycleFurniSource(1) }>
                        <FaArrowRight className="fa-icon" />
                    </Button>
                </Flex>
            </Column>
            <hr className="m-0 bg-dark" />
            <Column gap={ 1 }>
                <Text bold>Visible para:</Text>
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
        </Column>
    );

    return (
        <WiredActionBaseView
            requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_BY_ID }
            hasSpecialInput={ true }
            save={ save }
            allowedFurniSources={ [] }
            advancedChildren={ advancedChildren }
        >
            <Column gap={ 2 }>
                <Column gap={ 1 }>
                    <Text bold>¿Quién debe ver el efecto?</Text>
                    <select
                        className="form-select form-select-sm"
                        value={ whoSees }
                        onChange={ e => setWhoSees(Number(e.target.value)) }
                    >
                        <option value={ 0 }>Usuarios seleccionados</option>
                        <option value={ 1 }>Todos los usuarios</option>
                    </select>
                </Column>
                <Column gap={ 1 }>
                    <Text bold>Visibilidad:</Text>
                    <Flex alignItems="center" gap={ 1 }>
                        <input
                            className="form-check-input"
                            type="radio"
                            name="visMode"
                            id="visVisible"
                            checked={ visibility === 0 }
                            onChange={ () => setVisibility(0) }
                        />
                        <Text pointer onClick={ () => setVisibility(0) }>Visible</Text>
                    </Flex>
                    <Flex alignItems="center" gap={ 1 }>
                        <input
                            className="form-check-input"
                            type="radio"
                            name="visMode"
                            id="visInvisible"
                            checked={ visibility === 1 }
                            onChange={ () => setVisibility(1) }
                        />
                        <Text pointer onClick={ () => setVisibility(1) }>Invisible</Text>
                    </Flex>
                </Column>
                <Column gap={ 1 }>
                    <Text bold>Comportamiento de clic:</Text>
                    <Flex alignItems="center" gap={ 1 }>
                        <input
                            className="form-check-input"
                            type="checkbox"
                            id="visClickThrough"
                            checked={ !!clickThrough }
                            onChange={ e => setClickThrough(e.target.checked ? 1 : 0) }
                        />
                        <Text pointer onClick={ () => setClickThrough(prev => prev ? 0 : 1) }>
                            Permitir que los clics atraviesen el objetivo
                        </Text>
                    </Flex>
                </Column>
                <Column gap={ 1 }>
                    <Text bold>Función de suavizado:</Text>
                    <select
                        className="form-select form-select-sm"
                        value={ easing }
                        onChange={ e => setEasing(Number(e.target.value)) }
                    >
                        <option value={ 0 }>Instantáneo</option>
                        <option value={ 1 }>Suave</option>
                    </select>
                </Column>
            </Column>
        </WiredActionBaseView>
    );
}
