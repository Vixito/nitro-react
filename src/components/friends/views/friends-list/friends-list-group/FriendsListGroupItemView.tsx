import { CSSProperties, FC, MouseEvent, useEffect, useState } from 'react';
import { LocalizeText, MessengerFriend, OpenMessengerChat } from '../../../../../api';
import { fetchOwnPoopFriendIds, isPoopFriend, setPoopRelationship, subscribePoopRelationships } from '../../../../../api/friends/PoopRelationshipStore';
import { Base, Flex, NitroCardAccordionItemView, UserProfileIconView } from '../../../../../common';
import { useFriends, useGamePresence } from '../../../../../hooks';
import iconPoopImg from '../../../../../assets/images/eras/flash2012/friends/icon_poop.png';
import { getGamePresenceMeta } from '../../../gamePresenceMeta';

const RELATIONSHIP_POOP = 4;

export const FriendsListGroupItemView: FC<{ friend: MessengerFriend, selected: boolean, selectFriend: (userId: number) => void }> = props =>
{
    const { friend = null, selected = false, selectFriend = null } = props;
    const [ isRelationshipOpen, setIsRelationshipOpen ] = useState<boolean>(false);
    const [ isPoop, setIsPoop ] = useState<boolean>(() => (friend ? isPoopFriend(friend.id) : false));
    const { followFriend = null, updateRelationship = null } = useFriends();
    const { activePlayers } = useGamePresence();
    const activeGame = friend && friend.id > 0 ? activePlayers[friend.id] : null;
    const gameMeta = getGamePresenceMeta(activeGame);

    useEffect(() =>
    {
        if(!friend || friend.id <= 0) return;
        fetchOwnPoopFriendIds();
        setIsPoop(isPoopFriend(friend.id));
        const unsub = subscribePoopRelationships(() =>
        {
            setIsPoop(isPoopFriend(friend.id));
        });
        return unsub;
    }, [ friend?.id ]);

    const clickFollowFriend = (event: MouseEvent<HTMLDivElement>) =>
    {
        event.stopPropagation();

        followFriend(friend);
    }

    const openMessengerChat = (event: MouseEvent<HTMLDivElement>) =>
    {
        event.stopPropagation();
        
        OpenMessengerChat(friend.id);
    }

    const openRelationship = (event: MouseEvent<HTMLElement>) =>
    {
        event.stopPropagation();

        setIsRelationshipOpen(true);
    }

    const clickUpdateRelationship = (event: MouseEvent<HTMLElement>, type: number) =>
    {
        event.stopPropagation();

        if(type === RELATIONSHIP_POOP)
        {
            const needsClear = friend.relationshipStatus !== MessengerFriend.RELATIONSHIP_NONE;
            if(needsClear) updateRelationship(friend, MessengerFriend.RELATIONSHIP_NONE);
            setPoopRelationship(friend.id, true, needsClear ? 180 : 0);
        }
        else
        {
            if(isPoop) setPoopRelationship(friend.id, false);
            updateRelationship(friend, type);
        }
        
        setIsRelationshipOpen(false);
    }

    const getCurrentRelationshipName = () =>
    {
        if(!friend) return 'none';

        switch(friend.relationshipStatus)
        {
            case MessengerFriend.RELATIONSHIP_HEART: return 'heart';
            case MessengerFriend.RELATIONSHIP_SMILE: return 'smile';
            case MessengerFriend.RELATIONSHIP_BOBBA: return 'bobba';
            default: return 'none';
        }
    }

    if(!friend) return null;

    const gameStyle = gameMeta ? ({
        '--game-badge-bg': gameMeta.badgeBg,
        '--game-badge-border': gameMeta.badgeBorder,
        '--game-band-bg': gameMeta.bandBg,
        '--game-band-border': gameMeta.bandBorder,
        '--game-sub-color': gameMeta.subColor
    } as CSSProperties) : undefined;

    return (
        <NitroCardAccordionItemView
            column={ !!gameMeta && selected }
            justifyContent="between"
            className={ `px-2 py-1 friends-list-item-row ${ selected ? 'bg-primary text-white' : '' } ${ gameMeta ? `is-playing-game ${ gameMeta.cardClass }` : '' }` }
            style={ gameStyle }
            onClick={ () => selectFriend(friend.id) }
        >
            <Flex fullWidth alignItems="center" justifyContent="between">
                <Flex alignItems="center" gap={ 1 } className="min-w-0">
                    <Base onClick={ event => event.stopPropagation() }>
                        <UserProfileIconView userId={ friend.id } />
                    </Base>
                    <div className="text-truncate">{ friend.name }</div>
                    { gameMeta && (
                        <span
                            className={ `friends-list-game-pill ${ gameMeta.cardClass }` }
                            title={ `${ friend.name } está jugando un juego: ${ gameMeta.label }` }
                        >
                            <img src={ gameMeta.icon } alt={ gameMeta.label } className="friends-list-game-icon" />
                            <span className="friends-list-game-label">{ gameMeta.label }</span>
                        </span>
                    ) }
                </Flex>
                <Flex alignItems="center" gap={ 1 }>
                    { !isRelationshipOpen &&
                        <>
                            { friend.followingAllowed && !gameMeta &&
                                <Base pointer onClick={ clickFollowFriend } className="nitro-friends-spritesheet icon-follow" title={ LocalizeText('friendlist.tip.follow') } /> }
                            { friend.online &&
                                <Base pointer className="nitro-friends-spritesheet icon-chat" onClick={ openMessengerChat } title={ LocalizeText('friendlist.tip.im') } /> }
                            { (friend.id > 0) && (
                                isPoop && friend.relationshipStatus === MessengerFriend.RELATIONSHIP_NONE
                                    ? <img src={ iconPoopImg } alt="Caquita" width={ 14 } height={ 14 } className="cursor-pointer icon-poop-2012" onClick={ openRelationship } title={ LocalizeText('infostand.link.relationship') } />
                                    : <Base className={ `nitro-friends-spritesheet icon-${ getCurrentRelationshipName() } cursor-pointer` } onClick={ openRelationship } title={ LocalizeText('infostand.link.relationship') } />
                            ) }
                        </> }
                    { isRelationshipOpen &&
                        <>
                            <Base pointer className="nitro-friends-spritesheet icon-heart" onClick={ event => clickUpdateRelationship(event, MessengerFriend.RELATIONSHIP_HEART) } />
                            <Base pointer className="nitro-friends-spritesheet icon-smile" onClick={ event => clickUpdateRelationship(event, MessengerFriend.RELATIONSHIP_SMILE) } />
                            <Base pointer className="nitro-friends-spritesheet icon-bobba" onClick={ event => clickUpdateRelationship(event, MessengerFriend.RELATIONSHIP_BOBBA) } />
                            <img src={ iconPoopImg } alt="Caquita" width={ 14 } height={ 14 } className="cursor-pointer icon-poop-2012" onClick={ event => clickUpdateRelationship(event, RELATIONSHIP_POOP) } title="Caquita" />
                            <Base pointer className="nitro-friends-spritesheet icon-none" onClick={ event => clickUpdateRelationship(event, MessengerFriend.RELATIONSHIP_NONE) } />
                        </> }
                </Flex>
            </Flex>
            { gameMeta && selected && (
                <div className="friends-list-game-banner" onClick={ event => event.stopPropagation() }>
                    <img src={ gameMeta.icon } alt={ gameMeta.label } className="friends-list-game-banner-icon" />
                    <div className="friends-list-game-banner-text">
                        <div className="friends-list-game-banner-sub">está jugando un juego</div>
                        <div className="friends-list-game-banner-title">{ gameMeta.label }</div>
                    </div>
                </div>
            ) }
        </NitroCardAccordionItemView>
    );
}
