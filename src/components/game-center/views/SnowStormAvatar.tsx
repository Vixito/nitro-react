import { AvatarScaleType, AvatarSetType } from '@nitrots/nitro-renderer';
import { CSSProperties, FC, useEffect, useState } from 'react';
import { GetAvatarRenderManager } from '../../../api';
import posesSheetImg from '../../../assets/images/gamecenter/snowstorm/Snowstorm_poses.png';

const trimmedHeadCache = new Map<string, string>();

/**
 * Nitro's getCroppedImage(AvatarSetType.HEAD) still includes transparent avatar-canvas padding.
 * This trims the image tightly to the visible non-transparent head pixels so heads render
 * crisp and full-size in Leaderboard rows, HUD cards, Parka avatars, and Chat bubbles.
 */
export function trimTransparentImage(
    rawSrc: string,
    onDone: (trimmedDataUrl: string, trimmedImg: HTMLImageElement) => void
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
            onDone(rawSrc, img);
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
        trimmed.onload = () => onDone(dataUrl, trimmed);
        trimmed.src = dataUrl;
    };
    img.src = rawSrc;
}

export function useCroppedHabboHead(figure: string, direction = 2): string | null
{
    const cacheKey = `${ figure }__${ direction }`;
    const [ src, setSrc ] = useState<string | null>(() => trimmedHeadCache.get(cacheKey) || null);
    const [ reloadTick, setReloadTick ] = useState<number>(0);

    useEffect(() =>
    {
        let disposed = false;
        if (!figure) return;

        const cached = trimmedHeadCache.get(cacheKey);
        if (cached)
        {
            setSrc(cached);
            return;
        }

        const manager = GetAvatarRenderManager();
        if (!manager) return;

        const avatarImg = manager.createAvatarImage(figure, AvatarScaleType.LARGE, 'M', {
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

        const cropped = avatarImg.getCroppedImage(AvatarSetType.HEAD);
        if (cropped && cropped.src && !disposed)
        {
            trimTransparentImage(cropped.src, trimmedUrl =>
            {
                if (disposed) return;
                trimmedHeadCache.set(cacheKey, trimmedUrl);
                setSrc(trimmedUrl);
            });
        }

        avatarImg.dispose();

        return () =>
        {
            disposed = true;
        };
    }, [ figure, direction, cacheKey, reloadTick ]);

    return src;
}

export const HabboHeadImg: FC<{
    figure: string;
    direction?: number;
    size?: number;
    className?: string;
    style?: CSSProperties;
}> = ({ figure, direction = 2, size = 36, className, style }) =>
{
    const src = useCroppedHabboHead(figure, direction);
    if (!src) return null;

    return (
        <img
            src={ src }
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

// Exact standing idle parka crop from Snowstorm_poses.png (416 x 101)
const PARKA_RECT = {
    blue: { x: 76, y: 8, w: 21, h: 32 },
    red: { x: 83, y: 55, w: 21, h: 32 }
} as const;

export const SnowStormParkaAvatar: FC<{
    figure: string;
    team: 'blue' | 'red';
    scale?: number;
}> = ({ figure, team, scale = 1 }) =>
{
    const direction = team === 'red' ? 4 : 2;
    const headSrc = useCroppedHabboHead(figure, direction);
    const rect = PARKA_RECT[team];

    const bodyScale = 1.02 * scale;
    const bodyH = Math.round(rect.h * bodyScale);
    const headBox = Math.round(28 * scale);

    return (
        <div
            style={{
                position: 'relative',
                width: `${ Math.round(44 * scale) }px`,
                height: `${ Math.round(56 * scale) }px`,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                pointerEvents: 'none'
            }}
        >
            {/* Official SnowStorm Blue/Red Winter Parka Body */}
            <div
                style={{
                    width: `${ rect.w }px`,
                    height: `${ rect.h }px`,
                    backgroundImage: `url(${ posesSheetImg })`,
                    backgroundPosition: `-${ rect.x }px -${ rect.y }px`,
                    backgroundRepeat: 'no-repeat',
                    imageRendering: 'pixelated',
                    transform: `scale(${ bodyScale.toFixed(3) })`,
                    transformOrigin: 'center bottom',
                    marginBottom: `${ Math.round(2 * scale) }px`
                }}
            />

            {/* Tightly-trimmed Real Habbo Head perched snugly inside the parka hood */}
            { headSrc && (
                <img
                    src={ headSrc }
                    alt=""
                    style={{
                        position: 'absolute',
                        bottom: `${ Math.round(bodyH - 7 * scale) }px`,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: `${ headBox }px`,
                        height: `${ headBox }px`,
                        objectFit: 'contain',
                        imageRendering: 'pixelated',
                        pointerEvents: 'none'
                    }}
                />
            ) }
        </div>
    );
};
