import { FC, useMemo, useRef, useState } from 'react';
import { Overlay, Popover } from 'react-bootstrap';
import { Base } from '../../../../common';

interface ChatInputGifPickerViewProps
{
    onSelectGif: (gifUrl: string) => void;
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
    // 🔥 Trending / Reacciones
    {
        id: 'cheer-leo',
        title: 'Leonardo Toast',
        url: 'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif',
        category: 'trending',
        keywords: [ 'cheers', 'salud', 'toast', 'celebrate', 'leo' ]
    },
    {
        id: 'mind-blown',
        title: 'Mind Blown',
        url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
        category: 'trending',
        keywords: [ 'mind blown', 'explosion', 'wow', 'omg', 'shock' ]
    },
    {
        id: 'applause',
        title: 'Aplausos',
        url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif',
        category: 'trending',
        keywords: [ 'clap', 'applause', 'bravo', 'aplausos', 'bien' ]
    },
    {
        id: 'yes-nod',
        title: 'Asentir / Yes',
        url: 'https://media.giphy.com/media/ne3xrYlWtQFtC/giphy.gif',
        category: 'trending',
        keywords: [ 'yes', 'si', 'nod', 'claro', 'agree' ]
    },
    {
        id: 'no-finger',
        title: 'No con el dedo',
        url: 'https://media.giphy.com/media/VTxmwaCEwSlZm/giphy.gif',
        category: 'trending',
        keywords: [ 'no', 'negativo', 'nope', 'never' ]
    },
    {
        id: 'facepalm',
        title: 'Facepalm',
        url: 'https://media.giphy.com/media/3og0INyCmHlNylks9O/giphy.gif',
        category: 'trending',
        keywords: [ 'facepalm', 'desastre', 'dios mio', 'verguenza' ]
    },
    {
        id: 'cry-cat',
        title: 'Gato Llorando',
        url: 'https://media.giphy.com/media/OPU6wzx8JrHna/giphy.gif',
        category: 'trending',
        keywords: [ 'cry', 'llorar', 'triste', 'sad', 'cat' ]
    },
    {
        id: 'laugh-elvira',
        title: 'Risa / Laugh',
        url: 'https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif',
        category: 'trending',
        keywords: [ 'laugh', 'risa', 'jaja', 'lol', 'funny' ]
    },

    // 💃 Bailes / Dances
    {
        id: 'dance-carlton',
        title: 'Baile Carlton',
        url: 'https://media.giphy.com/media/pa37AAGzKXoek/giphy.gif',
        category: 'dance',
        keywords: [ 'carlton', 'dance', 'baile', 'fresh prince', 'feliz' ]
    },
    {
        id: 'cat-vibe',
        title: 'Cat Vibing',
        url: 'https://media.giphy.com/media/jpbnoe3UIa8TU8LM13/giphy.gif',
        category: 'dance',
        keywords: [ 'cat', 'gato', 'vibe', 'musica', 'dance' ]
    },
    {
        id: 'dance-snoop',
        title: 'Snoop Dogg Dance',
        url: 'https://media.giphy.com/media/DHqth0hVQoIzS/giphy.gif',
        category: 'dance',
        keywords: [ 'snoop', 'dance', 'ritmo', 'party' ]
    },
    {
        id: 'party-blob',
        title: 'Party Parrot / Rave',
        url: 'https://media.giphy.com/media/l3q2wJsC23ikJg9xe/giphy.gif',
        category: 'dance',
        keywords: [ 'party', 'fiesta', 'rave', 'dance' ]
    },

    // 😂 Memes
    {
        id: 'popcat',
        title: 'Pop Cat',
        url: 'https://media.giphy.com/media/S604D5NhkhPgSPpwGx/giphy.gif',
        category: 'memes',
        keywords: [ 'popcat', 'cat', 'meme', 'pop' ]
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
        title: 'This Is Fine',
        url: 'https://media.giphy.com/media/NTur7XlVDUdqM/giphy.gif',
        category: 'memes',
        keywords: [ 'this is fine', 'fuego', 'tranquilo', 'dog', 'perro' ]
    },
    {
        id: 'doge-wow',
        title: 'Doge Wow',
        url: 'https://media.giphy.com/media/9C1nyePmmrUAUblvJN/giphy.gif',
        category: 'memes',
        keywords: [ 'doge', 'wow', 'shiba', 'much' ]
    },
    {
        id: 'spongebob-mock',
        title: 'Bob Esponja Burlón',
        url: 'https://media.giphy.com/media/QUXYcgCwvCm4cKcrnU/giphy.gif',
        category: 'memes',
        keywords: [ 'spongebob', 'bob esponja', 'mock', 'meme' ]
    },

    // 🏨 Habbo Classic / Pixel
    {
        id: 'habbo-dance',
        title: 'Habbo Pogo Dance',
        url: 'https://i.imgur.com/G3p22Fq.gif',
        category: 'habbo',
        keywords: [ 'habbo', 'dance', 'pogo', 'retro', 'pixel' ]
    },
    {
        id: 'habbo-duck',
        title: 'Pato Habbo Amarillo',
        url: 'https://i.imgur.com/gK1Nf4m.gif',
        category: 'habbo',
        keywords: [ 'pato', 'duck', 'habbo', 'cuak', 'pixel' ]
    },
    {
        id: 'habbo-wave',
        title: 'Habbo Saludo / Wave',
        url: 'https://i.imgur.com/39wF4d6.gif',
        category: 'habbo',
        keywords: [ 'habbo', 'hola', 'saludo', 'wave', 'avatar' ]
    },
    {
        id: 'habbo-hc-badge',
        title: 'Habbo Club Badge',
        url: 'https://i.imgur.com/wP4dI1u.gif',
        category: 'habbo',
        keywords: [ 'hc', 'habbo club', 'vip', 'badge' ]
    }
];

const GIF_CATEGORIES = [
    { id: 'trending', name: 'Populares', icon: '🔥' },
    { id: 'dance', name: 'Bailes', icon: '💃' },
    { id: 'memes', name: 'Memes', icon: '😂' },
    { id: 'habbo', name: 'Habbo Pixel', icon: '🏨' },
    { id: 'custom', name: 'Pegar Link', icon: '🔗' }
];

export const ChatInputGifPickerView: FC<ChatInputGifPickerViewProps> = ({ onSelectGif }) =>
{
    const [ visible, setVisible ] = useState(false);
    const [ activeCategory, setActiveCategory ] = useState('trending');
    const [ searchTerm, setSearchTerm ] = useState('');
    const [ customUrl, setCustomUrl ] = useState('');
    const buttonRef = useRef<HTMLDivElement>(null);

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
        onSelectGif(url);
        setVisible(false);
        setCustomUrl('');
    };

    const handleCustomSubmit = (e: React.FormEvent) =>
    {
        e.preventDefault();
        if(!customUrl.trim()) return;
        handleSelect(customUrl.trim());
    };

    return (
        <>
            <Base
                innerRef={ buttonRef }
                pointer
                title="GIFs"
                className="chat-addon-btn chat-gif-btn"
                onClick={ () => setVisible(prev => !prev) }
            >
                <span className="chat-btn-label gif-badge">GIF</span>
            </Base>

            <Overlay
                show={ visible }
                target={ buttonRef.current }
                placement="top"
                rootClose={ true }
                onHide={ () => setVisible(false) }
                transition={ false }
            >
                <Popover className="nitro-chat-popover nitro-chat-gif-popover">
                    <div className="popover-header-custom d-flex align-items-center justify-content-between px-2 py-1">
                        <span className="fw-bold small text-white">Selector de GIFs</span>
                        <span className="btn-close-popover" onClick={ () => setVisible(false) }>✕</span>
                    </div>

                    <div className="popover-tabs d-flex px-2 py-1 gap-1 border-bottom border-secondary overflow-auto">
                        { GIF_CATEGORIES.map(cat => (
                            <button
                                key={ cat.id }
                                type="button"
                                className={ `tab-btn btn btn-sm ${ activeCategory === cat.id ? 'active' : '' }` }
                                onClick={ () => { setActiveCategory(cat.id); setSearchTerm(''); } }
                                title={ cat.name }
                            >
                                <span className="me-1">{ cat.icon }</span>
                                <span className="small">{ cat.name }</span>
                            </button>
                        )) }
                    </div>

                    { activeCategory !== 'custom' && (
                        <div className="px-2 pt-2">
                            <input
                                type="text"
                                className="form-control form-control-sm bg-dark text-white border-secondary"
                                placeholder="Buscar GIF (risa, aplausos, baile, habbo...)"
                                value={ searchTerm }
                                onChange={ e => setSearchTerm(e.target.value) }
                            />
                        </div>
                    ) }

                    <div className="popover-body-custom p-2">
                        { activeCategory === 'custom' ? (
                            <form onSubmit={ handleCustomSubmit } className="custom-gif-container">
                                <label className="form-label small text-white mb-1">
                                    Pega la URL de cualquier GIF (Tenor, Giphy, Discord, etc.):
                                </label>
                                <div className="input-group input-group-sm mb-2">
                                    <input
                                        type="url"
                                        className="form-control bg-dark text-white border-secondary"
                                        placeholder="https://.../imagen.gif"
                                        value={ customUrl }
                                        onChange={ e => setCustomUrl(e.target.value) }
                                        autoFocus
                                    />
                                    <button type="submit" className="btn btn-primary" disabled={ !customUrl.trim() }>
                                        Enviar
                                    </button>
                                </div>
                                { customUrl.trim() && (
                                    <div className="custom-preview text-center p-2 rounded bg-black">
                                        <div className="small text-muted mb-1">Vista Previa:</div>
                                        <img
                                            src={ customUrl.trim() }
                                            alt="Preview"
                                            className="img-fluid rounded"
                                            style={ { maxHeight: '120px' } }
                                            onError={ (e) => { (e.target as HTMLElement).style.display = 'none'; } }
                                        />
                                    </div>
                                ) }
                            </form>
                        ) : (
                            <div className="gif-grid">
                                { filteredGifs.length === 0 ? (
                                    <div className="text-center text-muted small py-3">
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
