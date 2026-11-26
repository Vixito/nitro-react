import { FC } from 'react';
import { WiredFurniType } from '../../../../api';
import { WIRED_FURNI_SOURCE_SELECTED, WIRED_FURNI_SOURCE_SELECTOR, WIRED_FURNI_SOURCE_SIGNAL, WIRED_FURNI_SOURCE_TRIGGERING } from '../WiredFurniSelectorView';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

const SIGNAL_SOURCES = [
    WIRED_FURNI_SOURCE_SELECTED,
    WIRED_FURNI_SOURCE_TRIGGERING,
    WIRED_FURNI_SOURCE_SELECTOR,
    WIRED_FURNI_SOURCE_SIGNAL
];

export const WiredTriggerReceiveSignalView: FC<{}> = props =>
{
    return (
        <WiredTriggerBaseView
            requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_BY_ID }
            hasSpecialInput={ false }
            save={ null }
            allowedFurniSources={ SIGNAL_SOURCES }
        />
    );
}
