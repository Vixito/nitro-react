import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Column, Flex, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionResetHighscoreView: FC<{}> = props =>
{
    const [ confirmReset, setConfirmReset ] = useState<number>(0);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([ confirmReset ]);

    useEffect(() =>
    {
        if(!trigger || !trigger.intData) return;

        setConfirmReset((trigger.intData.length > 0 && trigger.intData[0] === 1) ? 1 : 0);
    }, [ trigger ]);

    return (
        <WiredActionBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_NONE } hasSpecialInput={ true } save={ save }>
            <Column gap={ 2 }>
                <Text bold>Opciones de reseteo:</Text>
                <Flex alignItems="center" gap={ 1 }>
                    <input
                        className="form-check-input"
                        type="checkbox"
                        id="resetHighscoreConfirm"
                        checked={ !!confirmReset }
                        onChange={ e => setConfirmReset(e.target.checked ? 1 : 0) }
                    />
                    <Text pointer onClick={ () => setConfirmReset(prev => prev ? 0 : 1) }>
                        Reiniciar la clasificación al ejecutarse
                    </Text>
                </Flex>
                <div
                    className="p-2 rounded text-center"
                    style={{ backgroundColor: '#b5b8bc', color: '#111', fontSize: '12px', lineHeight: '1.35' }}
                >
                    Ten cuidado. Cuando actives la opción y guardes la configuración, cualquier ejecución reiniciará la clasificación activa en la sala.
                </div>
            </Column>
        </WiredActionBaseView>
    );
}
