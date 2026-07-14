import { ROLE } from '../config.ts'
import type { User } from '../types/chat.ts'

// In guest mode there's only ever one other live guest in the room (whoever
// you were auto-paired with) — everyone else (e.g. the silent "userC"
// contact) is a real account with an already-friendly username.
const otherGuestRole = ROLE === 'userA' ? 'userB' : 'userA'

export const guestParticipantLabel = (u: User): string =>
    u.is_guest ? otherGuestRole : u.username
