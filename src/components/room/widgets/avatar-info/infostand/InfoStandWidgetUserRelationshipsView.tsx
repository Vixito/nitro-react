import { RelationshipStatusEnum, RelationshipStatusInfoMessageParser } from '@nitrots/nitro-renderer';
import { FC, useEffect, useState } from 'react';
import { GetUserProfile } from '../../../../../api';
import { fetchUserPoopSummary, PoopRelationshipSummary, subscribePoopRelationships } from '../../../../../api/friends/PoopRelationshipStore';
import { Flex, Text } from '../../../../../common';
import { InfoStandWidgetUserRelationshipsRelationshipItemView } from './InfoStandWidgetUserRelationshipItemView';
import iconPoopImg from '../../../../../assets/images/eras/flash2012/friends/icon_poop.png';

interface InfoStandWidgetUserRelationshipsViewProps
{
    relationships: RelationshipStatusInfoMessageParser;
}

export const InfoStandWidgetUserRelationshipsView: FC<InfoStandWidgetUserRelationshipsViewProps> = props =>
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

    const hasStandard = !!(relationships && relationships.relationshipStatusMap.length);
    const hasPoop = !!(poopSummary && poopSummary.friendCount >= 1);

    if(!hasStandard && !hasPoop) return null;

    return (
        <>
            { hasStandard && (
                <>
                    <InfoStandWidgetUserRelationshipsRelationshipItemView type={ RelationshipStatusEnum.HEART } relationship={ relationships.relationshipStatusMap.getValue(RelationshipStatusEnum.HEART) } />
                    <InfoStandWidgetUserRelationshipsRelationshipItemView type={ RelationshipStatusEnum.SMILE } relationship={ relationships.relationshipStatusMap.getValue(RelationshipStatusEnum.SMILE) } />
                    <InfoStandWidgetUserRelationshipsRelationshipItemView type={ RelationshipStatusEnum.BOBBA } relationship={ relationships.relationshipStatusMap.getValue(RelationshipStatusEnum.BOBBA) } />
                </>
            ) }
            { hasPoop && (
                <Flex alignItems="center" gap={ 1 }>
                    <img src={ iconPoopImg } alt="Caquita" width={ 14 } height={ 14 } style={ { imageRendering: 'pixelated' } } />
                    <Flex alignItems="center" gap={ 0 }>
                        <Text small variant="white" pointer onClick={ () => GetUserProfile(poopSummary.randomFriendId) }>
                            <u>{ poopSummary.randomFriendName }</u>
                            { (poopSummary.friendCount > 1) && ` y ${ poopSummary.friendCount - 1 } más` }
                        </Text>
                    </Flex>
                </Flex>
            ) }
        </>
    );
}
