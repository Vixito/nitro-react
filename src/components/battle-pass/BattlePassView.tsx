import { ILinkEventTracker } from '@nitrots/nitro-renderer';
import { FC, useEffect, useState } from 'react';
import { AddEventLinkTracker, GetSessionDataManager, RemoveLinkEventTracker } from '../../api';
import { Base, Button, Column, Flex, LayoutAvatarImageView, LayoutProgressBar, NitroCardContentView, NitroCardHeaderView, NitroCardView, Text } from '../../common';
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
    name_vip: string;
    image_vip: string;
    type_vip: string;
    badge_vip: string;
}

export const BattlePassView: FC<{}> = props =>
{
    const [ isVisible, setIsVisible ] = useState(false);
    const [ selectedCategory, setSelectedCategory ] = useState<number | null>(null);
    const [ loading, setLoading ] = useState(false);
    const { userInfo = null, userFigure = null } = useSessionInfo();
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

    const completedMissions = bpData.missions.filter(m => m.completed);
    const pendingMissions = bpData.missions.filter(m => !m.completed);
    const quickPending = pendingMissions.slice(0, 2);

    const getCategoryMissions = (cat: number) => {
        if(cat === 4) return bpData.missions.filter(m => m.category === 4 || m.category === 5);
        return bpData.missions.filter(m => m.category === cat);
    };

    const getCategoryCompleted = (cat: number) => {
        return getCategoryMissions(cat).filter(m => m.completed).length;
    };

    const nextReward = bpData.rewards.find(r => r.level_required > bpData.user.level) || bpData.rewards[0];

    const currentCategoryMissions = selectedCategory !== null ? getCategoryMissions(selectedCategory) : [];

    const categoryTitles: { [key: number]: string } = {
        1: 'Primeros Retos',
        2: 'Retos Diarios',
        3: 'Retos Semanales',
        4: 'Retos Especiales'
    };

    const xpPercent = Math.min(100, Math.round((bpData.user.xp / (bpData.user.xpNext || 100)) * 100));

    return (
        <NitroCardView uniqueKey="battle-pass" className="nitro-battle-pass" theme="primary-slim" style={ { width: '750px', maxWidth: '96vw', minHeight: '520px' } }>
            <NitroCardHeaderView headerText="PASE DE BATALLA - Llegar al máximo nivel" onCloseClick={ () => setIsVisible(false) } />
            
            <NitroCardContentView className="p-3" style={ { backgroundColor: '#ededed', color: '#333' } } gap={ 2 }>
                
                { /* Top Bar: Temporada y Cuenta Regresiva */ }
                <div className="d-flex align-items-center justify-content-between px-3 py-1 bg-white border rounded shadow-sm text-xs">
                    <span className="text-secondary fw-semibold">
                        Actualmente nos encontramos en <strong>Temporada 1</strong>, la experiencia y los premios se reiniciarán en:
                    </span>
                    <div className="d-flex align-items-center gap-1 bg-dark text-white px-2 py-0.5 rounded font-monospace fw-bold" style={ { letterSpacing: '1px' } }>
                        <span>11</span>:<span>00</span>:<span>33</span>
                    </div>
                </div>

                { /* Top Section: MI EXPERIENCIA + RETOS POR COMPLETAR */ }
                <div className="row g-2">
                    { /* Left Box: Mi Experiencia */ }
                    <div className="col-12 col-md-6">
                        <div className="p-2.5 bg-white border rounded shadow-sm h-100 d-flex flex-column justify-content-between">
                            <div className="text-uppercase text-secondary fw-bold" style={ { fontSize: '10px', letterSpacing: '0.5px' } }>
                                Mi Experiencia
                            </div>
                            <div className="d-flex align-items-center gap-2 mt-1">
                                <div className="rounded-circle border bg-light d-flex align-items-center justify-content-center flex-shrink-0" style={ { width: 44, height: 44, overflow: 'hidden' } }>
                                    <LayoutAvatarImageView figure={ userFigure || '' } direction={ 2 } headOnly={ true } scale={ 0.9 } />
                                </div>
                                <div className="flex-grow-1 min-w-0">
                                    <div className="d-flex align-items-center justify-content-between mb-1">
                                        <span className="fw-bold text-dark text-truncate" style={ { fontSize: '13px' } }>
                                            { userInfo?.username || 'Habbo' }
                                        </span>
                                        <span className="badge bg-secondary text-white fw-bold px-2 py-0.5 rounded-pill" style={ { fontSize: '10px' } }>
                                            NIVEL { bpData.user.level }
                                        </span>
                                    </div>
                                    <div className="d-flex align-items-center gap-1.5">
                                        <div className="progress flex-grow-1" style={ { height: '14px', backgroundColor: '#333', borderRadius: '7px' } }>
                                            <div 
                                                className="progress-bar progress-bar-striped bg-warning" 
                                                style={ { width: xpPercent + '%' } }
                                            />
                                        </div>
                                        <span className="badge bg-dark text-warning fw-bold px-1.5 py-0.5 rounded" style={ { fontSize: '10px' } }>
                                            { bpData.user.level + 1 }
                                        </span>
                                    </div>
                                </div>
                            </div>
                            { nextReward && (
                                <div className="d-flex align-items-center justify-content-between mt-2 pt-1 border-top text-xs">
                                    <span className="text-muted" style={ { fontSize: '11px' } }>Próximo premio:</span>
                                    <div className="d-flex align-items-center gap-1.5 bg-light px-2 py-0.5 border rounded">
                                        <img src={ nextReward.image } alt="" style={ { width: 18, height: 18, objectFit: 'contain' } } />
                                        <span className="fw-bold text-dark" style={ { fontSize: '11px' } }>{ nextReward.name }</span>
                                    </div>
                                </div>
                            ) }
                        </div>
                    </div>

                    { /* Right Box: Retos por completar */ }
                    <div className="col-12 col-md-6">
                        <div className="p-2.5 bg-white border rounded shadow-sm h-100 d-flex flex-column">
                            <div className="d-flex align-items-center justify-content-between text-uppercase text-secondary fw-bold mb-1" style={ { fontSize: '10px', letterSpacing: '0.5px' } }>
                                <span>Retos por completar ({ pendingMissions.length })</span>
                                <span className="badge bg-primary text-white">{ completedMissions.length }/{ bpData.missions.length }</span>
                            </div>
                            <div className="d-flex flex-column gap-1.5 flex-grow-1 justify-content-center">
                                { quickPending.length > 0 ? quickPending.map(m => (
                                    <div key={ m.id } className="d-flex align-items-center gap-2 p-1.5 bg-light border rounded">
                                        <img src={ m.image } alt="" style={ { width: 26, height: 26, objectFit: 'contain', flexShrink: 0 } } />
                                        <div className="flex-grow-1 min-w-0">
                                            <div className="d-flex align-items-center justify-content-between">
                                                <span className="fw-bold text-dark text-truncate" style={ { fontSize: '11px' } }>{ m.name }</span>
                                                <span className="badge bg-danger text-white fw-bold px-1 py-0.5 rounded" style={ { fontSize: '9px' } }>+{ m.reward_xp } XP</span>
                                            </div>
                                            <div className="text-muted text-truncate" style={ { fontSize: '10px' } }>{ m.description }</div>
                                        </div>
                                        <span className="badge bg-secondary text-white" style={ { fontSize: '9px' } }>{ m.progress }/{ m.task }</span>
                                    </div>
                                )) : (
                                    <div className="text-center text-muted text-xs py-2">¡Has completado todos los retos activos!</div>
                                ) }
                            </div>
                        </div>
                    </div>
                </div>

                { /* Main Body: PREMIOS Track (Left) + RETOS (Right) */ }
                <div className="row g-2 flex-grow-1" style={ { minHeight: '290px' } }>
                    
                    { /* Left Column: Premios Track */ }
                    <div className="col-12 col-md-4">
                        <div className="p-2 bg-white border rounded shadow-sm h-100 d-flex flex-column">
                            <div className="d-flex align-items-center justify-content-between text-uppercase text-secondary fw-bold pb-1 border-bottom mb-1" style={ { fontSize: '10px', letterSpacing: '0.5px' } }>
                                <span>Premios (Free)</span>
                                <span>VIP</span>
                            </div>
                            <div className="overflow-auto pe-1 flex-grow-1" style={ { maxHeight: '255px' } }>
                                <div className="d-flex flex-column gap-2 py-1 position-relative">
                                    { bpData.rewards.map(r => {
                                        const isUnlocked = bpData.user.level >= r.level_required;
                                        return (
                                            <div key={ r.id } className="d-flex align-items-center justify-content-between gap-1 p-1 rounded border bg-light">
                                                { /* Free Reward */ }
                                                <div 
                                                    className={ `p-1 rounded border d-flex align-items-center justify-content-center position-relative ${ isUnlocked ? 'bg-white border-success' : 'bg-white border-secondary-subtle' }` }
                                                    style={ { width: 40, height: 40 } }
                                                    title={ r.name }>
                                                    <img src={ r.image } alt="" style={ { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' } } />
                                                    <span className="badge bg-danger text-white position-absolute bottom-0 end-0 p-0.5" style={ { fontSize: '8px', lineHeight: 1 } }>x1</span>
                                                </div>

                                                { /* Level Badge */ }
                                                <div className={ `badge rounded-pill fw-bold px-2 py-1 ${ isUnlocked ? 'bg-success text-white' : 'bg-dark text-white' }` } style={ { fontSize: '10px', minWidth: '32px' } }>
                                                    { r.level_required }
                                                </div>

                                                { /* VIP Reward */ }
                                                <div 
                                                    className={ `p-1 rounded border d-flex align-items-center justify-content-center position-relative ${ isUnlocked ? 'bg-warning-subtle border-warning' : 'bg-white border-secondary-subtle opacity-75' }` }
                                                    style={ { width: 40, height: 40 } }
                                                    title={ r.name_vip }>
                                                    <img src={ r.image_vip } alt="" style={ { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' } } />
                                                    <span className="badge bg-warning text-dark position-absolute top-0 end-0 p-0.5" style={ { fontSize: '7px', lineHeight: 1 } }>VIP</span>
                                                </div>
                                            </div>
                                        );
                                    }) }
                                </div>
                            </div>
                        </div>
                    </div>

                    { /* Right Column: Retos Area */ }
                    <div className="col-12 col-md-8">
                        <div className="p-2.5 bg-white border rounded shadow-sm h-100 d-flex flex-column">
                            
                            { selectedCategory === null ? (
                                <>
                                    { /* Header: Retos Info */ }
                                    <div className="d-flex align-items-center gap-2 pb-2 mb-2 border-bottom">
                                        <div className="badge bg-warning text-dark p-2 rounded-circle">🏆</div>
                                        <div>
                                            <div className="fw-bold text-dark text-sm">Categorías de Retos</div>
                                            <div className="text-muted text-xs">Cumple retos para subir de nivel y desbloquear recompensas.</div>
                                        </div>
                                    </div>

                                    { /* 2x2 Grid of Category Cards */ }
                                    <div className="row g-2 flex-grow-1">
                                        { /* Card 1: Primeros Retos */ }
                                        <div className="col-6">
                                            <div 
                                                onClick={ () => setSelectedCategory(1) }
                                                className="p-2.5 bg-light hover:bg-secondary-subtle border rounded h-100 d-flex flex-column justify-content-between cursor-pointer transition shadow-xs">
                                                <div>
                                                    <div className="d-flex align-items-center justify-content-between mb-1">
                                                        <span className="fw-bold text-dark text-xs">PRIMEROS RETOS</span>
                                                        <span className="badge bg-primary text-white" style={ { fontSize: '9px' } }>{ getCategoryCompleted(1) }/{ getCategoryMissions(1).length }</span>
                                                    </div>
                                                    <div className="text-muted" style={ { fontSize: '10px', lineHeight: 1.3 } }>
                                                        Recompensas para nuevos usuarios, te ayudarán a familiarizarte con el hotel.
                                                    </div>
                                                </div>
                                                <Button size="sm" variant="outline-primary" className="w-100 mt-2 py-0.5" style={ { fontSize: '10px' } }>Ver retos »</Button>
                                            </div>
                                        </div>

                                        { /* Card 2: Retos Diarios */ }
                                        <div className="col-6">
                                            <div 
                                                onClick={ () => setSelectedCategory(2) }
                                                className="p-2.5 bg-light hover:bg-secondary-subtle border rounded h-100 d-flex flex-column justify-content-between cursor-pointer transition shadow-xs">
                                                <div>
                                                    <div className="d-flex align-items-center justify-content-between mb-1">
                                                        <span className="fw-bold text-dark text-xs">RETOS DIARIOS</span>
                                                        <span className="badge bg-primary text-white" style={ { fontSize: '9px' } }>{ getCategoryCompleted(2) }/{ getCategoryMissions(2).length }</span>
                                                    </div>
                                                    <div className="text-muted" style={ { fontSize: '10px', lineHeight: 1.3 } }>
                                                        Aparecen cada 24h en el hotel ¡cúmplelos cada día! Son sencillos y rápidos.
                                                    </div>
                                                </div>
                                                <Button size="sm" variant="outline-primary" className="w-100 mt-2 py-0.5" style={ { fontSize: '10px' } }>Ver retos »</Button>
                                            </div>
                                        </div>

                                        { /* Card 3: Retos Semanales */ }
                                        <div className="col-6">
                                            <div 
                                                onClick={ () => setSelectedCategory(3) }
                                                className="p-2.5 bg-light hover:bg-secondary-subtle border rounded h-100 d-flex flex-column justify-content-between cursor-pointer transition shadow-xs">
                                                <div>
                                                    <div className="d-flex align-items-center justify-content-between mb-1">
                                                        <span className="fw-bold text-dark text-xs">RETOS SEMANALES</span>
                                                        <span className="badge bg-primary text-white" style={ { fontSize: '9px' } }>{ getCategoryCompleted(3) }/{ getCategoryMissions(3).length }</span>
                                                    </div>
                                                    <div className="text-muted" style={ { fontSize: '10px', lineHeight: 1.3 } }>
                                                        Se renuevan cada 7 días ¡requieren más dedicación pero dan más experiencia!
                                                    </div>
                                                </div>
                                                <Button size="sm" variant="outline-primary" className="w-100 mt-2 py-0.5" style={ { fontSize: '10px' } }>Ver retos »</Button>
                                            </div>
                                        </div>

                                        { /* Card 4: Retos Especiales */ }
                                        <div className="col-6">
                                            <div 
                                                onClick={ () => setSelectedCategory(4) }
                                                className="p-2.5 bg-light hover:bg-secondary-subtle border rounded h-100 d-flex flex-column justify-content-between cursor-pointer transition shadow-xs">
                                                <div>
                                                    <div className="d-flex align-items-center justify-content-between mb-1">
                                                        <span className="fw-bold text-dark text-xs">RETOS ESPECIALES</span>
                                                        <span className="badge bg-primary text-white" style={ { fontSize: '9px' } }>{ getCategoryCompleted(4) }/{ getCategoryMissions(4).length }</span>
                                                    </div>
                                                    <div className="text-muted" style={ { fontSize: '10px', lineHeight: 1.3 } }>
                                                        Retos temporales y legendarios con recompensas masivas de experiencia.
                                                    </div>
                                                </div>
                                                <Button size="sm" variant="outline-primary" className="w-100 mt-2 py-0.5" style={ { fontSize: '10px' } }>Ver retos »</Button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    { /* Header with Back Button */ }
                                    <div className="d-flex align-items-center justify-content-between pb-2 mb-2 border-bottom">
                                        <div className="d-flex align-items-center gap-2">
                                            <Button size="sm" variant="secondary" onClick={ () => setSelectedCategory(null) } className="py-0.5 px-2 text-xs">
                                                « Volver
                                            </Button>
                                            <span className="fw-bold text-dark text-sm">{ categoryTitles[selectedCategory] || 'Retos' }</span>
                                        </div>
                                        <span className="badge bg-primary text-white">
                                            { getCategoryCompleted(selectedCategory) } / { currentCategoryMissions.length } Completados
                                        </span>
                                    </div>

                                    { /* Challenges List */ }
                                    <div className="overflow-auto pe-1 flex-grow-1 d-flex flex-column gap-1.5" style={ { maxHeight: '235px' } }>
                                        { currentCategoryMissions.map(m => (
                                            <div key={ m.id } className={ `p-2 rounded border d-flex align-items-center gap-2 ${ m.completed ? 'bg-success-subtle border-success' : 'bg-light border-secondary-subtle' }` }>
                                                <div className="p-1 rounded bg-white border d-flex align-items-center justify-content-center flex-shrink-0" style={ { width: 34, height: 34 } }>
                                                    <img src={ m.image } alt="" style={ { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' } } />
                                                </div>
                                                <div className="flex-grow-1 min-w-0">
                                                    <div className="d-flex align-items-center justify-content-between">
                                                        <span className="fw-bold text-dark text-truncate text-xs">{ m.name }</span>
                                                        <span className="badge bg-danger text-white fw-bold px-1.5 py-0.5 rounded" style={ { fontSize: '9px' } }>
                                                            +{ m.reward_xp } XP
                                                        </span>
                                                    </div>
                                                    <div className="text-muted text-truncate" style={ { fontSize: '10px' } }>{ m.description }</div>
                                                    <div className="progress mt-1" style={ { height: '8px', backgroundColor: '#ddd' } }>
                                                        <div 
                                                            className={ `progress-bar ${ m.completed ? 'bg-success' : 'bg-primary' }` } 
                                                            style={ { width: Math.min(100, Math.round((m.progress / m.task) * 100)) + '%' } }
                                                        />
                                                    </div>
                                                </div>
                                                <div className="d-flex flex-column align-items-end flex-shrink-0">
                                                    <span className="text-muted font-monospace" style={ { fontSize: '10px' } }>{ m.progress }/{ m.task }</span>
                                                    { m.completed && <span className="badge bg-success text-white mt-0.5" style={ { fontSize: '8px' } }>✓ Hecho</span> }
                                                </div>
                                            </div>
                                        )) }
                                    </div>
                                </>
                            ) }
                        </div>
                    </div>
                </div>
            </NitroCardContentView>
        </NitroCardView>
    );
};
