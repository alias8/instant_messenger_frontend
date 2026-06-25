import { useEffect, useRef, useState } from 'react'
import { ChatBody } from '../components/ChatBody.tsx'
import { ChatHeader } from '../components/ChatHeader.tsx'
import { MessageInput } from '../components/MessageInput.tsx'
import { NewChatPanel } from '../components/NewChatPanel.tsx'
import { useAuth } from '../context/AuthContext.tsx'
import { useConversationList } from '../hooks/useConversationList.ts'
import { useMessageSender } from '../hooks/useMessageSender.ts'
import { useNewChat } from '../hooks/useNewChat.ts'
import { useWebSocket } from '../hooks/useWebSocket.ts'
import { getMessages } from '../services/conversationService.ts'
import type { MessageFromBackend, User } from '../types/chat.ts'

export function Chat() {
    const { userId, username } = useAuth()

    const [conversationId, setConversationId] = useState<string | null>(null)
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
        (id, name) => setUserCache((c) => ({ ...c, [id]: name })),
    )

    useEffect(() => {
        if (!conversationId || !userId) return
        getMessages(conversationId, userId).then(setMessages).catch(() => {})
    }, [conversationId, userId])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const newChat = useNewChat({
        userId,
        onConversationCreated: (id, users) => {
            setConversationId(id)
            setParticipants(users)
            setUserCache((c) => {
                const next = { ...c }
                users.forEach((u) => (next[u.id] = u.username))
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
            <ChatHeader
                username={username}
                participants={participants}
                showNewChat={newChat.showNewChat}
                onBack={() => {
                    setParticipants([])
                    setConversationId(null)
                    setMessages([])
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
                        others.forEach((u) => (next[u.id] = u.username))
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
