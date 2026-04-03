import { MessageType } from '../types/chat.ts'
import type { MessageFromBackend } from '../types/chat.ts'
import { ImageMessage } from './ImageMessage.tsx'

interface MessageBubbleProps {
    msg: MessageFromBackend
    own: boolean
    senderName: string | null
    isGroup: boolean
}

export function MessageBubble({ msg, own, senderName, isGroup }: MessageBubbleProps) {
    return (
        <div
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
                <ImageMessage metadata={msg.metadata} />
            )}
        </div>
    )
}
