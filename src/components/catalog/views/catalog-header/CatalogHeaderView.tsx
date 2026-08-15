import { FC, useEffect, useState } from 'react';
import { GetConfiguration } from '../../../../api';
import { Flex } from '../../../../common';

export interface CatalogHeaderViewProps
{
    imageUrl?: string;
}

export const CatalogHeaderView: FC<CatalogHeaderViewProps> = props =>
{
    const { imageUrl = null } = props;
    const [ displayImageUrl, setDisplayImageUrl ] = useState('');

    useEffect(() =>
    {
        const imageTemplate = GetConfiguration<string>('catalog.asset.image.url', 'http://127.0.0.1:8080/c_images/catalogue/%name%.png');
        if(imageUrl && (imageUrl.length > 0))
        {
            const resolved = (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('/'))
                ? imageUrl
                : imageTemplate.replace('%name%', imageUrl);
            setDisplayImageUrl(resolved);
        }
        else
        {
            setDisplayImageUrl(imageTemplate.replace('%name%', 'catalog_header_roombuilder'));
        }
    }, [ imageUrl ]);

    return (
        <Flex center fullWidth className="nitro-catalog-header">
            <img src={ displayImageUrl } onError={ ({ currentTarget }) => 
            {
                const fallback = GetConfiguration<string>('catalog.asset.image.url', 'http://127.0.0.1:8080/c_images/catalogue/%name%.png').replace('%name%', 'catalog_header_roombuilder');
                if(currentTarget.src !== fallback)
                {
                    currentTarget.src = fallback;
                }
            } } />
        </Flex>
    );
}
