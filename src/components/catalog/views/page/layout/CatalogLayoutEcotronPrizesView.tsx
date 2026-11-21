import { FC, useEffect, useState } from 'react';
import { GetRoomEngine } from '../../../../../api';
import { useEraTheme } from '../../../../../hooks/era/useEraTheme';
import { CatalogLayoutProps } from './CatalogLayout.types';
import iconPrizesHeaderImg from '../../../../../assets/images/eras/flash2012/ecotron/icon_prizes_header.png';

interface EcotronTier
{
    id: string;
    label: string;
    oddsText: string;
    items: { baseId: number; itemName: string; publicName: string }[];
}

export const CatalogLayoutEcotronPrizesView: FC<CatalogLayoutProps> = () =>
{
    const { currentEra } = useEraTheme();
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
            { currentEra !== 'shockwave2006' && (
                <div className="ecotron-flat-banner">
                    <img src={ iconPrizesHeaderImg } alt="" width={ 36 } height={ 36 } className="ecotron-banner-ico" />
                    <div className="ecotron-banner-text">
                        <div className="ecotron-banner-title">Premios</div>
                        <div className="ecotron-banner-desc">Consulta las probabilidades de cada premio disponible en la Máquina Ecotrón.</div>
                    </div>
                </div>
            ) }
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
