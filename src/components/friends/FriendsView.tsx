import { FC } from 'react';
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

    return (
        <>
            { createPortal(<FriendBarView onlineFriends={ onlineFriends } />, document.getElementById('toolbar-friend-bar-container')) }
            <FriendsListView />
            <FriendsMessengerView />
        </>
    );
};
