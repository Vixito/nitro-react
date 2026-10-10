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
        name: 'VERSIÓN SHOCKWAVE (2006)',
        year: '2006',
        subtitle: 'Interfaz clásica de 2006',
        description: 'Fuentes pixeladas, ventanas retro y la barra de herramientas clásica inferior.',
        badges: [],
        thumbnail: '/src/assets/images/eras/era_shockwave_2006.png'
    },
    {
        id: 'flash2012',
        name: 'VERSIÓN FLASH (2012)',
        year: '2012',
        subtitle: 'Barra lateral de 2012',
        description: 'Inventario refinado, barra lateral vertical fija y el estilo característico de la época dorada de Flash.',
        badges: [],
        thumbnail: '/src/assets/images/eras/era_flash_2012.png'
    },
    {
        id: 'modern',
        name: 'VERSIÓN MODERNA (2016)',
        year: '2016',
        subtitle: 'Interfaz moderna',
        description: 'La interfaz gráfica avanzada previa a la transición completa a HTML5 y Nitro.',
        badges: [],
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
