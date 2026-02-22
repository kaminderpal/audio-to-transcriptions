declare module "@google-cloud/storage" {
  type Credentials = {
    client_email: string;
    private_key: string;
  };

  type StorageOptions = {
    projectId?: string;
    credentials?: Credentials;
  };

  type SaveOptions = {
    resumable?: boolean;
    contentType?: string;
  };

  type SignedUrlOptions = {
    version: "v2" | "v4";
    action: "read" | "write" | "delete" | "resumable";
    expires: number | string | Date;
    contentType?: string;
  };

  type FileMetadata = {
    contentType?: string;
    size?: string;
  };

  class StorageFile {
    save(data: Buffer, options?: SaveOptions): Promise<void>;
    exists(): Promise<[boolean]>;
    getMetadata(): Promise<[FileMetadata]>;
    getSignedUrl(options: SignedUrlOptions): Promise<[string]>;
  }

  class StorageBucket {
    file(name: string): StorageFile;
  }

  export class Storage {
    constructor(options?: StorageOptions);
    bucket(name: string): StorageBucket;
  }
}
