export const MessageType = {
    text: 'text',
    image: 'image',
} as const

export interface MessageMetadata {
    url?: string
    key?: string
}

export interface MessageFromBackend {
    conversation_id: string
    from_user_id: string
    body?: string
    type: keyof typeof MessageType
    metadata: MessageMetadata
    seq: bigint
    created_at: Date
}

export type MessageToSendBackend = Omit<MessageFromBackend, 'seq' | 'created_at'>

export interface PresignedUrlResponse {
    url: string
    key: string
}

export interface User {
    id: string
    username: string
}
