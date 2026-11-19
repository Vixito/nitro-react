import { Game2GetAccountGameStatusMessageComposer, GetGameStatusMessageComposer, JoinQueueMessageComposer } from '@nitrots/nitro-renderer';
import { useEffect, useMemo, useState } from 'react';
import { ColorUtils, GetClubMemberLevel, SendMessageComposer } from '../../../api';
import { Base, Button, Flex, Text } from '../../../common';
import { useGameCenter } from '../../../hooks';

const GAME_CONTROLS: { [ gameNameId: string ]: { action: string; keys: string }[] } = {
    snowwar: [
        { action: 'Mover personaje', keys: 'Clic en el suelo / WASD' },
        { action: 'Lanzar bola directa', keys: 'Clic en rival / SHIFT + Clic' },
        { action: 'Tiro alto (sobre obstáculos)', keys: 'Clic derecho / CTRL + Clic' },
        { action: 'Hacer bolas de nieve', keys: 'Espacio / Guante verde' },
        { action: 'Chat de equipo', keys: 'Enter' }
    ],
    basejump: [
        { action: 'Esquivar obstáculos', keys: 'A / D o Flechas Izq/Der' },
        { action: 'Abrir / cerrar paracaídas', keys: 'Espacio' }
    ],
    wobblesquabble: [
        { action: 'Mantener equilibrio', keys: 'Q / E' },
        { action: 'Empujar al rival', keys: 'A / D' },
        { action: 'Moverse por los flotadores', keys: 'N / M o Flechas Izq/Der' },
        { action: 'Estabilizar al centro', keys: 'Espacio' }
    ],
    slotcar: [
        { action: 'Acelerar', keys: 'Espacio / Flecha Arriba / W' }
    ],
    battleball: [
        { action: 'Mover saltador y colorear baldosas', keys: 'Clic en el suelo / WASD / Flechas' },
        { action: 'Activar poder especial recogido', keys: 'Espacio / Clic en la casilla de poder' },
        { action: 'Chat de equipo', keys: 'Enter' }
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
    const { isVisible, selectedGame, gameOffline, setGameURL, setIsVisible, setIsSnowStormLobbyVisible, isSnowStormLobbyVisible, isSnowStormPlaying, isBattleBallPlaying, setIsBattleBallPlaying, isWobbleSquabblePlaying, setIsWobbleSquabblePlaying } = useGameCenter();
    const [ realStatus, setRealStatus ] = useState<{ games_left: number; has_unlimited: boolean } | null>(null);
    const [ launchError, setLaunchError ] = useState<string | null>(null);
    const [ launching, setLaunching ] = useState<boolean>(false);

    useEffect(() => {
        setLaunchError(null);
        if (selectedGame) {
            SendMessageComposer(new GetGameStatusMessageComposer(selectedGame.gameId));
            SendMessageComposer(new Game2GetAccountGameStatusMessageComposer(selectedGame.gameId));
        }
    }, [selectedGame]);

    // Sync real remaining games & HC unlimited status from Habbten backend (never Arcturus dummy 100)
    useEffect(() => {
        if (!isVisible) return;
        let cancelled = false;
        const statusEndpoint = selectedGame?.gameNameId === 'battleball'
            ? '/api/games/battleball/status'
            : (selectedGame?.gameNameId === 'wobblesquabble'
                ? '/api/games/wobblesquabble/status'
                : '/api/games/snowstorm/status');
        fetch(statusEndpoint, { credentials: 'include' })
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (!cancelled && data && data.success) {
                    setRealStatus({
                        games_left: typeof data.games_left === 'number' ? data.games_left : 5,
                        has_unlimited: !!data.has_unlimited
                    });
                }
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [ isVisible, selectedGame, isSnowStormLobbyVisible, isSnowStormPlaying, isBattleBallPlaying, isWobbleSquabblePlaying ]);

    const controls = useMemo(() => (selectedGame && GAME_CONTROLS[ selectedGame.gameNameId ]) || DEFAULT_CONTROLS, [ selectedGame ]);

    if (!selectedGame) return null;

    const getBgColour = (): string => {
        return selectedGame.bgColor ? ColorUtils.uintHexColor(selectedGame.bgColor) : '#1e293b';
    };

    const getBgImage = (): string => {
        return `url(${selectedGame.assetUrl}${selectedGame.gameNameId}_theme.png?v=5)`;
    };

    const onPlay = async () => {
        if (gameOffline || launching) return;
        setLaunchError(null);
        
        if (selectedGame && (selectedGame.gameNameId === 'snowwar' || selectedGame.gameNameId === 'snowstorm')) {
            setIsVisible(false);
            setIsSnowStormLobbyVisible(true);
            return;
        }

        if (selectedGame && selectedGame.gameNameId === 'battleball') {
            setLaunching(true);
            try {
                const res = await fetch('/api/games/battleball/start', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await res.json();
                if (!res.ok || !data.success) {
                    setLaunchError(data.error || 'Has agotado tus partidas gratuitas de hoy. ¡Hazte Habbten Club para partidas ilimitadas!');
                    setLaunching(false);
                    return;
                }
                setIsVisible(false);
                setIsBattleBallPlaying(true);
            } catch {
                setLaunchError('Error de conexión con el servidor de Battle Ball.');
            } finally {
                setLaunching(false);
            }
            return;
        }

        if (selectedGame && selectedGame.gameNameId === 'wobblesquabble') {
            setLaunching(true);
            try {
                const res = await fetch('/api/games/wobblesquabble/start', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await res.json();
                if (!res.ok || !data.success) {
                    setLaunchError(data.error || 'Has agotado tus partidas gratuitas de hoy. ¡Hazte Habbten Club para partidas ilimitadas!');
                    setLaunching(false);
                    return;
                }
                setIsVisible(false);
                setIsWobbleSquabblePlaying(true);
            } catch {
                setLaunchError('Error de conexión con el servidor de Wobble Squabble.');
            } finally {
                setLaunching(false);
            }
            return;
        }

        SendMessageComposer(new JoinQueueMessageComposer(selectedGame.gameId));

        const gameUrls: { [name: string]: string } = {
            basejump: '/games/basejump/index.html',
            wobblesquabble: '/games/wobblesquabble/index.html',
            slotcar: '/games/slotcar/index.html'
        };

        if (selectedGame && gameUrls[selectedGame.gameNameId]) {
            setIsVisible(false);
            setGameURL(gameUrls[selectedGame.gameNameId]);
        }
    };

    const isHcActive = (realStatus?.has_unlimited ?? false) || (GetClubMemberLevel() > 0);
    const hasUnlimited = isHcActive;
    const freeGamesLeft = realStatus ? realStatus.games_left : 5;

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
                            src={ `${ selectedGame.assetUrl }${ selectedGame.gameNameId }_logo.png?v=7` } 
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
                { launchError && (
                    <Text variant="white" small bold className="text-center px-3 py-1 mb-1 rounded" style={{ backgroundColor: 'rgba(185, 28, 28, 0.9)', border: '1px solid #fca5a5' }}>
                        { launchError }
                    </Text>
                ) }
                <Button 
                    variant={ gameOffline ? 'secondary' : 'success' } 
                    disabled={ gameOffline || launching }
                    className="btn-play-game px-5 py-2" 
                    onClick={ onPlay }
                >
                    { gameOffline ? 'En Mantenimiento' : (launching ? 'Conectando...' : '¡JUGAR AHORA!') }
                </Button>

                <Flex column alignItems="center" gap={ 0 } className="mt-1">
                    <Text variant="white" bold className="game-status-label text-center">
                        { hasUnlimited
                            ? 'Partidas ilimitadas activas (Habbten Club)'
                            : (freeGamesLeft === 1
                                ? '1 partida gratuita restante hoy'
                                : `${ freeGamesLeft } partidas gratuitas restantes hoy`) }
                    </Text>
                    <Text variant="white" small className="game-server-status text-center">
                        { gameOffline ? 'Servidor temporalmente pausado' : 'Servidor en línea' }
                    </Text>
                </Flex>
            </Flex>
        </Flex>
    );
};
