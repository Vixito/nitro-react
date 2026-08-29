import { FC } from 'react';
import { ICatalogNode } from '../../../../../api';
import { Button, Column, Flex, Grid, Text } from '../../../../../common';
import { useCatalog } from '../../../../../hooks';
import { CatalogIconView } from '../../catalog-icon/CatalogIconView';

interface CatalogEmptyPageViewProps
{
    node?: ICatalogNode;
    title?: string;
    message?: string;
}

export const CatalogEmptyPageView: FC<CatalogEmptyPageViewProps> = props =>
{
    const { activeNodes = [], activateNode = null } = useCatalog();
    const currentNode = props.node || (activeNodes && activeNodes.length > 0 ? activeNodes[activeNodes.length - 1] : null);
    const hasChildren = currentNode && currentNode.children && currentNode.children.length > 0;
    const visibleChildren = hasChildren ? currentNode.children.filter(c => c.isVisible) : [];

    return (
        <Column fullHeight fullWidth justifyContent="center" alignItems="center" className="p-4 select-none">
            <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full text-center shadow-sm backdrop-blur-sm">
                {/* Frank Avatar & Speech Bubble */}
                <Flex justifyContent="center" alignItems="center" gap={ 3 } className="mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner">
                        <img 
                            src="https://www.habbo.com/habbo-imaging/avatarimage?figure=hr-115-42.hd-195-19.ch-3030-82.lg-275-1408.fa-1201.ca-1804-64&size=m&direction=2&head_direction=2&gesture=sml&action=std" 
                            alt="Frank" 
                            className="scale-[1.3] [image-rendering:pixelated] pointer-events-none"
                        />
                    </div>
                    <Column alignItems="start" className="text-left min-w-0 flex-1">
                        <Text bold className="text-sm text-slate-800 dark:text-white m-0">
                            { props.title || 'Sección vacía o en preparación' }
                        </Text>
                        <Text variant="muted" className="text-xs mt-0.5 leading-relaxed">
                            { props.message || 'Frank te informa que esta sección no tiene artículos en este momento. Explora el menú para descubrir más colecciones.' }
                        </Text>
                    </Column>
                </Flex>

                {/* Subcategories Shortcuts (Rendered ONLY if there are child subcategories) */}
                { (visibleChildren && visibleChildren.length > 0) && (
                    <Column gap={ 2 } className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-left">
                        <Text bold small variant="muted" className="text-[11px] uppercase tracking-wider">
                            Subcategorías disponibles:
                        </Text>
                        <Grid columnCount={ visibleChildren.length > 1 ? 2 : 1 } gap={ 1 }>
                            { visibleChildren.map(child => (
                                <Button
                                    key={ child.pageId }
                                    variant="secondary"
                                    onClick={ () => activateNode(child) }
                                    className="flex items-center gap-2 p-2 text-xs font-semibold rounded-xl text-left truncate"
                                    style={{ height: '34px' }}
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
