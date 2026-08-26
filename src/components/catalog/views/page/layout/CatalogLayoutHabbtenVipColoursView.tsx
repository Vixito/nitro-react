import { HabboClubLevelEnum } from '@nitrots/nitro-renderer';
import { FC, useMemo, useState } from 'react';
import { AutoGrid, Button, Column, Flex, Grid, LayoutCurrencyIcon, LayoutGridItem, Text } from '../../../../../common';
import { usePurse, useSessionInfo } from '../../../../../hooks';
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
    const { getClubMemberLevel = null } = usePurse();
    const { userInfo = null } = useSessionInfo();

    const isVip = useMemo(() => {
        if(!getClubMemberLevel) return false;
        return getClubMemberLevel() >= HabboClubLevelEnum.VIP;
    }, [ getClubMemberLevel ]);

    const username = userInfo?.username || 'Usuario';

    const openStore = () => {
        window.open('/tienda', '_blank');
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
                <AutoGrid columnCount={ 2 } className="p-1">
                    { VIP_COLOURS.map(c => (
                        <LayoutGridItem
                            key={ c.id }
                            column={ false }
                            center={ false }
                            alignItems="center"
                            justifyContent="between"
                            itemActive={ selectedColour?.id === c.id }
                            className="p-2 cursor-pointer"
                            onClick={ () => setSelectedColour(c) }
                        >
                            <Flex alignItems="center" gap={ 2 }>
                                <div
                                    style={ {
                                        width: 18,
                                        height: 18,
                                        borderRadius: '50%',
                                        background: c.isRainbow ? 'linear-gradient(135deg, #ef4444, #eab308, #10b981, #06b6d4, #8b5cf6)' : c.hex,
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                    } }
                                />
                                <Text fontWeight="bold" fontSize={ 6 }>{ c.name }</Text>
                            </Flex>
                            <Flex alignItems="center" gap={ 1 }>
                                <Text fontSize={ 6 } fontWeight="bold">30</Text>
                                <LayoutCurrencyIcon type={ 5 } />
                            </Flex>
                        </LayoutGridItem>
                    )) }
                </AutoGrid>
            </Column>

            <Column size={ 5 } overflow="hidden" justifyContent="between">
                { selectedColour && (
                    <Column fullHeight center justifyContent="between" className="text-center p-3 bg-gray-50 rounded-lg">
                        <Column center gap={ 2 }>
                            <Text fontWeight="bold" fontSize={ 4 }>{ selectedColour.name }</Text>
                            <div className="p-3 bg-white rounded-lg border border-gray-200 w-full shadow-inner my-2">
                                <Text className="text-xs text-gray-400 mb-1">Vista Previa:</Text>
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
                            </div>
                            <Flex alignItems="center" justifyContent="center" gap={ 1 } className="my-1">
                                <Text fontWeight="bold" fontSize={ 5 }>Valor individual: 30</Text>
                                <LayoutCurrencyIcon type={ 5 } />
                            </Flex>
                            <Text className="text-xs text-gray-600">
                                Para activar este color en cualquier momento, escribe en el chat:
                            </Text>
                            <code className="text-xs bg-gray-200 px-2 py-1 rounded font-mono text-gray-800">
                                :namecolour { selectedColour.id }
                            </code>
                            <Text className="text-xs text-gray-500 mt-1">
                                Nota: El comando y los colores permanecen activos mientras tu membresía VIP esté vigente.
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
