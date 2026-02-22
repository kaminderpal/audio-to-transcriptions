"use client";

import { FormEvent, useState } from "react";

type CreateIntentResponse = {
  uploadId?: string;
  bucket?: string;
  objectName?: string;
  contentType?: string;
  uploadUrl?: string;
  uploadExpiresAt?: string;
  error?: string;
};

type UploadIntent = {
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

const statusLabelMap: Record<UploadIntent["status"], string> = {
  intent_created: "Intent Created",
  uploaded: "Uploaded",
  processing_queued: "Queued",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed"
};

const statusToneMap: Record<UploadIntent["status"], string> = {
  intent_created: "bg-sky-100 text-sky-700 ring-sky-300/70",
  uploaded: "bg-cyan-100 text-cyan-700 ring-cyan-300/70",
  processing_queued: "bg-emerald-100 text-emerald-700 ring-emerald-300/70",
  processing: "bg-amber-100 text-amber-700 ring-amber-300/70",
  completed: "bg-teal-100 text-teal-700 ring-teal-300/70",
  failed: "bg-rose-100 text-rose-700 ring-rose-300/70"
};

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upload, setUpload] = useState<UploadIntent | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setError("Please choose an audio file first.");
      return;
    }

    if (!file.type.startsWith("audio/")) {
      setError("Only audio file types are allowed.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setUpload(null);

    try {
      const intentResponse = await fetch("/api/uploads/intents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type
        })
      });

      const intentData = (await intentResponse.json()) as CreateIntentResponse;

      if (!intentResponse.ok) {
        throw new Error(intentData.error ?? "Failed to create upload intent.");
      }

      if (!intentData.uploadId || !intentData.uploadUrl) {
        throw new Error("Upload intent response was invalid.");
      }

      const uploadResponse = await fetch(intentData.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type
        },
        body: file
      });

      if (!uploadResponse.ok) {
        throw new Error("Direct upload failed.");
      }

      const completeResponse = await fetch(
        `/api/uploads/${intentData.uploadId}/complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            fileSizeBytes: file.size
          })
        }
      );
      const completeData = (await completeResponse.json()) as UploadIntent & {
        error?: string;
      };

      if (!completeResponse.ok) {
        throw new Error(completeData.error ?? "Failed to finalize uploaded file.");
      }

      setUpload(completeData);
      await pollUploadStatus(intentData.uploadId);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unexpected error while uploading."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function pollUploadStatus(uploadId: string) {
    const maxAttempts = 60;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const response = await fetch(`/api/uploads/${uploadId}`, { cache: "no-store" });
      const data = (await response.json()) as UploadIntent & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to read upload status.");
      }

      setUpload(data);

      if (data.status === "completed" || data.status === "processing_queued") {
        return;
      }

      if (data.status === "failed") {
        throw new Error(data.error ?? "Upload failed.");
      }

      await new Promise((resolve) => setTimeout(resolve, 1200));
    }

    throw new Error("Upload is still in progress. Please check again.");
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-10 sm:px-6">
      <div
        className="pointer-events-none absolute -left-24 top-12 h-72 w-72 rounded-full bg-orange-300/25 blur-3xl animate-float"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 bottom-8 h-80 w-80 rounded-full bg-sky-300/30 blur-3xl animate-pulseSoft"
        aria-hidden
      />

      <section className="glass-panel relative mx-auto w-full max-w-4xl overflow-hidden p-6 sm:p-10 animate-reveal">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 shimmer-line animate-shimmer" />

        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange-700">
              WaveScribe
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              WaveScribe
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">
              Upload your audio file and continue in one smooth flow.
            </p>
          </div>

          {upload ? (
            <span
              className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusToneMap[upload.status]}`}
            >
              {statusLabelMap[upload.status]}
            </span>
          ) : null}
        </header>

        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <label className="group block rounded-2xl border border-slate-200 bg-white/90 p-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-lg">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Select audio file
            </span>
            <input
              type="file"
              accept="audio/*"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              disabled={isSubmitting}
              className="block w-full cursor-pointer text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-sky-600 file:px-4 file:py-2 file:font-semibold file:text-white file:transition file:duration-200 hover:file:bg-sky-500"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting || !file}
            className="h-fit rounded-2xl bg-gradient-to-r from-orange-500 to-sky-600 px-6 py-4 text-sm font-semibold text-white shadow-lg transition duration-300 hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Uploading / Finalizing..." : "Start Upload"}
          </button>
        </form>

        {error ? (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 animate-reveal">
            {error}
          </p>
        ) : null}

        {upload ? (
          <div className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white/75 p-5 animate-reveal">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              File Details
            </p>
            <p className="text-sm text-slate-700">
              <span className="font-semibold text-slate-900">Upload ID:</span> {upload.id}
            </p>
            <p className="text-sm text-slate-700">
              <span className="font-semibold text-slate-900">Bucket:</span> {upload.bucket}
            </p>
            <p className="text-sm text-slate-700 break-all">
              <span className="font-semibold text-slate-900">Object:</span> {upload.objectName}
            </p>
            <p className="text-sm text-slate-700 break-all">
              <span className="font-semibold text-slate-900">Tracking ID:</span>{" "}
              {upload.processingMessageId ?? "Preparing"}
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
