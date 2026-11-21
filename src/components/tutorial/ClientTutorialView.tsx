import { ILinkEventTracker } from '@nitrots/nitro-renderer';
import { FC, useCallback, useEffect, useState } from 'react';
import { AddEventLinkTracker, GetSessionDataManager, RemoveLinkEventTracker } from '../../api';

interface TutorialStep
{
    id: string;
    selectors: string[];
    text: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
    {
        id: 'rooms',
        selectors: [ '.nitro-toolbar .item-rooms', '.nitro-toolbar .icon-rooms' ],
        text: 'Aquí podrás explorar salas públicas, juegos y las salas creadas por otros usuarios'
    },
    {
        id: 'games',
        selectors: [ '.nitro-toolbar .item-games', '.nitro-toolbar .icon-games' ],
        text: 'Entra al Centro de Juegos para competir en Battle Ball, SnowStorm, FastFood y ganar placas'
    },
    {
        id: 'catalog',
        selectors: [ '.nitro-toolbar .item-catalog', '.nitro-toolbar .icon-catalog' ],
        text: 'Aquí podrás comprar furnis y todo lo que desees para decorar tus salas'
    },
    {
        id: 'inventory',
        selectors: [ '.nitro-toolbar .item-inventory', '.nitro-toolbar .icon-inventory' ],
        text: 'En Mis cosas encontrarás todos tus furnis, mascotas y placas coleccionadas'
    },
    {
        id: 'me',
        selectors: [ '.nitro-toolbar .item-avatar', '.nitro-toolbar .navigation-item.item-avatar' ],
        text: 'Haz clic en tu avatar para abrir tu perfil, cambiar tu ropa, ver tus logros y el Tablón de Anuncios'
    },
    {
        id: 'friends',
        selectors: [ '.nitro-toolbar .item-friends', '.nitro-toolbar .icon-friendall', '.nitro-toolbar .icon-friends' ],
        text: 'Desde aquí podrás gestionar tu lista de amig@s, chatear y seguirlos a sus salas'
    }
];

interface TargetRect
{
    left: number;
    top: number;
    width: number;
    height: number;
    isVerticalBar: boolean;
}

export const ClientTutorialView: FC<{}> = () =>
{
    const [ isVisible, setIsVisible ] = useState(false);
    const [ stepIndex, setStepIndex ] = useState(0);
    const [ targetRect, setTargetRect ] = useState<TargetRect | null>(null);
    const [ checkedUserId, setCheckedUserId ] = useState<number>(0);

    const findTargetRect = useCallback((idx: number): TargetRect | null =>
    {
        const step = TUTORIAL_STEPS[idx];
        if(!step) return null;

        for(const sel of step.selectors)
        {
            const el = document.querySelector(sel) as HTMLElement | null;
            if(el)
            {
                const rect = el.getBoundingClientRect();
                if(rect.width > 0 && rect.height > 0)
                {
                    // Vertical left sidebar in Flash 2012 sits at left < 120 and top < window.innerHeight - 100
                    const isVerticalBar = rect.left < 110 && rect.bottom < window.innerHeight - 40;
                    return {
                        left: rect.left,
                        top: rect.top,
                        width: rect.width,
                        height: rect.height,
                        isVerticalBar
                    };
                }
            }
        }
        return null;
    }, []);

    const markTutorialDone = useCallback(async () =>
    {
        setIsVisible(false);
        const uid = GetSessionDataManager()?.userId || 0;
        if(uid > 0)
        {
            try { localStorage.setItem(`habbten_tutorial_done_${ uid }`, '1'); } catch {}
        }
        try
        {
            await fetch('/api/client/tutorial', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed: true })
            });
        }
        catch
        {
            // Ignore
        }
    }, []);

    // Check once when user session becomes ready
    useEffect(() =>
    {
        const timer = setInterval(() =>
        {
            const uid = GetSessionDataManager()?.userId || 0;
            if(uid <= 0 || uid === checkedUserId) return;

            setCheckedUserId(uid);

            try
            {
                if(localStorage.getItem(`habbten_tutorial_done_${ uid }`) === '1') return;
            }
            catch {}

            fetch('/api/client/tutorial', { credentials: 'include' })
                .then(r => r.json())
                .then(json =>
                {
                    if(json && json.success && json.completed === false)
                    {
                        setTimeout(() =>
                        {
                            setStepIndex(0);
                            setIsVisible(true);
                        }, 1500);
                    }
                    else if(json && json.completed === true)
                    {
                        try { localStorage.setItem(`habbten_tutorial_done_${ uid }`, '1'); } catch {}
                    }
                })
                .catch(() => {});
        }, 1200);

        return () => clearInterval(timer);
    }, [ checkedUserId ]);

    useEffect(() =>
    {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) =>
            {
                const parts = url.split('/');
                if(parts.length < 2) return;
                if(parts[1] === 'start' || parts[1] === 'show')
                {
                    setStepIndex(0);
                    setIsVisible(true);
                }
                else if(parts[1] === 'hide' || parts[1] === 'skip')
                {
                    markTutorialDone();
                }
            },
            eventUrlPrefix: 'tutorial/'
        };

        AddEventLinkTracker(linkTracker);
        return () => RemoveLinkEventTracker(linkTracker);
    }, [ markTutorialDone ]);

    useEffect(() =>
    {
        if(!isVisible) return;

        const update = () => setTargetRect(findTargetRect(stepIndex));
        update();
        window.addEventListener('resize', update);
        const recheck = setTimeout(update, 250);
        return () =>
        {
            window.removeEventListener('resize', update);
            clearTimeout(recheck);
        };
    }, [ isVisible, stepIndex, findTargetRect ]);

    const handleNext = () =>
    {
        // Advance to next step that has a visible element, or finish
        for(let next = stepIndex + 1; next < TUTORIAL_STEPS.length; next++)
        {
            if(findTargetRect(next))
            {
                setStepIndex(next);
                return;
            }
        }
        markTutorialDone();
    };

    if(!isVisible) return null;

    const currentStep = TUTORIAL_STEPS[stepIndex] || TUTORIAL_STEPS[0];
    const isLast = stepIndex >= TUTORIAL_STEPS.length - 1;

    // Position white speech balloon right next to the target toolbar button
    let balloonStyle: React.CSSProperties = {
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)'
    };
    let arrowDir: 'left' | 'bottom' | 'none' = 'none';

    if(targetRect)
    {
        if(targetRect.isVerticalBar)
        {
            const centerY = targetRect.top + (targetRect.height / 2);
            const clampedTop = Math.max(20, Math.min(window.innerHeight - 210, centerY - 70));
            balloonStyle = {
                left: `${ targetRect.left + targetRect.width + 18 }px`,
                top: `${ clampedTop }px`
            };
            arrowDir = 'left';
        }
        else
        {
            const centerX = targetRect.left + (targetRect.width / 2);
            const clampedLeft = Math.max(16, Math.min(window.innerWidth - 285, centerX - 135));
            balloonStyle = {
                left: `${ clampedLeft }px`,
                bottom: `${ Math.max(70, window.innerHeight - targetRect.top + 16) }px`
            };
            arrowDir = 'bottom';
        }
    }

    const pad = 2;
    const cutLeft = targetRect ? Math.max(0, Math.round(targetRect.left - pad)) : 0;
    const cutTop = targetRect ? Math.max(0, Math.round(targetRect.top - pad)) : 0;
    const cutRight = targetRect ? Math.min(window.innerWidth, Math.round(targetRect.left + targetRect.width + pad)) : 0;
    const cutBottom = targetRect ? Math.min(window.innerHeight, Math.round(targetRect.top + targetRect.height + pad)) : 0;

    return (
        <div className="habbten-tutorial-overlay">
            { targetRect ? (
                <>
                    {/* 4-panel borderless dark scrim leaving the target icon 100% bright & unboxed */}
                    <div className="habbten-tutorial-scrim" style={ { left: 0, top: 0, width: '100vw', height: `${ cutTop }px` } } />
                    <div className="habbten-tutorial-scrim" style={ { left: 0, top: `${ cutBottom }px`, width: '100vw', bottom: 0 } } />
                    <div className="habbten-tutorial-scrim" style={ { left: 0, top: `${ cutTop }px`, width: `${ cutLeft }px`, height: `${ Math.max(0, cutBottom - cutTop) }px` } } />
                    <div className="habbten-tutorial-scrim" style={ { left: `${ cutRight }px`, top: `${ cutTop }px`, right: 0, height: `${ Math.max(0, cutBottom - cutTop) }px` } } />
                </>
            ) : (
                <div className="habbten-tutorial-scrim" style={ { inset: 0 } } />
            ) }

            <div className={ `habbten-tutorial-balloon arrow-${ arrowDir }` } style={ balloonStyle }>
                <div className="tutorial-balloon-text">{ currentStep.text }</div>
                <div className="tutorial-balloon-actions">
                    <button type="button" className="tutorial-btn-vale" onClick={ handleNext }>
                        { isLast ? '¡Listo!' : '¡Vale!' }
                    </button>
                </div>
                <div className="tutorial-balloon-footer">
                    <span className="tutorial-step-counter">{ stepIndex + 1 }/{ TUTORIAL_STEPS.length }</span>
                    <button type="button" className="tutorial-skip-link" onClick={ markTutorialDone }>
                        Omitir tutorial
                    </button>
                </div>
            </div>
        </div>
    );
};
