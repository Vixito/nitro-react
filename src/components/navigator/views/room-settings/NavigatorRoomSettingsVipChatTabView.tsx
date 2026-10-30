import { RoomChatSettings } from '@nitrots/nitro-renderer';
import { FC, useEffect, useState } from 'react';
import { IRoomData, LocalizeText } from '../../../../api';
import { Column, Flex, Grid, ShockwaveDropdown, Text } from '../../../../common';

interface NavigatorRoomSettingsTabViewProps
{
    roomData: IRoomData;
    handleChange: (field: string, value: string | number | boolean) => void;
}

export const NavigatorRoomSettingsVipChatTabView: FC<NavigatorRoomSettingsTabViewProps> = props =>
{
    const { roomData = null, handleChange = null } = props;
    const [ chatDistance, setChatDistance ] = useState<number>(0);

    useEffect(() =>
    {
        setChatDistance(roomData.chatSettings.distance);
    }, [ roomData.chatSettings ]);

    return (
        <>
            <Column gap={ 1 }>
                <Text bold>{ LocalizeText('navigator.roomsettings.vip.caption') }</Text>
                <Text>{ LocalizeText('navigator.roomsettings.vip.info') }</Text>
            </Column>
            <Grid overflow="auto">
                <Column size={ 6 } gap={ 1 }>
                    <Text bold>{ LocalizeText('navigator.roomsettings.chat_settings') }</Text>
                    <Text>{ LocalizeText('navigator.roomsettings.chat_settings.info') }</Text>
                    <ShockwaveDropdown
                        value={ roomData.chatSettings.mode }
                        options={ [
                            { value: RoomChatSettings.CHAT_MODE_FREE_FLOW, label: LocalizeText('navigator.roomsettings.chat.mode.free.flow') },
                            { value: RoomChatSettings.CHAT_MODE_LINE_BY_LINE, label: LocalizeText('navigator.roomsettings.chat.mode.line.by.line') }
                        ] }
                        onChange={ val => handleChange('bubble_mode', val) }
                    />
                    <ShockwaveDropdown
                        value={ roomData.chatSettings.weight }
                        options={ [
                            { value: RoomChatSettings.CHAT_BUBBLE_WIDTH_NORMAL, label: LocalizeText('navigator.roomsettings.chat.bubbles.width.normal') },
                            { value: RoomChatSettings.CHAT_BUBBLE_WIDTH_THIN, label: LocalizeText('navigator.roomsettings.chat.bubbles.width.thin') },
                            { value: RoomChatSettings.CHAT_BUBBLE_WIDTH_WIDE, label: LocalizeText('navigator.roomsettings.chat.bubbles.width.wide') }
                        ] }
                        onChange={ val => handleChange('chat_weight', val) }
                    />
                    <ShockwaveDropdown
                        value={ roomData.chatSettings.speed }
                        options={ [
                            { value: RoomChatSettings.CHAT_SCROLL_SPEED_FAST, label: LocalizeText('navigator.roomsettings.chat.speed.fast') },
                            { value: RoomChatSettings.CHAT_SCROLL_SPEED_NORMAL, label: LocalizeText('navigator.roomsettings.chat.speed.normal') },
                            { value: RoomChatSettings.CHAT_SCROLL_SPEED_SLOW, label: LocalizeText('navigator.roomsettings.chat.speed.slow') }
                        ] }
                        onChange={ val => handleChange('bubble_speed', val) }
                    />
                    <ShockwaveDropdown
                        value={ roomData.chatSettings.protection }
                        options={ [
                            { value: RoomChatSettings.FLOOD_FILTER_LOOSE, label: LocalizeText('navigator.roomsettings.chat.flood.loose') },
                            { value: RoomChatSettings.FLOOD_FILTER_NORMAL, label: LocalizeText('navigator.roomsettings.chat.flood.normal') },
                            { value: RoomChatSettings.FLOOD_FILTER_STRICT, label: LocalizeText('navigator.roomsettings.chat.flood.strict') }
                        ] }
                        onChange={ val => handleChange('flood_protection', val) }
                    />
                    <Text>{ LocalizeText('navigator.roomsettings.chat_settings.hearing.distance') }</Text>
                    <input type="number" min="0" className="form-control form-control-sm" value={ chatDistance } onChange={ event => setChatDistance(event.target.valueAsNumber) } onBlur={ event => handleChange('chat_distance', chatDistance) } />
                </Column>
                <Column size={ 6 } gap={ 1 }>
                    <Text bold>{ LocalizeText('navigator.roomsettings.vip_settings') }</Text>
                    <Flex alignItems="center" gap={ 1 }>
                        <input className="form-check-input" type="checkbox" checked={ roomData.hideWalls } onChange={ event => handleChange('hide_walls', event.target.checked) } />
                        <Text>{ LocalizeText('navigator.roomsettings.hide_walls') }</Text>
                    </Flex>
                    <ShockwaveDropdown
                        value={ roomData.wallThickness }
                        options={ [
                            { value: '0', label: LocalizeText('navigator.roomsettings.wall_thickness.normal') },
                            { value: '1', label: LocalizeText('navigator.roomsettings.wall_thickness.thick') },
                            { value: '-1', label: LocalizeText('navigator.roomsettings.wall_thickness.thin') },
                            { value: '-2', label: LocalizeText('navigator.roomsettings.wall_thickness.thinnest') }
                        ] }
                        onChange={ val => handleChange('wall_thickness', val) }
                    />
                    <ShockwaveDropdown
                        value={ roomData.floorThickness }
                        options={ [
                            { value: '0', label: LocalizeText('navigator.roomsettings.floor_thickness.normal') },
                            { value: '1', label: LocalizeText('navigator.roomsettings.floor_thickness.thick') },
                            { value: '-1', label: LocalizeText('navigator.roomsettings.floor_thickness.thin') },
                            { value: '-2', label: LocalizeText('navigator.roomsettings.floor_thickness.thinnest') }
                        ] }
                        onChange={ val => handleChange('floor_thickness', val) }
                    />
                </Column>
            </Grid>
        </>
    );
}
