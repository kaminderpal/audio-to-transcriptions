declare module "@google-cloud/firestore" {
  type Credentials = {
    client_email: string;
    private_key: string;
  };

  type FirestoreOptions = {
    projectId?: string;
    credentials?: Credentials;
  };

  type SetOptions = {
    merge?: boolean;
  };

  class DocumentSnapshot<T = Record<string, unknown>> {
    exists: boolean;
    data(): T;
  }

  class DocumentReference<T = Record<string, unknown>> {
    set(data: Partial<T>, options?: SetOptions): Promise<void>;
    get(): Promise<DocumentSnapshot<T>>;
  }

  class CollectionReference<T = Record<string, unknown>> {
    doc(id: string): DocumentReference<T>;
  }

  export class Firestore {
    constructor(options?: FirestoreOptions);
    collection(name: string): CollectionReference;
  }

  export const FieldValue: {
    serverTimestamp(): unknown;
  };
}
