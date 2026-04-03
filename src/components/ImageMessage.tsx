import { useEffect, useState } from 'react'
import { BACKEND_PORT_DEFAULT } from '../App.tsx'
import type { MessageMetadata } from '../types/chat.ts'

interface ImageMessageProps {
    metadata: MessageMetadata
}

export function ImageMessage({ metadata }: ImageMessageProps) {
    const [imageUrl, setImageUrl] = useState<string>('')

    useEffect(() => {
        fetch(
            `http://localhost:${BACKEND_PORT_DEFAULT}/media/presigned?key=${metadata.key}`,
        )
            .then((r) => {
                if (!r.ok) throw new Error(`Failed to fetch presigned URL for key ${metadata.key}`)
                return r.json()
            })
            .then((data) => setImageUrl(data.url))
            .catch((err) => console.error('Error fetching presigned URL:', err))
    }, [metadata.key])

    return <img src={imageUrl} style={{ maxWidth: '100%', maxHeight: 300 }} />
}
