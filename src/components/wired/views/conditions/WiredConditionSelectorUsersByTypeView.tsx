import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Column, Flex, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredConditionBaseView } from './WiredConditionBaseView';

const USER_TYPES = [
    { id: 0, label: 'Todos los usuarios' },
    { id: 1, label: 'Solo usuarios (Habbten)' },
    { id: 2, label: 'Mascotas' },
    { id: 4, label: 'Bots' }
];

export const WiredConditionSelectorUsersByTypeView: FC<{}> = props =>
{
    const [ userType, setUserType ] = useState(1);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([ userType ]);

    useEffect(() =>
    {
        if(trigger && trigger.intData && trigger.intData.length > 0)
        {
            setUserType(trigger.intData[0]);
        }
        else
        {
            setUserType(1);
        }
    }, [ trigger ]);

    return (
        <WiredConditionBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_NONE } hasSpecialInput={ true } save={ save }>
            <Column gap={ 1 }>
                <Text bold>Escoge el tipo de usuario a seleccionar:</Text>
                { USER_TYPES.map(item => (
                    <Flex key={ item.id } gap={ 1 } alignItems="center">
                        <input
                            className="form-check-input"
                            type="radio"
                            name="wiredUserType"
                            id={ `wiredUserType_${ item.id }` }
                            checked={ userType === item.id }
                            onChange={ () => setUserType(item.id) } />
                        <label className="cursor-pointer mb-0" htmlFor={ `wiredUserType_${ item.id }` }>
                            <Text>{ item.label }</Text>
                        </label>
                    </Flex>
                )) }
            </Column>
        </WiredConditionBaseView>
    );
};
