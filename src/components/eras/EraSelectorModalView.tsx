import { FC, useEffect, useState } from 'react';
import { ILinkEventTracker } from '@nitrots/nitro-renderer';
import { AddEventLinkTracker, RemoveLinkEventTracker } from '../../api';
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
        <div className="era-modal-backdrop d-flex align-items-center justify-content-center">
            <div className="era-modal-container">
                <button
                    type="button"
                    className="btn-close-era"
                    onClick={ () => setIsVisible(false) }
                    title="Cerrar"
                >
                    ✕
                </button>

                <div className="era-modal-header text-center mb-4">
                    <h2 className="era-modal-title">
                        WHICH ERA OF <span className="highlight-habbo">HABBO</span> DO YOU LOVE MOST?
                    </h2>
                    <p className="era-modal-subtitle">
                        Choose your preferred style and we'll theme your entire experience to match. You can always change this later in Settings.
                    </p>
                </div>

                <div className="era-cards-grid">
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

                                <div className="era-card-body">
                                    <h4 className="era-card-name">{ era.name }</h4>
                                    <p className="era-card-desc">{ era.description }</p>

                                    <div className="era-badges-row">
                                        { era.badges.map(badge => (
                                            <span key={ badge } className="era-pill-badge">{ badge }</span>
                                        )) }
                                    </div>

                                    <button
                                        type="button"
                                        className={ `btn btn-sm btn-era-preview ${ isSelected ? 'active' : '' }` }
                                        onClick={ (e) => { e.stopPropagation(); setSelectedEra(era.id); } }
                                    >
                                        👁 { isSelected ? 'SELECTED' : 'SELECT' }
                                    </button>
                                </div>
                            </div>
                        );
                    }) }
                </div>

                <div className="era-footer-hint text-center my-3">
                    You can change your era at any time from <strong>Settings → Preferences</strong>
                </div>

                <div className="era-modal-footer d-flex align-items-center justify-content-between px-4 py-3">
                    <div className="footer-status text-white">
                        Play as <strong>{ activeEraObj.name } { activeEraObj.year }</strong>?
                    </div>
                    <div className="footer-actions d-flex gap-2">
                        <button
                            type="button"
                            className="btn btn-secondary px-4 fw-bold"
                            onClick={ () => setIsVisible(false) }
                        >
                            CANCEL
                        </button>
                        <button
                            type="button"
                            className="btn btn-success px-4 fw-bold btn-lets-go"
                            onClick={ handleConfirm }
                        >
                            YES, LET'S GO!
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
