import { MouseEventType } from '@nitrots/nitro-renderer';
import { FC, MouseEvent, useMemo, useState } from 'react';
import { IPurchasableOffer, Offer, ProductTypeEnum } from '../../../../../api';
import { LayoutAvatarImageView, LayoutGridItem, LayoutGridItemProps } from '../../../../../common';
import { useCatalog, useInventoryFurni } from '../../../../../hooks';

interface CatalogGridOfferViewProps extends LayoutGridItemProps
{
    offer: IPurchasableOffer;
    selectOffer: (offer: IPurchasableOffer) => void;
}

export const CatalogGridOfferView: FC<CatalogGridOfferViewProps> = props =>
{
    const { offer = null, selectOffer = null, itemActive = false, ...rest } = props;
    const [ isMouseDown, setMouseDown ] = useState(false);
    const { requestOfferToMover = null } = useCatalog();
    const { isVisible = false } = useInventoryFurni();

    const iconUrl = useMemo(() =>
    {
        if(!offer.product) return null;

        if(offer.products && offer.products.length > 1)
        {
            return '/game/swf/c_images/catalogue/icon_84.png';
        }

        return offer.product.getIconUrl(offer);
    }, [ offer ]);

    const totalCount = useMemo(() =>
    {
        if(!offer) return 1;

        if(offer.products && offer.products.length > 1)
        {
            return offer.products.reduce((acc, p) => acc + (p.productCount || 1), 0);
        }

        return ((offer.pricingModel === Offer.PRICING_MODEL_MULTI) ? offer.product.productCount : 1);
    }, [ offer ]);

    const onMouseEvent = (event: MouseEvent) =>
    {
        switch(event.type)
        {
            case MouseEventType.MOUSE_DOWN:
                selectOffer(offer);
                setMouseDown(true);
                return;
            case MouseEventType.MOUSE_UP:
                setMouseDown(false);
                return;
            case MouseEventType.ROLL_OUT:
                if(!isMouseDown || !itemActive || !isVisible) return;

                requestOfferToMover(offer);
                return;
        }
    }

    const product = offer.product;

    if(!product) return null;

    return (
        <LayoutGridItem itemImage={ iconUrl } itemCount={ totalCount } itemUniqueSoldout={ (product.uniqueLimitedItemSeriesSize && !product.uniqueLimitedItemsLeft) } itemUniqueNumber={ product.uniqueLimitedItemSeriesSize } itemActive={ itemActive } onMouseDown={ onMouseEvent } onMouseUp={ onMouseEvent } onMouseOut={ onMouseEvent } { ...rest }>
            { (offer.product.productType === ProductTypeEnum.ROBOT) &&
                <LayoutAvatarImageView figure={ offer.product.extraParam } headOnly={ true } direction={ 3 } /> }
        </LayoutGridItem>
    );
}
