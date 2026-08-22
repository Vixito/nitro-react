import { AvatarAction, ILinkEventTracker } from '@nitrots/nitro-renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';
import { AddEventLinkTracker, GetSessionDataManager, RemoveLinkEventTracker } from '../../api';
import { Button, LayoutAvatarImageView, LayoutBadgeImageView, LayoutCurrencyIcon, NitroCardContentView, NitroCardHeaderView, NitroCardView } from '../../common';
import { useSessionInfo } from '../../hooks';

interface Mission {
    id: number;
    category: number;
    type: string;
    name: string;
    description: string;
    image: string;
    reward_xp: number;
    task: number;
    progress: number;
    completed: boolean;
}

interface Reward {
    id: number;
    name: string;
    image: string;
    type: string;
    level_required: number;
    badge: string;
    point_type?: number;
    amount?: number;
    item_id?: number;
    name_vip: string;
    image_vip: string;
    type_vip: string;
    badge_vip: string;
    point_type_vip?: number;
    amount_vip?: number;
    item_id_vip?: number;
}

interface ClaimedReward {
    reward_id: number;
    is_vip: number;
    claimed_at: number;
}

interface RankingUser {
    id: number;
    username: string;
    look: string;
    level: number;
    xp: number;
}

interface CountdownTime {
    days: string;
    hours: string;
    minutes: string;
    seconds: string;
}

export const BattlePassView: FC<{}> = () =>
{
    const [ isVisible, setIsVisible ] = useState(false);
    const [ selectedCategory, setSelectedCategory ] = useState<number | null>(null);
    const [ showRankingModal, setShowRankingModal ] = useState(false);
    const [ loading, setLoading ] = useState(false);
    const [ claiming, setClaiming ] = useState<string | null>(null);
    const [ statusMessage, setStatusMessage ] = useState<{ text: string; type: 'success' | 'danger' } | null>(null);
    const [ previewReward, setPreviewReward ] = useState<{ reward: Reward; isVip: boolean } | null>(null);
    const [ searchQuery, setSearchQuery ] = useState<string>('');

    const { userInfo = null, userFigure = null } = useSessionInfo();

    // Separate countdowns
    const [ seasonTimeRemaining, setSeasonTimeRemaining ] = useState<CountdownTime>({ days: '00', hours: '00', minutes: '00', seconds: '00' });
    const [ dailyTimeRemaining, setDailyTimeRemaining ] = useState<CountdownTime>({ days: '00', hours: '00', minutes: '00', seconds: '00' });
    const [ weeklyTimeRemaining, setWeeklyTimeRemaining ] = useState<CountdownTime>({ days: '00', hours: '00', minutes: '00', seconds: '00' });
    
    const [ bpData, setBpData ] = useState<{
        chapter: number;
        season: number;
        seasonEnd: number;
        user: { level: number; xp: number; xpNext: number; rankPosition?: number };
        isVip: boolean;
        claimedRewards: ClaimedReward[];
        missions: Mission[];
        rewards: Reward[];
        ranking: RankingUser[];
    }>({
        chapter: 1,
        season: 1,
        seasonEnd: 0,
        user: { level: 1, xp: 0, xpNext: 100, rankPosition: 1 },
        isVip: false,
        claimedRewards: [],
        missions: [],
        rewards: [],
        ranking: []
    });

    const msToCountdown = (diffMs: number): CountdownTime =>
    {
        const total = Math.max(0, diffMs);
        const days = Math.floor(total / (1000 * 60 * 60 * 24));
        const hours = Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((total % (1000 * 60)) / 1000);

        return {
            days: String(days).padStart(2, '0'),
            hours: String(hours).padStart(2, '0'),
            minutes: String(minutes).padStart(2, '0'),
            seconds: String(seconds).padStart(2, '0')
        };
    };

    const updateAllCountdowns = () =>
    {
        const now = new Date();

        // --- Monthly / Season countdown ---
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
        let seasonTargetMs = nextMonth.getTime();

        if(bpData.seasonEnd && bpData.seasonEnd * 1000 > now.getTime())
        {
            seasonTargetMs = bpData.seasonEnd * 1000;
        }

        setSeasonTimeRemaining(msToCountdown(seasonTargetMs - now.getTime()));

        // --- Daily countdown ---
        const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
        setDailyTimeRemaining(msToCountdown(nextMidnight.getTime() - now.getTime()));

        // --- Weekly countdown ---
        const dayOfWeek = now.getDay(); // 0=Sunday, 1=Monday...
        const daysUntilMonday = dayOfWeek === 0 ? 1 : (dayOfWeek === 1 ? 7 : (8 - dayOfWeek));
        const nextMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilMonday, 0, 0, 0);
        setWeeklyTimeRemaining(msToCountdown(nextMonday.getTime() - now.getTime()));
    };

    const fetchData = async (silent: boolean = false) =>
    {
        try
        {
            if(!silent) setLoading(true);
            const userId = GetSessionDataManager().userId;
            const res = await fetch(`/api/battlepass/data?user_id=${ userId }`);
            const data = await res.json();
            if(data.success)
            {
                setBpData({
                    chapter: data.chapter || 1,
                    season: data.season || 1,
                    seasonEnd: data.seasonEnd || 0,
                    user: data.user || { level: 1, xp: 0, xpNext: 100, rankPosition: 1 },
                    isVip: !!data.isVip,
                    claimedRewards: data.claimedRewards || [],
                    missions: data.missions || [],
                    rewards: data.rewards || [],
                    ranking: data.ranking || []
                });
            }
        }
        catch(err)
        {
            console.error('Error fetching battle pass:', err);
        }
        finally
        {
            if(!silent) setLoading(false);
        }
    };

    const handleClaimReward = async (rewardId: number, isVip: boolean) =>
    {
        const claimKey = `${ rewardId }_${ isVip ? 1 : 0 }`;
        try
        {
            setClaiming(claimKey);
            setStatusMessage(null);
            const userId = GetSessionDataManager().userId;
            const res = await fetch('/api/battlepass/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, reward_id: rewardId, is_vip: isVip })
            });
            const data = await res.json();
            if(data.success)
            {
                setStatusMessage({ text: data.message || '¡Recompensa reclamada con éxito!', type: 'success' });
                setBpData(prev => ({
                    ...prev,
                    claimedRewards: [ ...prev.claimedRewards, { reward_id: rewardId, is_vip: isVip ? 1 : 0, claimed_at: Math.floor(Date.now() / 1000) } ]
                }));
                if(previewReward && previewReward.reward.id === rewardId && previewReward.isVip === isVip)
                {
                    setPreviewReward(null);
                }
            }
            else
            {
                setStatusMessage({ text: data.error || 'No se pudo reclamar la recompensa.', type: 'danger' });
            }
        }
        catch(err)
        {
            console.error('Error claiming reward:', err);
            setStatusMessage({ text: 'Error de conexión al reclamar recompensa.', type: 'danger' });
        }
        finally
        {
            setClaiming(null);
        }
    };

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
                    case 'open':
                        setIsVisible(true);
                        fetchData();
                        return;
                    case 'hide':
                    case 'close':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setIsVisible(prev => {
                            const next = !prev;
                            if(next) fetchData();
                            return next;
                        });
                        return;
                }
            },
            eventUrlPrefix: 'battlepass/'
        };

        AddEventLinkTracker(linkTracker);
        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    useEffect(() =>
    {
        if(!isVisible) return;
        updateAllCountdowns();
        let tick = 0;
        const timer = setInterval(() =>
        {
            updateAllCountdowns();
            tick++;
            if(tick % 3 === 0)
            {
                fetchData(true);
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [ isVisible, bpData.seasonEnd ]);

    // Auto-dismiss status alert after 4 seconds
    useEffect(() =>
    {
        if(!statusMessage) return;
        const timer = setTimeout(() => setStatusMessage(null), 4000);
        return () => clearTimeout(timer);
    }, [ statusMessage ]);

    // Claimed set lookup
    const claimedSet = useMemo(() =>
    {
        const set = new Set<string>();
        for(const c of bpData.claimedRewards)
        {
            set.add(`${ c.reward_id }_${ c.is_vip }`);
        }
        return set;
    }, [ bpData.claimedRewards ]);

    // Calculate how far the green line should extend (for reached levels)
    const reachedLineHeight = useMemo(() =>
    {
        if(!bpData.rewards || bpData.rewards.length === 0) return 0;
        let reachedCount = 0;
        for(const r of bpData.rewards)
        {
            if(bpData.user.level >= r.level_required) reachedCount++;
            else break;
        }
        if(reachedCount === 0) return 0;
        return reachedCount * 76;
    }, [ bpData.rewards, bpData.user.level ]);

    const completedMissions = bpData.missions.filter(m => m.completed);
    const pendingMissions = bpData.missions.filter(m => !m.completed);

    const categoryTitles: { [key: number]: string } = {
        1: 'PRIMEROS RETOS',
        2: 'RETOS DIARIOS',
        3: 'RETOS SEMANALES',
        4: 'RETOS ESPECIALES',
        5: 'RETOS COMUNIDAD',
        6: 'RETOS LEGENDARIOS'
    };

    const categoryBadgeCodes: { [key: number]: string } = {
        1: 'ACH_SafetyQuizPassed1',
        2: 'ACH_Login1',
        3: 'ACH_AllTimeHotelPresence1',
        4: 'ACH_GamePlayed1',
        5: 'ACH_RespectGiven1',
        6: 'ACH_Graduate1'
    };

    const getCategoryMissions = (cat: number) => {
        return bpData.missions.filter(m => m.category === cat);
    };

    const getCategoryCompleted = (cat: number) => {
        return getCategoryMissions(cat).filter(m => m.completed).length;
    };

    const nextReward = bpData.rewards.find(r => r.level_required > bpData.user.level) || bpData.rewards[0];
    const currentCategoryMissions = selectedCategory !== null ? getCategoryMissions(selectedCategory) : [];
    const xpPercent = Math.min(100, Math.round((bpData.user.xp / (bpData.user.xpNext || 100)) * 100));

    const filteredAllMissions = useMemo(() =>
    {
        if(!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase().trim();
        return bpData.missions.filter(m => 
            (m.name && m.name.toLowerCase().includes(q)) || 
            (m.description && m.description.toLowerCase().includes(q)) ||
            (categoryTitles[m.category] && categoryTitles[m.category].toLowerCase().includes(q))
        );
    }, [ bpData.missions, searchQuery ]);

    const displayedCategoryMissions = useMemo(() =>
    {
        if(!searchQuery.trim()) return currentCategoryMissions;
        const q = searchQuery.toLowerCase().trim();
        return currentCategoryMissions.filter(m => 
            (m.name && m.name.toLowerCase().includes(q)) || 
            (m.description && m.description.toLowerCase().includes(q))
        );
    }, [ currentCategoryMissions, searchQuery ]);

    // Determine currency type accurately: -1 = Credits (Coins), 0 = Pixels (Duckets), 5 = Points (Diamonds)
    const getCurrencyType = (type: string, pointType: number = 0): number | null =>
    {
        if(type === 'credits') return -1;
        if(type === 'pixels') return 0;
        if(type === 'points')
        {
            return (pointType !== undefined && pointType !== null && pointType > 0) ? pointType : 5;
        }
        return null;
    };

    // Check if reward has a Badge or Furni (i.e. is multiple reward or badge/furni reward)
    const isMultipleOrItemReward = (badgeCode: string, imgUrl: string, name: string): boolean =>
    {
        return (badgeCode && badgeCode.length > 0) || (imgUrl && imgUrl.length > 0 && !imgUrl.includes('/img/icons/')) || (name && (name.toLowerCase().includes('placa') || name.toLowerCase().includes('furni') || name.toLowerCase().includes('trofeo')));
    };

    // Render the main icon inside the reward box
    const renderRewardMainIcon = (type: string, imgUrl: string, badgeCode: string, pointType: number = 0, name: string = '') =>
    {
        // 1. If badge code exists, show badge
        if(badgeCode && badgeCode.length > 0)
        {
            return <LayoutBadgeImageView badgeCode={ badgeCode } isGroup={ false } />;
        }
        // 2. If name mentions "Placa" or "VIP", fallback to a badge code so it's never empty
        if(name && (name.toLowerCase().includes('placa') || name.toLowerCase().includes('vip')))
        {
            return <LayoutBadgeImageView badgeCode="ACH_VipClub1" isGroup={ false } />;
        }
        // 3. If image URL is provided and valid, show image
        if(imgUrl && imgUrl.length > 0 && !imgUrl.includes('/img/icons/'))
        {
            return <img src={ imgUrl } alt="" style={ { maxWidth: '46px', maxHeight: '46px', objectFit: 'contain', imageRendering: 'auto' } } />;
        }
        // 4. Single Currency Reward: render exact currency icon (Coins for credits, Duckets for pixels, Diamonds for points=5)
        const currType = getCurrencyType(type, pointType);
        if(currType !== null)
        {
            return <LayoutCurrencyIcon type={ currType } />;
        }
        return <LayoutBadgeImageView badgeCode="ACH_BattlePass1" isGroup={ false } />;
    };

    // Render full reward box (main icon + quantity badge)
    const renderRewardBox = (type: string, imgUrl: string, badgeCode: string, pointType: number = 0, amount: number = 1, isVip: boolean = false, name: string = '') =>
    {
        const mainIcon = renderRewardMainIcon(type, imgUrl, badgeCode, pointType, name);
        const currType = getCurrencyType(type, pointType);
        const isMulti = isMultipleOrItemReward(badgeCode, imgUrl, name);

        return (
            <>
                <div className="bp-reward-icon-container">
                    { mainIcon }
                </div>
                { /* Quantity badge in bottom-right corner */ }
                <span className="badge bg-danger text-white position-absolute bottom-0 end-0 p-0.5 d-flex align-items-center gap-1" style={ { fontSize: '10px', lineHeight: 1, zIndex: 4 } }>
                    { /* ONLY show currency icon inside red badge IF it is a MULTIPLE reward (Badge/Furni + Currency) */ }
                    { isMulti && currType !== null && (
                        <LayoutCurrencyIcon type={ currType } />
                    ) }
                    x{ amount || 1 }
                </span>
            </>
        );
    };

    if(!isVisible) return null;

    return (
        <NitroCardView uniqueKey="battle-pass" className="nitro-battle-pass" theme="primary-slim">
            <NitroCardHeaderView headerText="PASE DE BATALLA - Llegar al máximo nivel" onCloseClick={ () => setIsVisible(false) } />
            
            <NitroCardContentView className="p-3 bp-container d-flex flex-column gap-2.5">
                
                { /* Top Season Notice Bar */ }
                <div className="bp-season-banner d-flex align-items-center justify-content-between">
                    <span className="text-secondary fw-semibold" style={ { fontSize: '13px' } }>
                        Actualmente nos encontramos en <strong>Capítulo { bpData.chapter }, Temporada { bpData.season }</strong> la experiencia y los premios serán reiniciados en:
                    </span>
                    <div className="d-flex align-items-center gap-2 flex-shrink-0">
                        <div className="d-flex flex-column align-items-center">
                            <span className="bp-countdown-digit">{ seasonTimeRemaining.days }</span>
                            <span style={ { fontSize: '9px', color: '#64748b', fontWeight: 800, marginTop: '2px' } }>Días</span>
                        </div>
                        <span className="fw-bold text-muted" style={ { fontSize: '16px', marginTop: '-12px' } }>:</span>
                        <div className="d-flex flex-column align-items-center">
                            <span className="bp-countdown-digit">{ seasonTimeRemaining.hours }</span>
                            <span style={ { fontSize: '9px', color: '#64748b', fontWeight: 800, marginTop: '2px' } }>Horas</span>
                        </div>
                        <span className="fw-bold text-muted" style={ { fontSize: '16px', marginTop: '-12px' } }>:</span>
                        <div className="d-flex flex-column align-items-center">
                            <span className="bp-countdown-digit">{ seasonTimeRemaining.minutes }</span>
                            <span style={ { fontSize: '9px', color: '#64748b', fontWeight: 800, marginTop: '2px' } }>Minutos</span>
                        </div>
                        <span className="fw-bold text-muted" style={ { fontSize: '16px', marginTop: '-12px' } }>:</span>
                        <div className="d-flex flex-column align-items-center">
                            <span className="bp-countdown-digit">{ seasonTimeRemaining.seconds }</span>
                            <span style={ { fontSize: '9px', color: '#64748b', fontWeight: 800, marginTop: '2px' } }>Segundos</span>
                        </div>
                    </div>
                </div>

                { /* Top Section: MI EXPERIENCIA + RETOS POR COMPLETAR */ }
                <div className="row g-2.5">
                    
                    { /* Left Box: Mi Experiencia */ }
                    <div className="col-12 col-md-6">
                        <div className="bp-card-box h-100 d-flex flex-column justify-content-between">
                            <div className="bp-box-header-title mb-2">
                                MI EXPERIENCIA
                            </div>
                            <div className="d-flex align-items-center justify-content-between gap-3">
                                
                                { /* Avatar + Username + XP Progress */ }
                                <div className="d-flex flex-column gap-2" style={ { minWidth: '190px' } }>
                                    <div className="d-flex align-items-center gap-3">
                                        <div className="bp-avatar-circle">
                                            <LayoutAvatarImageView figure={ userFigure || '' } direction={ 2 } headOnly={ false } gesture={ AvatarAction.GESTURE_SMILE } scale={ 1.25 } />
                                        </div>
                                        <div className="min-w-0 d-flex flex-column gap-2">
                                            <div className="fw-bold text-dark text-truncate" style={ { fontSize: '17px', maxWidth: '120px' } }>
                                                { userInfo?.username || 'Habbten' }
                                            </div>
                                            <div className="bp-level-tag">
                                                NIVEL { bpData.user.level }
                                            </div>
                                        </div>
                                    </div>
                                    { /* XP Progress bar */ }
                                    <div className="d-flex align-items-center gap-2">
                                        <div className="bp-xp-bar flex-grow-1">
                                            <div className="bp-xp-fill" style={ { width: `${ xpPercent }%` } } />
                                            <span className="position-absolute w-100 top-0 text-center text-white fw-bold" style={ { fontSize: '12px', lineHeight: '22px', textShadow: '0 1px 2px rgba(0,0,0,0.8)' } }>
                                                { bpData.user.xp } / { bpData.user.xpNext || 100 }
                                            </span>
                                        </div>
                                        <span className="badge bg-dark text-white fw-bold px-2 py-1 rounded-1" style={ { fontSize: '12px' } }>
                                            { bpData.user.level + 1 }
                                        </span>
                                    </div>
                                </div>

                                { /* Next Reward Box */ }
                                { nextReward && (
                                    <div className="d-flex flex-column align-items-start text-start">
                                        <span className="text-secondary fw-semibold mb-1" style={ { fontSize: '12px' } }>Tu próximo premio es:</span>
                                        <div 
                                            className="bp-mini-reward cursor-pointer" 
                                            onClick={ () => setPreviewReward({ reward: nextReward, isVip: false }) }
                                            title={ `${ nextReward.name } (Nivel ${ nextReward.level_required })` }>
                                            <div className="position-relative d-flex align-items-center justify-content-center" style={ { width: 40, height: 40 } }>
                                                { renderRewardMainIcon(nextReward.type, nextReward.image, nextReward.badge, nextReward.point_type, nextReward.name) }
                                                <span className="badge bg-danger text-white position-absolute bottom-0 end-0 p-0.5" style={ { fontSize: '10px', lineHeight: 1 } }>
                                                    x{ nextReward.amount || 1 }
                                                </span>
                                            </div>
                                            <span className="fw-bold text-dark text-truncate" style={ { fontSize: '13px', maxWidth: '110px' } }>{ nextReward.name }</span>
                                        </div>
                                    </div>
                                ) }

                                { /* Ranking Starburst */ }
                                <div className="d-flex flex-column align-items-center text-center">
                                    <span className="text-secondary fw-semibold mb-1" style={ { fontSize: '12px' } }>Vas en el puesto</span>
                                    <button 
                                        type="button" 
                                        className="bp-ranking-star-btn"
                                        onClick={ () => setShowRankingModal(true) }
                                        title="Clic para ver la tabla de clasificación Top 10">
                                        <div className="bp-starburst-badge">
                                            { bpData.user.rankPosition || 1 }°
                                        </div>
                                    </button>
                                    <span className="text-muted mt-1" style={ { fontSize: '11px' } }>del ranking</span>
                                </div>

                            </div>
                        </div>
                    </div>

                    { /* Right Box: Retos por completar (Horizontal Scroll) */ }
                    <div className="col-12 col-md-6">
                        <div className="bp-card-box h-100 d-flex flex-column justify-content-between">
                            <div className="d-flex align-items-center justify-content-between mb-2">
                                <span className="bp-box-header-title">RETOS POR COMPLETAR ({ pendingMissions.length })</span>
                                <span className="badge bg-primary text-white" style={ { fontSize: '12px' } }>{ completedMissions.length }/{ bpData.missions.length }</span>
                            </div>
                            <div className="bp-missions-horizontal-track flex-grow-1 align-items-center">
                                { pendingMissions.length > 0 ? pendingMissions.map(m => (
                                    <div key={ m.id } className="bp-quick-mission-card">
                                        <div className="d-flex flex-column align-items-center flex-shrink-0">
                                            <div className="p-1 rounded bg-white border d-flex align-items-center justify-content-center" style={ { width: 44, height: 44 } }>
                                                { m.image ? <img src={ m.image } alt="" style={ { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' } } /> : <LayoutBadgeImageView badgeCode="ACH_SafetyQuizPassed1" /> }
                                            </div>
                                            <span className="badge bg-danger text-white mt-1" style={ { fontSize: '10px', padding: '2px 5px' } }>{ m.progress }/{ m.task }</span>
                                        </div>
                                        <div className="flex-grow-1 min-w-0">
                                            <div className="d-flex align-items-center justify-content-between">
                                                <span className="fw-bold text-dark text-truncate" style={ { fontSize: '13px' } }>{ m.name.toUpperCase() }</span>
                                                <span className="badge bg-danger text-white fw-bold px-2 py-0.5 rounded-1" style={ { fontSize: '10px' } }>+{ m.reward_xp } XP</span>
                                            </div>
                                            <div className="text-muted text-truncate" style={ { fontSize: '12px' } }>{ m.description }</div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center text-muted py-2 w-100" style={ { fontSize: '13px' } }>¡Has completado todos los retos activos!</div>
                                ) }
                            </div>
                        </div>
                    </div>

                </div>

                { /* Status message */ }
                { statusMessage && (
                    <div className={ `alert alert-${ statusMessage.type } py-1.5 px-3 mb-0 d-flex align-items-center justify-content-between rounded` } style={ { fontSize: '13px' } }>
                        <span>{ statusMessage.text }</span>
                        <button type="button" className="btn-close" style={ { fontSize: '10px' } } onClick={ () => setStatusMessage(null) } />
                    </div>
                ) }

                { /* Main Body: PREMIOS Vertical Track (Left) + RETOS (Right) */ }
                <div className="d-flex gap-2.5 flex-grow-1 bp-bottom-section">
                    
                    { /* Left Column: Premios Track */ }
                    <div className="bp-rewards-column bp-card-box">
                        <div className="d-flex align-items-center justify-content-between pb-2 border-bottom mb-2 px-1">
                            <span className="fw-bold text-secondary" style={ { fontSize: '12px' } }>GRATIS</span>
                            <span className="fw-bold text-secondary" style={ { fontSize: '12px' } }>VIP</span>
                        </div>
                        
                        <div className="bp-rewards-scroll-track flex-grow-1">
                            { /* Background gray line */ }
                            <div className="bp-vertical-line" />
                            { /* Green line for reached levels */ }
                            { reachedLineHeight > 0 && (
                                <div className="bp-vertical-line-reached" style={ { height: `${ reachedLineHeight }px` } } />
                            ) }

                            <div className="d-flex flex-column position-relative">
                                { bpData.rewards.map(r => {
                                    const isUnlocked = bpData.user.level >= r.level_required;
                                    const isFreeClaimed = claimedSet.has(`${ r.id }_0`);
                                    const isVipClaimed = claimedSet.has(`${ r.id }_1`);
                                    const isFreeClaimable = isUnlocked && !isFreeClaimed;
                                    const isVipClaimable = isUnlocked && bpData.isVip && !isVipClaimed;

                                    return (
                                        <div key={ r.id } className="bp-level-row">
                                            
                                            { /* Free Reward Box (Left) */ }
                                            <div 
                                                className={ `bp-square-box ${ isFreeClaimed ? 'claimed' : (isFreeClaimable ? 'claimable' : (isUnlocked ? 'unlocked' : '')) }` }
                                                onClick={ () => {
                                                    if(isFreeClaimable) handleClaimReward(r.id, false);
                                                    else setPreviewReward({ reward: r, isVip: false });
                                                } }
                                                title={ `${ r.name } ${ isFreeClaimable ? '(¡Clic para reclamar!)' : '' }` }>
                                                { renderRewardBox(r.type, r.image, r.badge, r.point_type, r.amount, false, r.name) }
                                            </div>

                                            { /* Level Node in Center — NO circle when reached, JUST avatar head over green line */ }
                                            { isUnlocked ? (
                                                <div className="bp-level-avatar-node" title={ `Nivel ${ r.level_required }` }>
                                                    <LayoutAvatarImageView figure={ userFigure || '' } direction={ 2 } headOnly={ true } gesture={ AvatarAction.GESTURE_SMILE } />
                                                </div>
                                            ) : (
                                                <div className="bp-level-node">
                                                    { r.level_required }
                                                </div>
                                            ) }

                                            { /* VIP Reward Box (Right) */ }
                                            <div 
                                                className={ `bp-square-box vip-square ${ isVipClaimed ? 'claimed' : (isVipClaimable ? 'claimable' : (isUnlocked && bpData.isVip ? 'unlocked' : '')) }` }
                                                onClick={ () => {
                                                    if(isVipClaimable) handleClaimReward(r.id, true);
                                                    else setPreviewReward({ reward: r, isVip: true });
                                                } }
                                                title={ `${ r.name_vip || r.name } ${ isVipClaimable ? '(¡Clic para reclamar VIP!)' : '' }` }>
                                                <span className="bp-vip-tag">VIP</span>
                                                { renderRewardBox(r.type_vip || r.type, r.image_vip, r.badge_vip, r.point_type_vip, r.amount_vip, true, r.name_vip || r.name) }
                                                { (!isUnlocked || !bpData.isVip) && (
                                                    <div className="bp-lock-overlay">
                                                        <i className="icon icon-navigator-room-locked" />
                                                    </div>
                                                ) }
                                            </div>

                                        </div>
                                    );
                                }) }
                            </div>
                        </div>
                    </div>

                    { /* Right Column: Retos Area */ }
                    <div className="bp-challenges-column bp-card-box">
                        
                        { selectedCategory === null ? (
                            <>
                                { /* Header: Retos Info + Search Input */ }
                                <div className="d-flex align-items-center justify-content-between pb-2 mb-2 border-bottom gap-2">
                                    <div className="d-flex align-items-center gap-2.5 min-w-0">
                                        <LayoutBadgeImageView badgeCode="ACH_Graduate1" />
                                        <div className="min-w-0">
                                            <div className="fw-bold text-dark" style={ { fontSize: '15px' } }>Retos</div>
                                            <div className="text-muted text-truncate" style={ { fontSize: '11px' } }>Pasa retos para subir más rápido de nivel</div>
                                        </div>
                                    </div>
                                    <div className="position-relative flex-shrink-0" style={ { width: '180px' } }>
                                        <input 
                                            type="text" 
                                            className="form-control form-control-sm ps-4 pe-4" 
                                            placeholder="Buscar reto..." 
                                            value={ searchQuery } 
                                            onChange={ e => setSearchQuery(e.target.value) } 
                                            style={ { fontSize: '12px', borderRadius: '6px', height: '30px' } }
                                        />
                                        <FaSearch className="position-absolute text-muted" style={ { left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', pointerEvents: 'none' } } />
                                        { searchQuery.length > 0 && (
                                            <button 
                                                type="button" 
                                                className="btn btn-link btn-sm position-absolute p-0 text-muted" 
                                                style={ { right: '8px', top: '50%', transform: 'translateY(-50%)', textDecoration: 'none', lineHeight: 1 } } 
                                                onClick={ () => setSearchQuery('') }>
                                                <FaTimes style={ { fontSize: '10px' } } />
                                            </button>
                                        ) }
                                    </div>
                                </div>

                                { searchQuery.trim().length > 0 ? (
                                    <div className="overflow-auto pe-2 flex-grow-1 d-flex flex-column gap-2" style={ { maxHeight: '340px' } }>
                                        <div className="d-flex align-items-center justify-content-between text-muted px-1" style={ { fontSize: '12px' } }>
                                            <span>Resultados para "<strong>{ searchQuery }</strong>"</span>
                                            <span className="badge bg-secondary">{ filteredAllMissions.length } reto(s) ({ filteredAllMissions.filter(m => m.completed).length } completados)</span>
                                        </div>
                                        { filteredAllMissions.length === 0 ? (
                                            <div className="d-flex flex-column align-items-center justify-content-center py-5 text-center text-muted">
                                                <FaSearch className="fs-4 mb-2 text-secondary opacity-50" />
                                                <div className="fw-bold fs-6 text-dark">No se encontraron retos</div>
                                                <div className="small">No hay retos que coincidan con la búsqueda "{ searchQuery }".</div>
                                            </div>
                                        ) : (
                                            filteredAllMissions.map(m => (
                                                <div key={ m.id } className={ `bp-mission-row ${ m.completed ? 'completed' : '' }` }>
                                                    <div className="d-flex flex-column align-items-center flex-shrink-0">
                                                        <div className="p-1 rounded bg-white border d-flex align-items-center justify-content-center" style={ { width: 44, height: 44 } }>
                                                            { m.image ? <img src={ m.image } alt="" style={ { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' } } /> : <LayoutBadgeImageView badgeCode={ categoryBadgeCodes[m.category] || 'ACH_Graduate1' } /> }
                                                        </div>
                                                        <span className="badge bg-danger text-white mt-1" style={ { fontSize: '10px' } }>{ m.progress }/{ m.task }</span>
                                                    </div>
                                                    <div className="flex-grow-1 min-w-0">
                                                        <div className="d-flex align-items-center justify-content-between gap-1">
                                                            <div className="d-flex align-items-center gap-1.5 min-w-0">
                                                                <span className="badge bg-dark text-white flex-shrink-0" style={ { fontSize: '9px', textTransform: 'uppercase' } }>
                                                                    { categoryTitles[m.category] || 'Reto' }
                                                                </span>
                                                                <span className="fw-bold text-dark text-truncate" style={ { fontSize: '13px' } }>{ m.name }</span>
                                                            </div>
                                                            <span className="badge bg-danger text-white fw-bold px-2 py-1 rounded-1 flex-shrink-0" style={ { fontSize: '11px' } }>
                                                                +{ m.reward_xp } XP
                                                            </span>
                                                        </div>
                                                        <div className="text-muted text-truncate mt-0.5" style={ { fontSize: '11.5px' } }>{ m.description }</div>
                                                        <div className="progress mt-1.5" style={ { height: '8px', backgroundColor: '#e2e8f0' } }>
                                                            <div 
                                                                className={ `progress-bar ${ m.completed ? 'bg-success' : 'bg-primary' }` } 
                                                                style={ { width: `${ Math.min(100, Math.round((m.progress / m.task) * 100)) }%` } }
                                                            />
                                                        </div>
                                                    </div>
                                                    { m.completed ? (
                                                        <span className="badge bg-success text-white flex-shrink-0" style={ { fontSize: '11px' } }>✓ Hecho</span>
                                                    ) : (
                                                        <span className="badge bg-light text-secondary border flex-shrink-0" style={ { fontSize: '11px' } }>En progreso</span>
                                                    ) }
                                                </div>
                                            ))
                                        ) }
                                    </div>
                                ) : (
                                    /* 2x3 Grid of Category Cards */
                                    <div className="row g-2.5 flex-grow-1">
                                        
                                        { /* Card 1: Primeros Retos */ }
                                        <div className="col-6">
                                            <div onClick={ () => { setSelectedCategory(1); setSearchQuery(''); } } className="bp-category-card h-100">
                                                <div className="d-flex gap-3">
                                                    <div className="d-flex flex-column align-items-center flex-shrink-0">
                                                        <div className="bp-category-icon-box">
                                                            <LayoutBadgeImageView badgeCode={ categoryBadgeCodes[1] } />
                                                        </div>
                                                        <span className="badge bg-danger text-white mt-1" style={ { fontSize: '10px' } }>{ getCategoryCompleted(1) }/{ getCategoryMissions(1).length }</span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="fw-bold text-dark d-block" style={ { fontSize: '14px' } }>PRIMEROS RETOS</span>
                                                        <span className="text-muted" style={ { fontSize: '12px', lineHeight: 1.3 } }>
                                                            Estas recompensas son para aquellos usuarios nuevos, te ayudarán a familiarizarte con este juego.
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        { /* Card 2: Retos Legendarios */ }
                                        <div className="col-6">
                                            <div onClick={ () => { setSelectedCategory(6); setSearchQuery(''); } } className="bp-category-card h-100">
                                                <div className="d-flex gap-3">
                                                    <div className="d-flex flex-column align-items-center flex-shrink-0">
                                                        <div className="bp-category-icon-box">
                                                            <LayoutBadgeImageView badgeCode={ categoryBadgeCodes[6] } />
                                                        </div>
                                                        <span className="badge bg-danger text-white mt-1" style={ { fontSize: '10px' } }>{ getCategoryCompleted(6) }/{ getCategoryMissions(6).length }</span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="fw-bold text-dark d-block" style={ { fontSize: '14px' } }>RETOS LEGENDARIOS</span>
                                                        <span className="text-muted" style={ { fontSize: '12px', lineHeight: 1.3 } }>
                                                            Estos retos son una verdadera leyenda en Habbten, subirás de nivel muy rápido si los desbloqueas todos.
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        { /* Card 3: Retos Diarios */ }
                                        <div className="col-6">
                                            <div onClick={ () => { setSelectedCategory(2); setSearchQuery(''); } } className="bp-category-card h-100">
                                                <div className="d-flex gap-3">
                                                    <div className="d-flex flex-column align-items-center flex-shrink-0">
                                                        <div className="bp-category-icon-box">
                                                            <LayoutBadgeImageView badgeCode={ categoryBadgeCodes[2] } />
                                                        </div>
                                                        <span className="badge bg-danger text-white mt-1" style={ { fontSize: '10px' } }>{ getCategoryCompleted(2) }/{ getCategoryMissions(2).length }</span>
                                                    </div>
                                                    <div className="min-w-0 flex-grow-1">
                                                        <div className="d-flex align-items-center justify-content-between gap-2">
                                                            <span className="fw-bold text-dark" style={ { fontSize: '14px' } }>RETOS DIARIOS</span>
                                                            <div className="bp-category-timer-pill" title="Días : Horas : Minutos : Segundos">
                                                                <span className="font-monospace fw-bold" style={ { fontSize: '10.5px' } }>
                                                                    { dailyTimeRemaining.days } : { dailyTimeRemaining.hours } : { dailyTimeRemaining.minutes } : { dailyTimeRemaining.seconds }
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <span className="text-muted" style={ { fontSize: '12px', lineHeight: 1.3 } }>
                                                            Estos retos aparecerán cada 24h en el hotel ¡cúmplelos cada día! Son muy sencillos.
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        { /* Card 4: Retos Comunidad */ }
                                        <div className="col-6">
                                            <div onClick={ () => { setSelectedCategory(5); setSearchQuery(''); } } className="bp-category-card h-100">
                                                <div className="d-flex gap-3">
                                                    <div className="d-flex flex-column align-items-center flex-shrink-0">
                                                        <div className="bp-category-icon-box">
                                                            <LayoutBadgeImageView badgeCode={ categoryBadgeCodes[5] } />
                                                        </div>
                                                        <span className="badge bg-danger text-white mt-1" style={ { fontSize: '10px' } }>{ getCategoryCompleted(5) }/{ getCategoryMissions(5).length }</span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="fw-bold text-dark d-block" style={ { fontSize: '14px' } }>RETOS COMUNIDAD</span>
                                                        <span className="text-muted" style={ { fontSize: '12px', lineHeight: 1.3 } }>
                                                            Estos retos son únicos y exclusivos para miembros activos de la comunidad de Habbten.
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        { /* Card 5: Retos Semanales */ }
                                        <div className="col-6">
                                            <div onClick={ () => { setSelectedCategory(3); setSearchQuery(''); } } className="bp-category-card h-100">
                                                <div className="d-flex gap-3">
                                                    <div className="d-flex flex-column align-items-center flex-shrink-0">
                                                        <div className="bp-category-icon-box">
                                                            <LayoutBadgeImageView badgeCode={ categoryBadgeCodes[3] } />
                                                        </div>
                                                        <span className="badge bg-danger text-white mt-1" style={ { fontSize: '10px' } }>{ getCategoryCompleted(3) }/{ getCategoryMissions(3).length }</span>
                                                    </div>
                                                    <div className="min-w-0 flex-grow-1">
                                                        <div className="d-flex align-items-center justify-content-between gap-2">
                                                            <span className="fw-bold text-dark" style={ { fontSize: '14px' } }>RETOS SEMANALES</span>
                                                            <div className="bp-category-timer-pill" title="Días : Horas : Minutos : Segundos">
                                                                <span className="font-monospace fw-bold" style={ { fontSize: '10.5px' } }>
                                                                    { weeklyTimeRemaining.days } : { weeklyTimeRemaining.hours } : { weeklyTimeRemaining.minutes } : { weeklyTimeRemaining.seconds }
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <span className="text-muted" style={ { fontSize: '12px', lineHeight: 1.3 } }>
                                                            Estos retos aparecerán cada 7 días en el hotel ¡requieren más dedicación!
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        { /* Card 6: Retos Especiales */ }
                                        <div className="col-6">
                                            <div onClick={ () => { setSelectedCategory(4); setSearchQuery(''); } } className="bp-category-card h-100">
                                                <div className="d-flex gap-3">
                                                    <div className="d-flex flex-column align-items-center flex-shrink-0">
                                                        <div className="bp-category-icon-box">
                                                            <LayoutBadgeImageView badgeCode={ categoryBadgeCodes[4] } />
                                                        </div>
                                                        <span className="badge bg-danger text-white mt-1" style={ { fontSize: '10px' } }>{ getCategoryCompleted(4) }/{ getCategoryMissions(4).length }</span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="fw-bold text-dark d-block" style={ { fontSize: '14px' } }>RETOS ESPECIALES</span>
                                                        <span className="text-muted" style={ { fontSize: '12px', lineHeight: 1.3 } }>
                                                            Estos retos aparecen y desaparecen de la nada ¡son temporales y raros! ¡Estate muy atento!
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                ) }
                            </>
                        ) : (
                            <>
                                { /* Header with Back Button + Category Search */ }
                                <div className="d-flex align-items-center justify-content-between pb-2 mb-2 border-bottom gap-2">
                                    <div className="d-flex align-items-center gap-2.5 min-w-0">
                                        <Button size="sm" variant="secondary" onClick={ () => { setSelectedCategory(null); setSearchQuery(''); } } className="py-1 px-2.5" style={ { fontSize: '12px' } }>
                                            « Volver
                                        </Button>
                                        <div className="bp-back-separator" />
                                        <span className="fw-bold text-dark text-truncate" style={ { fontSize: '15px' } }>{ categoryTitles[selectedCategory] || 'Retos' }</span>
                                    </div>
                                    <div className="d-flex align-items-center gap-2 flex-shrink-0">
                                        <div className="position-relative" style={ { width: '150px' } }>
                                            <input 
                                                type="text" 
                                                className="form-control form-control-sm ps-4 pe-4" 
                                                placeholder="Buscar..." 
                                                value={ searchQuery } 
                                                onChange={ e => setSearchQuery(e.target.value) } 
                                                style={ { fontSize: '12px', borderRadius: '6px', height: '28px' } }
                                            />
                                            <FaSearch className="position-absolute text-muted" style={ { left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', pointerEvents: 'none' } } />
                                            { searchQuery.length > 0 && (
                                                <button 
                                                    type="button" 
                                                    className="btn btn-link btn-sm position-absolute p-0 text-muted" 
                                                    style={ { right: '8px', top: '50%', transform: 'translateY(-50%)', textDecoration: 'none', lineHeight: 1 } } 
                                                    onClick={ () => setSearchQuery('') }>
                                                    <FaTimes style={ { fontSize: '10px' } } />
                                                </button>
                                            ) }
                                        </div>
                                        <span className="badge bg-primary text-white" style={ { fontSize: '11px' } }>
                                            { getCategoryCompleted(selectedCategory) } / { currentCategoryMissions.length }
                                        </span>
                                    </div>
                                </div>

                                { /* Challenges List */ }
                                <div className="overflow-auto pe-2 flex-grow-1 d-flex flex-column gap-2" style={ { maxHeight: '340px' } }>
                                    { displayedCategoryMissions.length === 0 ? (
                                        <div className="d-flex flex-column align-items-center justify-content-center py-5 text-center text-muted">
                                            <FaSearch className="fs-4 mb-2 text-secondary opacity-50" />
                                            <div className="fw-bold fs-6 text-dark mt-1">No hay retos disponibles</div>
                                            <div className="small">{ searchQuery ? `No hay retos que coincidan con "${searchQuery}".` : 'Próximamente se añadirán más retos en esta categoría. ¡Sigue atento!' }</div>
                                        </div>
                                    ) : (
                                        displayedCategoryMissions.map(m => (
                                            <div key={ m.id } className={ `bp-mission-row ${ m.completed ? 'completed' : '' }` }>
                                                <div className="d-flex flex-column align-items-center flex-shrink-0">
                                                    <div className="p-1 rounded bg-white border d-flex align-items-center justify-content-center" style={ { width: 44, height: 44 } }>
                                                        { m.image ? <img src={ m.image } alt="" style={ { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' } } /> : <LayoutBadgeImageView badgeCode={ categoryBadgeCodes[selectedCategory] || 'ACH_SafetyQuizPassed1' } /> }
                                                    </div>
                                                    <span className="badge bg-danger text-white mt-1" style={ { fontSize: '10px' } }>{ m.progress }/{ m.task }</span>
                                                </div>
                                                <div className="flex-grow-1 min-w-0">
                                                    <div className="d-flex align-items-center justify-content-between gap-1">
                                                        <span className="fw-bold text-dark text-truncate" style={ { fontSize: '13.5px' } }>{ m.name }</span>
                                                        <span className="badge bg-danger text-white fw-bold px-2 py-1 rounded-1 flex-shrink-0" style={ { fontSize: '11px' } }>
                                                            +{ m.reward_xp } XP
                                                        </span>
                                                    </div>
                                                    <div className="text-muted text-truncate mt-0.5" style={ { fontSize: '11.5px' } }>{ m.description }</div>
                                                    <div className="progress mt-1.5" style={ { height: '8px', backgroundColor: '#e2e8f0' } }>
                                                        <div 
                                                            className={ `progress-bar ${ m.completed ? 'bg-success' : 'bg-primary' }` } 
                                                            style={ { width: `${ Math.min(100, Math.round((m.progress / m.task) * 100)) }%` } }
                                                        />
                                                    </div>
                                                </div>
                                                { m.completed ? (
                                                    <span className="badge bg-success text-white flex-shrink-0" style={ { fontSize: '11px' } }>✓ Hecho</span>
                                                ) : (
                                                    <span className="badge bg-light text-secondary border flex-shrink-0" style={ { fontSize: '11px' } }>En progreso</span>
                                                ) }
                                            </div>
                                        ))
                                    ) }
                                </div>
                            </>
                        ) }
                    </div>

                </div>

                { /* Ranking Leaderboard Modal */ }
                { showRankingModal && (
                    <div className="bp-modal-backdrop" onClick={ () => setShowRankingModal(false) }>
                        <div className="bp-dialog" style={ { width: '500px', maxWidth: '94%' } } onClick={ (e) => e.stopPropagation() }>
                            <div className="d-flex align-items-center justify-content-between pb-2 mb-3 border-bottom">
                                <div className="d-flex align-items-center gap-3">
                                    <LayoutBadgeImageView badgeCode="ACH_Graduate1" />
                                    <div>
                                        <div className="fw-bold text-dark" style={ { fontSize: '16px' } }>Tabla de Clasificación</div>
                                        <div className="text-muted" style={ { fontSize: '12px' } }>Top 10 usuarios con mayor nivel en el Pase de Batalla</div>
                                    </div>
                                </div>
                                <button type="button" className="btn-close" style={ { fontSize: '12px' } } onClick={ () => setShowRankingModal(false) } />
                            </div>

                            { /* Column headers */ }
                            <div className="d-flex align-items-center px-3 pb-2 mb-1" style={ { fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' } }>
                                <span style={ { minWidth: '36px', flexShrink: 0, textAlign: 'center' } }>PUESTO</span>
                                <span style={ { width: '12px', flexShrink: 0 } } />
                                <span style={ { minWidth: '40px', flexShrink: 0 } } />
                                <span style={ { width: '12px', flexShrink: 0 } } />
                                <span style={ { flexGrow: 1 } }>USUARIO</span>
                                <span style={ { minWidth: '70px', flexShrink: 0, textAlign: 'center' } }>NIVEL</span>
                                <span style={ { minWidth: '55px', flexShrink: 0, textAlign: 'right' } }>XP</span>
                            </div>

                            <div className="bp-ranking-list">
                                { bpData.ranking && bpData.ranking.length > 0 ? bpData.ranking.map((user, idx) => {
                                    const isMe = userInfo?.username === user.username;
                                    const rankClass = idx === 0 ? 'rank-1' : (idx === 1 ? 'rank-2' : (idx === 2 ? 'rank-3' : ''));
                                    return (
                                        <div key={ user.id } className={ `bp-ranking-row ${ rankClass } ${ isMe ? 'current-user-row' : '' }` }>
                                            <span className={ `bp-rank-position badge ${ idx === 0 ? 'bg-warning text-dark' : (idx === 1 ? 'bg-secondary text-white' : (idx === 2 ? 'bg-danger text-white' : 'bg-light text-dark border')) } fw-bold` }>
                                                { idx + 1 }°
                                            </span>
                                            <div className="bp-rank-avatar">
                                                <LayoutAvatarImageView figure={ user.look || '' } direction={ 2 } headOnly={ true } gesture={ AvatarAction.GESTURE_SMILE } />
                                            </div>
                                            <div className="bp-rank-info">
                                                <span className="bp-rank-name">
                                                    { user.username }
                                                    { isMe && <span className="badge bg-primary text-white ms-2" style={ { fontSize: '9px', verticalAlign: 'middle' } }>Tú</span> }
                                                </span>
                                            </div>
                                            <span className="bp-rank-level badge bg-primary text-white fw-bold">Nivel { user.level }</span>
                                            <span className="bp-rank-xp">{ user.xp } XP</span>
                                        </div>
                                    );
                                }) : (
                                    <div className="text-center text-muted py-4" style={ { fontSize: '13px' } }>No hay datos de clasificación aún.</div>
                                ) }
                            </div>
                        </div>
                    </div>
                ) }

                { /* Reward Preview Detail Modal */ }
                { previewReward && (
                    <div className="bp-modal-backdrop" onClick={ () => setPreviewReward(null) }>
                        <div className="bp-dialog" style={ { width: '340px', maxWidth: '92%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' } } onClick={ (e) => e.stopPropagation() }>
                            <div className="d-flex align-items-center justify-content-between w-100 mb-2">
                                <span className={ `badge ${ previewReward.isVip ? 'bg-dark text-white' : 'bg-primary text-white' } fw-bold px-3 py-1` } style={ { fontSize: '12px' } }>
                                    { previewReward.isVip ? 'Pase VIP - Nivel ' : 'Pase Gratuito - Nivel ' }{ previewReward.reward.level_required }
                                </span>
                                <button type="button" className="btn-close" style={ { fontSize: '12px' } } onClick={ () => setPreviewReward(null) } />
                            </div>

                            <div className="bp-square-box my-3" style={ { width: 72, height: 72 } }>
                                <div className="bp-reward-icon-container" style={ { width: 56, height: 56 } }>
                                    { (() => {
                                        const rType = previewReward.isVip ? (previewReward.reward.type_vip || previewReward.reward.type) : previewReward.reward.type;
                                        const rImg = previewReward.isVip ? previewReward.reward.image_vip : previewReward.reward.image;
                                        const rBadge = previewReward.isVip ? previewReward.reward.badge_vip : previewReward.reward.badge;
                                        const rPt = previewReward.isVip ? previewReward.reward.point_type_vip : previewReward.reward.point_type;
                                        const rName = previewReward.isVip ? (previewReward.reward.name_vip || previewReward.reward.name) : previewReward.reward.name;
                                        return renderRewardMainIcon(rType, rImg, rBadge, rPt, rName);
                                    })() }
                                </div>
                            </div>

                            <span className="fw-bold text-dark mb-2" style={ { fontSize: '16px' } }>
                                { previewReward.isVip ? (previewReward.reward.name_vip || previewReward.reward.name) : previewReward.reward.name }
                            </span>

                            <span className="text-muted mb-3" style={ { fontSize: '13px' } }>
                                { previewReward.isVip 
                                    ? 'Recompensa exclusiva del Pase VIP de Habbten.' 
                                    : 'Recompensa desbloqueable para todos los usuarios de Habbten.' }
                            </span>

                            { /* Claim button */ }
                            { (() => {
                                const isUnlocked = bpData.user.level >= previewReward.reward.level_required;
                                const isClaimed = claimedSet.has(`${ previewReward.reward.id }_${ previewReward.isVip ? 1 : 0 }`);
                                const canClaim = isUnlocked && !isClaimed && (!previewReward.isVip || bpData.isVip);

                                if(isClaimed)
                                {
                                    return <span className="badge bg-secondary text-white py-2 px-3 w-100" style={ { fontSize: '13px' } }>Recompensa ya reclamada</span>;
                                }
                                if(canClaim)
                                {
                                    return (
                                        <Button 
                                            variant="success"
                                            size="sm"
                                            disabled={ claiming !== null }
                                            onClick={ () => handleClaimReward(previewReward.reward.id, previewReward.isVip) }
                                            className="w-100 py-2 FW-bold shadow-xs"
                                            style={ { fontSize: '14px' } }>
                                            { claiming === `${ previewReward.reward.id }_${ previewReward.isVip ? 1 : 0 }` ? 'Reclamando...' : '¡Reclamar ahora!' }
                                        </Button>
                                    );
                                }
                                return (
                                    <span className="badge bg-light text-muted border py-2 px-3 w-100" style={ { fontSize: '13px' } }>
                                        { !isUnlocked 
                                            ? `Requiere Nivel ${ previewReward.reward.level_required }` 
                                            : (previewReward.isVip && !bpData.isVip ? '🔒 Requiere Suscripción VIP Activa' : 'No disponible') }
                                    </span>
                                );
                            })() }
                        </div>
                    </div>
                ) }

            </NitroCardContentView>
        </NitroCardView>
    );
};
