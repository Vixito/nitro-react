import { ILinkEventTracker } from '@nitrots/nitro-renderer';
import { FC, useEffect, useState } from 'react';
import { AddEventLinkTracker, GetSessionDataManager, RemoveLinkEventTracker } from '../../api';
import { Base, Button, Column, Flex, LayoutProgressBar, NitroCardContentView, NitroCardHeaderView, NitroCardSubHeaderView, NitroCardTabsItemView, NitroCardTabsView, NitroCardView, Text } from '../../common';

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
    name_vip: string;
    image_vip: string;
    type_vip: string;
    badge_vip: string;
}

export const BattlePassView: FC<{}> = props =>
{
    const [ isVisible, setIsVisible ] = useState(false);
    const [ currentTab, setCurrentTab ] = useState<'missions' | 'rewards'>('missions');
    const [ missionFilter, setMissionFilter ] = useState<number>(0);
    const [ loading, setLoading ] = useState(false);
    const [ bpData, setBpData ] = useState<{
        seasonEnd: number;
        user: { level: number; xp: number; xpNext: number };
        missions: Mission[];
        rewards: Reward[];
    }>({
        seasonEnd: 0,
        user: { level: 1, xp: 0, xpNext: 100 },
        missions: [],
        rewards: []
    });

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
                    seasonEnd: data.seasonEnd,
                    user: data.user,
                    missions: data.missions || [],
                    rewards: data.rewards || []
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

    if(!isVisible) return null;

    const filteredMissions = missionFilter === 0 
        ? bpData.missions 
        : bpData.missions.filter(m => m.category === missionFilter);

    const completedCount = bpData.missions.filter(m => m.completed).length;

    return (
        <NitroCardView uniqueKey="battle-pass" className="nitro-battle-pass" theme="primary" style={ { width: '520px', minHeight: '440px' } }>
            <NitroCardHeaderView headerText="Pase de Batalla Habbten" onCloseClick={ () => setIsVisible(false) } />
            
            <NitroCardSubHeaderView className="p-2 align-items-center justify-content-between">
                <Flex alignItems="center" gap={ 2 } className="w-100">
                    <div className="badge bg-warning text-dark p-2 fs-6 fw-bold">
                        Nv. { bpData.user.level }
                    </div>
                    <Column grow gap={ 0 }>
                        <Flex justifyContent="between" alignItems="center">
                            <Text bold>Nivel de Temporada { bpData.user.level }</Text>
                            <span className="badge bg-primary">🏆 Temporada Activa</span>
                        </Flex>
                        <LayoutProgressBar 
                            text={ `${ bpData.user.xp } / ${ bpData.user.xpNext } XP` } 
                            progress={ bpData.user.xp } 
                            maxProgress={ bpData.user.xpNext || 100 } 
                        />
                    </Column>
                </Flex>
            </NitroCardSubHeaderView>

            <NitroCardTabsView>
                <NitroCardTabsItemView isActive={ currentTab === 'missions' } onClick={ () => setCurrentTab('missions') }>
                    🎯 Misiones ({ completedCount }/{ bpData.missions.length })
                </NitroCardTabsItemView>
                <NitroCardTabsItemView isActive={ currentTab === 'rewards' } onClick={ () => setCurrentTab('rewards') }>
                    🎁 Recompensas de Nivel
                </NitroCardTabsItemView>
            </NitroCardTabsView>

            <NitroCardContentView className="p-2" gap={ 1 }>
                { loading && (
                    <Flex center className="p-4">
                        <Text>Cargando información del Pase de Batalla...</Text>
                    </Flex>
                ) }

                { !loading && currentTab === 'missions' && (
                    <Column gap={ 1 } grow>
                        <Flex gap={ 1 } className="mb-1">
                            <Button size="sm" variant={ missionFilter === 0 ? 'primary' : 'secondary' } onClick={ () => setMissionFilter(0) }>
                                Todas ({ bpData.missions.length })
                            </Button>
                            <Button size="sm" variant={ missionFilter === 1 ? 'primary' : 'secondary' } onClick={ () => setMissionFilter(1) }>
                                Diarias
                            </Button>
                            <Button size="sm" variant={ missionFilter === 2 ? 'primary' : 'secondary' } onClick={ () => setMissionFilter(2) }>
                                Semanales
                            </Button>
                            <Button size="sm" variant={ missionFilter === 3 ? 'primary' : 'secondary' } onClick={ () => setMissionFilter(3) }>
                                Especiales
                            </Button>
                        </Flex>

                        <Column gap={ 1 } overflow="auto" style={ { maxHeight: '280px' } }>
                            { filteredMissions.map(m => (
                                <Flex key={ m.id } alignItems="center" gap={ 2 } className={ "p-2 rounded border " + (m.completed ? "bg-success-subtle border-success" : "bg-light border-muted") }>
                                    <div style={ { width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' } }>
                                        <img src={ m.image } alt="" style={ { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' } } />
                                    </div>
                                    <Column grow gap={ 0 }>
                                        <Flex justifyContent="between" alignItems="center">
                                            <Text bold>{ m.name }</Text>
                                            <span className="badge bg-warning text-dark font-bold">+{ m.reward_xp } XP</span>
                                        </Flex>
                                        <Text small className="text-muted mb-1">{ m.description }</Text>
                                        <LayoutProgressBar 
                                            text={ `${ m.progress } / ${ m.task }` } 
                                            progress={ m.progress } 
                                            maxProgress={ m.task } 
                                        />
                                    </Column>
                                    { m.completed && <span className="badge bg-success ms-1">✓</span> }
                                </Flex>
                            )) }
                        </Column>
                    </Column>
                ) }

                { !loading && currentTab === 'rewards' && (
                    <Column gap={ 1 } overflow="auto" style={ { maxHeight: '310px' } }>
                        { bpData.rewards.map(r => {
                            const isUnlocked = bpData.user.level >= r.level_required;
                            return (
                                <Flex key={ r.id } alignItems="center" justifyContent="between" gap={ 2 } className={ "p-2 rounded border " + (isUnlocked ? "bg-success-subtle border-success" : "bg-light border-muted opacity-75") }>
                                    <Flex alignItems="center" gap={ 2 }>
                                        <div className="badge bg-primary fs-6 p-2">
                                            Nv. { r.level_required }
                                        </div>
                                        <Column gap={ 0 }>
                                            <Text bold>{ r.name } <span className="text-muted">(Pase Gratuito)</span></Text>
                                            <Text small className="text-primary fw-semibold">{ r.name_vip } <span className="badge bg-warning text-dark">VIP</span></Text>
                                        </Column>
                                    </Flex>
                                    <span className={ "badge " + (isUnlocked ? "bg-success" : "bg-secondary") }>
                                        { isUnlocked ? "✓ Desbloqueado" : `🔒 Nv. ${ r.level_required }` }
                                    </span>
                                </Flex>
                            );
                        }) }
                    </Column>
                ) }
            </NitroCardContentView>
        </NitroCardView>
    );
};
