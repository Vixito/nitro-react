import { HabboClubLevelEnum, RoomControllerLevel } from '@nitrots/nitro-renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { GetSessionDataManager } from '../../../../../api';
import { Button, Column, Flex, Grid, LayoutAvatarImageView, LayoutCurrencyIcon, Text } from '../../../../../common';
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
    { id: 'rainbow', name: 'Rainbow (Arcoíris)', hex: '#ec4899', isRainbow: true },
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
    const userFigure = userInfo?.figure || '';

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
                    prefix_color: colorToSave,
                    cost_diamonds: 20
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
        <Grid className="p-1">
            <Column fullHeight size={ 6 } gap={ 2 } overflow="hidden">
                <Column gap={ 1 }>
                    <Text fontWeight="bold" fontSize={ 5 }>Personaliza tu Prefijo / Tag VIP</Text>
                    <Text className="text-xs text-muted">
                        Elige un prefijo de hasta 10 caracteres para mostrar antes de tu nombre en el chat.
                    </Text>
                </Column>

                <Column gap={ 1 }>
                    <Flex justifyContent="between" alignItems="center">
                        <Text fontWeight="bold" fontSize={ 6 }>Texto del Prefijo:</Text>
                        <Text className="text-xs text-muted">{ prefixText.length }/10</Text>
                    </Flex>
                    <Flex gap={ 1 }>
                        <input
                            type="text"
                            maxLength={ 10 }
                            placeholder="Ej: [VIP], [Rey], [Pro]"
                            value={ prefixText }
                            onChange={ e => setPrefixText(e.target.value.replace(/[<>{}\\/'"`;=]/g, '').slice(0, 10)) }
                            className="form-control form-control-sm text-sm flex-grow-1"
                            style={ { background: '#ffffff', color: '#0f172a', fontWeight: 'bold' } }
                        />
                        { prefixText && (
                            <Button variant="danger" className="btn-sm" onClick={ clearPrefix } disabled={ isSubmitting }>
                                Quitar
                            </Button>
                        ) }
                    </Flex>
                </Column>

                <Column gap={ 1 }>
                    <Text fontWeight="bold" fontSize={ 6 }>Atajos Rápidos:</Text>
                    <div className="d-flex flex-wrap gap-1">
                        { PRESET_PREFIXES.map(preset => (
                            <button
                                key={ preset }
                                type="button"
                                className="btn btn-outline-secondary btn-sm py-0 px-1 text-xs"
                                onClick={ () => setPrefixText(preset) }
                            >
                                { preset }
                            </button>
                        )) }
                    </div>
                </Column>

                <Column gap={ 1 }>
                    <Flex justifyContent="between" alignItems="center">
                        <Text fontWeight="bold" fontSize={ 6 }>Color del Prefijo:</Text>
                        <span className="badge bg-secondary text-xs">{ selectedColor.name }</span>
                    </Flex>
                    <div className="d-flex flex-wrap gap-2 p-2 rounded" style={ { background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)' } }>
                        { PREFIX_COLORS.map(color => {
                            const isSelected = selectedColor.id === color.id;
                            return (
                                <button
                                    key={ color.id }
                                    type="button"
                                    title={ color.name }
                                    onClick={ () => setSelectedColor(color) }
                                    className="p-0 border-0 cursor-pointer position-relative"
                                    style={ {
                                        width: 24,
                                        height: 24,
                                        borderRadius: '50%',
                                        background: color.isRainbow 
                                            ? 'linear-gradient(135deg, #ef4444, #eab308, #10b981, #3b82f6, #a855f7)'
                                            : color.hex,
                                        outline: isSelected ? '2px solid #0284c7' : '1px solid rgba(0,0,0,0.2)',
                                        outlineOffset: 2,
                                        transition: 'transform 0.15s ease'
                                    } }
                                />
                            );
                        }) }
                    </div>
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
                            { prefixText && (
                                <span
                                    style={ {
                                        fontWeight: 'bold',
                                        color: selectedColor.isRainbow ? '#ec4899' : (selectedColor.id ? selectedColor.hex : '#64748b'),
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
                        </div>
                    </div>

                    { isVip ? (
                        <Column gap={ 1 }>
                            <Flex alignItems="center" justifyContent="center" gap={ 1 } className="my-1">
                                <Text fontWeight="bold" fontSize={ 5 }>Precio: 20</Text>
                                <LayoutCurrencyIcon type={ 5 } />
                            </Flex>
                            <Button fullWidth variant="success" onClick={ () => savePrefix() } disabled={ isSubmitting }>
                                { isSubmitting ? 'Guardando...' : 'Comprar y Aplicar Prefijo' }
                            </Button>
                            { message && (
                                <Text center className={ `text-xs ${ messageType === 'success' ? 'text-success fw-bold' : 'text-danger fw-bold' }` }>
                                    { message }
                                </Text>
                            ) }
                            <Text center className="text-xs text-muted mt-1">
                                Comandos rápidos en el chat: <b>:prefix [TAG]</b> y <b>:prefixcolor [color]</b>
                            </Text>
                        </Column>
                    ) : (
                        <Column gap={ 1 } center className="p-2 bg-warning-subtle rounded border border-warning text-center">
                            <Text fontWeight="bold" className="text-warning-emphasis text-xs">
                                ⭐ Exclusivo para Habbten VIP
                            </Text>
                            <Text className="text-xs text-secondary">
                                Activa tu suscripción VIP para usar prefijos, colores y tags de chat exclusivos.
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
