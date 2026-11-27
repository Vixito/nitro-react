import { RelationshipStatusInfoEvent, RelationshipStatusInfoMessageParser, RoomSessionFavoriteGroupUpdateEvent, RoomSessionUserBadgesEvent, RoomSessionUserFigureUpdateEvent, UserCurrentBadgesEvent, UserRelationshipsComposer } from '@nitrots/nitro-renderer';
import { CSSProperties, Dispatch, FC, FocusEvent, KeyboardEvent, SetStateAction, useEffect, useMemo, useState } from 'react';
import { FaPalette, FaPencilAlt, FaTimes } from 'react-icons/fa';
import close2012Img from '../../../../../assets/images/infostand/close-2012.png';
import pencilIconImg from '../../../../../assets/images/infostand/pencil-icon.png';
import { AvatarInfoUser, CloneObject, CreateLinkEvent, GetConfiguration, GetGroupInformation, GetSessionDataManager, GetUserProfile, LocalizeText, SendMessageComposer } from '../../../../../api';
import { getActionDef, getFurniDef, getPlateDef, useInfoStandFurniSprite, useUserInfoStandStyle } from '../../../../../api/infostand/InfoStandStyleService';
import { InfoStandPlateDecor, PlateEmblemIcon } from './InfoStandPlateDecor';
import { Column, Flex, LayoutAvatarImageView, LayoutBadgeImageView, Text, UserProfileIconView } from '../../../../../common';
import { useEraTheme, useMessageEvent, useRoom, useRoomSessionManagerEvent } from '../../../../../hooks';
import { InfoStandWidgetUserRelationshipsView } from './InfoStandWidgetUserRelationshipsView';
import { InfoStandWidgetUserTagsView } from './InfoStandWidgetUserTagsView';

interface InfoStandWidgetUserViewProps
{
    avatarInfo: AvatarInfoUser;
    setAvatarInfo: Dispatch<SetStateAction<AvatarInfoUser>>;
    onClose: () => void;
}

export const InfoStandWidgetUserView: FC<InfoStandWidgetUserViewProps> = props =>
{
    const { avatarInfo = null, setAvatarInfo = null, onClose = null } = props;
    const [ motto, setMotto ] = useState<string>(null);
    const [ isEditingMotto, setIsEditingMotto ] = useState(false);
    const [ relationships, setRelationships ] = useState<RelationshipStatusInfoMessageParser>(null);
    const { roomSession = null } = useRoom();
    const { currentEra } = useEraTheme();
    const isFlash2012 = currentEra === 'flash2012';
    const customStyle = useUserInfoStandStyle(avatarInfo?.webID);
    const customPlate = useMemo(() => getPlateDef(customStyle.plateId), [ customStyle.plateId ]);
    const customFurni = useMemo(() => getFurniDef(customStyle.furniId), [ customStyle.furniId ]);
    const customAction = useMemo(() => getActionDef(customStyle.actionId), [ customStyle.actionId ]);
    const customFurniSprite = useInfoStandFurniSprite(customFurni.furnitureId);

    const saveMotto = (motto: string) =>
    {
        if(!isEditingMotto || (motto.length > GetConfiguration<number>('motto.max.length', 38))) return;

        roomSession.sendMottoMessage(motto);

        setIsEditingMotto(false);
    }

    const onMottoBlur = (event: FocusEvent<HTMLInputElement>) => saveMotto(event.target.value);

    const onMottoKeyDown = (event: KeyboardEvent<HTMLInputElement>) =>
    {
        event.stopPropagation();

        switch(event.key)
        {
            case 'Enter':
                saveMotto((event.target as HTMLInputElement).value);
                return;
        }
    }

    useRoomSessionManagerEvent<RoomSessionUserBadgesEvent>(RoomSessionUserBadgesEvent.RSUBE_BADGES, event =>
    {
        if(!avatarInfo || (avatarInfo.webID !== event.userId)) return;

        const oldBadges = avatarInfo.badges.join('');

        if(oldBadges === event.badges.join('')) return;

        setAvatarInfo(prevValue =>
        {
            const newValue = CloneObject(prevValue);

            newValue.badges = event.badges;

            return newValue;
        });
    });

    useMessageEvent<UserCurrentBadgesEvent>(UserCurrentBadgesEvent, event =>
    {
        const parser = event.getParser();

        if(!avatarInfo || (avatarInfo.webID !== parser.userId)) return;

        setAvatarInfo(prevValue =>
        {
            if(!prevValue) return null;

            const newValue = CloneObject(prevValue);

            newValue.badges = parser.badges;

            return newValue;
        });
    });

    useEffect(() =>
    {
        const handleOwnBadges = (event: CustomEvent<string[]>) =>
        {
            if(!avatarInfo || ((avatarInfo.type !== AvatarInfoUser.OWN_USER) && (avatarInfo.webID !== GetSessionDataManager().userId))) return;

            setAvatarInfo(prevValue =>
            {
                if(!prevValue) return null;

                const newValue = CloneObject(prevValue);

                newValue.badges = event.detail;

                return newValue;
            });
        };

        window.addEventListener('nitro-own-badges-updated', handleOwnBadges as EventListener);

        return () => window.removeEventListener('nitro-own-badges-updated', handleOwnBadges as EventListener);
    }, [ avatarInfo, setAvatarInfo ]);

    useRoomSessionManagerEvent<RoomSessionUserFigureUpdateEvent>(RoomSessionUserFigureUpdateEvent.USER_FIGURE, event =>
    {
        if(!avatarInfo || (avatarInfo.roomIndex !== event.roomIndex)) return;

        setAvatarInfo(prevValue =>
        {
            const newValue = CloneObject(prevValue);

            newValue.figure = event.figure;
            newValue.motto = event.customInfo;
            newValue.achievementScore = event.activityPoints;

            return newValue;
        });
    });

    useRoomSessionManagerEvent<RoomSessionFavoriteGroupUpdateEvent>(RoomSessionFavoriteGroupUpdateEvent.FAVOURITE_GROUP_UPDATE, event =>
    {
        if(!avatarInfo || (avatarInfo.roomIndex !== event.roomIndex)) return;

        setAvatarInfo(prevValue =>
        {
            const newValue = CloneObject(prevValue);
            const clearGroup = ((event.status === -1) || (event.habboGroupId <= 0));

            newValue.groupId = clearGroup ? -1 : event.habboGroupId;
            newValue.groupName = clearGroup ? null : event.habboGroupName
            newValue.groupBadgeId = clearGroup ? null : GetSessionDataManager().getGroupBadge(event.habboGroupId);

            return newValue;
        });
    });

    useMessageEvent<RelationshipStatusInfoEvent>(RelationshipStatusInfoEvent, event =>
    {
        const parser = event.getParser();

        if(!avatarInfo || (avatarInfo.webID !== parser.userId)) return;

        setRelationships(parser);
    });

    useEffect(() =>
    {
        setIsEditingMotto(false);
        setMotto(avatarInfo.motto);

        SendMessageComposer(new UserRelationshipsComposer(avatarInfo.webID));

        return () =>
        {
            setIsEditingMotto(false);
            setMotto(null);
            setRelationships(null);
        }
    }, [ avatarInfo ]);

    if(!avatarInfo) return null;

    const hasCustomPlate = customPlate.id !== 'default';
    const customPlateVars = hasCustomPlate ? ({
        '--is-plate-bg': customPlate.bgStyle,
        '--is-plate-border': customPlate.borderColor,
        '--is-plate-accent': customPlate.accentColor
    } as CSSProperties) : undefined;
    const isOwn = avatarInfo.type === AvatarInfoUser.OWN_USER;
    const isSittingOnFurni = customFurni.furnitureId > 0 && customAction.id === 'sit';
    const seatShiftX = isSittingOnFurni ? (customFurni.seatOffsetX ?? 0) : 0;
    const seatShiftY = isSittingOnFurni ? (customFurni.seatOffsetY ?? 0) : 0;
    const seatTransform = (seatShiftX !== 0 || seatShiftY !== 0) ? `translate(${ seatShiftX }px, ${ seatShiftY }px)` : undefined;

    return (
        <Column
            className={ `nitro-infostand rounded ${ hasCustomPlate ? `has-custom-plate infostand-pattern-${ customPlate.pattern || 'none' } ${ customPlate.topBannerImg ? 'has-top-banner' : '' }` : '' }` }
            style={ customPlateVars }
        >
            { hasCustomPlate && <InfoStandPlateDecor plate={ customPlate } /> }
            <Column overflow="visible" className="container-fluid content-area infostand-foreground" gap={ 1 }>
                <Column gap={ 1 }>
                    <Flex alignItems="center" justifyContent="between">
                        <Flex alignItems="center" gap={ 1 }>
                            { hasCustomPlate && <PlateEmblemIcon plate={ customPlate } /> }
                            <UserProfileIconView userId={ avatarInfo.webID } />
                            <Text bold variant="white" small wrap className="infostand-name fw-bold"><b>{ avatarInfo.name }</b></Text>
                        </Flex>
                        <Flex alignItems="center" gap={ 2 }>
                            { isOwn && (
                                <FaPalette
                                    className="cursor-pointer fa-icon infostand-customize-btn"
                                    title="Personalizar Info Stand"
                                    onClick={ () => CreateLinkEvent('infostand-editor/open') }
                                />
                            ) }
                            { isFlash2012
                                ? <img src={ close2012Img } alt="Cerrar" className="cursor-pointer infostand-close-2012" onClick={ onClose } />
                                : <FaTimes className="cursor-pointer fa-icon" onClick={ onClose } /> }
                        </Flex>
                    </Flex>
                    <hr className="m-0" />
                </Column>
                <Column gap={ 1 }>
                    <Flex gap={ 1 }>
                        <Column fullWidth pointer className="body-image infostand-custom-stage cursor-pointer" onClick={ event => GetUserProfile(avatarInfo.webID) }>
                            { customFurniSprite && (
                                <img src={ customFurniSprite } alt={ customFurni.name } className="infostand-furni-bg" />
                            ) }
                            <div className="infostand-avatar-fg">
                                <div className="avatar-seat-offset" style={ { transform: seatTransform } }>
                                    <LayoutAvatarImageView
                                        figure={ avatarInfo.figure }
                                        direction={ 4 }
                                        posture={ customAction.posture }
                                        gesture={ customAction.gesture }
                                        expression={ customAction.expression }
                                        carryItem={ customAction.carryItem }
                                    />
                                </div>
                            </div>
                        </Column>
                        <Column grow alignItems="center" gap={ 0 }>
                            <Flex gap={ 1 }>
                                <Flex center className="badge-image">
                                    { avatarInfo.badges[0] && <LayoutBadgeImageView badgeCode={ avatarInfo.badges[0] } showInfo={ true } /> }
                                </Flex>
                                <Flex center pointer={ ( avatarInfo.groupId > 0) } className="badge-image" onClick={ event => GetGroupInformation(avatarInfo.groupId) }>
                                    { avatarInfo.groupId > 0 &&
                                        <LayoutBadgeImageView badgeCode={ avatarInfo.groupBadgeId } isGroup={ true } showInfo={ true } customTitle={ avatarInfo.groupName } /> }
                                </Flex>
                            </Flex>
                            <Flex center gap={ 1 }>
                                <Flex center className="badge-image">
                                    { avatarInfo.badges[1] && <LayoutBadgeImageView badgeCode={ avatarInfo.badges[1] } showInfo={ true } /> }
                                </Flex>
                                <Flex center className="badge-image">
                                    { avatarInfo.badges[2] && <LayoutBadgeImageView badgeCode={ avatarInfo.badges[2] } showInfo={ true } /> }
                                </Flex>
                            </Flex>
                            <Flex center gap={ 1 }>
                                <Flex center className="badge-image">
                                    { avatarInfo.badges[3] && <LayoutBadgeImageView badgeCode={ avatarInfo.badges[3] } showInfo={ true } /> }
                                </Flex>
                                <Flex center className="badge-image">
                                    { avatarInfo.badges[4] && <LayoutBadgeImageView badgeCode={ avatarInfo.badges[4] } showInfo={ true } /> }
                                </Flex>
                            </Flex>
                        </Column>
                    </Flex>
                    <hr className="m-0" />
                </Column>
                <Column gap={ 1 }>
                    <Flex alignItems="center" className="motto-row py-1 px-1">
                        { (avatarInfo.type !== AvatarInfoUser.OWN_USER) &&
                            <Flex grow alignItems="center" className="motto-content">
                                <Text fullWidth pointer wrap textBreak small variant="white">{ motto }</Text>
                            </Flex> }
                        { avatarInfo.type === AvatarInfoUser.OWN_USER &&
                            <Flex grow alignItems="center" gap={ 2 }>
                                { isFlash2012
                                    ? <img src={ pencilIconImg } alt="Editar misión" className="infostand-pencil-2012 cursor-pointer" onClick={ () => setIsEditingMotto(true) } />
                                    : <FaPencilAlt className="small fa-icon" /> }
                                <Flex grow alignItems="center" className="motto-content">
                                    { !isEditingMotto &&
                                        <Text fullWidth pointer wrap textBreak small variant="white" onClick={ event => setIsEditingMotto(true) }>{ motto }&nbsp;</Text> }
                                    { isEditingMotto &&
                                        <input type="text" className="motto-input" maxLength={ GetConfiguration<number>('motto.max.length', 38) } value={ motto } onChange={ event => setMotto(event.target.value) } onBlur={ onMottoBlur } onKeyDown={ onMottoKeyDown } autoFocus={ true } /> }
                                </Flex>
                            </Flex> }
                    </Flex>
                    <hr className="m-0" />
                </Column>
                <Column gap={ 1 }>
                    <Text bold variant="white" small wrap className="infostand-score fw-bold">
                        <b>{ LocalizeText('infostand.text.achievement_score') + ' ' + avatarInfo.achievementScore }</b>
                    </Text>
                    { (avatarInfo.carryItem > 0) &&
                        <>
                            <hr className="m-0" />
                            <Text variant="white" small wrap>
                                { LocalizeText('infostand.text.handitem', [ 'item' ], [ LocalizeText('handitem' + avatarInfo.carryItem) ]) }
                            </Text>
                        </> }
                </Column>
                <Column gap={ 1 }>
                    <InfoStandWidgetUserRelationshipsView relationships={ relationships } />
                </Column>
                { GetConfiguration('user.tags.enabled') &&
                    <Column gap={ 1 } className="mt-1">
                        <InfoStandWidgetUserTagsView tags={ GetSessionDataManager().tags } />
                    </Column>
                }
            </Column>
        </Column>
    );
}
