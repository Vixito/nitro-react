import { ILinkEventTracker } from '@nitrots/nitro-renderer';
import { CSSProperties, FC, useCallback, useEffect, useMemo, useState } from 'react';
import { FaChair, FaCheck, FaPalette, FaPencilAlt, FaShoppingBag, FaSmile, FaTimes } from 'react-icons/fa';
import { AddEventLinkTracker, GetSessionDataManager, RemoveLinkEventTracker } from '../../../../../api';
import {
    broadcastInfoStandUpdate,
    DEFAULT_INFOSTAND_STYLE,
    getActionDef,
    getFurniDef,
    getPlateDef,
    INFOSTAND_ACTIONS,
    INFOSTAND_FURNIS,
    INFOSTAND_PLATES,
    useInfoStandFurniSprite,
    UserInfoStandStyle
} from '../../../../../api/infostand/InfoStandStyleService';
import { LayoutAvatarImageView, LayoutCurrencyIcon, NitroCardContentView, NitroCardHeaderView, NitroCardTabsItemView, NitroCardTabsView, NitroCardView, UserProfileIconView } from '../../../../../common';
import { useEraTheme } from '../../../../../hooks/era/useEraTheme';
import './InfoStandCustom.scss';

type EditorTab = 'plates' | 'furnis' | 'actions' | 'shop';
type SubCategory = 'plates' | 'furnis' | 'actions';

interface UnlocksMap
{
    plates: string[];
    furnis: string[];
    actions: string[];
}

const FurniGridSprite: FC<{ furnitureId: number; name: string }> = ({ furnitureId, name }) =>
{
    const spriteUrl = useInfoStandFurniSprite(furnitureId);
    if(furnitureId <= 0)
    {
        return <span className="infostand-editor-none">Ninguno</span>;
    }
    if(!spriteUrl)
    {
        return <span className="infostand-editor-none">Cargando...</span>;
    }
    return <img src={ spriteUrl } alt={ name } className="infostand-editor-furni-thumb" />;
};

export const InfoStandEditorView: FC<{}> = () =>
{
    const { currentEra } = useEraTheme();
    const isShockwave2006 = currentEra === 'shockwave2006';

    const [ isVisible, setIsVisible ] = useState(false);
    const [ activeTab, setActiveTab ] = useState<EditorTab>('plates');
    const [ shopSubTab, setShopSubTab ] = useState<SubCategory>('plates');
    const [ equipped, setEquipped ] = useState<UserInfoStandStyle>(DEFAULT_INFOSTAND_STYLE);
    const [ preview, setPreview ] = useState<UserInfoStandStyle>(DEFAULT_INFOSTAND_STYLE);
    const [ unlocks, setUnlocks ] = useState<UnlocksMap>({ plates: [ 'default', 'emerald', 'sapphire' ], furnis: [ 'none', 'chair_plasty' ], actions: [ 'std', 'wav', 'sit', 'sml' ] });
    const [ pixels, setPixels ] = useState<number>(0);
    const [ busy, setBusy ] = useState(false);
    const [ notice, setNotice ] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

    const loadCatalog = useCallback(async () =>
    {
        try
        {
            const res = await fetch('/api/client/infostand/catalog', { credentials: 'include' });
            const json = await res.json();
            if(json && json.success)
            {
                const eq: UserInfoStandStyle = json.equipped || DEFAULT_INFOSTAND_STYLE;
                setEquipped(eq);
                setPreview(eq);
                if(json.unlocks) setUnlocks(json.unlocks);
                setPixels(Number(json.pixels || 0));
            }
        }
        catch
        {
            setNotice({ type: 'err', text: 'No se pudo cargar el editor de Infostand.' });
        }
    }, []);

    useEffect(() =>
    {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) =>
            {
                const parts = url.split('/');
                if(parts.length < 2) return;
                switch(parts[1])
                {
                    case 'show':
                    case 'open':
                        setNotice(null);
                        setIsVisible(true);
                        loadCatalog();
                        return;
                    case 'hide':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setIsVisible(prev =>
                        {
                            const next = !prev;
                            if(next)
                            {
                                setNotice(null);
                                loadCatalog();
                            }
                            return next;
                        });
                        return;
                }
            },
            eventUrlPrefix: 'infostand-editor/'
        };

        AddEventLinkTracker(linkTracker);
        return () => RemoveLinkEventTracker(linkTracker);
    }, [ loadCatalog ]);

    const ownFigure = GetSessionDataManager()?.figure || '';
    const ownName = GetSessionDataManager()?.userName || 'Jugador';
    const ownUserId = GetSessionDataManager()?.userId || 0;

    const previewPlate = useMemo(() => getPlateDef(preview.plateId), [ preview.plateId ]);
    const previewFurni = useMemo(() => getFurniDef(preview.furniId), [ preview.furniId ]);
    const previewAction = useMemo(() => getActionDef(preview.actionId), [ preview.actionId ]);
    const previewFurniUrl = useInfoStandFurniSprite(previewFurni.furnitureId);

    const activeCategory: SubCategory = activeTab === 'shop' ? shopSubTab : activeTab;

    const selectedItem = useMemo(() =>
    {
        if(activeCategory === 'plates') return previewPlate;
        if(activeCategory === 'furnis') return previewFurni;
        return previewAction;
    }, [ activeCategory, previewPlate, previewFurni, previewAction ]);

    const isSelectedUnlocked = unlocks[activeCategory]?.includes(selectedItem.id) || selectedItem.price === 0;
    const isSelectedEquipped =
        (activeCategory === 'plates' && equipped.plateId === selectedItem.id) ||
        (activeCategory === 'furnis' && equipped.furniId === selectedItem.id) ||
        (activeCategory === 'actions' && equipped.actionId === selectedItem.id);

    const hasUnsavedUnlockedChanges =
        (preview.plateId !== equipped.plateId && unlocks.plates.includes(preview.plateId)) ||
        (preview.furniId !== equipped.furniId && unlocks.furnis.includes(preview.furniId)) ||
        (preview.actionId !== equipped.actionId && unlocks.actions.includes(preview.actionId));

    const handleEquipSelected = async (overrideStyle?: UserInfoStandStyle) =>
    {
        if(busy) return;
        const target = overrideStyle || {
            plateId: unlocks.plates.includes(preview.plateId) ? preview.plateId : equipped.plateId,
            furniId: unlocks.furnis.includes(preview.furniId) ? preview.furniId : equipped.furniId,
            actionId: unlocks.actions.includes(preview.actionId) ? preview.actionId : equipped.actionId
        };
        setBusy(true);
        setNotice(null);
        try
        {
            const res = await fetch('/api/client/infostand/equip', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(target)
            });
            const json = await res.json();
            if(json && json.success && json.style)
            {
                setEquipped(json.style);
                setPreview(json.style);
                if(ownUserId > 0) broadcastInfoStandUpdate(ownUserId, json.style);
                setNotice({ type: 'ok', text: '¡Info Stand actualizado!' });
            }
            else
            {
                setNotice({ type: 'err', text: json?.error || 'No se pudo equipar.' });
            }
        }
        catch
        {
            setNotice({ type: 'err', text: 'Error de conexión al guardar.' });
        }
        finally
        {
            setBusy(false);
        }
    };

    const handleBuySelected = async () =>
    {
        if(busy || isSelectedUnlocked) return;
        setBusy(true);
        setNotice(null);
        try
        {
            const res = await fetch('/api/client/infostand/buy', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category: activeCategory,
                    itemId: selectedItem.id,
                    autoEquip: true
                })
            });
            const json = await res.json();
            if(json && json.success)
            {
                if(json.unlocks) setUnlocks(json.unlocks);
                if(json.equipped)
                {
                    setEquipped(json.equipped);
                    setPreview(json.equipped);
                    if(ownUserId > 0) broadcastInfoStandUpdate(ownUserId, json.equipped);
                }
                if(typeof json.pixels === 'number') setPixels(json.pixels);
                setNotice({ type: 'ok', text: `¡Comprado y equipado: ${ selectedItem.name }!` });
            }
            else
            {
                setNotice({ type: 'err', text: json?.error || 'No se pudo comprar.' });
            }
        }
        catch
        {
            setNotice({ type: 'err', text: 'Error de conexión al comprar.' });
        }
        finally
        {
            setBusy(false);
        }
    };

    if(!isVisible) return null;

    const isShopMode = activeTab === 'shop';

    const visiblePlates = isShopMode
        ? INFOSTAND_PLATES.filter(p => p.price > 0 && !unlocks.plates.includes(p.id))
        : INFOSTAND_PLATES.filter(p => unlocks.plates.includes(p.id));

    const visibleFurnis = isShopMode
        ? INFOSTAND_FURNIS.filter(f => f.price > 0 && !unlocks.furnis.includes(f.id))
        : INFOSTAND_FURNIS.filter(f => unlocks.furnis.includes(f.id));

    const visibleActions = isShopMode
        ? INFOSTAND_ACTIONS.filter(a => a.price > 0 && !unlocks.actions.includes(a.id))
        : INFOSTAND_ACTIONS.filter(a => unlocks.actions.includes(a.id));

    const hasPreviewCustomPlate = previewPlate.id !== 'default';
    const platePreviewCss = {
        '--is-plate-bg': previewPlate.bgStyle,
        '--is-plate-border': previewPlate.borderColor,
        '--is-plate-accent': previewPlate.accentColor,
        '--is-plate-emblem': previewPlate.emblemColor
    } as CSSProperties;

    const seatShift = (previewFurni.furnitureId > 0 && previewAction.id === 'sit') ? (previewFurni.seatOffsetY || -6) : 0;

    return (
        <NitroCardView uniqueKey="infostand-editor" className="habbten-infostand-editor" theme="primary-slim">
            <NitroCardHeaderView headerText="Editor de Info Stand" onCloseClick={ () => setIsVisible(false) } />
            <NitroCardTabsView>
                <NitroCardTabsItemView isActive={ activeTab === 'plates' } onClick={ () => { setActiveTab('plates'); setNotice(null); } }>
                    <FaPalette className="me-1" /> Placas
                </NitroCardTabsItemView>
                <NitroCardTabsItemView isActive={ activeTab === 'furnis' } onClick={ () => { setActiveTab('furnis'); setNotice(null); } }>
                    <FaChair className="me-1" /> Furnis
                </NitroCardTabsItemView>
                <NitroCardTabsItemView isActive={ activeTab === 'actions' } onClick={ () => { setActiveTab('actions'); setNotice(null); } }>
                    <FaSmile className="me-1" /> Acciones
                </NitroCardTabsItemView>
                <NitroCardTabsItemView isActive={ activeTab === 'shop' } onClick={ () => { setActiveTab('shop'); setNotice(null); } }>
                    <FaShoppingBag className="me-1" /> Tienda
                </NitroCardTabsItemView>
            </NitroCardTabsView>
            <NitroCardContentView className="infostand-editor-body">
                { isShopMode && (
                    <div className="infostand-shop-subtabs">
                        <div className="subtab-group">
                            <button type="button" className={ `subtab-btn ${ shopSubTab === 'plates' ? 'active' : '' }` } onClick={ () => setShopSubTab('plates') }>Placas</button>
                            <button type="button" className={ `subtab-btn ${ shopSubTab === 'furnis' ? 'active' : '' }` } onClick={ () => setShopSubTab('furnis') }>Furnis</button>
                            <button type="button" className={ `subtab-btn ${ shopSubTab === 'actions' ? 'active' : '' }` } onClick={ () => setShopSubTab('actions') }>Acciones</button>
                        </div>
                        <div className="infostand-ducket-balance" title="Tus Duckets disponibles">
                            <LayoutCurrencyIcon type={ 0 } className="infostand-currency-coin" />
                            <span>{ pixels.toLocaleString() }</span>
                        </div>
                    </div>
                ) }

                <div className="infostand-editor-split">
                    {/* Columna izquierda: lista / grilla */}
                    <div className="infostand-editor-list">
                        { activeCategory === 'plates' && (
                            visiblePlates.length === 0 ? (
                                <div className="infostand-empty-state">¡Ya tienes todas las placas desbloqueadas!</div>
                            ) : (
                                <div className="infostand-plates-list">
                                    { visiblePlates.map(plate =>
                                    {
                                        const isSelected = preview.plateId === plate.id;
                                        const isEq = equipped.plateId === plate.id;
                                        const owned = unlocks.plates.includes(plate.id);
                                        return (
                                            <button
                                                type="button"
                                                key={ plate.id }
                                                className={ `infostand-plate-row ${ isSelected ? 'selected' : '' }` }
                                                onClick={ () => setPreview(prev => ({ ...prev, plateId: plate.id })) }
                                            >
                                                <div
                                                    className={ `infostand-mini-pill pattern-${ plate.pattern || 'none' }` }
                                                    style={ { background: plate.bgStyle, borderColor: plate.borderColor } }
                                                >
                                                    <span className="mini-emblem" style={ { background: plate.emblemColor } }>
                                                        { plate.emblemLabel || '' }
                                                    </span>
                                                    <span className="mini-label">{ plate.name }</span>
                                                </div>
                                                { isEq ? (
                                                    <span className="infostand-row-equipped" title="Equipado">
                                                        <FaCheck />
                                                    </span>
                                                ) : !owned ? (
                                                    <span className="infostand-row-price">
                                                        <LayoutCurrencyIcon type={ 0 } className="infostand-currency-coin" />
                                                        <span>{ plate.price.toLocaleString() }</span>
                                                    </span>
                                                ) : (
                                                    <span className="infostand-row-owned">Tuya</span>
                                                ) }
                                            </button>
                                        );
                                    }) }
                                </div>
                            )
                        ) }

                        { activeCategory === 'furnis' && (
                            visibleFurnis.length === 0 ? (
                                <div className="infostand-empty-state">¡Ya tienes todos los furnis desbloqueados!</div>
                            ) : (
                                <div className="infostand-tile-grid">
                                    { visibleFurnis.map(furni =>
                                    {
                                        const isSelected = preview.furniId === furni.id;
                                        const isEq = equipped.furniId === furni.id;
                                        const owned = unlocks.furnis.includes(furni.id);
                                        return (
                                            <button
                                                type="button"
                                                key={ furni.id }
                                                className={ `infostand-tile ${ isSelected ? 'selected' : '' }` }
                                                onClick={ () => setPreview(prev => ({ ...prev, furniId: furni.id })) }
                                                title={ furni.name }
                                            >
                                                <div className="infostand-tile-art">
                                                    <FurniGridSprite furnitureId={ furni.furnitureId } name={ furni.name } />
                                                </div>
                                                <div className="infostand-tile-name">{ furni.name }</div>
                                                { isEq && <span className="tile-tag is-eq" title="Equipado"><FaCheck /></span> }
                                                { !owned && (
                                                    <span className="tile-tag is-price">
                                                        <LayoutCurrencyIcon type={ 0 } className="infostand-currency-coin is-sm" />
                                                        <span>{ furni.price }</span>
                                                    </span>
                                                ) }
                                            </button>
                                        );
                                    }) }
                                </div>
                            )
                        ) }

                        { activeCategory === 'actions' && (
                            visibleActions.length === 0 ? (
                                <div className="infostand-empty-state">¡Ya tienes todas las acciones desbloqueadas!</div>
                            ) : (
                                <div className="infostand-tile-grid">
                                    { visibleActions.map(act =>
                                    {
                                        const isSelected = preview.actionId === act.id;
                                        const isEq = equipped.actionId === act.id;
                                        const owned = unlocks.actions.includes(act.id);
                                        return (
                                            <button
                                                type="button"
                                                key={ act.id }
                                                className={ `infostand-tile is-action ${ isSelected ? 'selected' : '' }` }
                                                onClick={ () => setPreview(prev => ({ ...prev, actionId: act.id })) }
                                                title={ act.name }
                                            >
                                                <div className="infostand-tile-art is-avatar">
                                                    <LayoutAvatarImageView
                                                        figure={ ownFigure }
                                                        direction={ 4 }
                                                        posture={ act.posture }
                                                        gesture={ act.gesture }
                                                        expression={ act.expression }
                                                        carryItem={ act.carryItem }
                                                    />
                                                </div>
                                                <div className="infostand-tile-name">{ act.name }</div>
                                                { isEq && <span className="tile-tag is-eq" title="Equipado"><FaCheck /></span> }
                                                { !owned && (
                                                    <span className="tile-tag is-price">
                                                        <LayoutCurrencyIcon type={ 0 } className="infostand-currency-coin is-sm" />
                                                        <span>{ act.price }</span>
                                                    </span>
                                                ) }
                                            </button>
                                        );
                                    }) }
                                </div>
                            )
                        ) }
                    </div>

                    {/* Columna derecha: vista previa fiel a la era activa */}
                    <div className="infostand-editor-preview">
                        <div className="infostand-preview-caption">Vista previa</div>

                        <div className="infostand-preview-stage" style={ platePreviewCss }>
                            { isShockwave2006 ? (
                                /* Preview Shockwave 2006: plataforma isométrica + cápsula */
                                <div className="preview-era-shockwave">
                                    <div className="preview-pedestal">
                                        { previewFurniUrl && (
                                            <img src={ previewFurniUrl } alt={ previewFurni.name } className="preview-furni-layer" />
                                        ) }
                                        <div
                                            className="preview-avatar-layer"
                                            style={ { transform: seatShift ? `translateY(${ seatShift }px)` : undefined } }
                                        >
                                            <LayoutAvatarImageView
                                                figure={ ownFigure }
                                                direction={ 4 }
                                                posture={ previewAction.posture }
                                                gesture={ previewAction.gesture }
                                                expression={ previewAction.expression }
                                                carryItem={ previewAction.carryItem }
                                            />
                                        </div>
                                    </div>
                                    <div
                                        className={ `infostand-preview-pill pattern-${ previewPlate.pattern || 'none' }` }
                                        style={ { background: previewPlate.bgStyle, borderColor: previewPlate.borderColor } }
                                    >
                                        { hasPreviewCustomPlate && (
                                            <span className="preview-emblem" style={ { background: previewPlate.emblemColor } }>
                                                { previewPlate.emblemLabel || '' }
                                            </span>
                                        ) }
                                        <span className="preview-name">{ ownName }</span>
                                    </div>
                                </div>
                            ) : (
                                /* Preview Moderna / Flash 2012 / Móvil: réplica exacta de la tarjeta InfoStand */
                                <div
                                    className={ `preview-infostand-card ${ hasPreviewCustomPlate ? `has-custom-plate infostand-pattern-${ previewPlate.pattern || 'none' }` : '' }` }
                                    style={ hasPreviewCustomPlate ? platePreviewCss : undefined }
                                >
                                    <div className="preview-card-header">
                                        <div className="preview-card-user">
                                            { hasPreviewCustomPlate && (
                                                <span className="preview-card-emblem" style={ { background: previewPlate.emblemColor } }>
                                                    { previewPlate.emblemLabel || '' }
                                                </span>
                                            ) }
                                            { ownUserId > 0 && <UserProfileIconView userId={ ownUserId } /> }
                                            <span className="preview-card-username">{ ownName }</span>
                                        </div>
                                        <FaTimes className="preview-card-close" />
                                    </div>

                                    <div className="preview-card-divider" />

                                    <div className="preview-card-main">
                                        <div className="preview-card-body-image">
                                            { previewFurniUrl && (
                                                <img src={ previewFurniUrl } alt={ previewFurni.name } className="preview-card-furni" />
                                            ) }
                                            <div
                                                className="preview-card-avatar"
                                                style={ { transform: seatShift ? `translateY(${ seatShift }px)` : undefined } }
                                            >
                                                <LayoutAvatarImageView
                                                    figure={ ownFigure }
                                                    direction={ 4 }
                                                    posture={ previewAction.posture }
                                                    gesture={ previewAction.gesture }
                                                    expression={ previewAction.expression }
                                                    carryItem={ previewAction.carryItem }
                                                />
                                            </div>
                                        </div>
                                        <div className="preview-card-badges">
                                            <span className="preview-badge-slot" />
                                            <span className="preview-badge-slot" />
                                            <span className="preview-badge-slot" />
                                            <span className="preview-badge-slot" />
                                            <span className="preview-badge-slot" />
                                            <span className="preview-badge-slot" />
                                        </div>
                                    </div>

                                    <div className="preview-card-divider" />

                                    <div className="preview-card-motto">
                                        <FaPencilAlt className="preview-motto-icon" />
                                        <span>Tu misión aquí</span>
                                    </div>
                                </div>
                            ) }
                        </div>

                        <div className="infostand-preview-footer">
                            <div className="preview-selected-meta">
                                <span className="preview-selected-name">{ selectedItem.name }</span>
                                { !isSelectedUnlocked ? (
                                    <span className="price-pill">
                                        <LayoutCurrencyIcon type={ 0 } className="infostand-currency-coin" />
                                        <span>{ selectedItem.price.toLocaleString() }</span>
                                    </span>
                                ) : (
                                    <span className={ `owned-pill ${ isSelectedEquipped ? 'is-equipped' : '' }` }>
                                        { isSelectedEquipped ? 'Equipado' : 'Desbloqueado' }
                                    </span>
                                ) }
                            </div>

                            { !isSelectedUnlocked ? (
                                <button
                                    type="button"
                                    className="infostand-action-btn is-buy"
                                    disabled={ busy || pixels < selectedItem.price }
                                    onClick={ handleBuySelected }
                                >
                                    { busy ? (
                                        'Comprando...'
                                    ) : pixels < selectedItem.price ? (
                                        'Duckets insuficientes'
                                    ) : (
                                        <>
                                            <span>Comprar por</span>
                                            <LayoutCurrencyIcon type={ 0 } className="infostand-currency-coin is-sm" />
                                            <span>{ selectedItem.price.toLocaleString() }</span>
                                        </>
                                    ) }
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="infostand-action-btn is-equip"
                                    disabled={ busy || !hasUnsavedUnlockedChanges }
                                    onClick={ () => handleEquipSelected() }
                                >
                                    { busy ? 'Guardando...' : (hasUnsavedUnlockedChanges ? 'Equipar cambios' : 'Equipado') }
                                </button>
                            ) }
                        </div>

                        { notice && (
                            <div className={ `infostand-editor-notice ${ notice.type === 'ok' ? 'is-ok' : 'is-err' }` }>
                                { notice.text }
                            </div>
                        ) }
                    </div>
                </div>
            </NitroCardContentView>
        </NitroCardView>
    );
};
