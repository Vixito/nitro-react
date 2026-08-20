import { ILinkEventTracker } from '@nitrots/nitro-renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { AddEventLinkTracker, GetSessionDataManager, RemoveLinkEventTracker } from '../../api';
import { Base, Button, Column, Flex, LayoutAvatarImageView, LayoutBadgeImageView, LayoutCurrencyIcon, NitroCardContentView, NitroCardHeaderView, NitroCardView, Text } from '../../common';
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
    const [ activeTab, setActiveTab ] = useState<'rewards' | 'missions' | 'ranking'>('rewards');
    const [ selectedCategory, setSelectedCategory ] = useState<number | null>(null);
    const [ loading, setLoading ] = useState(false);
    const [ claiming, setClaiming ] = useState<string | null>(null);
    const [ statusMessage, setStatusMessage ] = useState<{ text: string; type: 'success' | 'danger' } | null>(null);
    const [ previewReward, setPreviewReward ] = useState<{ reward: Reward; isVip: boolean } | null>(null);

    const { userInfo = null, userFigure = null } = useSessionInfo();
    const [ timeRemaining, setTimeRemaining ] = useState({ days: '00', hours: '00', minutes: '00', seconds: '00' });
    
    const [ bpData, setBpData ] = useState<{
        seasonEnd: number;
        user: { level: number; xp: number; xpNext: number; rankPosition?: number };
        isVip: boolean;
        claimedRewards: ClaimedReward[];
        missions: Mission[];
        rewards: Reward[];
        ranking: RankingUser[];
    }>({
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
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
        const diffMs = Math.max(0, nextMonth.getTime() - now.getTime());
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
            updateCountdown();
            const userId = GetSessionDataManager().userId;
            const res = await fetch(`/api/battlepass/data?user_id=${ userId }`);
            const data = await res.json();
            if(data.success)
            {
                setBpData({
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

    const handleClaimAll = async () =>
    {
        try
        {
            setClaiming('all');
            setStatusMessage(null);
            const userId = GetSessionDataManager().userId;
            const res = await fetch('/api/battlepass/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, claim_all: true })
            });
            const data = await res.json();
            if(data.success)
            {
                setStatusMessage({ text: data.message || '¡Todas las recompensas disponibles han sido reclamadas!', type: 'success' });
                fetchData();
            }
            else
            {
                setStatusMessage({ text: data.error || 'No hay recompensas disponibles para reclamar.', type: 'danger' });
            }
        }
        catch(err)
        {
            console.error('Error claiming all rewards:', err);
            setStatusMessage({ text: 'Error al procesar el reclamo múltiple.', type: 'danger' });
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
        const timer = setInterval(updateCountdown, 1000);
        return () => clearInterval(timer);
    }, [ isVisible ]);

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

    // Total claimable rewards count
    const claimableCount = useMemo(() =>
    {
        let count = 0;
        for(const r of bpData.rewards)
        {
            if(bpData.user.level >= r.level_required)
            {
                if(!claimedSet.has(`${ r.id }_0`)) count++;
                if(bpData.isVip && !claimedSet.has(`${ r.id }_1`)) count++;
            }
        }
        return count;
    }, [ bpData.rewards, bpData.user.level, bpData.isVip, claimedSet ]);

    if(!isVisible) return null;

    const completedMissions = bpData.missions.filter(m => m.completed);
    const pendingMissions = bpData.missions.filter(m => !m.completed);

    const categoryNames: { [key: number]: string } = {
        1: 'Principiante',
        2: 'Diarios',
        3: 'Semanales',
        4: 'Especiales'
    };

    const getFilteredMissions = () =>
    {
        if(selectedCategory === null) return bpData.missions;
        if(selectedCategory === 4) return bpData.missions.filter(m => m.category === 4 || m.category === 5);
        return bpData.missions.filter(m => m.category === selectedCategory);
    };

    const xpPercent = Math.min(100, Math.round((bpData.user.xp / (bpData.user.xpNext || 100)) * 100));

    const renderRewardIcon = (type: string, imgUrl: string, badgeCode: string, pointType: number = 0, isVip: boolean = false) =>
    {
        if(badgeCode && badgeCode.length > 0 && badgeCode !== 'BR058')
        {
            return <LayoutBadgeImageView badgeCode={ badgeCode } isGroup={ false } />;
        }
        if(type === 'points')
        {
            return <LayoutCurrencyIcon type={ pointType || 5 } />;
        }
        if(type === 'credits')
        {
            return <LayoutCurrencyIcon type={ -1 } />;
        }
        if(type === 'pixels')
        {
            return <LayoutCurrencyIcon type={ 0 } />;
        }
        if(imgUrl && imgUrl.length > 0)
        {
            return <img src={ imgUrl } alt="" style={ { maxWidth: '30px', maxHeight: '30px', objectFit: 'contain' } } />;
        }
        return <LayoutCurrencyIcon type={ isVip ? 5 : -1 } />;
    };

    return (
        <NitroCardView uniqueKey="battle-pass" className="nitro-battle-pass" theme="primary-slim">
            <NitroCardHeaderView headerText="PASE DE BATALLA HABBTIEN" onCloseClick={ () => setIsVisible(false) } />
            
            <NitroCardContentView className="p-2 bp-content d-flex flex-column gap-2">
                
                { /* Top Bar: Profile, Level, XP, Season countdown */ }
                <div className="bp-hero-card p-2 d-flex align-items-center justify-content-between gap-3">
                    
                    { /* Avatar & Level Progress */ }
                    <div className="d-flex align-items-center gap-2 flex-grow-1 min-w-0">
                        <div className="bp-avatar-frame">
                            <LayoutAvatarImageView figure={ userFigure || '' } direction={ 2 } headOnly={ true } scale={ 0.95 } />
                        </div>
                        <div className="flex-grow-1 min-w-0" style={ { maxWidth: '340px' } }>
                            <div className="d-flex align-items-center gap-2 mb-1">
                                <span className="fw-bold text-dark text-truncate" style={ { fontSize: '13px' } }>
                                    { userInfo?.username || 'Habbten' }
                                </span>
                                <span className="badge bg-primary text-white fw-bold px-2 py-0.5 rounded-pill" style={ { fontSize: '10px' } }>
                                    Nivel { bpData.user.level }
                                </span>
                                { bpData.isVip ? (
                                    <span className="badge bg-warning text-dark fw-bold px-2 py-0.5 rounded-pill" style={ { fontSize: '10px' } }>
                                        Pase VIP Activo
                                    </span>
                                ) : (
                                    <span className="badge bg-secondary text-white px-2 py-0.5 rounded-pill" style={ { fontSize: '10px' } }>
                                        Pase Estándar
                                    </span>
                                ) }
                            </div>
                            
                            { /* XP Bar */ }
                            <div className="bp-xp-bar-container">
                                <div className="bp-xp-bar-fill" style={ { width: `${ xpPercent }%` } } />
                                <span className="position-absolute w-100 top-0 text-center text-white fw-bold" style={ { fontSize: '10px', lineHeight: '16px', textShadow: '0 1px 2px rgba(0,0,0,0.8)' } }>
                                    { bpData.user.xp } / { bpData.user.xpNext || 100 } XP ({ xpPercent }%)
                                </span>
                            </div>
                        </div>
                    </div>

                    { /* Quick Stats & Season Timer */ }
                    <div className="d-flex align-items-center gap-3 flex-shrink-0">
                        { /* Rank Position */ }
                        <div className="d-flex flex-column align-items-center text-center px-2 py-1 bg-light border rounded">
                            <span className="text-secondary fw-semibold" style={ { fontSize: '9px', textTransform: 'uppercase' } }>Puesto</span>
                            <span className="fw-bold text-dark" style={ { fontSize: '13px' } }>
                                #{ bpData.user.rankPosition || 1 }
                            </span>
                        </div>

                        { /* Season Countdown */ }
                        <div className="d-flex flex-column align-items-end">
                            <span className="text-secondary fw-semibold mb-0.5" style={ { fontSize: '10px' } }>
                                Temporada 1 finaliza en:
                            </span>
                            <div className="d-flex align-items-center gap-1">
                                <div className="d-flex flex-column align-items-center">
                                    <span className="bp-timer-block">{ timeRemaining.days }</span>
                                    <span style={ { fontSize: '8px', color: '#64748b', fontWeight: 600 } }>Días</span>
                                </div>
                                <span className="fw-bold text-muted" style={ { marginTop: '-8px' } }>:</span>
                                <div className="d-flex flex-column align-items-center">
                                    <span className="bp-timer-block">{ timeRemaining.hours }</span>
                                    <span style={ { fontSize: '8px', color: '#64748b', fontWeight: 600 } }>Horas</span>
                                </div>
                                <span className="fw-bold text-muted" style={ { marginTop: '-8px' } }>:</span>
                                <div className="d-flex flex-column align-items-center">
                                    <span className="bp-timer-block">{ timeRemaining.minutes }</span>
                                    <span style={ { fontSize: '8px', color: '#64748b', fontWeight: 600 } }>Min</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                { /* Navigation Tabs */ }
                <div className="d-flex align-items-center justify-content-between">
                    <div className="bp-tabs-bar flex-grow-1">
                        <button 
                            className={ `bp-tab-btn ${ activeTab === 'rewards' ? 'active' : '' }` }
                            onClick={ () => setActiveTab('rewards') }>
                            <span>Pase de Recompensas</span>
                            { claimableCount > 0 && (
                                <span className="badge bg-danger text-white rounded-pill px-1.5 py-0.5" style={ { fontSize: '9px' } }>
                                    { claimableCount }
                                </span>
                            ) }
                        </button>
                        <button 
                            className={ `bp-tab-btn ${ activeTab === 'missions' ? 'active' : '' }` }
                            onClick={ () => setActiveTab('missions') }>
                            <span>Retos y Misiones</span>
                            <span className="badge bg-secondary text-white rounded-pill px-1.5 py-0.5" style={ { fontSize: '9px' } }>
                                { pendingMissions.length }
                            </span>
                        </button>
                        <button 
                            className={ `bp-tab-btn ${ activeTab === 'ranking' ? 'active' : '' }` }
                            onClick={ () => setActiveTab('ranking') }>
                            <span>Clasificación</span>
                        </button>
                    </div>

                    { activeTab === 'rewards' && claimableCount > 0 && (
                        <Button 
                            variant="success" 
                            size="sm" 
                            disabled={ claiming === 'all' }
                            onClick={ handleClaimAll }
                            className="px-3 py-1 fw-bold shadow-xs">
                            { claiming === 'all' ? 'Reclamando...' : `Reclamar Todo (${ claimableCount })` }
                        </Button>
                    ) }
                </div>

                { /* Status Notification Banner */ }
                { statusMessage && (
                    <div className={ `alert alert-${ statusMessage.type } py-1 px-3 mb-0 d-flex align-items-center justify-content-between rounded` } style={ { fontSize: '11px' } }>
                        <span>{ statusMessage.text }</span>
                        <button type="button" className="btn-close" style={ { fontSize: '8px' } } onClick={ () => setStatusMessage(null) } />
                    </div>
                ) }

                { /* Tab 1: Rewards Track */ }
                { activeTab === 'rewards' && (
                    <div className="bp-track-wrapper flex-grow-1 d-flex flex-column">
                        { /* Track Legend */ }
                        <div className="d-flex align-items-center justify-content-between px-3 py-1.5 bg-light border-bottom">
                            <div className="d-flex align-items-center gap-3">
                                <div className="d-flex align-items-center gap-1.5">
                                    <div className="rounded" style={ { width: 12, height: 12, background: '#2563eb' } } />
                                    <span className="fw-bold text-dark" style={ { fontSize: '11px' } }>Pase Gratuito</span>
                                </div>
                                <div className="d-flex align-items-center gap-1.5">
                                    <div className="rounded" style={ { width: 12, height: 12, background: '#f59e0b' } } />
                                    <span className="fw-bold text-dark" style={ { fontSize: '11px' } }>Pase VIP (Oro)</span>
                                </div>
                            </div>
                            <span className="text-secondary" style={ { fontSize: '11px' } }>
                                Sube de nivel completando retos para desbloquear cada premio.
                            </span>
                        </div>

                        { /* Horizontal Scrollable Progression Grid */ }
                        <div className="bp-track-scroll flex-grow-1">
                            { bpData.rewards.map(reward => {
                                const isUnlocked = bpData.user.level >= reward.level_required;
                                const isFreeClaimed = claimedSet.has(`${ reward.id }_0`);
                                const isVipClaimed = claimedSet.has(`${ reward.id }_1`);
                                const isFreeClaimable = isUnlocked && !isFreeClaimed;
                                const isVipClaimable = isUnlocked && bpData.isVip && !isVipClaimed;

                                return (
                                    <div key={ reward.id } className="bp-tier-column">
                                        
                                        { /* Free Track Card (Top) */ }
                                        <div 
                                            className={ `bp-reward-card ${ isFreeClaimed ? 'claimed' : (isFreeClaimable ? 'claimable' : (isUnlocked ? 'unlocked' : 'locked')) }` }
                                            onClick={ () => setPreviewReward({ reward, isVip: false }) }
                                            title={ `${ reward.name } (Clic para ver detalles)` }>
                                            <div className="d-flex align-items-center justify-content-between w-100">
                                                <span className="badge bg-primary text-white" style={ { fontSize: '8px', padding: '2px 4px' } }>GRATIS</span>
                                                { reward.amount && reward.amount > 1 ? (
                                                    <span className="badge bg-secondary text-white" style={ { fontSize: '8px' } }>x{ reward.amount }</span>
                                                ) : null }
                                            </div>
                                            
                                            <div className="bp-reward-icon-box my-1">
                                                { renderRewardIcon(reward.type, reward.image, reward.badge, reward.point_type, false) }
                                            </div>
                                            
                                            <span className="fw-bold text-dark text-truncate text-center w-100" style={ { fontSize: '10px', lineHeight: 1.2 } }>
                                                { reward.name }
                                            </span>

                                            <div className="mt-1 w-100">
                                                { isFreeClaimed ? (
                                                    <span className="badge bg-secondary text-white w-100 py-1" style={ { fontSize: '9px' } }>Reclamado</span>
                                                ) : isFreeClaimable ? (
                                                    <Button 
                                                        variant="success" 
                                                        size="sm" 
                                                        disabled={ claiming === `${ reward.id }_0` }
                                                        onClick={ (e) => { e.stopPropagation(); handleClaimReward(reward.id, false); } }
                                                        className="w-100 py-0.5 fw-bold" 
                                                        style={ { fontSize: '9px' } }>
                                                        { claiming === `${ reward.id }_0` ? '...' : 'Reclamar' }
                                                    </Button>
                                                ) : (
                                                    <span className="badge bg-light text-muted border w-100 py-1" style={ { fontSize: '8px' } }>Bloqueado</span>
                                                ) }
                                            </div>
                                        </div>

                                        { /* Level Milestone Node (Center) */ }
                                        <div className={ `bp-tier-indicator ${ bpData.user.level === reward.level_required ? 'current' : (isUnlocked ? 'reached' : '') }` }>
                                            { reward.level_required }
                                        </div>

                                        { /* VIP Track Card (Bottom) */ }
                                        <div 
                                            className={ `bp-reward-card vip-card ${ isVipClaimed ? 'claimed' : (isVipClaimable ? 'claimable' : (isUnlocked ? 'unlocked' : 'locked')) }` }
                                            onClick={ () => setPreviewReward({ reward, isVip: true }) }
                                            title={ `${ reward.name_vip || reward.name } (Pase VIP)` }>
                                            <div className="d-flex align-items-center justify-content-between w-100">
                                                <span className="badge bg-warning text-dark fw-bold" style={ { fontSize: '8px', padding: '2px 4px' } }>VIP</span>
                                                { reward.amount_vip && reward.amount_vip > 1 ? (
                                                    <span className="badge bg-dark text-warning" style={ { fontSize: '8px' } }>x{ reward.amount_vip }</span>
                                                ) : null }
                                            </div>
                                            
                                            <div className="bp-reward-icon-box my-1">
                                                { renderRewardIcon(reward.type_vip || reward.type, reward.image_vip, reward.badge_vip, reward.point_type_vip, true) }
                                            </div>
                                            
                                            <span className="fw-bold text-dark text-truncate text-center w-100" style={ { fontSize: '10px', lineHeight: 1.2 } }>
                                                { reward.name_vip || reward.name }
                                            </span>

                                            <div className="mt-1 w-100">
                                                { isVipClaimed ? (
                                                    <span className="badge bg-secondary text-white w-100 py-1" style={ { fontSize: '9px' } }>Reclamado</span>
                                                ) : isVipClaimable ? (
                                                    <Button 
                                                        variant="warning" 
                                                        size="sm" 
                                                        disabled={ claiming === `${ reward.id }_1` }
                                                        onClick={ (e) => { e.stopPropagation(); handleClaimReward(reward.id, true); } }
                                                        className="w-100 py-0.5 fw-bold text-dark" 
                                                        style={ { fontSize: '9px' } }>
                                                        { claiming === `${ reward.id }_1` ? '...' : 'Reclamar VIP' }
                                                    </Button>
                                                ) : (
                                                    <span className="badge bg-light text-muted border w-100 py-1" style={ { fontSize: '8px' } }>
                                                        { !bpData.isVip ? 'VIP Requerido' : 'Bloqueado' }
                                                    </span>
                                                ) }
                                            </div>
                                        </div>

                                    </div>
                                );
                            }) }
                        </div>
                    </div>
                ) }

                { /* Tab 2: Missions & Quests */ }
                { activeTab === 'missions' && (
                    <div className="p-2.5 bg-white border rounded flex-grow-1 d-flex flex-column gap-2 overflow-hidden">
                        { /* Category Filter Pills */ }
                        <div className="d-flex align-items-center gap-2 flex-wrap pb-1 border-bottom">
                            <button 
                                className={ `bp-mission-filter-btn ${ selectedCategory === null ? 'active' : '' }` }
                                onClick={ () => setSelectedCategory(null) }>
                                Todos ({ bpData.missions.length })
                            </button>
                            <button 
                                className={ `bp-mission-filter-btn ${ selectedCategory === 1 ? 'active' : '' }` }
                                onClick={ () => setSelectedCategory(1) }>
                                Principiante
                            </button>
                            <button 
                                className={ `bp-mission-filter-btn ${ selectedCategory === 2 ? 'active' : '' }` }
                                onClick={ () => setSelectedCategory(2) }>
                                Diarios
                            </button>
                            <button 
                                className={ `bp-mission-filter-btn ${ selectedCategory === 3 ? 'active' : '' }` }
                                onClick={ () => setSelectedCategory(3) }>
                                Semanales
                            </button>
                            <button 
                                className={ `bp-mission-filter-btn ${ selectedCategory === 4 ? 'active' : '' }` }
                                onClick={ () => setSelectedCategory(4) }>
                                Especiales
                            </button>
                        </div>

                        { /* Missions Grid / List */ }
                        <div className="overflow-auto pe-1 flex-grow-1 d-flex flex-column gap-2" style={ { maxHeight: '350px' } }>
                            { getFilteredMissions().length > 0 ? getFilteredMissions().map(mission => (
                                <div key={ mission.id } className={ `bp-mission-card ${ mission.completed ? 'completed' : '' }` }>
                                    <div className="bp-mission-icon-box">
                                        { mission.image && mission.image.length > 0 ? (
                                            <img src={ mission.image } alt="" style={ { maxWidth: '28px', maxHeight: '28px', objectFit: 'contain' } } />
                                        ) : (
                                            <span style={ { fontSize: '16px' } }>🎯</span>
                                        ) }
                                    </div>

                                    <div className="flex-grow-1 min-w-0">
                                        <div className="d-flex align-items-center justify-content-between mb-0.5">
                                            <div className="d-flex align-items-center gap-2">
                                                <span className="fw-bold text-dark" style={ { fontSize: '12px' } }>{ mission.name }</span>
                                                <span className="badge bg-light text-secondary border" style={ { fontSize: '9px' } }>
                                                    { categoryNames[mission.category] || 'Misión' }
                                                </span>
                                            </div>
                                            <span className="badge bg-danger text-white fw-bold px-2 py-0.5" style={ { fontSize: '10px' } }>
                                                +{ mission.reward_xp } XP
                                            </span>
                                        </div>

                                        <div className="text-secondary text-truncate mb-1" style={ { fontSize: '11px' } }>
                                            { mission.description }
                                        </div>

                                        <div className="d-flex align-items-center gap-2">
                                            <div className="progress flex-grow-1" style={ { height: '8px', backgroundColor: '#e2e8f0' } }>
                                                <div 
                                                    className={ `progress-bar ${ mission.completed ? 'bg-success' : 'bg-primary' }` }
                                                    style={ { width: `${ Math.min(100, Math.round((mission.progress / mission.task) * 100)) }%` } }
                                                />
                                            </div>
                                            <span className="text-muted fw-bold" style={ { fontSize: '10px', minWidth: '40px', textAlign: 'right' } }>
                                                { mission.progress } / { mission.task }
                                            </span>
                                        </div>
                                    </div>

                                    { mission.completed && (
                                        <span className="badge bg-success text-white px-2 py-1 rounded" style={ { fontSize: '10px' } }>
                                            Completada
                                        </span>
                                    ) }
                                </div>
                            )) : (
                                <div className="text-center text-muted py-4" style={ { fontSize: '12px' } }>
                                    No hay misiones disponibles en esta categoría.
                                </div>
                            ) }
                        </div>
                    </div>
                ) }

                { /* Tab 3: Ranking */ }
                { activeTab === 'ranking' && (
                    <div className="p-2.5 bg-white border rounded flex-grow-1 d-flex flex-column gap-2 overflow-hidden">
                        <div className="d-flex align-items-center justify-content-between pb-1 border-bottom">
                            <div>
                                <span className="fw-bold text-dark d-block" style={ { fontSize: '13px' } }>Tabla de Clasificación Habbten</span>
                                <span className="text-secondary" style={ { fontSize: '11px' } }>Los usuarios con mayor nivel y experiencia del Pase de Batalla</span>
                            </div>
                            <span className="badge bg-primary text-white px-2 py-1">Top 10 Hotel</span>
                        </div>

                        <div className="overflow-auto flex-grow-1" style={ { maxHeight: '350px' } }>
                            <table className="bp-ranking-table">
                                <thead>
                                    <tr>
                                        <th style={ { width: '60px' } }>Puesto</th>
                                        <th>Usuario</th>
                                        <th style={ { width: '120px' } }>Nivel</th>
                                        <th style={ { width: '120px' } }>Experiencia</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    { bpData.ranking && bpData.ranking.length > 0 ? bpData.ranking.map((user, index) => {
                                        const isCurrentUser = userInfo?.username === user.username;
                                        return (
                                            <tr key={ user.id } className={ isCurrentUser ? 'current-user-row' : '' }>
                                                <td>
                                                    <span className={ `badge ${ index === 0 ? 'bg-warning text-dark' : (index === 1 ? 'bg-secondary text-white' : (index === 2 ? 'bg-danger text-white' : 'bg-light text-dark border')) } fw-bold px-2 py-1` } style={ { fontSize: '11px' } }>
                                                        { index + 1 }º
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="d-flex align-items-center gap-2">
                                                        <div className="bp-avatar-frame" style={ { width: 32, height: 32 } }>
                                                            <LayoutAvatarImageView figure={ user.look || '' } direction={ 2 } headOnly={ true } scale={ 0.8 } />
                                                        </div>
                                                        <span className="fw-bold text-dark" style={ { fontSize: '12px' } }>{ user.username }</span>
                                                        { isCurrentUser && <span className="badge bg-primary text-white" style={ { fontSize: '9px' } }>Tú</span> }
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="badge bg-primary text-white fw-bold px-2 py-1" style={ { fontSize: '11px' } }>
                                                        Nivel { user.level }
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="fw-bold text-secondary" style={ { fontSize: '11px' } }>
                                                        { user.xp } XP
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={ 4 } className="text-center text-muted py-4">No hay datos de clasificación disponibles aún.</td>
                                        </tr>
                                    ) }
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) }

                { /* Reward Preview Detail Modal */ }
                { previewReward && (
                    <div className="bp-preview-modal-backdrop" onClick={ () => setPreviewReward(null) }>
                        <div className="bp-preview-modal" onClick={ (e) => e.stopPropagation() }>
                            <div className="d-flex align-items-center justify-content-between w-100 mb-2">
                                <span className={ `badge ${ previewReward.isVip ? 'bg-warning text-dark' : 'bg-primary text-white' } fw-bold` }>
                                    { previewReward.isVip ? 'Pase VIP' : 'Pase Gratuito' } • Nivel { previewReward.reward.level_required }
                                </span>
                                <button type="button" className="btn-close" style={ { fontSize: '10px' } } onClick={ () => setPreviewReward(null) } />
                            </div>

                            <div className="bp-reward-icon-box my-2" style={ { width: 64, height: 64 } }>
                                { renderRewardIcon(
                                    previewReward.isVip ? (previewReward.reward.type_vip || previewReward.reward.type) : previewReward.reward.type,
                                    previewReward.isVip ? previewReward.reward.image_vip : previewReward.reward.image,
                                    previewReward.isVip ? previewReward.reward.badge_vip : previewReward.reward.badge,
                                    previewReward.isVip ? previewReward.reward.point_type_vip : previewReward.reward.point_type,
                                    previewReward.isVip
                                ) }
                            </div>

                            <span className="fw-bold text-dark mb-1" style={ { fontSize: '14px' } }>
                                { previewReward.isVip ? (previewReward.reward.name_vip || previewReward.reward.name) : previewReward.reward.name }
                            </span>

                            <span className="text-muted mb-3" style={ { fontSize: '11px' } }>
                                { previewReward.isVip 
                                    ? 'Recompensa especial exclusiva para miembros VIP de Habbten.' 
                                    : 'Recompensa desbloqueable para todos los usuarios de Habbten.' }
                            </span>

                            { /* Claim button in modal */ }
                            { (() => {
                                const isUnlocked = bpData.user.level >= previewReward.reward.level_required;
                                const isClaimed = claimedSet.has(`${ previewReward.reward.id }_${ previewReward.isVip ? 1 : 0 }`);
                                const canClaim = isUnlocked && !isClaimed && (!previewReward.isVip || bpData.isVip);

                                if(isClaimed)
                                {
                                    return <span className="badge bg-secondary text-white py-2 px-4 w-100" style={ { fontSize: '11px' } }>Recompensa ya reclamada</span>;
                                }
                                if(canClaim)
                                {
                                    return (
                                        <Button 
                                            variant={ previewReward.isVip ? 'warning' : 'success' }
                                            size="sm"
                                            disabled={ claiming !== null }
                                            onClick={ () => handleClaimReward(previewReward.reward.id, previewReward.isVip) }
                                            className="w-100 py-1.5 fw-bold shadow-xs">
                                            { claiming === `${ previewReward.reward.id }_${ previewReward.isVip ? 1 : 0 }` ? 'Reclamando...' : '¡Reclamar ahora!' }
                                        </Button>
                                    );
                                }
                                return (
                                    <span className="badge bg-light text-muted border py-2 px-4 w-100" style={ { fontSize: '11px' } }>
                                        { !isUnlocked ? `Requiere Nivel ${ previewReward.reward.level_required }` : 'Requiere Membresía VIP' }
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
