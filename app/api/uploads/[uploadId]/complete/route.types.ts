export type RouteContext = {
  params: Promise<{
    uploadId: string;
  }>;
};

export type CompleteUploadRequest = {
  fileSizeBytes?: number;
};
