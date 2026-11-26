import { FC, useCallback, useEffect, useState } from 'react';
import { GetRoomEngine } from '../../../../../api';
import { useEraTheme } from '../../../../../hooks/era/useEraTheme';
import { CatalogLayoutProps } from './CatalogLayout.types';
import ecotronMachineImg from '../../../../../assets/images/eras/flash2012/ecotron/ecotron_machine.png';
import iconEcotronHeaderImg from '../../../../../assets/images/eras/flash2012/ecotron/icon_ecotron_header.png';

interface RecyclableItem
{
    itemId: number;
    baseId: number;
    spriteId?: number;
    itemType?: string;
    itemName: string;
    publicName: string;
}

interface RecycleResult
{
    tier: { id: string; label: string; oddsText: string };
    prize: { baseId: number; spriteId?: number; itemType?: string; itemName: string; publicName: string };
}

const SLOT_COUNT = 12;

export const CatalogLayoutEcotronMachineView: FC<CatalogLayoutProps> = () =>
{
    const { currentEra } = useEraTheme();
    const [ slots, setSlots ] = useState<(RecyclableItem | null)[]>(() => Array(SLOT_COUNT).fill(null));
    const [ inventory, setInventory ] = useState<RecyclableItem[]>([]);
    const [ activeSlot, setActiveSlot ] = useState<number | null>(null);
    const [ loadingInv, setLoadingInv ] = useState(false);
    const [ recycling, setRecycling ] = useState(false);
    const [ result, setResult ] = useState<RecycleResult | null>(null);
    const [ errorMsg, setErrorMsg ] = useState<string>('');

    const loadInventory = useCallback(async () =>
    {
        setLoadingInv(true);
        try
        {
            const res = await fetch('/api/client/ecotron/inventory', { credentials: 'include' });
            const json = await res.json();
            if(json && json.success && Array.isArray(json.items))
            {
                setInventory(json.items);
            }
        }
        catch
        {
            // Ignore
        }
        finally
        {
            setLoadingInv(false);
        }
    }, []);

    useEffect(() =>
    {
        loadInventory();
    }, [ loadInventory ]);

    const usedIds = new Set(slots.filter(Boolean).map(s => s.itemId));
    const availableItems = inventory.filter(i => !usedIds.has(i.itemId));
    const filledCount = slots.filter(Boolean).length;
    const isReady = filledCount === SLOT_COUNT && !recycling;

    const getIconUrl = (spriteId: number, itemType?: string) =>
    {
        try
        {
            const engine = GetRoomEngine();
            if(!engine || !spriteId) return '';
            if(itemType === 'i') return engine.getFurnitureWallIconUrl(spriteId) || '';
            return engine.getFurnitureFloorIconUrl(spriteId) || '';
        }
        catch
        {
            return '';
        }
    };

    const handleSlotClick = (idx: number) =>
    {
        setErrorMsg('');
        if(slots[idx])
        {
            setSlots(prev =>
            {
                const next = [ ...prev ];
                next[idx] = null;
                return next;
            });
            return;
        }
        setActiveSlot(prev => (prev === idx ? null : idx));
    };

    const handlePickItem = (item: RecyclableItem) =>
    {
        setErrorMsg('');
        setSlots(prev =>
        {
            const next = [ ...prev ];
            const targetIdx = (activeSlot !== null && !next[activeSlot])
                ? activeSlot
                : next.findIndex(s => s === null);
            if(targetIdx === -1) return prev;
            next[targetIdx] = item;
            const nextEmpty = next.findIndex(s => s === null);
            setActiveSlot(nextEmpty === -1 ? null : nextEmpty);
            return next;
        });
    };

    const handleStartRecycle = async () =>
    {
        if(!isReady) return;
        setRecycling(true);
        setErrorMsg('');
        setResult(null);
        try
        {
            const itemIds = slots.map(s => s.itemId);
            const res = await fetch('/api/client/ecotron/recycle', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemIds })
            });
            const json = await res.json();
            if(json && json.success)
            {
                setResult({ tier: json.tier, prize: json.prize });
                setSlots(Array(SLOT_COUNT).fill(null));
                setActiveSlot(null);
                await loadInventory();
            }
            else
            {
                setErrorMsg(json?.error || 'No se pudo completar el reciclaje.');
            }
        }
        catch
        {
            setErrorMsg('Error de conexión con la Máquina Ecotrón.');
        }
        finally
        {
            setRecycling(false);
        }
    };

    return (
        <div className="ecotron-machine-page">
            { currentEra !== 'shockwave2006' && (
                <div className="ecotron-flat-banner">
                    <img src={ iconEcotronHeaderImg } alt="" width={ 36 } height={ 34 } className="ecotron-banner-ico" />
                    <div className="ecotron-banner-text">
                        <div className="ecotron-banner-title">Máquina Ecotrón</div>
                        <div className="ecotron-banner-desc">
                            Con esta Máquina Ecotrón podrás transformar tus viejos furnis en algo totalmente nuevo con lo que te podrás llevar una sorpresa. Para mejor explicación revisa la página de Información.
                        </div>
                    </div>
                </div>
            ) }

            <div className="ecotron-machine-art">
                <img
                    src={ ecotronMachineImg }
                    alt="Máquina Ecotrón"
                    width={ 173 }
                    height={ 190 }
                    className={ `ecotron-machine-img ${ recycling ? 'is-running' : '' }` }
                />
            </div>

            { result && (
                <div className="ecotron-result-banner">
                    <img src={ getIconUrl(result.prize.spriteId ?? result.prize.baseId, result.prize.itemType) } alt="" className="ecotron-result-ico" style={ { imageRendering: 'pixelated' } } />
                    <div className="ecotron-result-txt">
                        <b>¡Premio { result.tier.label }!</b> Ganaste <u>{ result.prize.publicName }</u>. ¡Revisa tu inventario!
                    </div>
                </div>
            ) }

            { errorMsg && <div className="ecotron-error-banner">{ errorMsg }</div> }

            <div className="ecotron-slots-grid">
                { slots.map((item, idx) => (
                    <button
                        key={ idx }
                        type="button"
                        className={ `ecotron-slot ${ item ? 'is-filled' : '' } ${ activeSlot === idx ? 'is-selected' : '' }` }
                        title={ item ? `${ item.publicName } (clic para quitar)` : `Ranura ${ idx + 1 }: clic para añadir furni` }
                        onClick={ () => handleSlotClick(idx) }
                    >
                        { item && (
                            <img
                                src={ getIconUrl(item.spriteId ?? item.baseId, item.itemType) }
                                alt=""
                                className="ecotron-slot-ico"
                                style={ { imageRendering: 'pixelated' } }
                            />
                        ) }
                    </button>
                )) }
            </div>

            <div className="ecotron-controls-row">
                <button
                    type="button"
                    className={ `ecotron-start-btn ${ isReady ? 'is-ready' : '' }` }
                    disabled={ !isReady }
                    onClick={ handleStartRecycle }
                >
                    { recycling ? 'Reciclando...' : '¡Empezar!' }
                </button>
            </div>

            { activeSlot !== null && (
                <div className="ecotron-picker-tray">
                    <div className="ecotron-picker-head">
                        <span>Elige un furni de tu inventario ({ availableItems.length } disponibles)</span>
                        <button type="button" onClick={ () => setActiveSlot(null) }>Cerrar</button>
                    </div>
                    <div className="ecotron-picker-grid">
                        { loadingInv && <span className="ecotron-picker-empty">Cargando inventario...</span> }
                        { !loadingInv && availableItems.length === 0 && (
                            <span className="ecotron-picker-empty">No tienes más furnis reciclables en tu inventario.</span>
                        ) }
                        { !loadingInv && availableItems.slice(0, 48).map(item => (
                            <button
                                key={ item.itemId }
                                type="button"
                                className="ecotron-picker-item"
                                title={ item.publicName }
                                onClick={ () => handlePickItem(item) }
                            >
                                <img
                                    src={ getIconUrl(item.spriteId ?? item.baseId, item.itemType) }
                                    alt=""
                                    style={ { imageRendering: 'pixelated' } }
                                />
                            </button>
                        )) }
                    </div>
                </div>
            ) }
        </div>
    );
};
