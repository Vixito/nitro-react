import { HabboClubLevelEnum, RoomControllerLevel } from '@nitrots/nitro-renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { GetSessionDataManager } from '../../../../../api';
import { AutoGrid, Button, Column, Flex, Grid, LayoutGridItem, Text } from '../../../../../common';
import { useInventoryBadges, usePurse, useSessionInfo } from '../../../../../hooks';
import { CatalogLayoutProps } from './CatalogLayout.types';

interface PrefixColorOption {
    id: string;
    name: string;
    hex: string;
    isRainbow?: boolean;
}

const PREFIX_COLORS: PrefixColorOption[] = [
    { id: '', name: 'Predeterminado', hex: '#64748b' },
    { id: 'rainbow', name: 'Rainbow', hex: '#ec4899', isRainbow: true },
    { id: 'red', name: 'Rojo', hex: '#ef4444' },
    { id: 'blue', name: 'Azul', hex: '#3b82f6' },
    { id: 'green', name: 'Verde', hex: '#10b981' },
    { id: 'yellow', name: 'Amarillo', hex: '#eab308' },
    { id: 'purple', name: 'Púrpura', hex: '#a855f7' },
    { id: 'black', name: 'Negro', hex: '#0f172a' },
    { id: 'brown', name: 'Marrón', hex: '#78350f' }
];

const PRESET_PREFIXES = [
    '[VIP]',
    '[💎]',
    '[PRO]',
    '[REY]',
    '[BOSS]',
    '[STAR]',
    '[⚡]',
    '[TOP]'
];

export const CatalogLayoutHabbtenVipPrefixView: FC<CatalogLayoutProps> = props =>
{
    const [ prefixText, setPrefixText ] = useState<string>('');
    const [ selectedColor, setSelectedColor ] = useState<PrefixColorOption>(PREFIX_COLORS[0]);
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

    const fetchStatus = () => {
        fetch('/api/catalog/user-vip-status')
            .then(res => {
                if (!res.ok) return null;
                return res.json();
            })
            .then(data => {
                if (data && data.success) {
                    if (data.active_prefix) setPrefixText(data.active_prefix);
                    if (data.active_prefix_color) {
                        const found = PREFIX_COLORS.find(c => c.id === data.active_prefix_color);
                        if (found) setSelectedColor(found);
                    }
                }
            })
            .catch(() => {});
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const savePrefix = async (prefixToSave = prefixText, colorToSave = selectedColor.id) => {
        if (!isVip) {
            setMessage('Se requiere membresía Habbten VIP.');
            setMessageType('danger');
            return;
        }

        setIsSubmitting(true);
        setMessage('');

        try {
            const res = await fetch('/api/catalog/set-vip-prefix', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prefix: prefixToSave,
                    prefix_color: colorToSave
                })
            });

            const data = await res.json();
            if (data && data.success) {
                setMessage(data.message || '¡Prefijo actualizado con éxito!');
                setMessageType('success');
                setPrefixText(data.prefix || '');
            } else {
                setMessage(data?.error || 'Error al guardar el prefijo.');
                setMessageType('danger');
            }
        } catch (e) {
            setMessage('Error de conexión con el servidor.');
            setMessageType('danger');
        } finally {
            setIsSubmitting(false);
        }
    };

    const clearPrefix = () => {
        savePrefix('', '');
    };

    return (
        <Grid>
            <Column fullHeight size={ 7 } overflow="auto" gap={ 2 }>
                <Column gap={ 1 }>
                    <Text fontWeight="bold" fontSize={ 5 }>Personaliza tu Prefijo / Tag VIP</Text>
                    <Text className="text-xs text-gray-500">
                        Elige un prefijo personalizado de hasta 11 caracteres que aparecerá antes de tu nombre en el chat del hotel.
                    </Text>
                </Column>

                <Column gap={ 1 } className="mt-1">
                    <Text fontWeight="bold" fontSize={ 6 }>Texto del Prefijo:</Text>
                    <Flex gap={ 1 }>
                        <input
                            type="text"
                            maxLength={ 11 }
                            placeholder="Ej: [VIP], [Rey], [Pro]"
                            value={ prefixText }
                            onChange={ e => setPrefixText(e.target.value) }
                            className="nitro-form-control p-2 text-sm flex-1 rounded border border-gray-300"
                            style={ { background: '#f8fafc', color: '#0f172a', fontWeight: 'bold' } }
                        />
                        { prefixText && (
                            <Button variant="danger" onClick={ clearPrefix } disabled={ isSubmitting }>
                                Quitar
                            </Button>
                        ) }
                    </Flex>
                </Column>

                <Column gap={ 1 } className="mt-1">
                    <Text fontWeight="bold" fontSize={ 6 }>Atajos Rápidos:</Text>
                    <Flex wrap gap={ 1 }>
                        { PRESET_PREFIXES.map(preset => (
                            <Button
                                key={ preset }
                                variant="secondary"
                                className="text-xs py-1 px-2"
                                onClick={ () => setPrefixText(preset) }
                            >
                                { preset }
                            </Button>
                        )) }
                    </Flex>
                </Column>

                <Column gap={ 1 } className="mt-1">
                    <Text fontWeight="bold" fontSize={ 6 }>Color del Prefijo:</Text>
                    <AutoGrid columnCount={ 3 } className="gap-1">
                        { PREFIX_COLORS.map(color => (
                            <LayoutGridItem
                                key={ color.id }
                                itemActive={ selectedColor.id === color.id }
                                className="p-2 cursor-pointer rounded"
                                onClick={ () => setSelectedColor(color) }
                            >
                                <Flex alignItems="center" gap={ 2 }>
                                    <div
                                        style={ {
                                            width: 14,
                                            height: 14,
                                            borderRadius: '50%',
                                            background: color.isRainbow 
                                                ? 'linear-gradient(135deg, #ef4444, #eab308, #10b981, #3b82f6, #a855f7)'
                                                : color.hex,
                                            border: '1px solid rgba(0,0,0,0.2)'
                                        } }
                                    />
                                    <Text fontSize={ 6 } fontWeight={ selectedColor.id === color.id ? 'bold' : 'normal' }>
                                        { color.name }
                                    </Text>
                                </Flex>
                            </LayoutGridItem>
                        )) }
                    </AutoGrid>
                </Column>
            </Column>

            <Column size={ 5 } overflow="hidden" justifyContent="between">
                <Column fullHeight gap={ 2 } className="pt-2">
                    <Text fontWeight="bold" fontSize={ 5 } center>Vista Previa en Chat</Text>
                    
                    <div
                        className="p-3 rounded shadow-sm"
                        style={ {
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            minHeight: 80,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            gap: 4
                        } }
                    >
                        <Flex alignItems="center" gap={ 1 } wrap>
                            { prefixText && (
                                <span
                                    style={ {
                                        fontWeight: 'bold',
                                        color: selectedColor.isRainbow ? '#ec4899' : selectedColor.hex,
                                        background: selectedColor.isRainbow 
                                            ? 'linear-gradient(90deg, #ef4444, #eab308, #10b981, #3b82f6, #a855f7)'
                                            : 'transparent',
                                        WebkitBackgroundClip: selectedColor.isRainbow ? 'text' : undefined,
                                        WebkitTextFillColor: selectedColor.isRainbow ? 'transparent' : undefined
                                    } }
                                >
                                    { prefixText }
                                </span>
                            ) }
                            <span style={ { fontWeight: 'bold', color: '#0f172a' } }>{ username }:</span>
                            <span style={ { color: '#334155' } }>¡Hola a todos en Habbten!</span>
                        </Flex>
                    </div>

                    { isVip ? (
                        <Column gap={ 1 } className="mt-2">
                            <Button fullWidth variant="success" onClick={ () => savePrefix() } disabled={ isSubmitting }>
                                { isSubmitting ? 'Guardando...' : 'Aplicar Prefijo VIP' }
                            </Button>
                            { message && (
                                <Text center className={ `text-xs mt-1 ${ messageType === 'success' ? 'text-green-600 font-bold' : 'text-red-600 font-bold' }` }>
                                    { message }
                                </Text>
                            ) }
                            <Text center className="text-xs text-gray-500 mt-2">
                                También puedes usar en el chat los comandos: <b>:prefix [TAG]</b> y <b>:prefixcolor [color]</b>
                            </Text>
                        </Column>
                    ) : (
                        <Column gap={ 2 } center className="mt-2 p-3 bg-amber-50 rounded border border-amber-200 text-center">
                            <Text fontWeight="bold" className="text-amber-800 text-sm">
                                ⭐ Exclusivo para Habbten VIP
                            </Text>
                            <Text className="text-xs text-amber-700">
                                Adquiere tu suscripción Habbten VIP en la tienda del catálogo para desbloquear prefijos de chat, colores y ventajas exclusivas.
                            </Text>
                            <Button fullWidth variant="primary" onClick={ () => window.open('/tienda', '_blank') }>
                                Obtener Habbten VIP
                            </Button>
                        </Column>
                    ) }
                </Column>
            </Column>
        </Grid>
    );
};
