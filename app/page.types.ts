export type CreateIntentResponse = {
  uploadId?: string;
  bucket?: string;
  objectName?: string;
  contentType?: string;
  uploadUrl?: string;
  uploadExpiresAt?: string;
  error?: string;
};

export type UploadIntent = {
  id: string;
  status:
    | "intent_created"
    | "uploaded"
    | "processing_queued"
    | "processing"
    | "completed"
    | "failed";
  bucket: string;
  objectName: string;
  contentType: string;
  fileName: string;
  fileSizeBytes?: number;
  uploadExpiresAt: string;
  createdAt: string;
  updatedAt: string;
  processingMessageId?: string;
  error?: string;
};
