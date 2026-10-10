import { FC, useMemo, useRef, useState } from 'react';
import { Overlay, Popover } from 'react-bootstrap';
import { Base, Flex } from '../../../../common';

interface ChatInputEmojiPickerViewProps
{
    onSelectEmoji: (emoji: string) => void;
}

interface HabbtenShortcut
{
    code: string;
    label: string;
    emoji: string;
}

const HABBTEN_COMMAND_SHORTCUTS: HabbtenShortcut[] = [
    { code: ':emoji 1  o  :emoji sonrisa', label: 'Sonrisa', emoji: '😀' },
    { code: ':emoji 2  o  :emoji risa', label: 'Risa', emoji: '😂' },
    { code: ':emoji 3  o  :emoji corazon', label: 'Corazón', emoji: '❤️' },
    { code: ':emoji 4  o  :emoji fuego', label: 'Fuego', emoji: '🔥' },
    { code: ':emoji 5  o  :emoji megusta', label: 'Me gusta', emoji: '👍' },
    { code: ':emoji 6  o  :emoji nomegusta', label: 'No me gusta', emoji: '👎' },
    { code: ':emoji 7  o  :emoji calavera', label: 'Calavera', emoji: '💀' },
    { code: ':emoji 8  o  :emoji corona', label: 'Corona', emoji: '👑' },
    { code: ':emoji 9  o  :emoji estrella', label: 'Estrella', emoji: '⭐' },
    { code: ':emoji 10 o  :emoji diamante', label: 'Diamante', emoji: '💎' },
    { code: ':emoji 11 o  :emoji caca', label: 'Caca', emoji: '💩' },
    { code: ':emoji 12 o  :emoji fiesta', label: 'Fiesta', emoji: '🎉' },
    { code: ':emoji 13 o  :emoji gafas', label: 'Gafas', emoji: '😎' },
    { code: ':emoji 14 o  :emoji llanto', label: 'Triste', emoji: '😭' },
    { code: ':emoji 15 o  :emoji enojado', label: 'Enojado', emoji: '😡' },
    { code: ':emoji 16 o  :emoji aplausos', label: 'Aplausos', emoji: '👏' },
    { code: ':emoji 17 o  :emoji 100', label: '100', emoji: '💯' },
    { code: ':emoji 18 o  :emoji ojos', label: 'Ojos', emoji: '👀' },
    { code: ':emoji 19 o  :emoji pizza', label: 'Pizza', emoji: '🍕' },
    { code: ':emoji 20 o  :emoji cafe', label: 'Café', emoji: '☕' }
];

const EMOJI_CATEGORIES = [
    {
        id: 'smileys',
        name: 'Caras',
        emojis: [
            '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇',
            '🥰', '😍', '🤩', '😘', '😗', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗',
            '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
            '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶',
            '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕', '😟', '🙁', '😮',
            '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖',
            '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀',
            '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖'
        ]
    },
    {
        id: 'gestures',
        name: 'Gestos',
        emojis: [
            '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘',
            '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '🫵', '👍', '👎', '✊', '👊', '🤛',
            '🤜', '👏', '🙌', '🫶', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾',
            '👀', '👁️', '👅', '👄', '🫦', '🧠', '👑', '🧢', '🎩', '💎'
        ]
    },
    {
        id: 'symbols',
        name: 'Símbolos',
        emojis: [
            '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💖',
            '💗', '💓', '💞', '💕', '💌', '💘', '💝', '💟', '💯', '🔥', '✨', '🌟', '⭐',
            '💥', '⚡', '💣', '🎈', '🎉', '🎊', '🏆', '🥇', '🥈', '🥉', '⚽', '🏀', '🎮',
            '🎲', '🎯', '🎳', '🎸', '🎹', '💸', '💵', '💰', '🪙', '💳', '⚠️', '⛔', '🚫',
            '✅', '❌', '❓', '❗'
        ]
    },
    {
        id: 'commands',
        name: 'Comandos :emoji',
        emojis: []
    }
];

export const ChatInputEmojiPickerView: FC<ChatInputEmojiPickerViewProps> = ({ onSelectEmoji }) =>
{
    const [ visible, setVisible ] = useState(false);
    const [ activeCategory, setActiveCategory ] = useState('smileys');
    const buttonRef = useRef<HTMLDivElement>(null);

    const filteredEmojis = useMemo(() =>
    {
        if(activeCategory === 'commands') return [];

        const cat = EMOJI_CATEGORIES.find(c => c.id === activeCategory);
        if(!cat) return [];

        return cat.emojis;
    }, [ activeCategory ]);

    const handleSelect = (emoji: string) =>
    {
        onSelectEmoji(emoji);
        setVisible(false);
    };

    return (
        <>
            <Base
                innerRef={ buttonRef }
                pointer
                title="Emojis"
                className="icon chat-emoji-icon"
                onClick={ () => setVisible(prev => !prev) }
            />

            <Overlay
                show={ visible }
                target={ buttonRef.current }
                placement="top"
                rootClose={ true }
                onHide={ () => setVisible(false) }
                transition={ false }
            >
                <Popover id="nitro-chat-emoji-popover" style={ { width: '440px', maxWidth: 'none' } } className="nitro-chat-popover nitro-chat-emoji-popover">
                    <div className="popover-header-custom d-flex align-items-center justify-content-between px-2 py-1">
                        <span className="fw-bold text-white" style={ { fontSize: '13px' } }>Selector de Emojis</span>
                        <div className="btn-close-popover" onClick={ () => setVisible(false) }>✕</div>
                    </div>

                    <div className="popover-tabs d-flex px-2 py-1 gap-1 border-bottom border-secondary">
                        { EMOJI_CATEGORIES.map(cat => (
                            <button
                                key={ cat.id }
                                type="button"
                                className={ `tab-btn ${ activeCategory === cat.id ? 'active' : '' }` }
                                onClick={ () => setActiveCategory(cat.id) }
                                title={ cat.name }
                            >
                                <span style={ { fontSize: '13px' } }>{ cat.name }</span>
                            </button>
                        )) }
                    </div>

                    <div className="popover-body-custom p-2">
                        { activeCategory === 'commands' ? (
                            <div className="habbten-shortcuts-grid">
                                <div className="mb-2" style={ { fontSize: '13px', color: '#f1f5f9' } }>
                                    Escribe en el chat <strong style={ { color: '#facc15' } }>:emoji &lt;número o texto&gt;</strong> o haz clic para enviar:
                                </div>
                                { HABBTEN_COMMAND_SHORTCUTS.map(s => (
                                    <div
                                        key={ s.code }
                                        className="habbten-shortcut-item d-flex align-items-center justify-content-between rounded mb-1 cursor-pointer"
                                        onClick={ () => handleSelect(s.emoji) }
                                        title={ `Haz clic para insertar ${ s.emoji }` }
                                    >
                                        <div className="d-flex align-items-center gap-2 min-w-0">
                                            <span className="shortcut-preview">{ s.emoji }</span>
                                            <span className="shortcut-code badge bg-dark text-warning font-monospace">{ s.code }</span>
                                        </div>
                                        <span className="shortcut-label ms-2 text-nowrap flex-shrink-0">{ s.label }</span>
                                    </div>
                                )) }
                            </div>
                        ) : (
                            <div className="emoji-grid">
                                { filteredEmojis.map((emoji, idx) => (
                                    <button
                                        key={ idx }
                                        type="button"
                                        className="emoji-item btn btn-link p-0 text-decoration-none"
                                        onClick={ () => handleSelect(emoji) }
                                    >
                                        { emoji }
                                    </button>
                                )) }
                            </div>
                        ) }
                    </div>
                </Popover>
            </Overlay>
        </>
    );
};
