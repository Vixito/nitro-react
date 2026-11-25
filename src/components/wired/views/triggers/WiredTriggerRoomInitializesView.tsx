import { FC, useState } from 'react';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { WiredFurniType } from '../../../../api';
import { Column, Flex, Text } from '../../../../common';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

export const WiredTriggerRoomInitializesView: FC<{}> = props =>
{
    const [ isInfoOpen, setIsInfoOpen ] = useState<boolean>(true);

    return (
        <WiredTriggerBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_NONE } hasSpecialInput={ false } save={ null }>
            <Column gap={ 1 }>
                <Flex
                    alignItems="center"
                    justifyContent="between"
                    pointer
                    onClick={ () => setIsInfoOpen(prev => !prev) }
                >
                    <Text bold>Información de uso:</Text>
                    { isInfoOpen ? <FaChevronUp className="fa-icon" /> : <FaChevronDown className="fa-icon" /> }
                </Flex>
                { isInfoOpen && (
                    <Column gap={ 2 }>
                        <Text small>
                            Este WIRED solo se activa una vez cuando se inicia la sala, y es la primera en activarse.
                        </Text>
                        <Text small>
                            Una sala se inicia cuando alguien entra después de que haya estado vacía durante más de 30 segundos, o cuando se recarga (comando :unload).
                        </Text>
                        <Text small>
                            Una práctica Wired recomendable es restablecer todo el juego a su estado &quot;inicial&quot; cuando este WIRED se active, ya que la sala puede haberse &quot;cerrado&quot; en un estado inesperado, por ejemplo, por una pausa de mantenimiento en medio de una partida.
                        </Text>
                    </Column>
                ) }
            </Column>
        </WiredTriggerBaseView>
    );
}
