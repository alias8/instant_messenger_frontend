import type { RefObject } from 'react'
import type { MessageFromBackend } from '../types/chat.ts'
import { MessageBubble } from './MessageBubble.tsx'

interface MessageListProps {
    messages: MessageFromBackend[]
    userId: string | null
    userCache: Record<string, string>
    isGroup: boolean
    bottomRef: RefObject<HTMLDivElement | null>
}

export function MessageList({
    messages,
    userId,
    userCache,
    isGroup,
    bottomRef,
}: MessageListProps) {
    return (
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
            {messages.map((msg) => {
                const own = msg.from_user_id === userId
                const senderName = own
                    ? null
                    : (userCache[msg.from_user_id] ?? msg.from_user_id)
                return (
                    <MessageBubble
                        key={msg.seq}
                        msg={msg}
                        own={own}
                        senderName={senderName}
                        isGroup={isGroup}
                    />
                )
            })}
            <div ref={bottomRef} />
        </div>
    )
}
