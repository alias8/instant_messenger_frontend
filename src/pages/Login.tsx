import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BACKEND_PORT_DEFAULT, GUEST_MODE, ROLE } from '../config.ts'
import { useAuth } from '../context/AuthContext.tsx'
import { apiFetch } from '../services/api.ts'
import { getFeatureFlag } from '../services/featureFlagService.ts'
import { loginAsGuest } from '../services/userService.ts'

export function Login() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [provisioning, setProvisioning] = useState(GUEST_MODE)
    const navigate = useNavigate()
    const { login, userId, isLoading } = useAuth()
    // Guards against this effect acting twice — both from React StrictMode's
    // dev-mode double-invoke (which would otherwise fire POST /users/guest
    // twice per tab and race two separate pairings against each other, the
    // same class of bug as the WebSocket double-connect race fixed earlier in
    // ConnectionManager) and from its own re-run once login() flips `userId`
    // from null to set (which would otherwise re-enter the `if (userId)`
    // branch and overwrite the just-computed `/chat?conversationId=...`
    // navigation with a bare `/chat`).
    const hasActedRef = useRef(false)

    // Guest demo mode: skip the password form entirely. AuthContext already
    // resolves a returning guest's identity from localStorage synchronously
    // on mount (see AuthContext.tsx), so `userId` here is either already set
    // (just navigate) or genuinely absent (provision a fresh guest).
    useEffect(() => {
        if (!GUEST_MODE || isLoading || hasActedRef.current) return
        if (userId) {
            hasActedRef.current = true
            navigate('/chat')
            return
        }
        hasActedRef.current = true
        loginAsGuest(ROLE)
            .then((data) => {
                login(data.id, data.username)
                navigate(data.conversationId ? `/chat?conversationId=${data.conversationId}` : '/chat')
            })
            .catch(() => {
                hasActedRef.current = false
                setError('Could not start a demo session. Please refresh.')
            })
            .finally(() => setProvisioning(false))
    }, [userId, isLoading, login, navigate])

    useEffect(() => {
        if (GUEST_MODE) return
        if (username === '' && password === '') {
            if (BACKEND_PORT_DEFAULT === '3000') {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setUsername('user1')
                setPassword('password1')
            } else if (BACKEND_PORT_DEFAULT === '3001') {
                setUsername('user2')
                setPassword('password2')
            }
        }
    }, [password, username])

    async function handleLogin() {
        setError('')
        const res = await apiFetch('/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        })
        if (!res.ok) {
            const data = await res.json()
            setError(data.error ?? 'Login failed')
            return
        }
        const data = await res.json()
        login(data.id, data.username)
        navigate('/chat')
    }

    async function handleRegister() {
        setError('')
        const res = await apiFetch('/users/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        })
        if (!res.ok) {
            const data = await res.json()
            setError(data.error ?? 'Registration failed')
            return
        }
        await handleLogin()
    }

    if (GUEST_MODE) {
        return (
            <div>
                <h2>Instant Messenger</h2>
                {provisioning ? <p>Connecting you to a live chat…</p> : null}
                {error && <p>{error}</p>}
            </div>
        )
    }

    const FF1 = getFeatureFlag('feature1')

    return (
        <div>
            <h2>Instant Messenger</h2>
            {FF1 ?? <div>Feature flag on</div>}
            <input
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
            />
            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            <button onClick={handleLogin}>Login</button>
            <button onClick={handleRegister}>Register</button>
            {error && <p>{error}</p>}
        </div>
    )
}
