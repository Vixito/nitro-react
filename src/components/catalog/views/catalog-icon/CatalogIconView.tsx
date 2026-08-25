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
        if(icon === 800)
        {
            const imgLib = GetConfiguration<string>('image.library.url', 'http://127.0.0.1:1080/game/swf/c_images/');
            return imgLib.endsWith('/') ? imgLib + 'catalogue/vip.gif' : imgLib + '/catalogue/vip.gif';
        }
        const iconTemplate = GetConfiguration<string>('catalog.asset.icon.url', 'http://127.0.0.1:1080/game/swf/c_images/catalogue/icon_%name%.png');
        if(!iconTemplate) return null;
        return iconTemplate.replace('%name%', icon.toString());
    }, [ icon ]);

    if(!getIconUrl) return null;

    return <LayoutImage imageUrl={ getIconUrl } style={ { width: icon === 800 ? 'auto' : 20, height: 20, maxWidth: 30, objectFit: 'contain' } } />;
}
