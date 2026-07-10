import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
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

export function AuthProvider({ children }: { children: ReactNode }) {
    const [auth, setAuth] = useState<AuthState>({ userId: null, username: null })
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
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
    }, [])

    function login(userId: string, username: string) {
        setCurrentUserId(userId)
        clearEvalCache()
        setAuth({ userId, username })
    }

    async function logout() {
        await apiFetch('/users/logout', { method: 'POST' })
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
