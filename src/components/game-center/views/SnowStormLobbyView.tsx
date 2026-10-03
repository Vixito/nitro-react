import { FC, useEffect, useState } from 'react';
import { Game2GetAccountGameStatusMessageComposer, JoinQueueMessageComposer } from '@nitrots/nitro-renderer';
import { FaBook, FaCheck, FaCoins, FaInfoCircle, FaTimes, FaTrophy } from 'react-icons/fa';
import { CreateLinkEvent, SendMessageComposer } from '../../../api';
import { Button, Column, DraggableWindow, DraggableWindowPosition, Flex, Text } from '../../../common';
import { useGameCenter } from '../../../hooks';
import SnowStormLobbyImg from '../../../assets/images/gamecenter/snowstorm_lobby.png';

export const SnowStormLobbyView: FC<{}> = () =>
{
    const { isSnowStormLobbyVisible, setIsSnowStormLobbyVisible, setIsVisible, selectedGame, accountStatus, setGameURL } = useGameCenter();
    const [ remainingGames, setRemainingGames ] = useState<number>(() =>
    {
        const saved = sessionStorage.getItem('snowstorm_games_left');
        return saved !== null ? parseInt(saved, 10) : 30;
    });

    const [ selectedPack, setSelectedPack ] = useState<10 | 100 | 300 | null>(null);
    const [ isBuyConfirmOpen, setIsBuyConfirmOpen ] = useState<boolean>(false);
    const [ isHowToPlayOpen, setIsHowToPlayOpen ] = useState<boolean>(false);
    const [ isLeaderboardOpen, setIsLeaderboardOpen ] = useState<boolean>(false);
    const [ toastMsg, setToastMsg ] = useState<string | null>(null);

    const showToast = (msg: string) =>
    {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 2500);
    };

    useEffect(() =>
    {
        if(isSnowStormLobbyVisible)
        {
            const gameId = selectedGame ? selectedGame.gameId : 0;
            SendMessageComposer(new Game2GetAccountGameStatusMessageComposer(gameId));
        }
    }, [ isSnowStormLobbyVisible, selectedGame ]);

    useEffect(() =>
    {
        if(!accountStatus) return;

        if(!accountStatus.hasUnlimitedGames && accountStatus.freeGamesLeft !== undefined && accountStatus.freeGamesLeft !== null && accountStatus.freeGamesLeft >= 0)
        {
            setRemainingGames(accountStatus.freeGamesLeft);
            sessionStorage.setItem('snowstorm_games_left', accountStatus.freeGamesLeft.toString());
        }
    }, [ accountStatus ]);

    if(!isSnowStormLobbyVisible) return null;

    const onClose = () =>
    {
        setIsSnowStormLobbyVisible(false);
    };

    const onPlayNow = () =>
    {
        setRemainingGames(prev =>
        {
            const next = Math.max(0, prev - 1);
            sessionStorage.setItem('snowstorm_games_left', next.toString());
            return next;
        });

        const gameId = selectedGame ? selectedGame.gameId : 0;
        SendMessageComposer(new JoinQueueMessageComposer(gameId));

        // Cerrar Lobby y GameCenter para retornar a la normalidad del hotel y abrir SnowStorm
        setIsSnowStormLobbyVisible(false);
        setIsVisible(false);
        setGameURL('/games/snowstorm/index.html');
    };

    const onHowToPlay = () =>
    {
        setIsHowToPlayOpen(true);
    };

    const onLeaderboard = () =>
    {
        setIsLeaderboardOpen(true);
    };

    const onGetHc = () =>
    {
        CreateLinkEvent('habboUI/open/hccenter');
        CreateLinkEvent('catalog/open/habbo_club');
    };

    const onSelectPack = (pack: 10 | 100 | 300) =>
    {
        setSelectedPack(pack);
        setIsBuyConfirmOpen(true);
    };

    const onConfirmBuy = () =>
    {
        if(!selectedPack) return;

        setRemainingGames(prev =>
        {
            const next = prev + selectedPack;
            sessionStorage.setItem('snowstorm_games_left', next.toString());
            return next;
        });

        showToast(`✓ ¡Has adquirido +${ selectedPack } partidas!`);
        setIsBuyConfirmOpen(false);
    };

    const displayGames = (accountStatus && accountStatus.hasUnlimitedGames) ? '∞' : remainingGames;

    const packPrices: Record<number, number> = {
        10: 5,
        100: 30,
        300: 70
    };

    return (
        <DraggableWindow 
            uniqueKey="snowstorm-lobby" 
            handleSelector=".drag-handler" 
            windowPosition={ DraggableWindowPosition.CENTER }
        >
            <div 
                className="snowstorm-lobby-window"
                style={{
                    width: '410px',
                    height: '527px',
                    backgroundImage: `url(${ SnowStormLobbyImg })`,
                    backgroundSize: '410px 527px',
                    backgroundRepeat: 'no-repeat',
                    position: 'relative',
                    borderRadius: '6px',
                    boxShadow: '0 12px 35px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(0, 0, 0, 0.4)',
                    imageRendering: 'pixelated',
                    userSelect: 'none',
                    overflow: 'hidden',
                    cursor: 'default'
                }}
            >
                {/* Zona superior exclusiva de arrastre (drag handler de 28px) */}
                <div 
                    className="drag-handler"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: 'calc(100% - 32px)',
                        height: '28px',
                        cursor: 'move',
                        zIndex: 5
                    }}
                />

                {/* Botón cerrar X superior derecho estilo Habbo auténtico */}
                <div 
                    className="snowstorm-lobby-close-btn"
                    onClick={ onClose }
                    title="Cerrar ventana"
                    style={{
                        position: 'absolute',
                        top: '5px',
                        right: '5px',
                        width: '19px',
                        height: '19px',
                        borderRadius: '3px',
                        border: '2px solid #921911',
                        boxShadow: '0 0 0 1.6px #ffffff',
                        background: 'repeating-linear-gradient(#f55041, #f55041 50%, #c23027 50%, #c23027 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 20,
                        transition: 'filter 0.1s ease, transform 0.05s ease'
                    }}
                    onMouseEnter={ e => (e.currentTarget.style.filter = 'brightness(1.25)') }
                    onMouseLeave={ e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none'; } }
                    onMouseDown={ e => { e.currentTarget.style.filter = 'brightness(0.85)'; e.currentTarget.style.transform = 'translateY(1px)'; } }
                    onMouseUp={ e => (e.currentTarget.style.transform = 'none') }
                >
                    <FaTimes style={{ color: '#ffffff', fontSize: '11px', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))' }} />
                </div>

                {/* Toast de confirmación dentro del lobby */}
                { toastMsg && (
                    <div 
                        style={{
                            position: 'absolute',
                            top: '40px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: '#00d9cb',
                            color: '#000000',
                            fontWeight: 'bold',
                            padding: '4px 14px',
                            borderRadius: '4px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                            zIndex: 40,
                            fontSize: '12px'
                        }}
                    >
                        { toastMsg }
                    </div>
                ) }

                {/* Subtítulo dinámico con 'Habbtens' */}
                <div
                    style={{
                        position: 'absolute',
                        top: '175px',
                        left: '0px',
                        width: '410px',
                        textAlign: 'center',
                        fontFamily: 'Ubuntu, "Segoe UI", sans-serif',
                        fontSize: '12px',
                        color: '#14729f',
                        lineHeight: '1.28',
                        pointerEvents: 'none',
                        userSelect: 'none'
                    }}
                >
                    ¡Enfréntate a otros Habbtens en unas<br />
                    épicas batallas de bolas de nieve!
                </div>

                {/* Enlace Cómo jugar */}
                <div 
                    onClick={ onHowToPlay }
                    title="Cómo jugar a SnowStorm"
                    style={{
                        position: 'absolute',
                        top: '304px',
                        left: '166px',
                        width: '78px',
                        height: '22px',
                        cursor: 'pointer',
                        zIndex: 6,
                        borderRadius: '2px'
                    }}
                    onMouseEnter={ e => (e.currentTarget.style.backgroundColor = 'rgba(0, 168, 255, 0.15)') }
                    onMouseLeave={ e => (e.currentTarget.style.backgroundColor = 'transparent') }
                />

                {/* Enlace Clasificación */}
                <div 
                    onClick={ onLeaderboard }
                    title="Ver Clasificación de SnowStorm"
                    style={{
                        position: 'absolute',
                        top: '333px',
                        left: '164px',
                        width: '82px',
                        height: '24px',
                        cursor: 'pointer',
                        zIndex: 6,
                        borderRadius: '2px'
                    }}
                    onMouseEnter={ e => (e.currentTarget.style.backgroundColor = 'rgba(0, 168, 255, 0.15)') }
                    onMouseLeave={ e => (e.currentTarget.style.backgroundColor = 'transparent') }
                />

                {/* Contador numérico de partidas restantes (fiel al Habbo original: blanco con contorno azul) */}
                <div
                    style={{
                        position: 'absolute',
                        top: '402px',
                        left: '148px',
                        fontFamily: 'Ubuntu, "Segoe UI", sans-serif',
                        fontSize: '15px',
                        fontWeight: 'bold',
                        color: '#ffffff',
                        textShadow: '-1px -1px 0 #006a9e, 1px -1px 0 #006a9e, -1px 1px 0 #006a9e, 1px 1px 0 #006a9e, 0px 1px 0 #004c73',
                        letterSpacing: '-0.3px',
                        pointerEvents: 'none',
                        userSelect: 'none',
                        zIndex: 7
                    }}
                >
                    { displayGames }
                </div>

                {/* Enlace Logra juegos extras con HC */}
                <div 
                    onClick={ onGetHc }
                    title="Obtener más partidas con el Club HC"
                    style={{
                        position: 'absolute',
                        top: '400px',
                        left: '204px',
                        width: '186px',
                        height: '28px',
                        cursor: 'pointer',
                        zIndex: 8,
                        borderRadius: '3px',
                        transition: 'filter 0.1s ease, transform 0.05s ease'
                    }}
                    onMouseEnter={ e => (e.currentTarget.style.filter = 'brightness(1.18)') }
                    onMouseLeave={ e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none'; } }
                    onMouseDown={ e => (e.currentTarget.style.transform = 'translateY(1px)') }
                    onMouseUp={ e => (e.currentTarget.style.transform = 'none') }
                />

                {/* Botón comprar +10 */}
                <div 
                    onClick={ () => onSelectPack(10) }
                    title="Comprar +10 partidas (5 créditos)"
                    style={{
                        position: 'absolute',
                        top: '446px',
                        left: '13px',
                        width: '52px',
                        height: '62px',
                        cursor: 'pointer',
                        zIndex: 8,
                        borderRadius: '4px',
                        boxShadow: selectedPack === 10 ? '0 0 0 2px #ffffff, 0 0 0 4px #00d9cb' : 'none',
                        transition: 'filter 0.1s ease, transform 0.05s ease, box-shadow 0.15s ease'
                    }}
                    onMouseEnter={ e => (e.currentTarget.style.filter = 'brightness(1.15)') }
                    onMouseLeave={ e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none'; } }
                    onMouseDown={ e => { e.currentTarget.style.transform = 'translateY(1px)'; e.currentTarget.style.filter = 'brightness(0.9)'; } }
                    onMouseUp={ e => (e.currentTarget.style.transform = 'none') }
                />

                {/* Botón comprar +100 */}
                <div 
                    onClick={ () => onSelectPack(100) }
                    title="Comprar +100 partidas (30 créditos)"
                    style={{
                        position: 'absolute',
                        top: '446px',
                        left: '73px',
                        width: '52px',
                        height: '62px',
                        cursor: 'pointer',
                        zIndex: 8,
                        borderRadius: '4px',
                        boxShadow: selectedPack === 100 ? '0 0 0 2px #ffffff, 0 0 0 4px #00d9cb' : 'none',
                        transition: 'filter 0.1s ease, transform 0.05s ease, box-shadow 0.15s ease'
                    }}
                    onMouseEnter={ e => (e.currentTarget.style.filter = 'brightness(1.15)') }
                    onMouseLeave={ e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none'; } }
                    onMouseDown={ e => { e.currentTarget.style.transform = 'translateY(1px)'; e.currentTarget.style.filter = 'brightness(0.9)'; } }
                    onMouseUp={ e => (e.currentTarget.style.transform = 'none') }
                />

                {/* Botón comprar +300 */}
                <div 
                    onClick={ () => onSelectPack(300) }
                    title="Comprar +300 partidas (70 créditos)"
                    style={{
                        position: 'absolute',
                        top: '446px',
                        left: '133px',
                        width: '52px',
                        height: '62px',
                        cursor: 'pointer',
                        zIndex: 8,
                        borderRadius: '4px',
                        boxShadow: selectedPack === 300 ? '0 0 0 2px #ffffff, 0 0 0 4px #00d9cb' : 'none',
                        transition: 'filter 0.1s ease, transform 0.05s ease, box-shadow 0.15s ease'
                    }}
                    onMouseEnter={ e => (e.currentTarget.style.filter = 'brightness(1.15)') }
                    onMouseLeave={ e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none'; } }
                    onMouseDown={ e => { e.currentTarget.style.transform = 'translateY(1px)'; e.currentTarget.style.filter = 'brightness(0.9)'; } }
                    onMouseUp={ e => (e.currentTarget.style.transform = 'none') }
                />

                {/* Gran botón verde: ¡Jugar ahora! */}
                <div 
                    onClick={ onPlayNow }
                    title="¡Entrar en la batalla de SnowStorm!"
                    style={{
                        position: 'absolute',
                        top: '446px',
                        left: '206px',
                        width: '189px',
                        height: '62px',
                        cursor: 'pointer',
                        zIndex: 8,
                        borderRadius: '6px',
                        transition: 'filter 0.1s ease, transform 0.05s ease'
                    }}
                    onMouseEnter={ e => (e.currentTarget.style.filter = 'brightness(1.12)') }
                    onMouseLeave={ e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none'; } }
                    onMouseDown={ e => { e.currentTarget.style.transform = 'translateY(2px)'; e.currentTarget.style.filter = 'brightness(0.85)'; } }
                    onMouseUp={ e => (e.currentTarget.style.transform = 'none') }
                />

                {/* Modal: Confirmación de compra de partidas */}
                { isBuyConfirmOpen && selectedPack && (
                    <div 
                        style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.72)',
                            zIndex: 60,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '20px'
                        }}
                    >
                        <div 
                            style={{
                                width: '310px',
                                background: '#2d2d2d',
                                border: '2px solid #1a1a1a',
                                borderRadius: '6px',
                                boxShadow: '0 8px 30px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.1)',
                                overflow: 'hidden'
                            }}
                        >
                            <Flex 
                                alignItems="center" 
                                justifyContent="between" 
                                className="px-3 py-2"
                                style={{
                                    background: 'repeating-linear-gradient(#3a78a6, #3a78a6 50%, #275a80 50%, #275a80 100%)',
                                    borderBottom: '2px solid #1a3c5a'
                                }}
                            >
                                <Text bold variant="white" style={{ fontSize: '13px' }}>
                                    Comprar partidas SnowStorm
                                </Text>
                                <FaTimes 
                                    style={{ color: '#fff', cursor: 'pointer', fontSize: '12px' }} 
                                    onClick={ () => setIsBuyConfirmOpen(false) } 
                                />
                            </Flex>

                            <div className="p-3 text-white text-center">
                                <FaCoins style={{ fontSize: '30px', color: '#facc15', marginBottom: '8px' }} />
                                <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '6px' }}>
                                    Pack de +{ selectedPack } partidas
                                </div>
                                <div style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '16px' }}>
                                    Precio: <strong style={{ color: '#facc15' }}>{ packPrices[selectedPack] } créditos</strong>
                                </div>

                                <Flex gap={ 2 } justifyContent="center">
                                    <Button variant="success" onClick={ onConfirmBuy }>
                                        <FaCheck className="me-1" />
                                        <span>Comprar ahora</span>
                                    </Button>
                                    <Button variant="secondary" onClick={ () => setIsBuyConfirmOpen(false) }>
                                        <span>Cancelar</span>
                                    </Button>
                                </Flex>
                            </div>
                        </div>
                    </div>
                ) }

                {/* Modal: Cómo jugar a SnowStorm */}
                { isHowToPlayOpen && (
                    <div 
                        style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.72)',
                            zIndex: 60,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '16px'
                        }}
                    >
                        <div 
                            style={{
                                width: '350px',
                                background: '#242424',
                                border: '2px solid #141414',
                                borderRadius: '6px',
                                boxShadow: '0 8px 30px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.1)',
                                overflow: 'hidden'
                            }}
                        >
                            <Flex 
                                alignItems="center" 
                                justifyContent="between" 
                                className="px-3 py-2"
                                style={{
                                    background: 'repeating-linear-gradient(#3a78a6, #3a78a6 50%, #275a80 50%, #275a80 100%)',
                                    borderBottom: '2px solid #1a3c5a'
                                }}
                            >
                                <Flex alignItems="center" gap={ 1 }>
                                    <FaBook style={{ color: '#fff', fontSize: '12px' }} />
                                    <Text bold variant="white" style={{ fontSize: '13px' }}>
                                        Cómo jugar a SnowStorm
                                    </Text>
                                </Flex>
                                <FaTimes 
                                    style={{ color: '#fff', cursor: 'pointer', fontSize: '12px' }} 
                                    onClick={ () => setIsHowToPlayOpen(false) } 
                                />
                            </Flex>

                            <div className="p-3 text-white" style={{ fontSize: '11px', lineHeight: '1.4' }}>
                                <div className="mb-2">
                                    <strong style={{ color: '#38bdf8' }}>🎯 Objetivo:</strong> Derriba a los miembros del equipo rival a base de bolas de nieve antes de que termine el tiempo.
                                </div>
                                <div className="mb-2">
                                    <strong style={{ color: '#38bdf8' }}>🏃 Moverte:</strong> Haz clic izquierdo en la pista nevada para mover a tu Habbo.
                                </div>
                                <div className="mb-2">
                                    <strong style={{ color: '#38bdf8' }}>❄️ Lanzar bolas:</strong> Haz clic en un oponente para apuntar y lanzar. Mantén pulsado para tiros más potentes y lejanos.
                                </div>
                                <div className="mb-2">
                                    <strong style={{ color: '#38bdf8' }}>⛄ Fabricar bolas:</strong> Pulsa la <em>Barra Espaciadora</em> o haz clic en tu personaje para agacharte y fabricar más bolas de nieve.
                                </div>
                                <div className="mb-3">
                                    <strong style={{ color: '#38bdf8' }}>🌲 Cobertura:</strong> Refúgiate tras los árboles y muñecos de nieve para bloquear los lanzamientos enemigos.
                                </div>

                                <Flex justifyContent="center">
                                    <Button variant="primary" onClick={ () => setIsHowToPlayOpen(false) }>
                                        <span>¡Entendido!</span>
                                    </Button>
                                </Flex>
                            </div>
                        </div>
                    </div>
                ) }

                {/* Modal: Clasificación de SnowStorm */}
                { isLeaderboardOpen && (
                    <div 
                        style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.72)',
                            zIndex: 60,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '16px'
                        }}
                    >
                        <div 
                            style={{
                                width: '340px',
                                background: '#242424',
                                border: '2px solid #141414',
                                borderRadius: '6px',
                                boxShadow: '0 8px 30px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.1)',
                                overflow: 'hidden'
                            }}
                        >
                            <Flex 
                                alignItems="center" 
                                justifyContent="between" 
                                className="px-3 py-2"
                                style={{
                                    background: 'repeating-linear-gradient(#3a78a6, #3a78a6 50%, #275a80 50%, #275a80 100%)',
                                    borderBottom: '2px solid #1a3c5a'
                                }}
                            >
                                <Flex alignItems="center" gap={ 1 }>
                                    <FaTrophy style={{ color: '#facc15', fontSize: '13px' }} />
                                    <Text bold variant="white" style={{ fontSize: '13px' }}>
                                        Clasificación Semanal
                                    </Text>
                                </Flex>
                                <FaTimes 
                                    style={{ color: '#fff', cursor: 'pointer', fontSize: '12px' }} 
                                    onClick={ () => setIsLeaderboardOpen(false) } 
                                />
                            </Flex>

                            <div className="p-3 text-white">
                                <div style={{ fontSize: '11px', color: '#a1a1aa', marginBottom: '8px' }}>
                                    Los mejores guerreros de la nieve de esta semana:
                                </div>

                                <div className="mb-3" style={{ fontSize: '12px' }}>
                                    <Flex justifyContent="between" className="py-1 px-2 border-bottom border-secondary" style={{ background: '#2f2f2f', borderRadius: '3px 3px 0 0' }}>
                                        <span>🥇 <strong>Vixis</strong></span>
                                        <span style={{ color: '#facc15', fontWeight: 'bold' }}>1,480 pts</span>
                                    </Flex>
                                    <Flex justifyContent="between" className="py-1 px-2 border-bottom border-secondary">
                                        <span>🥈 <strong>SnowMaster</strong></span>
                                        <span style={{ color: '#e4e4e7' }}>1,210 pts</span>
                                    </Flex>
                                    <Flex justifyContent="between" className="py-1 px-2 border-bottom border-secondary">
                                        <span>🥉 <strong>FrostyHabbo</strong></span>
                                        <span style={{ color: '#cd7f32' }}>970 pts</span>
                                    </Flex>
                                    <Flex justifyContent="between" className="py-1 px-2 border-bottom border-secondary">
                                        <span>4. BlizzardHero</span>
                                        <span style={{ color: '#a1a1aa' }}>840 pts</span>
                                    </Flex>
                                    <Flex justifyContent="between" className="py-1 px-2" style={{ background: '#1c1c1c', borderRadius: '0 0 3px 3px' }}>
                                        <span>5. IceKing</span>
                                        <span style={{ color: '#a1a1aa' }}>720 pts</span>
                                    </Flex>
                                </div>

                                <Flex justifyContent="center">
                                    <Button variant="secondary" onClick={ () => setIsLeaderboardOpen(false) }>
                                        <span>Cerrar</span>
                                    </Button>
                                </Flex>
                            </div>
                        </div>
                    </div>
                ) }
            </div>
        </DraggableWindow>
    );
};
