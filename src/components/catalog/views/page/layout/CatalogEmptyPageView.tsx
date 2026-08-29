import { FC } from 'react';
import { ICatalogNode } from '../../../../../api';
import { Button, Column, LayoutAvatarImageView } from '../../../../../common';
import { useCatalog } from '../../../../../hooks';
import { CatalogIconView } from '../../catalog-icon/CatalogIconView';

interface CatalogEmptyPageViewProps
{
    node?: ICatalogNode;
    title?: string;
    message?: string;
}

// Official Habbo Mascot: Frank the Concierge
// - ha-3236-1072-1077: Red concierge pillbox hat with gold star/trim
// - hr-893-90: Brown wavy hair
// - hd-180-1: Classic smiling face
// - fa-1202-90: Iconic brown mustache
// - cc-3039-1072: Red hotel uniform jacket with gold epaulettes & buttons
// - ch-210-92: White collared shirt
// - lg-280-1072: Matching red uniform trousers
// - sh-300-64: Black dress shoes
const FRANK_FIGURE = 'ha-3236-1072-1077.hr-893-90.hd-180-1.fa-1202-90.cc-3039-1072.ch-210-92.lg-280-1072.sh-300-64';

export const CatalogEmptyPageView: FC<CatalogEmptyPageViewProps> = props =>
{
    const { activeNodes = [], activateNode = null } = useCatalog();
    const currentNode = props.node || (activeNodes && activeNodes.length > 0 ? activeNodes[activeNodes.length - 1] : null);
    const hasChildren = currentNode && currentNode.children && currentNode.children.length > 0;
    const visibleChildren = hasChildren ? currentNode.children.filter(c => c.isVisible) : [];

    return (
        <Column fullHeight fullWidth justifyContent="center" alignItems="center" className="p-4 select-none">
            <div 
                style={{
                    width: '100%',
                    maxWidth: '480px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                }}
            >
                {/* Frank Avatar - Standing free */}
                <div 
                    style={{ 
                        width: '80px', 
                        height: '130px', 
                        flexShrink: 0, 
                        position: 'relative', 
                        display: 'flex', 
                        alignItems: 'flex-end', 
                        justifyContent: 'center' 
                    }}
                >
                    {/* Floor shadow */}
                    <div 
                        style={{ 
                            position: 'absolute', 
                            bottom: '2px', 
                            width: '58px', 
                            height: '10px', 
                            backgroundColor: 'rgba(0, 0, 0, 0.22)', 
                            borderRadius: '50%', 
                            filter: 'blur(1px)' 
                        }} 
                    />
                    <LayoutAvatarImageView 
                        figure={ FRANK_FIGURE } 
                        direction={ 2 } 
                        scale={ 1.25 } 
                        style={{ position: 'relative', zIndex: 2 }}
                    />
                </div>

                {/* Cartel / Signboard */}
                <div 
                    style={{ 
                        flex: 1, 
                        backgroundColor: '#FFFFFF', 
                        border: '2px solid #CBD5E1', 
                        borderRadius: '14px', 
                        padding: '16px 20px', 
                        position: 'relative', 
                        boxShadow: '0 6px 18px rgba(0, 0, 0, 0.08)' 
                    }}
                >
                    {/* Cartel Header Badge */}
                    <div 
                        style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '4px',
                            padding: '3px 10px', 
                            backgroundColor: '#FEF3C7', 
                            color: '#92400E', 
                            border: '1px solid #FCD34D', 
                            borderRadius: '6px', 
                            fontSize: '10px', 
                            fontWeight: 800, 
                            letterSpacing: '0.6px', 
                            textTransform: 'uppercase', 
                            marginBottom: '8px' 
                        }}
                    >
                        <span>🏨</span>
                        <span>Frank · Conserje</span>
                    </div>

                    {/* Title */}
                    <div 
                        style={{ 
                            fontSize: '13px', 
                            fontWeight: 800, 
                            color: '#0F172A', 
                            lineHeight: 1.3, 
                            marginBottom: '6px' 
                        }}
                    >
                        { props.title || 'Sección vacía o en preparación' }
                    </div>

                    {/* Message */}
                    <div 
                        style={{ 
                            fontSize: '11px', 
                            color: '#475569', 
                            lineHeight: 1.5 
                        }}
                    >
                        { props.message || 'Actualmente no hay artículos disponibles en esta sección del catálogo. Puedes explorar las demás categorías en el menú de la izquierda.' }
                    </div>

                    {/* Subcategories Shortcuts (if any) */}
                    { (visibleChildren && visibleChildren.length > 0) && (
                        <div 
                            style={{ 
                                borderTop: '1px solid #E2E8F0', 
                                marginTop: '12px',
                                paddingTop: '12px', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '8px' 
                            }}
                        >
                            <div 
                                style={{ 
                                    fontSize: '10px', 
                                    fontWeight: 700, 
                                    color: '#64748B', 
                                    textTransform: 'uppercase', 
                                    letterSpacing: '0.5px' 
                                }}
                            >
                                Subcategorías disponibles:
                            </div>
                            <div 
                                style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: visibleChildren.length > 1 ? '1fr 1fr' : '1fr', 
                                    gap: '6px' 
                                }}
                            >
                                { visibleChildren.map(child => (
                                    <Button
                                        key={ child.pageId }
                                        variant="secondary"
                                        onClick={ () => activateNode(child) }
                                        style={{
                                            height: '32px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '0 10px',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            borderRadius: '8px',
                                            textAlign: 'left',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        <CatalogIconView icon={ child.iconId } />
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            { child.localization }
                                        </span>
                                    </Button>
                                )) }
                            </div>
                        </div>
                    ) }
                </div>
            </div>
        </Column>
    );
};
