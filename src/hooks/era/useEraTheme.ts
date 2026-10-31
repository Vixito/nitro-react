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
let activeEraMemory: EraType | null = null;

const isValidEra = (val: any): val is EraType =>
    val === 'flash2012' || val === 'shockwave2006' || val === 'modern';

const applyEraToDOM = (era: EraType) =>
{
    if(typeof document === 'undefined') return;

    activeEraMemory = era;
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

const resolveCurrentEra = (): EraType =>
{
    // 1. Si ya hay una era activa en memoria o en el DOM (por ejemplo tras cambiar de versión en vivo), respetarla siempre
    if(isValidEra(activeEraMemory)) return activeEraMemory;

    if(typeof document !== 'undefined' && isValidEra(document.body?.dataset?.era))
    {
        activeEraMemory = document.body.dataset.era;
        return activeEraMemory;
    }

    // 2. Carga inicial por primera vez
    const urlParams = new URLSearchParams(window.location.search);
    const urlEra = urlParams.get('era');
    if(isValidEra(urlEra))
    {
        activeEraMemory = urlEra;
        return urlEra;
    }

    try
    {
        const parentEra = (window.parent as any)?.HabbtenConfig?.era;
        if(isValidEra(parentEra))
        {
            activeEraMemory = parentEra;
            return parentEra;
        }
    }
    catch(e) {}

    const m = document.cookie.match(/(?:^|; )habbten_era=([^;]*)/);
    if(m && isValidEra(m[1]))
    {
        activeEraMemory = m[1];
        return m[1];
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    if(isValidEra(saved))
    {
        activeEraMemory = saved;
        return saved;
    }

    activeEraMemory = 'modern';
    return 'modern';
};

export const useEraTheme = () =>
{
    const [ currentEra, setCurrentEraState ] = useState<EraType>(() => resolveCurrentEra());

    useEffect(() =>
    {
        applyEraToDOM(currentEra);

        const handleEraChange = (e: CustomEvent<EraType>) =>
        {
            if(e.detail && isValidEra(e.detail))
            {
                activeEraMemory = e.detail;
                setCurrentEraState(e.detail);
                applyEraToDOM(e.detail);
            }
        };

        window.addEventListener('nitro-era-changed' as any, handleEraChange);
        return () => window.removeEventListener('nitro-era-changed' as any, handleEraChange);
    }, [ currentEra ]);

    const setEra = useCallback((era: EraType) =>
    {
        activeEraMemory = era;
        localStorage.setItem(STORAGE_KEY, era);
        document.cookie = `habbten_era=${era}; path=/; max-age=31536000`;
        try
        {
            if((window.parent as any)?.HabbtenConfig)
            {
                (window.parent as any).HabbtenConfig.era = era;
            }
        }
        catch(e) {}
        try
        {
            const url = new URL(window.location.href);
            if(url.searchParams.has('era'))
            {
                url.searchParams.set('era', era);
                window.history.replaceState({}, '', url.toString());
            }
        }
        catch(e) {}
        try {
            fetch('/api/set-era', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ era })
            }).catch(() => {});
        } catch(e) {}
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
