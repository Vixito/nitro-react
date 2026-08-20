import { FrontPageItem } from '@nitrots/nitro-renderer';
import { FC, useCallback, useEffect } from 'react';
import { CreateLinkEvent } from '../../../../../../api';
import { Column, Flex, Grid, Text } from '../../../../../../common';
import { useCatalog } from '../../../../../../hooks';
import { CatalogHeaderView } from '../../../catalog-header/CatalogHeaderView';
import { CatalogRedeemVoucherView } from '../../common/CatalogRedeemVoucherView';
import { CatalogLayoutProps } from '../CatalogLayout.types';
import { CatalogLayoutFrontPageItemView } from './CatalogLayoutFrontPageItemView';

export const CatalogLayoutFrontpage4View: FC<CatalogLayoutProps> = props =>
{
    const { page = null, hideNavigation = null } = props;
    const { frontPageItems = [] } = useCatalog();

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
