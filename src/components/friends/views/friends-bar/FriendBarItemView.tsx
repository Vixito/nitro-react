import { MouseEventType } from '@nitrots/nitro-renderer';
import { CSSProperties, FC, useEffect, useRef, useState } from 'react';
import { CreateLinkEvent, GetUserProfile, LocalizeText, MessengerFriend, OpenMessengerChat } from '../../../../api';
import { Base, LayoutAvatarImageView, LayoutBadgeImageView } from '../../../../common';
import { useFriends, useGamePresence } from '../../../../hooks';
import { getGamePresenceMeta } from '../../gamePresenceMeta';

export const FriendBarItemView: FC<{ friend: MessengerFriend }> = props =>
{
    const { friend = null } = props;
    const [ isVisible, setVisible ] = useState(false);
    const { followFriend = null } = useFriends();
    const { activePlayers } = useGamePresence();
    const elementRef = useRef<HTMLDivElement>();

    useEffect(() =>
    {
        const onClick = (event: MouseEvent) =>
        {
            const element = elementRef.current;

            if(!element) return;

            if((event.target !== element) && !element.contains((event.target as Node)))
            {
                setVisible(false);
            }
        }

        document.addEventListener(MouseEventType.MOUSE_CLICK, onClick);

        return () => document.removeEventListener(MouseEventType.MOUSE_CLICK, onClick);
    }, []);

    if(!friend)
    {
        return (
            <div 
                ref={ elementRef } 
                className="btn btn-primary friend-bar-item friend-bar-search d-flex align-items-center cursor-pointer"
                onClick={ () => CreateLinkEvent('friends/search') }
            >
                <div className="friend-bar-item-head position-absolute"/>
                <div className="text-nowrap text-white">{ LocalizeText('friend.bar.find.title') || 'Encuentra amig@s' }</div>
            </div>
        );
    }

    const isAvatar = (friend.id > 0);
    const activeGame = isAvatar ? activePlayers[friend.id] : null;
    const gameMeta = getGamePresenceMeta(activeGame);
    const gameStyle = gameMeta ? ({
        '--game-band-bg': gameMeta.bandBg,
        '--game-band-border': gameMeta.bandBorder,
        '--game-sub-color': gameMeta.subColor
    } as CSSProperties) : undefined;

    return (
        <div
            ref={ elementRef }
            style={ gameStyle }
            className={ `btn btn-success friend-bar-item ${ isVisible ? 'friend-bar-item-active' : '' } ${ gameMeta ? `friend-bar-playing-game ${ gameMeta.cardClass }` : '' }` }
            onClick={ () => {
                if(friend.id <= 0) {
                    OpenMessengerChat(friend.id);
                } else {
                    setVisible(prevValue => !prevValue);
                }
            } }
        >
            <div className={ `friend-bar-item-head position-absolute ${ isAvatar ? 'avatar': 'group' }` }>
                { isAvatar && <LayoutAvatarImageView headOnly={ true } figure={ friend.figure } direction={ 2 } /> }
                { !isAvatar && <LayoutBadgeImageView isGroup={ false } badgeCode={ friend.figure || 'ADM' } /> }
            </div>
            { gameMeta && (
                <img
                    src={ gameMeta.icon }
                    alt={ gameMeta.label }
                    title={ `${ friend.name } está jugando a ${ gameMeta.label }` }
                    className={ `friend-bar-game-badge ${ gameMeta.cardClass }` }
                />
            ) }
            <div className="text-truncate">{ friend.name }</div>
            { isVisible && friend.id > 0 && gameMeta && (
                <div className="friend-bar-playing-band" onClick={ event => event.stopPropagation() }>
                    <div className="friend-bar-playing-sub">está jugando un juego</div>
                    <div className="friend-bar-playing-title">{ gameMeta.label }</div>
                </div>
            ) }
            { isVisible && friend.id > 0 &&
            <div className="d-flex justify-content-between friend-bar-actions-row">
                <Base className="nitro-friends-spritesheet icon-friendbar-chat cursor-pointer" onClick={ event => { event.stopPropagation(); OpenMessengerChat(friend.id); } } />
                { friend.followingAllowed && !gameMeta &&
                <Base className="nitro-friends-spritesheet icon-friendbar-visit cursor-pointer" onClick={ event => { event.stopPropagation(); followFriend(friend); } } /> }
                <Base className="nitro-friends-spritesheet icon-profile cursor-pointer" onClick={ event => { event.stopPropagation(); GetUserProfile(friend.id); } } />
            </div> }
        </div>
    );
}
