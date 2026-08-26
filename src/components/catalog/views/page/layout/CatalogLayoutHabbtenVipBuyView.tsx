import { HabboClubLevelEnum } from '@nitrots/nitro-renderer';
import { FC, useMemo, useState } from 'react';
import { GetConfiguration } from '../../../../../api';
import { AutoGrid, Button, Column, Flex, Grid, LayoutCurrencyIcon, LayoutGridItem, Text } from '../../../../../common';
import { usePurse } from '../../../../../hooks';
import { CatalogLayoutProps } from './CatalogLayout.types';

interface VipOffer {
    id: number;
    months: number;
    days: number;
    priceCredits: number;
    priceDiamonds: number;
    badge: string;
    title: string;
}

const VIP_OFFERS: VipOffer[] = [
    {
        id: 1,
        months: 1,
        days: 30,
        priceCredits: 250,
        priceDiamonds: 75,
        badge: 'ACH_VipClub1',
        title: '1 mes'
    },
    {
        id: 2,
        months: 3,
        days: 90,
        priceCredits: 600,
        priceDiamonds: 180,
        badge: 'ACH_VipClub3',
        title: '3 meses'
    }
];

export const CatalogLayoutHabbtenVipBuyView: FC<CatalogLayoutProps> = props =>
{
    const [ selectedOffer, setSelectedOffer ] = useState<VipOffer>(VIP_OFFERS[0]);
    const { purse = null, getClubMemberLevel = null } = usePurse();

    const isVip = useMemo(() => {
        if(!getClubMemberLevel) return false;
        return getClubMemberLevel() >= HabboClubLevelEnum.VIP;
    }, [ getClubMemberLevel ]);

    const vipDays = useMemo(() => {
        if(!purse) return 0;
        return isVip ? ((purse.clubPeriods * 31) + purse.clubDays) : 0;
    }, [ purse, isVip ]);

    const validUntilDate = useMemo(() => {
        const date = new Date();
        const addDays = (vipDays > 0 ? vipDays : 0) + (selectedOffer ? selectedOffer.days : 30);
        date.setDate(date.getDate() + addDays);
        return `${ date.getDate() }/${ date.getMonth() + 1 }/${ date.getFullYear() }`;
    }, [ vipDays, selectedOffer ]);

    const badgeUrl = useMemo(() => {
        const badgeName = selectedOffer ? selectedOffer.badge : 'ACH_VipClub1';
        const imgLib = GetConfiguration<string>('image.library.url', 'http://127.0.0.1:1080/game/swf/c_images/');
        return `${ imgLib.endsWith('/') ? imgLib : imgLib + '/' }album1584/${ badgeName }.png`;
    }, [ selectedOffer ]);

    const openStore = () => {
        window.open('/tienda', '_blank');
    };

    return (
        <Grid>
            <Column fullHeight size={ 7 } overflow="hidden" justifyContent="between">
                <AutoGrid columnCount={ 1 } className="nitro-catalog-layout-vip-buy-grid">
                    { VIP_OFFERS.map(offer => (
                        <LayoutGridItem
                            key={ offer.id }
                            column={ false }
                            center={ false }
                            alignItems="center"
                            justifyContent="between"
                            itemActive={ selectedOffer?.id === offer.id }
                            className="p-2 cursor-pointer"
                            onClick={ () => setSelectedOffer(offer) }
                        >
                            <Flex alignItems="center" gap={ 2 }>
                                <img
                                    src={ `${ GetConfiguration<string>('image.library.url', 'http://127.0.0.1:1080/game/swf/c_images/') }album1584/${ offer.badge }.png` }
                                    alt={ offer.title }
                                    style={ { width: 36, height: 36, objectFit: 'contain', imageRendering: 'pixelated' } }
                                    onError={ e => { (e.target as HTMLElement).style.display = 'none'; } }
                                />
                                <Text fontWeight="bold" fontSize={ 5 }>{ offer.title }</Text>
                            </Flex>
                            <Column justifyContent="end" gap={ 1 }>
                                <Flex alignItems="center" justifyContent="end" gap={ 1 }>
                                    <Text fontWeight="bold">{ offer.priceCredits }</Text>
                                    <LayoutCurrencyIcon type={ -1 } />
                                </Flex>
                                <Flex alignItems="center" justifyContent="end" gap={ 1 }>
                                    <Text fontWeight="bold">{ offer.priceDiamonds }</Text>
                                    <LayoutCurrencyIcon type={ 5 } />
                                </Flex>
                            </Column>
                        </LayoutGridItem>
                    )) }
                </AutoGrid>
            </Column>

            <Column size={ 5 } overflow="hidden" justifyContent="between">
                <Column fullHeight center overflow="hidden" gap={ 2 } className="text-center pt-2">
                    <img
                        src={ badgeUrl }
                        alt="VIP Badge"
                        style={ { width: 64, height: 64, objectFit: 'contain', imageRendering: 'pixelated', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' } }
                    />
                    { vipDays > 0 ? (
                        <Text center overflow="auto" className="text-xs text-gray-700">
                            Aunque todavía te queden <b>{ vipDays } días</b> de suscripción a Habbten VIP, ¡puedes extender tu membresía fácilmente y seguir disfrutando de todas las ventajas VIP!
                        </Text>
                    ) : (
                        <Text center overflow="auto" className="text-xs text-gray-700">
                            ¡Desbloquea el Pase de Batalla VIP, colores de nombre, burbujas de chat prémium y ventajas exclusivas en todo el hotel!
                        </Text>
                    ) }
                </Column>

                { selectedOffer && (
                    <Column fullWidth grow justifyContent="end" gap={ 2 } className="pt-2 border-t border-gray-200">
                        <Flex alignItems="end" justifyContent="between">
                            <Column grow gap={ 0 }>
                                <Text fontWeight="bold" fontSize={ 5 }>
                                    Extensión de Habbten VIP de { selectedOffer.title }
                                </Text>
                                <Text className="text-xs text-gray-500">Válido hasta: { validUntilDate }</Text>
                            </Column>
                            <Column gap={ 1 } alignItems="end">
                                <Flex alignItems="center" gap={ 1 }>
                                    <Text fontWeight="bold">{ selectedOffer.priceCredits }</Text>
                                    <LayoutCurrencyIcon type={ -1 } />
                                </Flex>
                                <Flex alignItems="center" gap={ 1 }>
                                    <Text fontWeight="bold">{ selectedOffer.priceDiamonds }</Text>
                                    <LayoutCurrencyIcon type={ 5 } />
                                </Flex>
                            </Column>
                        </Flex>
                        <Button fullWidth variant="success" onClick={ openStore }>
                            Comprar
                        </Button>
                    </Column>
                ) }
            </Column>
        </Grid>
    );
};
