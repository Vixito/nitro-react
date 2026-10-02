import { ConditionDefinition, ILinkEventTracker, Triggerable, TriggerDefinition, UpdateActionMessageComposer, UpdateConditionMessageComposer, UpdateTriggerMessageComposer, WiredActionDefinition, WiredFurniActionEvent, WiredFurniConditionEvent, WiredFurniTriggerEvent, WiredSaveSuccessEvent } from '@nitrots/nitro-renderer';
import { useCallback, useEffect, useState } from 'react';
import { useBetween } from 'use-between';
import { AddEventLinkTracker, IsOwnerOfFloorFurniture, LocalizeText, RemoveLinkEventTracker, SendMessageComposer, WiredFurniType, WiredSelectionVisualizer } from '../../api';
import { useMessageEvent } from '../events';
import { useNotification } from '../notification';

const useWiredState = () =>
{
    const [ trigger, setTrigger ] = useState<Triggerable>(null);
    const [ intParams, setIntParams ] = useState<number[]>([]);
    const [ stringParam, setStringParam ] = useState<string>('');
    const [ furniIds, setFurniIds ] = useState<number[]>([]);
    const [ actionDelay, setActionDelay ] = useState<number>(0);
    const [ allowsFurni, setAllowsFurni ] = useState<number>(WiredFurniType.STUFF_SELECTION_OPTION_NONE);
    const [ isWiredCreatorToolsVisible, setIsWiredCreatorToolsVisible ] = useState<boolean>(false);
    const { showConfirm = null } = useNotification();

    const saveWired = useCallback(() =>
    {
        const save = (trigger: Triggerable) =>
        {
            if(!trigger) return;

            if(trigger instanceof WiredActionDefinition)
            {
                SendMessageComposer(new UpdateActionMessageComposer(trigger.id, intParams, stringParam, furniIds, actionDelay, trigger.stuffTypeSelectionCode));
            }

            else if(trigger instanceof TriggerDefinition)
            {
                SendMessageComposer(new UpdateTriggerMessageComposer(trigger.id, intParams, stringParam, furniIds, trigger.stuffTypeSelectionCode));
            }

            else if(trigger instanceof ConditionDefinition)
            {
                SendMessageComposer(new UpdateConditionMessageComposer(trigger.id, intParams, stringParam, furniIds, trigger.stuffTypeSelectionCode));
            }
        }

        if(!IsOwnerOfFloorFurniture(trigger.id))
        {
            showConfirm(LocalizeText('wiredfurni.nonowner.change.confirm.body'), () =>
            {
                save(trigger)
            }, null, null, null, LocalizeText('wiredfurni.nonowner.change.confirm.title'));
        }
        else
        {
            save(trigger);
        }
    }, [ trigger, intParams, stringParam, furniIds, actionDelay, showConfirm ]);


    const selectObjectForWired = (objectId: number, category: number) =>
    {
        if(!trigger || !allowsFurni) return;

        if(objectId <= 0) return;

        setFurniIds(prevValue =>
        {
            const newFurniIds = [ ...prevValue ];

            const index = prevValue.indexOf(objectId);

            if(index >= 0)
            {
                newFurniIds.splice(index, 1);

                WiredSelectionVisualizer.hide(objectId);
            }

            else if(newFurniIds.length < trigger.maximumItemSelectionCount)
            {
                newFurniIds.push(objectId);

                WiredSelectionVisualizer.show(objectId);
            }

            return newFurniIds;
        });
    }

    useMessageEvent<WiredSaveSuccessEvent>(WiredSaveSuccessEvent, event =>
    {
        const parser = event.getParser();

        setTrigger(null);
    });

    useMessageEvent<WiredFurniActionEvent>(WiredFurniActionEvent, event =>
    {
        const parser = event.getParser();

        setTrigger(parser.definition);
    });

    useMessageEvent<WiredFurniConditionEvent>(WiredFurniConditionEvent, event =>
    {
        const parser = event.getParser();

        setTrigger(parser.definition);
    });

    useMessageEvent<WiredFurniTriggerEvent>(WiredFurniTriggerEvent, event =>
    {
        const parser = event.getParser();

        setTrigger(parser.definition);
    });

    useEffect(() =>
    {
        if(!trigger) return;

        return () =>
        {
            setIntParams([]);
            setStringParam('');
            setActionDelay(0);
            setFurniIds(prevValue =>
            {
                if(prevValue && prevValue.length) WiredSelectionVisualizer.clearSelectionShaderFromFurni(prevValue);
    
                return [];
            });
            setAllowsFurni(WiredFurniType.STUFF_SELECTION_OPTION_NONE);
        }
    }, [ trigger ]);

    useEffect(() =>
    {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) =>
            {
                const parts = url.split('/');
                if(parts.length < 2) return;

                if(parts[1] === 'creator-tools' || parts[1] === 'tools')
                {
                    setIsWiredCreatorToolsVisible(prev => !prev);
                }
            },
            eventUrlPrefix: 'wired/'
        };

        AddEventLinkTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    return { 
        trigger, setTrigger, 
        intParams, setIntParams, 
        stringParam, setStringParam, 
        furniIds, setFurniIds, 
        actionDelay, setActionDelay, 
        setAllowsFurni, 
        saveWired, 
        selectObjectForWired,
        isWiredCreatorToolsVisible, setIsWiredCreatorToolsVisible
    };
}

export const useWired = () => useBetween(useWiredState);
