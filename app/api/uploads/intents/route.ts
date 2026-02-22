import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import {
  getBucketName,
  getSignedUrlExpiryMs,
  getStorageClient
} from "@/lib/gcp";
import { createUploadIntent } from "@/lib/upload-intents";
import { UploadIntentRecord } from "@/lib/types";

type CreateIntentRequest = {
  fileName?: string;
  contentType?: string;
};

const ALLOWED_CONTENT_TYPES = new Set([
  "audio/mpeg",
  "audio/wav",
  "audio/webm",
  "audio/mp4",
  "audio/x-m4a",
  "audio/ogg",
  "audio/flac"
]);

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateIntentRequest;
    const fileName = body.fileName?.trim();
    const contentType = body.contentType?.trim().toLowerCase();

    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: "fileName and contentType are required." },
        { status: 400 }
      );
    }

    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      return NextResponse.json(
        { error: "Unsupported audio content type." },
        { status: 400 }
      );
    }

    const bucketName = getBucketName();
    const uploadId = randomUUID();
    const safeName = sanitizeFileName(fileName);
    const objectName = `uploads/${uploadId}/${safeName}`;
    const expiresAtMs = Date.now() + getSignedUrlExpiryMs();
    const uploadExpiresAt = new Date(expiresAtMs).toISOString();

    const storage = getStorageClient();
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(objectName);
    const [signedUrl] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: expiresAtMs,
      contentType
    });

    const now = new Date().toISOString();
    const intent: UploadIntentRecord = {
      id: uploadId,
      status: "intent_created",
      bucket: bucketName,
      objectName,
      contentType,
      fileName: safeName,
      uploadExpiresAt,
      createdAt: now,
      updatedAt: now
    };

    await createUploadIntent(intent);

    return NextResponse.json(
      {
        uploadId,
        objectName,
        bucket: bucketName,
        contentType,
        uploadUrl: signedUrl,
        uploadExpiresAt
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create upload intent error:", error);
    return NextResponse.json(
      { error: "Unable to create upload intent." },
      { status: 500 }
    );
  }
}
