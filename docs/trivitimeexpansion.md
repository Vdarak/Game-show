# Configurable Rules with Video Support

Add per-episode customizable rules content and an optional rules video. Rules text shows on both gameboard and player screens; video shows only on the gameboard. The host controller button updates to "Show Rules with Video" when a video is present.

## User Review Required

> [!IMPORTANT]
> **Backend changes needed.** Two new fields must be added to the Episode model on the Python/FastAPI backend:
> - `RulesContent: list[str] | None` — an array of rule strings (or `None` for defaults)
> - `RulesVideoUrl: str | None` — URL of uploaded rules video (stored in blob storage like question videos)
>
> These fields need to be:
> 1. Added to the Episode database model/table (migration or schema update)
> 2. Accepted in `POST /episodes/create` and `POST /episodes/update`
> 3. Returned in `POST /episodes/get` and `POST /episodes/list`
> 4. A new endpoint `POST /episodes/upload-rules-video` (similar to `/questions/upload-video`) to handle base64 video upload
>
> **I can only implement the frontend changes.** Please confirm the backend field names and the upload endpoint path so the frontend matches.

> [!WARNING]
> Until the backend is updated, the new fields will be `undefined` on API responses. The frontend will gracefully fall back to default hardcoded rules when these fields are missing.

## Proposed Changes

### API Types & Client

#### [MODIFY] [api-types.ts](file:///Users/vedantsmacmini/Desktop/Code/game-show/lib/api-types.ts)
- Add `RulesContent?: string[]` and `RulesVideoUrl?: string | null` to [Episode](file:///Users/vedantsmacmini/Desktop/Code/game-show/lib/api-types.ts#46-56), [CreateEpisodeRequest](file:///Users/vedantsmacmini/Desktop/Code/game-show/lib/api-types.ts#31-37), [UpdateEpisodeRequest](file:///Users/vedantsmacmini/Desktop/Code/game-show/lib/api-types.ts#38-45)
- Add `UploadRulesVideoRequest` type (similar to [UploadVideoRequest](file:///Users/vedantsmacmini/Desktop/Code/game-show/lib/api-types.ts#153-158)) and response type

#### [MODIFY] [api-client.ts](file:///Users/vedantsmacmini/Desktop/Code/game-show/lib/api-client.ts)
- Add `uploadRulesVideo()` method to `episodesApi`

---

### Episode Editor — Rules Configuration

#### [MODIFY] [episode-editor.tsx](file:///Users/vedantsmacmini/Desktop/Code/game-show/components/game/episode-editor.tsx)
- Add a **"Rules"** section in the episode editor (above rounds navigation or as a tab)
- Textarea for rule items (one per line, converts to/from `string[]`)
- Video upload widget for rules video (reuse the same base64 upload pattern from `QuestionCard.handleVideoUpload`)
- Preview of uploaded video with remove button
- Default placeholder text showing the standard rules when field is empty

---

### Gameboard — Dynamic Rules Display

#### [MODIFY] [gameboard/page.tsx](file:///Users/vedantsmacmini/Desktop/Code/game-show/app/trivia/display/gameboard/page.tsx)
- In the `rules` GameState section (~line 421-455), replace the hardcoded 4-card grid with:
  - Dynamic rules list from `episode.RulesContent` (fall back to defaults if empty/null)
  - Rules video player (if `episode.RulesVideoUrl` exists) — displayed alongside the rules list
- Layout: side-by-side (video left, rules right) when video exists; centered rules list when no video

---

### Player Game — Dynamic Rules Display

#### [MODIFY] [game/page.tsx](file:///Users/vedantsmacmini/Desktop/Code/game-show/app/play/game/page.tsx)
- In the `rules` case (~line 212-241), replace hardcoded rule cards with:
  - Dynamic rules list from episode data (use `sessionStatus` to access rules, or fetch once)
  - **No video** — player screens only show text rules
- Fall back to default rules if episode data not available

---

### Host Controller — Button Label

#### [MODIFY] [question-orchestration-controls.tsx](file:///Users/vedantsmacmini/Desktop/Code/game-show/components/game/question-orchestration-controls.tsx)
- The "Rules" button label during `welcome` state should change to:
  - **"Show Rules with Video"** when `episode.RulesVideoUrl` exists
  - **"Show Rules"** when no video
- This requires passing the episode data (or just a `hasRulesVideo` boolean) down to this component

#### [MODIFY] [trivia/host/[token]/page.tsx](file:///Users/vedantsmacmini/Desktop/Code/game-show/app/trivia/host/%5Btoken%5D/page.tsx)
- Pass `hasRulesVideo` prop to orchestration controls (derived from episode data)

---

### Default Rules Content

When `RulesContent` is `null`/`undefined`/empty, fall back to these defaults:

```
[
  "6 rounds with 3 questions each, plus a Halftime and Final Question — Total of 20 questions",
  "Submit answers on your phone within the time limit",
  "No negative points for wrong answers for most rounds — submit an answer for everything!",
  "Use each point value only ONCE per Round. Values refresh each new round",
  "Play with an Unlimited Number of teams. Recommended Team size is 2-5 Players",
  "DO NOT use phones to look up answers!",
  "Team with the highest score wins",
  "Possible Bonus Points for Special Activities during Halftime"
]
```

## Verification Plan

### Manual Verification
1. After backend changes are deployed, create/edit an episode in the Episode Editor
2. Add custom rules text and upload a rules video
3. Start a session and advance to the "Rules" game state
4. **Gameboard**: Verify custom rules + video display side-by-side
5. **Player screen**: Verify only custom rules text shows (no video)
6. **Host controller**: Verify button says "Show Rules with Video" when video exists
7. Test fallback: create episode with no custom rules — verify default rules appear
8. Build verification: `npx next build` passes cleanly
