# Direct S3 Media Upload Guide (Frontend)

To prevent our API server from crashing under the weight of 1GB video uploads, the Trivi-Time backend utilizes **Presigned URLs**. This allows the React Frontend to upload bulky media directly into the `triviatime-media` AWS S3 bucket. 

This happens in a 3-step sequence: **Request permission, Upload straight to AWS, Confirm upload with backend.**

---

## The 3 Types of Videos
Our backend endpoints are specifically designed to accept three different types of video uploads. The payloads will differ slightly depending on what you are uploading.

### 1. `question`
A video played when a question is being asked.
* **Requires**: `question_id`

### 2. `answer` 
A video played revealing the answer to a question.
* **Requires**: `question_id`

### 3. `rules`
A video played at the start of an entire episode.
* **Requires**: `episode_id`

---

## The Workflow

### Step 1: Request an Upload URL
First, you tell the FastAPI backend *what* you intend to upload. It will respond with a large URL granting 60 minutes of access to upload a file to a specific AWS S3 path.

**Endpoint:** `POST /media/request-upload-url` (Requires Auth Bearer Token)

**Example Payload (Uploading an Episode Rules Video):**
```json
{
  "episode_id": "123e4567-e89b-12d3...", 
  "video_type": "rules",
  "filename": "my_rules_intro.mp4"
}
```

**Example Payload (Uploading a Question Video):**
```json
{
  "question_id": "987f6543-a21b-34c5...", 
  "video_type": "question",
  "filename": "question_1_clip.mp4"
}
```

**Response:**
```json
{
  "upload_url": "https://triviatime-media-1234.s3.amazonaws.com/...",
  "blob_path": "episodes/123/rules/video.mp4",
  "expires_in": 3600
}
```
*(Store the `blob_path` in a React state variable, you'll need it for Step 3).*

---

### Step 2: Push the File to S3
You now have the `upload_url`. Notice that you do **not** send this to FastAPI! You send the raw file bytes directly to the URL using a standard `PUT` request. It is critical that your frontend content-type matches what the browser is trying to send.

```javascript
// Example using standard fetch in React
const file = document.querySelector('input[type="file"]').files[0];

const s3Response = await fetch(upload_url, {
    method: 'PUT',
    headers: {
        'Content-Type': file.type // Crucial! usually 'video/mp4'
    },
    body: file
});

if (!s3Response.ok) {
    throw new Error('Failed to upload video to AWS S3');
}
```

---

### Step 3: Confirm Upload with Backend
AWS has your video, but the Trivi-Time PostgreSQL database doesn't know that yet! So we must ping the backend one final time to finalize the upload and attach the new video URL to the database record.

**Endpoint:** `POST /media/confirm-upload` (Requires Auth Bearer Token)

**Example Payload (Confirming an Episode Rules Video):**
```json
{
  "episode_id": "123e4567-e89b-12d3...", 
  "video_type": "rules",
  "blob_path": "episodes/123/rules/video.mp4" // From step 1!
}
```

**What happens on the backend:** 
FastAPI will ask S3 "Hey, is that file actually there?". S3 says yes, and FastAPI then updates the `Episode` table in the database with the final public link to the video!

---

## Playback

When fetching the standard `GET /episodes/{id}` or `GET /questions` endpoints, the backend will automatically include the full, public AWS S3 URL for any videos that have been successfully uploaded.

```json
{
  "id": "123",
  "title": "Welcome to Trivia",
  "rules_video_url": "https://triviatime-media-1234.s3.us-east-1.amazonaws.com/episodes/123/rules/video.mp4"
}
```

The React frontend simply drops that URL into a normal HTML5 `<video>` element. AWS handles all the heavy lifting of streaming it directly to the end user's device!
```html
<video controls width="100%">
    <source src="{episode.rules_video_url}" type="video/mp4" />
</video>
```
