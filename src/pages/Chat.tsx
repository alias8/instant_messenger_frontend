import { useEffect, useState } from 'react';

export function Chat() {
    const [myUserId, setMyUserId] = useState(undefined);
    const [messages, setMessages] = useState([]);
    const [socket, setSocket] = useState<WebSocket | null>(null);

    useEffect(() => {
        // 1. Establish connection
        const ws: WebSocket = new WebSocket(`ws://localhost:3000?userId=${myUserId}`);
        setSocket(ws);

        // 2. Handle incoming messages
        ws.onmessage = (event) => {
            setMessages((prev) => [...prev, event.data]);
        };

        // 3. Cleanup on unmount
        return () => ws.close();
    }, []);

    const sendMessage = (msg) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(msg);
        }
    };

    return (/* JSX here */);
}