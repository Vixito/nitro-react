import { FC } from 'react';
import { WiredFurniType } from '../../../../api';
import { Column, Text } from '../../../../common';
import { WiredConditionBaseView } from './WiredConditionBaseView';

export const WiredConditionSelectorFurniPicksView: FC<{ isArea?: boolean }> = ({ isArea = false }) =>
{
    return (
        <WiredConditionBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_BY_ID } hasSpecialInput={ false } save={ null }>
            <Column gap={ 1 }>
                <Text small variant="muted">
                    { isArea
                        ? 'Haz clic en las baldosas o furnis que delimitan el área deseada.'
                        : 'Haz clic en los furnis de la sala que deseas que formen parte de la selección.'
                    }
                </Text>
            </Column>
        </WiredConditionBaseView>
    );
};
