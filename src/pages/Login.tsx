import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function Login() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const navigate = useNavigate()

    async function handleLogin() {
        setError('')
        const res = await fetch('/users/login', {
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
        localStorage.setItem('userId', data.id)
        localStorage.setItem('username', data.username)
        navigate('/chat')
    }

    async function handleRegister() {
        setError('')
        const res = await fetch('/users/register', {
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

    return (
        <div>
            <h2>Instant Messenger</h2>
            <input
                placeholder="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
            />
            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
            />
            <button onClick={handleLogin}>Login</button>
            <button onClick={handleRegister}>Register</button>
            {error && <p>{error}</p>}
        </div>
    )
}