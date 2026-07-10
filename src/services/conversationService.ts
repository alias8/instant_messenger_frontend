import { apiFetch } from './api.ts'
import type { MessageFromBackend, User } from '../types/chat.ts'

export interface Conversation {
    id: string
    participants: User[]
}

export async function getConversations(userId: string): Promise<Conversation[]> {
    const res = await apiFetch(`/conversations?userId=${userId}`)
    const data = await res.json()
    return data.conversations ?? []
}

export async function getMessages(
    conversationId: string,
    userId: string,
): Promise<MessageFromBackend[]> {
    const res = await apiFetch(
        `/conversations/${conversationId}/messages?userId=${userId}`,
    )
    const data = await res.json()
    return (data.messages as MessageFromBackend[]).map((m) => ({
        ...m,
        seq: BigInt(m.seq),
    }))
}

export async function createConversation(
    userIds: string[],
): Promise<{ ok: true; conversationId: string } | { ok: false; error: string }> {
    const res = await apiFetch('/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds }),
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, error: data.error ?? 'Failed to create conversation' }
    return { ok: true, conversationId: data.conversationId }
}
