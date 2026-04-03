import { useEffect, useRef, useState } from 'react'
import { BACKEND_PORT_DEFAULT } from '../App.tsx'
import { ChatHeader } from '../components/ChatHeader.tsx'
import { ConversationList } from '../components/ConversationList.tsx'
import { MessageInput } from '../components/MessageInput.tsx'
import { MessageList } from '../components/MessageList.tsx'
import { NewChatPanel } from '../components/NewChatPanel.tsx'
import {
    MessageType,
    type MessageFromBackend,
    type MessageToSendBackend,
    type PresignedUrlResponse,
    type User,
} from '../types/chat.ts'

export function Chat() {
    const [userId] = useState(() => localStorage.getItem('userId'))
    const [username] = useState(() => localStorage.getItem('username'))
    const socketRef = useRef<WebSocket | null>(null)
    const [messages, setMessages] = useState<MessageFromBackend[]>([])
    const [input, setInput] = useState('')
    const bottomRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [conversationId, setConversationId] = useState<string | null>(null)
    const [participants, setParticipants] = useState<User[]>([])
    const [userCache, setUserCache] = useState<Record<string, string>>({})
    const [conversations, setConversations] = useState<
        { id: string; participants: User[] }[]
    >([])
    const [showNewChat, setShowNewChat] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<User[]>([])
    const [searchError, setSearchError] = useState<string | null>(null)
    const [creatingConvo, setCreatingConvo] = useState(false)
    const [selectedUsers, setSelectedUsers] = useState<User[]>([])

    useEffect(() => {
        if (!userId) return
        const ws = new WebSocket(
            `ws://localhost:${BACKEND_PORT_DEFAULT}?userId=${userId}`,
        )
        socketRef.current = ws

        ws.onmessage = (event) => {
            try {
                const parsed: MessageFromBackend = JSON.parse(event.data)
                setMessages((prev) => [...prev, { ...parsed }])
                setConversationId((prev) => prev ?? parsed.conversation_id)
                if (parsed.from_user_id !== userId) {
                    setUserCache((cache) => {
                        if (cache[parsed.from_user_id]) return cache
                        fetch(
                            `http://localhost:${BACKEND_PORT_DEFAULT}/users/${parsed.from_user_id}`,
                        )
                            .then((r) => r.json())
                            .then((data) =>
                                setUserCache((c) => ({
                                    ...c,
                                    [data.user.id]: data.user.username,
                                })),
                            )
                            .catch(() => {})
                        return cache
                    })
                }
            } catch {
                // raw string message
            }
        }

        return () => {
            socketRef.current = null
            if (ws.readyState === WebSocket.CONNECTING) {
                ws.onopen = () => ws.close()
            } else {
                ws.close()
            }
        }
    }, [userId])

    function fetchConversations() {
        if (!userId) return
        fetch(
            `http://localhost:${BACKEND_PORT_DEFAULT}/conversations?userId=${userId}`,
        )
            .then((r) => r.json())
            .then((data) => setConversations(data.conversations ?? []))
            .catch(() => {})
    }

    useEffect(() => {
        fetchConversations()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId])

    useEffect(() => {
        if (!conversationId) return
        fetch(
            `http://localhost:${BACKEND_PORT_DEFAULT}/conversations/${conversationId}/messages?userId=${userId}`,
        )
            .then((r) => r.json())
            .then((data) =>
                setMessages(
                    (data.messages as MessageFromBackend[]).map((m) => ({
                        ...m,
                        seq: BigInt(m.seq),
                    })),
                ),
            )
            .catch(() => {})
    }, [conversationId, userId])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    useEffect(() => {
        setSearchError(null)
        if (!searchQuery.trim()) {
            setSearchResults([])
            return
        }
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(
                    `http://localhost:${BACKEND_PORT_DEFAULT}/users?username=${encodeURIComponent(searchQuery)}`,
                )
                const data = await res.json()
                setSearchResults(
                    (data.users as User[]).filter(
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

    async function startConversation() {
        if (!userId || selectedUsers.length === 0) return
        setCreatingConvo(true)
        setSearchError(null)
        try {
            const res = await fetch(
                `http://localhost:${BACKEND_PORT_DEFAULT}/conversations`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userIds: [userId, ...selectedUsers.map((u) => u.id)],
                    }),
                },
            )
            const data = await res.json()
            if (!res.ok) {
                setSearchError(data.error ?? 'Failed to create conversation')
                return
            }
            setConversationId(data.conversationId)
            setParticipants(selectedUsers)
            setUserCache((c) => {
                const next = { ...c }
                selectedUsers.forEach((u) => (next[u.id] = u.username))
                return next
            })
            setShowNewChat(false)
            setSearchQuery('')
            setSearchResults([])
            setSelectedUsers([])
            fetchConversations()
        } catch {
            setSearchError('Failed to create conversation')
        } finally {
            setCreatingConvo(false)
        }
    }

    function sendTextMessage() {
        const text = input.trim()
        const socket = socketRef.current
        if (
            !text ||
            !socket ||
            socket.readyState !== WebSocket.OPEN ||
            !conversationId ||
            !userId
        ) {
            return
        }
        const messageToSend: MessageToSendBackend = {
            metadata: {},
            type: MessageType.text,
            conversation_id: conversationId,
            from_user_id: userId,
            body: text,
        }
        socket.send(JSON.stringify(messageToSend))
        setMessages((prev) => [
            ...prev,
            {
                conversation_id: conversationId,
                from_user_id: userId,
                body: text,
                metadata: {},
                type: MessageType.text,
                seq: BigInt(-Date.now()),
                created_at: new Date(),
            },
        ])
        setInput('')
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendTextMessage()
        }
    }

    async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        const ext =
            file.name.split('.').pop()?.toLowerCase() ??
            file.type.split('/')[1] ??
            'bin'
        try {
            const s3uploadUrl = await fetch(
                `http://localhost:${BACKEND_PORT_DEFAULT}/media`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileType: ext }),
                },
            )
                .then((r) => r.json())
                .then((data: PresignedUrlResponse) => data)
                .catch(() => {})
            if (s3uploadUrl) {
                const response = await fetch(s3uploadUrl.url, {
                    method: 'PUT',
                    body: file,
                })
                if (!response.ok) {
                    console.error('S3 upload failed:', await response.text())
                }
                const socket = socketRef.current
                if (
                    !socket ||
                    socket.readyState !== WebSocket.OPEN ||
                    !conversationId ||
                    !userId
                ) {
                    console.error('Socket not ready to send file url to backend')
                    return
                }
                const messageToSend: MessageToSendBackend = {
                    conversation_id: conversationId,
                    from_user_id: userId,
                    type: MessageType.image,
                    metadata: { url: s3uploadUrl.url, key: s3uploadUrl.key },
                    body: undefined,
                }
                socket.send(JSON.stringify(messageToSend))
            }
        } catch {
            // ignore
        }
        e.target.value = ''
    }

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
                showNewChat={showNewChat}
                onBack={() => {
                    setParticipants([])
                    setConversationId(null)
                    setMessages([])
                }}
                onToggleNewChat={() => {
                    setShowNewChat((v) => !v)
                    setSelectedUsers([])
                    setSearchQuery('')
                }}
            />

            {showNewChat && (
                <NewChatPanel
                    selectedUsers={selectedUsers}
                    searchQuery={searchQuery}
                    searchResults={searchResults}
                    searchError={searchError}
                    creatingConvo={creatingConvo}
                    onSearchChange={setSearchQuery}
                    onToggleUser={toggleSelectUser}
                    onStartConversation={startConversation}
                />
            )}

            <div
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: conversationId ? 0 : 12,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                }}
            >
                {!conversationId && (
                    <ConversationList
                        conversations={conversations}
                        userId={userId}
                        onSelect={(id, others) => {
                            setConversationId(id)
                            setParticipants(others)
                            setUserCache((c) => {
                                const next = { ...c }
                                others.forEach((u) => (next[u.id] = u.username))
                                return next
                            })
                        }}
                    />
                )}
                {conversationId && (
                    <MessageList
                        messages={messages}
                        userId={userId}
                        userCache={userCache}
                        isGroup={isGroup}
                        bottomRef={bottomRef}
                    />
                )}
            </div>

            <MessageInput
                input={input}
                conversationId={conversationId}
                fileInputRef={fileInputRef}
                onInputChange={setInput}
                onKeyDown={handleKeyDown}
                onSend={sendTextMessage}
                onAttachClick={() => fileInputRef.current?.click()}
                onFileSelect={handleFileSelect}
            />
        </div>
    )
}
