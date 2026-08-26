import { HabboClubLevelEnum, RoomControllerLevel } from '@nitrots/nitro-renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { GetSessionDataManager } from '../../../../../api';
import { AutoGrid, Button, Column, Flex, Grid, LayoutCurrencyIcon, LayoutGridItem, Text } from '../../../../../common';
import { useInventoryBadges, usePurse } from '../../../../../hooks';
import { CatalogLayoutProps } from './CatalogLayout.types';

interface ChatBubbleData {
    bubble_id: number;
    name: string;
    image_url: string;
    text_color: string;
    min_rank: number;
    is_hc: number;
    is_vip: number;
    visible: number;
}

const DEFAULT_VIP_BUBBLES: ChatBubbleData[] = [
    { bubble_id: 24, name: 'Murciélagos', image_url: '/img/chatbubbles/bubble_24.png', text_color: 'ffffff', min_rank: 1, is_hc: 0, is_vip: 1, visible: 1 },
    { bubble_id: 25, name: 'Mensajero', image_url: '/img/chatbubbles/bubble_25.png', text_color: '000000', min_rank: 1, is_hc: 0, is_vip: 1, visible: 1 },
    { bubble_id: 26, name: 'Steampunk', image_url: '/img/chatbubbles/bubble_26.png', text_color: '000000', min_rank: 1, is_hc: 0, is_vip: 1, visible: 1 },
    { bubble_id: 27, name: 'Tormenta / Rayo', image_url: '/img/chatbubbles/bubble_27.png', text_color: 'ffffff', min_rank: 1, is_hc: 0, is_vip: 1, visible: 1 },
    { bubble_id: 28, name: 'Loro', image_url: '/img/chatbubbles/bubble_28.png', text_color: '000000', min_rank: 1, is_hc: 0, is_vip: 1, visible: 1 },
    { bubble_id: 29, name: 'Pirata', image_url: '/img/chatbubbles/bubble_29.png', text_color: '000000', min_rank: 1, is_hc: 0, is_vip: 1, visible: 1 },
    { bubble_id: 32, name: 'Terror / Pesadilla', image_url: '/img/chatbubbles/bubble_32.png', text_color: 'ffffff', min_rank: 1, is_hc: 0, is_vip: 1, visible: 1 },
    { bubble_id: 35, name: 'Cabra', image_url: '/img/chatbubbles/bubble_35.png', text_color: '000000', min_rank: 1, is_hc: 0, is_vip: 1, visible: 1 },
    { bubble_id: 36, name: 'Santa', image_url: '/img/chatbubbles/bubble_36.png', text_color: '000000', min_rank: 1, is_hc: 0, is_vip: 1, visible: 1 },
    { bubble_id: 38, name: 'Radio Habbten', image_url: '/img/chatbubbles/bubble_38.png', text_color: '000000', min_rank: 1, is_hc: 0, is_vip: 1, visible: 1 }
];

export const CatalogLayoutHabbtenVipBubblesView: FC<CatalogLayoutProps> = props => {
    const [bubbles, setBubbles] = useState<ChatBubbleData[]>(DEFAULT_VIP_BUBBLES);
    const [selectedBubble, setSelectedBubble] = useState<ChatBubbleData>(DEFAULT_VIP_BUBBLES[0]);
    const [activeBubbleId, setActiveBubbleId] = useState<number>(0);
    const [isBuying, setIsBuying] = useState<boolean>(false);
    const [message, setMessage] = useState<string>('');
    const { purse = null, getClubMemberLevel = null } = usePurse();
    const { badgeCodes = [] } = useInventoryBadges();

    const isVip = useMemo(() => {
        const hasClub = (getClubMemberLevel ? getClubMemberLevel() >= HabboClubLevelEnum.CLUB : false) || (purse && (purse.clubDays > 0 || purse.clubPeriods > 0 || purse.isVip));
        const hasBadgeVip = badgeCodes.includes('VIP') || badgeCodes.includes('ACH_VipClub1');
        const isStaff = GetSessionDataManager().hasSecurity(RoomControllerLevel.MODERATOR);
        return hasClub || hasBadgeVip || isStaff;
    }, [purse, getClubMemberLevel, badgeCodes]);

    useEffect(() => {
        fetch('/api/chat-bubbles')
            .then(res => {
                if (!res.ok) return null;
                const ct = res.headers.get('content-type');
                if (ct && ct.includes('application/json')) return res.json();
                return null;
            })
            .then(data => {
                if (data && data.success && data.bubbles) {
                    const vipOnly = data.bubbles.filter((b: ChatBubbleData) => b.is_vip && b.visible);
                    if (vipOnly.length > 0) {
                        setBubbles(vipOnly);
                        setSelectedBubble(vipOnly[0]);
                    }
                }
            })
            .catch(() => { });
    }, []);

    const openStore = () => {
        window.open('/tienda', '_blank');
    };

    const buyBubbleInGame = async () => {
        if (!selectedBubble || isBuying) return;
        setIsBuying(true);
        setMessage('');
        try {
            const res = await fetch('/api/catalog/buy-vip-item', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'bubble',
                    item_id: selectedBubble.bubble_id,
                    cost_diamonds: 50
                })
            });
            const data = await res.json();
            if (data.success) {
                setActiveBubbleId(selectedBubble.bubble_id);
                setMessage('¡Burbuja VIP activada con éxito!');
            } else {
                setMessage(data.error || 'Error al comprar');
            }
        } catch (e) {
            setMessage('Error de conexión.');
        } finally {
            setIsBuying(false);
        }
    };

    if (!isVip) {
        return (
            <Column fullHeight center justifyContent="center" className="p-4 text-center bg-gray-50 rounded-lg">
                <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mb-3 mx-auto shadow-sm">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <Text fontWeight="bold" fontSize={4} className="text-gray-900 mb-1">
                    Zona Exclusiva para Miembros Habbten VIP
                </Text>
                <Text className="text-xs text-gray-600 max-w-md mx-auto mb-4">
                    Esta subsección requiere una suscripción activa a <b>Habbten VIP</b> para desbloquear y equipar estilos de burbujas de conversación prémium en todo el hotel.
                </Text>
                <Button variant="success" onClick={openStore} className="px-6 py-2">
                    Adquirir Habbten VIP
                </Button>
            </Column>
        );
    }

    return (
        <Grid>
            <Column fullHeight size={7} overflow="hidden" justifyContent="between">
                <AutoGrid columnCount={5} className="p-1">
                    {bubbles.map(b => (
                        <LayoutGridItem
                            key={b.bubble_id}
                            center
                            alignItems="center"
                            justifyContent="center"
                            itemActive={selectedBubble?.bubble_id === b.bubble_id}
                            className="cursor-pointer"
                            onClick={() => { setSelectedBubble(b); setMessage(''); }}
                        >
                            {b.image_url ? (
                                <img
                                    src={b.image_url}
                                    alt={b.name}
                                    style={{ maxWidth: 36, maxHeight: 24, objectFit: 'contain', imageRendering: 'pixelated' }}
                                    onError={e => { (e.target as HTMLElement).style.display = 'none'; }}
                                />
                            ) : null}
                        </LayoutGridItem>
                    ))}
                </AutoGrid>
            </Column>

            <Column size={5} overflow="hidden" justifyContent="between">
                {selectedBubble && (
                    <Column fullHeight center justifyContent="between" className="text-center p-3 bg-gray-50 rounded-lg">
                        <Column center gap={2} fullWidth>
                            <Text fontWeight="bold" fontSize={4}>{selectedBubble.name}</Text>
                            <div className="p-3 bg-white rounded border border-gray-300 w-full shadow-inner my-2 flex flex-col items-center justify-center min-h-[60px]">
                                {selectedBubble.image_url && (
                                    <img
                                        src={selectedBubble.image_url}
                                        alt={selectedBubble.name}
                                        style={{ maxHeight: 36, objectFit: 'contain', imageRendering: 'pixelated' }}
                                    />
                                )}
                            </div>
                            <Flex alignItems="center" justifyContent="center" gap={1} className="my-1">
                                <Text fontWeight="bold" fontSize={5}>Precio: 50</Text>
                                <LayoutCurrencyIcon type={5} />
                            </Flex>
                            {message ? (
                                <Text className="text-xs font-semibold text-emerald-600">
                                    {message}
                                </Text>
                            ) : (
                                <Text className="text-xs text-gray-500">
                                    Haz clic en comprar para equipar esta burbuja en tus mensajes.
                                </Text>
                            )}
                        </Column>
                        <Column fullWidth gap={1}>
                            {activeBubbleId === selectedBubble.bubble_id ? (
                                <Button fullWidth variant="secondary" disabled>
                                    Burbuja Equipada ✓
                                </Button>
                            ) : (
                                <Button fullWidth variant="success" disabled={isBuying} onClick={buyBubbleInGame}>
                                    {isBuying ? 'Comprando...' : 'Comprar y Activar'}
                                </Button>
                            )}
                        </Column>
                    </Column>
                )}
            </Column>
        </Grid>
    );
};
