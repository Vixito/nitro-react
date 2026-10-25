import { FC, useMemo, useRef, useState } from 'react';
import { Overlay, Popover } from 'react-bootstrap';
import { Base, Button } from '../../../../common';
import { isSafeGifUrl } from '../../../../api';

export interface ChatInputGifPickerViewProps
{
    onSelectGif: (gifUrl: string) => void;
    forceOpen?: boolean;
    onClose?: () => void;
    customTarget?: HTMLElement | null;
}

interface GifItem
{
    id: string;
    title: string;
    url: string;
    category: string;
    keywords: string[];
}

const GIF_LIBRARY: GifItem[] = [
    // Populares / Reacciones
    {
        id: 'cheer-leo',
        title: 'Leonardo Toast',
        url: 'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif',
        category: 'popular',
        keywords: [ 'cheers', 'salud', 'toast', 'celebrate', 'leo' ]
    },
    {
        id: 'mind-blown',
        title: 'Mind Blown',
        url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
        category: 'popular',
        keywords: [ 'mind blown', 'explosion', 'wow', 'omg', 'shock' ]
    },
    {
        id: 'applause',
        title: 'Aplausos',
        url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif',
        category: 'popular',
        keywords: [ 'clap', 'applause', 'bravo', 'aplausos', 'bien' ]
    },
    {
        id: 'yes-nod',
        title: 'Asentir / Yes',
        url: 'https://media.giphy.com/media/ne3xrYlWtQFtC/giphy.gif',
        category: 'popular',
        keywords: [ 'yes', 'si', 'nod', 'claro', 'agree' ]
    },
    {
        id: 'no-finger',
        title: 'No con el dedo',
        url: 'https://media.giphy.com/media/VTxmwaCEwSlZm/giphy.gif',
        category: 'popular',
        keywords: [ 'no', 'negativo', 'nope', 'never' ]
    },
    {
        id: 'facepalm',
        title: 'Facepalm',
        url: 'https://media.giphy.com/media/3og0INyCmHlNylks9O/giphy.gif',
        category: 'popular',
        keywords: [ 'facepalm', 'desastre', 'dios mio', 'verguenza' ]
    },
    {
        id: 'cry-cat',
        title: 'Gato Llorando',
        url: 'https://media.giphy.com/media/OPU6wzx8JrHna/giphy.gif',
        category: 'popular',
        keywords: [ 'cry', 'llorar', 'triste', 'sad', 'cat' ]
    },
    {
        id: 'laugh-elvira',
        title: 'Risa / Laugh',
        url: 'https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif',
        category: 'popular',
        keywords: [ 'laugh', 'risa', 'jaja', 'lol', 'funny' ]
    },

    // Bailes / Dances
    {
        id: 'dance-carlton',
        title: 'Baile Carlton',
        url: 'https://media.giphy.com/media/pa37AAGzKXoek/giphy.gif',
        category: 'dance',
        keywords: [ 'carlton', 'dance', 'baile', 'fresh prince', 'feliz' ]
    },
    {
        id: 'cat-vibe',
        title: 'Gato Bailando',
        url: 'https://media.giphy.com/media/GeimqsH0TLDt4tScGw/giphy.gif',
        category: 'dance',
        keywords: [ 'cat', 'gato', 'vibe', 'musica', 'dance' ]
    },
    {
        id: 'dance-snoop',
        title: 'Snoop Dogg Baile',
        url: 'https://media.giphy.com/media/DHqth0hVQoIzS/giphy.gif',
        category: 'dance',
        keywords: [ 'snoop', 'dance', 'ritmo', 'party' ]
    },
    {
        id: 'dance-gangnam',
        title: 'Gangnam Style',
        url: 'https://media.giphy.com/media/13Y6LAZJqRspI4/giphy.gif',
        category: 'dance',
        keywords: [ 'gangnam', 'psy', 'dance', 'baile' ]
    },
    {
        id: 'dance-groove',
        title: 'Ritmo Fiesta',
        url: 'https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif',
        category: 'dance',
        keywords: [ 'ritmo', 'groove', 'dance', 'baile' ]
    },
    {
        id: 'party-blob',
        title: 'Loro Fiesta Rave',
        url: 'https://media.giphy.com/media/l3q2wJsC23ikJg9xe/giphy.gif',
        category: 'dance',
        keywords: [ 'party', 'fiesta', 'rave', 'dance' ]
    },

    // Memes
    {
        id: 'popcat',
        title: 'Pop Cat',
        url: 'https://media.giphy.com/media/Lq0h93752f6J9tijrh/giphy.gif',
        category: 'memes',
        keywords: [ 'popcat', 'cat', 'gato', 'meme', 'pop' ]
    },
    {
        id: 'travolta-confused',
        title: 'Travolta Confundido',
        url: 'https://media.giphy.com/media/g01ZnwAUvutuK8GIQn/giphy.gif',
        category: 'memes',
        keywords: [ 'travolta', 'confused', 'perdido', 'donde', 'pulp fiction' ]
    },
    {
        id: 'this-is-fine',
        title: 'Todo Esta Bien',
        url: 'https://media.giphy.com/media/NTur7XlVDUdqM/giphy.gif',
        category: 'memes',
        keywords: [ 'this is fine', 'fuego', 'tranquilo', 'dog', 'perro' ]
    },
    {
        id: 'doge-wow',
        title: 'Doge Wow',
        url: 'https://media.giphy.com/media/HCTfYH2XK6CTK/giphy.gif',
        category: 'memes',
        keywords: [ 'doge', 'wow', 'shiba', 'much' ]
    },
    {
        id: 'drake-yes',
        title: 'Drake Aprobado',
        url: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif',
        category: 'memes',
        keywords: [ 'drake', 'aprobado', 'si', 'meme' ]
    },

    // Habbten Classic / Pixel
    {
        id: 'habbten-logo',
        title: 'Logo Habbten',
        url: '/habbten.gif',
        category: 'habbten',
        keywords: [ 'habbten', 'logo', 'hotel', 'pixel' ]
    },
    {
        id: 'habbten-dance',
        title: 'Baile Animado',
        url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif',
        category: 'habbten',
        keywords: [ 'habbten', 'baile', 'dance', 'pixel' ]
    }
];

const GIF_CATEGORIES = [
    { id: 'popular', name: 'Populares' },
    { id: 'dance', name: 'Bailes' },
    { id: 'memes', name: 'Memes' },
    { id: 'habbten', name: 'Habbten' },
    { id: 'custom', name: 'Pegar enlace' }
];

export const ChatInputGifPickerView: FC<ChatInputGifPickerViewProps> = ({ onSelectGif, forceOpen = false, onClose = null, customTarget = null }) =>
{
    const [ visible, setVisible ] = useState(false);
    const [ activeCategory, setActiveCategory ] = useState('popular');
    const [ searchTerm, setSearchTerm ] = useState('');
    const [ customUrl, setCustomUrl ] = useState('');
    const [ urlError, setUrlError ] = useState<string>('');
    const buttonRef = useRef<HTMLDivElement>(null);

    const isShown = forceOpen || visible;

    const handleClose = () =>
    {
        setVisible(false);
        if(onClose) onClose();
    };

    const filteredGifs = useMemo(() =>
    {
        if(activeCategory === 'custom') return [];

        let list = GIF_LIBRARY;
        if(activeCategory)
        {
            list = list.filter(g => g.category === activeCategory);
        }

        if(searchTerm.trim())
        {
            const term = searchTerm.toLowerCase().trim();
            list = GIF_LIBRARY.filter(g =>
                g.title.toLowerCase().includes(term) ||
                g.keywords.some(k => k.toLowerCase().includes(term))
            );
        }

        return list;
    }, [ activeCategory, searchTerm ]);

    const handleSelect = (url: string) =>
    {
        if(!url) return;
        const clean = url.trim();
        if(!isSafeGifUrl(clean))
        {
            setUrlError('Por seguridad, solo se permiten enlaces de Giphy, Tenor, Imgur y Discord.');
            return;
        }
        onSelectGif(clean);
        handleClose();
        setCustomUrl('');
        setUrlError('');
    };

    const handleCustomSubmit = (e: React.FormEvent) =>
    {
        e.preventDefault();
        const clean = customUrl.trim();
        if(!clean) return;
        if(!isSafeGifUrl(clean))
        {
            setUrlError('Enlace no permitido por seguridad. Usa URLs directas de Giphy, Tenor, Imgur o Discord.');
            return;
        }
        handleSelect(clean);
    };

    const isCustomUrlValid = customUrl.trim().length > 0 && isSafeGifUrl(customUrl.trim());

    return (
        <>
            <Base
                innerRef={ buttonRef }
                pointer
                title="GIFs"
                className="icon chat-gif-icon"
                onClick={ () => setVisible(prev => !prev) }
            />

            <Overlay
                show={ isShown }
                target={ (forceOpen && customTarget) ? customTarget : buttonRef.current }
                placement="top"
                rootClose={ true }
                onHide={ handleClose }
                transition={ false }
            >
                <Popover id="nitro-chat-gif-popover" style={ { width: '410px', maxWidth: 'none' } } className="nitro-chat-popover nitro-chat-gif-popover">
                    <div className="popover-header-custom d-flex align-items-center justify-content-between px-2 py-1">
                        <span className="fw-bold small text-white">Selector de GIFs</span>
                        <div className="btn-close-popover" onClick={ handleClose }>✕</div>
                    </div>

                    <div className="popover-tabs d-flex px-2 py-1 gap-1 border-bottom border-secondary overflow-auto">
                        { GIF_CATEGORIES.map(cat => (
                            <button
                                key={ cat.id }
                                type="button"
                                className={ `tab-btn ${ activeCategory === cat.id ? 'active' : '' }` }
                                onClick={ () => { setActiveCategory(cat.id); setSearchTerm(''); setUrlError(''); } }
                                title={ cat.name }
                            >
                                <span style={ { fontSize: '13px' } }>{ cat.name }</span>
                            </button>
                        )) }
                    </div>

                    { activeCategory !== 'custom' && (
                        <div className="px-2 pt-2">
                            <input
                                type="text"
                                className="form-control form-control-sm gif-search-input"
                                placeholder="Buscar GIF (risa, aplausos, baile, habbten...)"
                                value={ searchTerm }
                                onChange={ e => setSearchTerm(e.target.value) }
                            />
                        </div>
                    ) }

                    <div className="popover-body-custom p-2">
                        { activeCategory === 'custom' ? (
                            <form onSubmit={ handleCustomSubmit } className="custom-gif-container">
                                <div className="mb-2" style={ { fontSize: '13px', color: '#f1f5f9' } }>
                                    Pega un enlace directo de GIF en formato HTTPS seguro:
                                </div>
                                <div className="d-flex gap-2 mb-2">
                                    <input
                                        type="url"
                                        className="form-control form-control-sm bg-dark text-white border-secondary"
                                        placeholder="https://media.giphy.com/.../giphy.gif"
                                        value={ customUrl }
                                        onChange={ e => { setCustomUrl(e.target.value); setUrlError(''); } }
                                        autoFocus
                                    />
                                    <Button
                                        variant="primary"
                                        className="btn-sm px-3"
                                        disabled={ !isCustomUrlValid }
                                        onClick={ handleCustomSubmit }
                                    >
                                        Enviar
                                    </Button>
                                </div>
                                { urlError && (
                                    <div className="text-danger mb-2 p-1.5 rounded bg-black" style={ { fontSize: '12px' } }>
                                        { urlError }
                                    </div>
                                ) }
                                { isCustomUrlValid && (
                                    <div className="custom-preview text-center p-2 rounded bg-black">
                                        <div className="text-secondary mb-1" style={ { fontSize: '13px' } }>Vista previa:</div>
                                        <img
                                            src={ customUrl.trim() }
                                            alt="Preview"
                                            className="img-fluid rounded"
                                            style={ { maxHeight: '120px' } }
                                            onError={ () => setUrlError('No se pudo cargar la imagen desde este enlace.') }
                                        />
                                    </div>
                                ) }
                                <div className="mt-2 border-top border-secondary pt-2" style={ { fontSize: '12px', color: '#cbd5e1' } }>
                                    <strong style={ { color: '#facc15' } }>Dominios permitidos:</strong> Giphy, Tenor, Imgur, Discord CDN.
                                </div>
                            </form>
                        ) : (
                            <div className="gif-grid">
                                { filteredGifs.length === 0 ? (
                                    <div className="text-center py-3" style={ { fontSize: '13px', color: '#cbd5e1' } }>
                                        No se encontraron GIFs con "{ searchTerm }"
                                    </div>
                                ) : (
                                    filteredGifs.map(gif => (
                                        <div
                                            key={ gif.id }
                                            className="gif-item-card"
                                            title={ gif.title }
                                            onClick={ () => handleSelect(gif.url) }
                                        >
                                            <img
                                                src={ gif.url }
                                                alt={ gif.title }
                                                loading="lazy"
                                                className="gif-thumb"
                                            />
                                            <div className="gif-title-overlay">{ gif.title }</div>
                                        </div>
                                    ))
                                ) }
                            </div>
                        ) }
                    </div>
                </Popover>
            </Overlay>
        </>
    );
};
