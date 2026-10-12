import { FC, useEffect, useState } from 'react';
import { FaTimes, FaSpinner } from 'react-icons/fa';
import { Base, Button, Flex, Text } from '../../../common';
import { useGameCenter } from '../../../hooks';

export const GameStageView: FC<{}> = () => 
{
    const { gameURL, setGameURL, selectedGame } = useGameCenter();
    const [ isLoading, setIsLoading ] = useState<boolean>(true);
    const [ hasError, setHasError ] = useState<boolean>(false);

    if(!gameURL) return null;

    const gameTitle = selectedGame ? selectedGame.gameName : 'Habbten Game';

    const normalizedUrl = (() => {
        if (!gameURL) return '';
        if (window.location.port === '8081' && gameURL.startsWith('/game/games/')) {
            return gameURL.replace('/game/games/', '/games/');
        }
        return gameURL;
    })();

    const handleExitGame = () =>
    {
        setGameURL(null);
    };

    useEffect(() =>
    {
        setIsLoading(true);
        setHasError(false);
        const timer = setTimeout(() => setIsLoading(false), 250);
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
    }, [ gameURL ]);

    return (
        <Flex 
            position="fixed" 
            className="top-0 bottom-0 start-0 end-0" 
            column
            style={{ 
                zIndex: 9999, 
                backgroundColor: '#0a0f1d',
                userSelect: 'none' 
            }}
        >
            <Flex 
                alignItems="center" 
                justifyContent="between" 
                className="px-3"
                style={{ 
                    height: '36px', 
                    background: 'repeating-linear-gradient(#3a78a6, #3a78a6 50%, #275a80 50%, #275a80 100%)',
                    borderBottom: '2px solid #1a3c5a',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                    zIndex: 10
                }}
            >
                <Flex alignItems="center" gap={ 2 }>
                    <Text bold variant="white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                        🎮 { gameTitle }
                    </Text>
                </Flex>

                <Button 
                    variant="danger" 
                    size="sm" 
                    onClick={ handleExitGame }
                    style={{ 
                        boxShadow: '0 0 0 1px #ffffff',
                        padding: '2px 10px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                    }}
                >
                    <FaTimes className="me-1" />
                    <span>Volver al Hotel</span>
                </Button>
            </Flex>

            <div style={{ position: 'relative', width: '100%', height: 'calc(100% - 36px)', backgroundColor: '#080d1a' }}>
                { isLoading && !hasError && (
                    <Flex center fullHeight fullWidth position="absolute" style={{ top: 0, left: 0, zIndex: 5, backgroundColor: '#080d1a', pointerEvents: 'none' }} column gap={ 2 }>
                        <FaSpinner className="fa-spin" style={{ fontSize: '28px', color: '#38bdf8' }} />
                        <Text bold variant="white" style={{ fontSize: '14px' }}>Cargando { gameTitle }...</Text>
                    </Flex>
                )}

                { hasError ? (
                    <Flex center fullHeight fullWidth column gap={ 2 }>
                        <Text bold variant="danger">Error al cargar la partida.</Text>
                        <Button variant="primary" size="sm" onClick={ handleExitGame }>Volver al Hotel</Button>
                    </Flex>
                ) : (
                    <iframe 
                        src={ normalizedUrl } 
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
