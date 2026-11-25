import { FC, useEffect, useState } from 'react';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Column, Flex, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionSetFurniStateToView: FC<{}> = props =>
{
    const [ stateFlag, setStateFlag ] = useState(0);
    const [ directionFlag, setDirectionFlag ] = useState(0);
    const [ positionFlag, setPositionFlag ] = useState(0);
    const [ altitudeFlag, setAltitudeFlag ] = useState(0);
    const [ ignoreAvatarFlag, setIgnoreAvatarFlag ] = useState(0);
    const [ isCriteriaOpen, setIsCriteriaOpen ] = useState<boolean>(true);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([ stateFlag, directionFlag, positionFlag, altitudeFlag, ignoreAvatarFlag ]);

    useEffect(() =>
    {
        if(!trigger) return;

        setStateFlag(trigger.getBoolean(0) ? 1 : 0);
        setDirectionFlag(trigger.getBoolean(1) ? 1 : 0);
        setPositionFlag(trigger.getBoolean(2) ? 1 : 0);
        setAltitudeFlag(trigger.getBoolean(3) ? 1 : 0);
        setIgnoreAvatarFlag(trigger.getBoolean(4) ? 1 : 0);
    }, [ trigger ]);

    const advancedChildren = (
        <Column gap={ 1 }>
            <Text bold>Omitir colisiones de:</Text>
            <Flex alignItems="center" gap={ 1 }>
                <input
                    className="form-check-input"
                    type="checkbox"
                    id="ignoreAvatarFlag"
                    checked={ !!ignoreAvatarFlag }
                    onChange={ event => setIgnoreAvatarFlag(event.target.checked ? 1 : 0) }
                />
                <Text pointer onClick={ () => setIgnoreAvatarFlag(prev => prev ? 0 : 1) }>Avatares</Text>
            </Flex>
        </Column>
    );

    return (
        <WiredActionBaseView
            requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_BY_ID }
            hasSpecialInput={ true }
            save={ save }
            advancedChildren={ advancedChildren }
        >
            <Column gap={ 1 }>
                <Flex
                    alignItems="center"
                    justifyContent="between"
                    pointer
                    onClick={ () => setIsCriteriaOpen(prev => !prev) }
                >
                    <Text bold>{ LocalizeText('wiredfurni.params.conditions') }</Text>
                    { isCriteriaOpen ? <FaChevronUp className="fa-icon" /> : <FaChevronDown className="fa-icon" /> }
                </Flex>
                { isCriteriaOpen && (
                    <Column gap={ 1 }>
                        <Flex alignItems="center" gap={ 1 }>
                            <input className="form-check-input" type="checkbox" id="stateFlag" checked={ !!stateFlag } onChange={ event => setStateFlag(event.target.checked ? 1 : 0) } />
                            <Text pointer onClick={ () => setStateFlag(prev => prev ? 0 : 1) }>{ LocalizeText('wiredfurni.params.condition.state') }</Text>
                        </Flex>
                        <Flex alignItems="center" gap={ 1 }>
                            <input className="form-check-input" type="checkbox" id="directionFlag" checked={ !!directionFlag } onChange={ event => setDirectionFlag(event.target.checked ? 1 : 0) } />
                            <Text pointer onClick={ () => setDirectionFlag(prev => prev ? 0 : 1) }>{ LocalizeText('wiredfurni.params.condition.direction') }</Text>
                        </Flex>
                        <Flex alignItems="center" gap={ 1 }>
                            <input className="form-check-input" type="checkbox" id="positionFlag" checked={ !!positionFlag } onChange={ event => setPositionFlag(event.target.checked ? 1 : 0) } />
                            <Text pointer onClick={ () => setPositionFlag(prev => prev ? 0 : 1) }>{ LocalizeText('wiredfurni.params.condition.position') }</Text>
                        </Flex>
                        <Flex alignItems="center" gap={ 1 }>
                            <input className="form-check-input" type="checkbox" id="altitudeFlag" checked={ !!altitudeFlag } onChange={ event => setAltitudeFlag(event.target.checked ? 1 : 0) } />
                            <Text pointer onClick={ () => setAltitudeFlag(prev => prev ? 0 : 1) }>Altura actual</Text>
                        </Flex>
                    </Column>
                ) }
            </Column>
        </WiredActionBaseView>
    );
}
