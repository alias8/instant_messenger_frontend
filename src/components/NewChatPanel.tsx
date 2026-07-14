import { GUEST_MODE } from '../config.ts'
import type { User } from '../types/chat.ts'
import { guestParticipantLabel as label } from '../utils/guestLabel.ts'

interface NewChatPanelProps {
    selectedUsers: User[]
    searchQuery: string
    searchResults: User[]
    searchError: string | null
    creatingConvo: boolean
    onSearchChange: (q: string) => void
    onToggleUser: (u: User) => void
    onStartConversation: () => void
}

export function NewChatPanel({
    selectedUsers,
    searchQuery,
    searchResults,
    searchError,
    creatingConvo,
    onSearchChange,
    onToggleUser,
    onStartConversation,
}: NewChatPanelProps) {
    return (
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
                            {label(u)}
                            <button
                                onClick={() => onToggleUser(u)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontSize: 14,
                                    lineHeight: 1,
                                    padding: 0,
                                }}
                                aria-label={`Remove ${label(u)}`}
                            >
                                ×
                            </button>
                        </span>
                    ))}
                </div>
            )}
            {GUEST_MODE ? (
                <div style={{ color: '#667781', fontSize: 13 }}>
                    Start a chat with:
                </div>
            ) : (
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
                    onChange={(e) => onSearchChange(e.target.value)}
                    autoFocus
                />
            )}
            {searchError && (
                <div style={{ color: 'red', fontSize: 12, marginTop: 4 }}>
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
                            onClick={() => onToggleUser(u)}
                            style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                background: '#fff',
                                borderBottom: '1px solid #eee',
                            }}
                            onMouseEnter={(e) =>
                                ((e.currentTarget as HTMLLIElement).style.background =
                                    '#f0f2f5')
                            }
                            onMouseLeave={(e) =>
                                ((e.currentTarget as HTMLLIElement).style.background =
                                    '#fff')
                            }
                        >
                            {label(u)}
                        </li>
                    ))}
                </ul>
            )}
            {selectedUsers.length > 0 && (
                <button
                    onClick={onStartConversation}
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
    )
}
