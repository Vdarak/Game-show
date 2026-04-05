# Token Handling Instructions (Frontend Guide)

This document explains the two types of authentication tokens used in the Trivi Time application, how they are generated, and how they should be passed to the backend API.

There are two primary roles that interact with the game execution endpoints:
1. **Admin (Master) Users:** Registered users who create games and manage the platform.
2. **Host Users:** Temporary users who are given a link and a PIN to host a specific game session on their device.

---

## 1. Admin Tokens

Admin tokens are standard JWTs issued to registered users of the platform.

### How they are generated
- **Endpoint:** `/auth/login` (or your standard login endpoint)
- **Flow:** The user logs in with their credentials. The backend returns a standard JWT access token containing their User ID.

### How to use them
- **Header:** Include the token in the `Authorization` header of your HTTP requests:
  ```http
  Authorization: Bearer <ADMIN_JWT_TOKEN>
  ```
- **Capabilities:** Admin tokens have unrestricted access. They can hit everything, from game creation, episode generation, host-link generation, to controlling active game sessions.

---

## 2. Host Tokens (The "Host-Link" Flow)

Host tokens are temporary, session-scoped JWTs. They allow a non-registered user to run a specific game session from their device (e.g., advancing questions, scoring).

### How they are generated
The frontend involves two steps to get a Host Token:

**Step A: The Admin creates the invite**
1. The Admin (using their Admin Token) calls `/host-link/generate` with an `IDEpisode`.
2. The API returns a URL-safe `token` and a `PIN`. 
3. The frontend displays an invite link (e.g., `https://yourapp.com/host/<token>`) and tells the Admin to share it along with the `PIN`.

**Step B: The Host claims the session**
1. The Host opens the link and sees a PIN entry screen.
2. The frontend calls the **public** endpoint `/host-link/validate` with the URL `Token` and the entered `PIN`:
   ```json
   POST /host-link/validate
   {
       "Token": "abc123xyz...",
       "PIN": "1234"
   }
   ```
3. **The Response:** The backend validates the PIN and returns the active `session` data **AND** a new `access_token`. 
   ```json
   {
       "session": { "IDGameSession": "...", "Status": "lobby", ... },
       "access_token": "eyJhbGciOiJIUzI1NiIsInR..." // <- THIS IS THE HOST JWT
   }
   ```

### How to use them
- **Header:** Just like the Admin token, include the Host JWT in the `Authorization` header:
  ```http
  Authorization: Bearer <HOST_JWT_TOKEN>
  ```
- **Capabilities & Restrictions:** 
  - **Allowed:** Game execution endpoints (`/sessions/start`, `/sessions/next-question`, `/sessions/grade`, `/sessions/kick`, `/episodes/get`, etc.).
  - **Session-Scoped:** The token is cryptographically bound to the specific `IDGameSession`. If the frontend tries to send a request for a different session ID, the backend will return a `403 Forbidden`.
  - **Admin-Locked:** If the Host token is used on an Admin-only endpoint (like creating new episodes or listing host links), the backend will return a `401 Unauthorized`.
  - **Revocation:** If the Admin revokes the host link from their dashboard (`/host-link/revoke`), or if the intended `ValidTo` time expires, the backend will immediately start returning `403 Forbidden` for all subsequent requests using this Host token, even if the token itself hasn't technically expired on the client side. If this happens, kick the host back to a logged-out or "Access Revoked" screen.