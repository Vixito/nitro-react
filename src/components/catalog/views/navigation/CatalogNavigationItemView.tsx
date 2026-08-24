import { FC } from 'react';
import { FaCaretDown, FaCaretUp } from 'react-icons/fa';
import { ICatalogNode } from '../../../../api';
import { Base, LayoutGridItem, Text } from '../../../../common';
import { useCatalog } from '../../../../hooks';
import { CatalogIconView } from '../catalog-icon/CatalogIconView';
import { CatalogNavigationSetView } from './CatalogNavigationSetView';

export interface CatalogNavigationItemViewProps
{
    node: ICatalogNode;
    child?: boolean;
}

export const CatalogNavigationItemView: FC<CatalogNavigationItemViewProps> = props =>
{
    const { node = null, child = false } = props;
    const { activateNode = null, activeNodes = [] } = useCatalog();
    
    const isNodeActive = (activeNodes && activeNodes.length > 0 && activeNodes[activeNodes.length - 1] === node) || node.isActive;

    return (
        <Base className="nitro-catalog-navigation-section">
            <LayoutGridItem gap={ 1 } column={ false } itemActive={ isNodeActive } onClick={ event => activateNode(node) } className={ child ? 'inset' : '' }>
                <CatalogIconView icon={ node.iconId } />
                <Text grow truncate>{ node.localization }</Text>
                { node.isBranch &&
                    <>
                        { node.isOpen && <FaCaretUp className="fa-icon" /> }
                        { !node.isOpen && <FaCaretDown className="fa-icon" /> }
                    </> }
            </LayoutGridItem>
            { node.isOpen && node.isBranch &&
                <CatalogNavigationSetView node={ node } child={ true } /> }
        </Base>
    );
}
