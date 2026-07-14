import { GUEST_MODE, ROLE } from '../config.ts'
import type { User } from '../types/chat.ts'

const otherRole = ROLE === 'userA' ? 'userB' : 'userA'
const participantLabel = (p: User) => (GUEST_MODE ? otherRole : p.username)

interface Conversation {
    id: string
    participants: User[]
}

interface ConversationListProps {
    conversations: Conversation[]
    userId: string | null
    onSelect: (id: string, others: User[]) => void
}

export function ConversationList({
    conversations,
    userId,
    onSelect,
}: ConversationListProps) {
    if (conversations.length === 0) {
        return (
            <div
                style={{
                    color: '#aaa',
                    textAlign: 'center',
                    marginTop: 40,
                    width: '100%',
                }}
            >
                {GUEST_MODE
                    ? 'Waiting for the other side to join — open the other demo link within 10 seconds.'
                    : 'No conversations yet. Start a new chat!'}
            </div>
        )
    }

    return (
        <div style={{ width: '100%' }}>
            {conversations.map((convo) => {
                const others = convo.participants.filter((p) => p.id !== userId)
                const title = others.map(participantLabel).join(', ')
                const initials = others
                    .map((p) => participantLabel(p)[0].toUpperCase())
                    .join('')
                    .slice(0, 3)
                return (
                    <div
                        key={convo.id}
                        onClick={() => onSelect(convo.id, others)}
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
                            ((e.currentTarget as HTMLDivElement).style.background =
                                '#f0f2f5')
                        }
                        onMouseLeave={(e) =>
                            ((e.currentTarget as HTMLDivElement).style.background =
                                '#fff')
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
                                fontSize: others.length > 1 ? 13 : 17,
                                flexShrink: 0,
                            }}
                        >
                            {initials}
                        </div>
                        <span style={{ fontSize: 15 }}>{title}</span>
                    </div>
                )
            })}
        </div>
    )
}
