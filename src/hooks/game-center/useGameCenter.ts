import { Game2AccountGameStatusMessageEvent, Game2AccountGameStatusMessageParser, GameConfigurationData, GameListMessageEvent, GameStatusMessageEvent, GetGameListMessageComposer, LoadGameUrlEvent } from '@nitrots/nitro-renderer';
import { useEffect, useState } from 'react';
import { useBetween } from 'use-between';
import { SendMessageComposer, VisitDesktop } from '../../api';
import { useMessageEvent } from '../events';

const useGameCenterState = () => 
{
    const [ isVisible, setIsVisible ] = useState<boolean>(false);
    const [ games, setGames ] = useState<GameConfigurationData[]>(null);
    const [ selectedGame, setSelectedGame ] = useState<GameConfigurationData>(null);
    const [ accountStatus, setAccountStatus ] = useState<Game2AccountGameStatusMessageParser>(null);
    const [ gameOffline, setGameOffline ] = useState<boolean>(false);
    const [ gameURL, setGameURL ] = useState<string>(null);

    useMessageEvent<GameListMessageEvent>(GameListMessageEvent, event => 
    {
        let parser = event.getParser();

        if(!parser || !parser.games || !parser.games.length) return;

        setGames(parser.games);
        
        if(!selectedGame)
        {
            setSelectedGame(parser.games[0]);
            SendMessageComposer(new GetGameStatusMessageComposer(parser.games[0].gameId));
            SendMessageComposer(new Game2GetAccountGameStatusMessageComposer(parser.games[0].gameId));
        }
    });

    useMessageEvent<Game2AccountGameStatusMessageEvent>(Game2AccountGameStatusMessageEvent, event => 
    {
        let parser = event.getParser();

        if(!parser) return;

        setAccountStatus(parser);
    });

    useMessageEvent<GameStatusMessageEvent>(GameStatusMessageEvent, event => 
    {
        let parser = event.getParser();

        if(!parser) return;

        setGameOffline(parser.isInMaintenance);
    });

    useMessageEvent<LoadGameUrlEvent>(LoadGameUrlEvent, event => 
    {
        let parser = event.getParser();

        if(!parser) return;

        setGameURL(parser.url);
    });

    const selectGame = (game: GameConfigurationData) =>
    {
        if(!game) return;
        setSelectedGame(game);
        SendMessageComposer(new GetGameStatusMessageComposer(game.gameId));
        SendMessageComposer(new Game2GetAccountGameStatusMessageComposer(game.gameId));
    };

    useEffect(()=>
    {
        if(isVisible) 
        {
            SendMessageComposer(new GetGameListMessageComposer());
            VisitDesktop();
        }
    },[ isVisible ]);

    return {
        isVisible, setIsVisible,
        games,
        accountStatus,
        selectedGame, setSelectedGame: selectGame,
        gameOffline,
        gameURL, setGameURL
    }
}

export const useGameCenter = () => useBetween(useGameCenterState);
