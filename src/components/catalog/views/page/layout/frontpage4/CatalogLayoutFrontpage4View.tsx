import { FrontPageItem } from '@nitrots/nitro-renderer';
import { FC, useCallback, useEffect } from 'react';
import { CreateLinkEvent } from '../../../../../../api';
import catalogFrontpageBanner from '../../../../../../assets/images/eras/shockwave_v14/catalog_frontpage_banner.png';
import { Column, Flex, Grid, Text } from '../../../../../../common';
import { useCatalog } from '../../../../../../hooks';
import { useEraTheme } from '../../../../../../hooks/era/useEraTheme';
import { CatalogHeaderView } from '../../../catalog-header/CatalogHeaderView';
import { CatalogRedeemVoucherView } from '../../common/CatalogRedeemVoucherView';
import { CatalogLayoutProps } from '../CatalogLayout.types';
import { CatalogLayoutFrontPageItemView } from './CatalogLayoutFrontPageItemView';

export const CatalogLayoutFrontpage4View: FC<CatalogLayoutProps> = props =>
{
    const { page = null, hideNavigation = null } = props;
    const { frontPageItems = [] } = useCatalog();
    const { currentEra } = useEraTheme();

    const selectItem = useCallback((item: FrontPageItem) =>
    {
        if(!item) return;

        switch(item.type)
        {
            case FrontPageItem.ITEM_CATALOGUE_PAGE:
                if(item.catalogPageLocation) CreateLinkEvent(`catalog/open/${ item.catalogPageLocation }`);
                return;
            case FrontPageItem.ITEM_PRODUCT_OFFER:
                if(item.productOfferId) CreateLinkEvent(`catalog/open/offerId/${ item.productOfferId }`);
                return;
        }
    }, []);

    useEffect(() =>
    {
        if(hideNavigation) hideNavigation();
    }, [ page, hideNavigation ]);

    if(currentEra === 'shockwave2006')
    {
        return (
            <div className="shockwave-catalog-frontpage">
                <div className="shockwave-frontpage-banner-wrap">
                    <img
                        src={ catalogFrontpageBanner }
                        alt="Colección de Furnis Habbten"
                        className="shockwave-frontpage-banner-img"
                    />
                </div>
                <div className="shockwave-frontpage-text">
                    <div className="frontpage-heading">
                        Colección de Furnis del Hotel Habbten
                    </div>
                    <p className="frontpage-paragraph">
                        Selecciona una categoría en las pestañas superiores. Si ya tienes Créditos puedes comprar objetos simplemente haciendo clic en el botón &apos;Comprar&apos; junto al furni que desees. Si no tienes Créditos puedes conseguirlos haciendo clic en tu Monedero Habbten.
                    </p>
                    <p className="frontpage-paragraph mb-2">
                        ¡Hogar, dulce hogar!
                    </p>
                    <div className="shockwave-frontpage-voucher">
                        <CatalogRedeemVoucherView text={ page?.localization?.getText(1) || 'Introduce aquí tu código voucher' } />
                    </div>
                </div>
            </div>
        );
    }

    if(!frontPageItems || (frontPageItems.length < 4))
    {
        return (
            <Column fullHeight gap={ 2 } className="p-3 overflow-y-auto">
                <CatalogHeaderView imageUrl={ page?.localization?.getImage(0) } />
                { page?.localization?.getText(0) &&
                    <Text center dangerouslySetInnerHTML={ { __html: page.localization.getText(0) } } /> }
                <CatalogRedeemVoucherView text={ page?.localization?.getText(1) } />
            </Column>
        );
    }

    return (
        <Grid className="w-100 h-100 p-1">
            <Column size={ 5 } className="h-100">
                { frontPageItems[0] &&
                    <CatalogLayoutFrontPageItemView 
                        item={ frontPageItems[0] } 
                        style={ { height: '100%', minHeight: '345px' } }
                        onClick={ event => selectItem(frontPageItems[0]) } 
                    /> }
            </Column>
            <Column size={ 7 } gap={ 1 } className="h-100 justify-content-between">
                { frontPageItems[1] &&
                    <CatalogLayoutFrontPageItemView 
                        item={ frontPageItems[1] } 
                        style={ { height: '82px', minHeight: '82px' } }
                        onClick={ event => selectItem(frontPageItems[1]) } 
                    /> }
                { frontPageItems[2] &&
                    <CatalogLayoutFrontPageItemView 
                        item={ frontPageItems[2] } 
                        style={ { height: '82px', minHeight: '82px' } }
                        onClick={ event => selectItem(frontPageItems[2]) } 
                    /> }
                { frontPageItems[3] &&
                    <CatalogLayoutFrontPageItemView 
                        item={ frontPageItems[3] } 
                        style={ { height: '82px', minHeight: '82px' } }
                        onClick={ event => selectItem(frontPageItems[3]) } 
                    /> }
                <Flex className="mt-1 w-100">
                    <CatalogRedeemVoucherView text={ page?.localization?.getText(1) } />
                </Flex>
            </Column>
        </Grid>
    );
}
