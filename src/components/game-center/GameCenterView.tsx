import { ILinkEventTracker } from '@nitrots/nitro-renderer';
import { useEffect } from 'react';
import { AddEventLinkTracker, RemoveLinkEventTracker } from '../../api';
import { Base, Flex, Text } from '../../common';
import { useGameCenter } from '../../hooks';
import { GameListView } from './views/GameListView';
import { GameStageView } from './views/GameStageView';
import { GameView } from './views/GameView';

export const GameCenterView = () => 
{
    const{ isVisible, setIsVisible, games, accountStatus } = useGameCenter();

    useEffect(() => {
        const checkEnabled = (e?: any) => {
            const cfg = e?.detail || (window.parent as any)?.HabbtenConfig || (window as any)?.HabbtenConfig;
            if (cfg?.client?.toolbar_icons?.game_center === false && isVisible) {
                setIsVisible(false);
            }
        };
        window.addEventListener('habbten-config-updated', checkEnabled);
        return () => window.removeEventListener('habbten-config-updated', checkEnabled);
    }, [isVisible, setIsVisible]);

    useEffect(() =>
    {
        const toggleGameCenter = () =>
        {
            const cfg = (window.parent as any)?.HabbtenConfig || (window as any)?.HabbtenConfig;
            if (cfg?.client?.toolbar_icons?.game_center === false) return;
            setIsVisible(prev => !prev);
        };

        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) =>
            {
                const value = url.split('/');
                
                switch(value[1]) 
                {
                    case 'toggle':
                        toggleGameCenter();
                        break;
                }
            },
            eventUrlPrefix: 'games/'
        };

        AddEventLinkTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [ setIsVisible ]);

    if(!isVisible) return null;
    
    return (
        <Flex position="absolute" className="top-0 bottom-0 start-0 end-0 game-center-root" justifyContent="center" alignItems="center">
            <Flex className="game-center-main" column>
                <Flex className="game-center-header px-4 py-2" justifyContent="end" alignItems="center">
                    <Base 
                        pointer 
                        className="game-center-close-btn px-3 py-1" 
                        onClick={ () => setIsVisible(false) }
                    >
                        ✕ Volver al Hotel
                    </Base>
                </Flex>
                { (games && games.length > 0) ? (
                    <>
                        <GameView />
                        <GameListView />
                    </>
                ) : (
                    <Flex center fullHeight column gap={ 2 }>
                        <Text bold variant="white">Cargando juegos de Habbten...</Text>
                    </Flex>
                )}
            </Flex>
            <GameStageView />
        </Flex>
    );
}
