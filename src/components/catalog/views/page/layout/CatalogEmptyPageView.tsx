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

// Official Habbo Frank Concierge Look: Classic side-part hair (hr-115-42), mature face (hd-195-1), concierge coat (ch-3030-82), trousers (lg-275-1408), black shoes (sh-300-64), waist sash (wa-2007)
const FRANK_FIGURE = 'hr-115-42.hd-195-1.ch-3030-82.lg-275-1408.sh-300-64.wa-2007';

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
                    maxWidth: '500px',
                    backgroundColor: 'rgba(255, 255, 255, 0.96)',
                    borderRadius: '16px',
                    border: '1px solid rgba(0, 0, 0, 0.12)',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    {/* Official Frank Character */}
                    <div 
                        style={{ 
                            width: '74px', 
                            height: '110px', 
                            flexShrink: 0, 
                            position: 'relative', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center' 
                        }}
                    >
                        <div 
                            style={{ 
                                position: 'absolute', 
                                bottom: '4px', 
                                width: '56px', 
                                height: '10px', 
                                backgroundColor: 'rgba(0, 0, 0, 0.18)', 
                                borderRadius: '50%', 
                                filter: 'blur(1px)' 
                            }} 
                        />
                        <LayoutAvatarImageView 
                            figure={ FRANK_FIGURE } 
                            direction={ 2 } 
                            scale={ 1.2 } 
                        />
                    </div>

                    {/* Speech / Dialog Box */}
                    <div 
                        style={{ 
                            flex: 1, 
                            backgroundColor: '#F8FAFC', 
                            border: '1px solid #E2E8F0', 
                            borderRadius: '12px', 
                            padding: '14px 18px', 
                            position: 'relative', 
                            boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.04)' 
                        }}
                    >
                        <div 
                            style={{ 
                                display: 'inline-block', 
                                padding: '3px 8px', 
                                backgroundColor: '#FEF3C7', 
                                color: '#92400E', 
                                border: '1px solid #FCD34D', 
                                borderRadius: '6px', 
                                fontSize: '10px', 
                                fontWeight: 800, 
                                letterSpacing: '0.5px', 
                                textTransform: 'uppercase', 
                                marginBottom: '6px' 
                            }}
                        >
                            Frank · Conserje
                        </div>
                        <div 
                            style={{ 
                                fontSize: '13px', 
                                fontWeight: 800, 
                                color: '#0F172A', 
                                lineHeight: 1.3, 
                                marginBottom: '4px' 
                            }}
                        >
                            { props.title || 'Sección vacía o en preparación' }
                        </div>
                        <div 
                            style={{ 
                                fontSize: '11px', 
                                color: '#475569', 
                                lineHeight: 1.5 
                            }}
                        >
                            { props.message || 'Actualmente no hay artículos disponibles en esta sección del catálogo. Puedes explorar las demás categorías en el menú de la izquierda.' }
                        </div>
                    </div>
                </div>

                {/* Subcategories Shortcuts (Rendered ONLY if there are child subcategories) */}
                { (visibleChildren && visibleChildren.length > 0) && (
                    <div 
                        style={{ 
                            borderTop: '1px solid #E2E8F0', 
                            paddingTop: '14px', 
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
                                gap: '8px' 
                            }}
                        >
                            { visibleChildren.map(child => (
                                <Button
                                    key={ child.pageId }
                                    variant="secondary"
                                    onClick={ () => activateNode(child) }
                                    style={{
                                        height: '36px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '0 12px',
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
        </Column>
    );
};
