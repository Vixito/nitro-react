import { RelationshipStatusEnum, RelationshipStatusInfoMessageParser } from '@nitrots/nitro-renderer';
import { FC, useEffect, useState } from 'react';
import { GetUserProfile, LocalizeText } from '../../../api';
import { fetchUserPoopSummary, PoopRelationshipSummary, subscribePoopRelationships } from '../../../api/friends/PoopRelationshipStore';
import { Column, Flex, LayoutAvatarImageView, Text } from '../../../common';
import iconPoopImg from '../../../assets/images/eras/flash2012/friends/icon_poop.png';

interface RelationshipsContainerViewProps
{
    relationships: RelationshipStatusInfoMessageParser;
}

interface RelationshipsContainerRelationshipViewProps
{
    type: number;
}

export const RelationshipsContainerView: FC<RelationshipsContainerViewProps> = props =>
{
    const { relationships = null } = props;
    const [ poopSummary, setPoopSummary ] = useState<PoopRelationshipSummary | null>(null);
    const targetUserId = relationships?.userId ?? 0;

    useEffect(() =>
    {
        if(!targetUserId || targetUserId <= 0)
        {
            setPoopSummary(null);
            return;
        }

        let cancelled = false;
        const load = () =>
        {
            fetchUserPoopSummary(targetUserId).then(summary =>
            {
                if(!cancelled) setPoopSummary(summary);
            });
        };

        load();
        const unsub = subscribePoopRelationships(load);
        return () =>
        {
            cancelled = true;
            unsub();
        };
    }, [ targetUserId ]);

    const RelationshipComponent = ({ type }: RelationshipsContainerRelationshipViewProps) =>
    {
        const relationshipInfo = (relationships && relationships.relationshipStatusMap.hasKey(type)) ? relationships.relationshipStatusMap.getValue(type) : null;
        const relationshipName = RelationshipStatusEnum.RELATIONSHIP_NAMES[type].toLocaleLowerCase();

        return (
            <Flex fullWidth gap={ 1 }>
                <Flex center className="user-relationship">
                    <i className={ `nitro-friends-spritesheet icon-${ relationshipName }` } />
                </Flex>
                <Column grow gap={ 0 }>
                    <Flex alignItems="center" justifyContent="between" className="bg-white rounded px-2 py-1 user-relationship">
                        <Text small underline pointer onClick={ event => (relationshipInfo && (relationshipInfo.randomFriendId >= 1) && GetUserProfile(relationshipInfo.randomFriendId)) }>
                            { (!relationshipInfo || (relationshipInfo.friendCount === 0)) &&
                                LocalizeText('extendedprofile.add.friends') }
                            { (relationshipInfo && (relationshipInfo.friendCount >= 1)) &&
                                relationshipInfo.randomFriendName }
                        </Text>
                        { (relationshipInfo && (relationshipInfo.friendCount >= 1)) &&
                            <Flex center position="relative" className="avatar-image-container">
                                <LayoutAvatarImageView figure={ relationshipInfo.randomFriendFigure } headOnly={ true } direction={ 4 } />
                            </Flex> }
                    </Flex>
                    <Text small italics className="user-relationship-count">
                        { (!relationshipInfo || (relationshipInfo.friendCount === 0)) &&
                            LocalizeText('extendedprofile.no.friends.in.this.category') }
                        { (relationshipInfo && (relationshipInfo.friendCount > 1)) &&
                            LocalizeText(`extendedprofile.relstatus.others.${ relationshipName }`, [ 'count' ], [ (relationshipInfo.friendCount - 1).toString() ]) }
                        &nbsp;
                    </Text>
                </Column>
            </Flex>
        );
    }

    const PoopRelationshipComponent = () =>
    {
        const hasFriends = !!(poopSummary && poopSummary.friendCount >= 1);

        return (
            <Flex fullWidth gap={ 1 }>
                <Flex center className="user-relationship">
                    <img src={ iconPoopImg } alt="Caquita" width={ 14 } height={ 14 } style={ { imageRendering: 'pixelated' } } />
                </Flex>
                <Column grow gap={ 0 }>
                    <Flex alignItems="center" justifyContent="between" className="bg-white rounded px-2 py-1 user-relationship">
                        <Text small underline pointer onClick={ () => (hasFriends && poopSummary.randomFriendId >= 1 && GetUserProfile(poopSummary.randomFriendId)) }>
                            { !hasFriends && LocalizeText('extendedprofile.add.friends') }
                            { hasFriends && poopSummary.randomFriendName }
                        </Text>
                        { hasFriends &&
                            <Flex center position="relative" className="avatar-image-container">
                                <LayoutAvatarImageView figure={ poopSummary.randomFriendFigure } headOnly={ true } direction={ 4 } />
                            </Flex> }
                    </Flex>
                    <Text small italics className="user-relationship-count">
                        { !hasFriends && LocalizeText('extendedprofile.no.friends.in.this.category') }
                        { (hasFriends && poopSummary.friendCount > 1) && `y ${ poopSummary.friendCount - 1 } más` }
                        &nbsp;
                    </Text>
                </Column>
            </Flex>
        );
    }

    return (
        <>
            <RelationshipComponent type={ RelationshipStatusEnum.HEART } />
            <RelationshipComponent type={ RelationshipStatusEnum.SMILE } />
            <RelationshipComponent type={ RelationshipStatusEnum.BOBBA } />
            <PoopRelationshipComponent />
        </>
    );
}
