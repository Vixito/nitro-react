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
        if(!ref || (ref && !ref.current) || !gameURL) return;

        setLoadTimes(0);

        let frame: HTMLIFrameElement = document.createElement('iframe');

        frame.src = gameURL;
        frame.classList.add('game-center-stage');
        frame.classList.add('h-100');
        frame.style.border = 'none';

        frame.onload = () => 
        {   
            setLoadTimes(prev => prev += 1)
        }

        ref.current.innerHTML = '';
        ref.current.appendChild(frame);

    },[ ref, gameURL ]);

    useEffect(()=>
    {
        if(loadTimes > 1) 
        {
            exitGame();
        }
    },[ loadTimes ]);

    if(!gameURL) return null;

    return (
        <div className="position-absolute top-0 bottom-0 start-0 end-0 z-index-1">
            <Base innerRef={ ref } className="game-center-stage w-100 h-100" />
            <button 
                onClick={ exitGame }
                className="position-absolute top-3 end-3 btn btn-danger btn-sm shadow font-weight-bold d-flex align-items-center gap-1 z-index-2"
                style={{ zIndex: 9999, borderRadius: 8, padding: '6px 14px', background: '#dc3545', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', cursor: 'pointer' }}>
                ✕ Salir al Hotel
            </button>
        </div>
    );
}
