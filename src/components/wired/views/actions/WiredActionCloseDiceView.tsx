import { FC } from 'react';
import { WiredFurniType } from '../../../../api';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionCloseDiceView: FC<{}> = props =>
{
    return <WiredActionBaseView requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_BY_ID } hasSpecialInput={ false } save={ null } />;
}
