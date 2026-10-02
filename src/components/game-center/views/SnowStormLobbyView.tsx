import { FC, useState } from 'react';
import { JoinQueueMessageComposer } from '@nitrots/nitro-renderer';
import { CreateLinkEvent, SendMessageComposer } from '../../../api';
import { DraggableWindow, DraggableWindowPosition } from '../../../common';
import { useGameCenter } from '../../../hooks';
import SnowStormLobbyImg from '../../../assets/images/gamecenter/snowstorm_lobby.png';

export const SnowStormLobbyView: FC<{}> = () =>
{
    const { isSnowStormLobbyVisible, setIsSnowStormLobbyVisible, selectedGame } = useGameCenter();
    const [ isQueueing, setIsQueueing ] = useState(false);

    if(!isSnowStormLobbyVisible) return null;

    const onClose = () =>
    {
        setIsSnowStormLobbyVisible(false);
    };

    const onPlayNow = () =>
    {
        setIsQueueing(true);
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
                        borderRadius: '4px',
                        backgroundColor: 'transparent',
                        transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={ e => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)') }
                    onMouseLeave={ e => (e.currentTarget.style.backgroundColor = 'transparent') }
                />

                {/* Enlace Cómo jugar */}
                <div 
                    onClick={ onHowToPlay }
                    title="Cómo jugar a SnowStorm"
                    style={{
                        position: 'absolute',
                        top: '298px',
                        left: '160px',
                        width: '90px',
                        height: '20px',
                        cursor: 'pointer',
                        borderRadius: '3px'
                    }}
                    onMouseEnter={ e => (e.currentTarget.style.backgroundColor = 'rgba(15, 123, 189, 0.12)') }
                    onMouseLeave={ e => (e.currentTarget.style.backgroundColor = 'transparent') }
                />

                {/* Enlace Clasificación */}
                <div 
                    onClick={ onLeaderboard }
                    title="Ver Clasificación de SnowStorm"
                    style={{
                        position: 'absolute',
                        top: '328px',
                        left: '155px',
                        width: '100px',
                        height: '20px',
                        cursor: 'pointer',
                        borderRadius: '3px'
                    }}
                    onMouseEnter={ e => (e.currentTarget.style.backgroundColor = 'rgba(15, 123, 189, 0.12)') }
                    onMouseLeave={ e => (e.currentTarget.style.backgroundColor = 'transparent') }
                />

                {/* Enlace Logra juegos extras con HC */}
                <div 
                    onClick={ onGetHc }
                    title="Obtener más partidas con el Club HC"
                    style={{
                        position: 'absolute',
                        top: '378px',
                        left: '230px',
                        width: '165px',
                        height: '24px',
                        cursor: 'pointer',
                        borderRadius: '3px'
                    }}
                    onMouseEnter={ e => (e.currentTarget.style.backgroundColor = 'rgba(27, 80, 102, 0.12)') }
                    onMouseLeave={ e => (e.currentTarget.style.backgroundColor = 'transparent') }
                />

                {/* Botón comprar +10 */}
                <div 
                    onClick={ onBuyGames }
                    title="Comprar +10 partidas"
                    style={{
                        position: 'absolute',
                        top: '444px',
                        left: '13px',
                        width: '50px',
                        height: '52px',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        transition: 'filter 0.15s ease, transform 0.05s ease'
                    }}
                    onMouseEnter={ e => { e.currentTarget.style.filter = 'brightness(1.15)'; } }
                    onMouseLeave={ e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none'; } }
                    onMouseDown={ e => { e.currentTarget.style.transform = 'scale(0.96)'; } }
                    onMouseUp={ e => { e.currentTarget.style.transform = 'none'; } }
                />

                {/* Botón comprar +100 */}
                <div 
                    onClick={ onBuyGames }
                    title="Comprar +100 partidas"
                    style={{
                        position: 'absolute',
                        top: '444px',
                        left: '70px',
                        width: '50px',
                        height: '52px',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        transition: 'filter 0.15s ease, transform 0.05s ease'
                    }}
                    onMouseEnter={ e => { e.currentTarget.style.filter = 'brightness(1.15)'; } }
                    onMouseLeave={ e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none'; } }
                    onMouseDown={ e => { e.currentTarget.style.transform = 'scale(0.96)'; } }
                    onMouseUp={ e => { e.currentTarget.style.transform = 'none'; } }
                />

                {/* Botón comprar +300 */}
                <div 
                    onClick={ onBuyGames }
                    title="Comprar +300 partidas"
                    style={{
                        position: 'absolute',
                        top: '444px',
                        left: '128px',
                        width: '50px',
                        height: '52px',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        transition: 'filter 0.15s ease, transform 0.05s ease'
                    }}
                    onMouseEnter={ e => { e.currentTarget.style.filter = 'brightness(1.15)'; } }
                    onMouseLeave={ e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none'; } }
                    onMouseDown={ e => { e.currentTarget.style.transform = 'scale(0.96)'; } }
                    onMouseUp={ e => { e.currentTarget.style.transform = 'none'; } }
                />

                {/* Gran botón verde: ¡Jugar ahora! */}
                <div 
                    onClick={ onPlayNow }
                    title="¡Entrar en la batalla de SnowStorm!"
                    style={{
                        position: 'absolute',
                        top: '446px',
                        left: '200px',
                        width: '188px',
                        height: '48px',
                        cursor: 'pointer',
                        borderRadius: '6px',
                        transition: 'filter 0.12s ease, transform 0.05s ease'
                    }}
                    onMouseEnter={ e => { e.currentTarget.style.filter = 'brightness(1.12)'; } }
                    onMouseLeave={ e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none'; } }
                    onMouseDown={ e => { e.currentTarget.style.transform = 'translateY(1px)'; e.currentTarget.style.filter = 'brightness(0.95)'; } }
                    onMouseUp={ e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.filter = 'brightness(1.12)'; } }
                />
            </div>
        </DraggableWindow>
    );
};
