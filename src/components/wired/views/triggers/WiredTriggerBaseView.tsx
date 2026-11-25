import { FC, PropsWithChildren, ReactNode } from 'react';
import { WiredFurniType } from '../../../../api';
import { WiredBaseView } from '../WiredBaseView';

export interface WiredTriggerBaseViewProps
{
    hasSpecialInput: boolean;
    requiresFurni: number;
    save: () => void;
    allowedFurniSources?: number[];
    advancedChildren?: ReactNode;
}

export const WiredTriggerBaseView: FC<PropsWithChildren<WiredTriggerBaseViewProps>> = props =>
{
    const {
        requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_NONE,
        save = null,
        hasSpecialInput = false,
        allowedFurniSources = undefined,
        advancedChildren = null,
        children = null
    } = props;
    
    const onSave = () => (save && save());

    return (
        <WiredBaseView
            wiredType="trigger"
            requiresFurni={ requiresFurni }
            hasSpecialInput={ hasSpecialInput }
            save={ onSave }
            allowedFurniSources={ allowedFurniSources }
            advancedChildren={ advancedChildren }
        >
            { children }
        </WiredBaseView>
    );
}
