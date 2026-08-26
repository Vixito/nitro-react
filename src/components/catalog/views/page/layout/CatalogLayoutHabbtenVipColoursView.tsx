import { HabboClubLevelEnum, RoomControllerLevel } from '@nitrots/nitro-renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { GetSessionDataManager } from '../../../../../api';
import { AutoGrid, Button, Column, Flex, Grid, LayoutCurrencyIcon, LayoutGridItem, Text } from '../../../../../common';
import { useInventoryBadges, usePurse, useSessionInfo } from '../../../../../hooks';
import { CatalogLayoutProps } from './CatalogLayout.types';

interface ColourOption {
    id: string;
    name: string;
    hex: string;
    isRainbow?: boolean;
}

const VIP_COLOURS: ColourOption[] = [
    { id: 'rainbow', name: 'Rainbow', hex: '#ec4899', isRainbow: true },
    { id: 'gold', name: 'Oro Imperial', hex: '#eab308' },
    { id: 'cyan', name: 'Cian Eléctrico', hex: '#06b6d4' },
    { id: 'red', name: 'Rojo Pasión', hex: '#ef4444' },
    { id: 'blue', name: 'Azul Real', hex: '#3b82f6' },
    { id: 'green', name: 'Verde Esmeralda', hex: '#10b981' },
    { id: 'purple', name: 'Púrpura Mágico', hex: '#a855f7' },
    { id: 'pink', name: 'Rosa Chicle', hex: '#ec4899' },
    { id: 'orange', name: 'Naranja Intenso', hex: '#f97316' },
    { id: 'lime', name: 'Verde Lima', hex: '#84cc16' },
    { id: 'yellow', name: 'Amarillo Solar', hex: '#facc15' },
    { id: 'silver', name: 'Plateado Elegante', hex: '#94a3b8' }
];

export const CatalogLayoutHabbtenVipColoursView: FC<CatalogLayoutProps> = props =>
{
    const [ selectedColour, setSelectedColour ] = useState<ColourOption>(VIP_COLOURS[0]);
    const [ activeColourId, setActiveColourId ] = useState<string>('');
    const [ unlockedColours, setUnlockedColours ] = useState<string[]>([]);
    const [ isSubmitting, setIsSubmitting ] = useState<boolean>(false);
    const [ message, setMessage ] = useState<string>('');
    const { purse = null, getClubMemberLevel = null } = usePurse();
    const { badgeCodes = [] } = useInventoryBadges();
    const { userInfo = null } = useSessionInfo();

    const isVip = useMemo(() => {
        const hasClub = (getClubMemberLevel ? getClubMemberLevel() >= HabboClubLevelEnum.CLUB : false) || (purse && (purse.clubDays > 0 || purse.clubPeriods > 0 || purse.isVip));
        const hasBadgeVip = badgeCodes.includes('VIP') || badgeCodes.includes('ACH_VipClub1');
        const isStaff = GetSessionDataManager().hasSecurity(RoomControllerLevel.MODERATOR);
        return hasClub || hasBadgeVip || isStaff;
    }, [ purse, getClubMemberLevel, badgeCodes ]);

    const username = userInfo?.username || 'Usuario';

    const fetchStatus = () => {
        fetch('/api/catalog/user-vip-status')
            .then(res => {
                if (!res.ok) return null;
                return res.json();
            })
            .then(data => {
                if (data && data.success) {
                    if (data.active_colour) setActiveColourId(data.active_colour);
                    if (data.unlocked_colours) setUnlockedColours(data.unlocked_colours);
                }
            })
            .catch(() => {});
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const openStore = () => {
        window.open('/tienda', '_blank');
    };

    const isOwned = useMemo(() => {
        if (!selectedColour) return false;
        return unlockedColours.includes(selectedColour.id) || isVip;
    }, [ selectedColour, unlockedColours, isVip ]);

    const isCurrentlyEquipped = useMemo(() => {
        return activeColourId === selectedColour?.id;
    }, [ activeColourId, selectedColour ]);

    const handleAction = async () => {
        if (!selectedColour || isSubmitting || isCurrentlyEquipped) return;
        setIsSubmitting(true);
        setMessage('');

        try {
            if (isOwned) {
                // Activate without charging
                const res = await fetch('/api/catalog/activate-vip-item', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'name_colour',
                        item_id: selectedColour.id
                    })
                });
                const data = await res.json();
                if (data.success) {
                    setActiveColourId(selectedColour.id);
                    setMessage('¡Color equipado con éxito!');
                } else {
                    setMessage(data.error || 'Error al equipar');
                }
            } else {
                // Buy and activate
                const res = await fetch('/api/catalog/buy-vip-item', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'name_colour',
                        item_id: selectedColour.id,
                        cost_diamonds: 30
                    })
                });
                const data = await res.json();
                if (data.success) {
                    setActiveColourId(selectedColour.id);
                    setUnlockedColours(prev => [ ...prev, selectedColour.id ]);
                    setMessage('¡Color comprado y activado!');
                } else {
                    setMessage(data.error || 'Error en la compra');
                }
            }
        } catch (e) {
            setMessage('Error de conexión.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if(!isVip) {
        return (
            <Column fullHeight center justifyContent="center" className="p-4 text-center bg-gray-50 rounded-lg">
                <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mb-3 mx-auto shadow-sm">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                </div>
                <Text fontWeight="bold" fontSize={ 4 } className="text-gray-900 mb-1">
                    Zona Exclusiva para Miembros Habbten VIP
                </Text>
                <Text className="text-xs text-gray-600 max-w-md mx-auto mb-4">
                    Esta subsección requiere una suscripción activa a <b>Habbten VIP</b> para personalizar el color de tu nombre de usuario con tonos prémium y efectos como Rainbow.
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
                <AutoGrid columnCount={ 5 } className="p-1">
                    { VIP_COLOURS.map(c => (
                        <LayoutGridItem
                            key={ c.id }
                            center
                            alignItems="center"
                            justifyContent="center"
                            itemActive={ selectedColour?.id === c.id }
                            className="cursor-pointer"
                            onClick={ () => { setSelectedColour(c); setMessage(''); } }
                        >
                            <div
                                style={ {
                                    width: 26,
                                    height: 26,
                                    borderRadius: '50%',
                                    background: c.isRainbow ? 'linear-gradient(135deg, #ef4444, #eab308, #10b981, #06b6d4, #8b5cf6)' : c.hex,
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
                                    border: '1px solid rgba(0,0,0,0.1)'
                                } }
                            />
                        </LayoutGridItem>
                    )) }
                </AutoGrid>
            </Column>

            <Column size={ 5 } overflow="hidden" justifyContent="between">
                { selectedColour && (
                    <Column fullHeight center justifyContent="between" className="text-center p-3 bg-gray-50 rounded-lg">
                        <Column center gap={ 2 } fullWidth>
                            <Text fontWeight="bold" fontSize={ 4 }>{ selectedColour.name }</Text>
                            <div className="p-3 bg-white rounded border border-gray-300 w-full shadow-inner my-2 flex items-center justify-center">
                                <Text fontSize={ 5 } className="text-gray-800 font-medium">
                                    Vista Previa: { ' ' }
                                    <span
                                        style={ {
                                            fontWeight: 'bold',
                                            fontSize: 16,
                                            color: selectedColour.isRainbow ? '#ec4899' : selectedColour.hex,
                                            textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                        } }
                                    >
                                        { selectedColour.isRainbow ? (
                                            username.split('').map((char, i) => {
                                                const rainbowPalette = ['#ef4444', '#f97316', '#eab308', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6'];
                                                return <span key={ i } style={ { color: rainbowPalette[i % rainbowPalette.length] } }>{ char }</span>;
                                            })
                                        ) : (
                                            username
                                        ) }
                                    </span>
                                </Text>
                            </div>
                            <Flex alignItems="center" justifyContent="center" gap={ 1 } className="my-1">
                                <Text fontWeight="bold" fontSize={ 5 }>Precio: 30</Text>
                                <LayoutCurrencyIcon type={ 5 } />
                            </Flex>
                            { message ? (
                                <Text className="text-xs font-semibold text-emerald-600">
                                    { message }
                                </Text>
                            ) : (
                                <Text className="text-xs text-gray-500">
                                    { isCurrentlyEquipped ? 'Este color está actualmente activo en tu usuario.' : (isOwned ? 'Color disponible en tu membresía VIP.' : 'Haz clic en comprar para adquirirlo.') }
                                </Text>
                            ) }
                        </Column>
                        <Column fullWidth gap={ 1 }>
                            { isCurrentlyEquipped ? (
                                <Button fullWidth variant="secondary" disabled>
                                    Color Equipado ✓
                                </Button>
                            ) : (
                                <Button fullWidth variant="success" disabled={ isSubmitting } onClick={ handleAction }>
                                    { isSubmitting ? 'Procesando...' : (isOwned ? 'Equipar Color' : 'Comprar y Activar') }
                                </Button>
                            ) }
                        </Column>
                    </Column>
                ) }
            </Column>
        </Grid>
    );
};
