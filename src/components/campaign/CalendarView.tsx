import { FC, useEffect, useState } from 'react';
import { GetRoomEngine, GetSessionDataManager } from '../../api';
import { Base, Button, NitroCardContentView, NitroCardHeaderView, NitroCardView } from '../../common';
import creditIconImg from '../../assets/images/eras/flash2012/purse/credit_icon.png';
import ducketIconImg from '../../assets/images/eras/flash2012/purse/ducket_icon.png';
import iconBonusBagImg from '../../assets/images/eras/flash2012/streak/icon_bonusbag_habbo.png';
import iconDiamondHabboImg from '../../assets/images/eras/flash2012/streak/icon_diamond_habbo.png';
import roomLockedIcon from '../../assets/images/navigator/icons/room_locked.png';

export interface AdventCalendarDay
{
    day: number;
    state: 'unlocked' | 'available' | 'future' | 'expired';
    claimed: boolean;
    rewardType: 'credits' | 'pixels' | 'diamonds' | 'furni' | 'gift' | 'rare';
    rewardLabel: string | null;
    itemName: string | null;
}

interface CalendarViewProps
{
    onClose(): void;
    title: string;
    subtitle: string;
    currentDay: number;
    totalDays: number;
    days: AdventCalendarDay[];
    openingDay: number | null;
    statusMessage: string;
    onOpenDay(day: number): void;
}

const VISIBLE_COUNT = 5;

export const CalendarView: FC<CalendarViewProps> = props =>
{
    const { onClose, title, subtitle, currentDay, totalDays, days, openingDay, statusMessage, onOpenDay } = props;
    const initialDay = currentDay >= 1 ? Math.min(totalDays, currentDay) : 1;
    const [ selectedDay, setSelectedDay ] = useState<number>(initialDay);
    const [ startIndex, setStartIndex ] = useState<number>(Math.max(0, Math.min(totalDays - VISIBLE_COUNT, initialDay - 2)));

    useEffect(() =>
    {
        const target = currentDay >= 1 ? Math.min(totalDays, currentDay) : 1;
        setSelectedDay(target);
        setStartIndex(Math.max(0, Math.min(totalDays - VISIBLE_COUNT, target - 2)));
    }, [ currentDay, totalDays ]);

    const dayList: AdventCalendarDay[] = days.length > 0
        ? days
        : Array.from({ length: totalDays }, (_, idx) => ({
            day: idx + 1,
            state: 'future',
            claimed: false,
            rewardType: 'gift',
            rewardLabel: null,
            itemName: null
        }));

    const selected = dayList.find(d => d.day === selectedDay) || dayList[0];
    const visibleDays = dayList.slice(startIndex, startIndex + VISIBLE_COUNT);

    const getFurniIconUrl = (itemName: string | null): string | null =>
    {
        if(!itemName) return null;
        try
        {
            const session = GetSessionDataManager();
            const engine = GetRoomEngine();
            const floor = session?.getFloorItemDataByName(itemName);
            if(floor) return engine?.getFurnitureFloorIconUrl(floor.id) || null;
            const wall = session?.getWallItemDataByName(itemName);
            if(wall) return engine?.getFurnitureWallIconUrl(wall.id) || null;
        }
        catch
        {
            // Fallback to static hof_furni icon path
        }
        const safeCode = itemName.replace('*', '_');
        return `/game/swf/dcr/hof_furni/icons/${ encodeURIComponent(safeCode) }_icon.png`;
    };

    const renderClaimedRewardIcon = (dayObj: AdventCalendarDay) =>
    {
        if(dayObj.itemName)
        {
            const furniUrl = getFurniIconUrl(dayObj.itemName);
            if(furniUrl) return <img src={ furniUrl } alt={ dayObj.rewardLabel || '' } className="advent-pixel-icon" />;
        }
        switch(dayObj.rewardType)
        {
            case 'diamonds': return <img src={ iconDiamondHabboImg } alt="Diamantes" className="advent-pixel-icon" />;
            case 'pixels': return <img src={ ducketIconImg } alt="Píxeles" width={ 23 } height={ 22 } className="advent-pixel-icon" />;
            case 'credits': return <img src={ creditIconImg } alt="Créditos" width={ 23 } height={ 22 } className="advent-pixel-icon" />;
            default: return <img src={ iconBonusBagImg } alt="Regalo" width={ 27 } height={ 30 } className="advent-pixel-icon" />;
        }
    };

    const renderDayVisual = (dayObj: AdventCalendarDay) =>
    {
        if(dayObj.state === 'unlocked')
        {
            return (
                <div className="advent-sprite-stage">
                    <div className="campaign-spritesheet campaign-opened advent-opened-box" />
                    <div className="advent-unlocked-prize">{ renderClaimedRewardIcon(dayObj) }</div>
                </div>
            );
        }
        if(dayObj.state === 'available')
        {
            return (
                <div className="advent-sprite-stage">
                    <Base className="campaign-spritesheet available advent-gift-sprite" />
                </div>
            );
        }
        if(dayObj.state === 'expired')
        {
            return (
                <div className="advent-sprite-stage">
                    <Base className="campaign-spritesheet unavailable advent-gift-sprite" />
                </div>
            );
        }
        return (
            <div className="advent-sprite-stage">
                <div className="advent-lock-circle">
                    <img src={ roomLockedIcon } alt="Cerrado" className="advent-room-lock-icon" />
                </div>
            </div>
        );
    };

    const getStateText = (dayObj: AdventCalendarDay) =>
    {
        switch(dayObj.state)
        {
            case 'unlocked':
                return dayObj.rewardLabel
                    ? `Ya has abierto este regalo. Premio obtenido: ${ dayObj.rewardLabel }`
                    : 'Ya has abierto este regalo navideño.';
            case 'available':
                return 'Tienes un regalo listo. Haz clic en "Abrir regalo" para descubrir qué hay dentro.';
            case 'expired':
                return 'Llegaste tarde. Este regalo ya expiró y no se puede abrir.';
            default:
                return `Paciencia: todavía no puedes abrir este regalo. Disponible el ${ dayObj.day } de diciembre de 2026.`;
        }
    };

    const getStateBadge = (state: AdventCalendarDay['state']) =>
    {
        switch(state)
        {
            case 'unlocked': return 'Abierto';
            case 'available': return 'Disponible';
            case 'expired': return 'Expirado';
            default: return 'Próximamente';
        }
    };

    const handlePrev = () =>
    {
        const nextStart = Math.max(0, startIndex - 1);
        setStartIndex(nextStart);
        if(selectedDay > nextStart + VISIBLE_COUNT) setSelectedDay(nextStart + VISIBLE_COUNT);
    };

    const handleNext = () =>
    {
        const nextStart = Math.min(Math.max(0, dayList.length - VISIBLE_COUNT), startIndex + 1);
        setStartIndex(nextStart);
        if(selectedDay < nextStart + 1) setSelectedDay(nextStart + 1);
    };

    const handleSelectCard = (dayObj: AdventCalendarDay) =>
    {
        if(selectedDay === dayObj.day && dayObj.state === 'available')
        {
            onOpenDay(dayObj.day);
            return;
        }
        setSelectedDay(dayObj.day);
    };

    const isOpening = openingDay === selected.day;

    return (
        <NitroCardView uniqueKey="campaign-calendar" className="nitro-campaign-calendar no-resize" theme="primary-slim">
            <NitroCardHeaderView headerText={ title } onCloseClick={ onClose } />
            <NitroCardContentView className="advent-calendar-content text-black">
                <div className="advent-header-box">
                    <div className="advent-header-icon">
                        <Base className="campaign-spritesheet available advent-mini-gift" />
                    </div>
                    <div className="advent-header-copy">
                        <div className="advent-header-title">Navidad 2026 en Habbten</div>
                        <div className="advent-header-sub">{ subtitle }</div>
                    </div>
                    <div className="advent-header-counter">
                        <strong>{ dayList.filter(d => d.claimed).length } / { dayList.length }</strong>
                        <span>abiertos</span>
                    </div>
                </div>

                <div className="advent-info-box">
                    <div className="advent-info-text">
                        <div className="advent-info-day">
                            <span>Día { selected.day } de diciembre</span>
                            <span className={ `advent-badge is-${ selected.state }` }>
                                { getStateBadge(selected.state) }
                            </span>
                        </div>
                        <div className="advent-info-desc">{ getStateText(selected) }</div>
                        { statusMessage && <div className="advent-feedback">{ statusMessage }</div> }
                    </div>
                    { selected.state === 'available' && (
                        <div className="advent-info-actions">
                            <Button
                                variant="success"
                                size="sm"
                                disabled={ isOpening }
                                onClick={ () => !isOpening && onOpenDay(selected.day) }
                            >
                                { isOpening ? 'Abriendo...' : 'Abrir regalo' }
                            </Button>
                        </div>
                    ) }
                </div>

                <div className="advent-carousel-row">
                    <button
                        type="button"
                        className="advent-arrow-btn"
                        disabled={ startIndex <= 0 }
                        onClick={ handlePrev }
                        title="Días anteriores"
                        aria-label="Anterior"
                    >
                        <Base className="campaign-spritesheet prev" />
                    </button>

                    <div className="advent-days-grid">
                        { visibleDays.map(dayObj =>
                        {
                            const isActive = dayObj.day === selectedDay;
                            return (
                                <button
                                    key={ dayObj.day }
                                    type="button"
                                    className={ `advent-day-card is-${ dayObj.state } ${ isActive ? 'is-selected' : '' }` }
                                    onClick={ () => handleSelectCard(dayObj) }
                                >
                                    <span className="advent-day-num">Día { dayObj.day }</span>
                                    { renderDayVisual(dayObj) }
                                    <span className="advent-day-status">
                                        { dayObj.claimed ? 'Abierto' : (dayObj.state === 'available' ? 'Abrir' : (dayObj.state === 'expired' ? 'Expirado' : 'Cerrado')) }
                                    </span>
                                </button>
                            );
                        }) }
                    </div>

                    <button
                        type="button"
                        className="advent-arrow-btn"
                        disabled={ startIndex + VISIBLE_COUNT >= dayList.length }
                        onClick={ handleNext }
                        title="Días siguientes"
                        aria-label="Siguiente"
                    >
                        <Base className="campaign-spritesheet next" />
                    </button>
                </div>

                <div className="advent-footer-bar">
                    <span className="advent-footer-range">
                        Mostrando días { startIndex + 1 } a { Math.min(dayList.length, startIndex + VISIBLE_COUNT) } de { dayList.length }
                    </span>
                    <div className="advent-footer-nav">
                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={ startIndex <= 0 }
                            onClick={ () => startIndex > 0 && setStartIndex(Math.max(0, startIndex - VISIBLE_COUNT)) }
                        >
                            Anterior
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={ startIndex + VISIBLE_COUNT >= dayList.length }
                            onClick={ () => (startIndex + VISIBLE_COUNT < dayList.length) && setStartIndex(Math.min(Math.max(0, dayList.length - VISIBLE_COUNT), startIndex + VISIBLE_COUNT)) }
                        >
                            Siguiente
                        </Button>
                    </div>
                </div>
            </NitroCardContentView>
        </NitroCardView>
    );
};
