import { GroupSavePreferencesComposer } from '@nitrots/nitro-renderer';
import { Dispatch, FC, SetStateAction, useCallback, useEffect, useState } from 'react';
import { IGroupData, LocalizeText, SendMessageComposer } from '../../../../api';
import { Column, Flex, HorizontalRule, Text } from '../../../../common';

const STATES: string[] = [ 'regular', 'exclusive', 'private' ];

interface GroupTabSettingsViewProps
{
    groupData: IGroupData;
    setGroupData: Dispatch<SetStateAction<IGroupData>>;
    setCloseAction: Dispatch<SetStateAction<{ action: () => boolean }>>;
}

export const GroupTabSettingsView: FC<GroupTabSettingsViewProps> = props =>
{
    const { groupData = null, setGroupData = null, setCloseAction = null } = props;
    const [ groupState, setGroupState ] = useState<number>(groupData.groupState);
    const [ groupDecorate, setGroupDecorate ] = useState<boolean>(groupData.groupCanMembersDecorate);

    const saveSettings = useCallback(() =>
    {
        if(!groupData) return false;

        if((groupState === groupData.groupState) && (groupDecorate === groupData.groupCanMembersDecorate)) return true;

        if(groupData.groupId <= 0)
        {
            setGroupData(prevValue =>
            {
                const newValue = { ...prevValue };

                newValue.groupState = groupState;
                newValue.groupCanMembersDecorate = groupDecorate;

                return newValue;
            });

            return true;
        }

        SendMessageComposer(new GroupSavePreferencesComposer(groupData.groupId, groupState, groupDecorate ? 0 : 1));

        return true;
    }, [ groupData, groupState, groupDecorate, setGroupData ]);

    useEffect(() =>
    {
        setGroupState(groupData.groupState);
        setGroupDecorate(groupData.groupCanMembersDecorate);
    }, [ groupData ]);

    useEffect(() =>
    {
        setCloseAction({ action: saveSettings });

        return () => setCloseAction(null);
    }, [ setCloseAction, saveSettings ]);
    
    return (
        <Column overflow="auto" gap={ 2 }>
            <Column gap={ 2 }>
                { STATES.map((state, index) =>
                {
                    return (
                        <Flex key={ index } alignItems="start" gap={ 2 }>
                            <input className="form-check-input mt-1" type="radio" name="groupState" checked={ (groupState === index) } onChange={ event => setGroupState(index) } />
                            <Column gap={ 0 } className="min-w-0">
                                <Flex alignItems="center" gap={ 1 }>
                                    <i className={ `icon icon-group-type-${ index }` } />
                                    <Text bold>{ LocalizeText(`group.edit.settings.type.${ state }.label`) }</Text>
                                </Flex>
                                <Text>{ LocalizeText(`group.edit.settings.type.${ state }.help`) }</Text>
                            </Column>
                        </Flex>
                    );
                }) }
            </Column>
            <HorizontalRule className="my-1" />
            <Flex alignItems="start" gap={ 2 }>
                <input className="form-check-input mt-1" type="checkbox" checked={ groupDecorate } onChange={ event => setGroupDecorate(prevValue => !prevValue) } />
                <Column gap={ 0 } className="min-w-0">
                    <Text bold>{ LocalizeText('group.edit.settings.rights.caption') }</Text>
                    <Text>{ LocalizeText('group.edit.settings.rights.members.help') }</Text>
                </Column>
            </Flex>
        </Column>
    );
};
