# System Architecture Diagram

```mermaid
sequenceDiagram
    autonumber
    participant U as User Browser (Next.js UI)
    participant A as Next.js API
    participant S as Google Cloud Storage
    participant F as Firestore (upload_intents)
    participant P as Pub/Sub Topic
    participant W as Worker (Cloud Run/Function)

    U->>A: POST /api/uploads/intents (fileName, contentType)
    A->>S: Create signed PUT URL (short TTL, single object path)
    A->>F: Create upload_intents doc (status=intent_created)
    A-->>U: uploadId + uploadUrl + objectName + expiresAt

    U->>S: PUT file bytes directly to signed URL
    S-->>U: 200 OK (upload stored)

    U->>A: POST /api/uploads/{uploadId}/complete (fileSizeBytes)
    A->>S: Verify object exists + metadata/contentType/size
    A->>F: Update status=uploaded
    A->>P: Publish upload.completed {uploadId,bucket,objectName}
    A->>F: Update status=processing_queued + messageId
    A-->>U: processing_queued response

    U->>A: GET /api/uploads/{uploadId} (poll status)
    A->>F: Read durable status
    A-->>U: status payload

    P-->>W: Deliver message
    W->>F: status=processing
    W->>W: Transcription/processing pipeline
    W->>F: status=completed (or failed + error)
```

```mermaid
flowchart LR
    UI[Browser UI] --> API[Next.js API]
    API --> FS[(Firestore upload_intents)]
    API --> GCS[(GCS Bucket)]
    API --> TOPIC[(Pub/Sub Topic)]
    UI -->|Direct PUT via signed URL| GCS
    TOPIC --> WORKER[Async Worker]
    WORKER --> FS
```

## Notes

- Audio bytes do not pass through your Next.js server.
- Upload state is durable in Firestore.
- Async processing is decoupled via Pub/Sub + worker.
- User-facing status comes from polling `GET /api/uploads/{uploadId}`.
