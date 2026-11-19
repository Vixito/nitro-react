import { FC, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEraTheme, useFriends } from '../../hooks';
import { FriendBarView } from './views/friends-bar/FriendsBarView';
import { FriendsListView } from './views/friends-list/FriendsListView';
import { HabboConsoleShockwaveView } from './views/HabboConsoleShockwaveView';
import { FriendsMessengerView } from './views/messenger/FriendsMessengerView';

export const FriendsView: FC<{}> = props =>
{
    const { settings = null, onlineFriends = [] } = useFriends();
    const { currentEra } = useEraTheme();
    const [ friendBarContainer, setFriendBarContainer ] = useState<HTMLElement | null>(null);

    useEffect(() =>
    {
        if(currentEra === 'shockwave2006')
        {
            setFriendBarContainer(null);
            return;
        }

        const resolveContainer = () =>
        {
            const el = document.getElementById('toolbar-friend-bar-container');
            if(el && el.isConnected) setFriendBarContainer(el);
        };

        resolveContainer();
        const raf = requestAnimationFrame(resolveContainer);
        const timer = setTimeout(resolveContainer, 60);

        return () =>
        {
            cancelAnimationFrame(raf);
            clearTimeout(timer);
        };
    }, [ currentEra, settings ]);

    if(currentEra === 'shockwave2006')
    {
        return (
            <>
                <HabboConsoleShockwaveView />
                <FriendsMessengerView />
            </>
        );
    }

    if(!settings) return null;

    const target = (friendBarContainer && friendBarContainer.isConnected) ? friendBarContainer : null;

    return (
        <>
            { target && createPortal(<FriendBarView key={ currentEra } onlineFriends={ onlineFriends } />, target) }
            <FriendsListView />
            <FriendsMessengerView />
        </>
    );
};
