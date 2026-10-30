import { FurnitureListComposer } from '@nitrots/nitro-renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { attemptItemPlacement, GroupItem, SendMessageComposer } from '../../../api';
import { useInventoryFurni } from '../../../hooks';

interface HabboHandShockwaveViewProps {
    isClosing?: boolean;
    onClose: () => void;
}

// Coordenadas calibradas con precisión 1:1 en la palma de room_hand_3.png (367x191)
// Todos los 9 slots se sitúan 100% en el centro de la palma sin salirse hacia el antebrazo ni los dedos
const HAND_SLOTS = [
    { top: 66, left: 120 },
    { top: 66, left: 154 },
    { top: 66, left: 188 },
    { top: 94, left: 114 },
    { top: 94, left: 148 },
    { top: 94, left: 182 },
    { top: 122, left: 96 },
    { top: 122, left: 130 },
    { top: 122, left: 164 }
];

export const HabboHandShockwaveView: FC<HabboHandShockwaveViewProps> = ({ isClosing = false, onClose }) => {
    const { groupItems = [], selectedItem = null, setSelectedItem = null, activate = null, deactivate = null } = useInventoryFurni();
    const [pageIndex, setPageIndex] = useState(0);
    const [hoveredItem, setHoveredItem] = useState<GroupItem | null>(null);

    useEffect(() => {
        const id = activate ? activate() : null;
        SendMessageComposer(new FurnitureListComposer());

        return () => {
            if (deactivate && id) deactivate(id);
        };
    }, [activate, deactivate]);

    const pageSize = 9;
    const totalPages = Math.max(1, Math.ceil(groupItems.length / pageSize));
    const currentPage = pageIndex % totalPages;

    const visibleItems = useMemo(() => {
        const start = currentPage * pageSize;
        return groupItems.slice(start, start + pageSize);
    }, [groupItems, currentPage]);

    const handleNextPage = () => {
        setPageIndex(prev => (prev + 1) % totalPages);
    };

    const handleItemClick = (item: GroupItem) => {
        if (isClosing) return;
        setSelectedItem(item);
        attemptItemPlacement(item);
    };

    const activeHoverItem = !isClosing ? (hoveredItem || selectedItem) : null;

    return (
        <div className={`habbo-hand-shockwave-container ${isClosing ? 'closing' : ''}`}>
            { /* Tooltip de información del ítem encima de la mano cuando hay hover o selección */}
            {activeHoverItem && (
                <div className="habbo-hand-tooltip">
                    <span>
                        {activeHoverItem.name}
                        {activeHoverItem.getUnlockedCount() > 1 && ` (${activeHoverItem.getUnlockedCount()})`}
                    </span>
                </div>
            )}

            { /* Ilustración auténtica de La Mano Shockwave v14 (room_hand_3.png) */}
            <div className="habbo-hand-graphic">
                { /* Botón Cerrar [x] en la esquina superior */}
                {!isClosing && (
                    <button
                        type="button"
                        className="habbo-hand-close-btn"
                        onClick={onClose}
                        title="Cerrar la mano"
                    />
                )}

                { /* Mensaje auténtico en el centro de la palma si no hay ítems */}
                {groupItems.length === 0 && (
                    <div className="habbo-hand-empty-notice">
                        La mano está vacía
                    </div>
                )}

                { /* Slots para los 9 ítems sobre la palma */}
                {visibleItems.map((item, index) => {
                    const pos = HAND_SLOTS[index];
                    if (!pos) return null;

                    const count = item.getUnlockedCount();
                    const isSelected = selectedItem === item;

                    return (
                        <div
                            key={`${item.type}_${index}`}
                            className={`habbo-hand-slot ${isSelected ? 'selected' : ''}`}
                            style={{ top: `${pos.top}px`, left: `${pos.left}px` }}
                            onClick={() => handleItemClick(item)}
                            onDoubleClick={() => handleItemClick(item)}
                            onMouseEnter={() => setHoveredItem(item)}
                            onMouseLeave={() => setHoveredItem(null)}
                            title={item.name}
                        >
                            {item.iconUrl && (
                                <img
                                    src={item.iconUrl}
                                    alt={item.name}
                                    className="habbo-hand-furni-icon"
                                    draggable={false}
                                />
                            )}
                            {count > 1 && (
                                <span className="habbo-hand-item-count">{count}</span>
                            )}
                        </div>
                    );
                })}

                { /* Botón "More stuff >" auténtico si hay más de 9 ítems */ }
                { (!isClosing && totalPages > 1) && (
                    <button
                        type="button"
                        className="habbo-hand-next-btn"
                        onClick={ handleNextPage }
                        title={`Página ${ currentPage + 1 } de ${ totalPages }`}
                    />
                ) }
            </div>
        </div>
    );
};
