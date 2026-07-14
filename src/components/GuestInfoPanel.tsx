import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROLE } from '../config.ts'
import { useAuth } from '../context/AuthContext.tsx'

// Guest-mode-only banner explaining the demo to a first-time visitor
// (a recruiter clicking a resume link, not a real end user) — styled to
// look deliberately unlike the WhatsApp-style chat UI below it, so it
// reads as meta commentary rather than part of the product.
export function GuestInfoPanel() {
    const [expanded, setExpanded] = useState(true)
    const [resetting, setResetting] = useState(false)
    const { logout } = useAuth()
    const navigate = useNavigate()

    async function handleStartOver() {
        setResetting(true)
        await logout()
        navigate('/')
    }

    if (!expanded) {
        return (
            <button
                onClick={() => setExpanded(true)}
                style={{
                    display: 'block',
                    margin: '6px auto',
                    padding: '4px 12px',
                    borderRadius: 12,
                    border: '1px dashed #b58900',
                    background: '#fff8e1',
                    color: '#7a5c00',
                    fontSize: 12,
                    cursor: 'pointer',
                }}
            >
                ℹ️ About this demo
            </button>
        )
    }

    return (
        <div
            style={{
                margin: 8,
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px dashed #b58900',
                background: '#fff8e1',
                color: '#5c4400',
                fontSize: 13,
                lineHeight: 1.5,
            }}
        >
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 8,
                }}
            >
                <strong>ℹ️ About this demo — not part of the real app UI</strong>
                <button
                    onClick={() => setExpanded(false)}
                    aria-label="Collapse"
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#7a5c00',
                        cursor: 'pointer',
                        fontSize: 14,
                        lineHeight: 1,
                        padding: 0,
                    }}
                >
                    ×
                </button>
            </div>
            <p style={{ margin: '6px 0 0' }}>
                You're browsing as <strong>{ROLE}</strong>, one of two live demo
                identities. This conversation is isolated to your browser —
                nobody else who opens this link can see your messages, and you
                can't see theirs.
            </p>
            <p style={{ margin: '6px 0 0' }}>
                Try <strong>+ New Chat</strong> to also message{' '}
                <strong>userC</strong>, a placeholder contact that never
                replies — it's there to demonstrate that multiple simultaneous
                conversations (including group chats) work.
            </p>
            <p style={{ margin: '6px 0 0' }}>
                Uploaded photos are automatically deleted after 24 hours.
            </p>
            <button
                onClick={handleStartOver}
                disabled={resetting}
                style={{
                    marginTop: 8,
                    padding: '5px 12px',
                    borderRadius: 8,
                    border: '1px solid #b58900',
                    background: resetting ? '#e0d6b3' : '#fff',
                    color: '#5c4400',
                    cursor: resetting ? 'wait' : 'pointer',
                    fontSize: 12,
                }}
            >
                {resetting ? 'Starting over…' : '🔄 Delete chats & start over'}
            </button>
        </div>
    )
}
