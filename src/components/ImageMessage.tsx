import { useEffect, useState } from 'react'
import { getDownloadPresignedUrl } from '../services/mediaService.ts'
import type { MessageMetadata } from '../types/chat.ts'

interface ImageMessageProps {
    metadata: MessageMetadata
}

export function ImageMessage({ metadata }: ImageMessageProps) {
    const [imageUrl, setImageUrl] = useState<string>('')

    useEffect(() => {
        if (!metadata.key) return
        getDownloadPresignedUrl(metadata.key)
            .then(setImageUrl)
            .catch((err) => console.error('Error fetching presigned URL:', err))
    }, [metadata.key])

    return <img src={imageUrl} style={{ maxWidth: '100%', maxHeight: 300 }} />
}
