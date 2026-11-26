import { FC, useEffect, useState } from 'react';
import { FaArrowLeft, FaArrowRight, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import ReactSlider from 'react-slider';
import { WiredFurniType } from '../../../../api';
import { Button, Column, Flex, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredActionBaseView } from './WiredActionBaseView';

const TEAM_COLORS: { value: number; label: string; hex: string }[] = [
    { value: 0, label: 'Rojo', hex: '#d94436' },
    { value: 1, label: 'Verde', hex: '#7cb342' },
    { value: 2, label: 'Azul', hex: '#4db6ac' },
    { value: 3, label: 'Amarillo', hex: '#f7df94' }
];

export const WiredActionMatchCounterView: FC<{}> = props =>
{
    const [ useGroupMembers, setUseGroupMembers ] = useState<number>(0);
    const [ teamAName, setTeamAName ] = useState<string>('');
    const [ teamAColor, setTeamAColor ] = useState<number>(0);
    const [ teamBName, setTeamBName ] = useState<string>('');
    const [ teamBColor, setTeamBColor ] = useState<number>(1);
    const [ durationSeconds, setDurationSeconds ] = useState<number>(60);
    const [ onFinishMode, setOnFinishMode ] = useState<number>(0);
    const [ hideAfterSeconds, setHideAfterSeconds ] = useState<number>(0);

    const [ openTeamA, setOpenTeamA ] = useState<boolean>(true);
    const [ openTeamB, setOpenTeamB ] = useState<boolean>(true);
    const [ openDuration, setOpenDuration ] = useState<boolean>(true);
    const [ openFinish, setOpenFinish ] = useState<boolean>(true);

    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();

    const save = () =>
    {
        setIntParams([ useGroupMembers, teamAColor, teamBColor, durationSeconds, onFinishMode, hideAfterSeconds ]);
        setStringParam(`${ teamAName }\t${ teamBName }`);
    };

    useEffect(() =>
    {
        if(!trigger) return;

        const ints = trigger.intData || [];
        setUseGroupMembers((ints.length > 0 && ints[0] === 1) ? 1 : 0);
        setTeamAColor((ints.length > 1) ? Math.max(0, Math.min(3, ints[1])) : 0);
        setTeamBColor((ints.length > 2) ? Math.max(0, Math.min(3, ints[2])) : 1);
        setDurationSeconds((ints.length > 3) ? Math.max(1, Math.min(600, ints[3])) : 60);
        setOnFinishMode((ints.length > 4) ? Math.max(0, Math.min(2, ints[4])) : 0);
        setHideAfterSeconds((ints.length > 5) ? Math.max(0, Math.min(600, ints[5])) : 0);

        const parts = (trigger.stringData || '').split('\t');
        setTeamAName(parts[0] || '');
        setTeamBName(parts[1] || '');
    }, [ trigger ]);

    const mins = Math.floor(durationSeconds / 60).toString().padStart(2, '0');
    const secs = (durationSeconds % 60).toString().padStart(2, '0');

    return (
        <WiredActionBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_BY_ID } hasSpecialInput={ true } save={ save }>
            <Column gap={ 2 }>
                <Flex alignItems="center" gap={ 1 }>
                    <input
                        className="form-check-input"
                        type="checkbox"
                        id="mcUseGroups"
                        checked={ !!useGroupMembers }
                        onChange={ e => setUseGroupMembers(e.target.checked ? 1 : 0) }
                    />
                    <Text pointer onClick={ () => setUseGroupMembers(prev => prev ? 0 : 1) }>
                        Utilizar grupos de miembros
                    </Text>
                </Flex>

                <hr className="m-0 bg-dark" />

                <Column gap={ 1 }>
                    <Flex alignItems="center" justifyContent="between" pointer onClick={ () => setOpenTeamA(prev => !prev) }>
                        <Text bold>Equipo A</Text>
                        { openTeamA ? <FaChevronUp className="fa-icon" /> : <FaChevronDown className="fa-icon" /> }
                    </Flex>
                    { openTeamA && (
                        <Column gap={ 1 }>
                            <Text small>Nombre del equipo</Text>
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                maxLength={ 40 }
                                value={ teamAName }
                                onChange={ e => setTeamAName(e.target.value) }
                            />
                            <Text small>Color</Text>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                                { TEAM_COLORS.map(c => (
                                    <Flex key={ `a_${ c.value }` } alignItems="center" gap={ 1 }>
                                        <input
                                            className="form-check-input"
                                            type="radio"
                                            name="mcTeamAColor"
                                            checked={ teamAColor === c.value }
                                            onChange={ () => setTeamAColor(c.value) }
                                        />
                                        <span style={{ display: 'inline-block', width: 10, height: 10, backgroundColor: c.hex, border: '1px solid #000' }} />
                                        <Text small pointer onClick={ () => setTeamAColor(c.value) }>{ c.label }</Text>
                                    </Flex>
                                )) }
                            </div>
                        </Column>
                    ) }
                </Column>

                <hr className="m-0 bg-dark" />

                <Column gap={ 1 }>
                    <Flex alignItems="center" justifyContent="between" pointer onClick={ () => setOpenTeamB(prev => !prev) }>
                        <Text bold>Equipo B</Text>
                        { openTeamB ? <FaChevronUp className="fa-icon" /> : <FaChevronDown className="fa-icon" /> }
                    </Flex>
                    { openTeamB && (
                        <Column gap={ 1 }>
                            <Text small>Nombre del equipo</Text>
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                maxLength={ 40 }
                                value={ teamBName }
                                onChange={ e => setTeamBName(e.target.value) }
                            />
                            <Text small>Color</Text>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                                { TEAM_COLORS.map(c => (
                                    <Flex key={ `b_${ c.value }` } alignItems="center" gap={ 1 }>
                                        <input
                                            className="form-check-input"
                                            type="radio"
                                            name="mcTeamBColor"
                                            checked={ teamBColor === c.value }
                                            onChange={ () => setTeamBColor(c.value) }
                                        />
                                        <span style={{ display: 'inline-block', width: 10, height: 10, backgroundColor: c.hex, border: '1px solid #000' }} />
                                        <Text small pointer onClick={ () => setTeamBColor(c.value) }>{ c.label }</Text>
                                    </Flex>
                                )) }
                            </div>
                        </Column>
                    ) }
                </Column>

                <hr className="m-0 bg-dark" />

                <Column gap={ 1 }>
                    <Flex alignItems="center" justifyContent="between" pointer onClick={ () => setOpenDuration(prev => !prev) }>
                        <Text bold>El partido durará { mins }:{ secs } minutos</Text>
                        { openDuration ? <FaChevronUp className="fa-icon" /> : <FaChevronDown className="fa-icon" /> }
                    </Flex>
                    { openDuration && (
                        <Flex alignItems="center" gap={ 2 }>
                            <Button
                                size="sm"
                                variant="secondary"
                                disabled={ durationSeconds <= 1 }
                                onClick={ () => setDurationSeconds(prev => Math.max(1, prev - 1)) }
                            >
                                <FaArrowLeft className="fa-icon" />
                            </Button>
                            <div className="flex-grow-1">
                                <ReactSlider
                                    className="nitro-slider"
                                    min={ 1 }
                                    max={ 600 }
                                    value={ durationSeconds }
                                    onChange={ value => setDurationSeconds(Number(value)) }
                                />
                            </div>
                            <Button
                                size="sm"
                                variant="secondary"
                                disabled={ durationSeconds >= 600 }
                                onClick={ () => setDurationSeconds(prev => Math.min(600, prev + 1)) }
                            >
                                <FaArrowRight className="fa-icon" />
                            </Button>
                        </Flex>
                    ) }
                </Column>

                <hr className="m-0 bg-dark" />

                <Column gap={ 1 }>
                    <Flex alignItems="center" justifyContent="between" pointer onClick={ () => setOpenFinish(prev => !prev) }>
                        <Text bold>Al finalizar el tiempo</Text>
                        { openFinish ? <FaChevronUp className="fa-icon" /> : <FaChevronDown className="fa-icon" /> }
                    </Flex>
                    { openFinish && (
                        <Column gap={ 1 }>
                            <Flex alignItems="center" gap={ 1 }>
                                <input className="form-check-input" type="radio" name="mcFinish" checked={ onFinishMode === 0 } onChange={ () => setOnFinishMode(0) } />
                                <Text small pointer onClick={ () => setOnFinishMode(0) }>No hacer nada</Text>
                            </Flex>
                            <Flex alignItems="center" gap={ 1 }>
                                <input className="form-check-input" type="radio" name="mcFinish" checked={ onFinishMode === 1 } onChange={ () => setOnFinishMode(1) } />
                                <Text small pointer onClick={ () => setOnFinishMode(1) }>Ocultar</Text>
                            </Flex>
                            <Flex alignItems="center" gap={ 1 }>
                                <input className="form-check-input" type="radio" name="mcFinish" checked={ onFinishMode === 2 } onChange={ () => setOnFinishMode(2) } />
                                <Text small pointer onClick={ () => setOnFinishMode(2) }>Ocultar después de</Text>
                                <input
                                    type="number"
                                    min={ 0 }
                                    max={ 600 }
                                    className="form-control form-control-sm"
                                    style={{ width: '58px' }}
                                    value={ hideAfterSeconds }
                                    onChange={ e => setHideAfterSeconds(Math.max(0, Math.min(600, Number(e.target.value) || 0))) }
                                />
                                <Text small>segundos</Text>
                            </Flex>
                        </Column>
                    ) }
                </Column>
            </Column>
        </WiredActionBaseView>
    );
}
