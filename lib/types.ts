export type UploadStatus =
  | "intent_created"
  | "uploaded"
  | "processing_queued"
  | "processing"
  | "completed"
  | "failed";

export type UploadIntentRecord = {
  id: string;
  status: UploadStatus;
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
