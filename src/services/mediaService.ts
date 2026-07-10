import { apiFetch } from './api.ts'
import type { PresignedUrlResponse } from '../types/chat.ts'

export async function getUploadPresignedUrl(
    fileType: string,
): Promise<PresignedUrlResponse> {
    const res = await apiFetch('/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileType }),
    })
    return res.json()
}

export async function uploadFileToS3(url: string, file: File): Promise<void> {
    // Direct upload to the S3 presigned URL — not our backend, must not go
    // through apiFetch (no credentials, no API_BASE_URL prefix).
    const res = await fetch(url, { method: 'PUT', body: file })
    if (!res.ok) {
        console.error('S3 upload failed:', await res.text())
    }
}

export async function getDownloadPresignedUrl(key: string): Promise<string> {
    const res = await apiFetch(`/media/presigned?key=${key}`)
    if (!res.ok) {
        throw new Error(`Failed to fetch presigned URL for key ${key}`)
    }
    const data = await res.json()
    return data.url as string
}
