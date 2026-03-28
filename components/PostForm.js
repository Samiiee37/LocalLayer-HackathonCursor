"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const CATEGORIES = [
  { id: "emergency", label: "Emergency" },
  { id: "update", label: "Update" },
  { id: "event", label: "Event" },
];

/**
 * Compose a post: type + optional text, photo, voice — uploads go to Convex storage first.
 */
export default function PostForm({
  lat,
  lng,
  onSubmit,
  disabled,
  hint,
  onClose,
  variant = "default",
  generateUploadUrl,
  getStorageReadUrl,
  onError,
}) {
  const [category, setCategory] = useState("update");
  const [body, setBody] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);
  const [recState, setRecState] = useState("idle");
  const [submitting, setSubmitting] = useState(false);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const fileInputRef = useRef(null);

  const isGlass = variant === "glass";
  const isLight = variant === "light";

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  useEffect(() => {
    if (!audioBlob) {
      setAudioPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(audioBlob);
    setAudioPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audioBlob]);

  const uploadFile = useCallback(
    async (file) => {
      const postUrl = await generateUploadUrl();
      const res = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!res.ok) throw new Error("Upload failed");
      const json = await res.json();
      return json.storageId;
    },
    [generateUploadUrl],
  );

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Microphone not supported in this browser.");
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
    const mr = new MediaRecorder(stream, { mimeType: mime });
    chunksRef.current = [];
    mr.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mime });
      setAudioBlob(blob);
      stream.getTracks().forEach((t) => t.stop());
      setRecState("done");
    };
    mr.start(200);
    mediaRecorderRef.current = mr;
    setRecState("recording");
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
  };

  const clearAudio = () => {
    setAudioBlob(null);
    setRecState("idle");
  };

  const clearImage = () => {
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const canSubmit =
    lat != null &&
    lng != null &&
    (body.trim().length > 0 || imageFile != null || audioBlob != null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit || disabled || submitting) return;
    setSubmitting(true);
    try {
      let imageId;
      let audioId;
      if (imageFile) imageId = await uploadFile(imageFile);
      if (audioBlob) {
        const file = new File([audioBlob], "voice.webm", { type: audioBlob.type });
        audioId = await uploadFile(file);
      }

      let imageUrl;
      let audioUrl;
      if (imageId && getStorageReadUrl) imageUrl = await getStorageReadUrl(imageId);
      if (audioId && getStorageReadUrl) audioUrl = await getStorageReadUrl(audioId);

      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: body.trim(),
          imageUrl: imageUrl || undefined,
          audioUrl: audioUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not process post");
      }

      await onSubmit({
        title: data.title,
        body: body.trim(),
        transcribedText: data.transcribedText || undefined,
        category,
        imageId,
        audioId,
        translatedEn: data.translatedEn || undefined,
        sourceLang: data.sourceLang ?? "und",
      });

      setBody("");
      clearImage();
      clearAudio();
    } catch (err) {
      console.error(err);
      onError?.(err?.message || "Could not post");
    } finally {
      setSubmitting(false);
    }
  }

  const labelCls = isGlass
    ? "text-slate-200"
    : isLight
      ? "text-slate-800"
      : "text-slate-700 dark:text-slate-200";
  const inputCls = isGlass
    ? "rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
    : isLight
      ? "rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
      : "rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 dark:text-slate-100";

  const busy = disabled || submitting;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <span className={`text-sm font-medium ${labelCls}`}>New post</span>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className={`rounded-md p-1.5 ${isGlass ? "text-slate-400 hover:bg-white/10" : isLight ? "text-slate-500 hover:bg-slate-100" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"}`}
            aria-label="Close"
          >
            <span className="text-lg leading-none" aria-hidden>
              ×
            </span>
          </button>
        ) : null}
      </div>

      <div>
        <p className={`mb-2 text-xs font-medium uppercase tracking-wide ${isLight ? "text-slate-500" : "text-slate-400"}`}>
          Type
        </p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              disabled={busy}
              className={`rounded-full px-4 py-2 text-sm font-medium ring-1 transition ${
                category === c.id
                  ? "bg-slate-900 text-white ring-slate-900"
                  : "bg-slate-100 text-slate-800 ring-slate-200 hover:bg-slate-200"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="post-body" className={`mb-1 block text-sm font-medium ${labelCls}`}>
          Text <span className="font-normal text-slate-500">(optional if you add media)</span>
        </label>
        <textarea
          id="post-body"
          name="body"
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What’s happening?"
          className={`w-full ${inputCls}`}
          disabled={busy}
          maxLength={2000}
        />
      </div>

      <div>
        <p className={`mb-2 text-sm font-medium ${labelCls}`}>Photo</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            id="post-image"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              setImageFile(f ?? null);
            }}
          />
          <label
            htmlFor="post-image"
            className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-medium ${
              isLight ? "border-slate-200 bg-white hover:bg-slate-50" : "border-slate-600 bg-slate-800 hover:bg-slate-700"
            } ${busy ? "pointer-events-none opacity-50" : ""}`}
          >
            Choose image
          </label>
          {imageFile ? (
            <button type="button" onClick={clearImage} disabled={busy} className="text-sm text-red-600 hover:underline">
              Remove
            </button>
          ) : null}
        </div>
        {imagePreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagePreview} alt="" className="mt-2 max-h-40 rounded-lg object-cover" />
        ) : null}
      </div>

      <div>
        <p className={`mb-2 text-sm font-medium ${labelCls}`}>Voice note</p>
        <div className="flex flex-wrap items-center gap-2">
          {recState === "idle" && !audioBlob ? (
            <button
              type="button"
              onClick={startRecording}
              disabled={busy}
              className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              Record
            </button>
          ) : null}
          {recState === "recording" ? (
            <button
              type="button"
              onClick={stopRecording}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Stop
            </button>
          ) : null}
          {audioBlob && audioPreviewUrl ? (
            <>
              <audio src={audioPreviewUrl} controls className="h-9 max-w-full" />
              <button type="button" onClick={clearAudio} disabled={busy} className="text-sm text-red-600 hover:underline">
                Remove voice
              </button>
            </>
          ) : null}
        </div>
        {recState === "recording" ? (
          <p className="mt-1 text-xs text-red-600">Recording…</p>
        ) : null}
      </div>

      {hint ? (
        <p className={`text-xs ${isGlass ? "text-amber-200/80" : isLight ? "text-amber-700" : "text-slate-500"}`}>{hint}</p>
      ) : null}

      <button
        type="submit"
        disabled={busy || !canSubmit}
        className={
          isGlass
            ? "rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-6 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50"
            : isLight
              ? "rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-900/15 transition hover:bg-emerald-500 disabled:opacity-50"
              : "rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
        }
      >
        {busy ? "Working…" : "Post"}
      </button>
    </form>
  );
}
