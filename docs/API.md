# Trivi-Time API Documentation

> **Base URL:** `http://localhost:8000`
> **Swagger UI:** `http://localhost:8000/docs`
> **Content-Type:** `application/json` (all endpoints)

---

## Authentication

All endpoints marked **🔒 JWT** require:
```
Authorization: Bearer <access_token>
```

Endpoints marked **🌐 Public** require no authentication.

### `POST /auth/login` 🌐

Login as master user to get JWT token.

**Request:**
```json
{
  "Email": "admin@trivitime.com",
  "Password": "admin123"
}
```
**Default Credentials for login development environment**
```
    SECRET_KEY: str = "dev-secret-key"
    ADMIN_EMAIL: str = "admin@trivitime.com"
    ADMIN_PASSWORD: str = "changeme"
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user_id": "uuid-string",
  "email": "admin@trivitime.com",
  "display_name": "Admin"
}
```

---

## Episode Management

### `POST /episodes/create` 🔒

**Request:**
```json
{
  "Title": "Game Night Episode 1",
  "Description": "Our first trivia episode",
  "ThemeConfig": { "primaryColor": "#6C5CE7" },
  "SponsorConfig": { "name": "Acme Inc", "logo": "url" }
}
```
> `Description`, `ThemeConfig`, `SponsorConfig` are optional.

**Response (200):**
```json
{
  "IDEpisode": "uuid",
  "IDUser": "uuid",
  "Title": "Game Night Episode 1",
  "Description": "Our first trivia episode",
  "ThemeConfig": { "primaryColor": "#6C5CE7" },
  "SponsorConfig": null,
  "CreatedAt": "2026-02-28T12:00:00Z",
  "UpdatedAt": "2026-02-28T12:00:00Z"
}
```

---

### `POST /episodes/list` 🔒

**Request:**
```json
{}
```

**Response (200):** Array of `EpisodeOut` objects.

---

### `POST /episodes/get` 🔒

Returns episode with nested rounds and questions.

**Request:**
```json
{
  "IDEpisode": "uuid-string"
}
```

**Response (200):**
```json
{
  "IDEpisode": "uuid",
  "IDUser": "uuid",
  "Title": "Game Night Episode 1",
  "Description": "...",
  "ThemeConfig": null,
  "SponsorConfig": null,
  "CreatedAt": "...",
  "UpdatedAt": "...",
  "rounds": [
    {
      "IDRound": "uuid",
      "IDEpisode": "uuid",
      "RoundNumber": 1,
      "TimerSeconds": 20,
      "PointPoolOptions": [2, 4, 6, 8],
      "TimedBonusTiers": [{"within": 5, "bonus": 3}, {"within": 10, "bonus": 1}],
      "NegativeScoring": false,
      "ScoringMode": "both",
      "questions": [
        {
          "IDQuestion": "uuid",
          "IDRound": "uuid",
          "QuestionOrder": 1,
          "Category": "Geography",
          "QuestionText": "Capital of France?",
          "QuestionType": "multiple_choice",
          "CorrectAnswer": "Paris",
          "Options": ["London", "Paris", "Berlin", "Rome"],
          "QuestionVideoUrl": null,
          "AnswerVideoUrl": null,
          "TimerSecondsOverride": null,
          "ScoringModeOverride": null
        }
      ]
    }
  ]
}
```

---

### `POST /episodes/update` 🔒

**Request:** Only include fields you want to update.
```json
{
  "IDEpisode": "uuid-string",
  "Title": "Updated Title"
}
```

**Response (200):** Updated `EpisodeOut` object.

---

### `POST /episodes/delete` 🔒

**Request:**
```json
{
  "IDEpisode": "uuid-string"
}
```

**Response (200):**
```json
{ "deleted": true }
```

---

## Round Management

### `POST /rounds/create` 🔒

**Request:**
```json
{
  "IDEpisode": "uuid-string",
  "RoundNumber": 1,
  "TimerSeconds": 20,
  "PointPoolOptions": [2, 4, 6, 8],
  "TimedBonusTiers": [
    { "within": 5, "bonus": 3 },
    { "within": 10, "bonus": 1 }
  ],
  "NegativeScoring": false,
  "ScoringMode": "both"
}
```
> Defaults: `TimerSeconds=20`, `NegativeScoring=false`, `ScoringMode="both"`.

**Response (200):**
```json
{
  "IDRound": "uuid",
  "IDEpisode": "uuid",
  "RoundNumber": 1,
  "TimerSeconds": 20,
  "PointPoolOptions": [2, 4, 6, 8],
  "TimedBonusTiers": [...],
  "NegativeScoring": false,
  "ScoringMode": "both"
}
```

---

### `POST /rounds/update` 🔒

**Request:** Only include fields to update.
```json
{
  "IDRound": "uuid-string",
  "TimerSeconds": 30
}
```

**Response (200):** Updated `RoundOut` object.

---

### `POST /rounds/delete` 🔒

**Request:**
```json
{
  "IDRound": "uuid-string"
}
```

**Response (200):**
```json
{ "deleted": true }
```

---

## Question Management

### `POST /questions/create` 🔒

**Request:**
```json
{
  "IDRound": "uuid-string",
  "QuestionOrder": 1,
  "Category": "Geography",
  "QuestionText": "Capital of France?",
  "QuestionType": "multiple_choice",
  "CorrectAnswer": "Paris",
  "Options": ["London", "Paris", "Berlin", "Rome"],
  "TimerSecondsOverride": null,
  "ScoringModeOverride": null
}
```
> `Category`, `Options`, `TimerSecondsOverride`, `ScoringModeOverride` are optional.
> `QuestionType` options: `"multiple_choice"`, `"true_false"`, `"open_ended"`. Defaults to `"multiple_choice"`.

**Response (200):** `QuestionOut` object.

---

### `POST /questions/update` 🔒

**Request:** Only include fields to update.
```json
{
  "IDQuestion": "uuid-string",
  "QuestionText": "Updated question?"
}
```

---

### `POST /questions/delete` 🔒

```json
{ "IDQuestion": "uuid-string" }
```

---

### `POST /questions/move` 🔒

Move a question to a different round.

```json
{
  "IDQuestion": "uuid-string",
  "NewIDRound": "uuid-string"
}
```

---

### `POST /questions/upload-video` 🔒

```json
{
  "IDQuestion": "uuid-string",
  "VideoType": "question",
  "Base64Video": "base64-encoded-video-data"
}
```
> `VideoType`: `"question"` or `"answer"`.

---

## Session Management

### `POST /sessions/create` 🔒

Create a new game session. Generates room code + QR data.

**Request:**
```json
{
  "IDEpisode": "uuid-string"
}
```

**Response (200):**
```json
{
  "IDGameSession": "uuid",
  "IDEpisode": "uuid",
  "IDUser": "uuid",
  "RoomCode": "EMW3PN",
  "Status": "lobby",
  "CurrentRound": null,
  "CurrentQuestion": null,
  "QuestionStartedAt": null,
  "CreatedAt": "2026-02-28T12:00:00Z",
  "QRData": "trivitime://join/EMW3PN"
}
```

---

### `POST /sessions/status` 🌐

Get current session state.

**Request:**
```json
{
  "IDGameSession": "uuid-string"
}
```

**Response (200):** `SessionOut` + `team_count` (int).

---

### `POST /sessions/start` 🔒

Start the session: lobby → active. Sets Round 1, Question 1.

```json
{ "IDGameSession": "uuid-string" }
```

**Response:** `SessionOut` with `Status: "active"`, `CurrentRound: 1`, `CurrentQuestion: 1`.

---

### `POST /sessions/next-question` 🔒

Advance to next question. Auto-advances rounds. Auto-completes when no more questions.

```json
{ "IDGameSession": "uuid-string" }
```

---

### `POST /sessions/end` 🔒

Force-end a session.

```json
{ "IDGameSession": "uuid-string" }
```

**Response:** `SessionOut` with `Status: "completed"`.

---

## Host Links

### `POST /host-link/generate` 🔒

Generate a 24-hour shareable host link (creates a session).

```json
{ "IDEpisode": "uuid-string" }
```

**Response (200):**
```json
{
  "token": "url-safe-random-token",
  "expires_at": "2026-03-01T12:00:00Z",
  "IDGameSession": "uuid",
  "RoomCode": "PG833L"
}
```

---

### `POST /host-link/validate` 🌐

Validate a host link token. Returns the session (no login needed).

```json
{ "Token": "url-safe-random-token" }
```

**Response (200):** `SessionOut` object.

**Error (404):** Token invalid or expired.

---

## Player Actions (All Public — No Auth)

### `POST /sessions/join` 🌐

Join a session by room code. Creates a team and initializes point pools.

**Request:**
```json
{
  "RoomCode": "EMW3PN",
  "TeamName": "The Brainiacs",
  "AvatarBase64": "base64-encoded-image-or-null"
}
```
> `AvatarBase64` is optional.

**Response (200):**
```json
{
  "IDTeam": "uuid",
  "IDGameSession": "uuid",
  "TeamName": "The Brainiacs",
  "AvatarBlobPath": "/media/avatars/team-uuid.png",
  "JoinedAt": "2026-02-28T12:05:00Z"
}
```

**Errors:**
- `404` — Room code not found
- `400` — Session not in lobby / duplicate team name

---

### `POST /sessions/current-question` 🌐

Get the active question with the timer and available wager values for this team.

**Request:**
```json
{
  "IDGameSession": "uuid-string",
  "IDTeam": "uuid-string"
}
```

**Response (200):**
```json
{
  "IDQuestion": "uuid",
  "IDRound": "uuid",
  "QuestionOrder": 1,
  "Category": "Geography",
  "QuestionText": "Capital of France?",
  "QuestionType": "multiple_choice",
  "Options": ["London", "Paris", "Berlin", "Rome"],
  "QuestionVideoUrl": null,
  "TimerSeconds": 20,
  "AvailableWagers": [2, 4, 6, 8],
  "QuestionStartedAt": "2026-02-28T12:10:00Z"
}
```

> **Timer logic:** `TimerSeconds` = question's `TimerSecondsOverride` if set, otherwise round's `TimerSeconds`.
>
> **Timer starts** when the host calls `/sessions/start` or `/sessions/next-question`.
>
> **Front-end** should calculate remaining time: `TimerSeconds - (now - QuestionStartedAt)`.

---

### `POST /sessions/submit` 🌐

Submit an answer. Timer is validated server-side. Point pool is enforced.

**Request:**
```json
{
  "IDGameSession": "uuid-string",
  "IDTeam": "uuid-string",
  "IDQuestion": "uuid-string",
  "AnswerText": "Paris",
  "WageredPoints": 8
}
```

**Response (200):**
```json
{
  "IDResponse": "uuid",
  "IDTeam": "uuid",
  "IDQuestion": "uuid",
  "AnswerText": "Paris",
  "WageredPoints": 8,
  "SubmissionSeconds": 3.45,
  "WasOnTime": true,
  "TimedBonusAwarded": 3
}
```

**Errors:**
- `400` — Session not active / duplicate submission / invalid wager value
- `404` — Team or question not found

> **Late submissions** are saved but `WasOnTime = false` and they score 0 points.
> **Wager** must be one of the values in `AvailableWagers`. After submission, that value is removed from the pool.

---

### `POST /sessions/point-pool` 🌐

Check remaining wager values for the current round.

**Request:**
```json
{
  "IDGameSession": "uuid-string",
  "IDTeam": "uuid-string"
}
```

**Response (200):**
```json
{
  "IDRound": "uuid",
  "RoundNumber": 1,
  "AvailableValues": [2, 4, 6]
}
```

---

## Scoring + Management

### `POST /sessions/grade` 🔒

Grade all responses in a session. Auto-checks answers against `CorrectAnswer` (case-insensitive). Updates leaderboard.

**Request:**
```json
{ "IDGameSession": "uuid-string" }
```

**Response (200):**
```json
{
  "session_id": "uuid-string",
  "total_graded": 4,
  "responses": [
    {
      "IDResponse": "uuid",
      "IDTeam": "uuid",
      "IDQuestion": "uuid",
      "AnswerText": "Paris",
      "WageredPoints": 8,
      "IsCorrect": true,
      "WasOnTime": true,
      "TimedBonusAwarded": 3,
      "PointsAwarded": 11
    }
  ]
}
```

> **Scoring formula:**
> | Condition | Points |
> |-----------|--------|
> | Correct + On time | `WageredPoints + TimedBonusAwarded` |
> | Correct + Late | `0` |
> | Wrong + On time (neg scoring ON) | `-WageredPoints` |
> | Wrong + On time (neg scoring OFF) | `0` |
> | Wrong + Late | `0` |

---

### `POST /sessions/leaderboard` 🌐

**Request:**
```json
{ "IDGameSession": "uuid-string" }
```

**Response (200):**
```json
{
  "IDGameSession": "uuid-string",
  "entries": [
    {
      "IDTeam": "uuid",
      "TeamName": "Team Alpha",
      "AvatarBlobPath": "/media/avatars/uuid.png",
      "TotalScore": 14,
      "RoundScore": 8,
      "Rank": 1
    },
    {
      "IDTeam": "uuid",
      "TeamName": "Team Beta",
      "AvatarBlobPath": null,
      "TotalScore": 8,
      "RoundScore": 8,
      "Rank": 2
    }
  ]
}
```

---

### `POST /sessions/responses` 🔒

List all submitted responses for a session. Optionally filter by question.

**Request:**
```json
{
  "IDGameSession": "uuid-string",
  "IDQuestion": "uuid-string-or-null"
}
```

**Response (200):** Array of:
```json
{
  "IDResponse": "uuid",
  "IDTeam": "uuid",
  "IDQuestion": "uuid",
  "AnswerText": "Paris",
  "WageredPoints": 8,
  "IsCorrect": true,
  "WasOnTime": true,
  "TimedBonusAwarded": 3,
  "SubmissionSeconds": 3.45
}
```

---

### `POST /sessions/teams` 🌐

List all teams in a session.

```json
{ "IDGameSession": "uuid-string" }
```

**Response (200):** Array of:
```json
{
  "IDTeam": "uuid",
  "TeamName": "The Brainiacs",
  "AvatarBlobPath": "/media/avatars/uuid.png",
  "JoinedAt": "2026-02-28T12:05:00Z"
}
```

---

### `POST /sessions/kick` 🔒

Remove a team from a session. Also removes their responses and point pools (CASCADE).

```json
{
  "IDGameSession": "uuid-string",
  "IDTeam": "uuid-string"
}
```

**Response (200):**
```json
{ "kicked": true, "TeamName": "The Brainiacs" }
```

---

## Game Flow (Front-End Integration Guide)

```
1. Master logs in               → POST /auth/login
2. Master creates episode       → POST /episodes/create
3. Master adds rounds           → POST /rounds/create (×N)
4. Master adds questions        → POST /questions/create (×N)
5. Master creates session       → POST /sessions/create → gets RoomCode
6. Players join via room code   → POST /sessions/join (public)
7. Master starts game           → POST /sessions/start
   ┌────────────────────────────────────────────────────────┐
   │  QUESTION LOOP                                        │
   │  8. Players get question   → POST /sessions/current-question │
   │  9. Players submit answers → POST /sessions/submit    │
   │  10. Master grades         → POST /sessions/grade     │
   │  11. Show leaderboard      → POST /sessions/leaderboard │
   │  12. Master advances       → POST /sessions/next-question │
   │  (repeat until auto-completed)                        │
   └────────────────────────────────────────────────────────┘
13. Session auto-completes or   → POST /sessions/end
14. Final leaderboard           → POST /sessions/leaderboard
```

---

## Error Format

All errors return:
```json
{
  "detail": "Human-readable error message"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request (validation, duplicate, wrong state) |
| 401 | Unauthorized (missing/invalid JWT) |
| 404 | Not found |
| 500 | Server error |

---

## Notes for Front-End

1. **All IDs are UUIDs** — store as strings, pass as strings
2. **Timer is server-authoritative** — `QuestionStartedAt` is set server-side. Front-end calculates countdown: `TimerSeconds - (Date.now() - QuestionStartedAt)`
3. **Late answers are saved** — `WasOnTime=false`, they just score 0
4. **Point pool is per-round** — resets each round, values are removed as players wager
5. **Swagger UI** at `/docs` has interactive testing for all endpoints
6. **CORS is enabled** — all origins allowed in dev mode
