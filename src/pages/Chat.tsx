import { useEffect, useState } from 'react'

export function Chat() {
    const [myUserId] = useState(() => localStorage.getItem('userId'))
    const [myUsermyUsernameId] = useState(() =>
        localStorage.getItem('username'),
    )
    const [socket, setSocket] = useState<WebSocket | null>(null)

    useEffect(() => {
        if (myUserId) {
            // 1. Establish connection
            const ws: WebSocket = new WebSocket(
                `ws://localhost:3000?userId=${myUserId}`,
            )
            setSocket(ws)

            // 2. Handle incoming messages
            ws.onmessage = (event) => {
                setMessages((prev) => [...prev, event.data])
            }

            // 3. Cleanup on unmount
            return () => ws.close()
        }
    }, [myUserId])

    const sendMessage = (msg) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(msg)
        }
    }

    return <div>hello</div>
}
