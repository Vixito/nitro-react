import { MouseEventType } from '@nitrots/nitro-renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { CreateLinkEvent, GetUserProfile, LocalizeText, MessengerFriend, OpenMessengerChat } from '../../../../api';
import { Base, LayoutAvatarImageView, LayoutBadgeImageView } from '../../../../common';
import { useFriends } from '../../../../hooks';

export const FriendBarItemView: FC<{ friend: MessengerFriend }> = props =>
{
    const { friend = null } = props;
    const [ isVisible, setVisible ] = useState(false);
    const { followFriend = null } = useFriends();
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
                onClick={ () => CreateLinkEvent('friends/toggle') }
            >
                <div className="friend-bar-item-head position-absolute"/>
                <div className="text-nowrap text-white">{ LocalizeText('friend.bar.find.title') || 'Encuentra amig@s' }</div>
            </div>
        );
    }

    const isAvatar = (friend.id > 0 || friend.figure?.includes('hd-') || friend.figure?.includes('hr-'));

    return (
        <div 
            ref={ elementRef } 
            className={ 'btn btn-success friend-bar-item ' + (isVisible ? 'friend-bar-item-active' : '') } 
            onClick={ event => {
                if(friend.id <= 0) {
                    OpenMessengerChat(friend.id);
                } else {
                    setVisible(prevValue => !prevValue);
                }
            } }
        >
            <div className={ `friend-bar-item-head position-absolute ${ isAvatar ? 'avatar': 'group' }` }>
                { isAvatar && <LayoutAvatarImageView headOnly={ true } figure={ friend.figure } direction={ 2 } /> }
                { !isAvatar && <LayoutBadgeImageView isGroup={ true } badgeCode={ friend.figure } /> } 
            </div>
            <div className="text-truncate">{ friend.name }</div>
            { isVisible && friend.id > 0 &&
            <div className="d-flex justify-content-between">
                <Base className="nitro-friends-spritesheet icon-friendbar-chat cursor-pointer" onClick={ event => OpenMessengerChat(friend.id) } />
                { friend.followingAllowed &&
                <Base className="nitro-friends-spritesheet icon-friendbar-visit cursor-pointer" onClick={ event => followFriend(friend) } /> }
                <Base className="nitro-friends-spritesheet icon-profile cursor-pointer" onClick={ event => GetUserProfile(friend.id) } />
            </div> }
        </div>
    );
}
