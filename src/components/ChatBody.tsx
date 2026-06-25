import type { RefObject } from 'react'
import type { Conversation } from '../services/conversationService.ts'
import type { MessageFromBackend, User } from '../types/chat.ts'
import { ConversationList } from './ConversationList.tsx'
import { MessageList } from './MessageList.tsx'
import { getFeatureFlag } from '../services/featureFlagService.ts'

interface ChatBodyProps {
    conversationId: string | null
    conversations: Conversation[]
    userId: string | null
    messages: MessageFromBackend[]
    userCache: Record<string, string>
    isGroup: boolean
    bottomRef: RefObject<HTMLDivElement | null>
    onSelectConversation: (id: string, others: User[]) => void
}

export function ChatBody({
    conversationId,
    conversations,
    userId,
    messages,
    userCache,
    isGroup,
    bottomRef,
    onSelectConversation,
}: ChatBodyProps) {
    const FF2 = getFeatureFlag('feature2')
    return (
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
                    onSelect={onSelectConversation}
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
    )
}
