import { FC, useMemo } from 'react';
import { GetConfiguration } from '../../../../api';
import { LayoutImage } from '../../../../common/layout/LayoutImage';

export interface CatalogIconViewProps
{
    icon: number;
}

export const CatalogIconView: FC<CatalogIconViewProps> = props =>
{
    const { icon = 0 } = props;

    const getIconUrl = useMemo(() =>
    {
        const iconTemplate = GetConfiguration<string>('catalog.asset.icon.url', 'http://127.0.0.1:1080/game/swf/c_images/catalogue/icon_%name%.png');
        if(!iconTemplate) return null;
        return iconTemplate.replace('%name%', icon.toString());
    }, [ icon ]);

    if(!getIconUrl) return null;

    return <LayoutImage imageUrl={ getIconUrl } style={ { width: 20, height: 20 } } />;
}
