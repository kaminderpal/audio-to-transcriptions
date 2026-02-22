# WaveScribe

WaveScribe is a production-ready audio upload app built with Next.js.

System flow:
- Browser requests an upload intent from API
- API creates signed URL + durable record in Firestore
- Browser uploads directly to GCS using signed URL
- Browser calls complete endpoint
- API verifies object in GCS and publishes an event to Pub/Sub
- Worker service consumes Pub/Sub for downstream transcription workflow

## 1) Install

```bash
npm install
```

## 2) Configure environment variables

Create `.env.local`:

```bash
GCP_PROJECT_ID=your_project_id
GCS_BUCKET_NAME=your_bucket_name
GCP_PUBSUB_TOPIC=audio-upload-complete
UPLOAD_INTENTS_COLLECTION=upload_intents
SIGNED_URL_EXPIRES_SECONDS=900

# Option A: if running on GCP with Application Default Credentials, no extra vars needed.
# Option B: local/service account key via env vars:
# GCP_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
# GCP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## 3) Run

```bash
npm run dev
```

Open `http://localhost:3000` and upload an audio file.

## API

1) `POST /api/uploads/intents`

Request body:

```json
{
  "fileName": "speech.m4a",
  "contentType": "audio/x-m4a"
}
```

Response (`201`):

```json
{
  "uploadId": "uuid",
  "objectName": "uploads/<uploadId>/speech.m4a",
  "bucket": "your-bucket",
  "contentType": "audio/x-m4a",
  "uploadUrl": "https://storage.googleapis.com/...",
  "uploadExpiresAt": "2026-02-22T17:00:00.000Z"
}
```

2) Browser uploads file bytes directly to `uploadUrl` with `PUT` and header `Content-Type`.

3) `POST /api/uploads/<uploadId>/complete`

Request body:

```json
{
  "fileSizeBytes": 123456
}
```

Response (`200`):

```json
{
  "id": "uuid",
  "status": "processing_queued",
  "bucket": "your-bucket",
  "objectName": "uploads/<uploadId>/speech.m4a",
  "processingMessageId": "pubsub-message-id"
}
```

4) `GET /api/uploads/<uploadId>` to fetch durable status from Firestore.

## Production notes

- This code removes in-memory queue state and persists upload status in Firestore.
- Background work should run in a separate worker service subscribed to `GCP_PUBSUB_TOPIC`.
- Make worker idempotent using `uploadId` as idempotency key.
- Restrict CORS on bucket to your frontend origin only.
