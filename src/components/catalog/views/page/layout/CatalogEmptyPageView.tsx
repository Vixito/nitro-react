import { FC } from 'react';
import { ICatalogNode } from '../../../../../api';
import { Button, Column, Flex, Grid, LayoutAvatarImageView, Text } from '../../../../../common';
import { useCatalog } from '../../../../../hooks';
import { CatalogIconView } from '../../catalog-icon/CatalogIconView';

interface CatalogEmptyPageViewProps
{
    node?: ICatalogNode;
    title?: string;
    message?: string;
}

// Authentic Habbo Frank Concierge figure: classic side-part hair, mature face, burgundy concierge uniform vest & tie, black dress trousers, dress shoes
const FRANK_FIGURE = 'hr-115-42.hd-195-1.ch-215-66.lg-285-64.sh-300-64';

export const CatalogEmptyPageView: FC<CatalogEmptyPageViewProps> = props =>
{
    const { activeNodes = [], activateNode = null } = useCatalog();
    const currentNode = props.node || (activeNodes && activeNodes.length > 0 ? activeNodes[activeNodes.length - 1] : null);
    const hasChildren = currentNode && currentNode.children && currentNode.children.length > 0;
    const visibleChildren = hasChildren ? currentNode.children.filter(c => c.isVisible) : [];

    return (
        <Column fullHeight fullWidth justifyContent="center" alignItems="center" className="p-4 select-none">
            <div className="w-full max-w-lg bg-gradient-to-b from-white/95 to-slate-50/95 dark:from-slate-800/95 dark:to-slate-900/95 border border-slate-300 dark:border-slate-700 rounded-2xl p-5 shadow-lg backdrop-blur-md">
                <Flex alignItems="center" gap={ 3 } className="relative">
                    {/* Official Frank Character */}
                    <div className="relative flex-shrink-0 flex items-end justify-center" style={{ width: '80px', height: '120px' }}>
                        {/* Floor shadow */}
                        <div className="absolute bottom-1 w-14 h-3 bg-black/15 dark:bg-black/40 rounded-full blur-[1px] pointer-events-none" />
                        <LayoutAvatarImageView 
                            figure={ FRANK_FIGURE } 
                            direction={ 2 } 
                            scale={ 1.2 } 
                            className="relative z-10"
                        />
                    </div>

                    {/* Speech / Dialog Box */}
                    <Column grow gap={ 1 } className="bg-white/80 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs min-w-0">
                        <Flex alignItems="center" gap={ 1.5 }>
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-900 dark:text-amber-300 font-bold text-[11px] uppercase tracking-wider border border-amber-500/30">
                                Frank · Conserje
                            </span>
                        </Flex>
                        <Text bold className="text-sm text-slate-900 dark:text-white mt-1 leading-tight">
                            { props.title || 'Sección vacía o en preparación' }
                        </Text>
                        <Text className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-1">
                            { props.message || 'Actualmente no hay artículos disponibles en esta sección del catálogo. Puedes explorar las demás categorías en el menú de la izquierda.' }
                        </Text>
                    </Column>
                </Flex>

                {/* Subcategories Shortcuts (Rendered ONLY if there are child subcategories) */}
                { (visibleChildren && visibleChildren.length > 0) && (
                    <Column gap={ 2 } className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <Text bold small className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Subcategorías disponibles en esta sección:
                        </Text>
                        <Grid columnCount={ visibleChildren.length > 1 ? 2 : 1 } gap={ 1.5 }>
                            { visibleChildren.map(child => (
                                <Button
                                    key={ child.pageId }
                                    variant="secondary"
                                    onClick={ () => activateNode(child) }
                                    className="flex items-center gap-2.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-left truncate transition-all hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:border-blue-300"
                                    style={{ height: '36px' }}
                                >
                                    <CatalogIconView icon={ child.iconId } />
                                    <span className="truncate">{ child.localization }</span>
                                </Button>
                            )) }
                        </Grid>
                    </Column>
                ) }
            </div>
        </Column>
    );
};
