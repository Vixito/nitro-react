import { FC, useEffect, useState } from 'react';
import { FaTimes, FaSpinner, FaRedo, FaExternalLinkAlt } from 'react-icons/fa';
import { Base, Button, Flex, Text } from '../../../common';
import { useGameCenter } from '../../../hooks';

const GAME_NAMES: { [slug: string]: string } = {
    basejump: 'Fast Food (BaseJump)',
    snowwar: 'SnowStorm',
    snowstorm: 'SnowStorm',
    wobblesquabble: 'Wobble Squabble',
    battleball: 'Battle Ball',
    slotcar: 'Speedway'
};

export const GameStageView: FC<{}> = () => 
{
    const { gameURL, setGameURL, selectedGame } = useGameCenter();
    const [ isLoading, setIsLoading ] = useState<boolean>(true);
    const [ hasError, setHasError ] = useState<boolean>(false);
    const [ retryCount, setRetryCount ] = useState<number>(0);

    if(!gameURL) return null;

    const gameSlug = (() => {
        const urlLower = (gameURL || '').toLowerCase();
        if (urlLower.includes('basejump') || urlLower.includes('fastfood')) return 'basejump';
        if (urlLower.includes('snowstorm') || urlLower.includes('snowwar')) return 'snowstorm';
        if (urlLower.includes('wobblesquabble') || urlLower.includes('wobble')) return 'wobblesquabble';
        if (urlLower.includes('battleball')) return 'battleball';
        if (urlLower.includes('slotcar')) return 'slotcar';
        if (selectedGame?.gameNameId) {
            const sid = selectedGame.gameNameId.toLowerCase();
            if (sid.includes('snow')) return 'snowstorm';
            return sid;
        }
        return 'basejump';
    })();

    const gameTitle = GAME_NAMES[gameSlug] || (selectedGame ? selectedGame.gameNameId : 'Habbten Minijuego');

    const origin = window.location.origin;
    const directUrl = `${origin}/games/${gameSlug}/index.html${retryCount > 0 ? `?r=${retryCount}` : ''}`;

    const handleExitGame = () =>
    {
        setGameURL(null);
    };

    const handleOpenInNewWindow = () =>
    {
        window.open(directUrl, '_blank', 'width=1000,height=600,menubar=no,toolbar=no');
    };

    useEffect(() =>
    {
        setIsLoading(true);
        setHasError(false);
        const timer = setTimeout(() => setIsLoading(false), 400);
        const handleMessage = (event: MessageEvent) =>
        {
            if(event.data === 'EXIT_GAME') handleExitGame();
        };

        window.addEventListener('message', handleMessage);
        return () =>
        {
            clearTimeout(timer);
            window.removeEventListener('message', handleMessage);
        };
    }, [ gameURL, retryCount ]);

    return (
        <Flex 
            position="fixed" 
            className="top-0 bottom-0 start-0 end-0" 
            column
            style={{ 
                zIndex: 9999, 
                backgroundColor: '#07111c',
                userSelect: 'none' 
            }}
        >
            <Flex 
                alignItems="center" 
                justifyContent="between" 
                className="px-3"
                style={{ 
                    height: '40px', 
                    background: 'linear-gradient(180deg, #2b567a 0%, #1e4160 50%, #173550 51%, #1c3e5d 100%)',
                    borderBottom: '2px solid #0d2538',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.6)',
                    zIndex: 10
                }}
            >
                <Flex alignItems="center" gap={ 2 }>
                    <Text bold variant="white" style={{ fontSize: '13px', textShadow: '0 1px 2px rgba(0,0,0,0.8)', letterSpacing: '0.5px' }}>
                        🎮 { gameTitle }
                    </Text>
                </Flex>

                <Flex alignItems="center" gap={ 2 }>
                    <Button 
                        variant="primary" 
                        size="sm" 
                        onClick={ handleOpenInNewWindow }
                        style={{ 
                            padding: '2px 10px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            background: '#0284c7',
                            borderColor: '#0369a1'
                        }}
                        title="Abrir juego en pantalla completa / ventana emergente"
                    >
                        <FaExternalLinkAlt className="me-1" />
                        <span>Abrir en ventana</span>
                    </Button>
                    <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={ () => setRetryCount(prev => prev + 1) }
                        style={{ 
                            padding: '2px 8px',
                            fontSize: '11px',
                            fontWeight: 'bold'
                        }}
                        title="Recargar pantalla del juego"
                    >
                        <FaRedo className="me-1" />
                        <span>Recargar</span>
                    </Button>
                    <Button 
                        variant="danger" 
                        size="sm" 
                        onClick={ handleExitGame }
                        style={{ 
                            padding: '2px 12px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            boxShadow: '0 0 0 1px rgba(255,255,255,0.4)'
                        }}
                    >
                        <FaTimes className="me-1" />
                        <span>Volver al Hotel</span>
                    </Button>
                </Flex>
            </Flex>

            <div style={{ 
                position: 'relative', 
                width: '100%', 
                height: 'calc(100% - 40px)', 
                background: 'radial-gradient(circle at center, #132438 0%, #0b1522 60%, #060b12 100%)' 
            }}>
                { isLoading && !hasError && (
                    <Flex center fullHeight fullWidth position="absolute" style={{ top: 0, left: 0, zIndex: 5, background: 'rgba(7, 17, 28, 0.92)', pointerEvents: 'none' }} column gap={ 2 }>
                        <FaSpinner className="fa-spin" style={{ fontSize: '32px', color: '#38bdf8' }} />
                        <Text bold variant="white" style={{ fontSize: '14px', letterSpacing: '0.5px' }}>Iniciando { gameTitle }...</Text>
                    </Flex>
                )}

                { hasError ? (
                    <Flex center fullHeight fullWidth column gap={ 3 } style={{ padding: '20px' }}>
                        <Text bold variant="danger" style={{ fontSize: '16px' }}>No se pudo cargar la sala del juego.</Text>
                        <Flex gap={ 2 }>
                            <Button variant="success" size="sm" onClick={ () => { setHasError(false); setRetryCount(prev => prev + 1); } }>
                                <FaRedo className="me-1" /> Reintentar Carga
                            </Button>
                            <Button variant="primary" size="sm" onClick={ handleOpenInNewWindow }>
                                <FaExternalLinkAlt className="me-1" /> Abrir en Ventana Separada
                            </Button>
                            <Button variant="secondary" size="sm" onClick={ handleExitGame }>Volver al Hotel</Button>
                        </Flex>
                    </Flex>
                ) : (
                    <iframe 
                        key={ `${directUrl}-${retryCount}` }
                        src={ directUrl } 
                        title={ gameTitle }
                        allow="autoplay; fullscreen"
                        onLoad={ () => setIsLoading(false) }
                        onError={ () => { setIsLoading(false); setHasError(true); } }
                        style={{ 
                            width: '100%', 
                            height: '100%', 
                            border: 'none',
                            display: 'block'
                        }}
                    />
                )}
            </div>
        </Flex>
    );
};
