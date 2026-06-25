import { FF_API_KEY, FF_SERVICE_URL } from '../config.ts'
import { murmur3 } from '../utils/murmur3.ts'

interface FlagResponse {
    name: string
    enabled: boolean
    rolloutPercentage: number
    flagOverrides: Array<{ userId: string; override: boolean }>
}

type UserId = string

interface Flag {
    name: string
    enabled: boolean
    rolloutPercentage: number
    flagOverrides: Map<UserId, boolean>
}

const flagCache = new Map<string, Flag>()
const evalCache = new Map<string, boolean | null>()
let currentUserId: string | null = null

export function setCurrentUserId(id: string | null) {
    currentUserId = id
}

export function clearEvalCache() {
    evalCache.clear()
}

export async function fetchFlags(): Promise<void> {
    const res = await fetch(`${FF_SERVICE_URL}/flags`, {
        headers: { Authorization: `Bearer ${FF_API_KEY}` },
    })
    if (!res.ok) return
    const flags: FlagResponse[] = await res.json()
    evalCache.clear()
    flags.forEach((f) =>
        flagCache.set(f.name, {
            ...f,
            flagOverrides: new Map(f.flagOverrides.map((o) => [o.userId, o.override])),
        }),
    )
}

function getOrCreateAnonymousId(): string {
    const match = document.cookie.match(/(?:^|; )anonymousId=([^;]+)/)
    if (match) return decodeURIComponent(match[1])
    const id = crypto.randomUUID()
    const oneYear = 60 * 60 * 24 * 365
    document.cookie = `anonymousId=${id}; max-age=${oneYear}; path=/; SameSite=Lax`
    return id
}

export function getFeatureFlag(name: string): boolean | null {
    const uid = currentUserId ?? getOrCreateAnonymousId()
    const cacheKey = `${name}:${uid}`
    if (evalCache.has(cacheKey)) return evalCache.get(cacheKey)!

    const flag = flagCache.get(name)
    if (!flag) return null

    const override = flag.flagOverrides.get(uid)
    if (override !== undefined) {
        evalCache.set(cacheKey, override)
        return override
    }

    if (!flag.enabled) {
        evalCache.set(cacheKey, false)
        return false
    }

    if (flag.rolloutPercentage === 0) {
        evalCache.set(cacheKey, false)
        return false
    }

    const result = murmur3(`${name}:${uid}`) % 100 < flag.rolloutPercentage
    evalCache.set(cacheKey, result)
    return result
}
