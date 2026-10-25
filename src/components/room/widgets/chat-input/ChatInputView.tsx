import { HabboClubLevelEnum, RoomControllerLevel } from '@nitrots/nitro-renderer';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChatMessageTypeEnum, GetClubMemberLevel, GetConfiguration, GetSessionDataManager, LocalizeText, RoomWidgetUpdateChatInputContentEvent } from '../../../../api';
import { Text } from '../../../../common';
import { useChatInputWidget, useRoom, useSessionInfo, useUiEvent } from '../../../../hooks';
import { useEraTheme } from '../../../../hooks/era/useEraTheme';
import { ChatInputEmojiPickerView } from './ChatInputEmojiPickerView';
import { ChatInputGifPickerView } from './ChatInputGifPickerView';
import { ChatInputStyleSelectorView } from './ChatInputStyleSelectorView';

export const ChatInputView: FC<{}> = props =>
{
    const { currentEra } = useEraTheme();
    const [ chatValue, setChatValue ] = useState<string>('');
    const { chatStyleId = 0, updateChatStyleId = null } = useSessionInfo();
    const { selectedUsername = '', floodBlocked = false, floodBlockedSeconds = 0, setIsTyping = null, setIsIdle = null, sendChat = null } = useChatInputWidget();
    const { roomSession = null } = useRoom();
    const [ portalTarget, setPortalTarget ] = useState<HTMLElement | null>(null);
    const inputRef = useRef<HTMLInputElement>();
    const modeSelectorRef = useRef<HTMLDivElement>(null);
    const [ chatMode, setChatMode ] = useState<'say' | 'shout' | 'whisper'>('say');
    const [ isModeDropdownOpen, setModeDropdownOpen ] = useState(false);
    const [ isEmojiPickerOpen, setEmojiPickerOpen ] = useState(false);
    const [ isGifPickerOpen, setGifPickerOpen ] = useState(false);
    const chatModeIdWhisper = useMemo(() => LocalizeText('widgets.chatinput.mode.whisper'), []);
    const chatModeIdShout = useMemo(() => LocalizeText('widgets.chatinput.mode.shout'), []);
    const chatModeIdSpeak = useMemo(() => LocalizeText('widgets.chatinput.mode.speak'), []);
    const maxChatLength = useMemo(() => GetConfiguration<number>('chat.input.maxlength', 100), []);

    const anotherInputHasFocus = useCallback(() =>
    {
        const activeElement = document.activeElement;

        if(!activeElement) return false;

        if(inputRef && (inputRef.current === activeElement)) return false;

        if(!(activeElement instanceof HTMLInputElement) && !(activeElement instanceof HTMLTextAreaElement)) return false;

        return true;
    }, [ inputRef ]);

    const setInputFocus = useCallback(() =>
    {
        inputRef.current.focus();

        inputRef.current.setSelectionRange((inputRef.current.value.length * 2), (inputRef.current.value.length * 2));
    }, [ inputRef ]);

    const checkSpecialKeywordForInput = useCallback(() =>
    {
        setChatValue(prevValue =>
        {
            if((prevValue !== chatModeIdWhisper) || !selectedUsername.length) return prevValue;

            return (`${ prevValue } ${ selectedUsername }`);
        });
    }, [ selectedUsername, chatModeIdWhisper ]);

    const sendChatValue = useCallback((value: string, shiftKey: boolean = false) =>
    {
        if(!value || (value === '')) return;

        let chatType = (shiftKey ? ChatMessageTypeEnum.CHAT_SHOUT : ChatMessageTypeEnum.CHAT_DEFAULT);
        if(currentEra === 'shockwave2006')
        {
            if(chatMode === 'shout') chatType = ChatMessageTypeEnum.CHAT_SHOUT;
            else if(chatMode === 'whisper') chatType = ChatMessageTypeEnum.CHAT_WHISPER;
        }
        let text = value;

        const parts = text.split(' ');

        let recipientName = '';
        let append = '';

        switch(parts[0])
        {
            case chatModeIdWhisper:
                chatType = ChatMessageTypeEnum.CHAT_WHISPER;
                recipientName = parts[1];
                append = (chatModeIdWhisper + ' ' + recipientName + ' ');

                parts.shift();
                parts.shift();
                break;
            case chatModeIdShout:
                chatType = ChatMessageTypeEnum.CHAT_SHOUT;

                parts.shift();
                break;
            case chatModeIdSpeak:
                chatType = ChatMessageTypeEnum.CHAT_DEFAULT;

                parts.shift();
                break;
        }

        text = parts.join(' ');

        setIsTyping(false);
        setIsIdle(false);

        if(text.length <= maxChatLength)
        {
            if(/%CC%/g.test(encodeURIComponent(text)))
            {
                setChatValue('');
            }
            else
            {
                setChatValue('');
                sendChat(text, chatType, recipientName, chatStyleId);
            }
        }

        setChatValue(append);
    }, [ chatModeIdWhisper, chatModeIdShout, chatModeIdSpeak, maxChatLength, chatStyleId, setIsTyping, setIsIdle, sendChat, currentEra, chatMode ]);

    const updateChatInput = useCallback((value: string) =>
    {
        if(!value || !value.length)
        {
            setIsTyping(false);
        }
        else
        {
            setIsTyping(true);
            setIsIdle(true);
        }

        setChatValue(value);
    }, [ setIsTyping, setIsIdle ]);

    const onKeyDownEvent = useCallback((event: KeyboardEvent) =>
    {
        if(floodBlocked || !inputRef.current || anotherInputHasFocus()) return;

        if(document.activeElement !== inputRef.current) setInputFocus();

        const value = (event.target as HTMLInputElement).value;

        switch(event.key)
        {
            case ' ':
            case 'Space':
                checkSpecialKeywordForInput();
                return;
            case 'NumpadEnter':
            case 'Enter':
                sendChatValue(value, event.shiftKey);
                return;
            case 'Backspace':
                if(value)
                {
                    const parts = value.split(' ');

                    if((parts[0] === chatModeIdWhisper) && (parts.length === 3) && (parts[2] === ''))
                    {
                        setChatValue('');
                    }
                }
                return;
        }

    }, [ floodBlocked, inputRef, chatModeIdWhisper, anotherInputHasFocus, setInputFocus, checkSpecialKeywordForInput, sendChatValue ]);

    useUiEvent<RoomWidgetUpdateChatInputContentEvent>(RoomWidgetUpdateChatInputContentEvent.CHAT_INPUT_CONTENT, event =>
    {
        switch(event.chatMode)
        {
            case RoomWidgetUpdateChatInputContentEvent.WHISPER: {
                setChatValue(`${ chatModeIdWhisper } ${ event.userName } `);
                return;
            }
            case RoomWidgetUpdateChatInputContentEvent.SHOUT:
                return;
        }
    });

    const chatStyleIds = useMemo(() =>
    {
        let styleIds: number[] = [];
        const sessionDataManager = GetSessionDataManager();
        if(!sessionDataManager) return styleIds;

        const styles = GetConfiguration<{ styleId: number, minRank: number, isSystemStyle: boolean, isHcOnly: boolean, isVipOnly?: boolean, isAmbassadorOnly: boolean }[]>('chat.styles');

        if(styles && styles.length)
        {
            for(const style of styles)
            {
                if(!style) continue;
                if(styleIds.indexOf(style.styleId) >= 0) continue;

                if(GetConfiguration<number[]>('chat.styles.disabled', []).indexOf(style.styleId) >= 0) continue;

                if(style.minRank > 1)
                {
                    if(sessionDataManager.hasSecurity(style.minRank)) styleIds.push(style.styleId);
                    continue;
                }

                if(style.isSystemStyle)
                {
                    if(sessionDataManager.hasSecurity(RoomControllerLevel.MODERATOR))
                    {
                        styleIds.push(style.styleId);
                        continue;
                    }
                }

                if(style.isVipOnly)
                {
                    if(GetClubMemberLevel() >= HabboClubLevelEnum.VIP || sessionDataManager.hasSecurity(RoomControllerLevel.MODERATOR))
                    {
                        styleIds.push(style.styleId);
                    }
                    continue;
                }

                if(style.isHcOnly)
                {
                    if(GetClubMemberLevel() >= HabboClubLevelEnum.CLUB || sessionDataManager.hasSecurity(RoomControllerLevel.MODERATOR))
                    {
                        styleIds.push(style.styleId);
                    }
                    continue;
                }

                if(style.isAmbassadorOnly && sessionDataManager.isAmbassador)
                {
                    styleIds.push(style.styleId);
                    continue;
                }

                if(!style.isHcOnly && !style.isVipOnly && !style.isAmbassadorOnly && !style.isSystemStyle)
                {
                    styleIds.push(style.styleId);
                }
            }
        }

        return Array.from(new Set(styleIds));
    }, []);

    useEffect(() =>
    {
        document.body.addEventListener('keydown', onKeyDownEvent);

        return () =>
        {
            document.body.removeEventListener('keydown', onKeyDownEvent);
        }
    }, [ onKeyDownEvent ]);

    useEffect(() =>
    {
        if(!inputRef.current) return;

        inputRef.current.parentElement.dataset.value = chatValue;
    }, [ chatValue ]);

    const onSelectEmoji = useCallback((emoji: string) =>
    {
        setChatValue(prev =>
        {
            if(!inputRef.current) return prev + emoji;
            const start = inputRef.current.selectionStart ?? prev.length;
            const end = inputRef.current.selectionEnd ?? prev.length;
            const next = prev.substring(0, start) + emoji + prev.substring(end);
            setTimeout(() => {
                if(inputRef.current)
                {
                    inputRef.current.focus();
                    inputRef.current.setSelectionRange(start + emoji.length, start + emoji.length);
                }
            }, 50);
            return next;
        });
        setIsTyping(true);
        setIsIdle(true);
    }, [ setIsTyping, setIsIdle ]);

    const onSelectGif = useCallback((gifUrl: string) =>
    {
        const gifTag = `[gif]${ gifUrl }[/gif]`;
        setChatValue(prev =>
        {
            const space = prev && !prev.endsWith(' ') ? ' ' : '';
            return `${ prev }${ space }${ gifTag }`;
        });
        setIsTyping(true);
        setIsIdle(true);
        setTimeout(() => {
            if(inputRef.current) inputRef.current.focus();
        }, 50);
    }, [ setIsTyping, setIsIdle ]);

    useEffect(() =>
    {
        const updateTarget = () =>
        {
            const el = document.getElementById('toolbar-chat-input-container');
            if(el) setPortalTarget(el);
        };

        updateTarget();
        const timer = setTimeout(updateTarget, 100);
        return () => clearTimeout(timer);
    }, [ currentEra, roomSession ]);

    if(!roomSession || roomSession.isSpectator) return null;

    const target = portalTarget || (typeof document !== 'undefined' ? document.getElementById('toolbar-chat-input-container') : null);
    if(!target) return null;

    return (
        createPortal(
            <div className="nitro-chat-input-container">
                { currentEra === 'shockwave2006' && (
                    <div ref={ modeSelectorRef } className="chat-mode-selector-shockwave2006" onClick={ () => setModeDropdownOpen(!isModeDropdownOpen) }>
                        <span className="mode-label">{ chatMode === 'say' ? 'Decir' : chatMode === 'shout' ? 'Gritar' : 'Susurrar' }</span>
                        <div className="mode-divider" />
                        <span className="mode-arrow">▼</span>
                        { isModeDropdownOpen && (
                            <div className="chat-mode-dropdown-menu">
                                <div className={ `dropdown-item ${ chatMode === 'say' ? 'active' : '' }` } onClick={ (e) => { e.stopPropagation(); setChatMode('say'); setModeDropdownOpen(false); } }>Decir</div>
                                <div className={ `dropdown-item ${ chatMode === 'shout' ? 'active' : '' }` } onClick={ (e) => { e.stopPropagation(); setChatMode('shout'); setModeDropdownOpen(false); } }>Gritar</div>
                                <div className={ `dropdown-item ${ chatMode === 'whisper' ? 'active' : '' }` } onClick={ (e) => { e.stopPropagation(); setChatMode('whisper'); setModeDropdownOpen(false); } }>Susurrar</div>
                                <div className="dropdown-divider" />
                                <div className="dropdown-item" onClick={ (e) => { e.stopPropagation(); setModeDropdownOpen(false); setEmojiPickerOpen(true); setGifPickerOpen(false); } }>HabMoji</div>
                                <div className="dropdown-item" onClick={ (e) => { e.stopPropagation(); setModeDropdownOpen(false); setGifPickerOpen(true); setEmojiPickerOpen(false); } }>GIFs</div>
                            </div>
                        )}
                    </div>
                )}
                <div className="input-sizer align-items-center">
                    { !floodBlocked &&
                    <input ref={ inputRef } type="text" className="chat-input" placeholder={ currentEra === 'shockwave2006' ? '' : LocalizeText('widgets.chatinput.default') } value={ chatValue } maxLength={ maxChatLength } onChange={ event => updateChatInput(event.target.value) } onMouseDown={ event => setInputFocus() } /> }
                    { floodBlocked &&
                    <Text variant="danger">{ LocalizeText('chat.input.alert.flood', [ 'time' ], [ floodBlockedSeconds.toString() ]) } </Text> }
                </div>
                <div className="chat-addons">
                    <ChatInputEmojiPickerView onSelectEmoji={ onSelectEmoji } forceOpen={ isEmojiPickerOpen } onClose={ () => setEmojiPickerOpen(false) } customTarget={ modeSelectorRef.current } />
                    <ChatInputGifPickerView onSelectGif={ onSelectGif } forceOpen={ isGifPickerOpen } onClose={ () => setGifPickerOpen(false) } customTarget={ modeSelectorRef.current } />
                    <ChatInputStyleSelectorView chatStyleId={ chatStyleId } chatStyleIds={ chatStyleIds } selectChatStyleId={ updateChatStyleId } />
                </div>
            </div>, target)
    );
}
