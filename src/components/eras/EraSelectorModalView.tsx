import { FC, useEffect, useState } from 'react';
import { ILinkEventTracker } from '@nitrots/nitro-renderer';
import { AddEventLinkTracker, RemoveLinkEventTracker } from '../../api';
import { Button, Column, Flex, Grid, NitroCardContentView, NitroCardHeaderView, NitroCardView, Text } from '../../common';
import { EraType, useEraTheme } from '../../hooks/era/useEraTheme';
import './EraSelectorModalView.scss';

import shockwaveThumb from '../../assets/images/eras/era_shockwave_2006.png';
import flashThumb from '../../assets/images/eras/era_flash_2012.png';
import modernThumb from '../../assets/images/eras/era_modern_2016.png';

export const EraSelectorModalView: FC<{}> = () =>
{
    const { currentEra, setEra, eras } = useEraTheme();
    const [ isVisible, setIsVisible ] = useState(false);
    const [ selectedEra, setSelectedEra ] = useState<EraType>(currentEra);

    useEffect(() =>
    {
        setSelectedEra(currentEra);
    }, [ currentEra, isVisible ]);

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
                    case 'open':
                        setIsVisible(true);
                        return;
                    case 'hide':
                    case 'close':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setIsVisible(prev => !prev);
                        return;
                }
            },
            eventUrlPrefix: 'era-selector/'
        };

        AddEventLinkTracker(linkTracker);
        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    if(!isVisible) return null;

    const getThumbnail = (id: EraType) =>
    {
        switch(id)
        {
            case 'shockwave2006': return shockwaveThumb;
            case 'flash2012': return flashThumb;
            case 'modern': return modernThumb;
        }
    };

    const activeEraObj = eras.find(e => e.id === selectedEra) || eras[0];

    const handleConfirm = () =>
    {
        setEra(selectedEra);
        setIsVisible(false);
    };

    return (
        <NitroCardView uniqueKey="era-selector" theme="primary" className="era-selector-window" style={ { width: 720, maxWidth: '95vw' } }>
            <NitroCardHeaderView headerText="Selector de Versión Visual" onCloseClick={ () => setIsVisible(false) } />
            <NitroCardContentView className="p-3 text-white">
                <div className="text-center mb-3">
                    <p className="era-intro-text mb-0">
                        Elige tu versión visual favorita de Habbten para adaptar la interfaz del juego. Puedes cambiarla en cualquier momento desde <strong>Ajustes → Preferencias</strong>.
                    </p>
                </div>

                <div className="era-cards-grid mb-3">
                    { eras.map(era => {
                        const isSelected = selectedEra === era.id;
                        return (
                            <div
                                key={ era.id }
                                className={ `era-card ${ isSelected ? 'selected' : '' }` }
                                onClick={ () => setSelectedEra(era.id) }
                            >
                                <div className="era-card-thumb-wrap">
                                    <img
                                        src={ getThumbnail(era.id) }
                                        alt={ era.name }
                                        className="era-card-thumb"
                                    />
                                    <span className="era-year-badge">{ era.year }</span>
                                </div>

                                <div className="era-card-body p-2 d-flex flex-column flex-grow-1">
                                    <h5 className="era-card-name fw-bold mb-1">{ era.name }</h5>
                                    <p className="era-card-desc mb-3 flex-grow-1">{ era.description }</p>

                                    <Button
                                        variant={ isSelected ? 'success' : 'secondary' }
                                        className="w-100 btn-sm fw-bold"
                                        onClick={ (e) => { e.stopPropagation(); setSelectedEra(era.id); } }
                                    >
                                        { isSelected ? '✓ SELECCIONADO' : 'ELEGIR' }
                                    </Button>
                                </div>
                            </div>
                        );
                    }) }
                </div>

                <div className="d-flex align-items-center justify-content-between p-2 rounded era-footer-bar">
                    <div className="era-footer-label">
                        Jugar en versión: <strong className="era-active-version-text">{ activeEraObj.name }</strong>
                    </div>
                    <div className="d-flex gap-2">
                        <Button variant="secondary" className="btn-sm px-3" onClick={ () => setIsVisible(false) }>
                            Cancelar
                        </Button>
                        <Button variant="success" className="btn-sm px-4 fw-bold" onClick={ handleConfirm }>
                            ¡SÍ, VAMOS!
                        </Button>
                    </div>
                </div>
            </NitroCardContentView>
        </NitroCardView>
    );
};
