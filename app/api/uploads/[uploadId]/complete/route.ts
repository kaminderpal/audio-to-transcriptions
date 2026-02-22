import { NextResponse } from "next/server";
import {
  getPubsubClient,
  getPubsubTopicName,
  getStorageClient
} from "@/lib/gcp";
import {
  getUploadIntent,
  markUploadFailed,
  updateUploadIntent
} from "@/lib/upload-intents";

type RouteContext = {
  params: Promise<{
    uploadId: string;
  }>;
};

type CompleteUploadRequest = {
  fileSizeBytes?: number;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { uploadId } = await context.params;
    const intent = await getUploadIntent(uploadId);
    if (!intent) {
      return NextResponse.json({ error: "Upload intent not found." }, { status: 404 });
    }

    if (intent.status === "processing_queued" || intent.status === "processing" || intent.status === "completed") {
      return NextResponse.json(intent);
    }

    if (intent.status === "failed") {
      return NextResponse.json(intent, { status: 409 });
    }

    const body = (await request.json().catch(() => ({}))) as CompleteUploadRequest;
    const storage = getStorageClient();
    const bucket = storage.bucket(intent.bucket);
    const file = bucket.file(intent.objectName);
    const [exists] = await file.exists();

    if (!exists) {
      return NextResponse.json(
        { error: "Uploaded file not found in bucket." },
        { status: 409 }
      );
    }

    const [metadata] = await file.getMetadata();
    if (metadata.contentType !== intent.contentType) {
      await markUploadFailed(uploadId, "Content type mismatch for uploaded object.");
      return NextResponse.json(
        { error: "Uploaded file content type does not match upload intent." },
        { status: 409 }
      );
    }

    const actualSize = Number(metadata.size ?? 0);
    if (body.fileSizeBytes && Number.isFinite(body.fileSizeBytes) && actualSize > 0 && body.fileSizeBytes !== actualSize) {
      await markUploadFailed(uploadId, "Uploaded file size mismatch.");
      return NextResponse.json(
        { error: "Uploaded file size does not match expected file size." },
        { status: 409 }
      );
    }

    await updateUploadIntent(uploadId, {
      status: "uploaded",
      fileSizeBytes: actualSize || body.fileSizeBytes
    });

    const topic = getPubsubClient().topic(getPubsubTopicName());
    const payload = {
      uploadId,
      bucket: intent.bucket,
      objectName: intent.objectName,
      contentType: intent.contentType
    };
    let messageId: string;
    try {
      messageId = await topic.publishMessage({
        data: Buffer.from(JSON.stringify(payload), "utf8"),
        attributes: {
          eventType: "upload.completed",
          uploadId
        }
      });
    } catch (publishError) {
      console.error("Publish to Pub/Sub failed:", publishError);
      return NextResponse.json(
        { error: "Upload is stored, but queueing failed. Retry complete endpoint." },
        { status: 503 }
      );
    }

    const updated = await updateUploadIntent(uploadId, {
      status: "processing_queued",
      processingMessageId: messageId
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Complete upload error:", error);
    return NextResponse.json(
      { error: "Unable to finalize upload." },
      { status: 500 }
    );
  }
}
