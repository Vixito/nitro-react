import { NitroConfiguration, RoomSessionEvent } from '@nitrots/nitro-renderer';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { GetConfiguration } from '../../api';
import { LayoutAvatarImageView } from '../../common';
import { useRoomSessionManagerEvent, useSessionInfo } from '../../hooks';
import { WidgetSlotView } from './views/widgets/WidgetSlotView';

const widgetSlotCount = 7;
const CANVAS_W = 1024;
const CANVAS_H = 768;

export const HotelView: FC<{}> = props =>
{
    const [ isVisible, setIsVisible ] = useState(true);
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
                setIsVisible(event.openLandingView);
                return;
        }
    });

    useEffect(() => {
        if (!isVisible) return;
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

    const habbtenConfig = (window.parent as any).HabbtenConfig || (window as any).HabbtenConfig;
    const backgroundColor = habbtenConfig?.hotel_view?.backgroundColor || GetConfiguration('hotelview')['images']['background.colour'];
    const background = NitroConfiguration.interpolate(GetConfiguration('hotelview')['images']['background']);
    const sun = NitroConfiguration.interpolate(GetConfiguration('hotelview')['images']['sun']);
    const drape = NitroConfiguration.interpolate(GetConfiguration('hotelview')['images']['drape']);
    const left = NitroConfiguration.interpolate(GetConfiguration('hotelview')['images']['left']);
    const rightRepeat = NitroConfiguration.interpolate(GetConfiguration('hotelview')['images']['right.repeat']);
    const right = NitroConfiguration.interpolate(GetConfiguration('hotelview')['images']['right']);

    const getWidgetConf = (slotId: number) => {
        if (habbtenConfig?.hotel_view?.slots?.[slotId]) {
            return habbtenConfig.hotel_view.slots[slotId].conf;
        }
        return GetConfiguration('hotelview')['widgets']['slot.' + slotId + '.conf'];
    };

    const getWidgetType = (slotId: number) => {
        if (habbtenConfig?.hotel_view?.slots?.[slotId]) {
            return habbtenConfig.hotel_view.slots[slotId].widget;
        }
        return GetConfiguration('hotelview')['widgets']['slot.' + slotId + '.widget'];
    };

    // Helper: Build CSS shadow string from Fabric.js shadow object
    const buildShadow = (shadow: any): string => {
        if (!shadow) return '';
        if (typeof shadow === 'string') return shadow;
        const { color = 'rgba(0,0,0,0.5)', blur = 0, offsetX = 0, offsetY = 0 } = shadow;
        return `${offsetX}px ${offsetY}px ${blur}px ${color}`;
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

    if (habbtenConfig?.hotel_view?.custom_layout && habbtenConfig.hotel_view.custom_layout.objects) {
        const layout = habbtenConfig.hotel_view.custom_layout;
        const customBg = (layout.background && layout.background !== 'rgba(0,0,0,0)' && layout.background !== '') 
            ? layout.background 
            : backgroundColor;

        // Filter out invisible and broken image objects
        const validObjects = layout.objects.filter((el: any) => {
            if (el.visible === false) return false;
            if (el.type === 'image' && (!el.src || el.width === 0 || el.height === 0)) return false;
            return true;
        });
        
        return (
            <div className="nitro-hotel-view" style={ (customBg) ? { background: customBg } : {} }>
                { backgrounds }
                {/* Overlay: Anchored bottom-center with exact 1024x768 dimensions to match CMS designer */}
                <div className="custom-landing-overlay" style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    zIndex: 10,
                }}>
                    {validObjects.map((el: any, i: number) => {
                        // Interactive Engine: Evaluate visibility condition
                        if (el.condition) {
                            try {
                                const keys = Object.keys(layoutState);
                                const values = Object.values(layoutState);
                                const fn = new Function(...keys, `return ${el.condition};`);
                                if (!fn(...values)) {
                                    // Hidden elements keep their state but have 0 opacity and pointer-events none to allow CSS fade transitions
                                    el._hiddenByCondition = true;
                                } else {
                                    el._hiddenByCondition = false;
                                }
                            } catch(e) { el._hiddenByCondition = false; }
                        } else {
                            el._hiddenByCondition = false;
                        }

                        const scaleX = el.scaleX || 1;
                        const scaleY = el.scaleY || 1;
                        const elWidth = el.width * scaleX;
                        const elHeight = el.height * scaleY;
                        
                        // Exact pixel positioning matching CMS designer
                        const topPx = el.top;
                        
                        const customCssProps = el.cssStyle ? el.cssStyle.split(';').reduce((acc: any, rule: string) => {
                            const match = rule.match(/^\s*([\w-]+)\s*:\s*(.+?)\s*$/);
                            if (match) {
                                const camelKey = match[1].replace(/-([a-z])/g, g => g[1].toUpperCase());
                                acc[camelKey] = match[2];
                            }
                            return acc;
                        }, {}) : {};

                        const style: React.CSSProperties = {
                            position: 'absolute',
                            left: el.left,
                            top: topPx,
                            width: elWidth,
                            height: elHeight,
                            transform: `rotate(${el.angle || 0}deg) skewX(${el.skewX || 0}deg) skewY(${el.skewY || 0}deg)`,
                            transformOrigin: '0 0',
                            opacity: el._hiddenByCondition ? 0 : (el.opacity ?? 1),
                            pointerEvents: el._hiddenByCondition ? 'none' : (el.hyperlink || el.clickAction || el.type === 'custom-widget' ? 'auto' : 'none'),
                            cursor: (el.hyperlink || el.clickAction) && !el._hiddenByCondition ? 'pointer' : 'default',
                            zIndex: i + 1,
                        };

                        const shadowStr = buildShadow(el.shadow);
                        
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
                        let boundWidth = elWidth;
                        let boundHeight = elHeight;

                        // Support advanced Data Binding via JS Expression
                        if (el.dataBinding) {
                            const dbStr = parseTemplate(el.dataBinding);
                            try {
                                const keys = Object.keys(layoutState);
                                const values = Object.values(layoutState);
                                const args = ['onlineUsers', 'userInfo', 'Math', 'window', ...keys];
                                const fnArgs = [onlineUsers, userInfo, Math, window, ...values];
                                
                                // Evaluate the string as a JS expression
                                const evaluated = new Function(...args, `return ${dbStr}`);
                                const res = evaluated(...fnArgs);
                                
                                if (res !== null && typeof res === 'object') {
                                    // If it returns an object, merge with styles
                                    Object.assign(style, res);
                                    if (res.text !== undefined) boundText = res.text;
                                } else if (res !== undefined) {
                                    // If primitive, use as text
                                    boundText = String(res);
                                }
                            } catch(e) { 
                                // Fallback to template replacement if it's just text
                                boundText = dbStr;
                            }
                        }

                        style.width = style.width !== undefined ? style.width : boundWidth;
                        style.height = style.height !== undefined ? style.height : boundHeight;


                        const customClasses = el.cssClasses ? ` ${parseTemplate(el.cssClasses)}` : '';
                        if (el.cssStyle) {
                            try {
                                const parsedStyle = parseTemplate(el.cssStyle);
                                const extraStyles = parsedStyle.split(';').filter((s: string) => s.trim().length > 0).reduce((acc: any, rule: string) => {
                                    const [key, val] = rule.split(':').map((s: string) => s.trim());
                                    if (key && val) {
                                        const camelKey = key.replace(/-([a-z])/g, (g: string) => g[1].toUpperCase());
                                        acc[camelKey] = val;
                                    }
                                    return acc;
                                }, {});
                                Object.assign(style, extraStyles);
                            } catch(e) {}
                        }

                        if (el.type === 'custom-widget') {
                            if (el.widgetType === 'promo_article') {
                                return (
                                    <div key={'w'+i} className={`custom-landing-widget${customClasses}`} style={style} onClick={onClick}>
                                        <div className="custom-widget-promo">
                                        </div>
                                    </div>
                                );
                            }
                            return (
                                <div key={i} className={`custom-widget-container${customClasses}`} style={{ ...style, pointerEvents: 'auto' }}>
                                    <WidgetSlotView widgetSlot={el.slotId || 1} widgetType={el.widgetType || ''} widgetConf={el.widgetConf || ''} />
                                </div>
                            );
                        }

                        if (el.type === 'i-text' || el.type === 'text') {
                            return (
                                <div key={'t'+i} className={`custom-landing-text${customClasses}`} style={{
                                    ...style,
                                    color: el.fill,
                                    fontFamily: el.fontFamily,
                                    fontSize: el.fontSize * scaleX,
                                    lineHeight: 1.16,
                                    textAlign: el.textAlign,
                                    whiteSpace: 'pre-wrap',
                                    textShadow: buildShadow(el.shadow) || undefined,
                                }} onClick={onClick}>
                                    {boundText}
                                </div>
                            );
                        }

                        if (el.type === 'rect') {
                            return <div key={'r'+i} className={`custom-landing-shape custom-rect${customClasses}`} style={{
                                ...style,
                                backgroundColor: el.fill,
                                borderRadius: el.rx ? `${el.rx}px` : undefined,
                                boxShadow: buildShadow(el.shadow) || undefined,
                            }} onClick={onClick} />;
                        }
                        
                        if (el.type === 'circle') {
                            return <div key={'c'+i} className={`custom-landing-shape custom-circle${customClasses}`} style={{
                                ...style,
                                backgroundColor: el.fill,
                                borderRadius: '50%',
                                boxShadow: buildShadow(el.shadow) || undefined,
                            }} onClick={onClick} />;
                        }

                        if (el.type === 'image' && el.src) {
                            return (
                                <img key={'i'+i} src={el.src} className={`custom-landing-img${customClasses}`} style={{
                                    ...style,
                                    objectFit: 'fill',
                                    // Shadows natively applied to images using CSS filter drop-shadow
                                    filter: el.shadow ? `drop-shadow(${el.shadow.offsetX}px ${el.shadow.offsetY}px ${el.shadow.blur}px ${el.shadow.color})` : 'none'
                                }} onClick={onClick} alt="hotel-widget" />
                            );
                        }
                        return null;
                    })}
                </div>
                { GetConfiguration('hotelview')['show.avatar'] && (
                    <div className="avatar-image" style={{ zIndex: 11 }}>
                        <LayoutAvatarImageView figure={ userFigure } direction={ 2 } />
                    </div>
                ) }
            </div>
        );
    }

    return (
        <div className="nitro-hotel-view" style={ (backgroundColor && backgroundColor) ? { background: backgroundColor } : {} }>
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
            { GetConfiguration('hotelview')['show.avatar'] && (
                <div className="avatar-image" style={{ zIndex: 11 }}>
                    <LayoutAvatarImageView figure={ userFigure } direction={ 2 } />
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
