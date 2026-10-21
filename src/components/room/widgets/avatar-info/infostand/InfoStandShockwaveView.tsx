import { AvatarAction, AvatarExpressionEnum, GroupInformationComposer, GroupInformationEvent, RelationshipStatusInfoEvent, RelationshipStatusInfoMessageParser, RoomControllerLevel, RoomObjectCategory, RoomObjectOperationType, RoomObjectVariable, RoomSessionFavoriteGroupUpdateEvent, RoomSessionUserBadgesEvent, RoomSessionUserFigureUpdateEvent, RoomWidgetEnumItemExtradataParameter, RoomWidgetFurniInfoUsagePolicyEnum, TradingOpenComposer, UserRelationshipsComposer } from '@nitrots/nitro-renderer';
import { Dispatch, FC, FocusEvent, KeyboardEvent, SetStateAction, useCallback, useEffect, useMemo, useState } from 'react';
import { FaChevronDown, FaChevronUp, FaCog, FaExchangeAlt, FaHandPaper, FaInfoCircle, FaMusic, FaPencilAlt, FaRedo, FaTimes, FaTrash, FaUserCheck, FaUserPlus, FaUserSlash } from 'react-icons/fa';
import { AvatarInfoFurni, AvatarInfoPet, AvatarInfoRentableBot, AvatarInfoUser, CloneObject, CreateLinkEvent, DispatchUiEvent, GetConfiguration, GetGroupInformation, GetNitroInstance, GetOwnPosture, GetRoomEngine, GetSessionDataManager, GetUserProfile, HasHabboVip, LocalizeText, PostureTypeEnum, RoomWidgetUpdateChatInputContentEvent, SendMessageComposer } from '../../../../../api';
import { Column, Flex, LayoutAvatarImageView, LayoutBadgeImageView, LayoutLimitedEditionCompactPlateView, LayoutPetImageView, LayoutRarityLevelView, Text, UserProfileIconView } from '../../../../../common';
import { useFriends, useMessageEvent, useRoom, useRoomEngineEvent, useRoomSessionManagerEvent, useSessionInfo } from '../../../../../hooks';
import { InfoStandWidgetUserRelationshipsView } from './InfoStandWidgetUserRelationshipsView';
import { InfoStandWidgetUserTagsView } from './InfoStandWidgetUserTagsView';

interface InfoStandShockwaveViewProps
{
    avatarInfo: any;
    setAvatarInfo: Dispatch<SetStateAction<any>>;
    isDancing?: boolean;
    setIsDecorating?: Dispatch<SetStateAction<boolean>>;
    onClose: () => void;
}

const PICKUP_MODE_NONE = 0;
const PICKUP_MODE_EJECT = 1;
const PICKUP_MODE_FULL = 2;

export const InfoStandShockwaveView: FC<InfoStandShockwaveViewProps> = props =>
{
    const { avatarInfo = null, setAvatarInfo = null, isDancing = false, setIsDecorating = null, onClose = null } = props;
    const { roomSession = null } = useRoom();
    const { userRespectRemaining = 0, respectUser = null, petRespectRemaining = 0, respectPet = null } = useSessionInfo();
    const { canRequestFriend = null } = useFriends();

    // Expansion state for the classic retro details card
    const [ isCardExpanded, setIsCardExpanded ] = useState(false);

    // User-specific states
    const [ motto, setMotto ] = useState<string>('');
    const [ isEditingMotto, setIsEditingMotto ] = useState(false);
    const [ relationships, setRelationships ] = useState<RelationshipStatusInfoMessageParser>(null);

    // Furni-specific states
    const [ pickupMode, setPickupMode ] = useState(PICKUP_MODE_NONE);
    const [ canMove, setCanMove ] = useState(false);
    const [ canRotate, setCanRotate ] = useState(false);
    const [ canUse, setCanUse ] = useState(false);
    const [ groupName, setGroupName ] = useState<string>(null);

    // Auto-collapse card on entity switch
    useEffect(() =>
    {
        setIsCardExpanded(false);
        setIsEditingMotto(false);
    }, [ avatarInfo?.type, (avatarInfo as any)?.id, (avatarInfo as any)?.roomIndex, (avatarInfo as any)?.webID ]);

    // -------------------------------------------------------------------------
    // User Badges & Figure updates
    // -------------------------------------------------------------------------
    useRoomSessionManagerEvent<RoomSessionUserBadgesEvent>(RoomSessionUserBadgesEvent.RSUBE_BADGES, event =>
    {
        if(!avatarInfo || (avatarInfo.type !== AvatarInfoUser.OWN_USER && avatarInfo.type !== AvatarInfoUser.PEER)) return;
        const userInfo = avatarInfo as AvatarInfoUser;
        if(userInfo.webID !== event.userId) return;

        const oldBadges = (userInfo.badges || []).join('');
        if(oldBadges === event.badges.join('')) return;

        setAvatarInfo(prev =>
        {
            if(!prev) return null;
            const updated = CloneObject(prev);
            updated.badges = event.badges;
            return updated;
        });
    });

    useRoomSessionManagerEvent<RoomSessionUserFigureUpdateEvent>(RoomSessionUserFigureUpdateEvent.USER_FIGURE, event =>
    {
        if(!avatarInfo || (avatarInfo.type !== AvatarInfoUser.OWN_USER && avatarInfo.type !== AvatarInfoUser.PEER)) return;
        const userInfo = avatarInfo as AvatarInfoUser;
        if(userInfo.roomIndex !== event.roomIndex) return;

        setAvatarInfo(prev =>
        {
            if(!prev) return null;
            const updated = CloneObject(prev);
            updated.figure = event.figure;
            updated.motto = event.customInfo;
            updated.achievementScore = event.activityPoints;
            return updated;
        });
    });

    useRoomSessionManagerEvent<RoomSessionFavoriteGroupUpdateEvent>(RoomSessionFavoriteGroupUpdateEvent.FAVOURITE_GROUP_UPDATE, event =>
    {
        if(!avatarInfo || (avatarInfo.type !== AvatarInfoUser.OWN_USER && avatarInfo.type !== AvatarInfoUser.PEER)) return;
        const userInfo = avatarInfo as AvatarInfoUser;
        if(userInfo.roomIndex !== event.roomIndex) return;

        setAvatarInfo(prev =>
        {
            if(!prev) return null;
            const updated = CloneObject(prev);
            const clearGroup = ((event.status === -1) || (event.habboGroupId <= 0));
            updated.groupId = clearGroup ? -1 : event.habboGroupId;
            updated.groupName = clearGroup ? null : event.habboGroupName;
            updated.groupBadgeId = clearGroup ? null : GetSessionDataManager().getGroupBadge(event.habboGroupId);
            return updated;
        });
    });

    useMessageEvent<RelationshipStatusInfoEvent>(RelationshipStatusInfoEvent, event =>
    {
        const parser = event.getParser();
        if(!avatarInfo || (avatarInfo as AvatarInfoUser).webID !== parser.userId) return;
        setRelationships(parser);
    });

    useEffect(() =>
    {
        if(avatarInfo && (avatarInfo.type === AvatarInfoUser.OWN_USER || avatarInfo.type === AvatarInfoUser.PEER))
        {
            const userInfo = avatarInfo as AvatarInfoUser;
            setMotto(userInfo.motto || '');
            SendMessageComposer(new UserRelationshipsComposer(userInfo.webID));
        }
        else
        {
            setRelationships(null);
        }
    }, [ avatarInfo ]);

    // -------------------------------------------------------------------------
    // Furni logic
    // -------------------------------------------------------------------------
    useEffect(() =>
    {
        if(!avatarInfo || avatarInfo.type !== AvatarInfoFurni.FURNI) return;

        const furniInfo = avatarInfo as AvatarInfoFurni;
        let mode = PICKUP_MODE_NONE;
        let move = false;
        let rotate = false;
        let use = false;

        const isValidController = (furniInfo.roomControllerLevel >= RoomControllerLevel.GUEST);

        if(isValidController || furniInfo.isOwner || furniInfo.isRoomOwner || furniInfo.isAnyRoomController)
        {
            move = true;
            rotate = !furniInfo.isWallItem;
        }

        if(((furniInfo.usagePolicy === RoomWidgetFurniInfoUsagePolicyEnum.EVERYBODY) ||
            ((furniInfo.usagePolicy === RoomWidgetFurniInfoUsagePolicyEnum.CONTROLLER) && isValidController)) ||
            ((furniInfo.extraParam === RoomWidgetEnumItemExtradataParameter.JUKEBOX) && isValidController) ||
            ((furniInfo.extraParam === RoomWidgetEnumItemExtradataParameter.USABLE_PRODUCT) && isValidController))
        {
            use = true;
        }

        if(furniInfo.isOwner || furniInfo.isAnyRoomController) mode = PICKUP_MODE_FULL;
        else if(furniInfo.isRoomOwner || (furniInfo.roomControllerLevel >= RoomControllerLevel.GUILD_ADMIN)) mode = PICKUP_MODE_EJECT;
        if(furniInfo.isStickie) mode = PICKUP_MODE_NONE;

        setPickupMode(mode);
        setCanMove(move);
        setCanRotate(rotate);
        setCanUse(use);
        setGroupName(null);

        if(furniInfo.groupId) SendMessageComposer(new GroupInformationComposer(furniInfo.groupId, false));
    }, [ avatarInfo ]);

    useMessageEvent<GroupInformationEvent>(GroupInformationEvent, event =>
    {
        const parser = event.getParser();
        if(!avatarInfo || (avatarInfo as AvatarInfoFurni).groupId !== parser.id || parser.flag) return;
        setGroupName(parser.title);
    });

    // -------------------------------------------------------------------------
    // Save Motto
    // -------------------------------------------------------------------------
    const saveMotto = (newMotto: string) =>
    {
        if(!isEditingMotto || (newMotto.length > GetConfiguration<number>('motto.max.length', 38))) return;
        roomSession?.sendMottoMessage(newMotto);
        setIsEditingMotto(false);
    };

    const onMottoBlur = (event: FocusEvent<HTMLInputElement>) => saveMotto(event.target.value);
    const onMottoKeyDown = (event: KeyboardEvent<HTMLInputElement>) =>
    {
        event.stopPropagation();
        if(event.key === 'Enter') saveMotto((event.target as HTMLInputElement).value);
    };

    // -------------------------------------------------------------------------
    // Actions dispatcher
    // -------------------------------------------------------------------------
    const handleAction = useCallback((action: string) =>
    {
        if(!roomSession) return;

        switch(action)
        {
            // Own User Actions
            case 'wave':
                roomSession.sendExpressionMessage(AvatarExpressionEnum.WAVE.ordinal);
                break;
            case 'dance':
                roomSession.sendDanceMessage(isDancing ? 0 : 1);
                break;
            case 'sit_stand': {
                const isStanding = (GetOwnPosture() === AvatarAction.POSTURE_STAND);
                roomSession.sendPostureMessage(isStanding ? PostureTypeEnum.POSTURE_SIT : PostureTypeEnum.POSTURE_STAND);
                break;
            }
            case 'change_looks':
                CreateLinkEvent('avatar-editor/show');
                break;

            // Peer User Actions
            case 'whisper':
                if(avatarInfo) DispatchUiEvent(new RoomWidgetUpdateChatInputContentEvent(RoomWidgetUpdateChatInputContentEvent.WHISPER, (avatarInfo as AvatarInfoUser).name));
                break;
            case 'trade':
                if(avatarInfo) SendMessageComposer(new TradingOpenComposer((avatarInfo as AvatarInfoUser).roomIndex));
                break;
            case 'friend':
                if(avatarInfo) CreateLinkEvent(`friends/request/${ (avatarInfo as AvatarInfoUser).webID }/${ (avatarInfo as AvatarInfoUser).name }`);
                break;
            case 'ignore':
                if(avatarInfo) GetSessionDataManager().ignoreUser((avatarInfo as AvatarInfoUser).name);
                break;
            case 'unignore':
                if(avatarInfo) GetSessionDataManager().unignoreUser((avatarInfo as AvatarInfoUser).name);
                break;
            case 'respect':
                if(avatarInfo && (avatarInfo as AvatarInfoUser).webID) respectUser((avatarInfo as AvatarInfoUser).webID);
                break;
            case 'kick':
                if(avatarInfo) roomSession.sendKickMessage((avatarInfo as AvatarInfoUser).webID);
                break;
            case 'ban':
                if(avatarInfo) roomSession.sendBanMessage((avatarInfo as AvatarInfoUser).webID, 'RWUAM_BAN_USER_DAY');
                break;

            // Furni Actions
            case 'furni_use':
                if(avatarInfo) GetRoomEngine().useRoomObject((avatarInfo as AvatarInfoFurni).id, (avatarInfo as AvatarInfoFurni).category);
                break;
            case 'furni_move':
                if(avatarInfo) GetRoomEngine().processRoomObjectOperation((avatarInfo as AvatarInfoFurni).id, (avatarInfo as AvatarInfoFurni).category, RoomObjectOperationType.OBJECT_MOVE);
                break;
            case 'furni_rotate':
                if(avatarInfo) GetRoomEngine().processRoomObjectOperation((avatarInfo as AvatarInfoFurni).id, (avatarInfo as AvatarInfoFurni).category, RoomObjectOperationType.OBJECT_ROTATE_POSITIVE);
                break;
            case 'furni_pickup':
                if(avatarInfo)
                {
                    const f = avatarInfo as AvatarInfoFurni;
                    if(pickupMode === PICKUP_MODE_FULL) GetRoomEngine().processRoomObjectOperation(f.id, f.category, RoomObjectOperationType.OBJECT_PICKUP);
                    else GetRoomEngine().processRoomObjectOperation(f.id, f.category, RoomObjectOperationType.OBJECT_EJECT);
                }
                break;

            // Pet Actions
            case 'pet_respect':
                if(avatarInfo) respectPet((avatarInfo as AvatarInfoPet).id);
                break;
            case 'pet_buyfood':
                CreateLinkEvent('catalog/open/' + GetConfiguration('catalog.links')['pets.buy_food']);
                break;
            case 'pet_train':
                if(avatarInfo) roomSession?.requestPetCommands((avatarInfo as AvatarInfoPet).id);
                break;
            case 'pet_pickup':
                if(avatarInfo) roomSession?.pickupPet((avatarInfo as AvatarInfoPet).id);
                break;
        }
    }, [ roomSession, isDancing, avatarInfo, pickupMode, respectUser, respectPet ]);

    // If not in a room, nothing to render
    if(!roomSession) return null;

    // -------------------------------------------------------------------------
    // Determine entity type and active attributes
    // -------------------------------------------------------------------------
    const isUser = avatarInfo && (avatarInfo.type === AvatarInfoUser.OWN_USER || avatarInfo.type === AvatarInfoUser.PEER);
    const isOwnUser = avatarInfo && avatarInfo.type === AvatarInfoUser.OWN_USER;
    const isFurni = avatarInfo && avatarInfo.type === AvatarInfoFurni.FURNI;
    const isPet = avatarInfo && avatarInfo.type === AvatarInfoPet.PET_INFO;
    const isBot = avatarInfo && (avatarInfo.type === AvatarInfoUser.BOT || avatarInfo.type === AvatarInfoRentableBot.RENTABLE_BOT);

    const entityName = avatarInfo ? (avatarInfo as any).name || '' : '';

    // -------------------------------------------------------------------------
    // Render entity preview standing on the pedestal
    // -------------------------------------------------------------------------
    const renderEntityPreview = () =>
    {
        if(!avatarInfo) return null;

        if(isUser || isBot)
        {
            const userInfo = avatarInfo as AvatarInfoUser;
            return (
                <div className="stage-avatar-wrapper" onClick={ () => setIsCardExpanded(!isCardExpanded) }>
                    <LayoutAvatarImageView figure={ userInfo.figure } direction={ 4 } />
                </div>
            );
        }

        if(isFurni)
        {
            const furniInfo = avatarInfo as AvatarInfoFurni;
            return (
                <div className="stage-furni-wrapper" onClick={ () => setIsCardExpanded(!isCardExpanded) }>
                    { furniInfo.image && furniInfo.image.src ? (
                        <img src={ furniInfo.image.src } alt={ furniInfo.name } className="stage-furni-img" />
                    ) : null }
                </div>
            );
        }

        if(isPet)
        {
            const petInfo = avatarInfo as AvatarInfoPet;
            return (
                <div className="stage-pet-wrapper" onClick={ () => setIsCardExpanded(!isCardExpanded) }>
                    <LayoutPetImageView figure={ petInfo.petFigure } posture={ petInfo.posture } direction={ 4 } />
                </div>
            );
        }

        return null;
    };

    // -------------------------------------------------------------------------
    // Action buttons bar
    // -------------------------------------------------------------------------
    const renderActionButtons = () =>
    {
        if(!avatarInfo) return null;

        if(isOwnUser)
        {
            const isStanding = (GetOwnPosture() === AvatarAction.POSTURE_STAND);
            return (
                <div className="stage-actions">
                    <button type="button" className="retro-action-btn" onClick={ () => handleAction('wave') } title="Saludar a la sala">
                        <FaHandPaper className="btn-icon" />
                        <span>Saludar</span>
                    </button>
                    <button type="button" className="retro-action-btn" onClick={ () => handleAction('dance') } title="Bailar">
                        <FaMusic className="btn-icon" />
                        <span>{ isDancing ? 'Parar' : 'Bailar' }</span>
                    </button>
                    <button type="button" className="retro-action-btn" onClick={ () => handleAction('sit_stand') } title={ isStanding ? 'Sentarse' : 'Levantarse' }>
                        <span>{ isStanding ? 'Sentarse' : 'Levantarse' }</span>
                    </button>
                </div>
            );
        }

        if(isUser && !isOwnUser)
        {
            const peer = avatarInfo as AvatarInfoUser;
            const canTrade = true;
            const isFriend = !canRequestFriend(peer.webID);

            return (
                <div className="stage-actions">
                    { peer.isIgnored ? (
                        <button type="button" className="retro-action-btn" onClick={ () => handleAction('unignore') } title="Desbloquear usuario">
                            <FaUserCheck className="btn-icon" />
                            <span>Desbloquear</span>
                        </button>
                    ) : (
                        <button type="button" className="retro-action-btn" onClick={ () => handleAction('ignore') } title="Ignorar / Bloquear usuario">
                            <FaUserSlash className="btn-icon" />
                            <span>Bloquear</span>
                        </button>
                    ) }
                    <button type="button" className="retro-action-btn" onClick={ () => handleAction('trade') } title="Intercambiar furnis">
                        <FaExchangeAlt className="btn-icon" />
                        <span>Intercambiar</span>
                    </button>
                    { !isFriend ? (
                        <button type="button" className="retro-action-btn" onClick={ () => handleAction('friend') } title="Pedir solicitud de amistad">
                            <FaUserPlus className="btn-icon" />
                            <span>Pedir amistad</span>
                        </button>
                    ) : null }
                    { userRespectRemaining > 0 ? (
                        <button type="button" className="retro-action-btn" onClick={ () => handleAction('respect') } title={ `Respetar (${ userRespectRemaining } disponibles)` }>
                            <span>Respetar</span>
                        </button>
                    ) : null }
                    { (peer.canBeKicked || peer.amIOwner) ? (
                        <button type="button" className="retro-action-btn" onClick={ () => handleAction('kick') } title="Expulsar de la sala">
                            <span>Expulsar</span>
                        </button>
                    ) : null }
                </div>
            );
        }

        if(isFurni)
        {
            return (
                <div className="stage-actions">
                    { canUse && (
                        <button type="button" className="retro-action-btn" onClick={ () => handleAction('furni_use') }>
                            <span>Usar</span>
                        </button>
                    ) }
                    { canMove && (
                        <button type="button" className="retro-action-btn" onClick={ () => handleAction('furni_move') }>
                            <span>Mover</span>
                        </button>
                    ) }
                    { canRotate && (
                        <button type="button" className="retro-action-btn" onClick={ () => handleAction('furni_rotate') }>
                            <FaRedo className="btn-icon" />
                            <span>Girar</span>
                        </button>
                    ) }
                    { pickupMode !== PICKUP_MODE_NONE && (
                        <button type="button" className="retro-action-btn" onClick={ () => handleAction('furni_pickup') }>
                            <FaTrash className="btn-icon" />
                            <span>{ pickupMode === PICKUP_MODE_EJECT ? 'Expulsar' : 'Recoger' }</span>
                        </button>
                    ) }
                </div>
            );
        }

        if(isPet)
        {
            const petInfo = avatarInfo as AvatarInfoPet;
            return (
                <div className="stage-actions">
                    <button type="button" className="retro-action-btn" onClick={ () => handleAction('pet_respect') }>
                        <span>Acariciar</span>
                    </button>
                    <button type="button" className="retro-action-btn" onClick={ () => handleAction('pet_buyfood') }>
                        <span>Alimentar</span>
                    </button>
                    { petInfo.isOwner && (
                        <button type="button" className="retro-action-btn" onClick={ () => handleAction('pet_train') }>
                            <span>Entrenar</span>
                        </button>
                    ) }
                    { petInfo.isOwner && (
                        <button type="button" className="retro-action-btn" onClick={ () => handleAction('pet_pickup') }>
                            <span>Recoger</span>
                        </button>
                    ) }
                </div>
            );
        }

        return null;
    };

    // -------------------------------------------------------------------------
    // Render expanded classic retro card
    // -------------------------------------------------------------------------
    const renderExpandedCard = () =>
    {
        if(!avatarInfo || !isCardExpanded) return null;

        if(isUser || isBot)
        {
            const userInfo = avatarInfo as AvatarInfoUser;
            return (
                <div className="infostand-shockwave-card">
                    <div className="card-header-bar">
                        <div className="header-title">{ userInfo.name }</div>
                        <div className="header-close" onClick={ () => setIsCardExpanded(false) } title="Cerrar detalles" />
                    </div>
                    <div className="card-body-content">
                        {/* Motto box */}
                        <div className="retro-inset-box motto-box">
                            { isOwnUser ? (
                                <div className="d-flex align-items-center w-100">
                                    <FaPencilAlt className="me-1 edit-pencil" onClick={ () => setIsEditingMotto(true) } />
                                    { !isEditingMotto ? (
                                        <span className="motto-text clickable" onClick={ () => setIsEditingMotto(true) }>
                                            { motto || 'Escribe tu misión aquí...' }
                                        </span>
                                    ) : (
                                        <input
                                            type="text"
                                            className="motto-input-shockwave"
                                            maxLength={ GetConfiguration<number>('motto.max.length', 38) }
                                            value={ motto }
                                            onChange={ e => setMotto(e.target.value) }
                                            onBlur={ onMottoBlur }
                                            onKeyDown={ onMottoKeyDown }
                                            autoFocus
                                        />
                                    ) }
                                </div>
                            ) : (
                                <span className="motto-text">{ userInfo.motto || '' }</span>
                            ) }
                        </div>

                        {/* Badges row */}
                        { userInfo.badges && userInfo.badges.length > 0 && (
                            <div className="badges-grid-shockwave mt-1">
                                { userInfo.badges.slice(0, 5).map((badge, idx) => (
                                    <div key={ idx } className="retro-badge-slot">
                                        <LayoutBadgeImageView badgeCode={ badge } showInfo={ true } />
                                    </div>
                                )) }
                            </div>
                        ) }

                        {/* Group info if any */}
                        { userInfo.groupId > 0 && (
                            <div className="retro-group-row mt-1" onClick={ () => GetGroupInformation(userInfo.groupId) }>
                                <div className="retro-badge-slot group-badge">
                                    <LayoutBadgeImageView badgeCode={ userInfo.groupBadgeId } isGroup={ true } showInfo={ true } />
                                </div>
                                <span className="group-title">{ userInfo.groupName }</span>
                            </div>
                        ) }

                        {/* Achievement score */}
                        { userInfo.achievementScore !== undefined && (
                            <div className="achievement-score-row mt-1">
                                <span>Puntos de recompensa: <b>{ userInfo.achievementScore }</b></span>
                            </div>
                        ) }

                        {/* Relationships if available */}
                        { relationships && (
                            <div className="mt-1">
                                <InfoStandWidgetUserRelationshipsView relationships={ relationships } />
                            </div>
                        ) }
                    </div>
                </div>
            );
        }

        if(isFurni)
        {
            const furni = avatarInfo as AvatarInfoFurni;
            return (
                <div className="infostand-shockwave-card">
                    <div className="card-header-bar">
                        <div className="header-title">{ furni.name }</div>
                        <div className="header-close" onClick={ () => setIsCardExpanded(false) } />
                    </div>
                    <div className="card-body-content">
                        <div className="retro-inset-box p-1">
                            <span className="furni-desc-text">{ furni.description }</span>
                        </div>
                        { furni.ownerName && (
                            <div className="mt-1 small">
                                <span>Dueño: <b>{ furni.ownerName }</b></span>
                            </div>
                        ) }
                        { furni.stuffData?.isUnique && (
                            <div className="mt-1">
                                <LayoutLimitedEditionCompactPlateView uniqueNumber={ furni.stuffData.uniqueNumber } uniqueSeries={ furni.stuffData.uniqueSeries } />
                            </div>
                        ) }
                        { furni.stuffData?.rarityLevel > -1 && (
                            <div className="mt-1">
                                <LayoutRarityLevelView level={ furni.stuffData.rarityLevel } />
                            </div>
                        ) }
                    </div>
                </div>
            );
        }

        if(isPet)
        {
            const pet = avatarInfo as AvatarInfoPet;
            return (
                <div className="infostand-shockwave-card">
                    <div className="card-header-bar">
                        <div className="header-title">{ pet.name }</div>
                        <div className="header-close" onClick={ () => setIsCardExpanded(false) } />
                    </div>
                    <div className="card-body-content small">
                        <div>Raza: <b>{ LocalizeText(`pet.breed.${ pet.petType }.${ pet.petBreed }`) }</b></div>
                        <div>Nivel: <b>{ pet.level } / { pet.maximumLevel }</b></div>
                        <div>Felicidad: <b>{ pet.happyness } / { pet.maximumHappyness }</b></div>
                        <div>Energía: <b>{ pet.energy } / { pet.maximumEnergy }</b></div>
                        { pet.ownerName && <div>Dueño: <b>{ pet.ownerName }</b></div> }
                    </div>
                </div>
            );
        }

        return null;
    };

    return (
        <div className="infostand-shockwave-container">
            {/* Expanded retro card above platform */}
            { renderExpandedCard() }

            {/* Platform & Capsule Dock */}
            <div className="infostand-shockwave-stage-zone">
                {/* Isometric Platform (Pedestal) */}
                <div className="stage-pedestal-wrapper">
                    <div className="stage-pedestal-bg" />
                    <div className="stage-entity-preview">
                        { renderEntityPreview() }
                    </div>
                </div>

                {/* Pill Capsule */}
                <div className={ `stage-pill ${ !avatarInfo ? 'empty' : '' }` } onClick={ () => avatarInfo && setIsCardExpanded(!isCardExpanded) }>
                    { avatarInfo ? (
                        <>
                            <span className="pill-name" title={ entityName }>{ entityName }</span>
                            <div className="pill-icons">
                                { isOwnUser && (
                                    <div
                                        className="pill-btn gear-btn"
                                        onClick={ e => { e.stopPropagation(); handleAction('change_looks'); } }
                                        title="Cambiar de ropa / armario"
                                    >
                                        <FaCog size={ 12 } />
                                    </div>
                                ) }
                                <div
                                    className="pill-btn info-btn"
                                    onClick={ e => { e.stopPropagation(); setIsCardExpanded(!isCardExpanded); } }
                                    title={ isCardExpanded ? 'Ocultar detalles' : 'Ver detalles e insignias' }
                                >
                                    { isCardExpanded ? <FaChevronDown size={ 10 } /> : <FaInfoCircle size={ 11 } /> }
                                </div>
                                <div
                                    className="pill-btn close-btn"
                                    onClick={ e => { e.stopPropagation(); onClose(); } }
                                    title="Deseleccionar"
                                >
                                    <FaTimes size={ 10 } />
                                </div>
                            </div>
                        </>
                    ) : null }
                </div>

                {/* Actions below pill */}
                { renderActionButtons() }
            </div>
        </div>
    );
};
