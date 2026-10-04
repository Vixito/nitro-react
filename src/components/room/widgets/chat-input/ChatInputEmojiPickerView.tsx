import { FC, useMemo, useRef, useState } from 'react';
import { Overlay, Popover } from 'react-bootstrap';
import { Base, Flex } from '../../../../common';

interface ChatInputEmojiPickerViewProps
{
    onSelectEmoji: (emoji: string) => void;
}

interface HabboShortcut
{
    code: string;
    label: string;
    emoji: string;
}

const HABBO_SHORTCUTS: HabboShortcut[] = [
    { code: ':)', label: 'Sonrisa', emoji: '😊' },
    { code: ':D', label: 'Risa', emoji: '😃' },
    { code: ':(', label: 'Triste', emoji: '🙁' },
    { code: ':p', label: 'Lengua', emoji: '😛' },
    { code: ';)', label: 'Guiño', emoji: '😉' },
    { code: ':o', label: 'Sorpresa', emoji: '😮' },
    { code: '<3', label: 'Corazón', emoji: '❤️' },
    { code: '(skull)', label: 'Calavera', emoji: '💀' },
    { code: '(fire)', label: 'Fuego', emoji: '🔥' },
    { code: '(star)', label: 'Estrella', emoji: '⭐' },
    { code: '(thumbsup)', label: 'Like', emoji: '👍' },
    { code: '(thumbsdown)', label: 'Dislike', emoji: '👎' },
    { code: '(poop)', label: 'Caca', emoji: '💩' },
    { code: '(crown)', label: 'Corona', emoji: '👑' },
    { code: '(diamond)', label: 'Diamante', emoji: '💎' },
    { code: 'bobba', label: 'Bobba', emoji: '🤐' }
];

const EMOJI_CATEGORIES = [
    {
        id: 'smileys',
        name: 'Caras',
        icon: '😀',
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
        icon: '✌️',
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
        icon: '🔥',
        emojis: [
            '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💖',
            '💗', '💓', '💞', '💕', '💌', '💘', '💝', '💟', '💯', '🔥', '✨', '🌟', '⭐',
            '💥', '⚡', '💣', '🎈', '🎉', '🎊', '🏆', '🥇', '🥈', '🥉', '⚽', '🏀', '🎮',
            '🎲', '🎯', '🎳', '🎸', '🎹', '💸', '💵', '💰', '🪙', '💳', '⚠️', '⛔', '🚫',
            '✅', '❌', '❓', '❗'
        ]
    },
    {
        id: 'habbo',
        name: 'Habbo',
        icon: '🏨',
        emojis: []
    }
];

export const ChatInputEmojiPickerView: FC<ChatInputEmojiPickerViewProps> = ({ onSelectEmoji }) =>
{
    const [ visible, setVisible ] = useState(false);
    const [ activeCategory, setActiveCategory ] = useState('smileys');
    const [ searchTerm, setSearchTerm ] = useState('');
    const buttonRef = useRef<HTMLDivElement>(null);

    const filteredEmojis = useMemo(() =>
    {
        if(activeCategory === 'habbo') return [];

        const cat = EMOJI_CATEGORIES.find(c => c.id === activeCategory);
        if(!cat) return [];

        return cat.emojis;
    }, [ activeCategory ]);

    const filteredHabbo = useMemo(() =>
    {
        if(activeCategory !== 'habbo' && !searchTerm) return [];

        if(searchTerm)
        {
            const term = searchTerm.toLowerCase();
            return HABBO_SHORTCUTS.filter(s => s.code.toLowerCase().includes(term) || s.label.toLowerCase().includes(term));
        }

        return HABBO_SHORTCUTS;
    }, [ activeCategory, searchTerm ]);

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
                <Popover className="nitro-chat-popover nitro-chat-emoji-popover">
                    <div className="popover-header-custom d-flex align-items-center justify-content-between px-2 py-1">
                        <span className="fw-bold small text-white">Selector de Emojis</span>
                        <span className="btn-close-popover" onClick={ () => setVisible(false) }>✕</span>
                    </div>

                    <div className="popover-tabs d-flex px-2 py-1 gap-1 border-bottom border-secondary">
                        { EMOJI_CATEGORIES.map(cat => (
                            <button
                                key={ cat.id }
                                type="button"
                                className={ `tab-btn btn btn-sm ${ activeCategory === cat.id ? 'active' : '' }` }
                                onClick={ () => { setActiveCategory(cat.id); setSearchTerm(''); } }
                                title={ cat.name }
                            >
                                <span className="me-1">{ cat.icon }</span>
                                <span className="d-none d-sm-inline small">{ cat.name }</span>
                            </button>
                        )) }
                    </div>

                    <div className="popover-body-custom p-2">
                        { activeCategory === 'habbo' ? (
                            <div className="habbo-shortcuts-grid">
                                { filteredHabbo.map(s => (
                                    <div
                                        key={ s.code }
                                        className="habbo-shortcut-item d-flex align-items-center justify-content-between p-1 px-2 rounded mb-1"
                                        onClick={ () => handleSelect(s.emoji) }
                                    >
                                        <span className="shortcut-preview fs-5 me-2">{ s.emoji }</span>
                                        <span className="shortcut-code badge bg-dark text-warning font-monospace">{ s.code }</span>
                                        <span className="shortcut-label small text-muted ms-auto">{ s.label }</span>
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
