import { useEffect, useRef, useState } from 'react'
import { BACKEND_PORT_DEFAULT } from '../App.tsx'

const MessageType = {
    text: 'text',
    image: 'image',
} as const

interface MessageMetadata {
    url?: string // will look like https://my-instant-messenger-project-uploads-001598327238-us-east-1-an.s3.us-east-1.amazonaws.com/uploads/76124c25-b373-48cd-a5fe-e700a41b9de4.jpg
    key?: string // will look like uploads/76124c25-b373-48cd-a5fe-e700a41b9de4.jpg
}

interface MessageFromBackend {
    conversation_id: string
    from_user_id: string
    body?: string
    type: keyof typeof MessageType
    metadata: MessageMetadata
    seq: bigint
    created_at: Date
}

type MessageToSendBackend = Omit<MessageFromBackend, 'seq' | 'created_at'>

interface PresignedUrlResponse {
    url: string
    key: string
}

interface User {
    id: string
    username: string
}

export function Chat() {
    const [userId] = useState(() => localStorage.getItem('userId'))
    const [username] = useState(() => localStorage.getItem('username'))
    const socketRef = useRef<WebSocket | null>(null)
    const [messages, setMessages] = useState<MessageFromBackend[]>([])
    const [input, setInput] = useState('')
    const bottomRef = useRef<HTMLDivElement>(null)

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

    const fileInputRef = useRef<HTMLInputElement>(null)

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
                .then((data: PresignedUrlResponse) => {
                    return data
                })
                .catch(() => {})
            if (s3uploadUrl) {
                const response = await fetch(s3uploadUrl.url, {
                    method: 'PUT',
                    body: file,
                })
                if (!response.ok) {
                    const errorText = await response.text()
                    console.error('S3 upload failed:', errorText)
                }
                const socket = socketRef.current
                if (
                    !socket ||
                    socket.readyState !== WebSocket.OPEN ||
                    !conversationId ||
                    !userId
                ) {
                    console.error(
                        'Socket not ready to send file url to backend',
                    )
                    return
                }
                const messageToSendToBackend: MessageToSendBackend = {
                    conversation_id: conversationId,
                    from_user_id: userId,
                    type: MessageType.image,
                    metadata: { url: s3uploadUrl.url, key: s3uploadUrl.key },
                    body: undefined,
                }
                socket.send(JSON.stringify(messageToSendToBackend))
            }
        } catch {
            // ignore
        }
        e.target.value = ''
    }

    const inConversation = participants.length > 0
    const isGroup = participants.length > 1
    const headerTitle = inConversation
        ? participants.map((p) => p.username).join(', ')
        : username
    const headerInitials = inConversation
        ? participants
              .map((p) => p.username[0].toUpperCase())
              .join('')
              .slice(0, 3)
        : (username?.[0]?.toUpperCase() ?? '?')

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
            <div
                style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid #ccc',
                    background: '#075e54',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    color: '#fff',
                }}
            >
                {inConversation ? (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                        }}
                    >
                        <button
                            onClick={() => {
                                setParticipants([])
                                setConversationId(null)
                                setMessages([])
                            }}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#fff',
                                cursor: 'pointer',
                                fontSize: 20,
                                lineHeight: 1,
                                padding: '0 4px',
                            }}
                            aria-label="Back"
                        >
                            ‹
                        </button>
                        <div
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                background: '#128c7e',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                fontSize: isGroup ? 12 : 16,
                                flexShrink: 0,
                            }}
                        >
                            {headerInitials}
                        </div>
                        <strong style={{ fontSize: 16 }}>{headerTitle}</strong>
                    </div>
                ) : (
                    <div>
                        <strong>{username}</strong>
                        <span
                            style={{
                                marginLeft: 8,
                                color: 'rgba(255,255,255,0.6)',
                                fontSize: 12,
                            }}
                        >
                            ::{BACKEND_PORT_DEFAULT}
                        </span>
                    </div>
                )}
                {!inConversation && (
                    <button
                        onClick={() => {
                            setShowNewChat((v) => !v)
                            setSelectedUsers([])
                            setSearchQuery('')
                        }}
                        style={{
                            padding: '4px 12px',
                            borderRadius: 12,
                            background: '#25d366',
                            color: '#fff',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 13,
                        }}
                    >
                        {showNewChat ? 'Cancel' : '+ New Chat'}
                    </button>
                )}
            </div>

            {showNewChat && (
                <div
                    style={{
                        padding: 12,
                        borderBottom: '1px solid #ccc',
                        background: '#fafafa',
                    }}
                >
                    {selectedUsers.length > 0 && (
                        <div
                            style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 6,
                                marginBottom: 8,
                            }}
                        >
                            {selectedUsers.map((u) => (
                                <span
                                    key={u.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        background: '#128c7e',
                                        color: '#fff',
                                        borderRadius: 12,
                                        padding: '3px 10px',
                                        fontSize: 13,
                                    }}
                                >
                                    {u.username}
                                    <button
                                        onClick={() => toggleSelectUser(u)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#fff',
                                            cursor: 'pointer',
                                            fontSize: 14,
                                            lineHeight: 1,
                                            padding: 0,
                                        }}
                                        aria-label={`Remove ${u.username}`}
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                    <input
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: '1px solid #ccc',
                            boxSizing: 'border-box',
                        }}
                        placeholder="Search by username…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                    {searchError && (
                        <div
                            style={{ color: 'red', fontSize: 12, marginTop: 4 }}
                        >
                            {searchError}
                        </div>
                    )}
                    {searchResults.length > 0 && (
                        <ul
                            style={{
                                listStyle: 'none',
                                margin: '6px 0 0',
                                padding: 0,
                                border: '1px solid #ccc',
                                borderRadius: 8,
                                overflow: 'hidden',
                            }}
                        >
                            {searchResults.map((u) => (
                                <li
                                    key={u.id}
                                    onClick={() => toggleSelectUser(u)}
                                    style={{
                                        padding: '8px 12px',
                                        cursor: 'pointer',
                                        background: '#fff',
                                        borderBottom: '1px solid #eee',
                                    }}
                                    onMouseEnter={(e) =>
                                        ((
                                            e.currentTarget as HTMLLIElement
                                        ).style.background = '#f0f2f5')
                                    }
                                    onMouseLeave={(e) =>
                                        ((
                                            e.currentTarget as HTMLLIElement
                                        ).style.background = '#fff')
                                    }
                                >
                                    {u.username}
                                </li>
                            ))}
                        </ul>
                    )}
                    {selectedUsers.length > 0 && (
                        <button
                            onClick={startConversation}
                            disabled={creatingConvo}
                            style={{
                                marginTop: 10,
                                width: '100%',
                                padding: '9px 0',
                                borderRadius: 8,
                                background: creatingConvo ? '#aaa' : '#25d366',
                                color: '#fff',
                                border: 'none',
                                cursor: creatingConvo ? 'wait' : 'pointer',
                                fontWeight: 'bold',
                                fontSize: 14,
                            }}
                        >
                            {creatingConvo
                                ? 'Starting…'
                                : `Start Chat${selectedUsers.length > 1 ? ' (group)' : ''}`}
                        </button>
                    )}
                </div>
            )}

            <div
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 6,
                }}
            >
                {!conversationId && conversations.length === 0 && (
                    <div
                        style={{
                            color: '#aaa',
                            textAlign: 'center',
                            marginTop: 40,
                            width: '100%',
                        }}
                    >
                        No conversations yet. Start a new chat!
                    </div>
                )}
                {!conversationId && conversations.length > 0 && (
                    <div style={{ width: '100%' }}>
                        {conversations.map((convo) => {
                            const others = convo.participants.filter(
                                (p) => p.id !== userId,
                            )
                            const title = others
                                .map((p) => p.username)
                                .join(', ')
                            const initials = others
                                .map((p) => p.username[0].toUpperCase())
                                .join('')
                                .slice(0, 3)
                            return (
                                <div
                                    key={convo.id}
                                    onClick={() => {
                                        setConversationId(convo.id)
                                        setParticipants(others)
                                        setUserCache((c) => {
                                            const next = { ...c }
                                            others.forEach(
                                                (u) =>
                                                    (next[u.id] = u.username),
                                            )
                                            return next
                                        })
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        padding: '12px 16px',
                                        borderBottom: '1px solid #f0f2f5',
                                        cursor: 'pointer',
                                        background: '#fff',
                                    }}
                                    onMouseEnter={(e) =>
                                        ((
                                            e.currentTarget as HTMLDivElement
                                        ).style.background = '#f0f2f5')
                                    }
                                    onMouseLeave={(e) =>
                                        ((
                                            e.currentTarget as HTMLDivElement
                                        ).style.background = '#fff')
                                    }
                                >
                                    <div
                                        style={{
                                            width: 42,
                                            height: 42,
                                            borderRadius: '50%',
                                            background: '#128c7e',
                                            color: '#fff',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 'bold',
                                            fontSize:
                                                others.length > 1 ? 13 : 17,
                                            flexShrink: 0,
                                        }}
                                    >
                                        {initials}
                                    </div>
                                    <span style={{ fontSize: 15 }}>
                                        {title}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                )}
                {messages.map((msg) => {
                    const own = msg.from_user_id === userId
                    const senderName = own
                        ? null
                        : (userCache[msg.from_user_id] ?? msg.from_user_id)
                    return (
                        <div
                            key={msg.seq}
                            style={{
                                alignSelf: own ? 'flex-end' : 'flex-start',
                                maxWidth: '70%',
                            }}
                        >
                            {!own && isGroup && (
                                <div
                                    style={{
                                        fontSize: 11,
                                        color: '#888',
                                        marginBottom: 2,
                                        paddingLeft: 4,
                                    }}
                                >
                                    {senderName}
                                </div>
                            )}
                            {msg.type === MessageType.text ? (
                                <div
                                    style={{
                                        background: own ? '#0084ff' : '#e4e6eb',
                                        color: own ? '#fff' : '#000',
                                        padding: '8px 12px',
                                        borderRadius: 18,
                                        wordBreak: 'break-word',
                                    }}
                                >
                                    {msg.body}
                                </div>
                            ) : (
                                <RenderImageMessage metadata={msg.metadata} />
                            )}
                        </div>
                    )
                })}
                <div ref={bottomRef} />
            </div>

            <div
                style={{
                    display: 'flex',
                    gap: 8,
                    padding: 12,
                    borderTop: '1px solid #ccc',
                }}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!conversationId}
                    style={{
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        background: conversationId ? '#f0f2f5' : '#e0e0e0',
                        border: 'none',
                        cursor: conversationId ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontSize: 18,
                        color: conversationId ? '#555' : '#aaa',
                    }}
                    aria-label="Attach file"
                >
                    📎
                </button>
                <input
                    style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 20,
                        border: '1px solid #ccc',
                    }}
                    placeholder={
                        conversationId
                            ? 'Type a message…'
                            : 'Select a conversation first…'
                    }
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={!conversationId}
                    autoFocus
                />
                <button
                    onClick={sendTextMessage}
                    disabled={!conversationId}
                    style={{
                        padding: '8px 16px',
                        borderRadius: 20,
                        background: conversationId ? '#0084ff' : '#aaa',
                        color: '#fff',
                        border: 'none',
                        cursor: conversationId ? 'pointer' : 'not-allowed',
                    }}
                >
                    Send
                </button>
            </div>
        </div>
    )
}

interface RenderImageMessage {
    metadata: MessageMetadata
}

const RenderImageMessage = ({ metadata }: RenderImageMessage) => {
    const [imageUrl, setImageUrl] = useState<string>('')
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(
                    `/media/presigned?key=${metadata.key}`,
                    {
                        method: 'GET',
                    },
                )
                if (!response.ok) {
                    const errorText = await response.text()
                    console.error(
                        `S3 upload failed when fetching url for key ${metadata.key}:`,
                        errorText,
                    )
                } else {
                    setImageUrl(response.url)
                }
            } catch (error) {
                console.error('Error fetching data:', error)
            }
        }

        fetchData()
    }, [metadata.key])

    return <img src={imageUrl}></img>
}
