import { BaseTexture, Texture } from '@pixi/core';
import { Rectangle } from '@pixi/math';
import { Spritesheet } from '@pixi/spritesheet';

let installed = false;
let cachedMaxTextureSize: number | null = null;

function detectMaxTextureSize(): number
{
    if(cachedMaxTextureSize !== null) return cachedMaxTextureSize;

    let maxTex = 4096;

    try
    {
        const canvas = document.createElement('canvas');
        const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;

        if(gl)
        {
            const param = gl.getParameter(gl.MAX_TEXTURE_SIZE);
            if(typeof param === 'number' && param >= 1024)
            {
                maxTex = param;
            }
            const loseExt = gl.getExtension('WEBGL_lose_context');
            if(loseExt) loseExt.loseContext();
        }
    }
    catch
    {
        maxTex = 4096;
    }

    // Mobile GPUs (Android WebView / Mali / Adreno) often advertise 4096 or fail on tall >4096 atlases;
    // cap mobile/touch devices conservatively to <= 4096 to prevent black GL_INVALID_VALUE textures.
    const isMobileUa = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
    if(isMobileUa && maxTex > 4096) maxTex = 4096;

    cachedMaxTextureSize = maxTex;
    return maxTex;
}

interface FrameEntry
{
    name: string;
    data: any;
    srcX: number;
    srcY: number;
    srcW: number;
    srcH: number;
}

interface PackedPlacement
{
    entry: FrameEntry;
    dstX: number;
    dstY: number;
}

interface PackedPage
{
    width: number;
    height: number;
    placements: PackedPlacement[];
}

function shelfPackFrames(entries: FrameEntry[], maxTexSize: number): PackedPage[]
{
    const PAD = 1;
    // Sort tallest first for compact shelf packing
    const sorted = entries.slice().sort((a, b) => (b.srcH - a.srcH) || (b.srcW - a.srcW));

    // Estimate a balanced page width <= maxTexSize
    let totalArea = 0;
    let maxFrameW = 1;
    for(const e of sorted)
    {
        totalArea += (e.srcW + PAD) * (e.srcH + PAD);
        if(e.srcW + PAD > maxFrameW) maxFrameW = e.srcW + PAD;
    }

    const targetW = Math.min(maxTexSize, Math.max(maxFrameW, Math.ceil(Math.sqrt(totalArea * 1.25))));
    const pages: PackedPage[] = [];

    let curPlacements: PackedPlacement[] = [];
    let curX = 0;
    let curY = 0;
    let rowH = 0;
    let pageMaxW = 0;

    const flushPage = () =>
    {
        if(!curPlacements.length) return;
        pages.push({
            width: Math.max(1, Math.min(maxTexSize, pageMaxW)),
            height: Math.max(1, Math.min(maxTexSize, curY + rowH)),
            placements: curPlacements
        });
        curPlacements = [];
        curX = 0;
        curY = 0;
        rowH = 0;
        pageMaxW = 0;
    };

    for(const entry of sorted)
    {
        const w = Math.min(entry.srcW, maxTexSize);
        const h = Math.min(entry.srcH, maxTexSize);

        if(curX > 0 && curX + w > targetW)
        {
            curX = 0;
            curY += rowH + PAD;
            rowH = 0;
        }

        if(curY + h > maxTexSize)
        {
            flushPage();
        }

        curPlacements.push({ entry, dstX: curX, dstY: curY });
        if(curX + w > pageMaxW) pageMaxW = curX + w;
        if(h > rowH) rowH = h;
        curX += w + PAD;
    }

    flushPage();
    return pages;
}

/**
 * Prevents black-box furniture/sprites on Android/iOS mobile WebGL GPUs (e.g. 416x4292 atlases
 * exceeding MAX_TEXTURE_SIZE=4096) by transparently shelf-repacking oversized spritesheets
 * onto WebGL-safe canvas pages before PixiJS creates frame Textures.
 */
export function installOversizedSpritesheetPatch(): void
{
    if(installed) return;
    installed = true;

    const maxTexSize = detectMaxTextureSize();
    const origParse = Spritesheet.prototype.parse;

    Spritesheet.prototype.parse = function(this: any, callback?: (textures: any) => void)
    {
        const bt: BaseTexture | null = this?.baseTexture || null;
        const realW = bt ? (bt.realWidth || bt.width || 0) : 0;
        const realH = bt ? (bt.realHeight || bt.height || 0) : 0;

        if(!bt || (realW <= maxTexSize && realH <= maxTexSize))
        {
            return origParse.call(this, callback);
        }

        const source = (bt.resource as any)?.source as (HTMLImageElement | HTMLCanvasElement | ImageBitmap | null);
        if(!source)
        {
            return origParse.call(this, callback);
        }

        return new Promise((resolve) =>
        {
            try
            {
                const resolution = this.resolution || 1;
                const framesObj = this._frames || this.data?.frames || {};
                const frameKeys: string[] = this._frameKeys || Object.keys(framesObj);
                const entries: FrameEntry[] = [];

                for(const name of frameKeys)
                {
                    const fData = framesObj[name];
                    const rect = fData?.frame;
                    if(!rect) continue;

                    const srcW = Math.max(1, Math.floor(fData.rotated ? rect.h : rect.w));
                    const srcH = Math.max(1, Math.floor(fData.rotated ? rect.w : rect.h));
                    entries.push({
                        name,
                        data: fData,
                        srcX: Math.floor(rect.x),
                        srcY: Math.floor(rect.y),
                        srcW,
                        srcH
                    });
                }

                const pages = shelfPackFrames(entries, maxTexSize);
                const pageBaseTextures: BaseTexture[] = [];

                for(const page of pages)
                {
                    const canvas = document.createElement('canvas');
                    canvas.width = page.width;
                    canvas.height = page.height;
                    const ctx = canvas.getContext('2d');
                    if(!ctx) continue;

                    ctx.imageSmoothingEnabled = false;

                    for(const p of page.placements)
                    {
                        const { entry, dstX, dstY } = p;
                        const drawW = Math.min(entry.srcW, page.width - dstX);
                        const drawH = Math.min(entry.srcH, page.height - dstY);
                        ctx.drawImage(source, entry.srcX, entry.srcY, drawW, drawH, dstX, dstY, drawW, drawH);
                    }

                    const pageBt = BaseTexture.from(canvas, {
                        resolution,
                        scaleMode: bt.scaleMode,
                        mipmap: bt.mipmap
                    });
                    pageBaseTextures.push(pageBt);

                    for(const p of page.placements)
                    {
                        const { entry, dstX, dstY } = p;
                        const fData = entry.data;
                        const rect = fData.frame;
                        const sourceSize = (fData.trimmed !== false && fData.sourceSize) ? fData.sourceSize : rect;
                        const orig = new Rectangle(
                            0,
                            0,
                            Math.floor(sourceSize.w) / resolution,
                            Math.floor(sourceSize.h) / resolution
                        );

                        const frameRect = fData.rotated
                            ? new Rectangle(dstX / resolution, dstY / resolution, Math.floor(rect.h) / resolution, Math.floor(rect.w) / resolution)
                            : new Rectangle(dstX / resolution, dstY / resolution, Math.floor(rect.w) / resolution, Math.floor(rect.h) / resolution);

                        let trim: Rectangle | null = null;
                        if(fData.trimmed !== false && fData.spriteSourceSize)
                        {
                            trim = new Rectangle(
                                Math.floor(fData.spriteSourceSize.x) / resolution,
                                Math.floor(fData.spriteSourceSize.y) / resolution,
                                Math.floor(rect.w) / resolution,
                                Math.floor(rect.h) / resolution
                            );
                        }

                        const tex = new Texture(
                            pageBt,
                            frameRect,
                            orig,
                            trim || undefined,
                            fData.rotated ? 2 : 0,
                            fData.anchor
                        );
                        this.textures[entry.name] = tex;
                        Texture.addToCache(tex, entry.name);
                    }
                }

                if(pageBaseTextures.length > 0)
                {
                    this.baseTexture = pageBaseTextures[0];
                }

                if(typeof this._processAnimations === 'function')
                {
                    this._processAnimations();
                }

                if(callback) callback(this.textures);
                resolve(this.textures);
            }
            catch (err)
            {
                console.warn('[OversizedSpritesheetPatch] Fallback to default parse:', err);
                origParse.call(this, callback).then(resolve);
            }
        });
    };
}
