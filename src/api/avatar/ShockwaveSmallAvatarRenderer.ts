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

interface ParsedPart
{
    id: number;
    colorId: number;
}

const atlasData = v9SmallAtlasRaw as unknown as V9SmallAtlasData;
let atlasImage: HTMLImageElement | null = null;
let atlasLoading = false;
const readyCallbacks = new Set<() => void>();

// Verified (shirt chId, matching sleeve ls/rsId) pairs from hh_people_small_1.cct & hh_people_small_2.cct
// Guarantees 100% seamless shoulders with ZERO mismatched sleeves!
const MALE_TOP_PAIRS: Array<[ string, string ]> = [
    [ '001', '001' ], // classic long-sleeve sweater
    [ '003', '001' ], // classic collared jacket
    [ '005', '001' ], // classic zip/hoodie long-sleeve
    [ '008', '002' ], // classic striped short-sleeve tee
    [ '009', '002' ], // classic plain short-sleeve tee
    [ '010', '002' ], // classic v-neck short-sleeve tee
    [ '100', '001' ], // classic retro suit jacket
    [ '101', '001' ], // classic retro vest+shirt
    [ '200', '001' ], // classic HC long-sleeve
    [ '201', '002' ], // classic HC short-sleeve
];

const FEMALE_TOP_PAIRS: Array<[ string, string ]> = [
    [ '002', '001' ], // classic female long-sleeve top
    [ '004', '001' ], // classic female sweater
    [ '006', '001' ], // classic female jacket
    [ '008', '002' ], // classic striped short-sleeve tee
    [ '009', '002' ], // classic plain short-sleeve tee
    [ '015', '017' ], // classic female sleeveless tank
    [ '016', '017' ], // classic female halter/tank
    [ '501', '001' ], // classic HC female long-sleeve
    [ '502', '002' ], // classic HC female short-sleeve
];

const MALE_HAIR_POOL = [ '001', '002', '003', '005', '006', '007', '008', '009', '010', '011', '013', '014', '015', '016', '017', '018', '019', '020', '200', '201', '202', '203', '503', '504', '505', '506' ];
const FEMALE_HAIR_POOL = [ '004', '013', '014', '015', '021', '022', '023', '024', '025', '026', '457', '458', '501', '502', '507', '508', '509' ];
const MALE_LEG_POOL = [ '001', '002', '003', '004', '005', '200' ];
const FEMALE_LEG_POOL = [ '001', '002', '004', '006', '200', '201' ];
const SHOE_POOL = [ '001', '002', '003', '004' ];

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

export function isShockwaveSmallAtlasReady(): boolean
{
    return !!(atlasImage && atlasImage.complete && atlasImage.naturalWidth > 0);
}

export function preloadShockwaveSmallAtlas(): void
{
    if(isShockwaveSmallAtlasReady() || atlasLoading) return;
    atlasLoading = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () =>
    {
        atlasImage = img;
        atlasLoading = false;
        readyCallbacks.forEach(fn => { try { fn(); } catch {} });
        readyCallbacks.clear();
    };
    img.onerror = () => { atlasLoading = false; };
    img.src = v9SmallAtlasImgUrl;
}

export function onShockwaveSmallAtlasReady(cb: () => void): () => void
{
    if(isShockwaveSmallAtlasReady())
    {
        cb();
        return () => {};
    }
    readyCallbacks.add(cb);
    preloadShockwaveSmallAtlas();
    return () => { readyCallbacks.delete(cb); };
}

function parseFigure(figure: string): Record<string, ParsedPart>
{
    const out: Record<string, ParsedPart> = {};
    if(!figure) return out;
    for(const seg of figure.split('.'))
    {
        const p = seg.split('-');
        if(p.length < 2) continue;
        const id = parseInt(p[1], 10);
        const colorId = p.length >= 3 ? parseInt(p[2], 10) : 0;
        if(!isNaN(id)) out[p[0]] = { id, colorId: isNaN(colorId) ? 0 : colorId };
    }
    return out;
}

function detectIsFemale(parsed: Record<string, ParsedPart>, gender?: string | null): boolean
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

function lookupSmallSprite(action: string, partType: string, partId: string, dir: number, frame: number): string | null
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

function getTintedSmallSprite(name: string, hexColor: string | null): HTMLCanvasElement | null
{
    if(!atlasImage) return null;
    const meta = atlasData.s[name];
    if(!meta) return null;
    const [ sx, sy, sw, sh, , , isColored ] = meta;
    const effHex = (isColored || !hexColor) ? 'RAW' : hexColor.toUpperCase();
    const key = `${ name }|${ effHex }`;
    const cached = tintedCache.get(key);
    if(cached) return cached;

    const c = document.createElement('canvas');
    c.width = sw;
    c.height = sh;
    const ctx = c.getContext('2d');
    if(!ctx) return null;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(atlasImage, sx, sy, sw, sh, 0, 0, sw, sh);

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
            d[i] = (d[i] * tr) >> 8;
            d[i + 1] = (d[i + 1] * tg) >> 8;
            d[i + 2] = (d[i + 2] * tb) >> 8;
        }
        ctx.putImageData(imgData, 0, 0);
    }

    if(tintedCache.size > 1500)
    {
        const first = tintedCache.keys().next().value;
        if(first) tintedCache.delete(first);
    }
    tintedCache.set(key, c);
    return c;
}

export function renderShockwaveSmallDataUrl(figure: string, opts: V9SmallRenderOptions = {}): string | null
{
    if(!isShockwaveSmallAtlasReady()) return null;

    const posture = opts.posture || 'std';
    const canvasW = 44;
    const canvasH = 60;
    const ox = 6;
    const oy = 52;

    const c = document.createElement('canvas');
    c.width = canvasW;
    c.height = canvasH;
    const ctx = c.getContext('2d');
    if(!ctx) return null;
    ctx.imageSmoothingEnabled = false;

    const parsed = parseFigure(figure);
    const isFemale = detectIsFemale(parsed, opts.gender);

    const skinHex = resolveColorHex(figure, 'hd', parsed.hd?.colorId || 1, 'FFCC99');
    const hairHex = resolveColorHex(figure, 'hr', parsed.hr?.colorId || 42, '784215');
    const shirtHex = resolveColorHex(figure, 'ch', parsed.ch?.colorId || 82, '3D85C6');
    const legHex = resolveColorHex(figure, 'lg', parsed.lg?.colorId || 110, '2F4F6F');
    const shoeHex = resolveColorHex(figure, 'sh', parsed.sh?.colorId || 62, '4A4A4A');

    const topPool = isFemale ? FEMALE_TOP_PAIRS : MALE_TOP_PAIRS;
    const topIdx = Math.abs(parsed.ch?.id ?? 0) % topPool.length;
    const [ chId, sleeveId ] = topPool[topIdx];

    const hairPool = isFemale ? FEMALE_HAIR_POOL : MALE_HAIR_POOL;
    const hrId = hairPool[Math.abs(parsed.hr?.id ?? 0) % hairPool.length];
    const legPool = isFemale ? FEMALE_LEG_POOL : MALE_LEG_POOL;
    const lgId = legPool[Math.abs(parsed.lg?.id ?? 0) % legPool.length];
    const shId = SHOE_POOL[Math.abs(parsed.sh?.id ?? 0) % SHOE_POOL.length];

    const rawDir = normalizeDir(opts.direction ?? 2);
    const rawHeadDir = normalizeDir(opts.headDirection ?? rawDir);
    const effDir = posture === 'sit'
        ? (rawDir % 2 === 0 ? rawDir : normalizeDir(rawDir - 1))
        : rawDir;
    const bodyMap = mirrorDir(effDir);
    const headMap = mirrorDir(rawHeadDir);
    const frame = posture === 'wlk' ? (Math.floor(opts.frame ?? 0) % 4) : 0;

    const drawPart = (name: string | null, hex: string | null, flipped: boolean, extraY = 0) =>
    {
        if(!name) return;
        const meta = atlasData.s[name];
        if(!meta) return;
        const spCanvas = getTintedSmallSprite(name, hex);
        if(!spCanvas) return;
        const [ , , sw, sh, regX, regY ] = meta;
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

    const drawHead = (extraY = 0) =>
    {
        const showFace = headMap.d === 1 || headMap.d === 2 || headMap.d === 3;
        const hdAct = opts.panicFace ? 'spk' : 'std';
        drawPart(lookupSmallSprite(hdAct, 'hd', '002', headMap.d, 0), skinHex, headMap.flipped, extraY);
        if(showFace) drawPart(lookupSmallSprite(hdAct, 'fc', '001', headMap.d, opts.panicFace ? 1 : 0), skinHex, headMap.flipped, extraY);
        if(parsed.hr) drawPart(lookupSmallSprite(hdAct, 'hr', hrId, headMap.d, 0), hairHex, headMap.flipped, extraY);
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

    // 1. Back arm (left hand + matched sleeve only when wearing a shirt)
    drawPart(lookupSmallSprite(leftAct, 'lh', '001', bodyMap.d, leftFrm), skinHex, bodyMap.flipped, bounceY);
    if(parsed.ch) drawPart(lookupSmallSprite(leftAct, 'ls', sleeveId, bodyMap.d, leftFrm), shirtHex, bodyMap.flipped, bounceY);

    if(isBack)
    {
        drawPart(lookupSmallSprite(rightAct, 'rh', '001', bodyMap.d, rightFrm), skinHex, bodyMap.flipped, bounceY);
        if(parsed.ch) drawPart(lookupSmallSprite(rightAct, 'rs', sleeveId, bodyMap.d, rightFrm), shirtHex, bodyMap.flipped, bounceY);
    }

    // 2. Body, shoes, legs, shirt
    drawPart(lookupSmallSprite(posture, 'bd', '001', bodyMap.d, frame), skinHex, bodyMap.flipped);
    if(parsed.sh) drawPart(lookupSmallSprite(posture, 'sh', shId, bodyMap.d, frame), shoeHex, bodyMap.flipped);
    if(parsed.lg) drawPart(lookupSmallSprite(posture, 'lg', lgId, bodyMap.d, frame), legHex, bodyMap.flipped);
    if(parsed.ch) drawPart(lookupSmallSprite('std', 'ch', chId, bodyMap.d, 0), shirtHex, bodyMap.flipped, bounceY);

    // 3. Head + classic 1x2 dot-eye face + hair
    drawHead(bounceY);

    // 4. Front arm (right hand + matched sleeve only when wearing a shirt)
    if(!isBack)
    {
        drawPart(lookupSmallSprite(rightAct, 'rh', '001', bodyMap.d, rightFrm), skinHex, bodyMap.flipped, bounceY);
        if(parsed.ch) drawPart(lookupSmallSprite(rightAct, 'rs', sleeveId, bodyMap.d, rightFrm), shirtHex, bodyMap.flipped, bounceY);
    }

    return c.toDataURL('image/png');
}
