# Instant Messenger Frontend

React + TypeScript + Vite frontend for the instant messenger app.

## Login flow

1. User submits credentials on the login page.
2. `POST /users/login` is called. The backend verifies the password hash and, on success, sets a **signed httpOnly cookie** (`session`) containing the user's ID. It also returns `{ id, username }` in the response body.
3. `AuthContext.login()` receives the response body, updates React state, and calls `setCurrentUserId()` in the feature flag service so flag evaluation immediately uses the real user ID.
4. On any subsequent page load, `AuthProvider` calls `GET /users/me`. The browser automatically sends the session cookie; the backend verifies its signature and returns `{ id, username }`. This rehydrates the auth state without the user needing to log in again.
5. `POST /users/logout` clears the session cookie on the backend. `AuthContext.logout()` calls this, then clears local auth state and resets the feature flag user to anonymous.

### Why httpOnly + signed cookie

- **httpOnly** — the cookie is invisible to JavaScript, so XSS attacks cannot steal the session token.
- **signed** — Express HMAC-signs the value using `COOKIE_SECRET`. If a user tampers with the cookie (e.g. substitutes a different user ID), the signature check fails and the session is rejected.
- **`secure: true` in production** — the cookie is only sent over HTTPS, preventing it being intercepted in transit.
- **`sameSite: lax`** — the cookie is not sent on cross-origin POST requests, which blocks CSRF attacks.

### Deployment and CORS

In production the frontend and backend are deployed on subdomains of the same registrable domain (e.g. `www.messenger.com` and `api.messenger.com`). Subdomains count as same-site, so the `lax` cookie is sent without needing `sameSite: none`. The backend CORS config whitelists the frontend origin explicitly and sets `credentials: true` to allow the browser to include cookies on cross-origin requests.

---

## Feature flags

Feature flags are fetched from the feature flag service on app load via `GET /flags` and cached for the lifetime of the session. Flag values are evaluated client-side in `src/services/featureFlagService.ts`.

### Evaluation order

For a given flag, `getFeatureFlag(flagName)` evaluates in this order:

1. **Per-user override** — if the flag has an explicit override for this user ID, that value wins regardless of anything else.
2. **Master switch** — if `enabled` is `false`, return `false`.
3. **Rollout percentage is 0** — return `false` (no one gets it).
4. **Bucket check** — hash `"flagName:userId"` with murmur3, take the result modulo 100. If the bucket is less than `rolloutPercentage`, return `true`.

### Anonymous users and the transition to authenticated

Before a user logs in, their real user ID is not known. To ensure consistent flag bucketing during the anonymous phase (e.g. an experiment on the login page itself), an anonymous UUID is generated on first visit and stored in a cookie (`anonymousId`, 1-year expiry). This UUID is used as the bucket key for all flag evaluations until login.

On login, the real user ID becomes the bucket key. The anonymous UUID and the real user ID are sent to the backend together at login time so the backend can record the association. This allows pre-login experiment exposures to be attributed to the real user in analytics, even though the bucketing key changes.

#### Why the bucket key changes at login (and why that is acceptable)

An alternative would be to keep using the anonymous UUID as the permanent bucket key after login, preserving the same bucket for the same browser. However this breaks cross-device consistency — the same user on a second device would have a different anonymous UUID and could land in a different bucket. Using the real user ID post-login means any device the user logs into will always resolve to the same bucket.

The bucket change at the moment of login is accepted as a minor inconsistency. The pre-login surface (typically just the login/landing page) is small, and the analytics alias ensures that pre-login exposures are still correctly attributed.

#### Identity lifecycle

```
First visit (not logged in)   anonymous UUID generated, stored in cookie, used for bucketing
↓ login                       real userId becomes the bucket key; anonymous UUID + userId sent to backend for analytics alias
Logged-in session             real userId used for bucketing
Return visit (auto-login)     /me restores auth state; real userId used for bucketing
New device                    new anonymous UUID generated; aliased to real userId at login; real userId used for bucketing thereafter
```
