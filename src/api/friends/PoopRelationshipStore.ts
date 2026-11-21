export interface PoopRelationshipSummary
{
    friendCount: number;
    randomFriendId: number;
    randomFriendName: string;
    randomFriendFigure: string;
}

const listeners = new Set<() => void>();
let ownPoopFriendIds = new Set<number>();
let ownLoaded = false;
let ownInFlight: Promise<Set<number>> | null = null;

function notifyListeners()
{
    listeners.forEach(cb =>
    {
        try { cb(); } catch {}
    });
}

export function subscribePoopRelationships(cb: () => void): () => void
{
    listeners.add(cb);
    return () => listeners.delete(cb);
}

export function isPoopFriend(friendId: number): boolean
{
    return ownPoopFriendIds.has(friendId);
}

export function getOwnPoopFriendIds(): Set<number>
{
    return new Set(ownPoopFriendIds);
}

export async function fetchOwnPoopFriendIds(force = false): Promise<Set<number>>
{
    if(ownLoaded && !force) return ownPoopFriendIds;
    if(ownInFlight && !force) return ownInFlight;

    ownInFlight = fetch('/api/client/relationships/me', { credentials: 'include' })
        .then(r => r.json())
        .then(data =>
        {
            if(data && data.success && Array.isArray(data.poopFriendIds))
            {
                ownPoopFriendIds = new Set(data.poopFriendIds.map((id: any) => Number(id)));
                ownLoaded = true;
                notifyListeners();
            }
            return ownPoopFriendIds;
        })
        .catch(() => ownPoopFriendIds)
        .finally(() => { ownInFlight = null; });

    return ownInFlight;
}

export async function setPoopRelationship(friendId: number, isPoop: boolean, delayMs = 0): Promise<void>
{
    if(isPoop) ownPoopFriendIds.add(friendId);
    else ownPoopFriendIds.delete(friendId);
    notifyListeners();

    if(delayMs > 0)
    {
        await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    try
    {
        await fetch('/api/client/relationships', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ friendId, relation: isPoop ? 4 : 0 })
        });
        notifyListeners();
    }
    catch
    {
        // Keep optimistic UI state
    }
}

export async function fetchUserPoopSummary(userId: number): Promise<PoopRelationshipSummary | null>
{
    if(!userId || userId <= 0) return null;
    try
    {
        const res = await fetch(`/api/client/relationships/${ userId }`, { credentials: 'include' });
        const data = await res.json();
        if(data && data.success && data.poop)
        {
            return data.poop as PoopRelationshipSummary;
        }
    }
    catch
    {
        // Ignore
    }
    return null;
}
