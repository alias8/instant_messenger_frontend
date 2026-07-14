import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChatBody } from '../components/ChatBody.tsx'
import { ChatHeader } from '../components/ChatHeader.tsx'
import { GuestInfoPanel } from '../components/GuestInfoPanel.tsx'
import { MessageInput } from '../components/MessageInput.tsx'
import { NewChatPanel } from '../components/NewChatPanel.tsx'
import { GUEST_MODE } from '../config.ts'
import { useAuth } from '../context/AuthContext.tsx'
import { useConversationList } from '../hooks/useConversationList.ts'
import { useMessageSender } from '../hooks/useMessageSender.ts'
import { useNewChat } from '../hooks/useNewChat.ts'
import { useWebSocket } from '../hooks/useWebSocket.ts'
import { getMessages } from '../services/conversationService.ts'
import { searchUsers } from '../services/userService.ts'
import type { MessageFromBackend, User } from '../types/chat.ts'
import { guestParticipantLabel } from '../utils/guestLabel.ts'

export function Chat() {
    const { userId, username, isLoading } = useAuth()
    const navigate = useNavigate()

    // Landed directly on /chat with no identity (e.g. a bookmark, or
    // localStorage cleared) — bounce through Login, which provisions a guest
    // (or shows the real login form) and navigates back here.
    useEffect(() => {
        if (!isLoading && !userId) navigate('/')
    }, [isLoading, userId, navigate])

    // Seeded once from ?conversationId=... (set by the guest-demo flow when a
    // guest gets paired immediately on login) so a freshly-paired guest lands
    // straight in the chat instead of an empty conversation list.
    const [conversationId, setConversationId] = useState<string | null>(
        () => new URLSearchParams(window.location.search).get('conversationId'),
    )
    const [participants, setParticipants] = useState<User[]>([])
    const [messages, setMessages] = useState<MessageFromBackend[]>([])
    const [userCache, setUserCache] = useState<Record<string, string>>({})
    const bottomRef = useRef<HTMLDivElement>(null)

    const { conversations, fetchConversations } = useConversationList(userId)

    const socketRef = useWebSocket(
        userId,
        (msg) => {
            setMessages((prev) => [...prev, msg])
            setConversationId((prev) => prev ?? msg.conversation_id)
        },
        (user) =>
            setUserCache((c) => ({ ...c, [user.id]: guestParticipantLabel(user) })),
    )

    useEffect(() => {
        if (!conversationId || !userId) return
        getMessages(conversationId, userId).then(setMessages).catch(() => {})
    }, [conversationId, userId])

    // If we landed directly on a conversationId (guest-demo pairing) rather than
    // via ConversationList/NewChatPanel, participants isn't populated yet —
    // derive it once the conversation list loads.
    useEffect(() => {
        if (!conversationId || participants.length > 0) return
        const convo = conversations.find((c) => c.id === conversationId)
        if (!convo) return
        const others = convo.participants.filter((p) => p.id !== userId)
        setParticipants(others)
        setUserCache((c) => {
            const next = { ...c }
            others.forEach((u) => (next[u.id] = guestParticipantLabel(u)))
            return next
        })
    }, [conversationId, conversations, participants.length, userId])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Guest mode has no user search — "+New Chat" only ever offers these two
    // fixed contacts: whichever guest you were auto-paired with, and the
    // silent, non-replying "userC" demo account.
    const [userCContact, setUserCContact] = useState<User | null>(null)
    useEffect(() => {
        if (!GUEST_MODE) return
        searchUsers('userC')
            .then((users) => setUserCContact(users[0] ?? null))
            .catch(() => {})
    }, [])

    const guestPartner = useMemo(() => {
        if (!GUEST_MODE) return undefined
        for (const c of conversations) {
            const partner = c.participants.find((p) => p.is_guest && p.id !== userId)
            if (partner) return partner
        }
        return undefined
    }, [conversations, userId])

    const guestContacts = useMemo(
        () => [guestPartner, userCContact].filter((u): u is User => !!u),
        [guestPartner, userCContact],
    )

    const newChat = useNewChat({
        userId,
        guestContacts,
        onConversationCreated: (id, users) => {
            setConversationId(id)
            setParticipants(users)
            setUserCache((c) => {
                const next = { ...c }
                users.forEach((u) => (next[u.id] = guestParticipantLabel(u)))
                return next
            })
        },
        onConversationsChanged: fetchConversations,
    })

    const sender = useMessageSender(socketRef, conversationId, userId, setMessages)

    const isGroup = participants.length > 1

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                maxWidth: 600,
                margin: '0 auto',
            }}
        >
            {GUEST_MODE && <GuestInfoPanel />}
            <ChatHeader
                username={username}
                participants={participants}
                showNewChat={newChat.showNewChat}
                onBack={() => {
                    setParticipants([])
                    setConversationId(null)
                    setMessages([])
                    fetchConversations()
                }}
                onToggleNewChat={() =>
                    newChat.showNewChat ? newChat.closeNewChat() : newChat.openNewChat()
                }
            />

            {newChat.showNewChat && (
                <NewChatPanel
                    selectedUsers={newChat.selectedUsers}
                    searchQuery={newChat.searchQuery}
                    searchResults={newChat.searchResults}
                    searchError={newChat.searchError}
                    creatingConvo={newChat.creatingConvo}
                    onSearchChange={newChat.setSearchQuery}
                    onToggleUser={newChat.toggleSelectUser}
                    onStartConversation={newChat.startConversation}
                />
            )}

            <ChatBody
                conversationId={conversationId}
                conversations={conversations}
                userId={userId}
                messages={messages}
                userCache={userCache}
                isGroup={isGroup}
                bottomRef={bottomRef}
                onSelectConversation={(id, others) => {
                    setConversationId(id)
                    setParticipants(others)
                    setUserCache((c) => {
                        const next = { ...c }
                        others.forEach((u) => (next[u.id] = guestParticipantLabel(u)))
                        return next
                    })
                }}
            />

            <MessageInput
                input={sender.input}
                conversationId={conversationId}
                fileInputRef={sender.fileInputRef}
                onInputChange={sender.setInput}
                onKeyDown={sender.handleKeyDown}
                onSend={sender.sendTextMessage}
                onAttachClick={() => sender.fileInputRef.current?.click()}
                onFileSelect={sender.handleFileSelect}
            />
        </div>
    )
}
