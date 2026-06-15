import { NitroConfiguration, RoomSessionEvent } from '@nitrots/nitro-renderer';
import { FC, useState } from 'react';
import { GetConfiguration } from '../../api';
import { LayoutAvatarImageView } from '../../common';
import { useRoomSessionManagerEvent, useSessionInfo } from '../../hooks';
import { WidgetSlotView } from './views/widgets/WidgetSlotView';

const widgetSlotCount = 7;

export const HotelView: FC<{}> = props =>
{
    const [ isVisible, setIsVisible ] = useState(true);
    const { userFigure = null } = useSessionInfo();

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
        const customBg = layout.background || backgroundColor;
        
        return (
            <div className="nitro-hotel-view" style={ (customBg) ? { background: customBg } : {} }>
                { backgrounds }
                <div className="custom-landing-view position-absolute" style={{ zIndex: 1, pointerEvents: 'none', left: '50%', top: '50%', width: '1024px', height: '768px', transform: 'translate(-50%, -50%)' }}>
                    {layout.objects.map((el: any, i: number) => {
                        const style: React.CSSProperties = {
                            position: 'absolute',
                            left: el.left,
                            top: el.top,
                            width: el.width * (el.scaleX || 1),
                            height: el.height * (el.scaleY || 1),
                            transform: `rotate(${el.angle || 0}deg)`,
                            transformOrigin: '0 0',
                            opacity: el.opacity,
                            pointerEvents: el.hyperlink ? 'auto' : 'none',
                            cursor: el.hyperlink ? 'pointer' : 'default',
                        };

                        const onClick = el.hyperlink ? () => window.open(el.hyperlink, '_blank') : undefined;

                        if (el.type === 'i-text' || el.type === 'text') {
                            return (
                                <div key={i} style={{ ...style, color: el.fill, fontFamily: el.fontFamily, fontSize: el.fontSize * (el.scaleX || 1), fontWeight: el.fontWeight, fontStyle: el.fontStyle, textAlign: el.textAlign, whiteSpace: 'pre-wrap' }} onClick={onClick}>
                                    {el.text}
                                </div>
                            );
                        } else if (el.type === 'rect') {
                            return <div key={i} style={{ ...style, backgroundColor: el.fill }} onClick={onClick} />;
                        } else if (el.type === 'circle') {
                            return <div key={i} style={{ ...style, backgroundColor: el.fill, borderRadius: '50%' }} onClick={onClick} />;
                        } else if (el.type === 'image') {
                            return <img key={i} src={el.src} style={{ ...style }} onClick={onClick} />;
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
                {/* Widgets predeterminados si se habilitan más adelante */}
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
