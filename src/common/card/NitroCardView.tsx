import { FC, useMemo, useRef } from 'react';
import { Column, ColumnProps } from '..';
import { DraggableWindow, DraggableWindowPosition, DraggableWindowProps } from '../draggable-window';
import { NitroCardContextProvider } from './NitroCardContext';

export interface NitroCardViewProps extends DraggableWindowProps, ColumnProps
{
    theme?: string;
}

const SKIN_2012_BY_KEY: Record<string, string> = {
    'nitro-friends': 'volter-yellow',
    'nitro-friends-messenger': 'volter-yellow',
    'nitro-friends-room-invite': 'volter-yellow',
    'achievements': 'ubuntu-blue',
    'catalog': 'ubuntu-blue',
    'catalog-gift': 'ubuntu-blue',
    'battle-pass': 'ubuntu-blue',
    'targeted-offer': 'ubuntu-blue',
    'snowstorm-lobby': 'ubuntu-blue',
    'snowstorm-buy-games': 'ubuntu-blue',
    'snowstorm-howto': 'ubuntu-blue',
    'snowstorm-leaderboard': 'ubuntu-blue',
    'avatar-editor': 'illumina-dark',
    'user-settings': 'illumina-dark',
    'nitro-discord-settings': 'illumina-dark',
    'nitro-wired': 'illumina-dark',
    'wired-creator-tools': 'illumina-dark',
    'wired-creator-tools-error': 'illumina-dark',
    'floorpan-editor': 'illumina-dark',
    'chat-history': 'illumina-dark',
    'mod-tools': 'illumina-dark',
    'nitro-user-profile': 'illumina-light',
    'era-selector': 'illumina-light',
    'navigator': 'volter-blue',
    'inventory': 'volter-blue',
    'nitro-room-settings': 'volter-blue',
    'pet-training': 'volter-blue'
};

export const NitroCardView: FC<NitroCardViewProps> = props =>
{
    const { theme = 'primary', uniqueKey = null, handleSelector = '.drag-handler', windowPosition = DraggableWindowPosition.CENTER, disableDrag = false, overflow = 'hidden', position = 'relative', gap = 0, classNames = [], ...rest } = props;
    const elementRef = useRef<HTMLDivElement>();

    const skin2012 = useMemo(() =>
    {
        if(uniqueKey && SKIN_2012_BY_KEY[uniqueKey]) return SKIN_2012_BY_KEY[uniqueKey];

        const joined = [ ...(classNames || []), ((rest as any)?.className || '') ].join(' ');
        if(/nitro-alert|nitro-help|nitro-guide|user-profile/i.test(joined)) return 'illumina-light';
        if(/nitro-friends/i.test(joined)) return 'volter-yellow';
        if(/nitro-wired|user-settings|avatar-editor|mod-tools|chat-history/i.test(joined)) return 'illumina-dark';
        if(/nitro-catalog|nitro-achievements/i.test(joined)) return 'ubuntu-blue';
        if(/nitro-room-info|nitro-room-link|nitro-room-settings/i.test(joined)) return 'volter-blue';

        return 'volter-blue';
    }, [ uniqueKey, classNames, (rest as any)?.className ]);

    const getClassNames = useMemo(() =>
    {
        const newClassNames: string[] = [ 'nitro-card', 'rounded', 'shadow', ];

        newClassNames.push(`theme-${ theme || 'primary' }`);

        if(classNames.length) newClassNames.push(...classNames);

        return newClassNames;
    }, [ theme, classNames ]);

    /* useEffect(() =>
    {
        if(!uniqueKey || !elementRef || !elementRef.current) return;

        const localStorage = GetLocalStorage<WindowSaveOptions>(`nitro.windows.${ uniqueKey }`);
        const element = elementRef.current;

        if(localStorage && localStorage.size)
        {
            //element.style.width = `${ localStorage.size.width }px`;
            //element.style.height = `${ localStorage.size.height }px`;
        }

        const observer = new ResizeObserver(event =>
        {
            const newStorage = { ...GetLocalStorage<Partial<WindowSaveOptions>>(`nitro.windows.${ uniqueKey }`) } as WindowSaveOptions;

            newStorage.size = { width: element.offsetWidth, height: element.offsetHeight };

            SetLocalStorage<WindowSaveOptions>(`nitro.windows.${ uniqueKey }`, newStorage);
        });

        observer.observe(element);

        return () =>
        {
            observer.disconnect();
        }
    }, [ uniqueKey ]); */

    return (
        <NitroCardContextProvider value={ { theme } }>
            <DraggableWindow uniqueKey={ uniqueKey } handleSelector={ handleSelector } windowPosition={ windowPosition } disableDrag={ disableDrag }>
                <Column 
                    innerRef={ elementRef } 
                    overflow={ overflow } 
                    position={ position } 
                    gap={ gap } 
                    classNames={ getClassNames }
                    { ...({ 'data-window-key': uniqueKey || '', 'data-skin-2012': skin2012 } as any) }
                    onMouseEnter={ event => {
                        if(document.body.style.cursor === 'pointer') {
                            document.body.style.cursor = 'default';
                        }
                        if((rest as any).onMouseEnter) (rest as any).onMouseEnter(event);
                    } }
                    { ...rest } 
                />
            </DraggableWindow>
        </NitroCardContextProvider>
    );
}
