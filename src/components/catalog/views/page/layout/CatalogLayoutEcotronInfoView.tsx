import { FC } from 'react';
import { useEraTheme } from '../../../../../hooks/era/useEraTheme';
import { CatalogLayoutProps } from './CatalogLayout.types';
import iconInfoHeaderImg from '../../../../../assets/images/eras/flash2012/ecotron/icon_info_header.png';

export const CatalogLayoutEcotronInfoView: FC<CatalogLayoutProps> = () =>
{
    const { currentEra } = useEraTheme();

    return (
        <div className="ecotron-info-page">
            { currentEra !== 'shockwave2006' && (
                <div className="ecotron-flat-banner">
                    <img src={ iconInfoHeaderImg } alt="" width={ 18 } height={ 34 } className="ecotron-banner-ico" />
                    <div className="ecotron-banner-text">
                        <div className="ecotron-banner-title">Información</div>
                        <div className="ecotron-banner-desc">¡Aquí aprenderás a usar la Máquina Ecotrón!</div>
                    </div>
                </div>
            ) }
            <div className="ecotron-info-card">
                <div className="ecotron-info-title">Instrucciones:</div>
                <p>1- Introduce en la máquina los 12 ítems posibles de reciclar desde tu inventario.</p>
                <p>2- Al reciclar estos ítems la máquina añadirá una caja de regalo directamente a tu inventario.</p>
                <p>
                    3- Deberás abrir la caja para descubrir tu premio; si antes quieres ver las posibilidades de que te toque cada rare puedes consultar la página de <b>Premios</b> del Ecotrón en el catálogo.
                </p>
                <p>
                    4- Ten especial atención al cambiar la caja con otros usuarios, los premios que salen actualmente en el catálogo son para la <u>CAJA DE TEMPORADA ACTUAL</u>; si ves una caja de otra temporada puede contener un premio distinto.
                </p>
                <p>Si tienes más dudas sobre la Máquina Ecotrón pregunta a nuestros guías o al equipo Staff.</p>
                <div className="ecotron-info-season">TEMPORADA ACTUAL: 1 - HABBTEN</div>
            </div>
        </div>
    );
};
