import { FC, useEffect, useState } from 'react';
import { GetRoomEngine, GetSessionDataManager } from '../../api';
import { NitroCardContentView, NitroCardHeaderView, NitroCardView } from '../../common';
import hdCreditsImg from '../../assets/images/eras/flash2012/streak/hd_credits.png';
import hdDiamondsImg from '../../assets/images/eras/flash2012/streak/hd_diamonds.png';
import hdGiftBoxImg from '../../assets/images/eras/flash2012/streak/hd_gift_box.png';
import hdPixelsImg from '../../assets/images/eras/flash2012/streak/hd_pixels.png';
import hdRareCrownImg from '../../assets/images/eras/flash2012/streak/hd_rare_crown.png';

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
    isStaff: boolean;
    days: AdventCalendarDay[];
    openingDay: number | null;
    statusMessage: string;
    onOpenDay(day: number, asStaff?: boolean): void;
}

const VISIBLE_COUNT = 5;

export const CalendarView: FC<CalendarViewProps> = props =>
{
    const { onClose, title, subtitle, currentDay, totalDays, isStaff, days, openingDay, statusMessage, onOpenDay } = props;
    const [ selectedDay, setSelectedDay ] = useState<number>(Math.max(1, currentDay));
    const [ startIndex, setStartIndex ] = useState<number>(Math.max(0, Math.min(totalDays - VISIBLE_COUNT, currentDay - 2)));

    useEffect(() =>
    {
        if(currentDay >= 1 && currentDay <= totalDays)
        {
            setSelectedDay(currentDay);
            setStartIndex(Math.max(0, Math.min(totalDays - VISIBLE_COUNT, currentDay - 2)));
        }
    }, [ currentDay, totalDays ]);

    const dayList: AdventCalendarDay[] = days.length > 0
        ? days
        : Array.from({ length: totalDays }, (_, idx) => ({
            day: idx + 1,
            state: idx + 1 === 1 ? 'available' : 'future',
            claimed: false,
            rewardType: 'gift',
            rewardLabel: null,
            itemName: null
        }));

    const selected = dayList.find(d => d.day === selectedDay) || dayList[0];
    const visibleDays = dayList.slice(startIndex, startIndex + VISIBLE_COUNT);
    const isModerator = isStaff || !!GetSessionDataManager()?.isModerator;

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
            // Ignore icon lookup errors
        }
        return null;
    };

    const getRewardIcon = (dayObj: AdventCalendarDay) =>
    {
        if(!dayObj.claimed)
        {
            return <img src={ hdGiftBoxImg } alt="Regalo de Adviento" className="advent-hd-icon" />;
        }
        if(dayObj.itemName)
        {
            const furniUrl = getFurniIconUrl(dayObj.itemName);
            if(furniUrl) return <img src={ furniUrl } alt={ dayObj.rewardLabel || '' } className="advent-furni-icon" />;
        }
        switch(dayObj.rewardType)
        {
            case 'diamonds': return <img src={ hdDiamondsImg } alt="Diamantes" className="advent-hd-icon" />;
            case 'pixels': return <img src={ hdPixelsImg } alt="Píxeles" className="advent-hd-icon" />;
            case 'credits': return <img src={ hdCreditsImg } alt="Créditos" className="advent-hd-icon" />;
            case 'rare': return <img src={ hdRareCrownImg } alt="Raro" className="advent-hd-icon" />;
            default: return <img src={ hdGiftBoxImg } alt="Regalo" className="advent-hd-icon" />;
        }
    };

    const getStateText = (dayObj: AdventCalendarDay) =>
    {
        switch(dayObj.state)
        {
            case 'unlocked':
                return dayObj.rewardLabel
                    ? `¡Ya has abierto este regalo! Premio obtenido: ${ dayObj.rewardLabel }`
                    : '¡Ya has abierto este regalo navideño!';
            case 'available':
                return '¡Tienes un regalo navideño listo! Haz clic en «Abrir regalo» para descubrir qué hay dentro.';
            case 'expired':
                return '¡Llegaste tarde! Este regalo ya expiró y no se puede abrir.';
            default:
                return `¡Paciencia! Podrás abrir esta casilla el ${ dayObj.day } de diciembre de 2026.`;
        }
    };

    const getStateBadge = (state: AdventCalendarDay['state']) =>
    {
        switch(state)
        {
            case 'unlocked': return 'Abierto';
            case 'available': return 'Disponible';
            case 'expired': return 'Expirado';
            default: return 'Bloqueado';
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
            onOpenDay(dayObj.day, false);
            return;
        }
        setSelectedDay(dayObj.day);
    };

    const isOpening = openingDay === selected.day;

    return (
        <NitroCardView uniqueKey="campaign-calendar" className="nitro-campaign-calendar no-resize" theme="primary-slim">
            <NitroCardHeaderView headerText={ title } onCloseClick={ onClose } />
            <NitroCardContentView className="advent-calendar-content">
                <div className="advent-banner">
                    <div className="advent-banner-icon">
                        <img src={ hdGiftBoxImg } alt="Navidad 2026" className="advent-hd-icon" />
                    </div>
                    <div className="advent-banner-copy">
                        <div className="advent-banner-title">Navidad 2026 en Habbten</div>
                        <div className="advent-banner-sub">{ subtitle }</div>
                    </div>
                    <div className="advent-banner-progress">
                        <span>{ dayList.filter(d => d.claimed).length } / { dayList.length }</span>
                        <small>abiertos</small>
                    </div>
                </div>

                <div className="advent-detail-card">
                    <div className="advent-detail-left">
                        <div className="advent-detail-day">
                            Día { selected.day } de diciembre
                            <span className={ `advent-state-pill is-${ selected.state }` }>
                                { getStateBadge(selected.state) }
                            </span>
                        </div>
                        <div className="advent-detail-desc">{ getStateText(selected) }</div>
                        { statusMessage && <div className="advent-feedback">{ statusMessage }</div> }
                    </div>
                    <div className="advent-detail-actions">
                        { selected.state === 'available' && (
                            <button
                                type="button"
                                className="advent-btn advent-btn-primary"
                                disabled={ isOpening }
                                onClick={ () => onOpenDay(selected.day, false) }
                            >
                                { isOpening ? 'Abriendo...' : 'Abrir regalo' }
                            </button>
                        ) }
                        { isModerator && selected.state !== 'unlocked' && selected.state !== 'available' && (
                            <button
                                type="button"
                                className="advent-btn advent-btn-staff"
                                disabled={ isOpening }
                                onClick={ () => onOpenDay(selected.day, true) }
                            >
                                { isOpening ? '...' : 'Abrir (Staff)' }
                            </button>
                        ) }
                    </div>
                </div>

                <div className="advent-carousel-row">
                    <button
                        type="button"
                        className="advent-nav-btn"
                        disabled={ startIndex <= 0 }
                        onClick={ handlePrev }
                        title="Días anteriores"
                        aria-label="Anterior"
                    >
                        &#9664;
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
                                    <span className="advent-day-art">
                                        { getRewardIcon(dayObj) }
                                    </span>
                                    <span className="advent-day-status">
                                        { dayObj.claimed ? '✓ Abierto' : (dayObj.state === 'available' ? '¡Abrir!' : (dayObj.state === 'expired' ? 'Expirado' : '🔒')) }
                                    </span>
                                </button>
                            );
                        }) }
                    </div>

                    <button
                        type="button"
                        className="advent-nav-btn"
                        disabled={ startIndex + VISIBLE_COUNT >= dayList.length }
                        onClick={ handleNext }
                        title="Días siguientes"
                        aria-label="Siguiente"
                    >
                        &#9654;
                    </button>
                </div>

                <div className="advent-footer-bar">
                    <span className="advent-footer-range">
                        Mostrando días { startIndex + 1 }–{ Math.min(dayList.length, startIndex + VISIBLE_COUNT) } de { dayList.length }
                    </span>
                    <div className="advent-footer-nav">
                        <button
                            type="button"
                            className="advent-btn advent-btn-secondary"
                            disabled={ startIndex <= 0 }
                            onClick={ () => setStartIndex(Math.max(0, startIndex - VISIBLE_COUNT)) }
                        >
                            Anterior
                        </button>
                        <button
                            type="button"
                            className="advent-btn advent-btn-secondary"
                            disabled={ startIndex + VISIBLE_COUNT >= dayList.length }
                            onClick={ () => setStartIndex(Math.min(Math.max(0, dayList.length - VISIBLE_COUNT), startIndex + VISIBLE_COUNT)) }
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            </NitroCardContentView>
        </NitroCardView>
    );
};
