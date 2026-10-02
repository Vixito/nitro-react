import { FC, PropsWithChildren, useEffect, useRef, useState } from 'react';
import { FaCheck, FaPaintBrush, FaSave } from 'react-icons/fa';
import { GetRoomSession, GetSessionDataManager, LocalizeText, WiredFurniType, WiredSelectionVisualizer } from '../../../api';
import { Button, Column, Flex, NitroCardContentView, NitroCardHeaderView, NitroCardView, Text } from '../../../common';
import { useWired } from '../../../hooks';
import { WiredFurniSelectorView } from './WiredFurniSelectorView';

export interface WiredBaseViewProps
{
    wiredType: string;
    requiresFurni: number;
    hasSpecialInput: boolean;
    save: () => void;
    validate?: () => boolean;
}

interface WiredClipboardData
{
    wiredType: string;
    spriteId: number;
    name: string;
    intData: number[];
    stringData: string;
    furniIds: number[];
    actionDelay: number;
}

export const WiredBaseView: FC<PropsWithChildren<WiredBaseViewProps>> = props =>
{
    const { wiredType = '', requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_NONE, save = null, validate = null, children = null, hasSpecialInput = false } = props;
    const [ wiredName, setWiredName ] = useState<string>(null);
    const [ wiredDescription, setWiredDescription ] = useState<string>(null);
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

    const onApplyWithoutClosing = () =>
    {
        if(validate && !validate()) return;

        if(save) save();

        saveWired();
        showToast('✓ Ajustes aplicados');
    };

    const handleCopySettings = () =>
    {
        if(!trigger) return;

        const clipboardData: WiredClipboardData = {
            wiredType,
            spriteId: trigger.spriteId || -1,
            name: wiredName || 'Wired',
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

        if(raw.furniIds && raw.furniIds.length && setFurniIds && requiresFurni > WiredFurniType.STUFF_SELECTION_OPTION_NONE)
        {
            setFurniIds(prev =>
            {
                if(prev && prev.length) WiredSelectionVisualizer.clearSelectionShaderFromFurni(prev);
                WiredSelectionVisualizer.applySelectionShaderToFurni(raw.furniIds);
                return [ ...raw.furniIds ];
            });
        }

        showToast('✓ Configuración pegada');
        setIsMenuOpen(false);
    };

    const handleClearFurniSelection = () =>
    {
        if(setFurniIds)
        {
            setFurniIds(prev =>
            {
                if(prev && prev.length) WiredSelectionVisualizer.clearSelectionShaderFromFurni(prev);
                return [];
            });
        }
        showToast('✓ Selección de furnis borrada');
        setIsMenuOpen(false);
    };

    const handleResetDefaults = () =>
    {
        if(setIntParams) setIntParams([]);
        if(setStringParam) setStringParam('');
        if(setActionDelay) setActionDelay(0);
        if(setFurniIds)
        {
            setFurniIds(prev =>
            {
                if(prev && prev.length) WiredSelectionVisualizer.clearSelectionShaderFromFurni(prev);
                return [];
            });
        }
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
            if(!(window as any).__WIRED_CLIPBOARD__)
            {
                handleCopySettings();
            }
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
        if(session)
        {
            session.sendChatMessage(':wired', 0);
        }
    };

    const handleSaveMenu = () =>
    {
        setIsMenuOpen(false);
        onApplyWithoutClosing();
    };

    const saveWiredRef = useRef(saveWired);
    saveWiredRef.current = saveWired;

    useEffect(() =>
    {
        if(!needsSave) return;

        if(saveWiredRef.current) saveWiredRef.current();

        setNeedsSave(false);
    }, [ needsSave ]);

    useEffect(() =>
    {
        if(!trigger)
        {
            initializedTriggerIdRef.current = -1;
            return;
        }

        if(initializedTriggerIdRef.current === trigger.id) return;
        initializedTriggerIdRef.current = trigger.id;

        const spriteId = (trigger.spriteId || -1);
        const furniData = GetSessionDataManager().getFloorItemData(spriteId);

        if(!furniData)
        {
            setWiredName(('NAME: ' + spriteId));
            setWiredDescription(('NAME: ' + spriteId));
        }
        else
        {
            setWiredName(furniData.name);
            setWiredDescription(furniData.description);
        }

        if(hasSpecialInput)
        {
            setIntParams(trigger.intData || []);
            setStringParam(trigger.stringData || '');
        }
        
        if(requiresFurni > WiredFurniType.STUFF_SELECTION_OPTION_NONE)
        {
            setFurniIds(prevValue =>
            {
                if(prevValue && prevValue.length) WiredSelectionVisualizer.clearSelectionShaderFromFurni(prevValue);

                if(trigger.selectedItems && trigger.selectedItems.length)
                {
                    WiredSelectionVisualizer.applySelectionShaderToFurni(trigger.selectedItems);

                    return [ ...trigger.selectedItems ];
                }

                return [];
            });
        }

        setAllowsFurni(requiresFurni);

        if(continuousBrush)
        {
            const raw = (window as any).__WIRED_CLIPBOARD__ || (sessionStorage.getItem('wired_clipboard') ? JSON.parse(sessionStorage.getItem('wired_clipboard')) : null);
            if(raw && raw.spriteId === spriteId)
            {
                if(raw.intData && setIntParams) setIntParams([ ...raw.intData ]);
                if(raw.stringData !== undefined && setStringParam) setStringParam(raw.stringData);
                if(raw.actionDelay !== undefined && setActionDelay) setActionDelay(raw.actionDelay);
                if(raw.furniIds && setFurniIds && requiresFurni > WiredFurniType.STUFF_SELECTION_OPTION_NONE)
                {
                    setFurniIds(prev =>
                    {
                        if(prev && prev.length) WiredSelectionVisualizer.clearSelectionShaderFromFurni(prev);
                        WiredSelectionVisualizer.applySelectionShaderToFurni(raw.furniIds);
                        return [ ...raw.furniIds ];
                    });
                }
                if(saveWiredRef.current) saveWiredRef.current();
                showToast('✓ Brocha: Ajustes aplicados y guardados');
            }
        }
    }, [ trigger, hasSpecialInput, requiresFurni, setIntParams, setStringParam, setFurniIds, setAllowsFurni, continuousBrush, setActionDelay ]);

    const hasClipboard = !!((window as any).__WIRED_CLIPBOARD__ || sessionStorage.getItem('wired_clipboard'));

    return (
        <NitroCardView uniqueKey="nitro-wired" className="nitro-wired" theme="primary-slim" overflow="visible">
            <NitroCardHeaderView headerText={ LocalizeText('wiredfurni.title') } onCloseClick={ onClose }>
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

            { continuousBrush && (
                <Flex alignItems="center" justifyContent="between" className="px-2 py-1 bg-info text-dark small fw-bold">
                    <Flex alignItems="center" gap={ 1 }>
                        <FaPaintBrush />
                        <span>Modo copiar en otro Wired activo</span>
                    </Flex>
                    <span style={{ cursor: 'pointer' }} onClick={ toggleContinuousBrush }>Desactivar</span>
                </Flex>
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
                    <div
                        className="nitro-wired-menu-item"
                        onClick={ toggleContinuousBrush }
                    >
                        <span className={ `wired-menu-checkbox ${ continuousBrush ? 'checked' : '' }` }>
                            { continuousBrush && <FaCheck /> }
                        </span>
                        <span>Copiar en otro Wired</span>
                    </div>
                    <div className="nitro-wired-menu-divider" />
                    <div 
                        className={ `nitro-wired-menu-item ${ (!furniIds || !furniIds.length) ? 'disabled' : '' }` }
                        onClick={ (furniIds && furniIds.length) ? handleClearFurniSelection : undefined }
                    >
                        <span>Borrar selección de furnis</span>
                    </div>
                    <div className="nitro-wired-menu-item" onClick={ handleResetDefaults }>
                        <span>Restablecer a los valores predeterminados</span>
                    </div>
                    <div className="nitro-wired-menu-divider" />
                    <div className="nitro-wired-menu-item" onClick={ handleOpenCreatorTools }>
                        <span>Abrir herramientas de creación Wired</span>
                    </div>
                    <div className="nitro-wired-menu-divider" />
                    <div className="nitro-wired-menu-item" onClick={ handleSaveMenu }>
                        <span>Guardar</span>
                    </div>
                    <div className="nitro-wired-menu-item" onClick={ onClose }>
                        <span>Cerrar</span>
                    </div>
                </div>
            ) }

            <NitroCardContentView>
                <Column gap={ 1 }>
                    <Flex alignItems="center" gap={ 1 }>
                        <i className={ `icon icon-wired-${ wiredType }` } />
                        <Text bold>{ wiredName }</Text>
                    </Flex>
                    <Text small>{ wiredDescription }</Text>
                </Column>
                { !!children && <hr className="m-0 bg-dark" /> }
                { children }
                { (requiresFurni > WiredFurniType.STUFF_SELECTION_OPTION_NONE) &&
                    <>
                        <hr className="m-0 bg-dark" />
                        <WiredFurniSelectorView />
                    </> }
                <Flex alignItems="center" gap={ 1 } className="mt-2">
                    <Button fullWidth variant="success" onClick={ onSave }>{ LocalizeText('wiredfurni.ready') }</Button>
                    <Button fullWidth variant="primary" onClick={ onApplyWithoutClosing }>
                        <FaSave className="me-1" />
                        <span>Aplicar</span>
                    </Button>
                    <Button fullWidth variant="secondary" onClick={ onClose }>{ LocalizeText('cancel') }</Button>
                </Flex>
            </NitroCardContentView>
        </NitroCardView>
    );
};
