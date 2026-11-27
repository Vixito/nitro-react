export interface RpCharacter
{
    user_id: number;
    hp: number;
    max_hp: number;
    energy: number;
    max_energy: number;
    hunger: number;
    armor: number;
    cash: number;
    bank: number;
    rp_xp: number;
    rp_level: number;
    xpForNextLevel: number;
    strength: number;
    stamina_stat: number;
    job_slug: string;
    job_rank: number;
    job_xp: number;
    on_duty: number;
    wanted_level: number;
    cuffed_by: number;
    jailed_until: number;
    jail_reason: string;
    jailSecondsLeft: number;
    hospitalized_until: number;
    hospitalSecondsLeft: number;
    gang_id: number;
    gang_rank: string;
    equipped_weapon: string;
    active_vehicle: string;
    current_location: string;
    kills: number;
    deaths: number;
    arrests: number;
    heals: number;
    robberies: number;
}

export interface RpJob
{
    id: number;
    slug: string;
    name: string;
    category: string;
    description: string;
    base_pay: number;
    max_rank: number;
    required_level: number;
    color: string;
    badge_icon: string;
    location_slug: string;
}

export interface RpItem
{
    id?: number;
    slug?: string;
    item_slug?: string;
    name: string;
    category: 'weapon' | 'armor' | 'food' | 'medical' | 'tool' | 'vehicle';
    description: string;
    price: number;
    quantity?: number;
    damage: number;
    heal_hp: number;
    restore_energy: number;
    restore_hunger: number;
    armor_value: number;
    speed_bonus: number;
    legal: number;
    min_level: number;
    shop_location?: string;
}

export interface RpLocation
{
    id: number;
    slug: string;
    name: string;
    district: string;
    room_id: number;
    category: string;
    is_safe_zone: number;
    map_x: number;
    map_y: number;
    description: string;
    icon: string;
    color: string;
    online_users: number;
}

export interface RpTurf
{
    id: number;
    slug: string;
    name: string;
    district: string;
    location_slug: string;
    owner_gang_id: number;
    owner_gang_name?: string;
    owner_gang_tag?: string;
    owner_gang_color?: string;
    income_per_cycle: number;
}

export interface RpProperty
{
    id: number;
    slug: string;
    name: string;
    district: string;
    room_id: number;
    owner_id: number;
    owner_name?: string;
    price: number;
    rent_daily: number;
    description: string;
}

export interface RpMission
{
    slug: string;
    title: string;
    description: string;
    target: number;
    progress: number;
    rewardCash: number;
    rewardXp: number;
    claimed: boolean;
    canClaim: boolean;
}

export interface RpGang
{
    id: number;
    name: string;
    tag: string;
    color: string;
    motto: string;
    leader_id: number;
    leader_name?: string;
    bank_balance: number;
    kills: number;
    member_count: number;
    turf_count?: number;
}

export interface RpEventItem
{
    id: number;
    event_type: string;
    actor_id?: number;
    target_id?: number;
    location_slug?: string;
    room_id?: number;
    message: string;
    created_at: number;
}

export interface RpFullState
{
    success: boolean;
    publicEnabled: boolean;
    user: { id: number; username: string; look: string; rank: number };
    character: RpCharacter;
    job: RpJob;
    jobs: RpJob[];
    gang: RpGang | null;
    inventory: RpItem[];
    catalog: RpItem[];
    locations: RpLocation[];
    turfs: RpTurf[];
    properties: RpProperty[];
    missions?: RpMission[];
    recentEvents: RpEventItem[];
    onDutyCounts: Record<string, number>;
    clock: { hour: number; minute: number; formatted: string; phase: 'dawn' | 'day' | 'sunset' | 'night'; label: string };
}

let cachedRpMode: boolean | null = null;

export function isRoleplayMode(): boolean
{
    if(cachedRpMode !== null) return cachedRpMode;
    try
    {
        const params = new URLSearchParams(window.location.search);
        cachedRpMode = params.get('mode') === 'rp';
    }
    catch
    {
        cachedRpMode = false;
    }
    return cachedRpMode;
}

export async function rpGetState(): Promise<RpFullState>
{
    const res = await fetch('/api/rp/state', { credentials: 'include' });
    return await res.json();
}

export async function rpGetGangs(): Promise<{ success: boolean; gangs: RpGang[] }>
{
    const res = await fetch('/api/rp/gangs', { credentials: 'include' });
    return await res.json();
}

export async function rpGetRankings(): Promise<any>
{
    const res = await fetch('/api/rp/rankings', { credentials: 'include' });
    return await res.json();
}

export async function rpGetNews(): Promise<{ success: boolean; articles: any[]; events: any[] }>
{
    const res = await fetch('/api/rp/news', { credentials: 'include' });
    return await res.json();
}

export async function rpSetPhoneHolding(holding: boolean): Promise<void>
{
    try
    {
        await fetch('/api/rp/phone/hold', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ holding })
        });
    }
    catch (_) {}
}

export function dispatchRpFeedback(detail: { ok: boolean; message: string; state?: RpFullState | null }): void
{
    window.dispatchEvent(new CustomEvent('habbten-rp-action-feedback', { detail }));
}

export async function rpPost(path: string, body: Record<string, any> = {}): Promise<any>
{
    const res = await fetch(`/api/rp${ path }`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    return await res.json();
}
