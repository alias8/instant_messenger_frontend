import { BACKEND_PORT_DEFAULT } from '../config.ts'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? `http://localhost:${BACKEND_PORT_DEFAULT}`
export const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws')

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
    return fetch(`${API_BASE_URL}${path}`, { ...init, credentials: 'include' })
}
