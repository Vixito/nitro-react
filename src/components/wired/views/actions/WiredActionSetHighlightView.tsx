import { FC, useEffect, useState } from 'react';
import { FaArrowLeft, FaArrowRight, FaChair, FaUser } from 'react-icons/fa';
import { WiredFurniType } from '../../../../api';
import { Button, Column, Flex, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredActionBaseView } from './WiredActionBaseView';
import { WIRED_FURNI_SOURCE_LABELS, WIRED_FURNI_SOURCE_SELECTED, WIRED_FURNI_SOURCE_SELECTOR, WIRED_FURNI_SOURCE_SIGNAL, WIRED_FURNI_SOURCE_TRIGGERING } from '../WiredFurniSelectorView';

const HIGHLIGHT_COLORS: string[] = [
    '#ffffff', '#ffe01b', '#ffaa00', '#ff7a00', '#ff4d2e', '#ff1e27', '#ff2668', '#ff4fa8', '#e02be0', '#a64dff',
    '#7a4dff', '#4d70ff', '#2696ff', '#1ec8ff', '#1ee8e8', '#1ec89a', '#1eb85c', '#46d626', '#98e024', '#ffa6c9',
    '#c0884a'
];

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

export const WiredActionSetHighlightView: FC<{}> = props =>
{
    const [ whoSees, setWhoSees ] = useState<number>(0);
    const [ highlightType, setHighlightType ] = useState<number>(0);
    const [ intensity, setIntensity ] = useState<number>(0);
    const [ colorIndex, setColorIndex ] = useState<number>(0);
    const [ animation, setAnimation ] = useState<number>(0);
    const [ easing, setEasing ] = useState<number>(0);
    const [ targetType, setTargetType ] = useState<number>(0);
    const [ userSource, setUserSource ] = useState<number>(0);
    const { trigger = null, furniIds = [], furniSource = 0, setFurniSource = null, setIntParams = null } = useWired();

    const save = () => setIntParams([ whoSees, highlightType, intensity, colorIndex, animation, easing, targetType, userSource ]);

    useEffect(() =>
    {
        if(!trigger || !trigger.intData) return;
        const ints = trigger.intData;
        setWhoSees(ints.length > 0 ? ints[0] : 0);
        setHighlightType(ints.length > 1 ? ints[1] : 0);
        setIntensity(ints.length > 2 ? ints[2] : 0);
        setColorIndex(ints.length > 3 ? Math.max(0, Math.min(HIGHLIGHT_COLORS.length - 1, ints[3])) : 0);
        setAnimation(ints.length > 4 ? ints[4] : 0);
        setEasing(ints.length > 5 ? ints[5] : 0);
        setTargetType(ints.length > 6 ? ints[6] : 0);
        setUserSource(ints.length > 7 ? ints[7] : 0);
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
                    <Flex gap={ 1 }>
                        <Button size="sm" variant={ targetType === 0 ? 'warning' : 'secondary' } title="Furnis" onClick={ () => setTargetType(0) }>
                            <FaChair className="fa-icon" />
                        </Button>
                        <Button size="sm" variant={ targetType === 1 ? 'warning' : 'secondary' } title="Usuarios" onClick={ () => setTargetType(1) }>
                            <FaUser className="fa-icon" />
                        </Button>
                    </Flex>
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
                    <select className="form-select form-select-sm" value={ whoSees } onChange={ e => setWhoSees(Number(e.target.value)) }>
                        <option value={ 0 }>Usuarios seleccionados</option>
                        <option value={ 1 }>Todos los usuarios</option>
                    </select>
                </Column>
                <Column gap={ 1 }>
                    <Text bold>Tipo de resaltado:</Text>
                    <select className="form-select form-select-sm" value={ highlightType } onChange={ e => setHighlightType(Number(e.target.value)) }>
                        <option value={ 0 }>Contorno</option>
                        <option value={ 1 }>Relleno</option>
                        <option value={ 2 }>Brillo</option>
                    </select>
                </Column>
                <Column gap={ 1 }>
                    <Text bold>Intensidad:</Text>
                    <select className="form-select form-select-sm" value={ intensity } onChange={ e => setIntensity(Number(e.target.value)) }>
                        <option value={ 0 }>Desactivado</option>
                        <option value={ 1 }>Baja</option>
                        <option value={ 2 }>Media</option>
                        <option value={ 3 }>Alta</option>
                    </select>
                </Column>
                <Column gap={ 1 }>
                    <Text bold>Color de resaltado:</Text>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 18px)', gap: '4px' }}>
                        { HIGHLIGHT_COLORS.map((hex, idx) => (
                            <button
                                key={ idx }
                                type="button"
                                onClick={ () => setColorIndex(idx) }
                                style={{
                                    width: 18,
                                    height: 18,
                                    backgroundColor: hex,
                                    border: colorIndex === idx ? '2px solid #000' : '1px solid #333',
                                    boxShadow: colorIndex === idx ? '0 0 0 1px #fff' : 'none',
                                    padding: 0,
                                    cursor: 'pointer'
                                }}
                                title={ hex }
                            />
                        )) }
                    </div>
                </Column>
                <Column gap={ 1 }>
                    <Text bold>Animación:</Text>
                    <select className="form-select form-select-sm" value={ animation } onChange={ e => setAnimation(Number(e.target.value)) }>
                        <option value={ 0 }>Constante</option>
                        <option value={ 1 }>Parpadeo</option>
                        <option value={ 2 }>Pulso</option>
                    </select>
                </Column>
                <Column gap={ 1 }>
                    <Text bold>Función de suavizado:</Text>
                    <select className="form-select form-select-sm" value={ easing } onChange={ e => setEasing(Number(e.target.value)) }>
                        <option value={ 0 }>Instantáneo</option>
                        <option value={ 1 }>Suave</option>
                    </select>
                </Column>
            </Column>
        </WiredActionBaseView>
    );
}
