import { Game2GetAccountGameStatusMessageComposer, GetGameStatusMessageComposer, JoinQueueMessageComposer } from '@nitrots/nitro-renderer';
import { useEffect, useMemo } from 'react';
import { ColorUtils, LocalizeText, SendMessageComposer } from '../../../api';
import { Base, Button, Flex, Text } from '../../../common';
import { useGameCenter } from '../../../hooks';

const GAME_CONTROLS: { [ gameNameId: string ]: { action: string; keys: string }[] } = {
    snowwar: [
        { action: 'Mover personaje', keys: 'W A S D / Flechas' },
        { action: 'Lanzar bola de nieve', keys: 'Clic del ratón' },
        { action: 'Recargar bolas', keys: 'Espacio' }
    ],
    basejump: [
        { action: 'Esquivar obstáculos', keys: 'A / D o Flechas Izq/Der' },
        { action: 'Abrir / cerrar paracaídas', keys: 'Espacio' }
    ],
    wobblesquabble: [
        { action: 'Mantener equilibrio', keys: 'A / D o Flechas Izq/Der' },
        { action: 'Empujar oponente', keys: 'Espacio / Clic' },
        { action: 'Agacharse / Esquivar', keys: 'S / Flecha Abajo' }
    ],
    slotcar: [
        { action: 'Acelerar', keys: 'Espacio / Flecha Arriba / W' }
    ],
    battleball: [
        { action: 'Mover tu bola', keys: 'W A S D / Flechas' }
    ]
};

const DEFAULT_CONTROLS: { action: string; keys: string }[] = [
    { action: 'Mover personaje / vehículo', keys: 'W A S D / Flechas' }
];

const GAME_DESCRIPTIONS: { [ gameNameId: string ]: { title: string; desc: string } } = {
    snowwar: {
        title: '¡Guerra de nieve en el hotel!',
        desc: 'Lanza bolas de nieve, crea muros protectores y derrota al equipo contrario en épicas batallas multijugador.'
    },
    basejump: {
        title: '¡Caída libre en paracaídas!',
        desc: 'Planea por los aires, esquiva todos los obstáculos y sé el primero en aterrizar a salvo en el objetivo.'
    },
    wobblesquabble: {
        title: '¡Duelo acuático en la piscina Lido!',
        desc: 'Mantén el equilibrio sobre el flotador, esquiva los ataques de tu oponente y empújalo al agua para ganar.'
    },
    slotcar: {
        title: '¡Carreras Speedway a máxima velocidad!',
        desc: 'Controla la aceleración en las rectas y frena en las curvas para no descarrilar y llegar en primera posición.'
    },
    battleball: {
        title: '¡Batalla clásica de BattleBall!',
        desc: 'Rebota por la pista coloreando las baldosas y bloquea las áreas para conseguir la mayor puntuación de tu equipo.'
    }
};

export const GameView = () => {
    const { selectedGame, accountStatus, gameOffline, setGameURL } = useGameCenter();

    useEffect(() => {
        if (selectedGame) {
            SendMessageComposer(new GetGameStatusMessageComposer(selectedGame.gameId));
            SendMessageComposer(new Game2GetAccountGameStatusMessageComposer(selectedGame.gameId));
        }
    }, [selectedGame]);

    if (!selectedGame) return null;

    const getBgColour = (): string => {
        return selectedGame.bgColor ? ColorUtils.uintHexColor(selectedGame.bgColor) : '#1e293b';
    };

    const getBgImage = (): string => {
        return `url(${selectedGame.assetUrl}${selectedGame.gameNameId}_theme.png?v=4)`;
    };

    const onPlay = () => {
        if (gameOffline) return;
        
        SendMessageComposer(new JoinQueueMessageComposer(selectedGame.gameId));
    };

    const hasUnlimited = accountStatus ? accountStatus.hasUnlimitedGames : true;
    const freeGamesLeft = accountStatus ? accountStatus.freeGamesLeft : 5;

    const controls = useMemo(() => GAME_CONTROLS[ selectedGame.gameNameId ] || DEFAULT_CONTROLS, [ selectedGame ]);
    const gameDesc = GAME_DESCRIPTIONS[ selectedGame.gameNameId ] || {
        title: '¡Prepárate para la acción!',
        desc: 'Disfruta de este clásico minijuego multijugador con tus amigos en Habbten.'
    };

    return (
        <Flex 
            className="game-view p-4" 
            column
            fullHeight 
            justifyContent="between"
            style={{ 
                backgroundColor: getBgColour(), 
                backgroundImage: getBgImage()
            }}
        >
            <Flex className="game-view-main-content my-auto" fullWidth justifyContent="between" alignItems="center" gap={ 5 }>
                <Flex className="game-view-left-col" column gap={ 2 } style={{ maxWidth: '480px' }}>
                    <Base className="game-tag-badge">
                        MINIJUEGO OFICIAL
                    </Base>

                    <Base className="game-logo-wrapper">
                        <img 
                            src={ `${ selectedGame.assetUrl }${ selectedGame.gameNameId }_logo.png?v=6` } 
                            alt={ selectedGame.gameNameId }
                            className="game-hero-logo" 
                            style={{ maxHeight: '110px', maxWidth: '340px', objectFit: 'contain', borderRadius: '8px' }}
                        />
                    </Base>

                    <Base className="game-info-box p-3">
                        <div className="game-tagline mb-2">
                            { gameDesc.title }
                        </div>
                        <div className="game-description-text">
                            { gameDesc.desc }
                        </div>
                    </Base>
                </Flex>

                <Flex className="game-view-right-col" column gap={ 3 } style={{ maxWidth: '380px', width: '380px' }}>
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
                            { controls.map((control, index) => (
                                <div key={ index }>• <b>{ control.keys }:</b> { control.action }</div>
                            )) }
                        </Flex>
                    </Base>
                </Flex>
            </Flex>

            <Flex column alignItems="center" justifyContent="center" gap={ 1 } className="game-view-cta-row pb-2">
                <Button 
                    variant={ gameOffline ? 'secondary' : 'success' } 
                    disabled={ gameOffline }
                    className="btn-play-game px-5 py-2" 
                    onClick={ onPlay }
                >
                    { gameOffline ? 'En Mantenimiento' : '¡JUGAR AHORA!' }
                </Button>

                <Flex column alignItems="center" gap={ 0 } className="mt-1">
                    <Text variant="white" bold className="game-status-label text-center">
                        { hasUnlimited ? 'Partidas ilimitadas activas (Club HC)' : `${ freeGamesLeft } partidas gratuitas restantes hoy` }
                    </Text>
                    <Text variant="white" small className="game-server-status text-center">
                        { gameOffline ? 'Servidor temporalmente pausado' : 'Servidor en línea' }
                    </Text>
                </Flex>
            </Flex>
        </Flex>
    );
};
