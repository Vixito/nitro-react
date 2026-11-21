import { AvatarScaleType, AvatarSetType } from '@nitrots/nitro-renderer';
import { CSSProperties, FC, useEffect, useState } from 'react';
import { GetAvatarRenderManager } from '../../../api';
import posesGridImg from '../../../assets/images/gamecenter/snowstorm/Snowstorm_poses_grid.png';

export interface TrimmedHeadInfo
{
    url: string;
    w: number;
    h: number;
}

const trimmedHeadCache = new Map<string, TrimmedHeadInfo>();

/**
 * Nitro's getCroppedImage(AvatarSetType.HEAD) includes transparent avatar-canvas padding.
 * This trims the image tightly to the visible non-transparent head pixels (keeping natural
 * w x h dimensions so chin-bottom anchoring works identically regardless of hair/hat height).
 */
export function trimTransparentImage(
    rawSrc: string,
    onDone: (trimmedDataUrl: string, trimmedImg: HTMLImageElement, w: number, h: number) => void
): void
{
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () =>
    {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (!w || !h) return;

        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, w, h).data;

        let minX = w;
        let minY = h;
        let maxX = -1;
        let maxY = -1;

        for (let y = 0; y < h; y++)
        {
            for (let x = 0; x < w; x++)
            {
                const a = data[(y * w + x) * 4 + 3];
                if (a > 12)
                {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        if (maxX < minX || maxY < minY)
        {
            onDone(rawSrc, img, w, h);
            return;
        }

        const tw = maxX - minX + 1;
        const th = maxY - minY + 1;
        const out = document.createElement('canvas');
        out.width = tw;
        out.height = th;
        const octx = out.getContext('2d');
        if (!octx) return;

        octx.drawImage(c, minX, minY, tw, th, 0, 0, tw, th);
        const dataUrl = out.toDataURL('image/png');
        const trimmed = new Image();
        trimmed.onload = () => onDone(dataUrl, trimmed, tw, th);
        trimmed.src = dataUrl;
    };
    img.src = rawSrc;
}

export function useCroppedHabboHead(figure: string, direction = 2, smallScale = true): TrimmedHeadInfo | null
{
    const scaleType = smallScale ? AvatarScaleType.SMALL : AvatarScaleType.LARGE;
    const cacheKey = `${ scaleType }__${ figure }__${ direction }`;
    const [ info, setInfo ] = useState<TrimmedHeadInfo | null>(() => trimmedHeadCache.get(cacheKey) || null);
    const [ reloadTick, setReloadTick ] = useState<number>(0);

    useEffect(() =>
    {
        let disposed = false;
        let retryTimer: number | null = null;
        if (!figure) return;

        const cached = trimmedHeadCache.get(cacheKey);
        if (cached)
        {
            setInfo(cached);
            return;
        }

        const manager = GetAvatarRenderManager();
        if (!manager) return;

        const avatarImg = manager.createAvatarImage(figure, scaleType, 'M', {
            resetFigure: () =>
            {
                if (!disposed)
                {
                    trimmedHeadCache.delete(cacheKey);
                    setReloadTick(t => t + 1);
                }
            },
            dispose: () => {},
            disposed: false
        }, null);

        if (!avatarImg) return;

        avatarImg.setDirection(AvatarSetType.FULL, direction);
        avatarImg.setDirection(AvatarSetType.HEAD, direction);

        const isPh = avatarImg.isPlaceholder();
        const cropped = avatarImg.getCroppedImage(AvatarSetType.HEAD);
        if (cropped && cropped.src && !disposed)
        {
            trimTransparentImage(cropped.src, (trimmedUrl, _img, tw, th) =>
            {
                if (disposed) return;
                const entry: TrimmedHeadInfo = { url: trimmedUrl, w: tw, h: th };
                if (!isPh) trimmedHeadCache.set(cacheKey, entry);
                setInfo(entry);
            });
        }

        if (isPh)
        {
            retryTimer = window.setTimeout(() =>
            {
                if (!disposed) setReloadTick(t => t + 1);
            }, 350);
        }

        avatarImg.dispose();

        return () =>
        {
            disposed = true;
            if (retryTimer) window.clearTimeout(retryTimer);
        };
    }, [ figure, direction, scaleType, cacheKey, reloadTick ]);

    return info;
}

export const HabboHeadImg: FC<{
    figure: string;
    direction?: number;
    size?: number;
    smallScale?: boolean;
    className?: string;
    style?: CSSProperties;
}> = ({ figure, direction = 2, size = 36, smallScale = true, className, style }) =>
{
    const info = useCroppedHabboHead(figure, direction, smallScale);
    if (!info) return null;

    return (
        <img
            src={ info.url }
            alt=""
            className={ className }
            style={{
                width: `${ size }px`,
                height: `${ size }px`,
                objectFit: 'contain',
                imageRendering: 'pixelated',
                display: 'block',
                ...style
            }}
        />
    );
};

// Cell 0 of Snowstorm_poses_grid.png (60x44 per cell): 3/4 diagonal standing parka facing SE (right)
// Measured collar fur chin opening = 20.5px from boots bottom (y=23.5 inside 44px cell).
// Locking the trimmed head's BOTTOM edge (chin) right into the fur collar matches official Habbo!
export const SnowStormParkaAvatar: FC<{
    figure: string;
    team: 'blue' | 'red';
    facing?: 'right' | 'left';
    scale?: number;
}> = ({ figure, team, facing, scale = 1 }) =>
{
    const resolvedFacing = facing || (team === 'red' ? 'left' : 'right');
    const flipBody = resolvedFacing === 'left';
    const direction = resolvedFacing === 'left' ? 4 : 2;
    const headInfo = useCroppedHabboHead(figure, direction);

    const cellW = 60;
    const cellH = 44;
    const rowY = team === 'blue' ? 0 : 44;
    const bodyScale = 1.0 * scale;
    const marginBot = Math.round(2 * scale);

    // Proportional 1:1 classic SMALL (sh_) Habbo head-to-parka ratio (so chin sits inside fur collar!)
    const headPixelScale = 1.25 * bodyScale;
    const headW = headInfo ? Math.round(headInfo.w * headPixelScale) : 0;
    const headH = headInfo ? Math.round(headInfo.h * headPixelScale) : 0;
    // Exact chin bottom seated snugly into collar opening (20.5px above boots bottom)
    const chinBottom = Math.round(marginBot + 20.5 * bodyScale);

    return (
        <div
            style={{
                position: 'relative',
                width: `${ Math.round(50 * scale) }px`,
                height: `${ Math.round(58 * scale) }px`,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                pointerEvents: 'none'
            }}
        >
            {/* Official 3/4-Diagonal SnowStorm Parka Body facing the exact same direction as the head */}
            <div
                style={{
                    width: `${ cellW }px`,
                    height: `${ cellH }px`,
                    flexShrink: 0,
                    backgroundImage: `url(${ posesGridImg })`,
                    backgroundPosition: `0px -${ rowY }px`,
                    backgroundRepeat: 'no-repeat',
                    imageRendering: 'pixelated',
                    transform: `scale(${ (flipBody ? -bodyScale : bodyScale).toFixed(3) }, ${ bodyScale.toFixed(3) })`,
                    transformOrigin: 'center bottom',
                    marginBottom: `${ marginBot }px`
                }}
            />

            {/* Tightly-trimmed Real Habbo Head anchored by CHIN BOTTOM snugly inside the fur collar */}
            { headInfo && (
                <img
                    src={ headInfo.url }
                    alt=""
                    style={{
                        position: 'absolute',
                        bottom: `${ chinBottom }px`,
                        left: '50%',
                        transform: `translateX(${ flipBody ? '-53%' : '-47%' })`,
                        width: `${ headW }px`,
                        height: `${ headH }px`,
                        maxWidth: 'none',
                        maxHeight: 'none',
                        objectFit: 'fill',
                        imageRendering: 'pixelated',
                        pointerEvents: 'none'
                    }}
                />
            ) }
        </div>
    );
};
