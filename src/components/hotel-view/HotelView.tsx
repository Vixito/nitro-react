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
    const { userFigure = null } = useSessionInfo();
    const [ onlineUsers, setOnlineUsers ] = useState(0);
    const hotelViewRef = useRef<HTMLDivElement>(null);
    const [ overlayScale, setOverlayScale ] = useState({ x: 1, y: 1 });

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

    // ResizeObserver: scale the 1024x768 overlay to fill the actual viewport
    useEffect(() => {
        if (!isVisible) return;
        const updateScale = () => {
            const el = hotelViewRef.current;
            if (!el) return;
            const w = el.clientWidth;
            const h = el.clientHeight;
            setOverlayScale({ x: w / CANVAS_W, y: h / CANVAS_H });
        };
        updateScale();
        const ro = new ResizeObserver(updateScale);
        if (hotelViewRef.current) ro.observe(hotelViewRef.current);
        window.addEventListener('resize', updateScale);
        return () => { ro.disconnect(); window.removeEventListener('resize', updateScale); };
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
            <div ref={hotelViewRef} className="nitro-hotel-view" style={ (customBg) ? { background: customBg } : {} }>
                { backgrounds }
                {/* Overlay: a 1024x768 box scaled to fill the viewport, anchored bottom-left to match the buildings */}
                <div className="custom-landing-overlay" style={{
                    position: 'absolute',
                    left: 0,
                    bottom: 0,
                    width: CANVAS_W,
                    height: CANVAS_H,
                    transformOrigin: 'left bottom',
                    transform: `scale(${overlayScale.x}, ${overlayScale.y})`,
                    pointerEvents: 'none',
                    zIndex: 1,
                }}>
                    {validObjects.map((el: any, i: number) => {
                        const scaleX = el.scaleX || 1;
                        const scaleY = el.scaleY || 1;
                        const elWidth = el.width * scaleX;
                        const elHeight = el.height * scaleY;

                        const style: React.CSSProperties = {
                            position: 'absolute',
                            left: el.left,
                            top: el.top,
                            width: elWidth,
                            height: elHeight,
                            transform: `rotate(${el.angle || 0}deg) skewX(${el.skewX || 0}deg) skewY(${el.skewY || 0}deg)`,
                            transformOrigin: '0 0',
                            opacity: el.opacity ?? 1,
                            pointerEvents: el.hyperlink || el.type === 'custom-widget' ? 'auto' : 'none',
                            cursor: el.hyperlink ? 'pointer' : 'default',
                            zIndex: i + 1,
                        };

                        const shadowStr = buildShadow(el.shadow);
                        const onClick = el.hyperlink ? () => window.open(el.hyperlink, '_blank') : undefined;

                        // Data Binding
                        let boundText = el.text;
                        let boundWidth = elWidth;
                        let boundHeight = elHeight;

                        const MAX_USERS_TERM = 50;
                        if (el.dataBinding === 'online_users_text') {
                            if (boundText && boundText.includes('{online}')) {
                                boundText = boundText.replace(/\{online\}/g, onlineUsers.toString());
                            } else {
                                boundText = `${onlineUsers} usuarios en línea`;
                            }
                        } else if (el.dataBinding === 'online_users_width') {
                            const percent = Math.min(100, (onlineUsers / MAX_USERS_TERM) * 100);
                            boundWidth = elWidth * (percent / 100);
                        } else if (el.dataBinding === 'online_users_height') {
                            const percent = Math.min(100, (onlineUsers / MAX_USERS_TERM) * 100);
                            const newHeight = elHeight * (percent / 100);
                            style.top = el.top + (elHeight - newHeight);
                            boundHeight = newHeight;
                        }

                        style.width = boundWidth;
                        style.height = boundHeight;

                        if (el.type === 'i-text' || el.type === 'text') {
                            return (
                                <div key={i} style={{
                                    ...style,
                                    color: el.fill,
                                    fontFamily: el.fontFamily,
                                    fontSize: el.fontSize * scaleX,
                                    fontWeight: el.fontWeight,
                                    fontStyle: el.fontStyle,
                                    textAlign: el.textAlign,
                                    whiteSpace: 'pre-wrap',
                                    lineHeight: 1.16,
                                    textShadow: shadowStr || undefined,
                                }} onClick={onClick}>
                                    {boundText}
                                </div>
                            );
                        } else if (el.type === 'rect') {
                            return <div key={i} style={{
                                ...style,
                                backgroundColor: el.fill,
                                borderRadius: el.rx ? `${el.rx}px` : undefined,
                                boxShadow: shadowStr || undefined,
                            }} onClick={onClick} />;
                        } else if (el.type === 'circle') {
                            return <div key={i} style={{
                                ...style,
                                backgroundColor: el.fill,
                                borderRadius: '50%',
                                boxShadow: shadowStr || undefined,
                            }} onClick={onClick} />;
                        } else if (el.type === 'image') {
                            return <img key={i} src={el.src} alt="" style={{
                                ...style,
                                objectFit: 'fill',
                                filter: shadowStr ? `drop-shadow(${shadowStr})` : undefined,
                            }} onClick={onClick} />;
                        } else if (el.type === 'custom-widget') {
                            return (
                                <div key={i} style={{ ...style, pointerEvents: 'auto' }}>
                                    <WidgetSlotView widgetSlot={el.slotId || 1} widgetType={el.widgetType || ''} widgetConf={el.widgetConf || ''} />
                                </div>
                            );
                        }
                        return null;
                    })}
                </div>
                { GetConfiguration('hotelview')['show.avatar'] && (
                    <div className="avatar-image" style={{ zIndex: 2 }}>
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
                <div className="avatar-image" style={{ zIndex: 2 }}>
                    <LayoutAvatarImageView figure={ userFigure } direction={ 2 } />
                </div>
            ) }
            { habbtenConfig?.hotel_view?.banner && (
                <div className="custom-banner position-absolute" style={{ top: 20, left: 20, zIndex: 10 }}>
                    <img src={habbtenConfig.hotel_view.banner} alt="Hotel Banner" style={{ maxWidth: 350, borderRadius: 8, boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }} />
                </div>
            ) }
        </div>
    );
}
