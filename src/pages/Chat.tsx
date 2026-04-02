import { useEffect, useRef, useState } from 'react'
import { BACKEND_PORT_DEFAULT } from '../App.tsx'

interface Message {
    id: string
    conversation_id: string
    from_user_id: string
    body: string
    seq: bigint
    created_at: Date
}

export function Chat() {
    const [userId] = useState(() => localStorage.getItem('userId'))
    const [username] = useState(() => localStorage.getItem('username'))
    const socketRef = useRef<WebSocket | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const bottomRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!userId) return
        const ws = new WebSocket(
            `ws://localhost:${BACKEND_PORT_DEFAULT}?userId=${userId}`,
        )
        socketRef.current = ws

        ws.onmessage = (event) => {
            let text = event.data
            let senderId: string | undefined
            try {
                const parsed = JSON.parse(event.data)
                text = parsed.content ?? parsed.message ?? event.data
                senderId = parsed.senderId ?? parsed.userId
            } catch {
                // raw string message
            }
            // setMessages((prev) => [
            //     ...prev,
            //     { id: crypto.randomUUID(), text, own: senderId === userId },
            // ])
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
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    function sendMessage() {
        const text = input.trim()
        const socket = socketRef.current
        if (!text || !socket || socket.readyState !== WebSocket.OPEN) return
        socket.send(
            JSON.stringify({
                conversation_id: '1693be9b-d4cc-460f-8f36-5e7e8cb0fcc9',
                from_user_id: userId, // user1
                body: text,
            }),
        )
        socket.send(JSON.stringify({ content: text, senderId: userId }))
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
                    background: '#f5f5f5',
                }}
            >
                <strong>{username}</strong>
                <span style={{ marginLeft: 8, color: '#888', fontSize: 12 }}>
                    server ::{BACKEND_PORT_DEFAULT}
                </span>
            </div>

            <div
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                }}
            >
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        style={{
                            alignSelf: msg.own ? 'flex-end' : 'flex-start',
                            background: msg.own ? '#0084ff' : '#e4e6eb',
                            color: msg.own ? '#fff' : '#000',
                            padding: '8px 12px',
                            borderRadius: 18,
                            maxWidth: '70%',
                            wordBreak: 'break-word',
                        }}
                    >
                        {msg.text}
                    </div>
                ))}
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
                    placeholder="Type a message…"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                />
                <button
                    onClick={sendMessage}
                    style={{
                        padding: '8px 16px',
                        borderRadius: 20,
                        background: '#0084ff',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                    }}
                >
                    Send
                </button>
            </div>
        </div>
    )
}
