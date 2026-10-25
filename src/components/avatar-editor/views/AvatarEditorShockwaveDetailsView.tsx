import { AvatarEditorFigureCategory, UserFigureComposer } from '@nitrots/nitro-renderer';
import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { AvatarEditorAction, AvatarEditorUtilities, CategoryData, FigureData, GetRoomSession, GetSessionDataManager, IAvatarEditorCategoryModel, SendMessageComposer } from '../../../api';
import { DraggableWindow, DraggableWindowPosition, LayoutAvatarImageView } from '../../../common';

interface AvatarEditorShockwaveDetailsViewProps
{
    figureData: FigureData;
    figures: Map<string, FigureData>;
    categories: Map<string, IAvatarEditorCategoryModel>;
    setGender: (gender: string) => void;
    loadAvatarInEditor: (figure: string, gender: string, reset?: boolean) => void;
    lastFigure: string;
    lastGender: string;
    processAction: (action: string) => void;
    onClose: () => void;
}

interface LayerRowConfig
{
    key: string;
    modelCategory: string;
    figurePart: string;
    fallbackIcon: string;
}

const SHOCKWAVE_LAYERS: LayerRowConfig[] = [
    { key: 'hair', modelCategory: AvatarEditorFigureCategory.HEAD, figurePart: FigureData.HAIR, fallbackIcon: 'hr' },
    { key: 'face', modelCategory: AvatarEditorFigureCategory.GENERIC, figurePart: FigureData.FACE, fallbackIcon: 'he' },
    { key: 'shirt', modelCategory: AvatarEditorFigureCategory.TORSO, figurePart: FigureData.SHIRT, fallbackIcon: 'ch' },
    { key: 'pants', modelCategory: AvatarEditorFigureCategory.LEGS, figurePart: FigureData.TROUSERS, fallbackIcon: 'lg' },
    { key: 'shoes', modelCategory: AvatarEditorFigureCategory.LEGS, figurePart: FigureData.SHOES, fallbackIcon: 'sh' }
];

export const AvatarEditorShockwaveDetailsView: FC<AvatarEditorShockwaveDetailsViewProps> = props =>
{
    const {
        figureData,
        figures,
        categories,
        setGender,
        loadAvatarInEditor,
        lastFigure,
        lastGender,
        processAction,
        onClose
    } = props;

    const [ activeLayerIndex, setActiveLayerIndex ] = useState<number>(0);
    const [ updateId, setUpdateId ] = useState<number>(0);
    const [ motto, setMotto ] = useState<string>(() =>
    {
        const user = GetRoomSession()?.userDataManager?.getUserData(GetSessionDataManager().userId);
        return user?.custom || '';
    });

    const userName = useMemo(() => GetSessionDataManager().userName, []);

    // Ensure models and categories are initialized
    useEffect(() =>
    {
        if(!categories) return;

        categories.forEach(model =>
        {
            model.init();
            if(model.categories)
            {
                for(const cat of model.categories.values())
                {
                    cat.init();
                }
            }
        });

        setUpdateId(prev => prev + 1);
    }, [ categories ]);

    // Listen to figure updates
    useEffect(() =>
    {
        if(!figureData) return;

        figureData.notify = () => setUpdateId(prev => prev + 1);

        return () =>
        {
            if(figureData.notify) figureData.notify = null;
        };
    }, [ figureData ]);

    // Cycle part left or right
    const cyclePart = useCallback((modelCat: string, partKey: string, delta: number, layerIdx: number) =>
    {
        setActiveLayerIndex(layerIdx);

        if(!categories) return;
        const model = categories.get(modelCat);
        if(!model || !model.categories) return;

        let categoryData = model.categories.get(partKey);
        if(!categoryData)
        {
            model.init();
            categoryData = model.categories.get(partKey);
        }

        if(!categoryData || !categoryData.parts || categoryData.parts.length === 0) return;

        const currentIdx = categoryData.selectedPartIndex >= 0 ? categoryData.selectedPartIndex : 0;
        const totalParts = categoryData.parts.length;
        const newIdx = (currentIdx + delta + totalParts) % totalParts;

        model.selectPart(partKey, newIdx);
        setUpdateId(prev => prev + 1);
    }, [ categories ]);

    // Cycle color left or right
    const cycleColor = useCallback((modelCat: string, partKey: string, delta: number, layerIdx: number) =>
    {
        setActiveLayerIndex(layerIdx);

        if(!categories) return;
        const model = categories.get(modelCat);
        if(!model || !model.categories) return;

        let categoryData = model.categories.get(partKey);
        if(!categoryData)
        {
            model.init();
            categoryData = model.categories.get(partKey);
        }

        if(!categoryData) return;
        const palette = categoryData.getPalette(0);
        if(!palette || palette.length === 0) return;

        const currentIdx = categoryData.getCurrentColorIndex(0) >= 0 ? categoryData.getCurrentColorIndex(0) : 0;
        const totalColors = palette.length;
        const newIdx = (currentIdx + delta + totalColors) % totalColors;

        model.selectColor(partKey, newIdx, 0);
        setUpdateId(prev => prev + 1);
    }, [ categories ]);

    // Actions
    const handleCancel = useCallback(() =>
    {
        loadAvatarInEditor(lastFigure, lastGender);
        onClose();
    }, [ loadAvatarInEditor, lastFigure, lastGender, onClose ]);

    const handleDone = useCallback(() =>
    {
        if(motto !== undefined)
        {
            GetRoomSession()?.sendMottoMessage(motto);
        }

        SendMessageComposer(new UserFigureComposer(figureData.gender, figureData.getFigureString()));
        onClose();
    }, [ motto, figureData, onClose ]);

    const handleNext = useCallback(() =>
    {
        processAction(AvatarEditorAction.ACTION_RANDOMIZE);
        setUpdateId(prev => prev + 1);
    }, [ processAction ]);

    const handleGenderChange = useCallback((newGender: string) =>
    {
        if(newGender === figureData.gender) return;
        setGender(newGender);
    }, [ figureData.gender, setGender ]);

    // Helper to extract category data for a layer
    const getLayerData = (modelCat: string, partKey: string) =>
    {
        if(!categories) return null;
        const model = categories.get(modelCat);
        if(!model || !model.categories) return null;

        let categoryData = model.categories.get(partKey);
        if(!categoryData)
        {
            model.init();
            categoryData = model.categories.get(partKey);
        }

        if(categoryData && categoryData.parts)
        {
            const curPart = categoryData.getCurrentPart();
            if(curPart && !curPart.imageUrl)
            {
                curPart.init();
            }
        }

        return categoryData;
    };

    return (
        <DraggableWindow uniqueKey="shockwave-avatar-details" handleSelector=".shockwave-details-header" windowPosition={ DraggableWindowPosition.CENTER }>
            <div className="shockwave-avatar-details-window">
                {/* Header */}
                <div className="shockwave-details-header">
                    <div className="shockwave-header-dither" />
                    <span className="shockwave-header-title">Detalles de Habbten</span>
                    <div className="shockwave-header-dither" />
                    <div className="shockwave-details-close" onClick={ onClose } />
                </div>

                {/* Body */}
                <div className="shockwave-details-body">
                    <div className="shockwave-details-card">
                        {/* User Card */}
                        <div className="shockwave-user-card">
                            <div className="user-name">{ userName }</div>
                            <div className="mission-label">Tu Misión:</div>
                            <input
                                type="text"
                                className="mission-input"
                                value={ motto }
                                maxLength={ 38 }
                                onChange={ e => setMotto(e.target.value) }
                            />
                        </div>

                        {/* Gender Selector */}
                        <div className="shockwave-gender-selector">
                            <div className="gender-option" onClick={ () => handleGenderChange(FigureData.FEMALE) }>
                                <span className="gender-label">Chica</span>
                                <input
                                    type="radio"
                                    name="shockwave-gender"
                                    checked={ figureData.gender.toLowerCase() === 'f' }
                                    onChange={ () => handleGenderChange(FigureData.FEMALE) }
                                />
                            </div>
                            <div className="gender-option" onClick={ () => handleGenderChange(FigureData.MALE) }>
                                <span className="gender-label">Chico</span>
                                <input
                                    type="radio"
                                    name="shockwave-gender"
                                    checked={ figureData.gender.toLowerCase() === 'm' }
                                    onChange={ () => handleGenderChange(FigureData.MALE) }
                                />
                            </div>
                        </div>

                        {/* 5 Layer Rows & Center Avatar */}
                        <div className="shockwave-layers-container">
                            {/* Standing Avatar Preview */}
                            <div className="shockwave-avatar-preview">
                                <LayoutAvatarImageView
                                    figure={ figureData.getFigureString() }
                                    gender={ figureData.gender }
                                    direction={ 2 }
                                    scale={ 1.8 }
                                />
                            </div>

                            {/* 5 Rows */}
                            { SHOCKWAVE_LAYERS.map((layer, index) =>
                            {
                                const categoryData = getLayerData(layer.modelCategory, layer.figurePart);
                                const isSelected = (activeLayerIndex === index);
                                const curPart = categoryData?.getCurrentPart();
                                const colorItem = categoryData?.getSelectedColor(0);
                                const colorHex = colorItem ? colorItem.color : '#ffffff';

                                return (
                                    <div key={ layer.key } className={ `shockwave-layer-row row-${ index }` }>
                                        {/* Left Side: Prev Arrow, Slot Box, Next Arrow */}
                                        <div className="layer-controls-left">
                                            <div
                                                className="retro-arrow-btn arrow-left"
                                                onClick={ () => cyclePart(layer.modelCategory, layer.figurePart, -1, index) }
                                            >
                                                <svg width="12" height="15" viewBox="0 0 12 15">
                                                    <polygon
                                                        points="0,7.5 7,1 7,4.5 12,4.5 12,10.5 7,10.5 7,14"
                                                        fill="#cccccc"
                                                        stroke="#000000"
                                                        strokeWidth="1.2"
                                                        strokeLinejoin="round"
                                                    />
                                                </svg>
                                            </div>

                                            <div
                                                className={ `slot-box ${ isSelected ? 'selected' : '' }` }
                                                onClick={ () => setActiveLayerIndex(index) }
                                            >
                                                { curPart?.imageUrl ? (
                                                    <img src={ curPart.imageUrl } alt={ layer.key } />
                                                ) : (
                                                    <div className={ `nitro-avatar-editor-spritesheet ${ layer.fallbackIcon }-icon ${ isSelected ? 'selected' : '' }` } />
                                                ) }
                                            </div>

                                            <div
                                                className="retro-arrow-btn arrow-right"
                                                onClick={ () => cyclePart(layer.modelCategory, layer.figurePart, 1, index) }
                                            >
                                                <svg width="12" height="15" viewBox="0 0 12 15">
                                                    <polygon
                                                        points="12,7.5 5,1 5,4.5 0,4.5 0,10.5 5,10.5 5,14"
                                                        fill="#cccccc"
                                                        stroke="#000000"
                                                        strokeWidth="1.2"
                                                        strokeLinejoin="round"
                                                    />
                                                </svg>
                                            </div>
                                        </div>

                                        {/* Right Side: Prev Arrow, Color Swatch, Next Arrow */}
                                        <div className="layer-controls-right">
                                            <div
                                                className="retro-arrow-btn arrow-left"
                                                onClick={ () => cycleColor(layer.modelCategory, layer.figurePart, -1, index) }
                                            >
                                                <svg width="12" height="15" viewBox="0 0 12 15">
                                                    <polygon
                                                        points="0,7.5 7,1 7,4.5 12,4.5 12,10.5 7,10.5 7,14"
                                                        fill="#cccccc"
                                                        stroke="#000000"
                                                        strokeWidth="1.2"
                                                        strokeLinejoin="round"
                                                    />
                                                </svg>
                                            </div>

                                            <div
                                                className="color-swatch"
                                                style={{ backgroundColor: colorHex }}
                                                onClick={ () => setActiveLayerIndex(index) }
                                            />

                                            <div
                                                className="retro-arrow-btn arrow-right"
                                                onClick={ () => cycleColor(layer.modelCategory, layer.figurePart, 1, index) }
                                            >
                                                <svg width="12" height="15" viewBox="0 0 12 15">
                                                    <polygon
                                                        points="12,7.5 5,1 5,4.5 0,4.5 0,10.5 5,10.5 5,14"
                                                        fill="#cccccc"
                                                        stroke="#000000"
                                                        strokeWidth="1.2"
                                                        strokeLinejoin="round"
                                                    />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }) }
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="shockwave-details-footer">
                    <button type="button" className="footer-btn" onClick={ handleCancel }>
                        Cancelar
                    </button>
                    <button type="button" className="footer-btn" onClick={ handleDone }>
                        Hecho
                    </button>
                    <button type="button" className="footer-btn" onClick={ handleNext }>
                        Siguiente
                    </button>
                </div>
            </div>
        </DraggableWindow>
    );
};
