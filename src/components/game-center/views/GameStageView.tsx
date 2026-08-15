import { Game2ExitGameMessageComposer } from '@nitrots/nitro-renderer';
import { useEffect, useRef, useState } from 'react';
import { SendMessageComposer } from '../../../api';
import { Base } from '../../../common';
import { useGameCenter } from '../../../hooks';

export const GameStageView = () => 
{
    const { gameURL, setGameURL, setIsVisible } = useGameCenter();
    const [ loadTimes, setLoadTimes ] = useState<number>(0);
    const ref = useRef<HTMLDivElement>();

    const exitGame = () =>
    {
        setGameURL(null);
        setIsVisible(false);
        SendMessageComposer(new Game2ExitGameMessageComposer());
    };

    useEffect(() =>
    {
        const handleMessage = (event: MessageEvent) =>
        {
            if(event.data === 'EXIT_GAME' || (event.data && event.data.type === 'EXIT_GAME'))
            {
                exitGame();
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    useEffect(()=>
    {
        if(!ref || !ref.current || !gameURL) return;

        setLoadTimes(0);

        let frame: HTMLIFrameElement = document.createElement('iframe');

        frame.src = gameURL;
        frame.classList.add('game-center-stage');
        frame.classList.add('h-100');
        frame.classList.add('w-100');
        frame.style.border = 'none';
        frame.allow = 'autoplay';

        frame.onload = () => 
        {   
            setLoadTimes(prev => prev + 1);
        };

        ref.current.innerHTML = '';
        ref.current.appendChild(frame);

    }, [ ref, gameURL ]);

    useEffect(()=>
    {
        if(loadTimes > 1) 
        {
            exitGame();
        }
    }, [ loadTimes ]);

    if(!gameURL) return null;

    return (
        <div className="position-fixed top-0 bottom-0 start-0 end-0" style={{ zIndex: 99999, width: '100vw', height: '100vh', background: '#000' }}>
            <button 
                onClick={ exitGame }
                style={{
                    position: 'absolute',
                    top: '12px',
                    right: '16px',
                    zIndex: 100000,
                    background: 'rgba(225, 29, 72, 0.9)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '8px',
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}
            >
                ✕ Salir del Juego
            </button>
            <Base innerRef={ ref } className="game-center-stage w-100 h-100" />
        </div>
    );
};
