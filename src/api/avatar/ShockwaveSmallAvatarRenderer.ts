import { NitroBundle } from '@nitrots/nitro-renderer';
import { GetAvatarRenderManager } from '../nitro';
import v9SmallAtlasImgUrl from '../../assets/shockwave-small/v9_small_atlas.png';
import v9SmallAtlasRaw from '../../assets/shockwave-small/v9_small_atlas.json';

interface V9SmallAtlasData
{
    w: number;
    h: number;
    parts: Record<string, string[]>;
    // [x, y, w, h, regX, regY, isColored]
    s: Record<string, [ number, number, number, number, number, number, number ]>;
}

interface DynamicSmallLib
{
    img: HTMLImageElement | HTMLCanvasElement;
    // [x, y, w, h, regX, regY, flipH]
    s: Record<string, [ number, number, number, number, number, number, number ]>;
}

export interface V9SmallRenderOptions
{
    direction?: number;
    headDirection?: number;
    posture?: 'std' | 'wlk' | 'sit' | 'lay';
    arms?: 'normal' | 'push' | 'wobble0' | 'wobble1';
    panicFace?: boolean;
    frame?: number;
    headOnly?: boolean;
    gender?: string | null;
}

interface ParsedSet
{
    id: number;
    colorIds: number[];
}

interface ResolvedPart
{
    setType: string;
    partType: string;
    partId: number;
    index: number;
    colorable: boolean;
    colorIndex: number;
    colorHex: string | null;
    fallbackLibId: string | null;
}

const atlasData = v9SmallAtlasRaw as unknown as V9SmallAtlasData;
let atlasImage: HTMLImageElement | null = null;
let atlasLoading = false;

// Persistent listeners notified whenever the base v9 atlas OR any exact SMALL clothing library finishes loading
const assetListeners = new Set<() => void>();
let notifyTimer: number | null = null;

// FigureMap part ("ch:3030") -> library ID ("shirt_M_...")
const figurePartToLib = new Map<string, string>();
let figureMapLoaded = false;
let figureMapLoading = false;

// Cache of exact SMALL (sh_) libraries (loaded from R2 figure_small/*.nitro or converted 1:1 from figure/*.nitro)
const smallLibCache = new Map<string, DynamicSmallLib | null>();
const smallLibLoading = new Set<string>();

const FALLBACK_COLORS: Record<number, string> = {
    1: 'FFCC99', 2: 'F5C29B', 3: 'E6AC84', 4: 'D4956A', 5: 'B67346', 6: '8E522B', 7: '63371B',
    19: 'FFCC99', 20: 'F4C29A', 21: 'E5A97E', 22: 'CA8B5C', 23: 'A4673B', 24: '7B4725',
    30: 'F5D7B8', 31: '3D2B1F', 32: '5C3A21', 33: '8C5427', 34: 'C68642', 35: 'E8C26A',
    36: '2A2A2A', 37: 'EEEEEE', 38: 'B23A2A', 39: 'D96B27', 40: '6B3E26', 41: '9E6B40',
    42: '59361C', 45: '2E2E2E', 46: '4C6B8A', 47: '3B82A6', 48: '2D9B5A', 49: 'D93B3B',
    50: 'E8A325', 60: '2A6496', 61: '333333', 62: '4A4A4A', 64: '2B7BB9', 66: 'D9534F',
    70: 'E06699', 80: '3A3A3A', 82: '3478B8', 90: '4E8C57', 91: '3D5470', 92: 'C94A38',
    100: 'EEEEEE', 110: '293B52', 1321: '3A3A3A', 1408: '2B4C6F'
};

const tintedCache = new Map<string, HTMLCanvasElement>();

function scheduleNotifyListeners(): void
{
    if(notifyTimer !== null) return;
    notifyTimer = window.setTimeout(() =>
    {
        notifyTimer = null;
        assetListeners.forEach(fn => { try { fn(); } catch {} });
    }, 16);
}

export function isShockwaveSmallAtlasReady(): boolean
{
    return !!(atlasImage && atlasImage.complete && atlasImage.naturalWidth > 0);
}

function preloadFigureMap(): void
{
    if(figureMapLoaded || figureMapLoading) return;
    figureMapLoading = true;

    fetch('/game/assets/gamedata/FigureMap.json')
        .then(r => (r.ok ? r.json() : null))
        .then(data =>
        {
            if(data && Array.isArray(data.libraries))
            {
                for(const lib of data.libraries)
                {
                    if(!lib || !lib.id || !Array.isArray(lib.parts)) continue;
                    // Prefer standard LARGE libraries (non-_50_) as canonical source for exact 2:1 SMALL conversion
                    if(String(lib.id).includes('_50_')) continue;
                    for(const part of lib.parts)
                    {
                        if(!part || !part.type || part.id === undefined) continue;
                        const k = `${ part.type }:${ part.id }`;
                        if(!figurePartToLib.has(k)) figurePartToLib.set(k, lib.id);
                    }
                }
            }
            figureMapLoaded = true;
            figureMapLoading = false;
            scheduleNotifyListeners();
        })
        .catch(() =>
        {
            figureMapLoaded = true;
            figureMapLoading = false;
        });
}

export function preloadShockwaveSmallAtlas(): void
{
    preloadFigureMap();
    if(isShockwaveSmallAtlasReady() || atlasLoading) return;
    atlasLoading = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () =>
    {
        atlasImage = img;
        atlasLoading = false;
        scheduleNotifyListeners();
    };
    img.onerror = () => { atlasLoading = false; };
    img.src = v9SmallAtlasImgUrl;
}

export function onShockwaveSmallAtlasReady(cb: () => void): () => void
{
    assetListeners.add(cb);
    preloadShockwaveSmallAtlas();
    if(isShockwaveSmallAtlasReady())
    {
        cb();
    }
    return () => { assetListeners.delete(cb); };
}

function waitBaseTextureSource(bt: any): Promise<HTMLImageElement | HTMLCanvasElement | null>
{
    return new Promise((resolve) =>
    {
        if(!bt) return resolve(null);
        const getSrc = () => (bt.resource && bt.resource.source) ? bt.resource.source : null;
        if(bt.valid)
        {
            const src = getSrc();
            if(src) return resolve(src);
        }
        let done = false;
        const finish = () =>
        {
            if(done) return;
            done = true;
            resolve(getSrc());
        };
        bt.once('update', finish);
        bt.once('error', () => { if(!done) { done = true; resolve(null); } });
        window.setTimeout(finish, 4000);
    });
}

/**
 * Exact 2:1 pixel-art morphology downscaler (LARGE h_ -> SMALL sh_).
 * Identical deterministic algorithm to server-side generate-small-figure.cjs:
 * preserves crisp 1px Habbo outlines, silhouette edges, and grayscale shading.
 */
function downscalePixelArt2xBrowser(
    srcData: Uint8ClampedArray,
    srcW: number,
    fx: number,
    fy: number,
    fw: number,
    fh: number,
    rotated: boolean
): { sw: number; sh: number; data: Uint8ClampedArray }
{
    const patch = new Uint8ClampedArray(fw * fh * 4);
    for(let y = 0; y < fh; y++)
    {
        for(let x = 0; x < fw; x++)
        {
            const sx = rotated ? (fx + (fh - 1 - y)) : (fx + x);
            const sy = rotated ? (fy + x) : (fy + y);
            const sIdx = (sy * srcW + sx) * 4;
            const dIdx = (y * fw + x) * 4;
            patch[dIdx] = srcData[sIdx];
            patch[dIdx + 1] = srcData[sIdx + 1];
            patch[dIdx + 2] = srcData[sIdx + 2];
            patch[dIdx + 3] = srcData[sIdx + 3];
        }
    }

    const sw = Math.max(1, Math.ceil(fw / 2));
    const sh = Math.max(1, Math.ceil(fh / 2));
    const dst = new Uint8ClampedArray(sw * sh * 4);

    for(let oy = 0; oy < sh; oy++)
    {
        for(let ox = 0; ox < sw; ox++)
        {
            let rSum = 0;
            let gSum = 0;
            let bSum = 0;
            let aSum = 0;
            let cnt = 0;
            let totalCells = 0;
            let darkCnt = 0;
            let minLuma = 999;
            let darkR = 0;
            let darkG = 0;
            let darkB = 0;
            let maxLuma = -1;
            let brightR = 0;
            let brightG = 0;
            let brightB = 0;

            for(let dy = 0; dy < 2; dy++)
            {
                const py = oy * 2 + dy;
                if(py >= fh) continue;
                for(let dx = 0; dx < 2; dx++)
                {
                    const px = ox * 2 + dx;
                    if(px >= fw) continue;
                    totalCells++;
                    const idx = (py * fw + px) * 4;
                    const alpha = patch[idx + 3];
                    if(alpha >= 24)
                    {
                        const r = patch[idx];
                        const g = patch[idx + 1];
                        const b = patch[idx + 2];
                        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
                        rSum += r;
                        gSum += g;
                        bSum += b;
                        aSum += alpha;
                        cnt++;
                        if(luma <= 40) darkCnt++;
                        if(luma < minLuma) { minLuma = luma; darkR = r; darkG = g; darkB = b; }
                        if(luma > maxLuma) { maxLuma = luma; brightR = r; brightG = g; brightB = b; }
                    }
                }
            }

            if(cnt === 0) continue;

            // Preserve semi-transparency (e.g. tinted sunglasses lenses ea-3170!) while keeping solid parts crisp 255
            const avgAlpha = Math.round(aSum / cnt);
            const outAlpha = avgAlpha >= 235 ? 255 : avgAlpha;

            // Preserve ALL opaque blocks including thin 1px hair bangs, spiky hair tips, hat brims & eyewear temples
            const isSilhouetteEdge = cnt < totalCells;

            let r: number;
            let g: number;
            let b: number;
            if(isSilhouetteEdge && minLuma <= 42 && outAlpha >= 200)
            {
                // Preserve crisp 1px dark Habbo outlines ONLY on opaque outer silhouette boundaries
                r = darkR;
                g = darkG;
                b = darkB;
            }
            else if(darkCnt >= 2 && minLuma <= 28 && (maxLuma - minLuma) >= 60 && outAlpha >= 200)
            {
                // Preserve strong internal dark seams without blotting out facial features
                r = darkR;
                g = darkG;
                b = darkB;
            }
            else if((maxLuma - minLuma) > 85 && maxLuma > 130)
            {
                // Preserve crisp light prints/zippers/studs/highlights on dark clothes
                r = Math.round((rSum / cnt) * 0.45 + brightR * 0.55);
                g = Math.round((gSum / cnt) * 0.45 + brightG * 0.55);
                b = Math.round((bSum / cnt) * 0.45 + brightB * 0.55);
            }
            else
            {
                // Faithful area-averaged RGB preserves exact colors & shading without crushing dark clothes black
                r = Math.round(rSum / cnt);
                g = Math.round(gSum / cnt);
                b = Math.round(bSum / cnt);
            }

            const outIdx = (oy * sw + ox) * 4;
            dst[outIdx] = r;
            dst[outIdx + 1] = g;
            dst[outIdx + 2] = b;
            dst[outIdx + 3] = outAlpha;
        }
    }

    return { sw, sh, data: dst };
}

function convertLargeBundleToSmallInMemory(json: any, sourceImg: HTMLImageElement | HTMLCanvasElement, libId: string): DynamicSmallLib | null
{
    const srcW = (sourceImg as HTMLImageElement).naturalWidth || sourceImg.width;
    const srcH = (sourceImg as HTMLImageElement).naturalHeight || sourceImg.height;
    if(!srcW || !srcH || !json) return null;

    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = srcW;
    srcCanvas.height = srcH;
    const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
    if(!srcCtx) return null;
    srcCtx.imageSmoothingEnabled = false;
    srcCtx.drawImage(sourceImg, 0, 0);
    const srcPixels = srcCtx.getImageData(0, 0, srcW, srcH).data;

    const assets = json.assets || {};
    const frames = (json.spritesheet && json.spritesheet.frames) ? json.spritesheet.frames : {};
    const jsonName = json.name || libId;

    const findFrameData = (assetKey: string) =>
    {
        const cands = [
            `${ jsonName }_${ assetKey }`,
            `${ libId }_${ assetKey }`,
            assetKey,
            `${ jsonName }_${ assetKey }.png`,
            `${ libId }_${ assetKey }.png`
        ];
        for(const c of cands)
        {
            if(frames[c] && frames[c].frame) return { key: c, data: frames[c] };
        }
        return null;
    };

    const uniqueFrames = new Map<string, { sw: number; sh: number; data: Uint8ClampedArray }>();
    const spriteEntries: Record<string, { frameKey: string; regX: number; regY: number; flipH: number }> = {};
    const hRegex = /^h_([a-z0-9]+)_([a-z]+)_(\d+)_(\d+)_(\d+)$/;

    for(const [ assetKey, asset ] of Object.entries<any>(assets))
    {
        if(!asset) continue;
        if(!hRegex.test(assetKey)) continue;

        const shKey = 'sh_' + assetKey.slice(2);
        const sourceAssetKey = asset.source || assetKey;
        const found = findFrameData(sourceAssetKey);
        if(!found) continue;

        const fRect = found.data.frame;
        if(!fRect || fRect.w <= 0 || fRect.h <= 0) continue;

        if(!uniqueFrames.has(found.key))
        {
            const small = downscalePixelArt2xBrowser(
                srcPixels,
                srcW,
                Math.floor(fRect.x),
                Math.floor(fRect.y),
                Math.floor(fRect.w),
                Math.floor(fRect.h),
                !!found.data.rotated
            );
            uniqueFrames.set(found.key, small);
        }

        const hRegX = typeof asset.x === 'number' ? asset.x : 0;
        const hRegY = typeof asset.y === 'number' ? asset.y : 0;
        spriteEntries[shKey] = {
            frameKey: found.key,
            regX: Math.round(hRegX / 2) + 1,
            regY: Math.round(hRegY / 2),
            flipH: asset.flipH ? 1 : 0
        };
    }

    if(uniqueFrames.size === 0) return null;

    // Shelf-pack into a compact offscreen canvas
    const PAD = 1;
    const list = Array.from(uniqueFrames.entries()).sort((a, b) => (b[1].sh - a[1].sh) || (b[1].sw - a[1].sw));
    let totalArea = 0;
    let maxW = 1;
    for(const [ , sp ] of list)
    {
        totalArea += (sp.sw + PAD) * (sp.sh + PAD);
        if(sp.sw + PAD > maxW) maxW = sp.sw + PAD;
    }
    const targetW = Math.min(2048, Math.max(maxW, Math.ceil(Math.sqrt(totalArea * 1.2))));

    const placements = new Map<string, { x: number; y: number; w: number; h: number }>();
    let curX = 0;
    let curY = 0;
    let rowH = 0;
    let atlasW = 0;

    for(const [ fKey, sp ] of list)
    {
        if(curX > 0 && curX + sp.sw > targetW)
        {
            curX = 0;
            curY += rowH + PAD;
            rowH = 0;
        }
        placements.set(fKey, { x: curX, y: curY, w: sp.sw, h: sp.sh });
        if(curX + sp.sw > atlasW) atlasW = curX + sp.sw;
        if(sp.sh > rowH) rowH = sp.sh;
        curX += sp.sw + PAD;
    }
    const atlasH = Math.max(1, curY + rowH);
    atlasW = Math.max(1, atlasW);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = atlasW;
    outCanvas.height = atlasH;
    const outCtx = outCanvas.getContext('2d');
    if(!outCtx) return null;

    const outImgData = outCtx.createImageData(atlasW, atlasH);
    const outBuf = outImgData.data;
    for(const [ fKey, sp ] of list)
    {
        const p = placements.get(fKey);
        if(!p) continue;
        for(let y = 0; y < sp.sh; y++)
        {
            const srcOff = y * sp.sw * 4;
            const dstOff = ((p.y + y) * atlasW + p.x) * 4;
            outBuf.set(sp.data.subarray(srcOff, srcOff + sp.sw * 4), dstOff);
        }
    }
    outCtx.putImageData(outImgData, 0, 0);

    const sMap: Record<string, [ number, number, number, number, number, number, number ]> = {};
    for(const [ shKey, info ] of Object.entries(spriteEntries))
    {
        const p = placements.get(info.frameKey);
        if(!p) continue;
        sMap[shKey] = [ p.x, p.y, p.w, p.h, info.regX, info.regY, info.flipH ];
    }

    return { img: outCanvas, s: sMap };
}

function loadSmallFigureLibrary(libId: string): void
{
    if(!libId || smallLibCache.has(libId) || smallLibLoading.has(libId)) return;
    smallLibLoading.add(libId);

    (async () =>
    {
        try
        {
            // 1. Try pre-generated exact SMALL (sh_) bundle from R2 (created by Housekeeping / converter)
            const smallResp = await fetch(`/game/assets/bundled/figure_small/${ encodeURIComponent(libId) }.nitro`);
            if(smallResp.ok)
            {
                const buf = await smallResp.arrayBuffer();
                if(buf.byteLength > 12)
                {
                    const bundle = new NitroBundle(buf);
                    const j: any = bundle.jsonFile;
                    const src = await waitBaseTextureSource(bundle.baseTexture);
                    if(j && j.s && src)
                    {
                        smallLibCache.set(libId, { img: src, s: j.s });
                        smallLibLoading.delete(libId);
                        scheduleNotifyListeners();
                        return;
                    }
                }
            }

            // 2. Fallback: fetch the garment's exact LARGE .nitro bundle and convert 1:1 to exact SMALL pixel-art in memory
            const largeResp = await fetch(`/game/assets/bundled/figure/${ encodeURIComponent(libId) }.nitro`);
            if(largeResp.ok)
            {
                const buf = await largeResp.arrayBuffer();
                if(buf.byteLength > 12)
                {
                    const bundle = new NitroBundle(buf);
                    const src = await waitBaseTextureSource(bundle.baseTexture);
                    if(bundle.jsonFile && src)
                    {
                        const converted = convertLargeBundleToSmallInMemory(bundle.jsonFile, src, libId);
                        smallLibCache.set(libId, converted);
                        smallLibLoading.delete(libId);
                        scheduleNotifyListeners();
                        return;
                    }
                }
            }

            smallLibCache.set(libId, null);
        }
        catch
        {
            smallLibCache.set(libId, null);
        }
        finally
        {
            smallLibLoading.delete(libId);
        }
    })();
}

function parseFigure(figure: string): Record<string, ParsedSet>
{
    const out: Record<string, ParsedSet> = {};
    if(!figure) return out;
    for(const seg of figure.split('.'))
    {
        const p = seg.split('-');
        if(p.length < 2) continue;
        const id = parseInt(p[1], 10);
        if(isNaN(id)) continue;
        const colorIds: number[] = [];
        for(let i = 2; i < p.length; i++)
        {
            const cid = parseInt(p[i], 10);
            if(!isNaN(cid)) colorIds.push(cid);
        }
        out[p[0]] = { id, colorIds };
    }
    return out;
}

function resolveColorHex(figure: string, setType: string, colorIndex: number, fallbackColorId: number, fallbackHex: string): string
{
    try
    {
        const mgr = GetAvatarRenderManager();
        if(mgr && mgr.structure)
        {
            const container = mgr.createFigureContainer(figure);
            if(container)
            {
                let pc = mgr.structure.getPartColor(container, setType, colorIndex);
                if(!pc && colorIndex > 0) pc = mgr.structure.getPartColor(container, setType, 0);
                if(pc && typeof pc.rgb === 'number')
                {
                    return pc.rgb.toString(16).padStart(6, '0').toUpperCase();
                }
            }
        }
    }
    catch
    {
        // fallback below
    }
    if(fallbackColorId && FALLBACK_COLORS[fallbackColorId]) return FALLBACK_COLORS[fallbackColorId];
    return fallbackHex;
}

/**
 * Expand a figure string into its exact parts and hiddenLayers using Nitro's live FigureData.
 */
function resolveExactFigureParts(figure: string, parsed: Record<string, ParsedSet>): { parts: ResolvedPart[]; hiddenLayers: Set<string> }
{
    const parts: ResolvedPart[] = [];
    const hiddenLayers = new Set<string>();
    const CLOTHING_SETS = [ 'hr', 'ch', 'lg', 'sh', 'ha', 'he', 'ea', 'fa', 'ca', 'wa', 'cc', 'cp' ];

    let figureData: any = null;
    try
    {
        figureData = GetAvatarRenderManager()?.structure?.figureData || null;
    }
    catch
    {
        figureData = null;
    }

    for(const setType of CLOTHING_SETS)
    {
        const entry = parsed[setType];
        if(!entry) continue;

        let expanded = false;
        if(figureData && typeof figureData.getSetType === 'function')
        {
            try
            {
                const st = figureData.getSetType(setType);
                const partSet = st ? st.getPartSet(entry.id) : null;
                if(partSet)
                {
                    const hLayers: string[] = partSet.hiddenLayers || [];
                    for(const hl of hLayers) hiddenLayers.add(hl);

                    const rawParts: any[] = partSet.parts || [];
                    const setIsColorable = (typeof partSet.isColorable === 'boolean') ? partSet.isColorable : !!partSet.colorable;

                    // Resolve sibling library ID for parts in the same set that FigureMap doesn't list separately (e.g. lc:5103, ch:2100)
                    let siblingLibId: string | null = null;
                    for(const rp of rawParts)
                    {
                        if(!rp || !rp.type || rp.id === undefined) continue;
                        const foundLib = figurePartToLib.get(`${ rp.type }:${ rp.id }`);
                        if(foundLib) { siblingLibId = foundLib; break; }
                    }

                    for(const rp of rawParts)
                    {
                        if(!rp || !rp.type || rp.id === undefined) continue;
                        const rawLayerIdx = (typeof rp.colorLayerIndex === 'number')
                            ? rp.colorLayerIndex
                            : ((typeof rp.colorindex === 'number') ? rp.colorindex : (typeof rp.colorIndex === 'number' ? rp.colorIndex : 1));
                        const colorable = setIsColorable && rawLayerIdx > 0;
                        const cIdx = Math.max(0, rawLayerIdx - 1);
                        const colorId = entry.colorIds[cIdx] ?? entry.colorIds[0] ?? 0;
                        const colorHex = colorable
                            ? resolveColorHex(figure, setType, cIdx, colorId, 'CCCCCC')
                            : null;
                        parts.push({
                            setType,
                            partType: String(rp.type),
                            partId: Number(rp.id),
                            index: Number(rp.index || 0),
                            colorable,
                            colorIndex: cIdx,
                            colorHex,
                            fallbackLibId: siblingLibId
                        });
                    }
                    expanded = rawParts.length > 0;
                }
            }
            catch
            {
                expanded = false;
            }
        }

        if(!expanded)
        {
            const colorId = entry.colorIds[0] ?? 0;
            const colorHex = resolveColorHex(figure, setType, 0, colorId, 'CCCCCC');
            parts.push({
                setType,
                partType: setType,
                partId: entry.id,
                index: 0,
                colorable: true,
                colorIndex: 0,
                colorHex,
                fallbackLibId: null
            });
        }
    }

    parts.sort((a, b) => a.index - b.index);
    return { parts, hiddenLayers };
}

function normalizeDir(dir: number): number
{
    return ((Math.round(dir) % 8) + 8) % 8;
}

function mirrorDir(dir: number): { d: number; flipped: boolean }
{
    const n = normalizeDir(dir);
    if(n === 4) return { d: 2, flipped: true };
    if(n === 5) return { d: 1, flipped: true };
    if(n === 6) return { d: 0, flipped: true };
    return { d: n, flipped: false };
}

function lookupV9BaseSprite(action: string, partType: string, partId: string, dir: number, frame: number): string | null
{
    const s = atlasData.s;
    const cands = [
        `sh_${ action }_${ partType }_${ partId }_${ dir }_${ frame }`,
        `sh_${ action }_${ partType }_${ partId }_${ dir }_0`,
        `sh_std_${ partType }_${ partId }_${ dir }_0`,
        `sh_${ action }_${ partType }_001_${ dir }_${ frame }`,
        `sh_${ action }_${ partType }_001_${ dir }_0`,
        `sh_std_${ partType }_001_${ dir }_0`
    ];
    for(const nm of cands)
    {
        if(s[nm]) return nm;
    }
    return null;
}

function lookupV9ExactPartSprite(action: string, partType: string, partId: number, dir: number, frame: number): string | null
{
    const s = atlasData.s;
    const padded = String(partId).padStart(3, '0');
    const raw = String(partId);
    const ids = padded === raw ? [ raw ] : [ padded, raw ];
    for(const pid of ids)
    {
        const cands = [
            `sh_${ action }_${ partType }_${ pid }_${ dir }_${ frame }`,
            `sh_${ action }_${ partType }_${ pid }_${ dir }_0`,
            `sh_std_${ partType }_${ pid }_${ dir }_0`
        ];
        for(const nm of cands)
        {
            if(s[nm]) return nm;
        }
    }
    return null;
}

function lookupDynamicSmallSprite(
    lib: DynamicSmallLib,
    action: string,
    partType: string,
    partId: number,
    dir: number,
    frame: number
): [ number, number, number, number, number, number, number ] | null
{
    const s = lib.s;
    const pid = String(partId);
    const cands = [
        `sh_${ action }_${ partType }_${ pid }_${ dir }_${ frame }`,
        `sh_${ action }_${ partType }_${ pid }_${ dir }_0`,
        `sh_std_${ partType }_${ pid }_${ dir }_0`,
        `sh_wlk_${ partType }_${ pid }_${ dir }_0`
    ];
    for(const nm of cands)
    {
        if(s[nm]) return s[nm];
    }
    return null;
}

function getTintedSprite(
    cacheKey: string,
    sourceImg: HTMLImageElement | HTMLCanvasElement,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    hexColor: string | null
): HTMLCanvasElement | null
{
    const effHex = hexColor ? hexColor.toUpperCase() : 'RAW';
    const key = `${ cacheKey }|${ effHex }`;
    const cached = tintedCache.get(key);
    if(cached) return cached;

    const c = document.createElement('canvas');
    c.width = sw;
    c.height = sh;
    const ctx = c.getContext('2d');
    if(!ctx) return null;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sourceImg, sx, sy, sw, sh, 0, 0, sw, sh);

    if(effHex !== 'RAW')
    {
        const tr = parseInt(effHex.slice(0, 2), 16) || 0;
        const tg = parseInt(effHex.slice(2, 4), 16) || 0;
        const tb = parseInt(effHex.slice(4, 6), 16) || 0;
        const imgData = ctx.getImageData(0, 0, sw, sh);
        const d = imgData.data;
        for(let i = 0; i < d.length; i += 4)
        {
            if(d[i + 3] === 0) continue;
            d[i] = Math.round((d[i] * tr) / 255);
            d[i + 1] = Math.round((d[i + 1] * tg) / 255);
            d[i + 2] = Math.round((d[i + 2] * tb) / 255);
        }
        ctx.putImageData(imgData, 0, 0);
    }

    if(tintedCache.size > 2500)
    {
        const first = tintedCache.keys().next().value;
        if(first) tintedCache.delete(first);
    }
    tintedCache.set(key, c);
    return c;
}

/**
 * Returns true if the base v9 atlas AND all exact SMALL clothing libraries for this figure are loaded.
 */
export function isShockwaveSmallFigureReady(figure: string): boolean
{
    if(!isShockwaveSmallAtlasReady() || !figureMapLoaded) return false;
    const parsed = parseFigure(figure);
    const { parts } = resolveExactFigureParts(figure, parsed);
    for(const p of parts)
    {
        if(lookupV9ExactPartSprite('std', p.partType, p.partId, 2, 0)) continue;
        const libId = figurePartToLib.get(`${ p.partType }:${ p.partId }`) || p.fallbackLibId;
        if(libId && !smallLibCache.has(libId))
        {
            loadSmallFigureLibrary(libId);
            return false;
        }
    }
    return true;
}

export function renderShockwaveSmallDataUrl(figure: string, opts: V9SmallRenderOptions = {}): string | null
{
    if(!isShockwaveSmallAtlasReady()) return null;
    preloadFigureMap();

    const posture = opts.posture || 'std';
    const canvasW = 52;
    const canvasH = 68;
    const ox = 10;
    const oy = 58;

    const c = document.createElement('canvas');
    c.width = canvasW;
    c.height = canvasH;
    const ctx = c.getContext('2d');
    if(!ctx) return null;
    ctx.imageSmoothingEnabled = false;

    const parsed = parseFigure(figure);
    const skinHex = resolveColorHex(figure, 'hd', 0, parsed.hd?.colorIds[0] || 1, 'FFCC99');
    const { parts: resolvedParts, hiddenLayers } = resolveExactFigureParts(figure, parsed);

    const rawDir = normalizeDir(opts.direction ?? 2);
    const rawHeadDir = normalizeDir(opts.headDirection ?? rawDir);
    const effDir = posture === 'sit'
        ? (rawDir % 2 === 0 ? rawDir : normalizeDir(rawDir - 1))
        : rawDir;
    const bodyMap = mirrorDir(effDir);
    const headMap = mirrorDir(rawHeadDir);
    const frame = posture === 'wlk' ? (Math.floor(opts.frame ?? 0) % 4) : 0;

    // Draw a base anatomy sprite from authentic v9_small_atlas
    const drawV9Base = (name: string | null, hex: string | null, flipped: boolean, extraY = 0) =>
    {
        if(!name || !atlasImage) return;
        const meta = atlasData.s[name];
        if(!meta) return;
        const [ sx, sy, sw, sh, regX, regY, isColored ] = meta;
        const spCanvas = getTintedSprite(`v9:${ name }`, atlasImage, sx, sy, sw, sh, isColored ? null : hex);
        if(!spCanvas) return;
        const drawX = ox - regX;
        const drawY = oy - regY + extraY;

        ctx.save();
        if(flipped)
        {
            ctx.translate(canvasW, 0);
            ctx.scale(-1, 1);
        }
        ctx.drawImage(spCanvas, drawX, drawY, sw, sh);
        ctx.restore();
    };

    const FLIPPED_TYPE: Record<string, string> = { lh: 'rh', rh: 'lh', ls: 'rs', rs: 'ls', lc: 'rc', rc: 'lc' };

    // Draw an exact clothing/hair/accessory part (native v9 SMALL first, else exact converted SMALL library)
    const drawExactParts = (partTypes: string[], action: string, dirMap: { d: number; flipped: boolean }, frm: number, extraY = 0): number =>
    {
        let drawn = 0;
        for(const p of resolvedParts)
        {
            if(!partTypes.includes(p.partType)) continue;
            if(hiddenLayers.has(p.partType)) continue;

            const lookupType = (dirMap.flipped && FLIPPED_TYPE[p.partType]) ? FLIPPED_TYPE[p.partType] : p.partType;

            // 1. Check native authentic v9 hh_people_small sprite for exact numeric ID
            const v9Exact = lookupV9ExactPartSprite(action, lookupType, p.partId, dirMap.d, frm)
                || (lookupType !== p.partType ? lookupV9ExactPartSprite(action, p.partType, p.partId, dirMap.d, frm) : null);
            if(v9Exact && atlasImage)
            {
                drawV9Base(v9Exact, p.colorable ? p.colorHex : null, dirMap.flipped, extraY);
                drawn++;
                continue;
            }

            // 2. Otherwise use exact SMALL (sh_) library (pre-generated in R2 via Housekeeping or 1:1 converted from LARGE .nitro)
            const libId = figurePartToLib.get(`${ p.partType }:${ p.partId }`) || p.fallbackLibId;
            if(!libId) continue;

            if(!smallLibCache.has(libId))
            {
                loadSmallFigureLibrary(libId);
                continue;
            }

            const lib = smallLibCache.get(libId);
            if(!lib) continue;

            const meta = lookupDynamicSmallSprite(lib, action, lookupType, p.partId, dirMap.d, frm)
                || (lookupType !== p.partType ? lookupDynamicSmallSprite(lib, action, p.partType, p.partId, dirMap.d, frm) : null);
            if(!meta) continue;

            const [ sx, sy, sw, sh, regX, regY ] = meta;
            const tint = p.colorable ? p.colorHex : null;
            const spCanvas = getTintedSprite(`dyn:${ libId }:${ action }_${ lookupType }_${ p.partId }_${ dirMap.d }_${ frm }`, lib.img, sx, sy, sw, sh, tint);
            if(!spCanvas) continue;

            const drawX = ox - regX;
            const drawY = oy - regY + extraY;

            ctx.save();
            if(dirMap.flipped)
            {
                ctx.translate(canvasW, 0);
                ctx.scale(-1, 1);
            }
            ctx.drawImage(spCanvas, drawX, drawY, sw, sh);
            ctx.restore();
            drawn++;
        }
        return drawn;
    };

    const drawHead = (extraY = 0) =>
    {
        const showFace = headMap.d === 1 || headMap.d === 2 || headMap.d === 3;
        const hdAct = opts.panicFace ? 'spk' : 'std';

        // Exact official HabboAvatarPartSets head draw order:
        // hd -> fc -> hrb (removes hr when active per removeSetType: 'hr'!) -> fa -> ea -> ha -> he
        drawV9Base(lookupV9BaseSprite(hdAct, 'hd', '002', headMap.d, 0), skinHex, headMap.flipped, extraY);
        if(showFace) drawV9Base(lookupV9BaseSprite(hdAct, 'fc', '001', headMap.d, opts.panicFace ? 1 : 0), skinHex, headMap.flipped, extraY);

        const drewHrb = drawExactParts([ 'hrb' ], 'std', headMap, 0, extraY);
        if(!drewHrb)
        {
            drawExactParts([ 'hr' ], 'std', headMap, 0, extraY);
        }
        drawExactParts([ 'fa' ], 'std', headMap, 0, extraY);
        drawExactParts([ 'ea' ], 'std', headMap, 0, extraY);
        drawExactParts([ 'ha' ], 'std', headMap, 0, extraY);
        drawExactParts([ 'he' ], 'std', headMap, 0, extraY);
    };

    if(opts.headOnly)
    {
        drawHead(0);
        return c.toDataURL('image/png');
    }

    const isBack = bodyMap.d === 0 || bodyMap.d === 7;
    const arms = opts.arms || 'normal';
    const leftAct = arms === 'wobble0' || arms === 'wobble1' ? 'wav' : (arms === 'push' ? 'crr' : posture);
    const leftFrm = arms === 'wobble1' ? 1 : (arms === 'wobble0' ? 0 : frame);
    const rightAct = arms === 'wobble1' ? 'drk' : ((arms === 'wobble0' || arms === 'push') ? 'crr' : posture);
    const rightFrm = (arms === 'normal') ? frame : 0;
    const bounceY = (posture === 'wlk' && (frame === 1 || frame === 3)) ? -1 : 0;

    // 1. Back arm (left hand + exact left sleeves from shirt & jacket)
    drawV9Base(lookupV9BaseSprite(leftAct, 'lh', '001', bodyMap.d, leftFrm), skinHex, bodyMap.flipped, bounceY);
    drawExactParts([ 'ls' ], leftAct, bodyMap, leftFrm, bounceY);
    drawExactParts([ 'lc' ], leftAct, bodyMap, leftFrm, bounceY);

    if(isBack)
    {
        drawV9Base(lookupV9BaseSprite(rightAct, 'rh', '001', bodyMap.d, rightFrm), skinHex, bodyMap.flipped, bounceY);
        drawExactParts([ 'rs' ], rightAct, bodyMap, rightFrm, bounceY);
        drawExactParts([ 'rc' ], rightAct, bodyMap, rightFrm, bounceY);
    }

    // 2. Body + exact shoes, legs, shirt, chest print, waist, jacket, chest/back accessory
    drawV9Base(lookupV9BaseSprite(posture, 'bd', '001', bodyMap.d, frame), skinHex, bodyMap.flipped);
    drawExactParts([ 'sh' ], posture, bodyMap, frame, 0);
    drawExactParts([ 'lg' ], posture, bodyMap, frame, 0);
    drawExactParts([ 'ch' ], 'std', bodyMap, 0, bounceY);
    drawExactParts([ 'cp' ], 'std', bodyMap, 0, bounceY);
    drawExactParts([ 'wa' ], 'std', bodyMap, 0, bounceY);
    drawExactParts([ 'cc' ], 'std', bodyMap, 0, bounceY);
    drawExactParts([ 'ca' ], 'std', bodyMap, 0, bounceY);

    // 3. Head + exact hair/hat/eyewear/face accessories
    drawHead(bounceY);

    // 4. Front arm (right hand + exact right sleeves from shirt & jacket)
    if(!isBack)
    {
        drawV9Base(lookupV9BaseSprite(rightAct, 'rh', '001', bodyMap.d, rightFrm), skinHex, bodyMap.flipped, bounceY);
        drawExactParts([ 'rs' ], rightAct, bodyMap, rightFrm, bounceY);
        drawExactParts([ 'rc' ], rightAct, bodyMap, rightFrm, bounceY);
    }

    return c.toDataURL('image/png');
}
