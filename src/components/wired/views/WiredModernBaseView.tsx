import { FC, PropsWithChildren, ReactNode, useEffect, useRef, useState } from 'react';
import { FaCheck, FaPaintBrush } from 'react-icons/fa';
import { GetRoomSession, GetSessionDataManager, LocalizeText, ProductTypeEnum, WiredFurniType, WiredSelectionVisualizer } from '../../../api';
import { Flex, LayoutFurniImageView, NitroCardContentView, NitroCardHeaderView, NitroCardView, Text } from '../../../common';
import { useWired } from '../../../hooks';

export interface WiredModernBaseViewProps
{
    headerVariant: 'green' | 'teal' | 'dark';
    headerTitle: string;
    iconType?: 'variable' | 'effect' | 'trigger' | 'condition';
    subtitleLinkText?: string;
    onSubtitleLinkClick?: () => void;
    furniSpriteId?: number;
    illustrationGraphic?: ReactNode;
    save: () => void;
    validate?: () => boolean;
    hasSpecialInput?: boolean;
}

interface WiredClipboardData
{
    spriteId: number;
    name: string;
    intData: number[];
    stringData: string;
    furniIds: number[];
    actionDelay: number;
}

export const WiredModernBaseView: FC<PropsWithChildren<WiredModernBaseViewProps>> = props =>
{
    const {
        headerVariant = 'dark',
        headerTitle = 'Furni Wired',
        iconType = 'variable',
        subtitleLinkText = null,
        onSubtitleLinkClick = null,
        furniSpriteId = -1,
        illustrationGraphic = null,
        save = null,
        validate = null,
        children = null,
        hasSpecialInput = false
    } = props;

    const [ needsSave, setNeedsSave ] = useState<boolean>(false);
    const [ isMenuOpen, setIsMenuOpen ] = useState<boolean>(false);
    const [ toastMessage, setToastMessage ] = useState<string>(null);
    const [ continuousBrush, setContinuousBrush ] = useState<boolean>(() => sessionStorage.getItem('wired_continuous_brush') === 'true');
    const { trigger = null, setTrigger = null, setIntParams = null, setStringParam = null, setFurniIds = null, setAllowsFurni = null, saveWired = null, intParams = [], stringParam = '', furniIds = [], actionDelay = 0, setActionDelay = null, setIsWiredCreatorToolsVisible } = useWired();
    const initializedTriggerIdRef = useRef<number>(-1);
    const menuRef = useRef<HTMLDivElement>(null);
    const menuButtonRef = useRef<HTMLDivElement>(null);

    useEffect(() =>
    {
        if(!isMenuOpen) return;

        const handleGlobalMouseDown = (event: MouseEvent) =>
        {
            const target = event.target as Node;
            if(menuRef.current && menuRef.current.contains(target)) return;
            if(menuButtonRef.current && menuButtonRef.current.contains(target)) return;
            setIsMenuOpen(false);
        };

        window.addEventListener('mousedown', handleGlobalMouseDown, true);
        return () => window.removeEventListener('mousedown', handleGlobalMouseDown, true);
    }, [ isMenuOpen ]);

    const showToast = (msg: string) =>
    {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 2500);
    };

    const onClose = () =>
    {
        setIsMenuOpen(false);
        setTrigger(null);
    };

    const onSave = () =>
    {
        if(validate && !validate()) return;
        if(save) save();
        setNeedsSave(true);
    };

    const saveWiredRef = useRef(saveWired);
    saveWiredRef.current = saveWired;

    useEffect(() =>
    {
        if(!needsSave) return;
        if(saveWiredRef.current) saveWiredRef.current();
        setNeedsSave(false);
        onClose();
    }, [ needsSave ]);

    const handleCopySettings = () =>
    {
        if(!trigger) return;

        const clipboardData: WiredClipboardData = {
            spriteId: trigger.spriteId || -1,
            name: headerTitle,
            intData: [ ...(intParams || trigger.intData || []) ],
            stringData: stringParam || trigger.stringData || '',
            furniIds: [ ...(furniIds || trigger.selectedItems || []) ],
            actionDelay: actionDelay || 0
        };

        (window as any).__WIRED_CLIPBOARD__ = clipboardData;
        sessionStorage.setItem('wired_clipboard', JSON.stringify(clipboardData));
        showToast('✓ Configuración copiada');
        setIsMenuOpen(false);
    };

    const handlePasteSettings = () =>
    {
        const raw = (window as any).__WIRED_CLIPBOARD__ || (sessionStorage.getItem('wired_clipboard') ? JSON.parse(sessionStorage.getItem('wired_clipboard')) : null);
        if(!raw)
        {
            showToast('⚠️ No hay configuración en el portapapeles');
            return;
        }

        if(raw.intData && setIntParams) setIntParams([ ...raw.intData ]);
        if(raw.stringData !== undefined && setStringParam) setStringParam(raw.stringData);
        if(raw.actionDelay !== undefined && setActionDelay) setActionDelay(raw.actionDelay);

        showToast('✓ Configuración pegada');
        setIsMenuOpen(false);
    };

    const handleResetDefaults = () =>
    {
        if(setIntParams) setIntParams([]);
        if(setStringParam) setStringParam('');
        if(setActionDelay) setActionDelay(0);
        showToast('✓ Restablecido a los valores predeterminados');
        setIsMenuOpen(false);
    };

    const toggleContinuousBrush = () =>
    {
        const nextState = !continuousBrush;
        setContinuousBrush(nextState);
        sessionStorage.setItem('wired_continuous_brush', nextState ? 'true' : 'false');
        if(nextState)
        {
            if(!(window as any).__WIRED_CLIPBOARD__) handleCopySettings();
            showToast('✓ Copiar en otro Wired activado');
        }
        else
        {
            showToast('Copiar en otro Wired desactivado');
        }
        setIsMenuOpen(false);
    };

    const handleOpenCreatorTools = () =>
    {
        setIsMenuOpen(false);
        setIsWiredCreatorToolsVisible(true);
        const session = GetRoomSession();
        if(session) session.sendChatMessage(':wired', 0);
    };

    useEffect(() =>
    {
        if(!trigger)
        {
            initializedTriggerIdRef.current = -1;
            return;
        }

        if(initializedTriggerIdRef.current === trigger.id) return;
        initializedTriggerIdRef.current = trigger.id;

        if(hasSpecialInput)
        {
            setIntParams(trigger.intData || []);
            setStringParam(trigger.stringData || '');
        }

        setAllowsFurni(WiredFurniType.STUFF_SELECTION_OPTION_NONE);
    }, [ trigger, hasSpecialInput, setIntParams, setStringParam, setAllowsFurni ]);

    const spriteToRender = furniSpriteId > 0 ? furniSpriteId : (trigger?.spriteId || -1);
    const hasClipboard = !!((window as any).__WIRED_CLIPBOARD__ || sessionStorage.getItem('wired_clipboard'));

    const renderHeaderIcon = () =>
    {
        switch(iconType)
        {
            case 'variable':
                return <span className="wired-modern-header-icon variable">❖</span>;
            case 'effect':
                return <span className="wired-modern-header-icon effect">✸</span>;
            case 'trigger':
                return <span className="wired-modern-header-icon trigger">◎</span>;
            default:
                return <span className="wired-modern-header-icon">✦</span>;
        }
    };

    return (
        <NitroCardView uniqueKey="nitro-wired-modern" className="nitro-wired-modern" theme="primary-slim" overflow="visible">
            <NitroCardHeaderView headerText="Furni Wired" onCloseClick={ onClose }>
                <div
                    ref={ menuButtonRef }
                    className={ `nitro-card-header-wired-menu ${ isMenuOpen ? 'active' : '' }` }
                    title="Menú de ajustes Wired"
                    onMouseDownCapture={ event => { event.stopPropagation(); event.nativeEvent.stopImmediatePropagation(); } }
                    onClick={ () => setIsMenuOpen(prev => !prev) }
                >
                    <div className="hamburger-line" />
                    <div className="hamburger-line" />
                </div>
            </NitroCardHeaderView>

            { toastMessage && (
                <div className="nitro-wired-toast">
                    { toastMessage }
                </div>
            ) }

            { isMenuOpen && (
                <div
                    className="nitro-wired-backdrop"
                    onMouseDown={ e => { e.stopPropagation(); setIsMenuOpen(false); } }
                    onClick={ e => { e.stopPropagation(); setIsMenuOpen(false); } }
                />
            ) }

            { isMenuOpen && (
                <div ref={ menuRef } className="nitro-wired-dropdown" onMouseDown={ e => e.stopPropagation() }>
                    <div className="nitro-wired-menu-item" onClick={ handleCopySettings }>
                        <span>Copiar configuración</span>
                    </div>
                    <div
                        className={ `nitro-wired-menu-item ${ !hasClipboard ? 'disabled' : '' }` }
                        onClick={ hasClipboard ? handlePasteSettings : undefined }
                    >
                        <span>Pegar configuración</span>
                    </div>
                    <div className="nitro-wired-menu-item" onClick={ toggleContinuousBrush }>
                        <span className={ `wired-menu-checkbox ${ continuousBrush ? 'checked' : '' }` }>
                            { continuousBrush && <FaCheck /> }
                        </span>
                        <span>Copiar en otro Wired</span>
                    </div>
                    <div className="nitro-wired-menu-divider" />
                    <div className="nitro-wired-menu-item" onClick={ handleResetDefaults }>
                        <span>Restablecer a los valores predeterminados</span>
                    </div>
                    <div className="nitro-wired-menu-divider" />
                    <div className="nitro-wired-menu-item" onClick={ handleOpenCreatorTools }>
                        <span>Abrir herramientas de creación Wired</span>
                    </div>
                    <div className="nitro-wired-menu-divider" />
                    <div className="nitro-wired-menu-item" onClick={ onSave }>
                        <span>Guardar</span>
                    </div>
                    <div className="nitro-wired-menu-item" onClick={ onClose }>
                        <span>Cerrar</span>
                    </div>
                </div>
            ) }

            <NitroCardContentView className="p-0 bg-transparent">
                <div className="wired-modern-inner-container">
                    <div className={ `wired-modern-banner-strip ${ headerVariant }` }>
                        <div className="d-flex align-items-center gap-2">
                            { renderHeaderIcon() }
                            <div className="d-flex flex-column">
                                <span className="wired-modern-banner-title">{ headerTitle }</span>
                                { subtitleLinkText && (
                                    <span
                                        className="wired-modern-banner-link"
                                        onClick={ onSubtitleLinkClick ? onSubtitleLinkClick : handleOpenCreatorTools }
                                    >
                                        { subtitleLinkText }
                                    </span>
                                ) }
                            </div>
                        </div>
                    </div>

                    <div className="wired-modern-body-wrapper">
                        <div className="wired-modern-form-column">
                            { children }
                        </div>

                        <div className="wired-modern-preview-column">
                            { illustrationGraphic ? (
                                illustrationGraphic
                            ) : (
                                spriteToRender > 0 && (
                                    <div className="wired-modern-furni-preview-box">
                                        <LayoutFurniImageView
                                            productType={ ProductTypeEnum.FLOOR }
                                            productClassId={ spriteToRender }
                                            direction={ 2 }
                                            scale={ 1.2 }
                                        />
                                    </div>
                                )
                            ) }
                        </div>
                    </div>

                    <div className="wired-modern-footer">
                        <button className="wired-modern-btn primary" onClick={ onSave }>
                            Listo
                        </button>
                        <button className="wired-modern-btn" onClick={ onClose }>
                            Cancelar
                        </button>
                    </div>
                </div>
            </NitroCardContentView>
        </NitroCardView>
    );
};
