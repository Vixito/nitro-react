import { FC, useEffect, useState } from 'react';
import { AddEventLinkTracker, CreateLinkEvent, GetSessionDataManager, ILinkEventTracker, LocalizeText, RemoveLinkEventTracker } from '../../api';
import { AutoGrid, Base, Button, Column, Flex, Grid, LayoutBadgeImageView, NitroCardContentView, NitroCardHeaderView, NitroCardTabsItemView, NitroCardTabsView, NitroCardView, Text } from '../../common';

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

    const xpPercent = Math.min(100, Math.round((bpData.user.xp / (bpData.user.xpNext || 100)) * 100));

    return (
        <NitroCardView uniqueKey="battle-pass" className="nitro-battle-pass w-[540px] max-w-[95vw] shadow-2xl">
            <NitroCardHeaderView headerText="Pase de Batalla Habbten" onCloseClick={ () => setIsVisible(false) } />
            
            { /* Header con nivel y progreso de XP */ }
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 p-3 text-white border-b border-indigo-700/50">
                <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-lg shadow-lg border border-amber-300">
                            { bpData.user.level }
                        </div>
                        <div>
                            <div className="font-bold text-sm text-amber-300">Nivel de Temporada { bpData.user.level }</div>
                            <div className="text-xs text-indigo-200">{ bpData.user.xp } / { bpData.user.xpNext } XP para el siguiente nivel</div>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[11px] bg-indigo-950/80 px-2.5 py-1 rounded-full border border-indigo-500/30 text-indigo-200">
                            🏆 Temporada Activa
                        </span>
                    </div>
                </div>
                <div className="w-full bg-indigo-950 rounded-full h-3 overflow-hidden border border-indigo-500/40">
                    <div 
                        className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 h-full transition-all duration-500 shadow-sm"
                        style={{ width: `${ xpPercent }%` }}
                    />
                </div>
            </div>

            <NitroCardTabsView>
                <NitroCardTabsItemView isActive={ currentTab === 'missions' } onClick={ () => setCurrentTab('missions') }>
                    🎯 Misiones ({ bpData.missions.filter(m => m.completed).length }/{ bpData.missions.length })
                </NitroCardTabsItemView>
                <NitroCardTabsItemView isActive={ currentTab === 'rewards' } onClick={ () => setCurrentTab('rewards') }>
                    🎁 Recompensas de Nivel
                </NitroCardTabsItemView>
            </NitroCardTabsView>

            <NitroCardContentView className="h-[360px] overflow-y-auto p-3 bg-[#1e293b]/95 text-white">
                { loading && (
                    <div className="flex items-center justify-center h-full text-indigo-300 text-sm">
                        <div className="animate-spin w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full mr-2" />
                        Cargando Pase de Batalla...
                    </div>
                ) }

                { !loading && currentTab === 'missions' && (
                    <div className="space-y-3">
                        { /* Categorias de misiones */ }
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                            <button 
                                onClick={ () => setMissionFilter(0) }
                                className={ `px-2.5 py-1 rounded-lg font-medium transition ${ missionFilter === 0 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700' }` }>
                                Todas ({ bpData.missions.length })
                            </button>
                            <button 
                                onClick={ () => setMissionFilter(1) }
                                className={ `px-2.5 py-1 rounded-lg font-medium transition ${ missionFilter === 1 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700' }` }>
                                Diarias
                            </button>
                            <button 
                                onClick={ () => setMissionFilter(2) }
                                className={ `px-2.5 py-1 rounded-lg font-medium transition ${ missionFilter === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700' }` }>
                                Semanales
                            </button>
                            <button 
                                onClick={ () => setMissionFilter(3) }
                                className={ `px-2.5 py-1 rounded-lg font-medium transition ${ missionFilter === 3 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700' }` }>
                                Especiales
                            </button>
                        </div>

                        { /* Lista de Misiones */ }
                        <div className="grid grid-cols-1 gap-2">
                            { filteredMissions.map(m => {
                                const progPercent = Math.min(100, Math.round((m.progress / m.task) * 100));
                                return (
                                    <div key={ m.id } className={ `p-2.5 rounded-xl border flex items-center gap-3 transition ${ m.completed ? 'bg-emerald-950/40 border-emerald-500/40' : 'bg-slate-800/80 border-slate-700/60 hover:border-indigo-500/50' }` }>
                                        <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 p-1">
                                            <img src={ m.image } alt="" className="max-w-full max-h-full object-contain" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-bold text-xs text-slate-100 truncate">{ m.name }</span>
                                                <span className="text-[11px] font-black text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30 shrink-0">
                                                    +{ m.reward_xp } XP
                                                </span>
                                            </div>
                                            <div className="text-[11px] text-slate-400 mt-0.5 truncate">{ m.description }</div>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <div className="flex-1 bg-slate-900 rounded-full h-1.5 overflow-hidden">
                                                    <div className={ `h-full rounded-full ${ m.completed ? 'bg-emerald-400' : 'bg-indigo-400' }` } style={{ width: `${ progPercent }%` }} />
                                                </div>
                                                <span className="text-[10px] font-medium text-slate-400 shrink-0">{ m.progress } / { m.task }</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }) }
                        </div>
                    </div>
                ) }

                { !loading && currentTab === 'rewards' && (
                    <div className="space-y-2.5">
                        { bpData.rewards.map(r => {
                            const isUnlocked = bpData.user.level >= r.level_required;
                            return (
                                <div key={ r.id } className={ `p-3 rounded-xl border flex items-center justify-between gap-3 ${ isUnlocked ? 'bg-indigo-950/50 border-indigo-500/50' : 'bg-slate-800/60 border-slate-700/50 opacity-75' }` }>
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center font-bold text-xs text-amber-400">
                                            Nv. { r.level_required }
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-200">Recompensa Gratuita: <span className="text-amber-300">{ r.name }</span></div>
                                            <div className="text-[11px] text-purple-300 font-medium">Recompensa VIP: <span>{ r.name_vip }</span></div>
                                        </div>
                                    </div>
                                    <div>
                                        { isUnlocked ? (
                                            <span className="text-xs px-2.5 py-1 rounded bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 font-semibold">
                                                ✓ Desbloqueado
                                            </span>
                                        ) : (
                                            <span className="text-xs px-2.5 py-1 rounded bg-slate-800 border border-slate-600 text-slate-400 font-medium">
                                                🔒 Requiere Nv. { r.level_required }
                                            </span>
                                        ) }
                                    </div>
                                </div>
                            );
                        }) }
                    </div>
                ) }
            </NitroCardContentView>
        </NitroCardView>
    );
};
