import { ExtendedProfileChangedMessageEvent, RelationshipStatusInfoEvent, RelationshipStatusInfoMessageParser, RoomEngineObjectEvent, RoomObjectCategory, RoomObjectType, UserCurrentBadgesComposer, UserCurrentBadgesEvent, UserProfileEvent, UserProfileParser, UserRelationshipsComposer } from '@nitrots/nitro-renderer';
import { FC, useEffect, useState } from 'react';
import { CreateLinkEvent, GetRoomSession, GetSessionDataManager, GetUserProfile, LocalizeText, SendMessageComposer } from '../../api';
import { Column, Flex, Grid, NitroCardContentView, NitroCardHeaderView, NitroCardView, Text } from '../../common';
import { useMessageEvent, useRoomEngineEvent } from '../../hooks';
import { BadgesContainerView } from './views/BadgesContainerView';
import { FriendsContainerView } from './views/FriendsContainerView';
import { GroupsContainerView } from './views/GroupsContainerView';
import { UserContainerView } from './views/UserContainerView';
import iconRooms2012Img from '../../assets/images/eras/flash2012/profile/icon_rooms_2012.png';
import iconLevel2012Img from '../../assets/images/eras/flash2012/profile/icon_level_2012.png';
import iconBadges2012Img from '../../assets/images/eras/flash2012/profile/icon_badges_2012.png';
import iconStreak2012Img from '../../assets/images/eras/flash2012/profile/icon_streak_2012.png';

export const UserProfileView: FC<{}> = props =>
{
    const [ userProfile, setUserProfile ] = useState<UserProfileParser>(null);
    const [ userBadges, setUserBadges ] = useState<string[]>([]);
    const [ userRelationships, setUserRelationships ] = useState<RelationshipStatusInfoMessageParser>(null);
    const [ battlePassLevel, setBattlePassLevel ] = useState<number>(1);
    const [ userStreak, setUserStreak ] = useState<number>(0);

    const onClose = () =>
    {
        setUserProfile(null);
        setUserBadges([]);
        setUserRelationships(null);
    }

    const onLeaveGroup = () =>
    {
        if(!userProfile || (userProfile.id !== GetSessionDataManager().userId)) return;

        GetUserProfile(userProfile.id);
    }

    useMessageEvent<UserCurrentBadgesEvent>(UserCurrentBadgesEvent, event =>
    {
        const parser = event.getParser();

        if(!userProfile || (parser.userId !== userProfile.id)) return;

        setUserBadges(parser.badges);
    });

    useMessageEvent<RelationshipStatusInfoEvent>(RelationshipStatusInfoEvent, event =>
    {
        const parser = event.getParser();

        if(!userProfile || (parser.userId !== userProfile.id)) return;

        setUserRelationships(parser);
    });

    useMessageEvent<UserProfileEvent>(UserProfileEvent, event =>
    {
        const parser = event.getParser();

        let isSameProfile = false;

        setUserProfile(prevValue =>
        {
            if(prevValue && prevValue.id) isSameProfile = (prevValue.id === parser.id);

            return parser;
        });

        if(!isSameProfile)
        {
            setUserBadges([]);
            setUserRelationships(null);
        }

        SendMessageComposer(new UserCurrentBadgesComposer(parser.id));
        SendMessageComposer(new UserRelationshipsComposer(parser.id));
    });

    useMessageEvent<ExtendedProfileChangedMessageEvent>(ExtendedProfileChangedMessageEvent, event =>
    {
        const parser = event.getParser();

        if(parser.userId != userProfile?.id) return;

        GetUserProfile(parser.userId);
    });

    useRoomEngineEvent<RoomEngineObjectEvent>(RoomEngineObjectEvent.SELECTED, event =>
    {
        if(!userProfile) return;

        if(event.category !== RoomObjectCategory.UNIT) return;

        const userData = GetRoomSession().userDataManager.getUserDataByIndex(event.objectId);

        if(userData.type !== RoomObjectType.USER) return;

        GetUserProfile(userData.webID);
    });

    useEffect(() =>
    {
        if(!userProfile || !userProfile.id) return;

        fetch(`/api/battlepass/data?user_id=${ userProfile.id }`)
            .then(r => r.json())
            .then(data =>
            {
                if(data && data.success && data.user && data.user.level)
                {
                    setBattlePassLevel(data.user.level);
                }
                else if(userProfile.achievementPoints)
                {
                    setBattlePassLevel(Math.floor(userProfile.achievementPoints / 100) + 1);
                }
            })
            .catch(() =>
            {
                if(userProfile.achievementPoints)
                {
                    setBattlePassLevel(Math.floor(userProfile.achievementPoints / 100) + 1);
                }
            });
        fetch(`/api/client/streak/${ userProfile.id }`, { credentials: 'include' })
            .then(r => r.json())
            .then(data =>
            {
                if(data && data.success && typeof data.currentStreak === 'number')
                {
                    setUserStreak(data.currentStreak);
                }
                else
                {
                    setUserStreak(0);
                }
            })
            .catch(() => setUserStreak(0));
    }, [ userProfile?.id ]);

    if(!userProfile) return null;

    return (
        <NitroCardView uniqueKey="nitro-user-profile" theme="primary-slim" className="user-profile no-resize">
            <NitroCardHeaderView headerText={ LocalizeText('extendedprofile.caption') } onCloseClick={ onClose } />
            <NitroCardContentView overflow="hidden">
                <Grid fullHeight={ false } gap={ 2 }>
                    <Column size={ 7 } gap={ 1 } className="user-container pe-2">
                        <UserContainerView userProfile={ userProfile } />
                        { (userProfile.id === GetSessionDataManager().userId) && (
                            <Flex justifyContent="between" className="px-1 mt-1" style={ { fontSize: '11px' } }>
                                <Text underline pointer onClick={ () => CreateLinkEvent('avatar-editor/toggle') }>Cambiar look</Text>
                                <Text underline pointer onClick={ () => CreateLinkEvent('inventory/badges') }>Cambiar placas</Text>
                            </Flex>
                        ) }
                        <Grid columnCount={ 5 } className="bg-muted rounded px-2 py-1 d-flex align-items-center" style={{ minHeight: '52px' }}>
                            <BadgesContainerView fullWidth center badges={ userBadges } />
                        </Grid>
                    </Column>
                    <Column size={ 5 }>
                        { userRelationships &&
                            <FriendsContainerView relationships={ userRelationships } friendsCount={ Math.max(0, userProfile.friendsCount - 1) } /> }
                    </Column>
                </Grid>
                <div className="user-profile-stats-bar-2012">
                    <div className="up-stat-cell" onClick={ () => CreateLinkEvent(`navigator/search/hotel_view/owner:${ userProfile.username }`) }>
                        <img src={ iconRooms2012Img } alt="" width={ 30 } height={ 22 } className="up-stat-ico" />
                        <span className="up-stat-label"><u>{ LocalizeText('extendedprofile.rooms') || 'Salas' }</u></span>
                    </div>
                    <div className="up-stat-cell" onClick={ () => CreateLinkEvent('battlepass/toggle') }>
                        <img src={ iconLevel2012Img } alt="" width={ 28 } height={ 16 } className="up-stat-ico" />
                        <span className="up-stat-label"><u>Nivel</u> { battlePassLevel }</span>
                    </div>
                    <div className="up-stat-cell" onClick={ () => CreateLinkEvent('achievements/toggle') }>
                        <img src={ iconBadges2012Img } alt="" width={ 23 } height={ 23 } className="up-stat-ico" />
                        <span className="up-stat-label"><u>Placas</u> { userBadges?.length || 0 }</span>
                    </div>
                    <div className="up-stat-cell" onClick={ () => CreateLinkEvent(`streak/open/${ userProfile.id }`) }>
                        <img src={ iconStreak2012Img } alt="" width={ 17 } height={ 22 } className="up-stat-ico" />
                        <span className="up-stat-label"><u>Rachas</u> { userStreak }</span>
                    </div>
                </div>
                <GroupsContainerView fullWidth itsMe={ userProfile.id === GetSessionDataManager().userId } groups={ userProfile.groups } onLeaveGroup={ onLeaveGroup } />
            </NitroCardContentView>
        </NitroCardView>
    )
}
