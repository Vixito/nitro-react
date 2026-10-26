import { FC, useMemo, useState } from 'react';
import { attemptItemPlacement, GroupItem } from '../../../api';
import { useInventoryFurni } from '../../../hooks';

interface HabboHandShockwaveViewProps
{
    onClose: () => void;
}

// Coordenadas isométricas 3x3 centradas en la palma de room_hand_3.png (367x191)
const HAND_SLOTS = [
    { top: 56,  left: 155 },
    { top: 78,  left: 200 },
    { top: 101, left: 245 },
    { top: 81,  left: 110 },
    { top: 103, left: 155 },
    { top: 126, left: 200 },
    { top: 106, left: 70  },
    { top: 128, left: 115 },
    { top: 151, left: 160 }
];

export const HabboHandShockwaveView: FC<HabboHandShockwaveViewProps> = ({ onClose }) =>
{
    const { groupItems = [], selectedItem = null, setSelectedItem = null } = useInventoryFurni();
    const [ pageIndex, setPageIndex ] = useState(0);
    const [ hoveredItem, setHoveredItem ] = useState<GroupItem | null>(null);

    const pageSize = 9;
    const totalPages = Math.max(1, Math.ceil(groupItems.length / pageSize));
    const currentPage = pageIndex % totalPages;

    const visibleItems = useMemo(() =>
    {
        const start = currentPage * pageSize;
        return groupItems.slice(start, start + pageSize);
    }, [ groupItems, currentPage ]);

    const handleNextPage = () =>
    {
        setPageIndex(prev => (prev + 1) % totalPages);
    };

    const handleItemClick = (item: GroupItem) =>
    {
        setSelectedItem(item);
        attemptItemPlacement(item);
    };

    const activeHoverItem = hoveredItem || selectedItem;

    return (
        <div className="habbo-hand-shockwave-container">
            { /* Tooltip de información del ítem encima de la mano */ }
            <div className="habbo-hand-tooltip">
                { activeHoverItem ? (
                    <span>
                        { activeHoverItem.name }
                        { activeHoverItem.getUnlockedCount() > 1 && ` (${ activeHoverItem.getUnlockedCount() })` }
                    </span>
                ) : (
                    <span className="habbo-hand-status">
                        { groupItems.length === 0 ? 'La mano está vacía' : `La Mano (${ groupItems.length } ítems)` }
                    </span>
                ) }
            </div>

            { /* Ilustración auténtica de La Mano Shockwave v14 (room_hand_3.png) */ }
            <div className="habbo-hand-graphic">
                { /* Botón Cerrar [x] en la esquina superior */ }
                <button
                    type="button"
                    className="habbo-hand-close-btn"
                    onClick={ onClose }
                    title="Cerrar la mano"
                />

                { /* Slots para los 9 ítems sobre la palma */ }
                { visibleItems.map((item, index) =>
                {
                    const pos = HAND_SLOTS[index];
                    if(!pos) return null;

                    const count = item.getUnlockedCount();
                    const isSelected = selectedItem === item;

                    return (
                        <div
                            key={ `${ item.type }_${ index }` }
                            className={ `habbo-hand-slot ${ isSelected ? 'selected' : '' }` }
                            style={ { top: `${ pos.top }px`, left: `${ pos.left }px` } }
                            onClick={ () => handleItemClick(item) }
                            onDoubleClick={ () => handleItemClick(item) }
                            onMouseEnter={ () => setHoveredItem(item) }
                            onMouseLeave={ () => setHoveredItem(null) }
                            title={ item.name }
                        >
                            { item.iconUrl && (
                                <img
                                    src={ item.iconUrl }
                                    alt={ item.name }
                                    className="habbo-hand-furni-icon"
                                    draggable={ false }
                                />
                            ) }
                            { count > 1 && (
                                <span className="habbo-hand-item-count">{ count }</span>
                            ) }
                        </div>
                    );
                }) }

                { /* Botón "More stuff >" auténtico si hay más de 9 ítems */ }
                { totalPages > 1 && (
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
