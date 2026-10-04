import { useCallback, useEffect, useState } from 'react';

export type EraType = 'modern' | 'flash2012' | 'shockwave2006';

export interface EraInfo
{
    id: EraType;
    name: string;
    year: string;
    subtitle: string;
    description: string;
    badges: string[];
    thumbnail: string;
}

export const ERAS_CONFIG: EraInfo[] = [
    {
        id: 'shockwave2006',
        name: 'SHOCKWAVE ERA',
        year: '2006',
        subtitle: 'The OG experience',
        description: 'The OG experience. Bitmap fonts, teal windows, and the iconic toolbar & icons.',
        badges: [ 'NOSTALGIC', 'ORIGINAL' ],
        thumbnail: '/src/assets/images/eras/era_shockwave_2006.png'
    },
    {
        id: 'flash2012',
        name: 'FLASH ERA',
        year: '2012',
        subtitle: 'Refined side toolbar',
        description: 'Refined inventory, side-fixed toolbar.. The peak flash experience.',
        badges: [ 'NOSTALGIC', 'CLASSIC' ],
        thumbnail: '/src/assets/images/eras/era_flash_2012.png'
    },
    {
        id: 'modern',
        name: 'MODERN',
        year: '2016',
        subtitle: 'The latest flash UI',
        description: 'The latest flash user interface, before habbo moved to their latest UI.',
        badges: [ 'NOSTALGIC', 'POPULAR' ],
        thumbnail: '/src/assets/images/eras/era_modern_2016.png'
    }
];

const STORAGE_KEY = 'habbten_theme_era';

const applyEraToDOM = (era: EraType) =>
{
    if(typeof document === 'undefined') return;

    document.body.dataset.era = era;
    document.body.classList.remove('era-modern', 'era-flash-2012', 'era-shockwave-2006');

    if(era === 'flash2012')
    {
        document.body.classList.add('era-flash-2012');
    }
    else if(era === 'shockwave2006')
    {
        document.body.classList.add('era-shockwave-2006');
    }
    else
    {
        document.body.classList.add('era-modern');
    }
};

export const useEraTheme = () =>
{
    const [ currentEra, setCurrentEraState ] = useState<EraType>(() =>
    {
        const saved = (localStorage.getItem(STORAGE_KEY) as EraType) || 'modern';
        if(saved === 'flash2012' || saved === 'shockwave2006' || saved === 'modern') return saved;
        return 'modern';
    });

    useEffect(() =>
    {
        applyEraToDOM(currentEra);

        const handleEraChange = (e: CustomEvent<EraType>) =>
        {
            if(e.detail && e.detail !== currentEra)
            {
                setCurrentEraState(e.detail);
                applyEraToDOM(e.detail);
            }
        };

        window.addEventListener('nitro-era-changed' as any, handleEraChange);
        return () => window.removeEventListener('nitro-era-changed' as any, handleEraChange);
    }, [ currentEra ]);

    const setEra = useCallback((era: EraType) =>
    {
        localStorage.setItem(STORAGE_KEY, era);
        setCurrentEraState(era);
        applyEraToDOM(era);
        window.dispatchEvent(new CustomEvent('nitro-era-changed', { detail: era }));
    }, []);

    return {
        currentEra,
        setEra,
        eras: ERAS_CONFIG
    };
};
