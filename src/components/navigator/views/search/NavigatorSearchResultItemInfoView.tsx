import { RoomDataParser } from '@nitrots/nitro-renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { Overlay, Popover } from 'react-bootstrap';
import { FaUser } from 'react-icons/fa';
import { LocalizeText } from '../../../../api';
import { Base, Column, Flex, LayoutBadgeImageView, LayoutRoomThumbnailView, NitroCardContentView, Text, UserProfileIconView } from '../../../../common';
import { useEraTheme } from '../../../../hooks/era/useEraTheme';

interface NavigatorSearchResultItemInfoViewProps
{
    roomData: RoomDataParser;
}

const openRoomInfoListeners = new Set<(activeId: number) => void>();

export const NavigatorSearchResultItemInfoView: FC<NavigatorSearchResultItemInfoViewProps> = props =>
{
    const { roomData = null } = props;
    const { currentEra } = useEraTheme();
    const isModern = currentEra === 'modern';
    const [ isVisible, setIsVisible ] = useState(false);
    const elementRef = useRef<HTMLDivElement>();
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const roomId = roomData?.roomId ?? -1;

    const clearHideTimer = () =>
    {
        if(hideTimerRef.current)
        {
            clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
        }
    };

    const openPopover = () =>
    {
        openRoomInfoListeners.forEach(listener => listener(roomId));
        setIsVisible(true);
    };

    const handleMouseEnter = () =>
    {
        if(!isModern) return;
        clearHideTimer();
        openPopover();
    };

    const handleMouseLeave = () =>
    {
        if(!isModern) return;
        clearHideTimer();
        hideTimerRef.current = setTimeout(() => setIsVisible(false), 120);
    };

    useEffect(() =>
    {
        const onOtherOpen = (activeId: number) =>
        {
            if(activeId !== roomId) setIsVisible(false);
        };

        openRoomInfoListeners.add(onOtherOpen);
        return () =>
        {
            clearHideTimer();
            openRoomInfoListeners.delete(onOtherOpen);
        };
    }, [ roomId ]);

    const getUserCounterColor = () =>
    {
        const num: number = (100 * (roomData.userCount / roomData.maxUserCount));

        let bg = 'bg-primary';

        if(num >= 92)
        {
            bg = 'bg-danger';
        }
        else if(num >= 50)
        {
            bg = 'bg-warning';
        }
        else if(num > 0)
        {
            bg = 'bg-success';
        }

        return bg;
    }

    return (
        <>
            <Base
                pointer
                innerRef={ elementRef }
                className="icon icon-navigator-info"
                onMouseEnter={ handleMouseEnter }
                onMouseLeave={ handleMouseLeave }
                onClick={ event =>
                {
                    event.stopPropagation();
                    if(!isModern)
                    {
                        if(isVisible) setIsVisible(false);
                        else openPopover();
                    }
                } }
                onMouseDown={ event => event.stopPropagation() }
            />
            <Overlay show={ isVisible } target={ elementRef.current } placement="right" rootClose={ !isModern } onHide={ () => setIsVisible(false) }>
                <Popover
                    className="navigator-room-info-popover"
                    style={ { zIndex: 1085 } }
                    onMouseEnter={ handleMouseEnter }
                    onMouseLeave={ handleMouseLeave }
                    onClick={ event => event.stopPropagation() }
                >
                    <NitroCardContentView overflow="hidden" className="room-info image-rendering-pixelated bg-transparent">
                        <Flex gap={ 2 } overflow="hidden">
                            <LayoutRoomThumbnailView roomId={ roomData.roomId } customUrl={ roomData.officialRoomPicRef } className="d-flex flex-column align-items-center justify-content-end mb-1 flex-shrink-0">
                                { roomData.habboGroupId > 0 && (
                                    <LayoutBadgeImageView badgeCode={ roomData.groupBadgeCode } isGroup={ true } className={ 'position-absolute top-0 start-0 m-1 ' }/>) }
                                { roomData.doorMode !== RoomDataParser.OPEN_STATE && (
                                    <i className={ 'position-absolute end-0 mb-1 me-1 icon icon-navigator-room-' + (roomData.doorMode === RoomDataParser.DOORBELL_STATE ? 'locked' : roomData.doorMode === RoomDataParser.PASSWORD_STATE ? 'password' : roomData.doorMode === RoomDataParser.INVISIBLE_STATE ? 'invisible' : '') }/> ) }
                            </LayoutRoomThumbnailView>
                            <Column gap={ 1 } className="flex-grow-1" style={ { minWidth: 0 } }>
                                <Text bold className="w-100" style={ { wordBreak: 'break-word', lineHeight: '1.2' } }>
                                    { roomData.roomName }
                                </Text>
                                { (roomData.ownerName && roomData.ownerName.length > 0) &&
                                    <Flex gap={ 1 } alignItems="center" className="flex-wrap">
                                        <Text italics variant="muted">
                                            { LocalizeText('navigator.roomownercaption') }
                                        </Text>
                                        <Flex alignItems="center" gap={ 1 } style={ { minWidth: 0 } }>
                                            <UserProfileIconView userId={ roomData.ownerId } />
                                            <Text italics truncate>{ roomData.ownerName }</Text>
                                        </Flex>
                                    </Flex> }
                                <Text className="flex-grow-1" style={ { wordBreak: 'break-word', overflowWrap: 'anywhere', paddingBottom: '22px', lineHeight: '1.3' } }>
                                    { roomData.description }
                                </Text>
                                <Flex className={ 'badge p-1 position-absolute m-1 bottom-0 end-0 m-2 ' + getUserCounterColor() } gap={ 1 }>
                                    <FaUser className="fa-icon" />
                                    { roomData.userCount }
                                </Flex>
                            </Column>
                        </Flex>
                    </NitroCardContentView>
                </Popover>
            </Overlay>
        </>
    );
}
