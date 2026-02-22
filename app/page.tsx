"use client";

import { FormEvent, useMemo, useState } from "react";

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
  intent_created: "bg-cyan-200 text-slate-950",
  uploaded: "bg-sky-200 text-slate-950",
  processing_queued: "bg-lime-200 text-slate-950",
  processing: "bg-amber-200 text-slate-950",
  completed: "bg-emerald-200 text-slate-950",
  failed: "bg-rose-300 text-slate-950"
};

const stages: Array<UploadIntent["status"]> = [
  "intent_created",
  "uploaded",
  "processing_queued",
  "processing",
  "completed"
];

function formatBytes(size?: number) {
  if (!size) {
    return "Unknown";
  }
  if (size < 1024) {
    return `${size} B`;
  }
  const kb = size / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  return `${(kb / 1024).toFixed(2)} MB`;
}

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upload, setUpload] = useState<UploadIntent | null>(null);

  const activeStageIndex = useMemo(() => {
    if (!upload) {
      return isSubmitting ? 0 : -1;
    }
    if (upload.status === "failed") {
      return -1;
    }
    return stages.indexOf(upload.status);
  }, [upload, isSubmitting]);

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
    <main className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 sm:py-10">
      <section className="arcade-shell rise">
        <div className="grid-overlay" aria-hidden />
        <div className="relative z-10">
          <div className="mb-5">
            <p className="mb-2 inline-flex rounded-full border border-white/25 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
              WaveScribe Uplink
            </p>
            <h1 className="text-4xl leading-[0.92] text-white sm:text-6xl">
              AUDIO
              <br />
              TRANSFER
              <br />
              GRID
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
              Neon control surface for direct audio uploads, verification, and processing
              handoff status.
            </p>
          </div>

          <div className="neon-line mb-5" />

          <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <article className="arcade-panel rise-delay space-y-4">
              <header className="flex items-center justify-between gap-3">
                <h2 className="text-2xl text-white sm:text-3xl">Transfer Stages</h2>
                {upload ? (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${statusToneMap[upload.status]}`}
                  >
                    {statusLabelMap[upload.status]}
                  </span>
                ) : null}
              </header>

              <div className="status-rail">
                {stages.map((stage, index) => {
                  const isActive = activeStageIndex === index;
                  const isDone = activeStageIndex > index;

                  return (
                    <div key={stage} className="status-node">
                      <p className="text-sm font-medium uppercase tracking-[0.08em] text-slate-200">
                        {String(index + 1).padStart(2, "0")} {statusLabelMap[stage]}
                      </p>
                      <span
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${
                          isActive
                            ? "border-cyan-300 bg-cyan-300/20 text-cyan-200"
                            : isDone
                              ? "border-lime-300 bg-lime-300/20 text-lime-200"
                              : "border-slate-600 bg-slate-800/50 text-slate-400"
                        }`}
                      >
                        {isActive ? "Live" : isDone ? "Done" : "Standby"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </article>

            <aside className="arcade-panel rise-delay space-y-4">
              <h2 className="text-2xl text-white sm:text-3xl">Upload Console</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block rounded-xl border border-white/20 bg-white/5 p-4">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                    Select Audio
                  </span>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                    disabled={isSubmitting}
                    className="block w-full cursor-pointer text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-300 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-950 hover:file:bg-cyan-200"
                  />
                </label>

                {file ? (
                  <p className="rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-xs text-slate-300">
                    {file.name} ({formatBytes(file.size)})
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmitting || !file}
                  className="w-full rounded-xl bg-lime-300 px-4 py-3 text-sm font-semibold uppercase tracking-[0.1em] text-slate-950 transition hover:-translate-y-0.5 hover:bg-lime-200 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {isSubmitting ? "Uploading / Finalizing..." : "Start Upload"}
                </button>
              </form>

              {error ? (
                <p className="rounded-xl border border-rose-300/50 bg-rose-300/20 px-3 py-2 text-sm text-rose-200">
                  {error}
                </p>
              ) : null}

              {upload ? (
                <div className="space-y-2 rounded-xl border border-white/20 bg-black/20 p-4 text-sm text-slate-300">
                  <p>
                    <span className="font-semibold text-white">Upload ID:</span> {upload.id}
                  </p>
                  <p>
                    <span className="font-semibold text-white">Bucket:</span> {upload.bucket}
                  </p>
                  <p className="break-all">
                    <span className="font-semibold text-white">Object:</span> {upload.objectName}
                  </p>
                  <p className="break-all">
                    <span className="font-semibold text-white">Tracking ID:</span>{" "}
                    {upload.processingMessageId ?? "Preparing"}
                  </p>
                </div>
              ) : null}
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
