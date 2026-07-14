import { useRef, useState } from 'react'
import { getUploadPresignedUrl, uploadFileToS3 } from '../services/mediaService.ts'
import {
    MessageType,
    type MessageFromBackend,
    type MessageToSendBackend,
} from '../types/chat.ts'

export function useMessageSender(
    socketRef: React.RefObject<WebSocket | null>,
    conversationId: string | null,
    userId: string | null,
    setMessages: React.Dispatch<React.SetStateAction<MessageFromBackend[]>>,
) {
    const [input, setInput] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    function sendTextMessage() {
        const text = input.trim()
        const socket = socketRef.current
        if (
            !text ||
            !socket ||
            socket.readyState !== WebSocket.OPEN ||
            !conversationId ||
            !userId
        ) {
            return
        }
        const messageToSend: MessageToSendBackend = {
            metadata: {},
            type: MessageType.text,
            conversation_id: conversationId,
            from_user_id: userId,
            body: text,
        }
        socket.send(JSON.stringify(messageToSend))
        setMessages((prev) => [
            ...prev,
            {
                conversation_id: conversationId,
                from_user_id: userId,
                body: text,
                metadata: {},
                type: MessageType.text,
                seq: BigInt(-Date.now()),
                created_at: new Date(),
            },
        ])
        setInput('')
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendTextMessage()
        }
    }

    async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        const ext =
            file.name.split('.').pop()?.toLowerCase() ??
            file.type.split('/')[1] ??
            'bin'
        try {
            const s3uploadUrl = await getUploadPresignedUrl(ext).catch(
                () => undefined,
            )
            if (s3uploadUrl) {
                await uploadFileToS3(s3uploadUrl.url, file)
                const socket = socketRef.current
                if (
                    !socket ||
                    socket.readyState !== WebSocket.OPEN ||
                    !conversationId ||
                    !userId
                ) {
                    console.error('Socket not ready to send file url to backend')
                    return
                }
                const messageToSend: MessageToSendBackend = {
                    conversation_id: conversationId,
                    from_user_id: userId,
                    type: MessageType.image,
                    metadata: { url: s3uploadUrl.url, key: s3uploadUrl.key },
                    body: undefined,
                }
                socket.send(JSON.stringify(messageToSend))
                setMessages((prev) => [
                    ...prev,
                    {
                        conversation_id: conversationId,
                        from_user_id: userId,
                        body: undefined,
                        metadata: { url: s3uploadUrl.url, key: s3uploadUrl.key },
                        type: MessageType.image,
                        seq: BigInt(-Date.now()),
                        created_at: new Date(),
                    },
                ])
            }
        } catch {
            // ignore
        }
        e.target.value = ''
    }

    return { input, setInput, sendTextMessage, handleKeyDown, handleFileSelect, fileInputRef }
}
