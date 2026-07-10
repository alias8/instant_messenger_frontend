import { BACKEND_PORT_DEFAULT } from '../config.ts'
import type { User } from '../types/chat.ts'

const BASE = `http://localhost:${BACKEND_PORT_DEFAULT}`

export async function getUserById(id: string): Promise<User> {
    const res = await fetch(`${BASE}/users/${id}`)
    const data = await res.json()
    return data.user as User
}

export async function searchUsers(username: string): Promise<User[]> {
    const res = await fetch(
        `${BASE}/users?username=${encodeURIComponent(username)}`,
    )
    const data = await res.json()
    return data.users as User[]
}

export async function loginAsGuest(
    role: string,
): Promise<{ id: string; username: string; conversationId: string | null }> {
    const res = await fetch(`${BASE}/users/guest?role=${role}`, { method: 'POST' })
    if (!res.ok) throw new Error('Failed to create guest session')
    return res.json()
}
