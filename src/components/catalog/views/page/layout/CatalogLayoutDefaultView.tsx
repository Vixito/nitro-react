import { FC } from 'react';
import { GetConfiguration, ProductTypeEnum } from '../../../../../api';
import { Column, Flex, Grid, LayoutImage, Text } from '../../../../../common';
import { useCatalog } from '../../../../../hooks';
import { CatalogHeaderView } from '../../catalog-header/CatalogHeaderView';
import { CatalogAddOnBadgeWidgetView } from '../widgets/CatalogAddOnBadgeWidgetView';
import { CatalogItemGridWidgetView } from '../widgets/CatalogItemGridWidgetView';
import { CatalogLimitedItemWidgetView } from '../widgets/CatalogLimitedItemWidgetView';
import { CatalogPurchaseWidgetView } from '../widgets/CatalogPurchaseWidgetView';
import { CatalogSpinnerWidgetView } from '../widgets/CatalogSpinnerWidgetView';
import { CatalogTotalPriceWidget } from '../widgets/CatalogTotalPriceWidget';
import { CatalogViewProductWidgetView } from '../widgets/CatalogViewProductWidgetView';
import { CatalogLayoutProps } from './CatalogLayout.types';

export const CatalogLayoutDefaultView: FC<CatalogLayoutProps> = props =>
{
    const { page = null } = props;
    const { currentOffer = null, currentPage = null } = useCatalog();

    return (
        <>
            <Grid>
                <Column size={ 7 } overflow="hidden">
                    <CatalogItemGridWidgetView />
                </Column>
                <Column center={ !currentOffer } size={ 5 } overflow="hidden">
                    { !currentOffer && page?.localization &&
                        <>
                            { !!page.localization.getImage(1) && 
                                <LayoutImage imageUrl={ page.localization.getImage(1) } /> }
                            <Text center dangerouslySetInnerHTML={ { __html: page.localization.getText(0) } } />
                        </> }
                    { currentOffer &&
                        <>
                            <Flex center position="relative" overflow="hidden" className="rounded" style={ { height: 140 } }>
                                { (currentOffer.product.productType !== ProductTypeEnum.BADGE) &&
                                    <>
                                        <CatalogViewProductWidgetView />
                                        { currentOffer.product.isUniqueLimitedItem ? (
                                            <div className="position-absolute top-2 end-2 d-flex flex-column align-items-end" style={ { zIndex: 10 } }>
                                                <CatalogLimitedItemWidgetView />
                                                { currentOffer.badgeCode && (
                                                    <div className="ltd-badge-preview mt-1">
                                                        <CatalogAddOnBadgeWidgetView />
                                                    </div>
                                                ) }
                                            </div>
                                        ) : (
                                            <CatalogAddOnBadgeWidgetView className="bg-muted rounded bottom-1 end-1 position-absolute" />
                                        ) }
                                    </> }
                                { (currentOffer.product.productType === ProductTypeEnum.BADGE) && <CatalogAddOnBadgeWidgetView className="scale-2" /> }
                            </Flex>
                            <Column grow gap={ 1 }>
                                { !currentOffer.product.isUniqueLimitedItem && <CatalogLimitedItemWidgetView fullWidth /> }
                                <Text grow bold>{ currentOffer.localizationName }</Text>
                                <Flex justifyContent="between">
                                    { (!currentOffer.product.isUniqueLimitedItem && currentPage?.pageId !== 761) &&
                                        <Column gap={ 1 }>
                                            <CatalogSpinnerWidgetView />
                                        </Column> }
                                    <CatalogTotalPriceWidget justifyContent="end" alignItems="end" />
                                </Flex>
                                <CatalogPurchaseWidgetView />
                            </Column>
                        </> }
                </Column>
            </Grid>
        </>
    );
}
