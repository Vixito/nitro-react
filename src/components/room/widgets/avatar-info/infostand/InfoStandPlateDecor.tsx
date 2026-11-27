import { FC } from 'react';
import {
    InfoStandPlateDecorItem,
    InfoStandPlateDef,
    useInfoStandFurniIcon,
    useInfoStandFurniSprite
} from '../../../../../api/infostand/InfoStandStyleService';

const DecorSprite: FC<{ item: InfoStandPlateDecorItem; compact?: boolean; pillSide?: 'left' | 'right' }> = ({ item, compact = false, pillSide }) =>
{
    const furniSprite = useInfoStandFurniSprite(item.img ? 0 : item.furniId);
    const src = item.img || furniSprite;
    if(!src) return null;

    if(pillSide)
    {
        const px = Math.min(28, Math.round((item.size || 32) * 0.72));
        return (
            <img
                src={ src }
                alt=""
                className={ `infostand-plate-decor is-pill pill-${ pillSide }` }
                style={ { maxWidth: `${ px }px`, maxHeight: `${ px }px` } }
                draggable={ false }
            />
        );
    }

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
    // Prefer 3D transparent furni sprite (no square brown inventory border!) with icon as fallback
    const furniSprite = useInfoStandFurniSprite(plate.emblemImg ? 0 : plate.emblemFurniId);
    const furniIcon = useInfoStandFurniIcon(plate.emblemImg ? 0 : plate.emblemFurniId);
    const iconSrc = plate.emblemImg || furniSprite || furniIcon;

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

export const InfoStandPlateDecor: FC<{ plate: InfoStandPlateDef; compact?: boolean; variant?: 'card' | 'pill' }> = ({ plate, compact = false, variant = 'card' }) =>
{
    if(!plate || plate.id === 'default') return null;

    const isPill = variant === 'pill';

    // For 2006 pill bars, pick the 2 primary bottom decors (bl -> left end, br -> right end)
    const pillLeftDecor = isPill ? (plate.decors?.find(d => d.slot === 'bl') || plate.decors?.[0]) : null;
    const pillRightDecor = isPill ? (plate.decors?.find(d => d.slot === 'br') || (plate.decors && plate.decors.length > 1 ? plate.decors[plate.decors.length - 1] : null)) : null;

    return (
        <>
            { plate.bgImageUrl && (
                <div
                    className={ `infostand-plate-bg-image ${ isPill ? 'is-pill' : '' }` }
                    style={ {
                        backgroundImage: `url('${ plate.bgImageUrl }')`,
                        opacity: plate.bgImageOpacity ?? 0.3
                    } }
                />
            ) }

            { plate.topTrim === 'icicles' && (
                <div className={ `infostand-top-trim trim-icicles ${ isPill ? 'is-pill' : '' }` } aria-hidden="true" />
            ) }

            { plate.topTrim === 'garland' && (
                <div className={ `infostand-top-trim trim-garland ${ isPill ? 'is-pill' : '' }` } aria-hidden="true" />
            ) }

            { plate.topTrim === 'awning' && (
                <div className={ `infostand-top-trim trim-awning ${ isPill ? 'is-pill' : '' }` } aria-hidden="true" />
            ) }

            { plate.topTrim === 'wired_bar' && (
                <div className={ `infostand-top-trim trim-wired-bar ${ isPill ? 'is-pill' : '' }` } aria-hidden="true" />
            ) }

            { plate.topTrim === 'magic_stars' && (
                <div className={ `infostand-top-trim trim-magic-stars ${ isPill ? 'is-pill' : '' }` } aria-hidden="true" />
            ) }

            { plate.topBannerImg && (
                <img
                    src={ plate.topBannerImg }
                    alt=""
                    className={ `infostand-top-banner-logo ${ isPill ? 'is-pill' : (compact ? 'is-compact' : '') }` }
                    draggable={ false }
                />
            ) }

            { isPill ? (
                <>
                    { pillLeftDecor && <DecorSprite item={ pillLeftDecor } pillSide="left" /> }
                    { pillRightDecor && pillRightDecor !== pillLeftDecor && <DecorSprite item={ pillRightDecor } pillSide="right" /> }
                </>
            ) : (
                plate.decors && plate.decors.map((item, idx) => (
                    <DecorSprite key={ `${ plate.id }-${ item.slot }-${ idx }` } item={ item } compact={ compact } />
                ))
            ) }
        </>
    );
};
