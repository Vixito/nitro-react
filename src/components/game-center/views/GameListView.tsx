import { GameConfigurationData } from '@nitrots/nitro-renderer';
import { LocalizeText } from '../../../api';
import { Base, Flex, Text } from '../../../common';
import { useGameCenter } from '../../../hooks';

export const GameListView = () => 
{
    const { games, selectedGame, setSelectedGame } = useGameCenter();

    if(!games || !games.length) return null;

    const getGameTitle = (game: GameConfigurationData): string =>
    {
        switch(game.gameNameId)
        {
            case 'snowwar': return 'SnowStorm';
            case 'basejump': return 'Fast Food';
            case 'wobblesquabble': return 'Wobble Squabble';
            case 'battleball': return 'Battle Ball';
            case 'slotcar': return 'Speedway';
            default: return LocalizeText(`gamecenter.${ game.gameNameId }.name`) || game.gameNameId;
        }
    };

    return (
        <Base fullWidth className="gameList-container px-4 py-3">
            <Flex justifyContent="between" alignItems="center" className="mb-2">
                <Text variant="white" bold className="game-list-title">SELECCIONA UN JUEGO</Text>
                <Text variant="white" small className="game-list-subtitle">Compite con jugadores en tiempo real</Text>
            </Flex>
            <Flex gap={ 3 } className="game-cards-row">
                { games.map((game, index) => {
                    const isSelected = selectedGame?.gameId === game.gameId;
                    return (
                        <Flex 
                            key={ index } 
                            column 
                            alignItems="center" 
                            justifyContent="center"
                            className={ `game-dock-card ${ isSelected ? 'selected' : '' }` } 
                            onClick={ () => setSelectedGame(game) }
                        >
                            <Base className="game-dock-icon-container">
                                <img 
                                    src={ `${ game.assetUrl }${ game.gameNameId }_icon.png?v=6` } 
                                    alt={ game.gameNameId }
                                    className="game-dock-icon" 
                                />
                            </Base>
                            <Text variant="white" bold className="game-dock-title">{ getGameTitle(game) }</Text>
                        </Flex>
                    );
                }) }
            </Flex>
        </Base>
    );
};
