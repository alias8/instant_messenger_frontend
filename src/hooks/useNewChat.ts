import { useEffect, useState } from 'react'
import { createConversation } from '../services/conversationService.ts'
import { searchUsers } from '../services/userService.ts'
import type { User } from '../types/chat.ts'

interface UseNewChatOptions {
    userId: string | null
    onConversationCreated: (conversationId: string, participants: User[]) => void
    onConversationsChanged: () => void
}

export function useNewChat({
    userId,
    onConversationCreated,
    onConversationsChanged,
}: UseNewChatOptions) {
    const [showNewChat, setShowNewChat] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<User[]>([])
    const [searchError, setSearchError] = useState<string | null>(null)
    const [creatingConvo, setCreatingConvo] = useState(false)
    const [selectedUsers, setSelectedUsers] = useState<User[]>([])

    useEffect(() => {
        setSearchError(null)
        if (!searchQuery.trim()) {
            setSearchResults([])
            return
        }
        const timer = setTimeout(async () => {
            try {
                const users = await searchUsers(searchQuery)
                setSearchResults(
                    users.filter(
                        (u) =>
                            u.id !== userId &&
                            !selectedUsers.some((s) => s.id === u.id),
                    ),
                )
            } catch {
                setSearchError('Failed to search users')
            }
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery, userId, selectedUsers])

    function toggleSelectUser(user: User) {
        setSelectedUsers((prev) =>
            prev.some((u) => u.id === user.id)
                ? prev.filter((u) => u.id !== user.id)
                : [...prev, user],
        )
        setSearchQuery('')
    }

    function openNewChat() {
        setShowNewChat(true)
        setSelectedUsers([])
        setSearchQuery('')
    }

    function closeNewChat() {
        setShowNewChat(false)
        setSelectedUsers([])
        setSearchQuery('')
    }

    async function startConversation() {
        if (!userId || selectedUsers.length === 0) return
        setCreatingConvo(true)
        setSearchError(null)
        try {
            const result = await createConversation([
                userId,
                ...selectedUsers.map((u) => u.id),
            ])
            if (!result.ok) {
                setSearchError(result.error)
                return
            }
            onConversationCreated(result.conversationId, selectedUsers)
            closeNewChat()
            onConversationsChanged()
        } catch {
            setSearchError('Failed to create conversation')
        } finally {
            setCreatingConvo(false)
        }
    }

    return {
        showNewChat,
        openNewChat,
        closeNewChat,
        searchQuery,
        setSearchQuery,
        searchResults,
        searchError,
        creatingConvo,
        selectedUsers,
        toggleSelectUser,
        startConversation,
    }
}
