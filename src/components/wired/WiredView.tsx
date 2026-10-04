import { ConditionDefinition, TriggerDefinition, WiredActionDefinition } from '@nitrots/nitro-renderer';
import { FC } from 'react';
import { GetSessionDataManager } from '../../api';
import { useWired } from '../../hooks';
import { WiredActionLayoutView } from './views/actions/WiredActionLayoutView';
import { WiredConditionLayoutView } from './views/conditions/WiredConditionLayoutView';
import { WiredTriggerLayoutView } from './views/triggers/WiredTriggerLayoutView';
import { WiredCreatorToolsView } from './views/creator-tools/WiredCreatorToolsView';
import { WiredVariableUserView } from './views/actions/WiredVariableUserView';
import { WiredVariableRoomView } from './views/actions/WiredVariableRoomView';

export const WiredView: FC<{}> = props =>
{
    const { trigger = null } = useWired();

    const renderWiredContent = () =>
    {
        if(!trigger) return null;

        if(trigger.spriteId)
        {
            const furniData = GetSessionDataManager().getFloorItemData(trigger.spriteId);
            const className = furniData?.className || '';
            if(className === 'wf_var_user') return <WiredVariableUserView />;
            if(className === 'wf_var_room') return <WiredVariableRoomView />;
        }

        if(trigger instanceof WiredActionDefinition) return WiredActionLayoutView(trigger.code);

        if(trigger instanceof TriggerDefinition) return WiredTriggerLayoutView(trigger.code);
        
        if(trigger instanceof ConditionDefinition) return WiredConditionLayoutView(trigger.code);
        
        return null;
    };

    return (
        <>
            { renderWiredContent() }
            <WiredCreatorToolsView />
        </>
    );
};
