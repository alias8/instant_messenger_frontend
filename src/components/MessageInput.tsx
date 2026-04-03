import type { RefObject } from 'react'

interface MessageInputProps {
    input: string
    conversationId: string | null
    fileInputRef: RefObject<HTMLInputElement | null>
    onInputChange: (value: string) => void
    onKeyDown: (e: React.KeyboardEvent) => void
    onSend: () => void
    onAttachClick: () => void
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function MessageInput({
    input,
    conversationId,
    fileInputRef,
    onInputChange,
    onKeyDown,
    onSend,
    onAttachClick,
    onFileSelect,
}: MessageInputProps) {
    return (
        <div
            style={{
                display: 'flex',
                gap: 8,
                padding: 12,
                borderTop: '1px solid #ccc',
            }}
        >
            <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                onChange={onFileSelect}
            />
            <button
                onClick={onAttachClick}
                disabled={!conversationId}
                style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: conversationId ? '#f0f2f5' : '#e0e0e0',
                    border: 'none',
                    cursor: conversationId ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: 18,
                    color: conversationId ? '#555' : '#aaa',
                }}
                aria-label="Attach file"
            >
                📎
            </button>
            <input
                style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 20,
                    border: '1px solid #ccc',
                }}
                placeholder={
                    conversationId
                        ? 'Type a message…'
                        : 'Select a conversation first…'
                }
                value={input}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={!conversationId}
                autoFocus
            />
            <button
                onClick={onSend}
                disabled={!conversationId}
                style={{
                    padding: '8px 16px',
                    borderRadius: 20,
                    background: conversationId ? '#0084ff' : '#aaa',
                    color: '#fff',
                    border: 'none',
                    cursor: conversationId ? 'pointer' : 'not-allowed',
                }}
            >
                Send
            </button>
        </div>
    )
}
