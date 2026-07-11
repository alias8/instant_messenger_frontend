import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { GUEST_MODE } from '../config.ts'
import { apiFetch } from '../services/api.ts'
import { clearEvalCache, setCurrentUserId } from '../services/featureFlagService.ts'

interface AuthState {
    userId: string | null
    username: string | null
}

interface AuthContextValue extends AuthState {
    isLoading: boolean
    login: (userId: string, username: string) => void
    logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const GUEST_STORAGE_KEY = 'guestIdentity'

function readStoredGuestIdentity(): AuthState {
    try {
        const stored = localStorage.getItem(GUEST_STORAGE_KEY)
        if (!stored) return { userId: null, username: null }
        const { id, username } = JSON.parse(stored) as { id: string; username: string }
        return { userId: id, username }
    } catch {
        return { userId: null, username: null }
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    // In guest mode, identity is read from localStorage synchronously so it's
    // available on first render regardless of which route the app happens to
    // mount on (e.g. reloading directly on /chat, not just /) — mirroring how
    // the cookie-based /users/me rehydration below is route-independent too,
    // since AuthProvider wraps the whole router and mounts exactly once.
    const [auth, setAuth] = useState<AuthState>(() =>
        GUEST_MODE ? readStoredGuestIdentity() : { userId: null, username: null },
    )
    const [isLoading, setIsLoading] = useState(!GUEST_MODE)

    useEffect(() => {
        if (auth.userId) setCurrentUserId(auth.userId)
        // Guest mode never uses the session cookie for identity. The cookie is
        // scoped to the single shared backend host, not to whichever frontend
        // origin is asking, so two different guest-mode deployments sharing
        // one backend would otherwise read back whichever guest's cookie last
        // won in this browser's cookie jar — localStorage is scoped per
        // frontend origin instead, which is what we actually want here.
        if (GUEST_MODE) return
        apiFetch('/users/me')
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data) {
                    setCurrentUserId(data.id)
                    setAuth({ userId: data.id, username: data.username })
                }
            })
            .catch(() => {})
            .finally(() => setIsLoading(false))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    function login(userId: string, username: string) {
        setCurrentUserId(userId)
        clearEvalCache()
        setAuth({ userId, username })
        if (GUEST_MODE) {
            localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify({ id: userId, username }))
        }
    }

    async function logout() {
        if (GUEST_MODE) {
            localStorage.removeItem(GUEST_STORAGE_KEY)
        } else {
            await apiFetch('/users/logout', { method: 'POST' })
        }
        setCurrentUserId(null)
        clearEvalCache()
        setAuth({ userId: null, username: null })
    }

    return (
        <AuthContext.Provider value={{ ...auth, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}
