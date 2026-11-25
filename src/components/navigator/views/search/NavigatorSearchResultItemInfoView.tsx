import { AddFavouriteRoomMessageComposer, DeleteFavouriteRoomMessageComposer, NavigatorSearchComposer, RoomDataParser, UpdateHomeRoomMessageComposer } from '@nitrots/nitro-renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { Overlay, Popover } from 'react-bootstrap';
import { FaUser } from 'react-icons/fa';
import { GetUserProfile, LocalizeText, ReportType, SendMessageComposer } from '../../../../api';
import { Base, Column, Flex, LayoutBadgeImageView, LayoutRoomThumbnailView, NitroCardContentView, Text, UserProfileIconView } from '../../../../common';
import { useHelp, useNavigator } from '../../../../hooks';
import { useEraTheme } from '../../../../hooks/era/useEraTheme';
import { useIsMobile } from '../../../../hooks/mobile/useIsMobile';
import iconHeartOutlineImg from '../../../../assets/images/eras/flash2012/navigator/icon_heart_outline.png';
import iconHeartFilledImg from '../../../../assets/images/eras/flash2012/navigator/icon_heart_filled.png';
import iconHomeOutlineImg from '../../../../assets/images/eras/flash2012/navigator/icon_home_outline.png';
import iconFlagOutlineImg from '../../../../assets/images/eras/flash2012/navigator/icon_flag_outline.png';

interface NavigatorSearchResultItemInfoViewProps
{
    roomData: RoomDataParser;
}

const openRoomInfoListeners = new Set<(activeId: number) => void>();

export const NavigatorSearchResultItemInfoView: FC<NavigatorSearchResultItemInfoViewProps> = props =>
{
    const { roomData = null } = props;
    const { currentEra } = useEraTheme();
    const isMobile = useIsMobile();
    const isModern = currentEra === 'modern' && !isMobile;
    const isFlash2012 = currentEra === 'flash2012' && !isMobile;
    const { navigatorData = null } = useNavigator();
    const { report = null } = useHelp();
    const [ isVisible, setIsVisible ] = useState(false);
    const [ isFavLocal, setIsFavLocal ] = useState<boolean>(false);
    const elementRef = useRef<HTMLDivElement>();
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const roomId = roomData?.roomId ?? -1;

    const getTradeLabel = (mode: number) =>
    {
        if(mode === 2) return LocalizeText('navigator.roomsettings.trade_allowed') || 'Permitido';
        if(mode === 1) return LocalizeText('navigator.roomsettings.trade_not_with_Controller') || 'Con derechos';
        return LocalizeText('navigator.roomsettings.trade_not_allowed') || 'No permitido';
    };

    const toggleFavorite = () =>
    {
        if(roomId <= 0) return;
        if(isFavLocal)
        {
            SendMessageComposer(new DeleteFavouriteRoomMessageComposer(roomId));
            setIsFavLocal(false);
        }
        else
        {
            SendMessageComposer(new AddFavouriteRoomMessageComposer(roomId));
            setIsFavLocal(true);
        }
    };

    const setAsHomeRoom = () =>
    {
        if(roomId <= 0) return;
        SendMessageComposer(new UpdateHomeRoomMessageComposer(roomId));
    };

    const reportRoom = () =>
    {
        if(roomId <= 0 || !report) return;
        report(ReportType.ROOM, { roomId, roomName: roomData.roomName });
        setIsVisible(false);
    };

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

    const visibleTags = (roomData?.tags || [])
        .map(tag => (tag || '').trim())
        .filter(Boolean)
        .slice(0, 2);

    const searchByTag = (tag: string) =>
    {
        if(!tag) return;
        SendMessageComposer(new NavigatorSearchComposer('hotel_view', `tag:${ tag }`));
        setIsVisible(false);
    };

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
            <Overlay show={ isVisible } target={ elementRef.current } placement={ isMobile ? 'auto' : 'right' } rootClose={ !isModern } onHide={ () => setIsVisible(false) }>
                <Popover
                    className={ `navigator-room-info-popover ${ isFlash2012 ? 'navigator-room-info-popover-2012' : '' } ${ isMobile ? 'navigator-room-info-popover-mobile' : '' }` }
                    style={ isFlash2012 ? { zIndex: 1085, width: '382px', minWidth: '382px', maxWidth: '382px' } : { zIndex: 1085 } }
                    onMouseEnter={ handleMouseEnter }
                    onMouseLeave={ handleMouseLeave }
                    onClick={ event => event.stopPropagation() }
                >
                    { isFlash2012 ? (
                        <div className="room-info-2012-bubble">
                            <div className="room-info-2012-top-card">
                                <LayoutRoomThumbnailView
                                    roomId={ roomData.roomId }
                                    customUrl={ roomData.officialRoomPicRef }
                                    className="room-info-2012-thumb flex-shrink-0"
                                >
                                    { roomData.habboGroupId > 0 && (
                                        <LayoutBadgeImageView badgeCode={ roomData.groupBadgeCode } isGroup={ true } className="position-absolute top-0 start-0 m-1" />
                                    ) }
                                    { roomData.doorMode !== RoomDataParser.OPEN_STATE && (
                                        <i className={ 'position-absolute end-0 bottom-0 mb-1 me-1 icon icon-navigator-room-' + (roomData.doorMode === RoomDataParser.DOORBELL_STATE ? 'locked' : roomData.doorMode === RoomDataParser.PASSWORD_STATE ? 'password' : roomData.doorMode === RoomDataParser.INVISIBLE_STATE ? 'invisible' : '') } />
                                    ) }
                                </LayoutRoomThumbnailView>
                                <div className="room-info-2012-head">
                                    <div className="room-info-2012-head-top">
                                        <div className="room-info-2012-title">{ roomData.roomName }</div>
                                        <div className="room-info-2012-desc">{ roomData.description }</div>
                                    </div>
                                    { (visibleTags.length > 0) && (
                                        <div className="room-info-2012-tags">
                                            { visibleTags.map(tag => (
                                                <button
                                                    key={ tag }
                                                    type="button"
                                                    className="ri2012-tag"
                                                    title={ `Buscar salas con #${ tag.replace(/^#+/, '') }` }
                                                    onClick={ () => searchByTag(tag) }
                                                >
                                                    <span className="ri2012-tag-hash">#</span>
                                                    <span className="ri2012-tag-text">{ tag.replace(/^#+/, '') }</span>
                                                </button>
                                            )) }
                                        </div>
                                    ) }
                                </div>
                            </div>

                            { (roomData.ownerName && roomData.ownerName.length > 0) && (
                                <div className="room-info-2012-owner" onClick={ () => GetUserProfile(roomData.ownerId) }>
                                    <UserProfileIconView userId={ roomData.ownerId } />
                                    <span>{ roomData.ownerName }</span>
                                </div>
                            ) }

                            <div className="room-info-2012-bottom">
                                <div className="room-info-2012-stats">
                                    <span className="ri2012-k">Tradear</span>
                                    <span className="ri2012-v">{ getTradeLabel(roomData.tradeMode) }</span>
                                    <span className="ri2012-k">Aforo</span>
                                    <span className="ri2012-v">{ roomData.maxUserCount }</span>
                                    <span className="ri2012-k">Me gusta</span>
                                    <span className="ri2012-v">{ roomData.score }</span>
                                </div>

                                <div className="room-info-2012-actions">
                                    <button type="button" className="ri2012-act" onClick={ toggleFavorite }>
                                        <span className="ri2012-ico-slot">
                                            <img
                                                src={ isFavLocal ? iconHeartFilledImg : iconHeartOutlineImg }
                                                alt=""
                                                width={ 13 }
                                                height={ 11 }
                                                className="ri2012-pixel-ico"
                                            />
                                        </span>
                                        <span>Favorito</span>
                                    </button>
                                    <button type="button" className="ri2012-act" onClick={ setAsHomeRoom }>
                                        <span className="ri2012-ico-slot">
                                            <img
                                                src={ iconHomeOutlineImg }
                                                alt=""
                                                width={ 11 }
                                                height={ 11 }
                                                className={ `ri2012-pixel-ico ${ navigatorData?.homeRoomId === roomId ? 'is-home-active' : '' }` }
                                            />
                                        </span>
                                        <span>Sala principal</span>
                                    </button>
                                    <button type="button" className="ri2012-act" onClick={ reportRoom }>
                                        <span className="ri2012-ico-slot">
                                            <img
                                                src={ iconFlagOutlineImg }
                                                alt=""
                                                width={ 12 }
                                                height={ 15 }
                                                className="ri2012-pixel-ico"
                                            />
                                        </span>
                                        <span>Reportar sala</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
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
                                    <Text className="flex-grow-1" style={ { wordBreak: 'break-word', overflowWrap: 'anywhere', paddingBottom: visibleTags.length > 0 ? '4px' : '22px', lineHeight: '1.3' } }>
                                        { roomData.description }
                                    </Text>
                                    { (visibleTags.length > 0) && (
                                        <Flex alignItems="center" gap={ 1 } className="flex-wrap" style={ { paddingBottom: '22px', paddingRight: '46px' } }>
                                            { visibleTags.map(tag => (
                                                <Text
                                                    key={ tag }
                                                    pointer
                                                    className="bg-muted rounded px-1 py-0"
                                                    style={ { fontSize: '0.82em', lineHeight: 1.45 } }
                                                    onClick={ () => searchByTag(tag) }
                                                >
                                                    #{ tag.replace(/^#+/, '') }
                                                </Text>
                                            )) }
                                        </Flex>
                                    ) }
                                    <Flex className={ 'badge p-1 position-absolute m-1 bottom-0 end-0 m-2 ' + getUserCounterColor() } gap={ 1 }>
                                        <FaUser className="fa-icon" />
                                        { roomData.userCount }
                                    </Flex>
                                </Column>
                            </Flex>
                        </NitroCardContentView>
                    ) }
                </Popover>
            </Overlay>
        </>
    );
}
