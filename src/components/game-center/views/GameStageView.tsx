import { FC, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import { Base, Button, Flex, Text } from '../../../common';
import { useGameCenter } from '../../../hooks';

export const GameStageView: FC<{}> = () => 
{
    const { gameURL, setGameURL, selectedGame } = useGameCenter();

    if(!gameURL) return null;

    const gameTitle = selectedGame ? selectedGame.gameName : 'SnowStorm';

    const handleExitGame = () =>
    {
        setGameURL(null);
    };

    useEffect(() =>
    {
        const handleMessage = (event: MessageEvent) =>
        {
            if(event.data === 'EXIT_GAME') handleExitGame();
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

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
                        fontSize: '11px',
                        fontWeight: 'bold'
                    }}
                >
                    <FaTimes className="me-1" />
                    <span>Volver al Hotel</span>
                </Button>
            </Flex>

            <iframe 
                src={ gameURL } 
                title={ gameTitle }
                allow="autoplay; fullscreen"
                style={{ 
                    width: '100%', 
                    height: 'calc(100% - 36px)', 
                    border: 'none',
                    display: 'block'
                }}
            />
        </Flex>
    );
};
