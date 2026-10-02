import { FC, useEffect, useState } from 'react';
import { Game2GetAccountGameStatusMessageComposer, JoinQueueMessageComposer } from '@nitrots/nitro-renderer';
import { CreateLinkEvent, SendMessageComposer } from '../../../api';
import { DraggableWindow, DraggableWindowPosition } from '../../../common';
import { useGameCenter } from '../../../hooks';
import SnowStormLobbyImg from '../../../assets/images/gamecenter/snowstorm_lobby.png';

export const SnowStormLobbyView: FC<{}> = () =>
{
    const { isSnowStormLobbyVisible, setIsSnowStormLobbyVisible, selectedGame, accountStatus } = useGameCenter();
    const [ isQueueing, setIsQueueing ] = useState(false);
    const [ remainingGames, setRemainingGames ] = useState<number>(() =>
    {
        const saved = sessionStorage.getItem('snowstorm_games_left');
        return saved !== null ? parseInt(saved, 10) : 30;
    });

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
        setIsQueueing(true);
        setRemainingGames(prev =>
        {
            const next = Math.max(0, prev - 1);
            sessionStorage.setItem('snowstorm_games_left', next.toString());
            return next;
        });
        const gameId = selectedGame ? selectedGame.gameId : 0;
        SendMessageComposer(new JoinQueueMessageComposer(gameId));
    };

    const onHowToPlay = () =>
    {
        CreateLinkEvent('habbopages/chat/commands');
    };

    const onLeaderboard = () =>
    {
        CreateLinkEvent('leaderboards/show');
    };

    const onGetHc = () =>
    {
        CreateLinkEvent('habbtenclub/open');
    };

    const onBuyGames = () =>
    {
        CreateLinkEvent('catalog/toggle');
    };

    const displayGames = (accountStatus && accountStatus.hasUnlimitedGames) ? '∞' : remainingGames;

    return (
        <DraggableWindow 
            uniqueKey="snowstorm-lobby" 
            handleSelector=".drag-handler" 
            windowPosition={ DraggableWindowPosition.CENTER }
        >
            <div 
                className="snowstorm-lobby-window drag-handler"
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
                    cursor: 'grab'
                }}
            >
                {/* Botón cerrar X superior derecho */}
                <div 
                    className="snowstorm-lobby-close-btn"
                    onClick={ onClose }
                    title="Cerrar ventana"
                    style={{
                        position: 'absolute',
                        top: '4px',
                        right: '5px',
                        width: '22px',
                        height: '22px',
                        cursor: 'pointer',
                        transition: 'filter 0.1s ease, transform 0.05s ease'
                    }}
                    onMouseEnter={ e => (e.currentTarget.style.filter = 'brightness(1.2)') }
                    onMouseLeave={ e => (e.currentTarget.style.filter = 'none') }
                    onMouseDown={ e => (e.currentTarget.style.transform = 'scale(0.92)') }
                    onMouseUp={ e => (e.currentTarget.style.transform = 'none') }
                />

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
                        cursor: 'pointer'
                    }}
                    onMouseEnter={ e => (e.currentTarget.style.filter = 'brightness(1.15)') }
                    onMouseLeave={ e => (e.currentTarget.style.filter = 'none') }
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
                        cursor: 'pointer'
                    }}
                    onMouseEnter={ e => (e.currentTarget.style.filter = 'brightness(1.15)') }
                    onMouseLeave={ e => (e.currentTarget.style.filter = 'none') }
                />

                {/* Contador dinámico de partidas restantes */}
                <div
                    style={{
                        position: 'absolute',
                        top: '400px',
                        left: '148px',
                        fontFamily: 'Ubuntu, "Segoe UI", sans-serif',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: '#0b689e',
                        textShadow: '-1.5px -1.5px 0 #fff, 1.5px -1.5px 0 #fff, -1.5px 1.5px 0 #fff, 1.5px 1.5px 0 #fff',
                        letterSpacing: '-0.5px',
                        pointerEvents: 'none',
                        userSelect: 'none'
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
                        cursor: 'pointer'
                    }}
                    onMouseEnter={ e => (e.currentTarget.style.filter = 'brightness(1.12)') }
                    onMouseLeave={ e => (e.currentTarget.style.filter = 'none') }
                />

                {/* Botón comprar +10 */}
                <div 
                    onClick={ onBuyGames }
                    title="Comprar +10 partidas"
                    style={{
                        position: 'absolute',
                        top: '446px',
                        left: '13px',
                        width: '52px',
                        height: '62px',
                        cursor: 'pointer',
                        transition: 'filter 0.12s ease, transform 0.05s ease'
                    }}
                    onMouseEnter={ e => { e.currentTarget.style.filter = 'brightness(1.12)'; } }
                    onMouseLeave={ e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none'; } }
                    onMouseDown={ e => { e.currentTarget.style.transform = 'translateY(1px)'; } }
                    onMouseUp={ e => { e.currentTarget.style.transform = 'none'; } }
                />

                {/* Botón comprar +100 */}
                <div 
                    onClick={ onBuyGames }
                    title="Comprar +100 partidas"
                    style={{
                        position: 'absolute',
                        top: '446px',
                        left: '73px',
                        width: '52px',
                        height: '62px',
                        cursor: 'pointer',
                        transition: 'filter 0.12s ease, transform 0.05s ease'
                    }}
                    onMouseEnter={ e => { e.currentTarget.style.filter = 'brightness(1.12)'; } }
                    onMouseLeave={ e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none'; } }
                    onMouseDown={ e => { e.currentTarget.style.transform = 'translateY(1px)'; } }
                    onMouseUp={ e => { e.currentTarget.style.transform = 'none'; } }
                />

                {/* Botón comprar +300 */}
                <div 
                    onClick={ onBuyGames }
                    title="Comprar +300 partidas"
                    style={{
                        position: 'absolute',
                        top: '446px',
                        left: '133px',
                        width: '52px',
                        height: '62px',
                        cursor: 'pointer',
                        transition: 'filter 0.12s ease, transform 0.05s ease'
                    }}
                    onMouseEnter={ e => { e.currentTarget.style.filter = 'brightness(1.12)'; } }
                    onMouseLeave={ e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none'; } }
                    onMouseDown={ e => { e.currentTarget.style.transform = 'translateY(1px)'; } }
                    onMouseUp={ e => { e.currentTarget.style.transform = 'none'; } }
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
                        transition: 'filter 0.12s ease, transform 0.05s ease'
                    }}
                    onMouseEnter={ e => { e.currentTarget.style.filter = 'brightness(1.08)'; } }
                    onMouseLeave={ e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none'; } }
                    onMouseDown={ e => { e.currentTarget.style.transform = 'translateY(1px)'; e.currentTarget.style.filter = 'brightness(0.92)'; } }
                    onMouseUp={ e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.filter = 'brightness(1.08)'; } }
                />
            </div>
        </DraggableWindow>
    );
};
