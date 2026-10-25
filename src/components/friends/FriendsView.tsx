import { FC } from 'react';
import { createPortal } from 'react-dom';
import { useFriends } from '../../hooks';
import { useEraTheme } from '../../hooks/era/useEraTheme';
import { FriendBarView } from './views/friends-bar/FriendsBarView';
import { FriendsListView } from './views/friends-list/FriendsListView';
import { FriendsMessengerView } from './views/messenger/FriendsMessengerView';
import { ShockwaveConsoleView } from './views/shockwave-console/ShockwaveConsoleView';

export const FriendsView: FC<{}> = props =>
{
    const { currentEra } = useEraTheme();
    const { settings = null, onlineFriends = [] } = useFriends();

    if(!settings) return null;

    if(currentEra === 'shockwave2006')
    {
        return (
            <>
                <ShockwaveConsoleView />
                <FriendsMessengerView />
            </>
        );
    }

    return (
        <>
            { createPortal(<FriendBarView onlineFriends={ onlineFriends } />, document.getElementById('toolbar-friend-bar-container')) }
            <FriendsListView />
            <FriendsMessengerView />
        </>
    );
}
