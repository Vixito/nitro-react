import { FC } from 'react';
import { GetConfiguration, ProductTypeEnum } from '../../../../../api';
import { Column, Flex, Grid, LayoutCurrencyIcon, LayoutImage, Text } from '../../../../../common';
import { useCatalog, usePurse } from '../../../../../hooks';
import { useEraTheme } from '../../../../../hooks/era/useEraTheme';
import { useIsMobile } from '../../../../../hooks/mobile/useIsMobile';
import { CatalogHeaderView } from '../../catalog-header/CatalogHeaderView';
import { CatalogAddOnBadgeWidgetView } from '../widgets/CatalogAddOnBadgeWidgetView';
import { CatalogItemGridWidgetView } from '../widgets/CatalogItemGridWidgetView';
import { CatalogLimitedItemWidgetView } from '../widgets/CatalogLimitedItemWidgetView';
import { CatalogPriceDisplayWidgetView } from '../widgets/CatalogPriceDisplayWidgetView';
import { CatalogPurchaseWidgetView } from '../widgets/CatalogPurchaseWidgetView';
import { CatalogSpinnerWidgetView } from '../widgets/CatalogSpinnerWidgetView';
import { CatalogTotalPriceWidget } from '../widgets/CatalogTotalPriceWidget';
import { CatalogViewProductWidgetView } from '../widgets/CatalogViewProductWidgetView';
import { CatalogLayoutProps } from './CatalogLayout.types';

const getCurrencyLabel = (type: number): string =>
{
    if(type === -1) return 'Créditos';
    if(type === 0) return 'Duckets';
    if(type === 5 || type === 105) return 'Diamantes';
    return 'Puntos';
};

export const CatalogLayoutDefaultView: FC<CatalogLayoutProps> = props =>
{
    const { page = null } = props;
    const { currentOffer = null, currentPage = null } = useCatalog();
    const { getCurrencyAmount = null } = usePurse();
    const { currentEra } = useEraTheme();
    const isMobile = useIsMobile();

    if(currentEra === 'flash2012' && !isMobile)
    {
        const balanceCurrencyType = (currentOffer && currentOffer.priceInCredits <= 0 && currentOffer.priceInActivityPoints > 0)
            ? currentOffer.activityPointType
            : -1;
        const balanceAmount = getCurrencyAmount ? getCurrencyAmount(balanceCurrencyType) : 0;

        return (
            <div className="f12-default-layout">
                <div className="f12-default-left">
                    <div className="f12-choose-label">Elige un Furni</div>
                    <div className="f12-grid-wrap">
                        <CatalogItemGridWidgetView columnCount={ 3 } className="f12-furni-grid" />
                    </div>
                </div>
                <div className="f12-default-right">
                    { !currentOffer && page?.localization && (
                        <div className="f12-empty-preview">
                            { !!page.localization.getImage(1) &&
                                <LayoutImage imageUrl={ page.localization.getImage(1) } /> }
                            { !!page.localization.getText(0) &&
                                <Text center dangerouslySetInnerHTML={ { __html: page.localization.getText(0) } } /> }
                        </div>
                    ) }
                    { currentOffer && (
                        <>
                            <div className="f12-balance-bar">
                                <LayoutCurrencyIcon type={ balanceCurrencyType } />
                                <span className="f12-balance-text">
                                    { getCurrencyLabel(balanceCurrencyType) }: <strong>{ balanceAmount }</strong>
                                </span>
                            </div>
                            <div className="f12-preview-box">
                                { (currentOffer.product.productType !== ProductTypeEnum.BADGE) && (
                                    <>
                                        <CatalogViewProductWidgetView />
                                        { currentOffer.product.isUniqueLimitedItem ? (
                                            <div className="position-absolute bottom-1 start-1 d-flex flex-column align-items-start" style={ { zIndex: 10 } }>
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
                                    </>
                                ) }
                                { (currentOffer.product.productType === ProductTypeEnum.BADGE) &&
                                    <CatalogAddOnBadgeWidgetView className="scale-2" /> }
                                { (currentOffer.priceInCredits > 0 || currentOffer.priceInActivityPoints > 0) && (
                                    <div
                                        className={ `f12-price-pill ${
                                            (currentOffer.priceInCredits > 0 && currentOffer.priceInActivityPoints <= 0)
                                                ? 'is-credits'
                                                : (currentOffer.priceInCredits <= 0 && currentOffer.activityPointType === 0)
                                                    ? 'is-duckets'
                                                    : 'is-diamonds'
                                        }` }
                                    >
                                        <CatalogPriceDisplayWidgetView offer={ currentOffer } separator />
                                    </div>
                                ) }
                            </div>
                            <div className="f12-offer-meta">
                                { !currentOffer.product.isUniqueLimitedItem && <CatalogLimitedItemWidgetView fullWidth /> }
                                <div className="f12-offer-title" title={ currentOffer.localizationName }>
                                    { currentOffer.localizationName }
                                </div>
                                { currentOffer.localizationDescription && currentOffer.localizationDescription !== currentOffer.localizationName && (
                                    <div className="f12-offer-desc">
                                        { currentOffer.localizationDescription }
                                    </div>
                                ) }
                                { (!currentOffer.product.isUniqueLimitedItem && currentPage?.pageId !== 761 && currentOffer.bundlePurchaseAllowed) && (
                                    <div className="f12-spinner-row">
                                        <CatalogSpinnerWidgetView />
                                    </div>
                                ) }
                            </div>
                            <div className="f12-purchase-actions">
                                <CatalogPurchaseWidgetView />
                            </div>
                        </>
                    ) }
                </div>
            </div>
        );
    }

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
