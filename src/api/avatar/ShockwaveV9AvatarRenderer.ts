import { AvatarAction, AvatarScaleType, AvatarSetType, IAvatarImage, NitroBaseTexture, NitroRenderTexture, NitroSprite, NitroTexture, PixiApplicationProxy } from '@nitrots/nitro-renderer';
import { GetAvatarRenderManager } from '../nitro';
import v9AtlasImgUrl from '../../assets/shockwave-v9/v9_people_atlas.png';
import v9AtlasJsonUrl from '../../assets/shockwave-v9/v9_people_atlas.json?url';

interface V9AtlasData
{
    w: number;
    h: number;
    parts: Record<string, string[]>;
    // [x, y, w, h, regX, regY, isColored]
    s: Record<string, [ number, number, number, number, number, number, number ]>;
}

export interface V9RenderOptions
{
    direction?: number;
    headDirection?: number;
    posture?: 'std' | 'wlk' | 'sit' | 'lay';
    gesture?: string | null;
    talk?: boolean;
    wave?: boolean;
    blink?: boolean;
    frame?: number;
    headOnly?: boolean;
    gender?: string | null;
    small?: boolean;
}

interface ParsedFigurePart
{
    id: number;
    colorId: number;
}

let atlasData: V9AtlasData | null = null;
let atlasImage: HTMLImageElement | null = null;
let atlasLoadingPromise: Promise<boolean> | null = null;
const readyListeners = new Set<() => void>();
let v9EraEpoch = 0;
let patchInstalled = false;

// Classic Habbo v9 gender-appropriate pools from hh_people_1.cct & hh_people_2.cct
const MALE_HAIR_POOL = [ '001', '002', '003', '005', '006', '007', '008', '009', '010', '011', '013', '014', '015', '016', '017', '018', '019', '020', '200', '201', '202', '203', '503', '504', '505', '506' ];
const FEMALE_HAIR_POOL = [ '004', '013', '014', '015', '021', '022', '023', '024', '025', '026', '457', '458', '501', '502', '507', '508', '509' ];
const MALE_SHIRT_POOL = [ '001', '003', '005', '008', '009', '010', '017', '018', '100', '101', '105', '106', '200', '201', '202', '203', '204', '205', '206', '207' ];
const FEMALE_SHIRT_POOL = [ '002', '004', '006', '015', '016', '501', '502', '503', '504', '505', '506', '507' ];
const MALE_LEG_POOL = [ '001', '002', '003', '004', '005', '200' ];
const FEMALE_LEG_POOL = [ '001', '002', '004', '006', '200', '201' ];
const SHOE_POOL = [ '001', '002', '003', '004' ];
const SLEEVE_POOL = [ '001', '002', '017', '800' ];

// Cache of individually tinted sprite canvases: key = `${spriteName}|${hex}`
const tintedSpriteCache = new Map<string, HTMLCanvasElement>();
const MAX_TINT_CACHE = 1800;

// Fallback Habbo classic palette colors if Nitro structure hasn't loaded color IDs yet
const FALLBACK_COLORS: Record<number, string> = {
    1: 'FFCC99', 2: 'F5C29B', 3: 'E6AC84', 4: 'D4956A', 5: 'B67346', 6: '8E522B', 7: '63371B',
    19: 'FFCC99', 20: 'F4C29A', 21: 'E5A97E', 22: 'CA8B5C', 23: 'A4673B', 24: '7B4725',
    30: 'F5D7B8', 31: '3D2B1F', 32: '5C3A21', 33: '8C5427', 34: 'C68642', 35: 'E8C26A',
    36: '222222', 37: 'EEEEEE', 38: 'B23A2A', 39: 'D96B27', 40: '6B3E26', 41: '9E6B40',
    42: '59361C', 45: '2B2B2B', 46: '4C6B8A', 47: '3B82A6', 48: '2D9B5A', 49: 'D93B3B',
    50: 'E8A325', 60: '2A6496', 61: '2E2E2E', 62: '4A4A4A', 64: '2B7BB9', 66: 'D9534F',
    70: 'E06699', 80: '3A3A3A', 82: '3478B8', 90: '4E8C57', 91: '3D5470', 92: 'C94A38',
    100: 'EEEEEE', 110: '293B52', 1321: '3A3A3A', 1408: '2B4C6F'
};

export function isShockwave2006Desktop(): boolean
{
    if(typeof document === 'undefined') return false;
    return document.body.classList.contains('era-shockwave-2006') && !document.body.classList.contains('is-mobile-ui');
}

export function isShockwaveV9AtlasReady(): boolean
{
    return !!(atlasData && atlasImage && atlasImage.complete && atlasImage.naturalWidth > 0);
}

export function onShockwaveV9AtlasReady(cb: () => void): () => void
{
    if(isShockwaveV9AtlasReady())
    {
        cb();
        return () => {};
    }
    readyListeners.add(cb);
    preloadShockwaveV9Atlas();
    return () => { readyListeners.delete(cb); };
}

export function notifyShockwaveV9EraChanged(era: string): void
{
    v9EraEpoch++;
    if(era === 'shockwave2006')
    {
        preloadShockwaveV9Atlas();
    }
    if(typeof window !== 'undefined')
    {
        window.dispatchEvent(new CustomEvent('habbten-era-avatar-refresh', { detail: { era, epoch: v9EraEpoch } }));
    }
}

export function preloadShockwaveV9Atlas(): Promise<boolean>
{
    if(isShockwaveV9AtlasReady()) return Promise.resolve(true);
    if(atlasLoadingPromise) return atlasLoadingPromise;

    atlasLoadingPromise = new Promise<boolean>(resolve =>
    {
        let jsonDone = false;
        let imgDone = false;
        let failed = false;

        const finish = () =>
        {
            if(failed)
            {
                atlasLoadingPromise = null;
                resolve(false);
                return;
            }
            if(jsonDone && imgDone)
            {
                v9EraEpoch++;
                readyListeners.forEach(fn => { try { fn(); } catch {} });
                readyListeners.clear();
                if(typeof window !== 'undefined')
                {
                    window.dispatchEvent(new CustomEvent('habbten-era-avatar-refresh', { detail: { atlasReady: true, epoch: v9EraEpoch } }));
                }
                resolve(true);
            }
        };

        fetch(v9AtlasJsonUrl)
            .then(r => r.ok ? r.json() : Promise.reject(new Error('atlas json failed')))
            .then((data: V9AtlasData) =>
            {
                atlasData = data;
                jsonDone = true;
                finish();
            })
            .catch(() =>
            {
                failed = true;
                finish();
            });

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () =>
        {
            atlasImage = img;
            imgDone = true;
            finish();
        };
        img.onerror = () =>
        {
            failed = true;
            finish();
        };
        img.src = v9AtlasImgUrl;
    });

    return atlasLoadingPromise;
}

function parseFigure(figure: string): Record<string, ParsedFigurePart>
{
    const out: Record<string, ParsedFigurePart> = {};
    if(!figure) return out;
    const segments = figure.split('.');
    for(const seg of segments)
    {
        const parts = seg.split('-');
        if(parts.length < 2) continue;
        const type = parts[0];
        const id = parseInt(parts[1], 10);
        const colorId = parts.length >= 3 ? parseInt(parts[2], 10) : 0;
        if(!isNaN(id)) out[type] = { id, colorId: isNaN(colorId) ? 0 : colorId };
    }
    return out;
}

function detectIsFemale(parsed: Record<string, ParsedFigurePart>, gender?: string | null): boolean
{
    if(gender)
    {
        const g = gender.toUpperCase();
        if(g === 'F') return true;
        if(g === 'M') return false;
    }
    const hd = parsed.hd?.id || 0;
    const hr = parsed.hr?.id || 0;
    const ch = parsed.ch?.id || 0;
    const lg = parsed.lg?.id || 0;
    if(hd >= 600 && hd < 700) return true;
    if((hr >= 500 && hr < 600) || (hr >= 800 && hr < 900)) return true;
    if(ch >= 600 && ch < 700) return true;
    if(lg >= 700 && lg < 800) return true;
    return false;
}

function resolveColorHex(figure: string, partType: string, colorId: number, fallbackHex: string): string
{
    try
    {
        const mgr = GetAvatarRenderManager();
        if(mgr && mgr.structure)
        {
            const container = mgr.createFigureContainer(figure);
            if(container)
            {
                const pc = mgr.structure.getPartColor(container, partType, 0);
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
    if(colorId && FALLBACK_COLORS[colorId]) return FALLBACK_COLORS[colorId];
    return fallbackHex;
}

function pad3(n: number): string
{
    return String(Math.abs(n)).padStart(3, '0');
}

function pickPartId(rawId: number | undefined, pool: string[], validSet: string[] | undefined): string
{
    if(rawId !== undefined && validSet)
    {
        const exact = pad3(rawId);
        if(validSet.includes(exact)) return exact;
    }
    const safePool = validSet ? pool.filter(p => validSet.includes(p)) : pool;
    const list = safePool.length > 0 ? safePool : (validSet && validSet.length > 0 ? validSet : [ '001' ]);
    if(rawId === undefined || isNaN(rawId)) return list[0];
    return list[Math.abs(rawId) % list.length];
}

function getTintedSprite(name: string, hexColor: string | null): HTMLCanvasElement | null
{
    if(!atlasData || !atlasImage) return null;
    const meta = atlasData.s[name];
    if(!meta) return null;
    const [ sx, sy, sw, sh, , , isColored ] = meta;
    const effectiveHex = (isColored || !hexColor) ? 'RAW' : hexColor.toUpperCase();
    const cacheKey = `${ name }|${ effectiveHex }`;
    const cached = tintedSpriteCache.get(cacheKey);
    if(cached) return cached;

    const c = document.createElement('canvas');
    c.width = sw;
    c.height = sh;
    const ctx = c.getContext('2d');
    if(!ctx) return null;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(atlasImage, sx, sy, sw, sh, 0, 0, sw, sh);

    if(effectiveHex !== 'RAW')
    {
        const tr = parseInt(effectiveHex.slice(0, 2), 16) || 0;
        const tg = parseInt(effectiveHex.slice(2, 4), 16) || 0;
        const tb = parseInt(effectiveHex.slice(4, 6), 16) || 0;
        const imgData = ctx.getImageData(0, 0, sw, sh);
        const d = imgData.data;
        for(let i = 0; i < d.length; i += 4)
        {
            if(d[i + 3] === 0) continue;
            d[i] = (d[i] * tr) >> 8;
            d[i + 1] = (d[i + 1] * tg) >> 8;
            d[i + 2] = (d[i + 2] * tb) >> 8;
        }
        ctx.putImageData(imgData, 0, 0);
    }

    if(tintedSpriteCache.size >= MAX_TINT_CACHE)
    {
        const firstKey = tintedSpriteCache.keys().next().value;
        if(firstKey) tintedSpriteCache.delete(firstKey);
    }
    tintedSpriteCache.set(cacheKey, c);
    return c;
}

function lookupSprite(action: string, partType: string, partId: string, dir: number, frame: number): string | null
{
    if(!atlasData) return null;
    const s = atlasData.s;

    const candidates = [
        `h_${ action }_${ partType }_${ partId }_${ dir }_${ frame }`,
        `h_${ action }_${ partType }_${ partId }_${ dir }_0`,
        `h_std_${ partType }_${ partId }_${ dir }_0`,
        `h_${ action }_${ partType }_001_${ dir }_${ frame }`,
        `h_${ action }_${ partType }_001_${ dir }_0`,
        `h_std_${ partType }_001_${ dir }_0`
    ];

    for(const nm of candidates)
    {
        if(s[nm]) return nm;
    }
    return null;
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

export function renderShockwaveV9ToCanvas(
    target: HTMLCanvasElement,
    figure: string,
    opts: V9RenderOptions = {}
): boolean
{
    if(!isShockwaveV9AtlasReady() || !atlasData) return false;

    const posture = opts.posture || 'std';
    const isLay = posture === 'lay';
    const isSmall = !!opts.small;
    const baseW = isLay ? 110 : 64;
    const baseH = isLay ? 64 : 110;
    const outW = isSmall ? Math.round(baseW / 2) : baseW;
    const outH = isSmall ? Math.round(baseH / 2) : baseH;

    if(target.width !== outW) target.width = outW;
    if(target.height !== outH) target.height = outH;

    const ctx = target.getContext('2d');
    if(!ctx) return false;

    ctx.clearRect(0, 0, outW, outH);
    ctx.imageSmoothingEnabled = false;

    const parsed = parseFigure(figure);
    const isFemale = detectIsFemale(parsed, opts.gender);
    const partsMeta = atlasData.parts;

    const skinHex = resolveColorHex(figure, 'hd', parsed.hd?.colorId || 1, 'FFCC99');
    const hairHex = resolveColorHex(figure, 'hr', parsed.hr?.colorId || 42, '784215');
    const shirtHex = resolveColorHex(figure, 'ch', parsed.ch?.colorId || 82, '3D85C6');
    const legHex = resolveColorHex(figure, 'lg', parsed.lg?.colorId || 110, '2F4F6F');
    const shoeHex = resolveColorHex(figure, 'sh', parsed.sh?.colorId || 62, '4A4A4A');

    const hrId = pickPartId(parsed.hr?.id, isFemale ? FEMALE_HAIR_POOL : MALE_HAIR_POOL, partsMeta.hr);
    const chId = pickPartId(parsed.ch?.id, isFemale ? FEMALE_SHIRT_POOL : MALE_SHIRT_POOL, partsMeta.ch);
    const lgId = pickPartId(parsed.lg?.id, isFemale ? FEMALE_LEG_POOL : MALE_LEG_POOL, partsMeta.lg);
    const shId = pickPartId(parsed.sh?.id, SHOE_POOL, partsMeta.sh);
    const sleeveId = pickPartId(parsed.ch?.id, SLEEVE_POOL, partsMeta.ls);
    const eyId = isFemale ? '002' : '001';
    const hdId = '002';

    const rawBodyDir = normalizeDir(opts.direction ?? 2);
    const rawHeadDir = normalizeDir(opts.headDirection ?? rawBodyDir);
    const frame = Math.max(0, Math.floor(opts.frame ?? 0));
    const walkFrame = posture === 'wlk' ? (frame % 4) : 0;
    const walkBounceY = (posture === 'wlk' && (walkFrame === 1 || walkFrame === 3)) ? -1 : 0;

    // For sit, Habbo v9 supports dirs 0, 2, 4, 6; snap odd dirs to closest even dir
    const effectiveBodyDir = posture === 'sit'
        ? (rawBodyDir % 2 === 0 ? rawBodyDir : normalizeDir(rawBodyDir - 1))
        : (isLay ? (rawBodyDir >= 4 ? 4 : 2) : rawBodyDir);

    const bodyMap = mirrorDir(effectiveBodyDir);
    const headMap = mirrorDir(isLay ? effectiveBodyDir : rawHeadDir);

    // Calibrated foot anchor matching Nitro's 64x110 canvas (feet at y ≈ 101, centered at x = 32)
    const ox = isLay ? 55 : 0;
    const oy = isLay ? 46 : 95;

    const drawPart = (
        spriteName: string | null,
        hex: string | null,
        flipped: boolean,
        extraY = 0
    ) =>
    {
        if(!spriteName || !atlasData) return;
        const meta = atlasData.s[spriteName];
        if(!meta) return;
        const spriteCanvas = getTintedSprite(spriteName, hex);
        if(!spriteCanvas) return;

        const [ , , sw, sh, regX, regY ] = meta;
        const drawX = ox - regX;
        const drawY = oy - regY + extraY;

        ctx.save();
        if(isSmall) ctx.scale(0.5, 0.5);
        if(flipped)
        {
            ctx.translate(baseW, 0);
            ctx.scale(-1, 1);
        }
        ctx.drawImage(spriteCanvas, drawX, drawY, sw, sh);
        ctx.restore();
    };

    const drawHead = (extraY: number) =>
    {
        const hdAction = isLay ? 'lay' : (opts.talk && (frame % 2 === 1) ? 'spk' : 'std');
        let eyAction = isLay ? 'lay' : 'std';
        let fcAction = isLay ? 'lay' : (opts.talk && (frame % 2 === 1) ? 'spk' : 'std');

        if(opts.blink) eyAction = isLay ? 'ley' : 'eyb';
        else if(opts.gesture === 'sml') { eyAction = isLay ? 'lsm' : 'sml'; fcAction = 'sml'; }
        else if(opts.gesture === 'sad') { eyAction = isLay ? 'lsa' : 'sad'; fcAction = 'sad'; }
        else if(opts.gesture === 'agr') { eyAction = isLay ? 'lag' : 'agr'; fcAction = 'agr'; }
        else if(opts.gesture === 'srp') { eyAction = isLay ? 'lsr' : 'srp'; fcAction = 'srp'; }

        const headShowingFace = headMap.d === 1 || headMap.d === 2 || headMap.d === 3;
        const hdName = lookupSprite(hdAction, 'hd', hdId, headMap.d, 0);
        const fcName = headShowingFace ? lookupSprite(fcAction, 'fc', '001', headMap.d, 0) : null;
        const eyName = headShowingFace ? lookupSprite(eyAction, 'ey', eyId, headMap.d, 0) : null;
        const hrName = parsed.hr ? lookupSprite(hdAction, 'hr', hrId, headMap.d, 0) : null;

        drawPart(hdName, skinHex, headMap.flipped, extraY);
        drawPart(fcName, skinHex, headMap.flipped, extraY);
        drawPart(eyName, null, headMap.flipped, extraY);
        drawPart(hrName, hairHex, headMap.flipped, extraY);
    };

    if(opts.headOnly)
    {
        drawHead(0);
        return true;
    }

    const bodyAct = posture;
    const isBackFacing = bodyMap.d === 0 || bodyMap.d === 7;
    const leftArmAct = opts.wave ? 'wav' : bodyAct;
    const leftArmFrame = opts.wave ? (frame % 2) : walkFrame;

    // 1. Back arm (left hand + left sleeve)
    if(opts.wave && atlasData.s[`h_wav_lh_001_${ rawBodyDir }_${ leftArmFrame }`])
    {
        drawPart(`h_wav_lh_001_${ rawBodyDir }_${ leftArmFrame }`, skinHex, false, walkBounceY);
        drawPart(lookupSprite('wav', 'ls', sleeveId, rawBodyDir, leftArmFrame), shirtHex, false, walkBounceY);
    }
    else
    {
        drawPart(lookupSprite(leftArmAct, 'lh', '001', bodyMap.d, leftArmFrame), skinHex, bodyMap.flipped, 0);
        drawPart(lookupSprite(leftArmAct, 'ls', sleeveId, bodyMap.d, leftArmFrame), shirtHex, bodyMap.flipped, 0);
    }

    // If facing away, draw right arm behind torso too
    if(isBackFacing)
    {
        drawPart(lookupSprite(bodyAct, 'rh', '001', bodyMap.d, walkFrame), skinHex, bodyMap.flipped, 0);
        drawPart(lookupSprite(bodyAct, 'rs', sleeveId, bodyMap.d, walkFrame), shirtHex, bodyMap.flipped, 0);
    }

    // 2. Body, shoes, legs, shirt
    drawPart(lookupSprite(bodyAct, 'bd', '001', bodyMap.d, walkFrame), skinHex, bodyMap.flipped, 0);
    if(parsed.sh) drawPart(lookupSprite(bodyAct, 'sh', shId, bodyMap.d, walkFrame), shoeHex, bodyMap.flipped, 0);
    if(parsed.lg) drawPart(lookupSprite(bodyAct, 'lg', lgId, bodyMap.d, walkFrame), legHex, bodyMap.flipped, 0);
    if(parsed.ch) drawPart(lookupSprite(isLay ? 'lay' : 'std', 'ch', chId, bodyMap.d, 0), shirtHex, bodyMap.flipped, walkBounceY);

    // 3. Head + face + eyes + hair
    drawHead(walkBounceY);

    // 4. Front arm (right hand + right sleeve)
    if(!isBackFacing)
    {
        drawPart(lookupSprite(bodyAct, 'rh', '001', bodyMap.d, walkFrame), skinHex, bodyMap.flipped, 0);
        drawPart(lookupSprite(bodyAct, 'rs', sleeveId, bodyMap.d, walkFrame), shirtHex, bodyMap.flipped, 0);
    }

    return true;
}

export function renderShockwaveV9DataUrl(figure: string, opts: V9RenderOptions = {}): string | null
{
    if(!isShockwaveV9AtlasReady()) return null;
    const c = document.createElement('canvas');
    if(!renderShockwaveV9ToCanvas(c, figure, opts)) return null;
    return c.toDataURL('image/png');
}

/**
 * Installs a transparent wrapper on AvatarRenderManager.createAvatarImage so that
 * whenever the user is in the Shockwave 2006 desktop era, ALL room avatars and UI
 * avatars render with the authentic 2005/2006 Habbo v9 sprites while keeping
 * Flash 2012, Modern, and Mobile hotel UI completely untouched.
 */
export function installShockwaveV9AvatarPatch(): void
{
    if(patchInstalled) return;
    const mgr = GetAvatarRenderManager();
    if(!mgr || typeof mgr.createAvatarImage !== 'function') return;

    patchInstalled = true;

    if(isShockwave2006Desktop()) preloadShockwaveV9Atlas();

    const origCreate = mgr.createAvatarImage.bind(mgr);

    mgr.createAvatarImage = function(figure: string, size: string, gender: string, listener: any = null, effectListener: any = null): IAvatarImage
    {
        const avatarImg: IAvatarImage = origCreate(figure, size, gender, listener, effectListener);
        if(!avatarImg) return avatarImg;

        const state = {
            bodyDir: 2,
            headDir: 2,
            posture: 'std' as 'std' | 'wlk' | 'sit' | 'lay',
            gesture: null as string | null,
            talk: false,
            wave: false,
            blink: false,
            frame: 0,
            dirty: true,
            lastEpoch: -1,
            lastKey: ''
        };

        let v9Canvas: HTMLCanvasElement | null = null;
        let v9BaseTex: NitroBaseTexture | null = null;
        let v9Sprite: NitroSprite | null = null;
        let v9RenderTex: NitroRenderTexture | null = null;
        let lastReturnedWasV9 = false;

        const origSetDirection = avatarImg.setDirection.bind(avatarImg);
        const origSetDirectionAngle = avatarImg.setDirectionAngle.bind(avatarImg);
        const origInitActions = avatarImg.initActionAppends.bind(avatarImg);
        const origAppendAction = avatarImg.appendAction.bind(avatarImg);
        const origEndActions = avatarImg.endActionAppends.bind(avatarImg);
        const origUpdateFrames = avatarImg.updateAnimationByFrames.bind(avatarImg);
        const origResetFrames = avatarImg.resetAnimationFrameCounter.bind(avatarImg);
        const origGetImage = avatarImg.getImage.bind(avatarImg);
        const origGetCroppedImage = avatarImg.getCroppedImage.bind(avatarImg);
        const origDispose = avatarImg.dispose.bind(avatarImg);

        avatarImg.setDirection = (setType: string, dir: number) =>
        {
            origSetDirection(setType, dir);
            const n = normalizeDir(dir);
            if(setType === AvatarSetType.FULL || setType === AvatarSetType.BODY)
            {
                state.bodyDir = n;
                if(setType === AvatarSetType.FULL) state.headDir = n;
            }
            if(setType === AvatarSetType.HEAD) state.headDir = n;
            state.dirty = true;
        };

        avatarImg.setDirectionAngle = (setType: string, angle: number) =>
        {
            origSetDirectionAngle(setType, angle);
            const n = normalizeDir(Math.floor(angle / 45));
            if(setType === AvatarSetType.FULL || setType === AvatarSetType.BODY)
            {
                state.bodyDir = n;
                if(setType === AvatarSetType.FULL) state.headDir = n;
            }
            if(setType === AvatarSetType.HEAD) state.headDir = n;
            state.dirty = true;
        };

        avatarImg.initActionAppends = () =>
        {
            origInitActions();
            state.posture = 'std';
            state.gesture = null;
            state.talk = false;
            state.wave = false;
            state.blink = false;
            state.dirty = true;
        };

        avatarImg.appendAction = (actionType: string, ...args: any[]) =>
        {
            const res = origAppendAction(actionType, ...args);
            const param = args && args.length > 0 ? String(args[0]) : '';

            if(actionType === AvatarAction.POSTURE)
            {
                if(param === AvatarAction.POSTURE_WALK || param === 'mv') state.posture = 'wlk';
                else if(param === AvatarAction.POSTURE_SIT) state.posture = 'sit';
                else if(param === AvatarAction.POSTURE_LAY) state.posture = 'lay';
                else state.posture = 'std';
            }
            else if(actionType === AvatarAction.MOVE || actionType === 'mv')
            {
                state.posture = 'wlk';
            }
            else if(actionType === AvatarAction.GESTURE)
            {
                state.gesture = param || null;
            }
            else if(actionType === AvatarAction.TALK)
            {
                state.talk = true;
            }
            else if(actionType === AvatarAction.EXPRESSION_WAVE)
            {
                state.wave = true;
            }
            else if(actionType === AvatarAction.SLEEP)
            {
                state.blink = true;
            }

            state.dirty = true;
            return res;
        };

        avatarImg.endActionAppends = () =>
        {
            origEndActions();
            state.dirty = true;
        };

        avatarImg.updateAnimationByFrames = (frames = 1) =>
        {
            origUpdateFrames(frames);
            state.frame += frames;
            state.dirty = true;
        };

        avatarImg.resetAnimationFrameCounter = () =>
        {
            origResetFrames();
            state.frame = 0;
            state.dirty = true;
        };

        avatarImg.getImage = (setType: string, highlight: boolean, scale = 1, cache = true) =>
        {
            if(!isShockwave2006Desktop())
            {
                if(lastReturnedWasV9)
                {
                    lastReturnedWasV9 = false;
                    (avatarImg as any)._changes = true;
                }
                return origGetImage(setType, highlight, scale, cache);
            }

            if(!isShockwaveV9AtlasReady())
            {
                preloadShockwaveV9Atlas();
                return origGetImage(setType, highlight, scale, cache);
            }

            const isSmall = size === AvatarScaleType.SMALL;
            const headOnly = setType === AvatarSetType.HEAD;
            const renderKey = `${ setType }|${ state.bodyDir }|${ state.headDir }|${ state.posture }|${ state.gesture || '' }|${ state.talk ? 1 : 0 }|${ state.wave ? 1 : 0 }|${ state.blink ? 1 : 0 }|${ state.frame % 4 }|${ v9EraEpoch }`;

            if(!state.dirty && lastReturnedWasV9 && v9RenderTex && state.lastKey === renderKey && state.lastEpoch === v9EraEpoch)
            {
                return v9RenderTex;
            }

            if(!v9Canvas) v9Canvas = document.createElement('canvas');

            const ok = renderShockwaveV9ToCanvas(v9Canvas, figure, {
                direction: state.bodyDir,
                headDirection: state.headDir,
                posture: state.posture,
                gesture: state.gesture,
                talk: state.talk,
                wave: state.wave,
                blink: state.blink,
                frame: state.frame,
                headOnly,
                gender,
                small: isSmall
            });

            if(!ok) return origGetImage(setType, highlight, scale, cache);

            const rw = v9Canvas.width;
            const rh = v9Canvas.height;

            if(!v9RenderTex || v9RenderTex.width !== rw || v9RenderTex.height !== rh)
            {
                if(v9RenderTex) v9RenderTex.destroy(true);
                v9RenderTex = NitroRenderTexture.create({ width: rw, height: rh });
            }

            if(!v9BaseTex)
            {
                v9BaseTex = NitroBaseTexture.from(v9Canvas, { scaleMode: 0 });
                v9Sprite = new NitroSprite(new NitroTexture(v9BaseTex));
            }
            else
            {
                v9BaseTex.setRealSize(rw, rh, 1);
                v9BaseTex.update();
            }

            const renderer = PixiApplicationProxy.instance?.renderer;
            if(renderer && v9Sprite && v9RenderTex)
            {
                renderer.render(v9Sprite, { renderTexture: v9RenderTex, clear: true });
                if((v9RenderTex.baseTexture as any)) (v9RenderTex.baseTexture as any).hitMap = null;
                state.dirty = false;
                state.lastEpoch = v9EraEpoch;
                state.lastKey = renderKey;
                lastReturnedWasV9 = true;
                return v9RenderTex;
            }

            return origGetImage(setType, highlight, scale, cache);
        };

        avatarImg.getCroppedImage = (setType: string, scale = 1) =>
        {
            if(!isShockwave2006Desktop() || !isShockwaveV9AtlasReady())
            {
                if(isShockwave2006Desktop()) preloadShockwaveV9Atlas();
                return origGetCroppedImage(setType, scale);
            }

            const url = renderShockwaveV9DataUrl(figure, {
                direction: state.bodyDir,
                headDirection: state.headDir,
                posture: state.posture,
                gesture: state.gesture,
                talk: state.talk,
                wave: state.wave,
                blink: state.blink,
                frame: state.frame,
                headOnly: setType === AvatarSetType.HEAD,
                gender,
                small: size === AvatarScaleType.SMALL
            });

            if(!url) return origGetCroppedImage(setType, scale);

            const img = new Image();
            img.src = url;
            return img;
        };

        avatarImg.dispose = () =>
        {
            if(v9Sprite) { v9Sprite.destroy({ children: false, texture: true, baseTexture: false }); v9Sprite = null; }
            if(v9BaseTex) { v9BaseTex.destroy(); v9BaseTex = null; }
            if(v9RenderTex) { v9RenderTex.destroy(true); v9RenderTex = null; }
            v9Canvas = null;
            origDispose();
        };

        return avatarImg;
    };
}
