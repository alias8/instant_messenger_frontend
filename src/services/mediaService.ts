import { BACKEND_PORT_DEFAULT } from '../App.tsx'
import type { PresignedUrlResponse } from '../types/chat.ts'

const BASE = `http://localhost:${BACKEND_PORT_DEFAULT}`

export async function getUploadPresignedUrl(
    fileType: string,
): Promise<PresignedUrlResponse> {
    const res = await fetch(`${BASE}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileType }),
    })
    return res.json()
}

export async function uploadFileToS3(url: string, file: File): Promise<void> {
    const res = await fetch(url, { method: 'PUT', body: file })
    if (!res.ok) {
        console.error('S3 upload failed:', await res.text())
    }
}

export async function getDownloadPresignedUrl(key: string): Promise<string> {
    const res = await fetch(`${BASE}/media/presigned?key=${key}`)
    if (!res.ok) {
        throw new Error(`Failed to fetch presigned URL for key ${key}`)
    }
    const data = await res.json()
    return data.url as string
}
