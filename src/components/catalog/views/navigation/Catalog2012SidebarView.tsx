import { FC, useEffect, useMemo, useState } from 'react';
import { ICatalogNode, LocalizeText } from '../../../../api';
import { useCatalog } from '../../../../hooks';
import { CatalogIconView } from '../catalog-icon/CatalogIconView';
import { CatalogSearchView } from '../page/common/CatalogSearchView';

interface Catalog2012SidebarViewProps
{
    onCloseClick: () => void;
}

const sanitizeLabel = (text: string): string =>
{
    if(!text) return '';
    return text
        .replace(/\bHabbo Club\b/gi, 'Habbten Club')
        .replace(/\bHabbo Hotel\b/gi, 'Hotel Habbten')
        .replace(/\bHabbos\b/gi, 'Habbten')
        .replace(/\bHabbo\b/gi, 'Habbten')
        .trim();
};

const getNodeKey = (node: ICatalogNode): string =>
{
    return `${ node.pageId }:${ node.pageName || node.localization }`;
};

export const Catalog2012SidebarView: FC<Catalog2012SidebarViewProps> = props =>
{
    const { onCloseClick } = props;
    const { rootNode = null, activeNodes = [], currentPage = null, searchResult = null, setSearchResult = null, activateNode = null } = useCatalog();
    const [ expandedKeys, setExpandedKeys ] = useState<Record<string, boolean>>({});

    // Aplana el contenedor genérico "Furni" para mostrar las secciones principales directamente
    // en la barra lateral derecha (Inicio, Furnis de Crédito, Lotes, VIP, Wired, Bots, Ropa, Mascotas, etc.)
    // tal como en la Tienda 2012 clásica.
    const sidebarRootItems = useMemo(() =>
    {
        if(!rootNode || !rootNode.children) return [];
        const items: ICatalogNode[] = [];

        for(const topChild of rootNode.children)
        {
            if(!topChild || !topChild.isVisible) continue;
            const visibleKids = topChild.children ? topChild.children.filter(c => c.isVisible) : [];
            const lowName = (topChild.localization || '').toLowerCase();

            if(visibleKids.length > 6 && (lowName === 'furni' || lowName === 'furniture' || lowName === 'muebles'))
            {
                for(const kid of visibleKids) items.push(kid);
            }
            else
            {
                items.push(topChild);
            }
        }

        return items;
    }, [ rootNode ]);

    // Auto-expandir ancestros cuando se navega desde fuera (enlaces de portada, búsqueda, etc.)
    useEffect(() =>
    {
        if(!activeNodes || !activeNodes.length) return;
        setExpandedKeys(prev =>
        {
            const next = { ...prev };
            let changed = false;
            for(const n of activeNodes)
            {
                if(n && n.children && n.children.some(c => c.isVisible))
                {
                    const key = getNodeKey(n);
                    if(!next[key])
                    {
                        next[key] = true;
                        changed = true;
                    }
                }
            }
            return changed ? next : prev;
        });
    }, [ activeNodes ]);

    const activeLeafNode = activeNodes && activeNodes.length > 0 ? activeNodes[activeNodes.length - 1] : null;

    const handleRowClick = (node: ICatalogNode) =>
    {
        if(!node) return;
        const visibleKids = node.children ? node.children.filter(c => c.isVisible) : [];
        const hasChildren = visibleKids.length > 0;
        const key = getNodeKey(node);

        if(searchResult) setSearchResult(null);

        if(hasChildren)
        {
            const isCurrentlyExpanded = !!expandedKeys[key];
            const isNodeOrDescendantActive = activeNodes.includes(node);

            if(isCurrentlyExpanded && isNodeOrDescendantActive)
            {
                setExpandedKeys(prev => ({ ...prev, [key]: false }));
                return;
            }

            setExpandedKeys(prev => ({ ...prev, [key]: true }));
            activateNode(node);
            return;
        }

        activateNode(node);
    };

    const renderNodeRow = (node: ICatalogNode, depth: number = 0): JSX.Element =>
    {
        if(!node || !node.isVisible) return null;
        const visibleKids = node.children ? node.children.filter(c => c.isVisible) : [];
        const hasChildren = visibleKids.length > 0;
        const key = getNodeKey(node);
        const isExpanded = !!expandedKeys[key];

        const isActive = (activeLeafNode === node)
            || (node.pageId > 0 && currentPage && node.pageId === currentPage.pageId && !hasChildren)
            || (activeLeafNode === node && hasChildren);
        const isBranchHighlighted = hasChildren && !isActive && activeNodes.includes(node) && !isExpanded;

        return (
            <div key={ key } className={ `f12-nav-group depth-${ Math.min(depth, 3) }` }>
                <button
                    type="button"
                    className={ `f12-nav-row ${ (isActive || isBranchHighlighted) ? 'active' : '' } ${ depth > 0 ? 'sub-row' : '' }` }
                    style={ depth > 0 ? { paddingLeft: `${ depth * 12 }px` } : undefined }
                    onClick={ () => handleRowClick(node) }
                    title={ sanitizeLabel(node.localization) }
                >
                    <span className="f12-nav-icon-box">
                        <CatalogIconView icon={ node.iconId } />
                    </span>
                    <span className="f12-nav-label">
                        { sanitizeLabel(node.localization) }
                    </span>
                    { hasChildren && (
                        <span className={ `f12-nav-caret ${ isExpanded ? 'expanded' : '' }` } aria-hidden="true" />
                    ) }
                </button>
                { hasChildren && isExpanded && (
                    <div className="f12-nav-children">
                        { visibleKids.map(child => renderNodeRow(child, depth + 1)) }
                    </div>
                ) }
            </div>
        );
    };

    return (
        <div className="flash2012-catalog-sidebar">
            <div className="flash2012-catalog-sidebar-header flash2012-catalog-drag-handle">
                <span className="f12-sidebar-grip left" aria-hidden="true" />
                <span className="f12-sidebar-title">
                    { LocalizeText('catalog.title') || 'Tienda' }
                </span>
                <span className="f12-sidebar-grip right" aria-hidden="true" />
                <button
                    type="button"
                    className="f12-sidebar-close-btn"
                    onClick={ onCloseClick }
                    aria-label="Cerrar Tienda"
                    title="Cerrar"
                />
            </div>

            <div className="flash2012-catalog-sidebar-body">
                <div className="flash2012-catalog-sidebar-list">
                    { searchResult && searchResult.filteredNodes && searchResult.filteredNodes.length > 0 ? (
                        searchResult.filteredNodes.map((n, idx) => (
                            <div key={ `search-${ idx }-${ n.pageId }` } className="f12-nav-group depth-0">
                                <button
                                    type="button"
                                    className={ `f12-nav-row ${ activeLeafNode === n ? 'active' : '' }` }
                                    onClick={ () => activateNode(n) }
                                    title={ sanitizeLabel(n.localization) }
                                >
                                    <span className="f12-nav-icon-box">
                                        <CatalogIconView icon={ n.iconId } />
                                    </span>
                                    <span className="f12-nav-label">
                                        { sanitizeLabel(n.localization) }
                                    </span>
                                </button>
                            </div>
                        ))
                    ) : (
                        sidebarRootItems.map(node => renderNodeRow(node, 0))
                    ) }
                </div>
            </div>

            <div className="flash2012-catalog-sidebar-footer">
                <CatalogSearchView />
            </div>
        </div>
    );
};

