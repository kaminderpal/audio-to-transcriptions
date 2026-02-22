import { Firestore } from "@google-cloud/firestore";
import { PubSub } from "@google-cloud/pubsub";
import { Storage } from "@google-cloud/storage";

function ensureEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getCredentials() {
  if (process.env.GCP_CLIENT_EMAIL && process.env.GCP_PRIVATE_KEY) {
    return {
      client_email: process.env.GCP_CLIENT_EMAIL,
      private_key: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, "\n")
    };
  }

  return undefined;
}

function getClientOptions() {
  const projectId = ensureEnv("GCP_PROJECT_ID");
  const credentials = getCredentials();

  if (!credentials) {
    return { projectId };
  }

  return {
    projectId,
    credentials
  };
}

let storageClient: Storage | null = null;
let firestoreClient: Firestore | null = null;
let pubsubClient: PubSub | null = null;

export function getStorageClient(): Storage {
  if (!storageClient) {
    storageClient = new Storage(getClientOptions());
  }

  return storageClient;
}

export function getFirestoreClient(): Firestore {
  if (!firestoreClient) {
    firestoreClient = new Firestore(getClientOptions());
  }

  return firestoreClient;
}

export function getPubsubClient(): PubSub {
  if (!pubsubClient) {
    pubsubClient = new PubSub(getClientOptions());
  }

  return pubsubClient;
}

export function getBucketName(): string {
  return ensureEnv("GCS_BUCKET_NAME");
}

export function getPubsubTopicName(): string {
  return ensureEnv("GCP_PUBSUB_TOPIC");
}

export function getUploadIntentsCollectionName(): string {
  return process.env.UPLOAD_INTENTS_COLLECTION ?? "upload_intents";
}

export function getSignedUrlExpiryMs(): number {
  const raw = process.env.SIGNED_URL_EXPIRES_SECONDS;
  const seconds = raw ? Number(raw) : 900;

  if (!Number.isFinite(seconds) || seconds < 60 || seconds > 3600) {
    throw new Error("SIGNED_URL_EXPIRES_SECONDS must be between 60 and 3600.");
  }

  return seconds * 1000;
}
