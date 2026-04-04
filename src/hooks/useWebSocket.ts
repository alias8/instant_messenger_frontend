import { useEffect, useLayoutEffect, useRef } from 'react'
import { BACKEND_PORT_DEFAULT } from '../config.ts'
import { getUserById } from '../services/userService.ts'
import type { MessageFromBackend } from '../types/chat.ts'

/**
 * Manages a single WebSocket connection for the given userId.
 * Callbacks are stabilised via refs so the socket is never re-created
 * when parent state changes.
 */
export function useWebSocket(
    userId: string | null,
    onMessage: (msg: MessageFromBackend) => void,
    onUserDiscovered: (id: string, username: string) => void,
): React.RefObject<WebSocket | null> {
    const socketRef = useRef<WebSocket | null>(null)

    // Keep latest callbacks in refs so the effect never needs to re-run
    const onMessageRef = useRef(onMessage)
    const onUserDiscoveredRef = useRef(onUserDiscovered)
    useLayoutEffect(() => {
        onMessageRef.current = onMessage
        onUserDiscoveredRef.current = onUserDiscovered
    })

    useEffect(() => {
        if (!userId) return
        const ws = new WebSocket(
            `ws://localhost:${BACKEND_PORT_DEFAULT}?userId=${userId}`,
        )
        socketRef.current = ws

        ws.onmessage = (event) => {
            try {
                const parsed: MessageFromBackend = JSON.parse(event.data)
                onMessageRef.current(parsed)
                if (parsed.from_user_id !== userId) {
                    getUserById(parsed.from_user_id)
                        .then((user) =>
                            onUserDiscoveredRef.current(user.id, user.username),
                        )
                        .catch(() => {})
                }
            } catch {
                // raw string message
            }
        }

        return () => {
            socketRef.current = null
            if (ws.readyState === WebSocket.CONNECTING) {
                ws.onopen = () => ws.close()
            } else {
                ws.close()
            }
        }
    }, [userId])

    return socketRef
}
