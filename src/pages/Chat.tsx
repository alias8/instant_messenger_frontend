import { useEffect, useRef, useState } from 'react'
import { BACKEND_PORT_DEFAULT } from '../App.tsx'

interface Message {
    conversation_id: string
    from_user_id: string
    body: string
    seq: bigint
    created_at: Date
}

interface User {
    id: string
    username: string
}

export function Chat() {
    const [userId] = useState(() => localStorage.getItem('userId'))
    const [username] = useState(() => localStorage.getItem('username'))
    const socketRef = useRef<WebSocket | null>(null)
    const fetchingChatterRef = useRef(false)
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const bottomRef = useRef<HTMLDivElement>(null)

    const [conversationId, setConversationId] = useState<string | null>(null)
    const [chattingWith, setChattingWith] = useState<User | null>(null)
    const [showNewChat, setShowNewChat] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<User[]>([])
    const [searchError, setSearchError] = useState<string | null>(null)
    const [creatingConvo, setCreatingConvo] = useState(false)

    useEffect(() => {
        if (!userId) return
        const ws = new WebSocket(
            `ws://localhost:${BACKEND_PORT_DEFAULT}?userId=${userId}`,
        )
        socketRef.current = ws

        ws.onmessage = (event) => {
            try {
                const parsed: Message = JSON.parse(event.data)
                setMessages((prev) => [...prev, { ...parsed }])
                setConversationId((prev) => prev ?? parsed.conversation_id)
                if (
                    parsed.from_user_id !== userId &&
                    !fetchingChatterRef.current
                ) {
                    setChattingWith((prev) => {
                        if (prev) return prev
                        fetchingChatterRef.current = true
                        fetch(
                            `http://localhost:${BACKEND_PORT_DEFAULT}/users/${parsed.from_user_id}`,
                        )
                            .then((r) => r.json())
                            .then((data) => setChattingWith(data.user))
                            .catch(() => {})
                        return prev
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

    useEffect(() => {
        if (!conversationId) return
        fetch(
            `http://localhost:${BACKEND_PORT_DEFAULT}/conversations/${conversationId}/messages`,
        )
            .then((r) => r.json())
            .then((data) =>
                setMessages(
                    (data.messages as Message[]).map((m) => ({
                        ...m,
                        seq: BigInt(m.seq),
                    })),
                ),
            )
            .catch(() => {})
    }, [conversationId])

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
                    (data.users as User[]).filter((u) => u.id !== userId),
                )
            } catch {
                setSearchError('Failed to search users')
            }
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery, userId])

    async function startConversation(targetUser: User) {
        if (!userId) return
        setCreatingConvo(true)
        setSearchError(null)
        try {
            const res = await fetch(
                `http://localhost:${BACKEND_PORT_DEFAULT}/conversations`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user1Id: userId,
                        user2Id: targetUser.id,
                    }),
                },
            )
            const data = await res.json()
            if (!res.ok) {
                setSearchError(data.error ?? 'Failed to create conversation')
                return
            }
            setConversationId(data.conversationId)
            setChattingWith(targetUser)
            setShowNewChat(false)
            setSearchQuery('')
            setSearchResults([])
        } catch {
            setSearchError('Failed to create conversation')
        } finally {
            setCreatingConvo(false)
        }
    }

    function sendMessage() {
        const text = input.trim()
        const socket = socketRef.current
        if (
            !text ||
            !socket ||
            socket.readyState !== WebSocket.OPEN ||
            !conversationId ||
            !userId
        ) {
            return // message not ready for sending
        }
        socket.send(
            JSON.stringify({
                conversation_id: conversationId,
                from_user_id: userId,
                body: text,
            }),
        )
        setMessages((prev) => [
            ...prev,
            {
                conversation_id: conversationId,
                from_user_id: userId,
                body: text,
                seq: BigInt(-Date.now()),
                created_at: new Date(),
            },
        ])
        setInput('')
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

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
                {chattingWith ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button
                            onClick={() => {
                                setChattingWith(null)
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
                                fontSize: 16,
                                flexShrink: 0,
                            }}
                        >
                            {chattingWith.username[0].toUpperCase()}
                        </div>
                        <strong style={{ fontSize: 16 }}>{chattingWith.username}</strong>
                    </div>
                ) : (
                    <div>
                        <strong>{username}</strong>
                        <span style={{ marginLeft: 8, color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                            ::{BACKEND_PORT_DEFAULT}
                        </span>
                    </div>
                )}
                {!chattingWith && (
                    <button
                        onClick={() => setShowNewChat((v) => !v)}
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
                                    onClick={() =>
                                        !creatingConvo && startConversation(u)
                                    }
                                    style={{
                                        padding: '8px 12px',
                                        cursor: creatingConvo
                                            ? 'wait'
                                            : 'pointer',
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
                {!conversationId && (
                    <div
                        style={{
                            color: '#aaa',
                            textAlign: 'center',
                            marginTop: 40,
                        }}
                    >
                        Start a new chat to begin messaging
                    </div>
                )}
{messages.map((msg) => {
                    const own = msg.from_user_id === userId
                    return (
                        <div
                            key={msg.seq}
                            style={{
                                alignSelf: own ? 'flex-end' : 'flex-start',
                                background: own ? '#0084ff' : '#e4e6eb',
                                color: own ? '#fff' : '#000',
                                padding: '8px 12px',
                                borderRadius: 18,
                                maxWidth: '70%',
                                wordBreak: 'break-word',
                            }}
                        >
                            {msg.body}
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
                    onClick={sendMessage}
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
