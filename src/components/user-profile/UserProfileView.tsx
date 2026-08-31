import { ExtendedProfileChangedMessageEvent, RelationshipStatusInfoEvent, RelationshipStatusInfoMessageParser, RoomEngineObjectEvent, RoomObjectCategory, RoomObjectType, UserCurrentBadgesComposer, UserCurrentBadgesEvent, UserProfileEvent, UserProfileParser, UserRelationshipsComposer } from '@nitrots/nitro-renderer';
import { FC, useState } from 'react';
import { CreateLinkEvent, GetRoomSession, GetSessionDataManager, GetUserProfile, LocalizeText, SendMessageComposer } from '../../api';
import { Column, Flex, Grid, NitroCardContentView, NitroCardHeaderView, NitroCardView, Text } from '../../common';
import { useMessageEvent, useRoomEngineEvent } from '../../hooks';
import { BadgesContainerView } from './views/BadgesContainerView';
import { FriendsContainerView } from './views/FriendsContainerView';
import { GroupsContainerView } from './views/GroupsContainerView';
import { UserContainerView } from './views/UserContainerView';

export const UserProfileView: FC<{}> = props =>
{
    const [ userProfile, setUserProfile ] = useState<UserProfileParser>(null);
    const [ userBadges, setUserBadges ] = useState<string[]>([]);
    const [ userRelationships, setUserRelationships ] = useState<RelationshipStatusInfoMessageParser>(null);

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

    if(!userProfile) return null;

    return (
        <NitroCardView uniqueKey="nitro-user-profile" theme="primary-slim" className="user-profile">
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
                <div className="d-flex align-items-center justify-content-between my-2 rounded text-center" style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', height: '42px' }}>
                    <div className="d-flex align-items-center justify-content-center gap-2.5 flex-fill h-100 cursor-pointer" onClick={ event => CreateLinkEvent(`navigator/search/hotel_view/owner:${ userProfile.username }`) }>
                        <i className="icon icon-rooms me-1" />
                        <span className="fw-bold text-dark text-decoration-underline" style={{ fontSize: '12px' }}>{ LocalizeText('extendedprofile.rooms') }</span>
                    </div>
                    <div className="d-flex align-items-center justify-content-center gap-2.5 flex-fill h-100 border-start border-end cursor-pointer" style={{ borderColor: '#cbd5e1' }} onClick={ () => CreateLinkEvent('achievements/toggle') }>
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className="me-1">
                            <path d="M9 1.5L11.2 6.5L16.5 7.2L12.5 11L13.5 16.5L9 13.8L4.5 16.5L5.5 11L1.5 7.2L6.8 6.5L9 1.5Z" fill="#FFD837" stroke="#1E1E1E" strokeWidth="1.2" strokeLinejoin="round"/>
                        </svg>
                        <span className="fw-bold text-dark" style={{ fontSize: '12px' }}>
                            <span className="text-decoration-underline">Placas</span> { userBadges?.length || 0 }
                        </span>
                    </div>
                    <div className="d-flex align-items-center justify-content-center gap-2.5 flex-fill h-100 cursor-pointer" onClick={ () => CreateLinkEvent('battlepass/toggle') }>
                        <svg width="22" height="14" viewBox="0 0 22 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="me-1">
                            <path d="M2 1.5L6 7L2 12.5" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M7 1.5L11 7L7 12.5" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M12 1.5L16 7L12 12.5" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M17 1.5L21 7L17 12.5" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span className="fw-bold text-dark" style={{ fontSize: '12px' }}>
                            Nivel { userProfile.achievementPoints ? Math.floor(userProfile.achievementPoints / 100) + 1 : 1 }
                        </span>
                    </div>
                </div>
                <GroupsContainerView fullWidth itsMe={ userProfile.id === GetSessionDataManager().userId } groups={ userProfile.groups } onLeaveGroup={ onLeaveGroup } />
            </NitroCardContentView>
        </NitroCardView>
    )
}
