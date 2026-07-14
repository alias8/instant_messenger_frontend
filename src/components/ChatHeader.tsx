import { BACKEND_PORT_DEFAULT, GUEST_MODE, ROLE } from '../config.ts'
import type { User } from '../types/chat.ts'

interface ChatHeaderProps {
    username: string | null
    participants: User[]
    showNewChat: boolean
    onBack: () => void
    onToggleNewChat: () => void
}

export function ChatHeader({
    username,
    participants,
    showNewChat,
    onBack,
    onToggleNewChat,
}: ChatHeaderProps) {
    const inConversation = participants.length > 0
    const isGroup = participants.length > 1
    const otherRole = ROLE === 'userA' ? 'userB' : 'userA'
    const displayName = GUEST_MODE ? ROLE : username
    const participantLabel = (p: User) => (GUEST_MODE ? otherRole : p.username)
    const headerTitle = participants.map(participantLabel).join(', ')
    const headerInitials = participants
        .map((p) => participantLabel(p)[0].toUpperCase())
        .join('')
        .slice(0, 3)

    return (
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                        onClick={onBack}
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
                    <strong>{displayName}</strong>
                    {!GUEST_MODE && (
                        <span
                            style={{
                                marginLeft: 8,
                                color: 'rgba(255,255,255,0.6)',
                                fontSize: 12,
                            }}
                        >
                            ::{BACKEND_PORT_DEFAULT}
                        </span>
                    )}
                </div>
            )}
            {!inConversation && !GUEST_MODE && (
                <button
                    onClick={onToggleNewChat}
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
    )
}
