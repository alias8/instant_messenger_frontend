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

    // The imageUrl here will look like this:
    // https://my-instant-messenger-project-uploads-001598327238-us-east-1-an.s3.us-east-1.amazonaws.com/uploads/64c33ee3-f716-42bd-ab45-9817bb4c8e73.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIAQAX2ERHDBV54T3ED%2F20260404%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260404T015152Z&X-Amz-Expires=86400&X-Amz-Signature=925f89a6b559d900378191f48e61c4bf33ffdb2ade2e894f1f37bb01710a67fb&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject

    return <img src={imageUrl} style={{ maxWidth: '100%', maxHeight: 300 }} />
}
