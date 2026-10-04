import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Column, Flex, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredStepperSelect } from '../WiredStepperSelect';
import { WiredVariableSelect } from '../WiredVariableSelect';
import { WiredActionBaseView } from './WiredActionBaseView';

const TARGET_OPTIONS = [
    'Utilizar el usuario desencadenante',
    'Utilizar usuarios de Selector',
    'Utilizar el furni desencadenante',
    'Utilizar furnis de Selector'
];

export const WiredActionGiveVariableView: FC<{}> = props =>
{
    const [ variableName, setVariableName ] = useState('Punto De Control');
    const [ scope, setScope ] = useState<number>(1); // 2: Furni, 1: User, 3: Context
    const [ initialValue, setInitialValue ] = useState<number>(0);
    const [ hasValue, setHasValue ] = useState<number>(1);
    const [ overwrite, setOverwrite ] = useState<boolean>(true);
    const [ isPermanent, setIsPermanent ] = useState<number>(1);
    const [ targetIndex, setTargetIndex ] = useState<number>(0);
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();

    const save = () =>
    {
        setStringParam(variableName.trim());
        setIntParams([ scope, initialValue, hasValue, overwrite ? 1 : 0, isPermanent, targetIndex ]);
    };

    useEffect(() =>
    {
        if(!trigger) return;

        setVariableName(trigger.stringData || 'Punto De Control');

        if(trigger.intData && trigger.intData.length >= 5)
        {
            setScope(trigger.intData[0]);
            setInitialValue(trigger.intData[1]);
            setHasValue(trigger.intData[2]);
            setOverwrite(trigger.intData[3] === 1);
            setIsPermanent(trigger.intData[4]);
            if(trigger.intData.length >= 6) setTargetIndex(trigger.intData[5] % TARGET_OPTIONS.length);
        }
        else
        {
            setScope(1);
            setInitialValue(0);
            setHasValue(1);
            setOverwrite(true);
            setIsPermanent(1);
        }
    }, [ trigger ]);

    return (
        <WiredActionBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_NONE } hasSpecialInput={ true } save={ save }>
            <WiredVariableSelect
                label="Elegir variable:"
                value={ variableName }
                scope={ scope }
                onScopeChange={ setScope }
                availableScopes={ [ 2, 1, 3 ] }
                onChange={ (val, scp) => { setVariableName(val); if(scp !== undefined) setScope(scp); } }
                activeColor="green"
            />

            <Flex alignItems="center" gap={ 1 }>
                <input
                    className="form-check-input"
                    type="checkbox"
                    id="giveVarOverwrite"
                    checked={ overwrite }
                    onChange={ e => setOverwrite(e.target.checked) }
                />
                <Text small>Sobreescribir la variable existente</Text>
            </Flex>

            <Column gap={ 1 }>
                <Text bold>Opciones de la variable:</Text>
                <Flex alignItems="center" gap={ 2 }>
                    <Text small>Valor inicial:</Text>
                    <input
                        type="number"
                        className="form-control form-control-sm"
                        style={{ width: '90px' }}
                        value={ initialValue }
                        onChange={ event => setInitialValue(parseInt(event.target.value) || 0) }
                    />
                </Flex>
            </Column>

            <WiredStepperSelect
                label="Variable de destino:"
                options={ TARGET_OPTIONS }
                value={ targetIndex }
                onChange={ setTargetIndex }
            />
        </WiredActionBaseView>
    );
};
