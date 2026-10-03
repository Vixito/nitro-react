import { FC, useEffect, useState } from 'react';
import { Game2GetAccountGameStatusMessageComposer, JoinQueueMessageComposer } from '@nitrots/nitro-renderer';
import { FaTimes } from 'react-icons/fa';
import { CreateLinkEvent, LocalizeText, SendMessageComposer } from '../../../api';
import { Button, Column, DraggableWindow, DraggableWindowPosition, Flex, NitroCardContentView, NitroCardHeaderView, NitroCardView, Text } from '../../../common';
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
        <>
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
                    {/* Barra superior de arrastre exclusiva (28px de alto) */}
                    <div 
                        className="drag-handler"
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: 'calc(100% - 34px)',
                            height: '28px',
                            cursor: 'move',
                            zIndex: 5
                        }}
                    />

                    {/* Botón cerrar X superior derecho: alineado con la X del fondo */}
                    <div 
                        className="snowstorm-lobby-close-btn"
                        onClick={ onClose }
                        title="Cerrar ventana"
                        style={{
                            position: 'absolute',
                            top: '8px',
                            right: '9px',
                            width: '17px',
                            height: '17px',
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
                        <FaTimes style={{ color: '#ffffff', fontSize: '10px', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))' }} />
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

                    {/* Enlace Cómo jugar: ubicado exactamente sobre el texto (y=316..334) con hover azul */}
                    <div 
                        onClick={ onHowToPlay }
                        title="Cómo jugar a SnowStorm"
                        style={{
                            position: 'absolute',
                            top: '315px',
                            left: '160px',
                            width: '88px',
                            height: '20px',
                            cursor: 'pointer',
                            zIndex: 10,
                            borderRadius: '4px',
                            transition: 'background-color 0.15s ease, box-shadow 0.15s ease'
                        }}
                        onMouseEnter={ e => {
                            e.currentTarget.style.backgroundColor = 'rgba(0, 168, 255, 0.28)';
                            e.currentTarget.style.boxShadow = '0 0 8px rgba(0, 168, 255, 0.4)';
                        } }
                        onMouseLeave={ e => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.boxShadow = 'none';
                        } }
                    />

                    {/* Enlace Clasificación: ubicado exactamente sobre el texto (y=351..368) con hover azul */}
                    <div 
                        onClick={ onLeaderboard }
                        title="Ver Clasificación de SnowStorm"
                        style={{
                            position: 'absolute',
                            top: '350px',
                            left: '158px',
                            width: '94px',
                            height: '20px',
                            cursor: 'pointer',
                            zIndex: 10,
                            borderRadius: '4px',
                            transition: 'background-color 0.15s ease, box-shadow 0.15s ease'
                        }}
                        onMouseEnter={ e => {
                            e.currentTarget.style.backgroundColor = 'rgba(0, 168, 255, 0.28)';
                            e.currentTarget.style.boxShadow = '0 0 8px rgba(0, 168, 255, 0.4)';
                        } }
                        onMouseLeave={ e => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.boxShadow = 'none';
                        } }
                    />

                    {/* Contador numérico de partidas restantes: exactamente a 148px para dejar 1 espacio natural tras el ':' (x=145) */}
                    <div
                        style={{
                            position: 'absolute',
                            top: '404px',
                            left: '148px',
                            height: '14px',
                            lineHeight: '1',
                            display: 'flex',
                            alignItems: 'center',
                            fontFamily: 'Ubuntu, "Segoe UI", sans-serif',
                            fontSize: '14px',
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
                            top: '404px',
                            left: '204px',
                            width: '185px',
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

                    {/* Botón comprar +10: alineación exacta al píxel (y=451..512, x=13..64) */}
                    <div 
                        onClick={ () => onSelectPack(10) }
                        title="Comprar +10 partidas (5 créditos)"
                        style={{
                            position: 'absolute',
                            top: '451px',
                            left: '13px',
                            width: '52px',
                            height: '62px',
                            cursor: 'pointer',
                            zIndex: 8,
                            borderRadius: '4px',
                            boxShadow: selectedPack === 10 ? 'inset 0 0 0 2px #ffffff, 0 0 0 2px #006a9e' : 'none',
                            transition: 'filter 0.1s ease, transform 0.05s ease'
                        }}
                        onMouseEnter={ e => (e.currentTarget.style.filter = 'brightness(1.15)') }
                        onMouseLeave={ e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none'; } }
                        onMouseDown={ e => { e.currentTarget.style.transform = 'translateY(1px)'; e.currentTarget.style.filter = 'brightness(0.9)'; } }
                        onMouseUp={ e => (e.currentTarget.style.transform = 'none') }
                    />

                    {/* Botón comprar +100: alineación exacta al píxel (y=451..512, x=73..124) */}
                    <div 
                        onClick={ () => onSelectPack(100) }
                        title="Comprar +100 partidas (30 créditos)"
                        style={{
                            position: 'absolute',
                            top: '451px',
                            left: '73px',
                            width: '52px',
                            height: '62px',
                            cursor: 'pointer',
                            zIndex: 8,
                            borderRadius: '4px',
                            boxShadow: selectedPack === 100 ? 'inset 0 0 0 2px #ffffff, 0 0 0 2px #006a9e' : 'none',
                            transition: 'filter 0.1s ease, transform 0.05s ease'
                        }}
                        onMouseEnter={ e => (e.currentTarget.style.filter = 'brightness(1.15)') }
                        onMouseLeave={ e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none'; } }
                        onMouseDown={ e => { e.currentTarget.style.transform = 'translateY(1px)'; e.currentTarget.style.filter = 'brightness(0.9)'; } }
                        onMouseUp={ e => (e.currentTarget.style.transform = 'none') }
                    />

                    {/* Botón comprar +300: alineación exacta al píxel (y=451..512, x=133..184) */}
                    <div 
                        onClick={ () => onSelectPack(300) }
                        title="Comprar +300 partidas (70 créditos)"
                        style={{
                            position: 'absolute',
                            top: '451px',
                            left: '133px',
                            width: '52px',
                            height: '62px',
                            cursor: 'pointer',
                            zIndex: 8,
                            borderRadius: '4px',
                            boxShadow: selectedPack === 300 ? 'inset 0 0 0 2px #ffffff, 0 0 0 2px #006a9e' : 'none',
                            transition: 'filter 0.1s ease, transform 0.05s ease'
                        }}
                        onMouseEnter={ e => (e.currentTarget.style.filter = 'brightness(1.15)') }
                        onMouseLeave={ e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none'; } }
                        onMouseDown={ e => { e.currentTarget.style.transform = 'translateY(1px)'; e.currentTarget.style.filter = 'brightness(0.9)'; } }
                        onMouseUp={ e => (e.currentTarget.style.transform = 'none') }
                    />

                    {/* Gran botón verde: ¡Jugar ahora! (y=464..512, x=206..395) */}
                    <div 
                        onClick={ onPlayNow }
                        title="¡Entrar en la batalla de SnowStorm!"
                        style={{
                            position: 'absolute',
                            top: '464px',
                            left: '206px',
                            width: '189px',
                            height: '48px',
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
                </div>
            </DraggableWindow>

            {/* Ventana Habbo Retro Illumina: Confirmación de compra de partidas */}
            { isBuyConfirmOpen && selectedPack && (
                <NitroCardView uniqueKey="snowstorm-buy-games" theme="primary-slim" windowPosition={ DraggableWindowPosition.CENTER } style={{ width: '330px', zIndex: 1100 }}>
                    <NitroCardHeaderView headerText={ LocalizeText('snowwar.buy_more_games') || 'Compra más partidas' } onCloseClick={ () => setIsBuyConfirmOpen(false) } />
                    <NitroCardContentView className="p-3">
                        <Column gap={ 2 } alignItems="center">
                            <Text bold center style={{ fontSize: '13px' }}>
                                Pack de +{ selectedPack } partidas
                            </Text>
                            <Text small center className="text-muted">
                                ¿Deseas adquirir este paquete de partidas por <strong className="text-dark">{ packPrices[selectedPack] } créditos</strong>?
                            </Text>
                            <hr className="w-100 my-1 bg-secondary" />
                            <Flex gap={ 2 } fullWidth justifyContent="center">
                                <Button fullWidth variant="success" onClick={ onConfirmBuy }>
                                    { LocalizeText('catalog.purchase_confirmation.buy') || 'Comprar' }
                                </Button>
                                <Button fullWidth variant="secondary" onClick={ () => setIsBuyConfirmOpen(false) }>
                                    { LocalizeText('cancel') || 'Cancelar' }
                                </Button>
                            </Flex>
                        </Column>
                    </NitroCardContentView>
                </NitroCardView>
            ) }

            {/* Ventana Habbo Retro Illumina: Cómo jugar a SnowStorm con textos oficiales */}
            { isHowToPlayOpen && (
                <NitroCardView uniqueKey="snowstorm-howto" theme="primary-slim" windowPosition={ DraggableWindowPosition.CENTER } style={{ width: '390px', zIndex: 1100 }}>
                    <NitroCardHeaderView headerText={ LocalizeText('snowwar.instructions.link') || 'Cómo jugar a SnowStorm' } onCloseClick={ () => setIsHowToPlayOpen(false) } />
                    <NitroCardContentView className="p-3">
                        <Column gap={ 2 }>
                            <Text bold>{ LocalizeText('gamecenter.snowwar.description_title') || '¡Ataca o te atacarán!' }</Text>
                            <Text small>{ LocalizeText('gamecenter.snowwar.description_content') || 'Juega rápido y mantén la cabeza fría: ataca o te atacarán. Cuando empiecen a volar las bolas de nieve, ¡solo un equipo ganará!' }</Text>
                            <hr className="my-1 bg-secondary" />
                            <Column gap={ 1 }>
                                <Text small>• { LocalizeText('snowwar.instructions.1') || 'Haz clic en las casillas vacías para moverte hacia ellas.' }</Text>
                                <Text small>• { LocalizeText('snowwar.instructions.2') || 'Haz clic sobre un rival para lanzarle una bola de nieve.' }</Text>
                                <Text small>• { LocalizeText('snowwar.instructions.3') || "Mantén pulsado 'SHIFT' para lanzar una bola a una casilla vacía." }</Text>
                                <Text small>• { LocalizeText('snowwar.instructions.4') || "Mantén pulsado 'ALT' para lanzar una bola por encima de obstáculos." }</Text>
                                <Text small>• { LocalizeText('snowwar.instructions.5') || 'Cuentas con limitadas bolas de nieve. Crea nuevas con el botón verde.' }</Text>
                            </Column>
                            <Button fullWidth variant="primary" className="mt-2" onClick={ () => setIsHowToPlayOpen(false) }>
                                { LocalizeText('snowwar.instructions.back') || 'Atrás' }
                            </Button>
                        </Column>
                    </NitroCardContentView>
                </NitroCardView>
            ) }

            {/* Ventana Habbo Retro Illumina: Clasificación de SnowStorm */}
            { isLeaderboardOpen && (
                <NitroCardView uniqueKey="snowstorm-leaderboard" theme="primary-slim" windowPosition={ DraggableWindowPosition.CENTER } style={{ width: '400px', zIndex: 1100 }}>
                    <NitroCardHeaderView headerText={ LocalizeText('snowwar.leaderboards.link') || 'Clasificación de SnowStorm' } onCloseClick={ () => setIsLeaderboardOpen(false) } />
                    <NitroCardContentView className="p-3">
                        <Column gap={ 2 }>
                            <Flex alignItems="center" justifyContent="between">
                                <Text bold style={{ fontSize: '14px', color: '#1a567c' }}>
                                    { LocalizeText('snowwar.leaderboard.this_week') || 'Esta semana' }
                                </Text>
                                <Text small bold className="text-secondary">Top Jugadores de Habbten</Text>
                            </Flex>
                            <div className="table-responsive" style={{ border: '1px solid #c7d2d9', borderRadius: '4px', overflow: 'hidden' }}>
                                <table className="table table-sm table-striped m-0" style={{ fontSize: '14px', fontFamily: 'Ubuntu, "Segoe UI", sans-serif' }}>
                                    <thead style={{ background: '#e2ebf0', borderBottom: '2px solid #b1c6d3' }}>
                                        <tr>
                                            <th style={{ width: '45px', padding: '6px 8px' }}>#</th>
                                            <th style={{ padding: '6px 8px' }}>Habbten</th>
                                            <th className="text-end" style={{ padding: '6px 8px' }}>{ LocalizeText('snowwar.stats.total_score') || 'PUNTOS' }</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td style={{ padding: '7px 8px' }}><b style={{ color: '#d97706' }}>🥇 1.</b></td>
                                            <td style={{ padding: '7px 8px' }}><b>Vixis</b></td>
                                            <td className="text-end fw-bold text-success" style={{ padding: '7px 8px' }}>1.480</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '7px 8px' }}><b style={{ color: '#64748b' }}>🥈 2.</b></td>
                                            <td style={{ padding: '7px 8px' }}><b>SnowMaster</b></td>
                                            <td className="text-end fw-bold" style={{ padding: '7px 8px' }}>1.210</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '7px 8px' }}><b style={{ color: '#b45309' }}>🥉 3.</b></td>
                                            <td style={{ padding: '7px 8px' }}><b>Frosty</b></td>
                                            <td className="text-end fw-bold" style={{ padding: '7px 8px' }}>970</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '7px 8px' }}><b>4.</b></td>
                                            <td style={{ padding: '7px 8px' }}>Blizzard</td>
                                            <td className="text-end" style={{ padding: '7px 8px' }}>840</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '7px 8px' }}><b>5.</b></td>
                                            <td style={{ padding: '7px 8px' }}>IceKing</td>
                                            <td className="text-end" style={{ padding: '7px 8px' }}>720</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <Button fullWidth variant="secondary" className="mt-2" onClick={ () => setIsLeaderboardOpen(false) }>
                                { LocalizeText('generic.close') || 'Cerrar' }
                            </Button>
                        </Column>
                    </NitroCardContentView>
                </NitroCardView>
            ) }
        </>
    );
};
