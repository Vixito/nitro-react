import { FC } from 'react';
import wiredFrontpageTower from '@/assets/images/catalog/wired_frontpage_tower.png';
import { Base } from '../../../../../common/Base';
import { Column } from '../../../../../common/Column';
import { Flex } from '../../../../../common/Flex';
import { CatalogLayoutProps } from './CatalogLayout.types';

export const CatalogLayoutPets3View: FC<CatalogLayoutProps> = props =>
{
    const { page = null } = props;

    const imageUrl = page.localization.getImage(1);
    const isWiredIntro = page.pageId === 218 || (imageUrl || '').toLowerCase().includes('ctlg_pic_teaser_wired');

    if(isWiredIntro)
    {
        return (
            <Column grow className="rounded text-black p-3" overflow="auto" style={{ backgroundColor: '#ebe8e0', fontSize: '12px', lineHeight: '1.42' }}>
                <div style={{ position: 'relative' }}>
                    <img
                        src={ wiredFrontpageTower }
                        alt="Torre Wired"
                        style={{
                            float: 'right',
                            marginLeft: '10px',
                            marginBottom: '6px',
                            marginTop: '2px',
                            maxWidth: '132px',
                            height: 'auto',
                            imageRendering: 'pixelated'
                        }}
                    />
                    <div style={{ color: '#1b6e94', fontSize: '16px', fontWeight: 700, fontStyle: 'italic', marginBottom: '6px' }}>
                        ¡Bienvenid@ al catálogo Wired!
                    </div>
                    <p style={{ marginBottom: '10px' }}>
                        Los Furni <strong>Wired</strong> te dan posibilidades casi infinitas. Podrás hacer que tus Furni hagan prácticamente de todo si aprendes cómo utilizar los Causantes, Efectos y Condiciones.
                    </p>
                    <p style={{ marginBottom: '12px' }}>
                        Cada uno de ellos puede ser programado por separado. Apila tu Causante, Efecto y Condición uno encima de otro, ¡y trabajarán en conjunto!
                    </p>
                    <div style={{ color: '#1b6e94', fontSize: '15px', fontWeight: 700, fontStyle: 'italic', marginBottom: '4px' }}>
                        ¿Cómo funcionan?
                    </div>
                    <p style={{ marginBottom: '6px' }}>
                        Para conseguir un resultado Wired completo necesitas tres tipos de Furni:
                    </p>
                    <ol style={{ paddingLeft: '20px', marginBottom: '14px' }}>
                        <li style={{ marginBottom: '4px' }}>
                            <strong>Causantes:</strong> Cosas que necesitas hacer para que tenga lugar un Efecto.
                        </li>
                        <li style={{ marginBottom: '4px' }}>
                            <strong>Efectos:</strong> Lo que sucede una vez has activado un Causante.
                        </li>
                        <li style={{ marginBottom: '4px' }}>
                            <strong>Condiciones (opcional):</strong> Condiciones que deben darse antes de que el Causante se ponga en marcha.
                        </li>
                    </ol>
                    <div style={{ clear: 'both', paddingTop: '4px', fontSize: '12.5px' }}>
                        Con todo, Causante <em>más</em> Efecto <em>más</em> Condición = <strong>Wired</strong>
                    </div>
                </div>
            </Column>
        );
    }

    return (
        <Column grow className="bg-muted rounded text-black p-2" overflow="hidden">
            <Flex alignItems="center" gap={ 2 }>
                { imageUrl && <img alt="" src={ imageUrl } /> }
                <Base className="fs-5" dangerouslySetInnerHTML={ { __html: page.localization.getText(1) } } />
            </Flex>
            <Column grow alignItems="center" overflow="auto">
                <Base dangerouslySetInnerHTML={ { __html: page.localization.getText(2) } } />
            </Column>
            <Flex alignItems="center">
                <Base className="fw-bold" dangerouslySetInnerHTML={ { __html: page.localization.getText(3) } } />
            </Flex>
        </Column>
    );
}
