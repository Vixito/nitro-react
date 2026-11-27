import { FC } from 'react';
import {
    InfoStandPlateDecorItem,
    InfoStandPlateDef,
    useInfoStandFurniIcon,
    useInfoStandFurniSprite
} from '../../../../../api/infostand/InfoStandStyleService';

const DecorSprite: FC<{ item: InfoStandPlateDecorItem; compact?: boolean }> = ({ item, compact = false }) =>
{
    const furniSprite = useInfoStandFurniSprite(item.img ? 0 : item.furniId);
    const src = item.img || furniSprite;
    if(!src) return null;

    const px = compact ? Math.round((item.size || 32) * 0.78) : (item.size || 34);

    return (
        <img
            src={ src }
            alt=""
            className={ `infostand-plate-decor slot-${ item.slot }` }
            style={ { maxWidth: `${ px }px`, maxHeight: `${ px }px` } }
            draggable={ false }
        />
    );
};

export const PlateEmblemIcon: FC<{ plate: InfoStandPlateDef; className?: string }> = ({ plate, className = '' }) =>
{
    const furniIcon = useInfoStandFurniIcon(plate.emblemImg ? 0 : plate.emblemFurniId);
    const iconSrc = plate.emblemImg || furniIcon;

    if(iconSrc)
    {
        return (
            <span className={ `infostand-plate-sprite-emblem ${ className }` } title={ plate.name }>
                <img src={ iconSrc } alt={ plate.name } draggable={ false } />
            </span>
        );
    }

    return (
        <span
            className={ `infostand-plate-dot-emblem ${ className }` }
            style={ { background: plate.emblemColor } }
            title={ plate.name }
        />
    );
};

export const InfoStandPlateDecor: FC<{ plate: InfoStandPlateDef; compact?: boolean }> = ({ plate, compact = false }) =>
{
    if(!plate || plate.id === 'default') return null;

    return (
        <>
            { plate.bgImageUrl && (
                <div
                    className="infostand-plate-bg-image"
                    style={ {
                        backgroundImage: `url('${ plate.bgImageUrl }')`,
                        opacity: plate.bgImageOpacity ?? 0.3
                    } }
                />
            ) }

            { plate.topTrim === 'icicles' && (
                <div className="infostand-top-trim trim-icicles" aria-hidden="true" />
            ) }

            { plate.topTrim === 'garland' && (
                <div className="infostand-top-trim trim-garland" aria-hidden="true" />
            ) }

            { plate.topTrim === 'awning' && (
                <div className="infostand-top-trim trim-awning" aria-hidden="true" />
            ) }

            { plate.topTrim === 'wired_bar' && (
                <div className="infostand-top-trim trim-wired-bar" aria-hidden="true" />
            ) }

            { plate.topTrim === 'magic_stars' && (
                <div className="infostand-top-trim trim-magic-stars" aria-hidden="true" />
            ) }

            { plate.topBannerImg && (
                <img
                    src={ plate.topBannerImg }
                    alt=""
                    className={ `infostand-top-banner-logo ${ compact ? 'is-compact' : '' }` }
                    draggable={ false }
                />
            ) }

            { plate.decors && plate.decors.map((item, idx) => (
                <DecorSprite key={ `${ plate.id }-${ item.slot }-${ idx }` } item={ item } compact={ compact } />
            )) }
        </>
    );
};
