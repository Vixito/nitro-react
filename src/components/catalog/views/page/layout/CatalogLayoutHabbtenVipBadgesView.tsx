import { HabboClubLevelEnum, RoomControllerLevel } from '@nitrots/nitro-renderer';
import { FC, useMemo, useState } from 'react';
import { GetConfiguration, GetSessionDataManager } from '../../../../../api';
import { AutoGrid, Button, Column, Flex, Grid, LayoutCurrencyIcon, LayoutGridItem, Text } from '../../../../../common';
import { useInventoryBadges, usePurse } from '../../../../../hooks';
import { CatalogLayoutProps } from './CatalogLayout.types';

interface VipBadgeItem {
    code: string;
    name: string;
    description: string;
    priceDiamonds: number;
}

const VIP_BADGES: VipBadgeItem[] = [
    { code: 'ACH_VipClub1', name: 'Insignia VIP - Nivel I', description: 'Insignia coleccionable oficial para miembros Habbten VIP de nivel 1.', priceDiamonds: 20 },
    { code: 'ACH_VipClub2', name: 'Insignia VIP - Nivel II', description: 'Insignia coleccionable oficial para miembros Habbten VIP de nivel 2.', priceDiamonds: 20 },
    { code: 'ACH_VipClub3', name: 'Insignia VIP - Nivel III', description: 'Insignia coleccionable oficial para miembros Habbten VIP de nivel 3.', priceDiamonds: 20 },
    { code: 'ACH_VipClub4', name: 'Insignia VIP - Nivel IV', description: 'Insignia coleccionable oficial para miembros Habbten VIP de nivel 4.', priceDiamonds: 20 },
    { code: 'ACH_VipClub5', name: 'Insignia VIP - Nivel V', description: 'Insignia coleccionable oficial para miembros Habbten VIP de nivel 5.', priceDiamonds: 20 },
    { code: 'VIP', name: 'Insignia Oficial Habbten VIP', description: 'Insignia dorada oficial de membresía Habbten VIP.', priceDiamonds: 20 }
];

export const CatalogLayoutHabbtenVipBadgesView: FC<CatalogLayoutProps> = props =>
{
    const [ selectedBadge, setSelectedBadge ] = useState<VipBadgeItem>(VIP_BADGES[0]);
    const { purse = null, getClubMemberLevel = null } = usePurse();
    const { badgeCodes = [] } = useInventoryBadges();

    const isVip = useMemo(() => {
        const hasClub = (getClubMemberLevel ? getClubMemberLevel() >= HabboClubLevelEnum.CLUB : false) || (purse && (purse.clubDays > 0 || purse.clubPeriods > 0 || purse.isVip));
        const hasBadgeVip = badgeCodes.includes('VIP') || badgeCodes.includes('ACH_VipClub1');
        const isStaff = GetSessionDataManager().hasSecurity(RoomControllerLevel.MODERATOR);
        return hasClub || hasBadgeVip || isStaff;
    }, [ purse, getClubMemberLevel, badgeCodes ]);

    const isOwned = useMemo(() => {
        if(!selectedBadge) return false;
        return badgeCodes.includes(selectedBadge.code);
    }, [ selectedBadge, badgeCodes ]);

    const imgLib = GetConfiguration<string>('image.library.url', 'http://127.0.0.1:1080/game/swf/c_images/');
    const badgeBaseUrl = imgLib.endsWith('/') ? `${ imgLib }album1584/` : `${ imgLib }/album1584/`;

    const openStore = () => {
        window.open('/tienda', '_blank');
    };

    const buyBadge = () => {
        if(!selectedBadge) return;
        window.open('/tienda', '_blank');
    };

    if(!isVip) {
        return (
            <Column fullHeight center justifyContent="center" className="p-4 text-center bg-gray-50 rounded-lg">
                <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mb-3 mx-auto shadow-sm">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <Text fontWeight="bold" fontSize={ 4 } className="text-gray-900 mb-1">
                    Zona Exclusiva para Miembros Habbten VIP
                </Text>
                <Text className="text-xs text-gray-600 max-w-md mx-auto mb-4">
                    Esta subsección requiere una suscripción activa a <b>Habbten VIP</b> para adquirir y coleccionar placas prémium exclusivas.
                </Text>
                <Button variant="success" onClick={ openStore } className="px-6 py-2">
                    Adquirir Habbten VIP
                </Button>
            </Column>
        );
    }

    return (
        <Grid>
            <Column fullHeight size={ 7 } overflow="hidden" justifyContent="between">
                <AutoGrid columnCount={ 2 } className="p-1">
                    { VIP_BADGES.map(b => (
                        <LayoutGridItem
                            key={ b.code }
                            column={ false }
                            center={ false }
                            alignItems="center"
                            justifyContent="between"
                            itemActive={ selectedBadge?.code === b.code }
                            className="p-2 cursor-pointer"
                            onClick={ () => setSelectedBadge(b) }
                        >
                            <Flex alignItems="center" gap={ 2 }>
                                <img
                                    src={ `${ badgeBaseUrl }${ b.code }.gif` }
                                    alt={ b.name }
                                    style={ { width: 36, height: 36, objectFit: 'contain', imageRendering: 'pixelated' } }
                                    onError={ e => {
                                        (e.target as HTMLImageElement).src = `${ badgeBaseUrl }${ b.code }.png`;
                                    } }
                                />
                                <Text fontWeight="bold" fontSize={ 6 }>{ b.name }</Text>
                            </Flex>
                            <Flex alignItems="center" gap={ 1 }>
                                <Text fontSize={ 6 } fontWeight="bold">{ b.priceDiamonds }</Text>
                                <LayoutCurrencyIcon type={ 5 } />
                            </Flex>
                        </LayoutGridItem>
                    )) }
                </AutoGrid>
            </Column>

            <Column size={ 5 } overflow="hidden" justifyContent="between">
                { selectedBadge && (
                    <Column fullHeight center justifyContent="between" className="text-center p-3 bg-gray-50 rounded-lg">
                        <Column center gap={ 2 }>
                            <Text fontWeight="bold" fontSize={ 4 }>{ selectedBadge.name }</Text>
                            <img
                                src={ `${ badgeBaseUrl }${ selectedBadge.code }.gif` }
                                alt={ selectedBadge.name }
                                style={ { width: 48, height: 48, objectFit: 'contain', imageRendering: 'pixelated', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' } }
                                onError={ e => {
                                    (e.target as HTMLImageElement).src = `${ badgeBaseUrl }${ selectedBadge.code }.png`;
                                } }
                            />
                            <Text className="text-xs text-gray-600 px-2">
                                { selectedBadge.description }
                            </Text>
                            <Flex alignItems="center" justifyContent="center" gap={ 1 } className="my-1">
                                <Text fontWeight="bold" fontSize={ 5 }>Precio: { selectedBadge.priceDiamonds }</Text>
                                <LayoutCurrencyIcon type={ 5 } />
                            </Flex>
                        </Column>
                        <Column fullWidth gap={ 1 }>
                            { isOwned ? (
                                <Button fullWidth variant="secondary" disabled>
                                    Ya Adquirida ✓
                                </Button>
                            ) : (
                                <Button fullWidth variant="success" onClick={ buyBadge }>
                                    Comprar en la Tienda
                                </Button>
                            ) }
                        </Column>
                    </Column>
                ) }
            </Column>
        </Grid>
    );
};
