import { ILinkEventTracker, IgnoreResultEvent, RemoveFriendComposer, SendRoomInviteComposer } from '@nitrots/nitro-renderer';
import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { AddEventLinkTracker, GetSessionDataManager, GetUserProfile, LocalizeText, MessengerFriend, RemoveLinkEventTracker, SendMessageComposer } from '../../../../api';
import { Base, Button, Flex, NitroCardAccordionItemView, NitroCardAccordionSetView, NitroCardAccordionView, NitroCardContentView, NitroCardHeaderView, NitroCardView, UserProfileIconView } from '../../../../common';
import { useFriends, useMessageEvent } from '../../../../hooks';
import { useEraTheme } from '../../../../hooks/era/useEraTheme';
import { FriendsListGroupView } from './friends-list-group/FriendsListGroupView';
import { FriendsListRequestView } from './friends-list-request/FriendsListRequestView';
import { FriendsRemoveConfirmationView } from './FriendsListRemoveConfirmationView';
import { FriendsRoomInviteView } from './FriendsListRoomInviteView';
import { FriendsSearchView } from './FriendsListSearchView';

export const FriendsListView: FC<{}> = props =>
{
    const { currentEra } = useEraTheme();
    const [ isVisible, setIsVisible ] = useState(false);
    const [ isSearchMode, setIsSearchMode ] = useState(false);
    const [ searchTrigger, setSearchTrigger ] = useState(0);
    const [ selectedFriendsIds, setSelectedFriendsIds ] = useState<number[]>([]);
    const [ showRoomInvite, setShowRoomInvite ] = useState<boolean>(false);
    const [ showRemoveFriendsConfirmation, setShowRemoveFriendsConfirmation ] = useState<boolean>(false);
    const [ ignoredUsers, setIgnoredUsers ] = useState<{ id: number; username: string; look: string; online: boolean }[]>([]);
    const { onlineFriends = [], offlineFriends = [], requests = [], requestFriend = null, followFriend = null } = useFriends();

    const loadIgnoredUsers = useCallback(async () =>
    {
        try
        {
            const res = await fetch('/api/client/ignored', { credentials: 'include' });
            const data = await res.json();
            if(data && data.success && Array.isArray(data.ignored))
            {
                setIgnoredUsers(data.ignored);
            }
        }
        catch
        {
            // Ignore
        }
    }, []);

    useEffect(() =>
    {
        if(isVisible) loadIgnoredUsers();
    }, [ isVisible, loadIgnoredUsers ]);

    useMessageEvent<IgnoreResultEvent>(IgnoreResultEvent, () =>
    {
        setTimeout(() => loadIgnoredUsers(), 250);
    });

    const handleUnignore = async (user: { id: number; username: string }) =>
    {
        try
        {
            GetSessionDataManager().unignoreUser(user.username);
        }
        catch
        {
            // Fallback to DB removal below
        }
        setIgnoredUsers(prev => prev.filter(u => u.id !== user.id));
        try
        {
            await fetch(`/api/client/ignored/${ user.id }`, { method: 'DELETE', credentials: 'include' });
        }
        catch
        {
            // Ignore
        }
    };

    const removeFriendsText = useMemo(() =>
    {
        if(!selectedFriendsIds || !selectedFriendsIds.length) return '';

        const userNames: string[] = [];

        for(const userId of selectedFriendsIds)
        {
            let existingFriend: MessengerFriend = onlineFriends.find(f => f.id === userId);

            if(!existingFriend) existingFriend = offlineFriends.find(f => f.id === userId);

            if(!existingFriend) continue;

            userNames.push(existingFriend.name);
        }

        return LocalizeText('friendlist.removefriendconfirm.userlist', [ 'user_names' ], [ userNames.join(', ') ]);
    }, [ offlineFriends, onlineFriends, selectedFriendsIds ]);

    const selectFriend = useCallback((userId: number) =>
    {
        if(userId < 0) return;

        setSelectedFriendsIds(prevValue =>
        {
            const newValue = [ ...prevValue ];

            const existingUserIdIndex: number = newValue.indexOf(userId);

            if(existingUserIdIndex > -1)
            {
                newValue.splice(existingUserIdIndex, 1)
            }
            else
            {
                newValue.push(userId);
            }

            return newValue;
        });
    }, [ setSelectedFriendsIds ]);

    const sendRoomInvite = (message: string) =>
    {
        if(!selectedFriendsIds.length || !message || !message.length || (message.length > 255)) return;
        
        SendMessageComposer(new SendRoomInviteComposer(message, selectedFriendsIds));

        setShowRoomInvite(false);
    }

    const removeSelectedFriends = () =>
    {
        if(selectedFriendsIds.length === 0) return;

        setSelectedFriendsIds(prevValue =>
        {
            SendMessageComposer(new RemoveFriendComposer(...prevValue));

            return [];
        });

        setShowRemoveFriendsConfirmation(false);
    }

    useEffect(() =>
    {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) =>
            {
                const parts = url.split('/');

                if(parts.length < 2) return;
        
                switch(parts[1])
                {
                    case 'show':
                        setIsSearchMode(false);
                        setIsVisible(true);
                        return;
                    case 'hide':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setIsSearchMode(false);
                        setIsVisible(prevValue => !prevValue);
                        return;
                    case 'search':
                        setIsSearchMode(true);
                        setSearchTrigger(prev => (prev + 1));
                        setIsVisible(true);
                        return;
                    case 'request':
                        if(parts.length < 4) return;

                        requestFriend(parseInt(parts[2]), parts[3]);
                }
            },
            eventUrlPrefix: 'friends/'
        };

        AddEventLinkTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [ requestFriend ]);

    const onlineFriendsCount = useMemo(() => onlineFriends.filter(f => f.id > 0 && f.name !== 'Staff Chat').length, [ onlineFriends ]);
    const offlineFriendsCount = useMemo(() => offlineFriends.filter(f => f.id > 0 && f.name !== 'Staff Chat').length, [ offlineFriends ]);

    const friendsHeaderTitle = 'Amig@s';
    const onlineHeader = `Amig@s (${ onlineFriendsCount })`;
    const offlineHeader = `Amig@s desconectad@s (${ offlineFriendsCount })`;
    const searchHeader = 'Buscar';

    if(!isVisible) return null;

    return (
        <>
            <NitroCardView className="nitro-friends" uniqueKey="nitro-friends" theme="primary-slim">
                <NitroCardHeaderView headerText={ friendsHeaderTitle } onCloseClick={ event => setIsVisible(false) } />
                <NitroCardContentView overflow="hidden" gap={ 1 } className="text-black p-0">
                    <NitroCardAccordionView fullHeight overflow="hidden">
                        <NitroCardAccordionSetView className="friends-online-set" headerText={ onlineHeader } isExpanded={ !isSearchMode }>
                            <FriendsListGroupView list={ onlineFriends } selectedFriendsIds={ selectedFriendsIds } selectFriend={ selectFriend } />
                        </NitroCardAccordionSetView>
                        <NitroCardAccordionSetView className="friends-offline-set" headerText={ offlineHeader }>
                            <FriendsListGroupView list={ offlineFriends } selectedFriendsIds={ selectedFriendsIds } selectFriend={ selectFriend } />
                        </NitroCardAccordionSetView>
                        <NitroCardAccordionSetView className="friends-ignored-set" headerText={ `Ignorados (${ ignoredUsers.length })` }>
                            { ignoredUsers.length === 0 ? (
                                <div className="px-2 py-2 text-muted" style={ { fontSize: '11px', fontStyle: 'italic' } }>
                                    No tienes usuarios ignorados.
                                </div>
                            ) : (
                                ignoredUsers.map(user => (
                                    <NitroCardAccordionItemView key={ user.id } justifyContent="between" className="px-2 py-1">
                                        <Flex alignItems="center" gap={ 1 }>
                                            <Base onClick={ event => event.stopPropagation() }>
                                                <UserProfileIconView userId={ user.id } />
                                            </Base>
                                            <span>{ user.username }</span>
                                        </Flex>
                                        <button
                                            type="button"
                                            className="friends-unignore-btn"
                                            title="Dejar de ignorar"
                                            onClick={ event => { event.stopPropagation(); handleUnignore(user); } }
                                        >
                                            Quitar
                                        </button>
                                    </NitroCardAccordionItemView>
                                ))
                            ) }
                        </NitroCardAccordionSetView>
                        { (requests.length > 0) &&
                            <FriendsListRequestView headerText={ `Peticiones (${ requests.length })` } isExpanded={ true } /> }
                        { currentEra === 'flash2012' &&
                            <Flex className="friends-action-bar-2012" justifyContent="between" alignItems="center">
                                <Flex gap={ 1 } alignItems="center">
                                    <button
                                        type="button"
                                        className="friends-2012-action-btn btn-follow-2012"
                                        title={ LocalizeText('friendlist.tip.follow') || 'Seguir / Invitar' }
                                        disabled={ !selectedFriendsIds || (selectedFriendsIds.length === 0) }
                                        onClick={ () => {
                                            if(!selectedFriendsIds || !selectedFriendsIds.length) return;
                                            const friend = onlineFriends.find(f => f.id === selectedFriendsIds[0]);
                                            if(friend && friend.followingAllowed && followFriend) followFriend(friend);
                                            else setShowRoomInvite(true);
                                        } }
                                    />
                                    <button
                                        type="button"
                                        className="friends-2012-action-btn btn-profile-2012"
                                        title={ LocalizeText('friendlist.tip.home') || 'Ver perfil' }
                                        disabled={ !selectedFriendsIds || (selectedFriendsIds.length === 0) }
                                        onClick={ () => {
                                            if(selectedFriendsIds && selectedFriendsIds.length > 0) GetUserProfile(selectedFriendsIds[0]);
                                        } }
                                    />
                                </Flex>
                                <button
                                    type="button"
                                    className="friends-2012-action-btn btn-remove-2012"
                                    title={ LocalizeText('generic.delete') || 'Eliminar amig@' }
                                    disabled={ !selectedFriendsIds || (selectedFriendsIds.length === 0) }
                                    onClick={ () => {
                                        if(selectedFriendsIds && selectedFriendsIds.length > 0) setShowRemoveFriendsConfirmation(true);
                                    } }
                                />
                            </Flex> }
                        <FriendsSearchView classNames={ [ 'friends-search-set' ] } headerText={ searchHeader } isExpanded={ isSearchMode } expandTrigger={ searchTrigger } />
                    </NitroCardAccordionView>
                    { selectedFriendsIds && selectedFriendsIds.length > 0 &&
                        <Flex gap={ 1 } className="p-1 friends-modern-actions">
                            <Button fullWidth onClick={ () => setShowRoomInvite(true) }>{ LocalizeText('friendlist.tip.invite') }</Button>
                            <Button fullWidth variant="danger" onClick={ event => setShowRemoveFriendsConfirmation(true) }>{ LocalizeText('generic.delete') }</Button>
                        </Flex> } 
                </NitroCardContentView>
            </NitroCardView>
            { showRoomInvite &&
                <FriendsRoomInviteView selectedFriendsIds={ selectedFriendsIds } onCloseClick={ () => setShowRoomInvite(false) } sendRoomInvite={ sendRoomInvite } /> }
            { showRemoveFriendsConfirmation && 
                <FriendsRemoveConfirmationView selectedFriendsIds={ selectedFriendsIds } removeFriendsText={ removeFriendsText } onCloseClick={ () => setShowRemoveFriendsConfirmation(false) } removeSelectedFriends={ removeSelectedFriends } /> }
        </>
    );
};
