import { ILinkEventTracker } from '@nitrots/nitro-renderer';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { AddEventLinkTracker, GetConfiguration, ICatalogNode, LocalizeText, RemoveLinkEventTracker } from '../../api';
import catalogIconFrontpage from '../../assets/images/eras/shockwave_v14/catalog_icon_frontpage.png';
import catalogSpineImg from '../../assets/images/eras/shockwave_v14/catalog_spine.png';
import catalogTabLeftImg from '../../assets/images/eras/shockwave_v14/catalog_tab_left.png';
import catalogTabLeftActiveImg from '../../assets/images/eras/shockwave_v14/catalog_tab_left_active.png';
import catalogTabRightImg from '../../assets/images/eras/shockwave_v14/catalog_tab_right.png';
import catalogTabRightDisabledImg from '../../assets/images/eras/shockwave_v14/catalog_tab_right_disabled.png';
import { Column, DraggableWindow, DraggableWindowPosition, Flex, Grid, NitroCardContentView, NitroCardHeaderView, NitroCardTabsItemView, NitroCardTabsView, NitroCardView, ShockwaveDropdown } from '../../common';
import { useCatalog } from '../../hooks';
import { useEraTheme } from '../../hooks/era/useEraTheme';
import { CatalogIconView } from './views/catalog-icon/CatalogIconView';
import { CatalogGiftView } from './views/gift/CatalogGiftView';
import { CatalogNavigationView } from './views/navigation/CatalogNavigationView';
import { GetCatalogLayout } from './views/page/layout/GetCatalogLayout';
import { MarketplacePostOfferView } from './views/page/layout/marketplace/MarketplacePostOfferView';

const sanitizeCatalogTitle = (text: string): string =>
{
    if(!text) return '';
    return text
        .replace(/\bHabbo Club\b/gi, 'Habbten Club')
        .replace(/\bHabbo Hotel\b/gi, 'Hotel Habbten')
        .replace(/\bHabbos\b/gi, 'Habbten')
        .replace(/\bHabbo\b/gi, 'Habbten')
        .trim();
};

const shortenTabLabel = (text: string): string =>
{
    const clean = sanitizeCatalogTitle(text);
    if(clean.length <= 7) return clean;
    return `${ clean.slice(0, 6) }.`;
};

interface IFlattenedSubPage
{
    node: ICatalogNode;
    label: string;
}

export const CatalogView: FC<{}> = props =>
{
    const { isVisible = false, setIsVisible = null, rootNode = null, currentPage = null, navigationHidden = false, setNavigationHidden = null, activeNodes = [], searchResult = null, setSearchResult = null, openPageByName = null, openPageByOfferId = null, openPageByFurniName = null, openSearchByName = null, activateNode = null } = useCatalog();
    const { currentEra } = useEraTheme();

    const [ tabStartIndex, setTabStartIndex ] = useState<number>(0);
    const VISIBLE_TABS_COUNT = 8;

    useEffect(() =>
    {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) =>
            {
                const parts = url.split('/');

                if(parts.length < 2) return;

                switch(parts[1])
                {
                    case 'show':
                        setIsVisible(true);
                        return;
                    case 'hide':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setIsVisible(prevValue => !prevValue);
                        return;
                    case 'open':
                        if(parts.length > 2)
                        {
                            if(parts.length >= 4)
                            {
                                switch(parts[2])
                                {
                                    case 'offerId':
                                        openPageByOfferId(parseInt(parts[3]));
                                        return;
                                    case 'furni':
                                        openPageByFurniName(parts.slice(3).join('/'));
                                        return;
                                    case 'search':
                                        openSearchByName(parts.slice(3).join('/'));
                                        return;
                                }
                            }
                            else
                            {
                                openPageByName(parts[2]);
                            }
                        }
                        else
                        {
                            setIsVisible(true);
                        }

                        return;
                }
            },
            eventUrlPrefix: 'catalog/'
        };

        AddEventLinkTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [ setIsVisible, openPageByOfferId, openPageByName, openPageByFurniName, openSearchByName ]);

    // Lista de pestañas para el Catálogo Shockwave 2006:
    // Pestaña 1 = Frontpage, seguida de todas las categorías principales (hijos de Furniture) y demás secciones
    const shockwaveTabs = useMemo(() =>
    {
        if(!rootNode || !rootNode.children) return [];
        const list: ICatalogNode[] = [];

        for(const topChild of rootNode.children)
        {
            if(!topChild || !topChild.isVisible) continue;
            const visibleChildren = topChild.children ? topChild.children.filter(c => c.isVisible) : [];

            if(visibleChildren.length === 0)
            {
                list.push(topChild);
            }
            else if(visibleChildren.length > 3)
            {
                // Categoría contenedora grande (ej. Muebles / Furni): mostrar cada subcategoría como pestaña del cuaderno
                for(const sub of visibleChildren)
                {
                    list.push(sub);
                }
            }
            else
            {
                list.push(topChild);
            }
        }

        return list;
    }, [ rootNode ]);

    // Pestaña superior actualmente activa
    const activeTabNode = useMemo(() =>
    {
        if(!shockwaveTabs.length) return null;
        if(!activeNodes || !activeNodes.length) return shockwaveTabs[0];

        for(let i = activeNodes.length - 1; i >= 0; i--)
        {
            const found = shockwaveTabs.find(t => t === activeNodes[i]);
            if(found) return found;
        }
        return shockwaveTabs[0];
    }, [ shockwaveTabs, activeNodes ]);

    // Sólo hacer auto-scroll cuando cambia realmente la pestaña activa, NUNCA al pulsar las flechas (evita el parpadeo/rebote)
    const lastActiveTabRef = useRef<ICatalogNode | null>(null);
    useEffect(() =>
    {
        if(currentEra !== 'shockwave2006' || !shockwaveTabs.length || !activeTabNode) return;
        if(lastActiveTabRef.current === activeTabNode) return;
        lastActiveTabRef.current = activeTabNode;

        const idx = shockwaveTabs.indexOf(activeTabNode);
        if(idx >= 0)
        {
            setTabStartIndex(prev =>
            {
                if(idx < prev) return idx;
                if(idx >= prev + VISIBLE_TABS_COUNT) return Math.max(0, idx - VISIBLE_TABS_COUNT + 1);
                return prev;
            });
        }
    }, [ activeTabNode, shockwaveTabs, currentEra ]);

    // Subcategorías / colecciones dentro de la pestaña activa (para navegar por todas las líneas de furnis)
    const currentTabSubPages = useMemo(() =>
    {
        if(!activeTabNode || !activeTabNode.children || activeTabNode.children.length === 0) return [];
        const subPages: IFlattenedSubPage[] = [];

        const walkChildren = (nodes: ICatalogNode[], prefix: string = '') =>
        {
            for(const n of nodes)
            {
                if(!n || !n.isVisible) continue;
                const cleanName = sanitizeCatalogTitle(n.localization);
                const fullLabel = prefix ? `${ prefix } › ${ cleanName }` : cleanName;
                const visibleKids = n.children ? n.children.filter(c => c.isVisible) : [];

                if(n.pageId > 0 || visibleKids.length === 0)
                {
                    subPages.push({ node: n, label: fullLabel });
                }

                if(visibleKids.length > 0)
                {
                    walkChildren(visibleKids, fullLabel);
                }
            }
        };

        walkChildren(activeTabNode.children, '');
        return subPages;
    }, [ activeTabNode ]);

    const activeLeafNode = activeNodes.length > 0 ? activeNodes[activeNodes.length - 1] : null;
    const selectedSubPageIdx = useMemo(() =>
    {
        if(!currentTabSubPages.length) return 0;
        const foundIdx = currentTabSubPages.findIndex(sp =>
            sp.node === activeLeafNode || (sp.node.pageId > 0 && sp.node.pageId === currentPage?.pageId)
        );
        return foundIdx >= 0 ? foundIdx : 0;
    }, [ currentTabSubPages, activeLeafNode, currentPage ]);

    const selectShockwaveNode = (target: ICatalogNode) =>
    {
        if(!target) return;
        if(searchResult) setSearchResult(null);
        if(setNavigationHidden) setNavigationHidden(false);

        // Si el nodo es una carpeta sin página propia (pageId <= 0), abrir su primera subpágina válida
        let finalTarget = target;
        while(finalTarget && finalTarget.pageId <= 0 && finalTarget.children && finalTarget.children.length > 0)
        {
            const firstVisible = finalTarget.children.find(c => c.isVisible);
            if(!firstVisible) break;
            finalTarget = firstVisible;
        }

        activateNode(finalTarget);
    };

    const canScrollLeft = tabStartIndex > 0;
    const canScrollRight = (tabStartIndex + VISIBLE_TABS_COUNT) < shockwaveTabs.length;
    const visibleShockwaveTabs = shockwaveTabs.slice(tabStartIndex, tabStartIndex + VISIBLE_TABS_COUNT);

    return (
        <>
            { isVisible && (currentEra === 'shockwave2006' ? (
                <DraggableWindow
                    uniqueKey="catalog-shockwave-2006"
                    handleSelector=".shockwave-catalog-drag-handle"
                    windowPosition={ DraggableWindowPosition.CENTER }
                    className="shockwave-catalog-draggable"
                >
                    <div className="shockwave-catalog-wrapper">
                        <div className="shockwave-catalog-book">
                            {/* LOMO DE ESPIRAL METÁLICO IZQUIERDO (IMAGEN 2 - LIMPIO SIN ARTEFACTOS) */}
                            <div
                                className="shockwave-catalog-spine shockwave-catalog-drag-handle"
                                style={ { backgroundImage: `url(${ catalogSpineImg })` } }
                                title="Arrastrar catálogo"
                            />

                            {/* CUERPO DEL CUADERNO DEL CATÁLOGO */}
                            <div className="shockwave-catalog-page">
                                {/* BARRA SUPERIOR DE PESTAÑAS CUADRADAS CON FLECHAS (IMAGEN 2) */}
                                <div className="shockwave-catalog-tabs-bar shockwave-catalog-drag-handle">
                                    <button
                                        type="button"
                                        className={ `shockwave-catalog-arrow-btn left ${ canScrollLeft ? 'enabled' : 'disabled' }` }
                                        onClick={ () => canScrollLeft && setTabStartIndex(prev => Math.max(0, prev - 2)) }
                                        disabled={ !canScrollLeft }
                                        aria-label="Pestañas anteriores"
                                    >
                                        <img
                                            src={ canScrollLeft ? catalogTabLeftActiveImg : catalogTabLeftImg }
                                            alt="<"
                                        />
                                    </button>

                                    <div className="shockwave-catalog-tabs-strip">
                                        { visibleShockwaveTabs.map((tabNode, idx) =>
                                        {
                                            const isTabActive = (activeTabNode === tabNode);
                                            const isFirstFrontpage = (tabStartIndex === 0 && idx === 0);

                                            return (
                                                <div
                                                    key={ `${ tabNode.pageId }-${ tabStartIndex + idx }` }
                                                    className={ `shockwave-catalog-tab ${ isTabActive ? 'active' : '' }` }
                                                    title={ sanitizeCatalogTitle(tabNode.localization) }
                                                    onClick={ () => selectShockwaveNode(tabNode) }
                                                >
                                                    <div className="shockwave-tab-icon-area">
                                                        { isFirstFrontpage ? (
                                                            <img
                                                                src={ catalogIconFrontpage }
                                                                alt=""
                                                                className="shockwave-frontpage-tab-icon"
                                                            />
                                                        ) : (
                                                            <CatalogIconView icon={ tabNode.iconId } />
                                                        ) }
                                                    </div>
                                                    <div className="shockwave-tab-label-band">
                                                        <span className="shockwave-tab-label-text">
                                                            { shortenTabLabel(tabNode.localization) }
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        }) }
                                    </div>

                                    <button
                                        type="button"
                                        className={ `shockwave-catalog-arrow-btn right ${ canScrollRight ? 'enabled' : 'disabled' }` }
                                        onClick={ () => canScrollRight && setTabStartIndex(prev => Math.min(Math.max(0, shockwaveTabs.length - VISIBLE_TABS_COUNT), prev + 2)) }
                                        disabled={ !canScrollRight }
                                        aria-label="Siguientes pestañas"
                                    >
                                        <img
                                            src={ canScrollRight ? catalogTabRightImg : catalogTabRightDisabledImg }
                                            alt=">"
                                        />
                                    </button>
                                </div>

                                {/* SELECTOR DESPLEGABLE DE SUBCATEGORÍA / COLECCIÓN SI LA PESTAÑA TIENE SUBPÁGINAS */}
                                { currentTabSubPages.length > 1 && (
                                    <div className="shockwave-catalog-subnav-bar">
                                        <span className="subnav-label">Sección:</span>
                                        <ShockwaveDropdown
                                            className="shockwave-catalog-subnav-dropdown"
                                            value={ selectedSubPageIdx }
                                            options={ currentTabSubPages.map((sp, i) => ({
                                                value: i,
                                                label: sp.label
                                            })) }
                                            onChange={ val =>
                                            {
                                                const chosen = currentTabSubPages[Number(val)];
                                                if(chosen && chosen.node) selectShockwaveNode(chosen.node);
                                            } }
                                        />
                                    </div>
                                ) }

                                {/* CONTENIDO PRINCIPAL DE LA PÁGINA DEL CATÁLOGO */}
                                <div className="shockwave-catalog-body">
                                    <div className="shockwave-catalog-content-inner">
                                        { currentPage && GetCatalogLayout(currentPage, () => setNavigationHidden(true)) }
                                    </div>
                                    <div className="shockwave-catalog-watermark">
                                        © Habbten Design Ltd
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* BOTÓN INFERIOR FLOTANTE "Cerrar el catálogo" (IMAGEN 2) */}
                        <div className="shockwave-catalog-close-row">
                            <button
                                type="button"
                                className="shockwave-catalog-close-btn"
                                onClick={ () => setIsVisible(false) }
                            >
                                Cerrar el catálogo
                            </button>
                        </div>
                    </div>
                </DraggableWindow>
            ) : (
                <NitroCardView uniqueKey="catalog" className={ `nitro-catalog ${ currentEra === 'flash2012' ? 'catalog-flash2012' : '' }` } style={ GetConfiguration('catalog.headers') ? { width: 710 } : {} }>
                    <NitroCardHeaderView headerText={ LocalizeText('catalog.title') } onCloseClick={ event => setIsVisible(false) } />
                    <NitroCardTabsView>
                        { rootNode && (rootNode.children.length > 0) && rootNode.children.map(child =>
                        {
                            if(!child.isVisible) return null;

                            return (
                                <NitroCardTabsItemView key={ child.pageId } isActive={ (activeNodes && activeNodes.length > 0 && activeNodes[0] === child) || child.isActive } onClick={ event =>
                                {
                                    if(searchResult) setSearchResult(null);
                                    if(setNavigationHidden) setNavigationHidden(false);

                                    activateNode(child);
                                } } >
                                    <Flex gap={ GetConfiguration('catalog.tab.icons') ? 1 : 0 } alignItems="center">
                                        { GetConfiguration('catalog.tab.icons') && <CatalogIconView icon={ child.iconId } /> }
                                        { child.localization }
                                    </Flex>
                                </NitroCardTabsItemView>
                            );
                        }) }
                    </NitroCardTabsView>
                    <NitroCardContentView>
                        <Grid>
                            { !navigationHidden && ((searchResult && searchResult.filteredNodes.length > 0) || (activeNodes && (activeNodes.length > 0) && (activeNodes[0]?.children?.length > 0))) &&
                                <Column size={ 3 } overflow="hidden">
                                    { activeNodes && (activeNodes.length > 0) &&
                                        <CatalogNavigationView node={ activeNodes[0] } /> }
                                </Column> }
                            <Column size={ (!navigationHidden && ((searchResult && searchResult.filteredNodes.length > 0) || (activeNodes && (activeNodes.length > 0) && (activeNodes[0]?.children?.length > 0)))) ? 9 : 12 } overflow="hidden">
                                { currentPage && GetCatalogLayout(currentPage, () => setNavigationHidden(true)) }
                            </Column>
                        </Grid>
                    </NitroCardContentView>
                </NitroCardView>
            )) }
            <CatalogGiftView />
            <MarketplacePostOfferView />
        </>
    );
};
