import { ILinkEventTracker } from '@nitrots/nitro-renderer';
import { FC, useEffect, useMemo, useState } from 'react';
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

export const BattlePassView: FC<{}> = () =>
{
    const [ isVisible, setIsVisible ] = useState(false);
    const [ selectedCategory, setSelectedCategory ] = useState<number | null>(null);
    const [ showRankingModal, setShowRankingModal ] = useState(false);
    const [ loading, setLoading ] = useState(false);
    const [ claiming, setClaiming ] = useState<string | null>(null);
    const [ statusMessage, setStatusMessage ] = useState<{ text: string; type: 'success' | 'danger' } | null>(null);
    const [ previewReward, setPreviewReward ] = useState<{ reward: Reward; isVip: boolean } | null>(null);

    const { userInfo = null, userFigure = null } = useSessionInfo();
    const [ timeRemaining, setTimeRemaining ] = useState({ days: '11', hours: '00', minutes: '33', seconds: '50' });
    
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

    const updateCountdown = () =>
    {
        const now = Date.now();
        // Calculate reset target to 1st day of next month at 00:00:00
        const nowDate = new Date();
        const nextMonth = new Date(nowDate.getFullYear(), nowDate.getMonth() + 1, 1, 0, 0, 0);
        let targetMs = nextMonth.getTime();
        
        if(bpData.seasonEnd && bpData.seasonEnd * 1000 > now && (bpData.seasonEnd * 1000 - now) < 35 * 86400000)
        {
            targetMs = bpData.seasonEnd * 1000;
        }

        const diffMs = Math.max(0, targetMs - now);
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

        setTimeRemaining({
            days: String(days).padStart(2, '0'),
            hours: String(hours).padStart(2, '0'),
            minutes: String(minutes).padStart(2, '0'),
            seconds: String(seconds).padStart(2, '0')
        });
    };

    const fetchData = async () =>
    {
        try
        {
            setLoading(true);
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
            setLoading(false);
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
        updateCountdown();
        const timer = setInterval(updateCountdown, 1000);
        return () => clearInterval(timer);
    }, [ isVisible, bpData.seasonEnd ]);

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

    if(!isVisible) return null;

    const completedMissions = bpData.missions.filter(m => m.completed);
    const pendingMissions = bpData.missions.filter(m => !m.completed);
    const quickPending = pendingMissions.slice(0, 2);

    const categoryTitles: { [key: number]: string } = {
        1: 'PRIMEROS RETOS',
        2: 'RETOS DIARIOS',
        3: 'RETOS SEMANALES',
        4: 'RETOS ESPECIALES',
        5: 'RETOS COMUNIDAD',
        6: 'RETOS LEGENDARIOS'
    };

    const categoryIcons: { [key: number]: string } = {
        1: 'https://images.habbo.com/c_images/album1584/ACH_SafetyQuizPassed1.gif',
        2: 'https://images.habbo.com/c_images/album1584/ACH_Login1.gif',
        3: 'https://images.habbo.com/c_images/album1584/ACH_AllTimeHotelPresence1.gif',
        4: 'https://images.habbo.com/c_images/album1584/ACH_GamePlayed1.gif',
        5: 'https://images.habbo.com/c_images/album1584/ACH_RespectGiven1.gif',
        6: 'https://images.habbo.com/c_images/album1584/ACH_Graduate1.gif'
    };

    const getCategoryMissions = (cat: number) => {
        if(cat === 4) return bpData.missions.filter(m => m.category === 4 || m.category === 5);
        return bpData.missions.filter(m => m.category === cat);
    };

    const getCategoryCompleted = (cat: number) => {
        return getCategoryMissions(cat).filter(m => m.completed).length;
    };

    const nextReward = bpData.rewards.find(r => r.level_required > bpData.user.level) || bpData.rewards[0];
    const currentCategoryMissions = selectedCategory !== null ? getCategoryMissions(selectedCategory) : [];
    const xpPercent = Math.min(100, Math.round((bpData.user.xp / (bpData.user.xpNext || 100)) * 100));

    const renderRewardIcon = (type: string, imgUrl: string, badgeCode: string, pointType: number = 0, isVip: boolean = false) =>
    {
        if(type === 'badge' || (badgeCode && badgeCode.length > 0 && badgeCode !== 'BR058'))
        {
            return <LayoutBadgeImageView badgeCode={ badgeCode || 'ACH_BattlePass1' } isGroup={ false } />;
        }
        if(type === 'credits' || pointType === -1)
        {
            return <LayoutCurrencyIcon type={ -1 } />;
        }
        if(type === 'pixels' || (type === 'points' && pointType === 0))
        {
            return <LayoutCurrencyIcon type={ 0 } />;
        }
        if(type === 'points' || pointType === 5)
        {
            return <LayoutCurrencyIcon type={ 5 } />;
        }
        if(imgUrl && imgUrl.length > 0)
        {
            return <img src={ imgUrl } alt="" style={ { maxWidth: '32px', maxHeight: '32px', objectFit: 'contain' } } />;
        }
        return <LayoutCurrencyIcon type={ isVip ? 5 : -1 } />;
    };

    return (
        <NitroCardView uniqueKey="battle-pass" className="nitro-battle-pass" theme="primary-slim">
            <NitroCardHeaderView headerText="PASE DE BATALLA - Llegar al máximo nivel" onCloseClick={ () => setIsVisible(false) } />
            
            <NitroCardContentView className="p-3 bp-container d-flex flex-column gap-2.5">
                
                { /* Top Season Notice Bar */ }
                <div className="bp-season-banner d-flex align-items-center justify-content-between">
                    <span className="text-secondary fw-semibold" style={ { fontSize: '13px' } }>
                        Actualmente nos encontramos en <strong>Capítulo { bpData.chapter }</strong>, <strong>Temporada { bpData.season }</strong>. La experiencia y los premios serán reiniciados en:
                    </span>
                    <div className="d-flex align-items-center gap-2 flex-shrink-0">
                        <div className="d-flex flex-column align-items-center">
                            <span className="bp-countdown-digit">{ timeRemaining.days }</span>
                            <span style={ { fontSize: '9px', color: '#64748b', fontWeight: 800, marginTop: '2px' } }>Días</span>
                        </div>
                        <span className="fw-bold text-muted" style={ { fontSize: '14px', marginTop: '-10px' } }>:</span>
                        <div className="d-flex flex-column align-items-center">
                            <span className="bp-countdown-digit">{ timeRemaining.hours }</span>
                            <span style={ { fontSize: '9px', color: '#64748b', fontWeight: 800, marginTop: '2px' } }>Horas</span>
                        </div>
                        <span className="fw-bold text-muted" style={ { fontSize: '14px', marginTop: '-10px' } }>:</span>
                        <div className="d-flex flex-column align-items-center">
                            <span className="bp-countdown-digit">{ timeRemaining.minutes }</span>
                            <span style={ { fontSize: '9px', color: '#64748b', fontWeight: 800, marginTop: '2px' } }>Minutos</span>
                        </div>
                    </div>
                </div>

                { /* Top Section: MI EXPERIENCIA + RETOS POR COMPLETAR */ }
                <div className="row g-2.5">
                    
                    { /* Left Box: Mi Experiencia */ }
                    <div className="col-12 col-md-6">
                        <div className="bp-card-box h-100 d-flex flex-column justify-content-between">
                            <div className="bp-box-header-title mb-1.5">
                                MI EXPERIENCIA
                            </div>
                            <div className="d-flex align-items-center justify-content-between gap-3">
                                
                                { /* Avatar + Username + XP Progress */ }
                                <div className="d-flex flex-column gap-2" style={ { minWidth: '175px' } }>
                                    <div className="d-flex align-items-center gap-2.5">
                                        <div className="bp-avatar-circle">
                                            <LayoutAvatarImageView figure={ userFigure || '' } direction={ 2 } headOnly={ true } scale={ 1.0 } />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="fw-bold text-dark text-truncate" style={ { fontSize: '14.5px', maxWidth: '110px' } }>
                                                { userInfo?.username || 'Habbten' }
                                            </div>
                                            <span className="badge bg-light text-dark border fw-bold px-2 py-0.5 rounded-pill" style={ { fontSize: '10px' } }>
                                                NIVEL { bpData.user.level }
                                            </span>
                                        </div>
                                    </div>
                                    { /* XP Progress bar */ }
                                    <div className="d-flex align-items-center gap-1.5">
                                        <div className="bp-xp-bar flex-grow-1">
                                            <div className="bp-xp-fill" style={ { width: `${ xpPercent }%` } } />
                                            <span className="position-absolute w-100 top-0 text-center text-white fw-bold" style={ { fontSize: '10.5px', lineHeight: '18px', textShadow: '0 1px 2px rgba(0,0,0,0.8)' } }>
                                                { bpData.user.xp } / { bpData.user.xpNext || 100 }
                                            </span>
                                        </div>
                                        <span className="badge bg-dark text-white fw-bold px-1.5 py-0.5 rounded-1" style={ { fontSize: '10.5px' } }>
                                            { bpData.user.level + 1 }
                                        </span>
                                    </div>
                                </div>

                                { /* Next Reward Box */ }
                                { nextReward && (
                                    <div className="d-flex flex-column align-items-center text-center">
                                        <span className="text-secondary fw-semibold mb-1" style={ { fontSize: '11px' } }>Tu próximo premio es:</span>
                                        <div 
                                            className="bp-mini-reward cursor-pointer" 
                                            onClick={ () => setPreviewReward({ reward: nextReward, isVip: false }) }
                                            title={ `${ nextReward.name } (Nivel ${ nextReward.level_required })` }>
                                            <div className="position-relative d-flex align-items-center justify-content-center" style={ { width: 34, height: 34 } }>
                                                { renderRewardIcon(nextReward.type, nextReward.image, nextReward.badge, nextReward.point_type, false) }
                                                <span className="badge bg-danger text-white position-absolute bottom-0 end-0 p-0.5" style={ { fontSize: '8px', lineHeight: 1 } }>
                                                    x{ nextReward.amount || 1 }
                                                </span>
                                            </div>
                                            <span className="fw-bold text-dark text-truncate" style={ { fontSize: '11.5px', maxWidth: '95px' } }>{ nextReward.name }</span>
                                        </div>
                                    </div>
                                ) }

                                { /* Ranking Star */ }
                                <div className="d-flex flex-column align-items-center text-center">
                                    <span className="text-secondary fw-semibold mb-1" style={ { fontSize: '11px' } }>Vas en el puesto</span>
                                    <button 
                                        type="button" 
                                        className="bp-ranking-star-btn"
                                        onClick={ () => setShowRankingModal(true) }
                                        title="Clic para ver la tabla de clasificación Top 10">
                                        <div className="bp-ranking-star">
                                            { bpData.user.rankPosition || 1 }°
                                        </div>
                                    </button>
                                    <span className="text-muted" style={ { fontSize: '10px' } }>del ranking</span>
                                </div>

                            </div>
                        </div>
                    </div>

                    { /* Right Box: Retos por completar */ }
                    <div className="col-12 col-md-6">
                        <div className="bp-card-box h-100 d-flex flex-column justify-content-between">
                            <div className="d-flex align-items-center justify-content-between mb-1.5">
                                <span className="bp-box-header-title">RETOS POR COMPLETAR ({ pendingMissions.length })</span>
                                <span className="badge bg-primary text-white" style={ { fontSize: '11px' } }>{ completedMissions.length }/{ bpData.missions.length }</span>
                            </div>
                            <div className="d-flex flex-column gap-1.5 flex-grow-1 justify-content-center">
                                { quickPending.length > 0 ? quickPending.map(m => (
                                    <div key={ m.id } className="bp-quick-mission">
                                        <div className="d-flex flex-column align-items-center flex-shrink-0">
                                            <div className="p-1 rounded bg-white border d-flex align-items-center justify-content-center" style={ { width: 34, height: 34 } }>
                                                { m.image ? <img src={ m.image } alt="" style={ { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' } } /> : <span>🎯</span> }
                                            </div>
                                            <span className="badge bg-danger text-white mt-0.5" style={ { fontSize: '8.5px', padding: '1px 4px' } }>{ m.progress }/{ m.task }</span>
                                        </div>
                                        <div className="flex-grow-1 min-w-0">
                                            <div className="d-flex align-items-center justify-content-between">
                                                <span className="fw-bold text-dark text-truncate" style={ { fontSize: '12px' } }>{ m.name }</span>
                                                <span className="badge bg-danger text-white fw-bold px-1.5 py-0.5 rounded-1" style={ { fontSize: '9.5px' } }>+{ m.reward_xp } XP</span>
                                            </div>
                                            <div className="text-muted text-truncate" style={ { fontSize: '11px' } }>{ m.description }</div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center text-muted py-2" style={ { fontSize: '12px' } }>¡Has completado todos los retos activos!</div>
                                ) }
                            </div>
                        </div>
                    </div>

                </div>

                { /* Status message */ }
                { statusMessage && (
                    <div className={ `alert alert-${ statusMessage.type } py-1.5 px-3 mb-0 d-flex align-items-center justify-content-between rounded` } style={ { fontSize: '12px' } }>
                        <span>{ statusMessage.text }</span>
                        <button type="button" className="btn-close" style={ { fontSize: '10px' } } onClick={ () => setStatusMessage(null) } />
                    </div>
                ) }

                { /* Main Body: PREMIOS Vertical Track (Left) + RETOS (Right) */ }
                <div className="d-flex gap-2.5 flex-grow-1 bp-bottom-section">
                    
                    { /* Left Column: Premios Track */ }
                    <div className="bp-rewards-column bp-card-box">
                        <div className="d-flex align-items-center justify-content-between pb-1.5 border-bottom mb-1.5 px-2">
                            <span className="fw-bold text-primary" style={ { fontSize: '13px', letterSpacing: '0.6px' } }>GRATIS</span>
                            <span className="fw-bold text-warning" style={ { fontSize: '13px', letterSpacing: '0.6px' } }>VIP</span>
                        </div>
                        
                        <div className="bp-rewards-scroll-track flex-grow-1">
                            { /* Connecting background line */ }
                            <div className="bp-vertical-line" />

                            <div className="d-flex flex-column position-relative">
                                { bpData.rewards.map(r => {
                                    const isUnlocked = bpData.user.level >= r.level_required;
                                    const isFreeClaimed = claimedSet.has(`${ r.id }_0`);
                                    const isVipClaimed = claimedSet.has(`${ r.id }_1`);
                                    const isFreeClaimable = isUnlocked && !isFreeClaimed;
                                    const isVipClaimable = isUnlocked && bpData.isVip && !isVipClaimed;
                                    const isCurrentLevel = bpData.user.level === r.level_required;

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
                                                { renderRewardIcon(r.type, r.image, r.badge, r.point_type, false) }
                                                <span className="badge bg-danger text-white position-absolute bottom-0 end-0 p-0.5" style={ { fontSize: '8.5px', lineHeight: 1 } }>
                                                    x{ r.amount || 1 }
                                                </span>
                                                { isFreeClaimed && (
                                                    <span className="badge bg-success text-white position-absolute top-0 start-0 p-0.5" style={ { fontSize: '7px' } }>✓</span>
                                                ) }
                                            </div>

                                            { /* Level Node in Center */ }
                                            { isCurrentLevel ? (
                                                <div className="bp-level-node current-node" title={ `Nivel Actual: ${ r.level_required }` }>
                                                    <LayoutAvatarImageView figure={ userFigure || '' } direction={ 2 } headOnly={ true } scale={ 0.85 } />
                                                </div>
                                            ) : (
                                                <div className={ `bp-level-node ${ isUnlocked ? 'reached' : '' }` }>
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
                                                { renderRewardIcon(r.type_vip || r.type, r.image_vip, r.badge_vip, r.point_type_vip, true) }
                                                <span className="badge bg-warning text-dark position-absolute top-0 end-0 p-0.5 fw-bold" style={ { fontSize: '7px', lineHeight: 1 } }>VIP</span>
                                                <span className="badge bg-danger text-white position-absolute bottom-0 end-0 p-0.5" style={ { fontSize: '8.5px', lineHeight: 1 } }>
                                                    x{ r.amount_vip || 1 }
                                                </span>
                                                { (!isUnlocked || !bpData.isVip) && (
                                                    <span className="position-absolute bottom-0 start-0 p-0.5" style={ { fontSize: '10px' } }>🔒</span>
                                                ) }
                                                { isVipClaimed && (
                                                    <span className="badge bg-success text-white position-absolute top-0 start-0 p-0.5" style={ { fontSize: '7px' } }>✓</span>
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
                                { /* Header: Retos Info */ }
                                <div className="d-flex align-items-center gap-2.5 pb-2 mb-2 border-bottom">
                                    <img src="https://images.habbo.com/c_images/album1584/ACH_BattlePass1.gif" alt="" style={ { width: 32, height: 32 } } />
                                    <div>
                                        <div className="fw-bold text-dark" style={ { fontSize: '14px' } }>Retos</div>
                                        <div className="text-muted" style={ { fontSize: '11.5px' } }>Aquí encontrarás todo tipo de retos ¡cuantos más te pases más rápido subirás de nivel!</div>
                                    </div>
                                </div>

                                { /* 2x3 Grid of Category Cards */ }
                                <div className="row g-2.5 flex-grow-1">
                                    
                                    { /* Card 1: Primeros Retos */ }
                                    <div className="col-6">
                                        <div onClick={ () => setSelectedCategory(1) } className="bp-category-card h-100">
                                            <div className="d-flex gap-2.5">
                                                <div className="d-flex flex-column align-items-center flex-shrink-0">
                                                    <div className="bp-category-icon-box">
                                                        <img src={ categoryIcons[1] } alt="" style={ { maxWidth: '32px', maxHeight: '32px', objectFit: 'contain' } } />
                                                    </div>
                                                    <span className="badge bg-danger text-white mt-1" style={ { fontSize: '9px' } }>{ getCategoryCompleted(1) }/{ getCategoryMissions(1).length || 6 }</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="fw-bold text-dark d-block" style={ { fontSize: '12.5px' } }>PRIMEROS RETOS</span>
                                                    <span className="text-muted" style={ { fontSize: '10.5px', lineHeight: 1.25 } }>
                                                        Estas recompensas son para aquellos usuarios nuevos, te ayudarán a familiarizarte con este juego.
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    { /* Card 2: Retos Legendarios */ }
                                    <div className="col-6">
                                        <div onClick={ () => setSelectedCategory(6) } className="bp-category-card h-100">
                                            <div className="d-flex gap-2.5">
                                                <div className="d-flex flex-column align-items-center flex-shrink-0">
                                                    <div className="bp-category-icon-box">
                                                        <img src={ categoryIcons[6] } alt="" style={ { maxWidth: '32px', maxHeight: '32px', objectFit: 'contain' } } />
                                                    </div>
                                                    <span className="badge bg-danger text-white mt-1" style={ { fontSize: '9px' } }>{ getCategoryCompleted(6) }/{ getCategoryMissions(6).length || 10 }</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="fw-bold text-dark d-block" style={ { fontSize: '12.5px' } }>RETOS LEGENDARIOS</span>
                                                    <span className="text-muted" style={ { fontSize: '10.5px', lineHeight: 1.25 } }>
                                                        Estos retos son una verdadera leyenda en Habbten, subirás de nivel muy rápido si los desbloqueas todos.
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    { /* Card 3: Retos Diarios */ }
                                    <div className="col-6">
                                        <div onClick={ () => setSelectedCategory(2) } className="bp-category-card h-100">
                                            <div className="d-flex gap-2.5">
                                                <div className="d-flex flex-column align-items-center flex-shrink-0">
                                                    <div className="bp-category-icon-box">
                                                        <img src={ categoryIcons[2] } alt="" style={ { maxWidth: '32px', maxHeight: '32px', objectFit: 'contain' } } />
                                                    </div>
                                                    <span className="badge bg-danger text-white mt-1" style={ { fontSize: '9px' } }>{ getCategoryCompleted(2) }/{ getCategoryMissions(2).length || 10 }</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="d-flex align-items-center justify-content-between">
                                                        <span className="fw-bold text-dark" style={ { fontSize: '12.5px' } }>RETOS DIARIOS</span>
                                                        <div className="d-flex align-items-center gap-0.5 bg-dark text-white px-1.5 py-0.5 rounded font-monospace fw-bold" style={ { fontSize: '9px' } }>
                                                            <span>{ timeRemaining.hours }</span>:<span>{ timeRemaining.minutes }</span>:<span>{ timeRemaining.seconds }</span>
                                                        </div>
                                                    </div>
                                                    <span className="text-muted" style={ { fontSize: '10.5px', lineHeight: 1.25 } }>
                                                        Estos retos aparecerán cada 24h en el hotel ¡cúmplelos cada día! Son muy sencillos.
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    { /* Card 4: Retos Comunidad */ }
                                    <div className="col-6">
                                        <div onClick={ () => setSelectedCategory(5) } className="bp-category-card h-100">
                                            <div className="d-flex gap-2.5">
                                                <div className="d-flex flex-column align-items-center flex-shrink-0">
                                                    <div className="bp-category-icon-box">
                                                        <img src={ categoryIcons[5] } alt="" style={ { maxWidth: '32px', maxHeight: '32px', objectFit: 'contain' } } />
                                                    </div>
                                                    <span className="badge bg-danger text-white mt-1" style={ { fontSize: '9px' } }>{ getCategoryCompleted(5) }/{ getCategoryMissions(5).length || 8 }</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="fw-bold text-dark d-block" style={ { fontSize: '12.5px' } }>RETOS COMUNIDAD</span>
                                                    <span className="text-muted" style={ { fontSize: '10.5px', lineHeight: 1.25 } }>
                                                        Desafíos especiales de salas, interacción social, amistades y eventos de Habbten.
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    { /* Card 5: Retos Semanales */ }
                                    <div className="col-6">
                                        <div onClick={ () => setSelectedCategory(3) } className="bp-category-card h-100">
                                            <div className="d-flex gap-2.5">
                                                <div className="d-flex flex-column align-items-center flex-shrink-0">
                                                    <div className="bp-category-icon-box">
                                                        <img src={ categoryIcons[3] } alt="" style={ { maxWidth: '32px', maxHeight: '32px', objectFit: 'contain' } } />
                                                    </div>
                                                    <span className="badge bg-danger text-white mt-1" style={ { fontSize: '9px' } }>{ getCategoryCompleted(3) }/{ getCategoryMissions(3).length || 7 }</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="d-flex align-items-center justify-content-between">
                                                        <span className="fw-bold text-dark" style={ { fontSize: '12.5px' } }>RETOS SEMANALES</span>
                                                        <div className="d-flex align-items-center gap-0.5 bg-dark text-white px-1.5 py-0.5 rounded font-monospace fw-bold" style={ { fontSize: '9px' } }>
                                                            <span>{ timeRemaining.days }d</span> <span>{ timeRemaining.hours }h</span>
                                                        </div>
                                                    </div>
                                                    <span className="text-muted" style={ { fontSize: '10.5px', lineHeight: 1.25 } }>
                                                        Estos retos aparecerán cada 7 días en el hotel ¡requieren más dedicación pero dan más experiencia!
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    { /* Card 6: Retos Especiales */ }
                                    <div className="col-6">
                                        <div onClick={ () => setSelectedCategory(4) } className="bp-category-card h-100">
                                            <div className="d-flex gap-2.5">
                                                <div className="d-flex flex-column align-items-center flex-shrink-0">
                                                    <div className="bp-category-icon-box">
                                                        <img src={ categoryIcons[4] } alt="" style={ { maxWidth: '32px', maxHeight: '32px', objectFit: 'contain' } } />
                                                    </div>
                                                    <span className="badge bg-danger text-white mt-1" style={ { fontSize: '9px' } }>{ getCategoryCompleted(4) }/{ getCategoryMissions(4).length || 6 }</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="fw-bold text-dark d-block" style={ { fontSize: '12.5px' } }>RETOS ESPECIALES</span>
                                                    <span className="text-muted" style={ { fontSize: '10.5px', lineHeight: 1.25 } }>
                                                        Estos retos aparecen y desaparecen de la nada ¡son temporales y raros! ¡Estate muy atento!
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </>
                        ) : (
                            <>
                                { /* Header with Back Button */ }
                                <div className="d-flex align-items-center justify-content-between pb-2 mb-2 border-bottom">
                                    <div className="d-flex align-items-center gap-2.5">
                                        <Button size="sm" variant="secondary" onClick={ () => setSelectedCategory(null) } className="py-1 px-3" style={ { fontSize: '12px' } }>
                                            « Volver
                                        </Button>
                                        <span className="fw-bold text-dark" style={ { fontSize: '14px' } }>{ categoryTitles[selectedCategory] || 'Retos' }</span>
                                    </div>
                                    <span className="badge bg-primary text-white" style={ { fontSize: '11.5px' } }>
                                        { getCategoryCompleted(selectedCategory) } / { currentCategoryMissions.length } Completados
                                    </span>
                                </div>

                                { /* Challenges List */ }
                                <div className="overflow-auto pe-1.5 flex-grow-1 d-flex flex-column gap-2" style={ { maxHeight: '310px' } }>
                                    { currentCategoryMissions.map(m => (
                                        <div key={ m.id } className={ `bp-mission-row ${ m.completed ? 'completed' : '' }` }>
                                            <div className="d-flex flex-column align-items-center flex-shrink-0">
                                                <div className="p-1 rounded bg-white border d-flex align-items-center justify-content-center" style={ { width: 38, height: 38 } }>
                                                    { m.image ? <img src={ m.image } alt="" style={ { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' } } /> : <span>🎯</span> }
                                                </div>
                                                <span className="badge bg-danger text-white mt-1" style={ { fontSize: '9px' } }>{ m.progress }/{ m.task }</span>
                                            </div>
                                            <div className="flex-grow-1 min-w-0">
                                                <div className="d-flex align-items-center justify-content-between">
                                                    <span className="fw-bold text-dark text-truncate" style={ { fontSize: '13px' } }>{ m.name }</span>
                                                    <span className="badge bg-danger text-white fw-bold px-2 py-0.5 rounded-1" style={ { fontSize: '10.5px' } }>
                                                        +{ m.reward_xp } XP
                                                    </span>
                                                </div>
                                                <div className="text-muted text-truncate" style={ { fontSize: '11.5px' } }>{ m.description }</div>
                                                <div className="progress mt-1.5" style={ { height: '9px', backgroundColor: '#e2e8f0' } }>
                                                    <div 
                                                        className={ `progress-bar ${ m.completed ? 'bg-success' : 'bg-primary' }` } 
                                                        style={ { width: `${ Math.min(100, Math.round((m.progress / m.task) * 100)) }%` } }
                                                    />
                                                </div>
                                            </div>
                                            { m.completed && <span className="badge bg-success text-white flex-shrink-0" style={ { fontSize: '10.5px' } }>✓ Hecho</span> }
                                        </div>
                                    )) }
                                </div>
                            </>
                        ) }
                    </div>

                </div>

                { /* Ranking Leaderboard Modal */ }
                { showRankingModal && (
                    <div className="bp-modal-backdrop" onClick={ () => setShowRankingModal(false) }>
                        <div className="bp-dialog" style={ { width: '460px', maxWidth: '94%' } } onClick={ (e) => e.stopPropagation() }>
                            <div className="d-flex align-items-center justify-content-between pb-2 mb-3 border-bottom">
                                <div className="d-flex align-items-center gap-2.5">
                                    <img src="https://images.habbo.com/c_images/album1584/ACH_BattlePass1.gif" alt="" style={ { width: 32, height: 32 } } />
                                    <div>
                                        <div className="fw-bold text-dark" style={ { fontSize: '14.5px' } }>Tabla de Clasificación</div>
                                        <div className="text-muted" style={ { fontSize: '11px' } }>Top 10 usuarios con mayor nivel en el Pase de Batalla</div>
                                    </div>
                                </div>
                                <button type="button" className="btn-close" style={ { fontSize: '11px' } } onClick={ () => setShowRankingModal(false) } />
                            </div>

                            <div className="overflow-auto" style={ { maxHeight: '310px' } }>
                                <table className="bp-ranking-table">
                                    <thead>
                                        <tr>
                                            <th style={ { width: '70px' } }>Puesto</th>
                                            <th>Usuario</th>
                                            <th style={ { width: '100px' } }>Nivel</th>
                                            <th style={ { width: '90px' } }>XP</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        { bpData.ranking && bpData.ranking.length > 0 ? bpData.ranking.map((user, idx) => {
                                            const isMe = userInfo?.username === user.username;
                                            return (
                                                <tr key={ user.id } className={ isMe ? 'current-user-row' : '' }>
                                                    <td>
                                                        <span className={ `badge ${ idx === 0 ? 'bg-warning text-dark' : (idx === 1 ? 'bg-secondary text-white' : (idx === 2 ? 'bg-danger text-white' : 'bg-light text-dark border')) } fw-bold px-2.5 py-1` } style={ { fontSize: '11px' } }>
                                                            { idx + 1 }°
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <div className="bp-avatar-circle" style={ { width: 32, height: 32 } }>
                                                                <LayoutAvatarImageView figure={ user.look || '' } direction={ 2 } headOnly={ true } scale={ 0.7 } />
                                                            </div>
                                                            <span className="fw-bold text-dark" style={ { fontSize: '12.5px' } }>{ user.username }</span>
                                                            { isMe && <span className="badge bg-primary text-white" style={ { fontSize: '9px' } }>Tú</span> }
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="badge bg-primary text-white fw-bold" style={ { fontSize: '11px' } }>Nivel { user.level }</span>
                                                    </td>
                                                    <td>
                                                        <span className="fw-bold text-secondary" style={ { fontSize: '11.5px' } }>{ user.xp } XP</span>
                                                    </td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr>
                                                <td colSpan={ 4 } className="text-center text-muted py-3">No hay datos de clasificación aún.</td>
                                            </tr>
                                        ) }
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) }

                { /* Reward Preview Detail Modal */ }
                { previewReward && (
                    <div className="bp-modal-backdrop" onClick={ () => setPreviewReward(null) }>
                        <div className="bp-dialog" style={ { width: '320px', maxWidth: '92%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' } } onClick={ (e) => e.stopPropagation() }>
                            <div className="d-flex align-items-center justify-content-between w-100 mb-2">
                                <span className={ `badge ${ previewReward.isVip ? 'bg-warning text-dark' : 'bg-primary text-white' } fw-bold px-2.5 py-1` } style={ { fontSize: '11px' } }>
                                    { previewReward.isVip ? 'Pase VIP' : 'Pase Gratuito' } • Nivel { previewReward.reward.level_required }
                                </span>
                                <button type="button" className="btn-close" style={ { fontSize: '11px' } } onClick={ () => setPreviewReward(null) } />
                            </div>

                            <div className="bp-square-box my-3" style={ { width: 64, height: 64 } }>
                                { renderRewardIcon(
                                    previewReward.isVip ? (previewReward.reward.type_vip || previewReward.reward.type) : previewReward.reward.type,
                                    previewReward.isVip ? previewReward.reward.image_vip : previewReward.reward.image,
                                    previewReward.isVip ? previewReward.reward.badge_vip : previewReward.reward.badge,
                                    previewReward.isVip ? previewReward.reward.point_type_vip : previewReward.reward.point_type,
                                    previewReward.isVip
                                ) }
                            </div>

                            <span className="fw-bold text-dark mb-1.5" style={ { fontSize: '15px' } }>
                                { previewReward.isVip ? (previewReward.reward.name_vip || previewReward.reward.name) : previewReward.reward.name }
                            </span>

                            <span className="text-muted mb-3" style={ { fontSize: '12px' } }>
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
                                    return <span className="badge bg-secondary text-white py-2 px-3 w-100" style={ { fontSize: '12px' } }>✓ Recompensa ya reclamada</span>;
                                }
                                if(canClaim)
                                {
                                    return (
                                        <Button 
                                            variant={ previewReward.isVip ? 'warning' : 'success' }
                                            size="sm"
                                            disabled={ claiming !== null }
                                            onClick={ () => handleClaimReward(previewReward.reward.id, previewReward.isVip) }
                                            className="w-100 py-2 fw-bold shadow-xs"
                                            style={ { fontSize: '13px' } }>
                                            { claiming === `${ previewReward.reward.id }_${ previewReward.isVip ? 1 : 0 }` ? 'Reclamando...' : '¡Reclamar ahora!' }
                                        </Button>
                                    );
                                }
                                return (
                                    <span className="badge bg-light text-muted border py-2 px-3 w-100" style={ { fontSize: '12px' } }>
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
