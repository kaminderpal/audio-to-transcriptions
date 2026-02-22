import { getFirestoreClient, getUploadIntentsCollectionName } from "@/lib/gcp";
import { UploadIntentRecord, UploadStatus } from "@/lib/types";

function getCollection() {
  return getFirestoreClient().collection(getUploadIntentsCollectionName());
}

export async function createUploadIntent(intent: UploadIntentRecord): Promise<void> {
  await getCollection().doc(intent.id).set(intent);
}

export async function getUploadIntent(id: string): Promise<UploadIntentRecord | null> {
  const snapshot = await getCollection().doc(id).get();
  if (!snapshot.exists) {
    return null;
  }

  return snapshot.data() as UploadIntentRecord;
}

export async function updateUploadIntent(
  id: string,
  updates: Partial<Omit<UploadIntentRecord, "id" | "createdAt">>
): Promise<UploadIntentRecord | null> {
  const docRef = getCollection().doc(id);
  const existing = await docRef.get();

  if (!existing.exists) {
    return null;
  }

  const payload = {
    ...updates,
    updatedAt: new Date().toISOString()
  };

  await docRef.set(payload, { merge: true });
  const updated = await docRef.get();
  return updated.data() as UploadIntentRecord;
}

export async function markUploadFailed(id: string, error: string): Promise<void> {
  await getCollection().doc(id).set(
    {
      status: "failed" satisfies UploadStatus,
      error,
      updatedAt: new Date().toISOString()
    },
    { merge: true }
  );
}
