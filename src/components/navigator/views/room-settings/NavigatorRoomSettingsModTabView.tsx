import { BannedUserData, BannedUsersFromRoomEvent, RoomBannedUsersComposer, RoomModerationSettings, RoomUnbanUserComposer } from '@nitrots/nitro-renderer';
import { FC, useEffect, useState } from 'react';
import { IRoomData, LocalizeText, SendMessageComposer } from '../../../../api';
import { Button, Column, Flex, Grid, ShockwaveDropdown, Text, UserProfileIconView } from '../../../../common';
import { useMessageEvent } from '../../../../hooks';

interface NavigatorRoomSettingsTabViewProps
{
    roomData: IRoomData;
    handleChange: (field: string, value: string | number | boolean) => void;
}

export const NavigatorRoomSettingsModTabView: FC<NavigatorRoomSettingsTabViewProps> = props =>
{
    const { roomData = null, handleChange = null } = props;
    const [ selectedUserId, setSelectedUserId ] = useState<number>(-1);
    const [ bannedUsers, setBannedUsers ] = useState<BannedUserData[]>([]);

    const unBanUser = (userId: number) =>
    {
        setBannedUsers(prevValue =>
        {
            const newValue = [ ...prevValue ];

            const index = newValue.findIndex(value => (value.userId === userId));

            if(index >= 0) newValue.splice(index, 1);

            return newValue;
        })

        SendMessageComposer(new RoomUnbanUserComposer(userId, roomData.roomId));

        setSelectedUserId(-1);
    }

    useMessageEvent<BannedUsersFromRoomEvent>(BannedUsersFromRoomEvent, event =>
    {
        const parser = event.getParser();

        if(!roomData || (roomData.roomId !== parser.roomId)) return;

        setBannedUsers(parser.bannedUsers);
    });

    useEffect(() =>
    {
        SendMessageComposer(new RoomBannedUsersComposer(roomData.roomId));
    }, [ roomData.roomId ]);

    return (
        <Grid overflow="auto">
            <Column size={ 6 }>
                <Text bold>{ LocalizeText('navigator.roomsettings.moderation.banned.users') } ({ bannedUsers.length })</Text>
                <Flex overflow="hidden" className="bg-white rounded list-container p-2">
                    <Column fullWidth overflow="auto" gap={ 1 }>
                        { bannedUsers && (bannedUsers.length > 0) && bannedUsers.map((user, index) =>
                        {
                            return (
                                <Flex key={ index } shrink alignItems="center" gap={ 1 } overflow="hidden">
                                    <UserProfileIconView userName={ user.userName } />
                                    <Text pointer grow onClick={ event => setSelectedUserId(user.userId) }> { user.userName }</Text>
                                </Flex>
                            );
                        }) }
                    </Column>
                </Flex>
                <Button disabled={ (selectedUserId <= 0) } onClick={ event => unBanUser(selectedUserId) }>
                    { LocalizeText('navigator.roomsettings.moderation.unban') } { selectedUserId > 0 && bannedUsers.find(user => (user.userId === selectedUserId))?.userName }
                </Button>
            </Column>
            <Column size={ 6 }>
                <Column gap={ 1 }>
                    <Text bold>{ LocalizeText('navigator.roomsettings.moderation.mute.header') }</Text>
                    <Flex alignItems="center" gap={ 1 }>
                        <ShockwaveDropdown
                            className="w-100"
                            value={ roomData.moderationSettings.allowMute }
                            options={ [
                                { value: RoomModerationSettings.MODERATION_LEVEL_NONE, label: LocalizeText('navigator.roomsettings.moderation.none') },
                                { value: RoomModerationSettings.MODERATION_LEVEL_USER_WITH_RIGHTS, label: LocalizeText('navigator.roomsettings.moderation.rights') }
                            ] }
                            onChange={ val => handleChange('moderation_mute', val) }
                        />
                    </Flex>
                </Column>
                <Column gap={ 1 }>
                    <Text bold>{ LocalizeText('navigator.roomsettings.moderation.kick.header') }</Text>
                    <Flex alignItems="center" gap={ 1 }>
                        <ShockwaveDropdown
                            className="w-100"
                            value={ roomData.moderationSettings.allowKick }
                            options={ [
                                { value: RoomModerationSettings.MODERATION_LEVEL_NONE, label: LocalizeText('navigator.roomsettings.moderation.none') },
                                { value: RoomModerationSettings.MODERATION_LEVEL_USER_WITH_RIGHTS, label: LocalizeText('navigator.roomsettings.moderation.rights') },
                                { value: RoomModerationSettings.MODERATION_LEVEL_ALL, label: LocalizeText('navigator.roomsettings.moderation.all') }
                            ] }
                            onChange={ val => handleChange('moderation_kick', val) }
                        />
                    </Flex>
                </Column>
                <Column gap={ 1 }>
                    <Text bold>{ LocalizeText('navigator.roomsettings.moderation.ban.header') }</Text>
                    <Flex alignItems="center" gap={ 1 }>
                        <ShockwaveDropdown
                            className="w-100"
                            value={ roomData.moderationSettings.allowBan }
                            options={ [
                                { value: RoomModerationSettings.MODERATION_LEVEL_NONE, label: LocalizeText('navigator.roomsettings.moderation.none') },
                                { value: RoomModerationSettings.MODERATION_LEVEL_USER_WITH_RIGHTS, label: LocalizeText('navigator.roomsettings.moderation.rights') }
                            ] }
                            onChange={ val => handleChange('moderation_ban', val) }
                        />
                    </Flex>
                </Column>
            </Column>
        </Grid>
    );
}
