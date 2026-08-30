import { HabboClubLevelEnum, RoomControllerLevel } from '@nitrots/nitro-renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { GetSessionDataManager } from '../../../../../api';
import { Button, Column, Flex, Grid, LayoutAvatarImageView, LayoutCurrencyIcon, Text } from '../../../../../common';
import { useInventoryBadges, usePurse, useSessionInfo } from '../../../../../hooks';
import { CatalogLayoutProps } from './CatalogLayout.types';

interface ColourOption {
    id: string;
    name: string;
    hex: string;
    isRainbow?: boolean;
}

const VIP_COLOURS: ColourOption[] = [
    { id: '', name: 'Predeterminado', hex: '#0f172a' },
    { id: 'rainbow', name: 'Rainbow (Arcoíris)', hex: '#ec4899', isRainbow: true },
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
    const [ messageType, setMessageType ] = useState<'success' | 'danger'>('success');
    
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
    const userFigure = userInfo?.figure || '';

    const fetchStatus = () => {
        fetch('/api/catalog/user-vip-status')
            .then(res => {
                if (!res.ok) return null;
                return res.json();
            })
            .then(data => {
                if (data && data.success) {
                    if (data.active_colour !== undefined) {
                        setActiveColourId(data.active_colour || '');
                        const found = VIP_COLOURS.find(c => c.id === (data.active_colour || ''));
                        if (found) setSelectedColour(found);
                    }
                    if (data.unlocked_colours) setUnlockedColours(data.unlocked_colours);
                }
            })
            .catch(() => {});
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const isOwned = useMemo(() => {
        if (!selectedColour) return false;
        return selectedColour.id === '' || unlockedColours.includes(selectedColour.id) || isVip;
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
                    setMessage('¡Color de nombre equipado con éxito!');
                    setMessageType('success');
                } else {
                    setMessage(data.error || 'Error al equipar el color.');
                    setMessageType('danger');
                }
            } else {
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
                    setMessageType('success');
                } else {
                    setMessage(data.error || 'Error en la compra');
                    setMessageType('danger');
                }
            }
        } catch (e) {
            setMessage('Error de conexión con el servidor.');
            setMessageType('danger');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Grid className="p-1">
            <Column fullHeight size={ 6 } gap={ 2 } overflow="hidden">
                <Column gap={ 1 }>
                    <Text fontWeight="bold" fontSize={ 5 }>Personaliza el Color de tu Nombre</Text>
                    <Text className="text-xs text-muted">
                        Elige un color exclusivo para destacar tu nombre de usuario en el chat y salas del hotel.
                    </Text>
                </Column>

                <Column gap={ 1 }>
                    <Flex justifyContent="between" alignItems="center">
                        <Text fontWeight="bold" fontSize={ 6 }>Paleta de Colores VIP:</Text>
                        <span className="badge bg-secondary text-xs">{ selectedColour.name }</span>
                    </Flex>
                    <div className="d-flex flex-wrap gap-2 p-2 rounded" style={ { background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)' } }>
                        { VIP_COLOURS.map(color => {
                            const isSelected = selectedColour.id === color.id;
                            const isEquipped = activeColourId === color.id;
                            return (
                                <button
                                    key={ color.id }
                                    type="button"
                                    title={ color.name }
                                    onClick={ () => { setSelectedColour(color); setMessage(''); } }
                                    className="p-0 border-0 cursor-pointer position-relative"
                                    style={ {
                                        width: 26,
                                        height: 26,
                                        borderRadius: '50%',
                                        background: color.isRainbow 
                                            ? 'linear-gradient(135deg, #ef4444, #eab308, #10b981, #3b82f6, #a855f7)'
                                            : color.hex,
                                        outline: isSelected ? '2px solid #0284c7' : '1px solid rgba(0,0,0,0.2)',
                                        outlineOffset: 2,
                                        transition: 'transform 0.15s ease'
                                    } }
                                >
                                    { isEquipped && (
                                        <span
                                            style={ {
                                                position: 'absolute',
                                                bottom: -2,
                                                right: -2,
                                                width: 10,
                                                height: 10,
                                                borderRadius: '50%',
                                                background: '#10b981',
                                                border: '1px solid #ffffff'
                                            } }
                                        />
                                    ) }
                                </button>
                            );
                        }) }
                    </div>
                </Column>

                <Column gap={ 1 }>
                    <Text className="text-xs text-muted">
                        El color se aplicará inmediatamente a tu nombre en los mensajes del chat y perfil.
                    </Text>
                </Column>
            </Column>

            <Column size={ 6 } overflow="hidden" justifyContent="between" gap={ 2 }>
                <Column gap={ 2 } className="pt-1">
                    <Text fontWeight="bold" fontSize={ 5 } center>Vista Previa en Chat</Text>
                    
                    <div
                        className="p-2 rounded shadow-sm"
                        style={ {
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            minHeight: 70,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                        } }
                    >
                        { userFigure && (
                            <div style={ { width: 32, height: 32, overflow: 'hidden', flexShrink: 0 } }>
                                <LayoutAvatarImageView figure={ userFigure } headOnly={ true } direction={ 2 } />
                            </div>
                        ) }
                        <div className="d-flex flex-wrap align-items-center gap-1 text-sm">
                            <span
                                style={ {
                                    fontWeight: 'bold',
                                    color: selectedColour.isRainbow ? '#ec4899' : (selectedColour.id ? selectedColour.hex : '#0f172a'),
                                    background: selectedColour.isRainbow 
                                        ? 'linear-gradient(90deg, #ef4444, #eab308, #10b981, #3b82f6, #a855f7)'
                                        : 'transparent',
                                    WebkitBackgroundClip: selectedColour.isRainbow ? 'text' : undefined,
                                    WebkitTextFillColor: selectedColour.isRainbow ? 'transparent' : undefined
                                } }
                            >
                                { username }:
                            </span>
                            <span style={ { color: '#334155' } }>¡Así lucirá mi nombre en Habbten!</span>
                        </div>
                    </div>

                    { isVip ? (
                        <Column gap={ 1 }>
                            { isCurrentlyEquipped ? (
                                <Button fullWidth variant="secondary" disabled>
                                    Color Actualmente Activo ✓
                                </Button>
                            ) : (
                                <Button fullWidth variant="success" onClick={ handleAction } disabled={ isSubmitting }>
                                    { isSubmitting ? 'Guardando...' : (isOwned ? 'Equipar Color' : 'Comprar y Activar') }
                                </Button>
                            ) }
                            { message && (
                                <Text center className={ `text-xs ${ messageType === 'success' ? 'text-success fw-bold' : 'text-danger fw-bold' }` }>
                                    { message }
                                </Text>
                            ) }
                            <Text center className="text-xs text-muted mt-1">
                                Comandos rápidos: <b>:namecolor [color]</b> o <b>:color [color]</b>
                            </Text>
                        </Column>
                    ) : (
                        <Column gap={ 1 } center className="p-2 bg-warning-subtle rounded border border-warning text-center">
                            <Text fontWeight="bold" className="text-warning-emphasis text-xs">
                                ⭐ Exclusivo para Habbten VIP
                            </Text>
                            <Text className="text-xs text-secondary">
                                Activa tu membresía VIP para personalizar el color de tu nombre con paletas y efectos únicos.
                            </Text>
                            <Button fullWidth variant="primary" className="btn-sm" onClick={ () => window.open('/tienda', '_blank') }>
                                Obtener Habbten VIP
                            </Button>
                        </Column>
                    ) }
                </Column>
            </Column>
        </Grid>
    );
};
