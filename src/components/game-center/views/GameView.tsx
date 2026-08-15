import { Game2GetAccountGameStatusMessageComposer, GetGameStatusMessageComposer, JoinQueueMessageComposer } from '@nitrots/nitro-renderer';
import { useEffect } from 'react';
import { ColorUtils, LocalizeText, SendMessageComposer } from '../../../api';
import { Base, Button, Flex, Text } from '../../../common';
import { useGameCenter } from '../../../hooks';

export const GameView = () => 
{
    const { selectedGame, accountStatus, gameOffline } = useGameCenter();

    useEffect(() =>
    {
        if(selectedGame) 
        {
            SendMessageComposer(new GetGameStatusMessageComposer(selectedGame.gameId));
            SendMessageComposer(new Game2GetAccountGameStatusMessageComposer(selectedGame.gameId));
        }
    }, [ selectedGame ]);

    if(!selectedGame) return null;

    const getBgColour = (): string => 
    {
        return selectedGame.bgColor ? ColorUtils.uintHexColor(selectedGame.bgColor) : '#1e293b';
    };

    const getBgImage = (): string => 
    {
        return `url(${ selectedGame.assetUrl }${ selectedGame.gameNameId }_theme.png?v=4)`;
    };

    const onPlay = () => 
    {
        if(gameOffline) return;
        SendMessageComposer(new JoinQueueMessageComposer(selectedGame.gameId));
    };

    const hasUnlimited = accountStatus ? accountStatus.hasUnlimitedGames : true;
    const freeGamesLeft = accountStatus ? accountStatus.freeGamesLeft : 5;

    return (
        <Flex 
            className="game-view p-4" 
            fullHeight 
            style={{ 
                backgroundColor: getBgColour(), 
                backgroundImage: getBgImage()
            }}
        >
            <Flex className="game-view-left-col w-60" column justifyContent="center" gap={ 3 }>
                <Base className="game-tag-badge">
                    MINIJUEGO OFICIAL
                </Base>

                <Base className="game-logo-wrapper">
                    <img 
                        src={ `${ selectedGame.assetUrl }${ selectedGame.gameNameId }_logo.png?v=4` } 
                        alt={ selectedGame.gameNameId }
                        className="game-hero-logo" 
                    />
                </Base>

                <Base className="game-info-box p-3">
                    <Text variant="white" bold className="game-tagline mb-2">
                        { LocalizeText(`gamecenter.${ selectedGame.gameNameId }.description_title`) || '¡Prepárate para la acción!' }
                    </Text>
                    <Text variant="white" className="game-description-text">
                        { LocalizeText(`gamecenter.${ selectedGame.gameNameId }.description_content`) || 'Disfruta de este clásico minijuego multijugador con tus amigos en Habbten.' }
                    </Text>
                </Base>

                <Flex alignItems="center" gap={ 3 } className="mt-2">
                    <Button 
                        variant={ gameOffline ? 'secondary' : 'success' } 
                        disabled={ gameOffline }
                        className="btn-play-game px-4 py-3" 
                        onClick={ onPlay }
                    >
                        { gameOffline ? 'En Mantenimiento' : '¡JUGAR AHORA!' }
                    </Button>

                    <Flex column gap={ 1 }>
                        <Text variant="white" bold className="game-status-label">
                            { hasUnlimited ? 'Partidas ilimitadas activas (Club HC)' : `${ freeGamesLeft } partidas gratuitas restantes hoy` }
                        </Text>
                        <Text variant="white" small className="game-server-status">
                            { gameOffline ? 'Servidor temporalmente pausado' : 'Servidor en línea' }
                        </Text>
                    </Flex>
                </Flex>
            </Flex>

            <Flex className="game-view-right-col w-40" column justifyContent="center" gap={ 3 }>
                <Base className="game-info-card p-3">
                    <Flex alignItems="center" gap={ 2 } className="mb-2">
                        <Text variant="white" bold className="info-card-title">PREMIO DE LA SEMANA</Text>
                    </Flex>
                    <Text variant="white" small className="info-card-desc">
                        ¡El jugador con el mejor récord semanal recibirá <b>200 Créditos</b> y una <b>Placa Exclusiva</b>!
                    </Text>
                </Base>

                <Base className="game-info-card p-3">
                    <Flex alignItems="center" gap={ 2 } className="mb-2">
                        <Text variant="white" bold className="info-card-title">CONTROLES RÁPIDOS</Text>
                    </Flex>
                    <Flex column gap={ 1 } className="info-card-desc">
                        <div>• <b>W A S D / Flechas:</b> Mover personaje / vehículo</div>
                        <div>• <b>Clic Izquierdo:</b> Disparo / Acción principal</div>
                        <div>• <b>Espacio:</b> Habilidad especial / Recargar</div>
                    </Flex>
                </Base>
            </Flex>
        </Flex>
    );
};
