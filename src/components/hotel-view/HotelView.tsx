import { NitroConfiguration, RoomSessionEvent } from '@nitrots/nitro-renderer';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { CreateLinkEvent, GetConfiguration } from '../../api';
import shockwaveEntryAuGif from '../../assets/images/eras/shockwave_v14/hh_entry_au.gif';
import receptionHorizon2012 from '../../assets/images/eras/flash2012/reception/backdrop_horizon.png';
import receptionLeft2012 from '../../assets/images/eras/flash2012/reception/backdrop_left.png';
import receptionRight2012 from '../../assets/images/eras/flash2012/reception/backdrop_right.png';
import receptionStretch2012 from '../../assets/images/eras/flash2012/reception/backdrop_stretch.png';
import receptionTopStretch2012 from '../../assets/images/eras/flash2012/reception/hotel_top_stretch.png';
import mobileHotelExterior from '../../assets/images/mobile/hotel_exterior.png';
import mobNavigatorImg from '../../assets/images/mobile/mob_navigator.png';
import mobShopImg from '../../assets/images/mobile/mob_shop.png';
import iconGame from '../../assets/images/toolbar/icons/game.png';
import { LayoutAvatarImageView } from '../../common';
import { useEraTheme, useRoomSessionManagerEvent, useSessionInfo } from '../../hooks';
import { useIsMobile } from '../../hooks/mobile/useIsMobile';
import { WidgetSlotView } from './views/widgets/WidgetSlotView';

const widgetSlotCount = 7;
const CANVAS_W = 1024;
const CANVAS_H = 768;

export const HotelView: FC<{}> = props =>
{
    const [ isVisible, setIsVisible ] = useState(true);
    const isMobile = useIsMobile();
    const { currentEra } = useEraTheme();
    const { userFigure = null, userInfo = null } = useSessionInfo();
    const [ onlineUsers, setOnlineUsers ] = useState(0);
    const [ layoutState, setLayoutState ] = useState<Record<string, any>>({});

    useRoomSessionManagerEvent<RoomSessionEvent>([
        RoomSessionEvent.CREATED,
        RoomSessionEvent.ENDED ], event =>
    {
        switch(event.type)
        {
            case RoomSessionEvent.CREATED:
                setIsVisible(false);
                return;
            case RoomSessionEvent.ENDED:
                if(document.body.style.cursor === 'pointer') document.body.style.cursor = 'default';
                setIsVisible(event.openLandingView);
                return;
        }
    });

    useEffect(() => {
        if (!isVisible) return;
        if(document.body.style.cursor === 'pointer') document.body.style.cursor = 'default';
        const fetchStats = async () => {
            try {
                const response = await fetch('/api/stats');
                const data = await response.json();
                setOnlineUsers(data.online_users || 0);
            } catch (err) {
                console.error('Failed to fetch online stats', err);
            }
        };
        fetchStats();
        const interval = setInterval(fetchStats, 10000);
        return () => clearInterval(interval);
    }, [isVisible]);

    if(!isVisible) return null;

    let habbtenConfig: any = null;
    try
    {
        habbtenConfig = (window.parent as any)?.HabbtenConfig || (window as any)?.HabbtenConfig || null;
    }
    catch(e)
    {
        habbtenConfig = (window as any)?.HabbtenConfig || null;
    }

    const activeEraKey = isMobile ? 'mobile' : (currentEra || 'modern');
    const layout = (activeEraKey === 'shockwave2006')
        ? habbtenConfig?.hotel_view?.custom_layouts?.['shockwave2006']
        : (activeEraKey === 'flash2012')
            ? habbtenConfig?.hotel_view?.custom_layouts?.['flash2012']
            : (activeEraKey === 'mobile')
                ? habbtenConfig?.hotel_view?.custom_layouts?.['mobile']
                : (habbtenConfig?.hotel_view?.custom_layouts?.['modern'] || habbtenConfig?.hotel_view?.custom_layout);
    const sceneConf = (layout && layout.scene) ? layout.scene : {};
    const stageWidth = Number(layout?.stageWidth) || CANVAS_W;
    const stageHeight = Number(layout?.stageHeight) || CANVAS_H;

    // Helper: Build CSS shadow string from shadow object
    const buildShadow = (shadow: any): string => {
        if (!shadow) return '';
        if (typeof shadow === 'string') return shadow;
        const { color = 'rgba(0,0,0,0.5)', blur = 0, offsetX = 0, offsetY = 0 } = shadow;
        if (!blur && !offsetX && !offsetY) return '';
        return `${offsetX}px ${offsetY}px ${blur}px ${color}`;
    };

    // Filter out invisible and broken image objects
    const validObjects = (layout && layout.objects) ? layout.objects.filter((el: any) => {
        if (el.visible === false) return false;
        if (el.type === 'image' && (!el.src || el.width === 0 || el.height === 0)) return false;
        return true;
    }) : [];

    const customOverlay = validObjects.length > 0 ? (
        <div className="custom-landing-overlay" style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 10,
            overflow: 'hidden',
        }}>
            {validObjects.map((el: any, i: number) => {
                // Interactive Engine: Evaluate visibility condition
                if (el.condition) {
                    try {
                        const keys = Object.keys(layoutState);
                        const values = Object.values(layoutState);
                        const fn = new Function(...keys, `return ${el.condition};`);
                        el._hiddenByCondition = !fn(...values);
                    } catch(e) { el._hiddenByCondition = false; }
                } else {
                    el._hiddenByCondition = false;
                }

                const elWidth = (Number(el.width) || 100) * (Number(el.scaleX) || 1);
                const elHeight = (Number(el.height) || 40) * (Number(el.scaleY) || 1);
                const rawLeft = Number(el.left) || 0;
                const rawTop = Number(el.top) || 0;
                const anchor = el.anchor || (layout?.version >= 2 ? 'percent' : 'top-left');

                const baseTransform = `skew(${el.skewX || 0}deg, ${el.skewY || 0}deg) rotate(${el.angle || 0}deg)`;
                const posStyle: React.CSSProperties = {
                    position: 'absolute',
                    width: elWidth,
                    height: (el.type === 'i-text' || el.type === 'text') ? 'auto' : elHeight,
                    minHeight: (el.type === 'i-text' || el.type === 'text') ? elHeight : undefined,
                    transform: baseTransform,
                    transformOrigin: 'top left',
                };

                if (anchor === 'percent') {
                    const leftPct = (el.leftPct !== undefined && el.leftPct !== null) ? Number(el.leftPct) : (rawLeft / stageWidth) * 100;
                    const topPct = (el.topPct !== undefined && el.topPct !== null) ? Number(el.topPct) : (rawTop / stageHeight) * 100;
                    posStyle.left = `${leftPct}%`;
                    posStyle.top = `${topPct}%`;
                } else if (anchor === 'top-right') {
                    posStyle.right = Math.round(stageWidth - (rawLeft + elWidth));
                    posStyle.top = Math.round(rawTop);
                } else if (anchor === 'bottom-left') {
                    posStyle.left = Math.round(rawLeft);
                    posStyle.bottom = Math.round(stageHeight - (rawTop + elHeight));
                } else if (anchor === 'bottom-right') {
                    posStyle.right = Math.round(stageWidth - (rawLeft + elWidth));
                    posStyle.bottom = Math.round(stageHeight - (rawTop + elHeight));
                } else if (anchor === 'top-center') {
                    const offsetX = Math.round((rawLeft + elWidth / 2) - (stageWidth / 2));
                    posStyle.left = `calc(50% + ${offsetX}px)`;
                    posStyle.top = Math.round(rawTop);
                    posStyle.transform = `translateX(-50%) ${baseTransform}`;
                    posStyle.transformOrigin = 'top center';
                } else if (anchor === 'bottom-center') {
                    const offsetX = Math.round((rawLeft + elWidth / 2) - (stageWidth / 2));
                    posStyle.left = `calc(50% + ${offsetX}px)`;
                    posStyle.bottom = Math.round(stageHeight - (rawTop + elHeight));
                    posStyle.transform = `translateX(-50%) ${baseTransform}`;
                    posStyle.transformOrigin = 'bottom center';
                } else if (anchor === 'center') {
                    const offsetX = Math.round((rawLeft + elWidth / 2) - (stageWidth / 2));
                    const offsetY = Math.round((rawTop + elHeight / 2) - (stageHeight / 2));
                    posStyle.left = `calc(50% + ${offsetX}px)`;
                    posStyle.top = `calc(50% + ${offsetY}px)`;
                    posStyle.transform = `translate(-50%, -50%) ${baseTransform}`;
                    posStyle.transformOrigin = 'center center';
                } else {
                    posStyle.left = Math.round(rawLeft);
                    posStyle.top = Math.round(rawTop);
                }

                const customCssProps = el.cssStyle ? el.cssStyle.split(';').reduce((acc: any, rule: string) => {
                    const match = rule.match(/^\s*([\w-]+)\s*:\s*(.+?)\s*$/);
                    if (match) {
                        const camelKey = match[1].replace(/-([a-z])/g, g => g[1].toUpperCase());
                        acc[camelKey] = match[2];
                    }
                    return acc;
                }, {}) : {};

                const style: React.CSSProperties = {
                    ...posStyle,
                    zIndex: el.zIndex || (i + 1),
                    opacity: el._hiddenByCondition ? 0 : (el.opacity ?? 1),
                    pointerEvents: el._hiddenByCondition ? 'none' : (el.hyperlink || el.clickAction || el.type === 'custom-widget' ? 'auto' : 'none'),
                    cursor: (el.hyperlink || el.clickAction) && !el._hiddenByCondition ? 'pointer' : 'default',
                    ...customCssProps
                };

                // Interactive Engine: Click Actions
                const onClick = () => {
                    if (el._hiddenByCondition) return;
                    if (el.hyperlink) window.open(el.hyperlink, '_blank');
                    if (el.clickAction) {
                        try {
                            const parts = el.clickAction.split('=').map((s: string) => s.trim());
                            if (parts.length === 2) {
                                let val = isNaN(Number(parts[1])) ? parts[1].replace(/['"]/g, '') : Number(parts[1]);
                                setLayoutState(prev => ({ ...prev, [parts[0]]: val }));
                            }
                        } catch(e) {}
                    }
                };

                // Parse Data Binding Variables
                const parseTemplate = (str: string) => {
                    if (!str) return '';
                    let parsed = str.replace(/\{\{\s*online_users\s*\}\}/g, onlineUsers.toString());
                    parsed = parsed.replace(/\{\{\s*user\.username\s*\}\}/g, userInfo?.username || '');
                    return parsed;
                };

                let boundText = parseTemplate(el.text);

                if (el.dataBinding) {
                    const dbStr = parseTemplate(el.dataBinding);
                    try {
                        const keys = Object.keys(layoutState);
                        const values = Object.values(layoutState);
                        const args = ['onlineUsers', 'userInfo', 'Math', 'window', ...keys];
                        const fnArgs = [onlineUsers, userInfo, Math, window, ...values];

                        const evaluated = new Function(...args, `return ${dbStr}`);
                        const res = evaluated(...fnArgs);

                        if (res !== null && typeof res === 'object') {
                            Object.assign(style, res);
                            if (res.text !== undefined) boundText = res.text;
                        } else if (res !== undefined) {
                            boundText = String(res);
                        }
                    } catch(e) {
                        boundText = dbStr;
                    }
                }

                const customClasses = el.cssClasses ? ` ${parseTemplate(el.cssClasses)}` : '';
                if (el.cssStyle) {
                    try {
                        const parsedStyle = parseTemplate(el.cssStyle);
                        const extraStyles = parsedStyle.split(';').filter((s: string) => s.trim().length > 0).reduce((acc: any, rule: string) => {
                            const idx = rule.indexOf(':');
                            if (idx > 0) {
                                const key = rule.slice(0, idx).trim();
                                const val = rule.slice(idx + 1).trim();
                                if (key && val) {
                                    const camelKey = key.replace(/-([a-z])/g, (g: string) => g[1].toUpperCase());
                                    acc[camelKey] = val;
                                }
                            }
                            return acc;
                        }, {});
                        Object.assign(style, extraStyles);
                    } catch(e) {}
                }

                if (el.type === 'custom-widget') {
                    return (
                        <div key={el.id || ('w' + i)} className={`custom-widget-container${customClasses}`} style={{ ...style, pointerEvents: 'auto' }}>
                            <WidgetSlotView widgetSlot={el.slotId || 1} widgetType={el.widgetType || 'promoarticle'} widgetConf={el.widgetConf || {}} />
                        </div>
                    );
                }

                if (el.type === 'i-text' || el.type === 'text') {
                    return (
                        <div key={el.id || ('t' + i)} className={`custom-landing-text${customClasses}`} style={{
                            ...style,
                            color: el.fill || '#ffffff',
                            fontFamily: el.fontFamily || 'Ubuntu, sans-serif',
                            fontSize: el.fontSize || 24,
                            fontWeight: el.fontWeight || 'normal',
                            lineHeight: 1.2,
                            textAlign: el.textAlign || 'left',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            textShadow: buildShadow(el.shadow) || undefined,
                        }} onClick={onClick}>
                            {boundText}
                        </div>
                    );
                }

                if (el.type === 'rect') {
                    return <div key={el.id || ('r' + i)} className={`custom-landing-shape custom-rect${customClasses}`} style={{
                        ...style,
                        backgroundColor: el.fill,
                        borderRadius: el.rx ? `${el.rx}px` : undefined,
                        boxShadow: buildShadow(el.shadow) || undefined,
                    }} onClick={onClick} />;
                }

                if (el.type === 'circle') {
                    return <div key={el.id || ('c' + i)} className={`custom-landing-shape custom-circle${customClasses}`} style={{
                        ...style,
                        backgroundColor: el.fill,
                        borderRadius: '50%',
                        boxShadow: buildShadow(el.shadow) || undefined,
                    }} onClick={onClick} />;
                }

                if (el.type === 'image' && el.src) {
                    return (
                        <img key={el.id || ('i' + i)} src={el.src} className={`custom-landing-img${customClasses}`} style={{
                            ...style,
                            objectFit: el.objectFit || 'contain',
                            imageRendering: el.pixelated ? 'pixelated' : undefined,
                            filter: (el.shadow && (el.shadow.blur || el.shadow.offsetX || el.shadow.offsetY))
                                ? `drop-shadow(${el.shadow.offsetX || 0}px ${el.shadow.offsetY || 0}px ${el.shadow.blur || 0}px ${el.shadow.color || '#000000'})`
                                : 'none'
                        }} onClick={onClick} alt={el.name || 'hotel-widget'} />
                    );
                }
                return null;
            })}
        </div>
    ) : null;

    if(isMobile)
    {
        const displayName = userInfo?.username || 'Habbten';
        const mobileBg = sceneConf.background || undefined;
        const mobileArt = sceneConf.leftImage === 'none' ? '' : (sceneConf.leftImage || mobileHotelExterior);
        return (
            <div className="nitro-hotel-view hmob-hotel-view" style={ mobileBg ? { background: mobileBg } : undefined }>
                <div className="hmob-hv-stage">
                    { mobileArt && (
                        <div className="hmob-hv-art-wrap">
                            <img
                                src={ mobileArt }
                                alt="Habbten Hotel"
                                className="hmob-hv-art"
                            />
                        </div>
                    ) }
                    <div className="hmob-hv-actions">
                        <h1 className="hmob-hv-title">
                            ¿Qué hay, { displayName }?
                        </h1>
                        <button
                            type="button"
                            className="hmob-hv-btn"
                            onClick={ () => CreateLinkEvent('navigator/toggle') }
                        >
                            <span className="hmob-hv-btn-ico">
                                <img src={ mobNavigatorImg } alt="" />
                            </span>
                            <span>Buscar una sala</span>
                        </button>
                        <button
                            type="button"
                            className="hmob-hv-btn"
                            onClick={ () => CreateLinkEvent('games/toggle') }
                        >
                            <span className="hmob-hv-btn-ico">
                                <img src={ iconGame } alt="" />
                            </span>
                            <span>Game Center</span>
                        </button>
                        <button
                            type="button"
                            className="hmob-hv-btn"
                            onClick={ () => CreateLinkEvent('catalog/toggle') }
                        >
                            <span className="hmob-hv-btn-ico">
                                <img src={ mobShopImg } alt="" />
                            </span>
                            <span>Ir de compras</span>
                        </button>
                    </div>
                </div>
                { customOverlay }
            </div>
        );
    }

    const hotelViewConf = GetConfiguration<Record<string, any>>('hotelview') || {};
    const hotelViewImages = hotelViewConf['images'] || {};
    const hotelViewWidgets = hotelViewConf['widgets'] || {};

    const backgroundColor = sceneConf.background || habbtenConfig?.hotel_view?.backgroundColor || hotelViewImages['background.colour'] || '#6eadc8';
    const background = sceneConf.background ? '' : (hotelViewImages['background'] ? NitroConfiguration.interpolate(hotelViewImages['background']) : '');
    const sun = hotelViewImages['sun'] ? NitroConfiguration.interpolate(hotelViewImages['sun']) : '';
    const drape = hotelViewImages['drape'] ? NitroConfiguration.interpolate(hotelViewImages['drape']) : '';
    const defaultLeft = hotelViewImages['left'] ? NitroConfiguration.interpolate(hotelViewImages['left']) : '';
    const left = sceneConf.leftImage === 'none'
        ? ''
        : (sceneConf.leftImage || habbtenConfig?.hotel_view?.custom_layout?.background_image || defaultLeft);
    const rightRepeat = hotelViewImages['right.repeat'] ? NitroConfiguration.interpolate(hotelViewImages['right.repeat']) : '';
    const defaultRight = hotelViewImages['right'] ? NitroConfiguration.interpolate(hotelViewImages['right']) : '';
    const right = sceneConf.rightImage === 'none' ? '' : (sceneConf.rightImage || defaultRight);

    const getWidgetConf = (slotId: number) => {
        if (habbtenConfig?.hotel_view?.slots?.[slotId]) {
            return habbtenConfig.hotel_view.slots[slotId].conf;
        }
        return hotelViewWidgets['slot.' + slotId + '.conf'] || {};
    };

    const getWidgetType = (slotId: number) => {
        if (habbtenConfig?.hotel_view?.slots?.[slotId]) {
            return habbtenConfig.hotel_view.slots[slotId].widget;
        }
        return hotelViewWidgets['slot.' + slotId + '.widget'] || '';
    };

    const backgrounds = (
        <>
            <div className="background position-absolute" style={ (background && background.length) ? { backgroundImage: `url(${ background })` } : {} } />
            <div className="sun position-absolute" style={ (sun && sun.length) ? { backgroundImage: `url(${ sun })` } : {} } />
            <div className="drape position-absolute" style={ (drape && drape.length) ? { backgroundImage: `url(${ drape })` } : {} } />
            <div className="left position-absolute" style={ (left && left.length) ? { backgroundImage: `url(${ left })` } : {} } />
            <div className="right-repeat position-absolute" style={ (rightRepeat && rightRepeat.length) ? { backgroundImage: `url(${ rightRepeat })` } : {} } />
            <div className="right position-absolute" style={ (right && right.length) ? { backgroundImage: `url(${ right })` } : {} } />
        </>
    );

    const customBg = (sceneConf.background && sceneConf.background !== '')
        ? sceneConf.background
        : ((layout?.background && layout.background !== 'rgba(0,0,0,0)' && layout.background !== '')
            ? layout.background
            : backgroundColor);

    if(currentEra === 'flash2012')
    {
        const f12ShowAvatar = sceneConf.showAvatar !== undefined ? !!sceneConf.showAvatar : (hotelViewConf['show.avatar'] ?? true);
        const f12AvatarLeft = Number.isFinite(Number(sceneConf.avatarLeft)) ? Number(sceneConf.avatarLeft) : 28;
        const f12AvatarBottom = Number.isFinite(Number(sceneConf.avatarBottom)) ? Number(sceneConf.avatarBottom) : 60;
        const f12AvatarDir = Number.isFinite(Number(sceneConf.avatarDirection)) ? Number(sceneConf.avatarDirection) : 2;
        const f12HasCustomBg = !!(sceneConf.background && sceneConf.background !== '');
        const f12LeftImg = sceneConf.leftImage === 'none' ? '' : (sceneConf.leftImage || receptionLeft2012);
        const f12RightImg = sceneConf.rightImage === 'none' ? '' : (sceneConf.rightImage || receptionRight2012);

        return (
            <div
                className="nitro-hotel-view flash2012-hotel-view"
                style={ f12HasCustomBg ? {
                    background: sceneConf.background,
                    overflow: 'hidden'
                } : {
                    backgroundColor: '#89d4f1',
                    backgroundImage: `url(${ receptionStretch2012 })`,
                    backgroundRepeat: 'repeat-x',
                    backgroundSize: '100% calc(100% - 36px)',
                    backgroundPosition: 'top left',
                    overflow: 'hidden'
                } }
            >
                { !f12HasCustomBg && (
                    <div
                        className="reception-2012-horizon position-absolute"
                        style={{
                            left: 112,
                            bottom: 36,
                            width: 693,
                            height: 341,
                            backgroundImage: `url(${ receptionHorizon2012 })`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'bottom left',
                            imageRendering: 'pixelated',
                            pointerEvents: 'none',
                            zIndex: 2
                        }}
                    />
                ) }

                { f12RightImg && (
                    <div
                        className="reception-2012-right position-absolute"
                        style={{
                            right: 0,
                            bottom: sceneConf.rightImage ? 0 : -12,
                            width: sceneConf.rightImage ? '100%' : 526,
                            height: sceneConf.rightImage ? '100%' : 455,
                            backgroundImage: `url(${ f12RightImg })`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'bottom right',
                            imageRendering: 'pixelated',
                            pointerEvents: 'none',
                            zIndex: 3
                        }}
                    />
                ) }

                { !sceneConf.leftImage && (
                    <div
                        className="reception-2012-tower-top position-absolute"
                        style={{
                            left: 0,
                            top: 0,
                            bottom: 1100,
                            width: 134,
                            backgroundImage: `url(${ receptionTopStretch2012 })`,
                            backgroundRepeat: 'repeat-y',
                            backgroundSize: '134px 1px',
                            imageRendering: 'pixelated',
                            pointerEvents: 'none',
                            zIndex: 4
                        }}
                    />
                ) }

                { f12LeftImg && (
                    <div
                        className="reception-2012-left position-absolute"
                        style={{
                            left: 0,
                            bottom: sceneConf.leftImage ? 0 : 36,
                            width: sceneConf.leftImage ? '100%' : 874,
                            height: sceneConf.leftImage ? '100%' : 1064,
                            backgroundImage: `url(${ f12LeftImg })`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'bottom left',
                            imageRendering: 'pixelated',
                            pointerEvents: 'none',
                            zIndex: 4
                        }}
                    />
                ) }

                { f12ShowAvatar && (
                    <div
                        className="reception-2012-avatar position-absolute"
                        style={{
                            left: f12AvatarLeft,
                            bottom: f12AvatarBottom,
                            zIndex: 6,
                            pointerEvents: 'none',
                            imageRendering: 'pixelated'
                        }}
                    >
                        <LayoutAvatarImageView figure={ userFigure } direction={ f12AvatarDir } />
                    </div>
                ) }

                {/* Widgets de noticias / promociones del Hotel View */}
                <div className="container h-100 py-3 overflow-hidden landing-widgets position-relative" style={{ zIndex: 7, paddingLeft: 180 }}>
                    <div className="row h-100">
                        <div className="col-9 h-100 d-flex flex-column">
                            <WidgetSlotView
                                widgetSlot={ 1 }
                                widgetType={ getWidgetType(1) }
                                widgetConf={ getWidgetConf(1) }
                                className="col-6"
                            />
                            <div className="col-12 row mx-0">
                                <WidgetSlotView
                                    widgetSlot={ 2 }
                                    widgetType={ getWidgetType(2) }
                                    widgetConf={ getWidgetConf(2) }
                                    className="col-7"
                                />
                                <WidgetSlotView
                                    widgetSlot={ 3 }
                                    widgetType={ getWidgetType(3) }
                                    widgetConf={ getWidgetConf(3) }
                                    className="col-5"
                                />
                                <WidgetSlotView
                                    widgetSlot={ 4 }
                                    widgetType={ getWidgetType(4) }
                                    widgetConf={ getWidgetConf(4) }
                                    className="col-7"
                                />
                                <WidgetSlotView
                                    widgetSlot={ 5 }
                                    widgetType={ getWidgetType(5) }
                                    widgetConf={ getWidgetConf(5) }
                                    className="col-5"
                                />
                            </div>
                            <WidgetSlotView
                                widgetSlot={ 6 }
                                widgetType={ getWidgetType(6) }
                                widgetConf={ getWidgetConf(6) }
                                className="mt-auto"
                            />
                        </div>
                        <div className="col-3 h-100">
                            <WidgetSlotView
                                widgetSlot={ 7 }
                                widgetType={ getWidgetType(7) }
                                widgetConf={ getWidgetConf(7) }
                            />
                        </div>
                    </div>
                </div>

                { customOverlay }
            </div>
        );
    }

    if(currentEra === 'shockwave2006')
    {
        const swBg = (sceneConf.background && sceneConf.background !== '') ? sceneConf.background : '#000000';
        const swCenterImg = sceneConf.leftImage === 'none' ? '' : (sceneConf.leftImage || shockwaveEntryAuGif);
        const swRightImg = sceneConf.rightImage === 'none' ? '' : (sceneConf.rightImage || '');
        const swShowAvatar = sceneConf.showAvatar === true;
        const swAvatarLeft = Number.isFinite(Number(sceneConf.avatarLeft)) ? Number(sceneConf.avatarLeft) : 100;
        const swAvatarBottom = Number.isFinite(Number(sceneConf.avatarBottom)) ? Number(sceneConf.avatarBottom) : 40;
        const swAvatarDir = Number.isFinite(Number(sceneConf.avatarDirection)) ? Number(sceneConf.avatarDirection) : 2;

        return (
            <div className="nitro-hotel-view shockwave-hotel-view" style={{ background: swBg, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                { swCenterImg && (
                    <div
                        className="shockwave-hotel-entry"
                        style={{
                            width: 718,
                            height: 480,
                            maxWidth: '100%',
                            maxHeight: '100%',
                            backgroundImage: `url(${ swCenterImg })`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            backgroundSize: 'contain',
                            imageRendering: 'pixelated',
                            position: 'relative',
                            pointerEvents: 'none'
                        }}
                    />
                ) }
                { swRightImg && (
                    <div
                        className="right position-absolute"
                        style={{
                            backgroundImage: `url(${ swRightImg })`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right bottom',
                            imageRendering: 'pixelated',
                            pointerEvents: 'none'
                        }}
                    />
                ) }
                { swShowAvatar && (
                    <div className="avatar-image" style={{ zIndex: 11, left: swAvatarLeft, bottom: swAvatarBottom }}>
                        <LayoutAvatarImageView figure={ userFigure } direction={ swAvatarDir } />
                    </div>
                ) }
                { customOverlay }
            </div>
        );
    }

    const modernShowAvatar = sceneConf.showAvatar !== undefined ? !!sceneConf.showAvatar : (hotelViewConf['show.avatar'] ?? true);
    const modernAvatarLeft = Number.isFinite(Number(sceneConf.avatarLeft)) ? Number(sceneConf.avatarLeft) : 103;
    const modernAvatarBottom = Number.isFinite(Number(sceneConf.avatarBottom)) ? Number(sceneConf.avatarBottom) : 24;
    const modernAvatarDir = Number.isFinite(Number(sceneConf.avatarDirection)) ? Number(sceneConf.avatarDirection) : 2;

    return (
        <div className="nitro-hotel-view" style={ (customBg) ? { background: customBg } : (backgroundColor ? { background: backgroundColor } : {}) }>
            <div className="container h-100 py-3 overflow-hidden landing-widgets" style={{ zIndex: 1 }}>
                <div className="row h-100">
                    <div className="col-9 h-100 d-flex flex-column">
                        <WidgetSlotView
                            widgetSlot={ 1 }
                            widgetType={ getWidgetType(1) }
                            widgetConf={ getWidgetConf(1) }
                            className="col-6"
                        />
                        <div className="col-12 row mx-0">
                            <WidgetSlotView
                                widgetSlot={ 2 }
                                widgetType={ getWidgetType(2) }
                                widgetConf={ getWidgetConf(2) }
                                className="col-7"
                            />
                            <WidgetSlotView
                                widgetSlot={ 3 }
                                widgetType={ getWidgetType(3) }
                                widgetConf={ getWidgetConf(3) }
                                className="col-5"
                            />
                            <WidgetSlotView
                                widgetSlot={ 4 }
                                widgetType={ getWidgetType(4) }
                                widgetConf={ getWidgetConf(4) }
                                className="col-7"
                            />
                            <WidgetSlotView
                                widgetSlot={ 5 }
                                widgetType={ getWidgetType(5) }
                                widgetConf={ getWidgetConf(5) }
                                className="col-5"
                            />
                        </div>
                        <WidgetSlotView
                            widgetSlot={ 6 }
                            widgetType={ getWidgetType(6) }
                            widgetConf={ getWidgetConf(6) }
                            className="mt-auto"
                        />
                    </div>
                    <div className="col-3 h-100">
                        <WidgetSlotView
                            widgetSlot={ 7 }
                            widgetType={ getWidgetType(7) }
                            widgetConf={ getWidgetConf(7) }
                        />
                    </div>
                </div>
            </div>
            { backgrounds }
            { customOverlay }
            { modernShowAvatar && (
                <div className="avatar-image" style={{ zIndex: 11, left: modernAvatarLeft, bottom: modernAvatarBottom }}>
                    <LayoutAvatarImageView figure={ userFigure } direction={ modernAvatarDir } />
                </div>
            ) }
            { habbtenConfig?.hotel_view?.banner && (
                <div className="custom-banner position-absolute" style={{ top: 20, left: 20, zIndex: 12 }}>
                    <img src={habbtenConfig.hotel_view.banner} alt="Hotel Banner" style={{ maxWidth: 350, borderRadius: 8, boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }} />
                </div>
            ) }
        </div>
    );
};
