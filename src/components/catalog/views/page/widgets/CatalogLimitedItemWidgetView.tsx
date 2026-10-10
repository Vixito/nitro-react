import { FC } from 'react';
import { Offer } from '../../../../../api';
import { Base, BaseProps, LayoutLimitedEditionCompletePlateView } from '../../../../../common';
import { useCatalog } from '../../../../../hooks';

export const CatalogLimitedItemWidgetView: FC<BaseProps<HTMLDivElement>> = props =>
{
    const { children = null, ...rest } = props;
    const { currentOffer = null, currentPage = null } = useCatalog();

    if(!currentOffer || (currentOffer.pricingModel !== Offer.PRICING_MODEL_SINGLE) || !currentOffer.product.isUniqueLimitedItem) return null;
    
    const isSoldOutPage = (currentPage?.pageId === 761 || currentOffer.page?.pageId === 761);
    const itemsLeft = isSoldOutPage ? 0 : currentOffer.product.uniqueLimitedItemsLeft;

    return (
        <Base { ...rest }>
            <LayoutLimitedEditionCompletePlateView className="mx-auto" uniqueLimitedItemsLeft={ itemsLeft } uniqueLimitedSeriesSize={ currentOffer.product.uniqueLimitedItemSeriesSize } />
            { children }
        </Base>
    );
}
