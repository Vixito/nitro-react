import { FC, useEffect, useMemo, useState } from 'react';
import { HabboClubLevelEnum } from '../../../../../api';
import { AutoGrid, Button, Column, Flex, Grid, LayoutGridItem, Text } from '../../../../../common';
import { usePurse } from '../../../../../hooks';
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

export const CatalogLayoutHabbtenVipBubblesView: FC<CatalogLayoutProps> = props =>
{
    const [ bubbles, setBubbles ] = useState<ChatBubbleData[]>([]);
    const [ selectedBubble, setSelectedBubble ] = useState<ChatBubbleData>(null);
    const { getClubMemberLevel = null } = usePurse();

    const isVip = useMemo(() => {
        if(!getClubMemberLevel) return false;
        return getClubMemberLevel() >= HabboClubLevelEnum.VIP;
    }, [ getClubMemberLevel ]);

    useEffect(() => {
        fetch('/api/chat-bubbles')
            .then(res => res.json())
            .then(data => {
                if (data && data.success && data.bubbles) {
                    const vipOnly = data.bubbles.filter((b: ChatBubbleData) => b.is_vip && b.visible);
                    setBubbles(vipOnly);
                    if (vipOnly.length > 0) setSelectedBubble(vipOnly[0]);
                }
            })
            .catch(() => {});
    }, []);

    const openStore = () => {
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
                    Esta subsección requiere una suscripción activa a <b>Habbten VIP</b> para desbloquear y equipar estilos de burbujas de conversación prémium en todo el hotel.
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
                    { bubbles.map(b => (
                        <LayoutGridItem
                            key={ b.bubble_id }
                            column={ false }
                            center={ false }
                            alignItems="center"
                            justifyContent="between"
                            itemActive={ selectedBubble?.bubble_id === b.bubble_id }
                            className="p-2 cursor-pointer"
                            onClick={ () => setSelectedBubble(b) }
                        >
                            <Flex alignItems="center" gap={ 2 }>
                                { b.image_url && (
                                    <img
                                        src={ b.image_url }
                                        alt={ b.name }
                                        style={ { height: 24, objectFit: 'contain', imageRendering: 'pixelated' } }
                                        onError={ e => { (e.target as HTMLElement).style.display = 'none'; } }
                                    />
                                ) }
                                <Text fontWeight="bold" fontSize={ 6 }>{ b.name }</Text>
                            </Flex>
                        </LayoutGridItem>
                    )) }
                </AutoGrid>
            </Column>

            <Column size={ 5 } overflow="hidden" justifyContent="between">
                { selectedBubble && (
                    <Column fullHeight center justifyContent="between" className="text-center p-3 bg-gray-50 rounded-lg">
                        <Column center gap={ 2 }>
                            <Text fontWeight="bold" fontSize={ 4 }>{ selectedBubble.name }</Text>
                            { selectedBubble.image_url && (
                                <img
                                    src={ selectedBubble.image_url }
                                    alt={ selectedBubble.name }
                                    style={ { maxHeight: 48, objectFit: 'contain', imageRendering: 'pixelated' } }
                                />
                            ) }
                            <Text className="text-xs text-gray-600">
                                Burbuja exclusiva para miembros VIP de Habbten.
                            </Text>
                        </Column>
                        <Text className="text-xs text-green-700 font-semibold">
                            ✓ Membresía VIP activa
                        </Text>
                    </Column>
                ) }
            </Column>
        </Grid>
    );
};
