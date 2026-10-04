import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredStepperSelect } from '../WiredStepperSelect';
import { WiredVariableSelect } from '../WiredVariableSelect';
import { WiredActionBaseView } from './WiredActionBaseView';

const SOURCE_OPTIONS = [
    'Utilizar el usuario desencadenante',
    'Utilizar usuarios de Selector',
    'Utilizar el furni desencadenante',
    'Utilizar furnis de Selector'
];

export const WiredActionRemoveVariableView: FC<{}> = props =>
{
    const [ variableName, setVariableName ] = useState('Punto De Control');
    const [ scope, setScope ] = useState<number>(1); // 2: Furni, 1: User, 3: Context
    const [ sourceIndex, setSourceIndex ] = useState<number>(0);
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();

    const save = () =>
    {
        setStringParam(variableName.trim());
        setIntParams([ scope, sourceIndex ]);
    };

    useEffect(() =>
    {
        if(!trigger) return;

        setVariableName(trigger.stringData || 'Punto De Control');

        if(trigger.intData && trigger.intData.length >= 1)
        {
            setScope(trigger.intData[0]);
            if(trigger.intData.length >= 2) setSourceIndex(trigger.intData[1] % SOURCE_OPTIONS.length);
        }
        else
        {
            setScope(1);
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

            <WiredStepperSelect
                label="Fuente de la variable:"
                options={ SOURCE_OPTIONS }
                value={ sourceIndex }
                onChange={ setSourceIndex }
            />
        </WiredActionBaseView>
    );
};
