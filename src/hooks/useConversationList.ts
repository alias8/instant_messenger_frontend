import { useCallback, useEffect, useState } from 'react'
import {
    getConversations,
    type Conversation,
} from '../services/conversationService.ts'

export function useConversationList(userId: string | null) {
    const [conversations, setConversations] = useState<Conversation[]>([])

    const fetchConversations = useCallback(() => {
        if (!userId) return
        getConversations(userId).then(setConversations).catch(() => {})
    }, [userId])

    useEffect(() => {
        fetchConversations()
    }, [fetchConversations])

    return { conversations, fetchConversations }
}
