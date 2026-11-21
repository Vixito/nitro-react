import { FC, useEffect, useState } from 'react';
import { GetRoomEngine } from '../../../../../api';
import { CatalogLayoutProps } from './CatalogLayout.types';

interface EcotronTier
{
    id: string;
    label: string;
    oddsText: string;
    items: { baseId: number; itemName: string; publicName: string }[];
}

export const CatalogLayoutEcotronPrizesView: FC<CatalogLayoutProps> = () =>
{
    const [ tiers, setTiers ] = useState<EcotronTier[]>([]);

    useEffect(() =>
    {
        fetch('/api/client/ecotron/prizes', { credentials: 'include' })
            .then(r => r.json())
            .then(json =>
            {
                if(json && json.success && Array.isArray(json.tiers))
                {
                    setTiers(json.tiers);
                }
            })
            .catch(() => {});
    }, []);

    const getIconUrl = (baseId: number) =>
    {
        try
        {
            return GetRoomEngine()?.getFurnitureFloorIconUrl(baseId) || '';
        }
        catch
        {
            return '';
        }
    };

    return (
        <div className="ecotron-prizes-page">
            <div className="ecotron-prizes-grid">
                { tiers.map(tier => (
                    <div key={ tier.id } className="ecotron-prize-group">
                        <div className="ecotron-prize-tier-title">{ tier.label }</div>
                        <div className="ecotron-prize-tier-odds">{ tier.oddsText }</div>
                        <div className="ecotron-prize-tray">
                            { tier.items.map(item => (
                                <div key={ item.baseId } className="ecotron-prize-tile" title={ item.publicName }>
                                    <img src={ getIconUrl(item.baseId) } alt={ item.publicName } />
                                </div>
                            )) }
                        </div>
                    </div>
                )) }
            </div>
        </div>
    );
};
