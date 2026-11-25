import { ILinkEventTracker } from '@nitrots/nitro-renderer';
import { FC, useCallback, useEffect, useState } from 'react';
import { AddEventLinkTracker, GetRoomEngine, GetSessionDataManager, RemoveLinkEventTracker } from '../../api';
import { Button, NitroCardContentView, NitroCardHeaderView, NitroCardView } from '../../common';
import { useEraTheme } from '../../hooks';
import creditIconImg from '../../assets/images/eras/flash2012/purse/credit_icon.png';
import ducketIconImg from '../../assets/images/eras/flash2012/purse/ducket_icon.png';
import iconBonusBagImg from '../../assets/images/eras/flash2012/streak/icon_bonusbag_habbo.png';
import iconDiamondHabboImg from '../../assets/images/eras/flash2012/streak/icon_diamond_habbo.png';
import iconFlameSmallImg from '../../assets/images/eras/flash2012/streak/icon_flame_small.png';
import iconStarStreakImg from '../../assets/images/eras/flash2012/streak/icon_star_streak.png';
import trophyBaseImg from '../../assets/images/eras/flash2012/streak/streak_trophy_base.png';

interface StreakMilestone
{
    days: number;
    title: string;
    rewardType: 'diamonds' | 'pixels' | 'credits' | 'gift' | 'rare' | 'badge';
    rewardAmount: number;
    rewardLabel: string;
    itemId?: number;
    itemCode?: string;
    itemName?: string;
    claimed: boolean;
    doubled?: boolean;
    reached: boolean;
    canClaim: boolean;
    canDouble?: boolean;
}

interface RewardedSession
{
    token: string;
    days: number;
    minSeconds: number;
    campaign: {
        id: number;
        format: 'image' | 'html';
        title: string;
        subtitle: string;
        imageUrl: string;
        clickUrl: string | null;
        frameUrl: string | null;
    };
}

interface StreakData
{
    isSelf: boolean;
    userId: number;
    username: string;
    currentStreak: number;
    maxStreak: number;
    completedToday: boolean;
    secondsUntilReset: number;
    milestones: StreakMilestone[];
}

const ITEMS_PER_PAGE = 5;

export const LoginStreakView: FC<{}> = () =>
{
    const { currentEra } = useEraTheme();
    const [ isVisible, setIsVisible ] = useState(false);
    const [ targetUserId, setTargetUserId ] = useState<number>(0);
    const [ data, setData ] = useState<StreakData | null>(null);
    const [ page, setPage ] = useState<number>(1);
    const [ secondsLeft, setSecondsLeft ] = useState<number>(0);
    const [ claimingDay, setClaimingDay ] = useState<number | null>(null);
    const [ statusMsg, setStatusMsg ] = useState<string>('');
    const [ rewardedSession, setRewardedSession ] = useState<RewardedSession | null>(null);
    const [ rewardedCountdown, setRewardedCountdown ] = useState<number>(0);
    const [ completingDouble, setCompletingDouble ] = useState<boolean>(false);

    const loadStreak = useCallback(async (uid?: number) =>
    {
        const resolvedId = uid && uid > 0 ? uid : (GetSessionDataManager()?.userId || 0);
        const eraQuery = `?era=${ encodeURIComponent(currentEra || 'modern') }`;
        const endpoint = (resolvedId > 0 ? `/api/client/streak/${ resolvedId }` : '/api/client/streak/me') + eraQuery;
        try
        {
            const res = await fetch(endpoint, { credentials: 'include' });
            const json = await res.json();
            if(json && json.success)
            {
                setData(json as StreakData);
                setSecondsLeft(Number(json.secondsUntilReset || 0));
            }
        }
        catch
        {
            // Ignore network error
        }
    }, [ currentEra ]);

    useEffect(() =>
    {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) =>
            {
                const parts = url.split('/');
                if(parts.length < 2) return;

                switch(parts[1])
                {
                    case 'show':
                    case 'open': {
                        const uid = parts[2] ? parseInt(parts[2], 10) : 0;
                        setTargetUserId(Number.isFinite(uid) ? uid : 0);
                        setPage(1);
                        setStatusMsg('');
                        setIsVisible(true);
                        loadStreak(Number.isFinite(uid) ? uid : 0);
                        return;
                    }
                    case 'hide':
                        setIsVisible(false);
                        return;
                    case 'toggle': {
                        const uid = parts[2] ? parseInt(parts[2], 10) : 0;
                        setIsVisible(prev =>
                        {
                            const next = !prev;
                            if(next)
                            {
                                setTargetUserId(Number.isFinite(uid) ? uid : 0);
                                setPage(1);
                                setStatusMsg('');
                                loadStreak(Number.isFinite(uid) ? uid : 0);
                            }
                            return next;
                        });
                        return;
                    }
                }
            },
            eventUrlPrefix: 'streak/'
        };

        AddEventLinkTracker(linkTracker);
        return () => RemoveLinkEventTracker(linkTracker);
    }, [ loadStreak ]);

    useEffect(() =>
    {
        if(!isVisible) return;
        const timer = setInterval(() =>
        {
            setSecondsLeft(prev => (prev > 0 ? prev - 1 : 86400));
        }, 1000);
        return () => clearInterval(timer);
    }, [ isVisible ]);

    const handleClaim = async (milestone: StreakMilestone) =>
    {
        if(!milestone.canClaim || claimingDay !== null) return;
        setClaimingDay(milestone.days);
        setStatusMsg('');
        try
        {
            const res = await fetch('/api/client/streak/claim', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ days: milestone.days })
            });
            const json = await res.json();
            if(json && json.success)
            {
                setStatusMsg(`Has reclamado ${ json.rewardLabel }.`);
                await loadStreak(targetUserId);
            }
            else if(json?.error)
            {
                setStatusMsg(json.error);
            }
        }
        catch
        {
            setStatusMsg('No se pudo reclamar la recompensa.');
        }
        finally
        {
            setClaimingDay(null);
        }
    };

    useEffect(() =>
    {
        if(!rewardedSession || rewardedCountdown <= 0) return;
        const t = setInterval(() =>
        {
            setRewardedCountdown(prev => (prev > 1 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(t);
    }, [ rewardedSession, rewardedCountdown ]);

    const handleStartDouble = async (milestone: StreakMilestone) =>
    {
        if(!milestone.canDouble || claimingDay !== null || rewardedSession) return;
        setClaimingDay(milestone.days);
        setStatusMsg('');
        try
        {
            const res = await fetch('/api/client/streak/double/start', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ days: milestone.days, era: currentEra || 'modern' })
            });
            const json = await res.json();
            if(json && json.success && json.token)
            {
                setRewardedSession(json as RewardedSession);
                setRewardedCountdown(Number(json.minSeconds || 10));
            }
            else if(json?.error)
            {
                setStatusMsg(json.error);
            }
        }
        catch
        {
            setStatusMsg('No se pudo cargar el anuncio recompensado.');
        }
        finally
        {
            setClaimingDay(null);
        }
    };

    const handleCompleteDouble = async () =>
    {
        if(!rewardedSession || rewardedCountdown > 0 || completingDouble) return;
        setCompletingDouble(true);
        try
        {
            const res = await fetch('/api/client/streak/double/complete', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: rewardedSession.token })
            });
            const json = await res.json();
            if(json && json.success)
            {
                setStatusMsg(`Bono x2 recibido: ${ json.bonusLabel }.`);
                setRewardedSession(null);
                await loadStreak(targetUserId);
            }
            else if(json?.error)
            {
                setStatusMsg(json.error);
            }
        }
        catch
        {
            setStatusMsg('No se pudo acreditar el bono x2.');
        }
        finally
        {
            setCompletingDouble(false);
        }
    };

    if(!isVisible) return null;

    const hrs = String(Math.floor(secondsLeft / 3600)).padStart(2, '0');
    const mins = String(Math.floor((secondsLeft % 3600) / 60)).padStart(2, '0');
    const secs = String(secondsLeft % 60).padStart(2, '0');

    const milestones = data?.milestones || [];
    const totalPages = Math.max(1, Math.ceil(milestones.length / ITEMS_PER_PAGE));
    const currentPage = Math.min(page, totalPages);
    const pageItems = milestones.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const highlightedDays = (milestones.find(m => m.canClaim) || milestones.find(m => !m.claimed))?.days ?? -1;

    const getFurniIconUrl = (itemCode?: string): string | null =>
    {
        if(!itemCode) return null;
        try
        {
            const session = GetSessionDataManager();
            const engine = GetRoomEngine();
            const floor = session?.getFloorItemDataByName(itemCode);
            if(floor) return engine?.getFurnitureFloorIconUrl(floor.id) || null;
            const wall = session?.getWallItemDataByName(itemCode);
            if(wall) return engine?.getFurnitureWallIconUrl(wall.id) || null;
        }
        catch
        {
            // Fallback to static hof_furni icon path
        }
        const safeCode = itemCode.replace('*', '_');
        return `/game/swf/dcr/hof_furni/icons/${ encodeURIComponent(safeCode) }_icon.png`;
    };

    const renderRewardIcon = (m: StreakMilestone) =>
    {
        if(m.rewardType === 'rare' && m.itemCode)
        {
            const furniUrl = getFurniIconUrl(m.itemCode);
            if(furniUrl)
            {
                return <img src={ furniUrl } alt={ m.itemName || m.rewardLabel } className="streak-pixel-img streak-reward-icon" />;
            }
        }
        if(m.rewardType === 'diamonds')
        {
            return <img src={ iconDiamondHabboImg } alt="Diamantes" className="streak-pixel-img streak-reward-icon" />;
        }
        if(m.rewardType === 'pixels')
        {
            return <img src={ ducketIconImg } alt="Píxeles" width={ 23 } height={ 22 } className="streak-pixel-img" />;
        }
        if(m.rewardType === 'gift')
        {
            return <img src={ iconBonusBagImg } alt="Cofre especial" width={ 27 } height={ 30 } className="streak-pixel-img" />;
        }
        return <img src={ creditIconImg } alt="Créditos" width={ 23 } height={ 22 } className="streak-pixel-img" />;
    };

    const currentStreak = data?.currentStreak ?? 0;
    const maxStreak = data?.maxStreak ?? 0;
    const completedToday = data?.completedToday ?? false;

    return (
        <NitroCardView uniqueKey="login-streak" theme="primary-slim" className="login-streak-window no-resize">
            <NitroCardHeaderView headerText="Racha de conectado" onCloseClick={ () => setIsVisible(false) } />
            <NitroCardContentView overflow="hidden" className="login-streak-body">
                <div className="login-streak-summary">
                    <div className="login-streak-summary-left">
                        <div className="login-streak-stat-main">
                            <img src={ iconStarStreakImg } alt="" width={ 11 } height={ 13 } className="streak-pixel-img" />
                            <span>
                                Tu racha actual:{ ' ' }
                                <u className="streak-days-val">{ currentStreak } { currentStreak === 1 ? 'día' : 'días' }</u>
                            </span>
                        </div>
                        <div className="login-streak-stat-sub">
                            <span className="streak-flame-slot">
                                <img src={ iconFlameSmallImg } alt="" width={ 7 } height={ 9 } className="streak-pixel-img" />
                            </span>
                            <span>Racha más larga: { maxStreak } { maxStreak === 1 ? 'día' : 'días' }</span>
                        </div>
                        <div className={ `login-streak-today ${ completedToday ? 'is-done' : 'is-pending' }` }>
                            { completedToday ? '¡Racha de hoy completada!' : 'Racha de hoy pendiente' }
                        </div>
                    </div>

                    <div className="login-streak-timer" title="Tiempo restante para el reinicio diario">
                        <div className="streak-timer-group">
                            <div className="streak-timer-box">{ hrs }</div>
                            <span className="streak-timer-lbl">hrs.</span>
                        </div>
                        <span className="streak-timer-colon">:</span>
                        <div className="streak-timer-group">
                            <div className="streak-timer-box">{ mins }</div>
                            <span className="streak-timer-lbl">mins.</span>
                        </div>
                        <span className="streak-timer-colon">:</span>
                        <div className="streak-timer-group">
                            <div className="streak-timer-box">{ secs }</div>
                            <span className="streak-timer-lbl">segs.</span>
                        </div>
                    </div>
                </div>

                <div className="login-streak-section-row">
                    <span className="login-streak-section-title">Metas a conseguir:</span>
                    { statusMsg && <span className="login-streak-feedback">{ statusMsg }</span> }
                </div>

                <div className="login-streak-list">
                    { pageItems.map(m =>
                    {
                        const isHighlighted = m.days === highlightedDays;
                        const isClaiming = claimingDay === m.days;

                        return (
                            <div key={ m.days } className={ `login-streak-card ${ isHighlighted ? 'is-highlight' : '' }` }>
                                <div className="streak-trophy-wrap">
                                    <img src={ trophyBaseImg } alt="" width={ 28 } height={ 34 } className="streak-pixel-img" />
                                    <span className={ `streak-trophy-num ${ m.days >= 10 ? 'is-two-digit' : '' }` }>{ m.days }</span>
                                </div>

                                <div className="streak-card-info">
                                    <div className="streak-card-title">{ m.title }</div>
                                    <div className="streak-card-reward">
                                        Recompensa: <u>{ m.rewardLabel }</u>
                                    </div>
                                </div>

                                <div className="streak-reward-box" title={ m.rewardLabel }>
                                    { renderRewardIcon(m) }
                                </div>

                                <div className="streak-action-wrap">
                                    { m.claimed ? (
                                        m.canDouble ? (
                                            <Button
                                                variant="success"
                                                size="sm"
                                                disabled={ isClaiming || !!rewardedSession }
                                                onClick={ () => handleStartDouble(m) }
                                            >
                                                { isClaiming ? '...' : 'Duplicar x2' }
                                            </Button>
                                        ) : (
                                            <button type="button" className="streak-btn is-claimed" disabled>
                                                { m.doubled ? 'Reclamado x2' : 'Reclamado' }
                                            </button>
                                        )
                                    ) : m.canClaim ? (
                                        <button
                                            type="button"
                                            className="streak-btn is-claimable"
                                            disabled={ isClaiming }
                                            onClick={ () => handleClaim(m) }
                                        >
                                            { isClaiming ? '...' : '¡Reclamar!' }
                                        </button>
                                    ) : (
                                        <button type="button" className="streak-btn is-locked" disabled>
                                            Incompleto
                                        </button>
                                    ) }
                                </div>
                            </div>
                        );
                    }) }
                </div>

                <div className="login-streak-pagination">
                    <Button
                        variant="secondary"
                        size="sm"
                        disabled={ currentPage <= 1 }
                        onClick={ () => currentPage > 1 && setPage(prev => Math.max(1, prev - 1)) }
                    >
                        Anterior
                    </Button>
                    <div className="streak-page-numbers">
                        { Array.from({ length: totalPages }, (_, idx) => idx + 1).map(p => (
                            <button
                                key={ p }
                                type="button"
                                className={ `streak-page-btn ${ p === currentPage ? 'is-active' : '' }` }
                                onClick={ () => setPage(p) }
                            >
                                { p }
                            </button>
                        )) }
                    </div>
                    <Button
                        variant="secondary"
                        size="sm"
                        disabled={ currentPage >= totalPages }
                        onClick={ () => currentPage < totalPages && setPage(prev => Math.min(totalPages, prev + 1)) }
                    >
                        Siguiente
                    </Button>
                </div>
                { rewardedSession && (
                    <div className="streak-rewarded-overlay">
                        <div className="streak-rewarded-modal">
                            <div className="streak-rewarded-head">
                                <span>Anuncio Recompensado x2</span>
                                <span className="streak-rewarded-timer">
                                    { rewardedCountdown > 0 ? `Espera ${ rewardedCountdown }s` : 'Listo para canjear' }
                                </span>
                            </div>
                            <div className="streak-rewarded-stage">
                                { rewardedSession.campaign.format === 'html' && rewardedSession.campaign.frameUrl ? (
                                    <iframe
                                        src={ rewardedSession.campaign.frameUrl }
                                        title="Anuncio Recompensado"
                                        className="streak-rewarded-frame"
                                        scrolling="no"
                                    />
                                ) : rewardedSession.campaign.imageUrl ? (
                                    <a
                                        href={ rewardedSession.campaign.clickUrl || '#' }
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={ e => { if(!rewardedSession.campaign.clickUrl) e.preventDefault(); } }
                                    >
                                        <img src={ rewardedSession.campaign.imageUrl } alt={ rewardedSession.campaign.title } />
                                    </a>
                                ) : null }
                            </div>
                            <div className="streak-rewarded-actions">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={ () => setRewardedSession(null) }
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    variant="success"
                                    size="sm"
                                    disabled={ rewardedCountdown > 0 || completingDouble }
                                    onClick={ handleCompleteDouble }
                                >
                                    { completingDouble ? 'Acreditando...' : (rewardedCountdown > 0 ? `Reclamar x2 (${ rewardedCountdown }s)` : 'Reclamar x2') }
                                </Button>
                            </div>
                        </div>
                    </div>
                ) }
            </NitroCardContentView>
        </NitroCardView>
    );
};
