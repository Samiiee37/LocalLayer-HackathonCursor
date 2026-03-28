"use client";

import { useCallback, useState } from "react";

function useExaSearch() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [answer, setAnswer] = useState(null);
  const [citations, setCitations] = useState([]);

  const reset = useCallback(() => {
    setError(null);
    setAnswer(null);
    setCitations([]);
  }, []);

  const submit = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    setCitations([]);
    try {
      const res = await fetch("/api/exa/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Request failed");
      }
      setAnswer(typeof data.answer === "string" ? data.answer : "");
      setCitations(Array.isArray(data.citations) ? data.citations : []);
    } catch (err) {
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [query]);

  return {
    query,
    setQuery,
    loading,
    error,
    answer,
    citations,
    reset,
    submit,
  };
}

function ExaSearchCard({
  variant,
  onClose,
  query,
  setQuery,
  loading,
  error,
  answer,
  citations,
  reset,
  submit,
  formId,
  titleId,
}) {
  const isModal = variant === "modal";

  async function handleSubmit(e) {
    e.preventDefault();
    await submit();
  }

  const shell =
    isModal
      ? "flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-[1.75rem] border border-slate-200/90 bg-white shadow-2xl shadow-black/30"
      : "flex h-full min-h-0 w-full flex-col overflow-hidden border-slate-200/90 bg-white";

  return (
    <div className={shell} onClick={(e) => e.stopPropagation()}>
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 id={titleId} className="text-lg font-semibold text-slate-900">
            Web search
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">Answers from the web via Exa</p>
        </div>
        {isModal ? (
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
            aria-label="Close"
          >
            <span className="text-xl leading-none" aria-hidden>
              ×
            </span>
          </button>
        ) : null}
      </div>

      <form id={formId} onSubmit={handleSubmit} className="shrink-0 border-b border-slate-100 px-5 py-4">
        <label htmlFor={`exa-query-${formId}`} className="sr-only">
          Your question
        </label>
        <textarea
          id={`exa-query-${formId}`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What do you want to know?"
          rows={isModal ? 3 : 4}
          disabled={loading}
          className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
        />
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={reset}
            disabled={loading || (!answer && !error)}
            className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          >
            Clear
          </button>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-900/15 transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? "Searching…" : "Ask"}
          </button>
        </div>
      </form>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <span className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500" />
            <p className="text-sm text-slate-500">Finding relevant sources…</p>
          </div>
        ) : null}

        {!loading && error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}

        {!loading && !error && answer != null && answer !== "" ? (
          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Answer</p>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{answer}</div>
            </div>
            {citations.length > 0 ? (
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Sources</p>
                <ul className="space-y-2">
                  {citations.map((c, i) => (
                    <li key={`${c.url || "source"}-${i}`}>
                      {c.url ? (
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 transition hover:border-emerald-200 hover:bg-emerald-50/50"
                        >
                          <span className="line-clamp-2 text-sm font-medium text-emerald-800">
                            {c.title || c.url}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-slate-500">{c.url}</span>
                        </a>
                      ) : (
                        <span className="block rounded-lg border border-slate-100 px-3 py-2 text-sm text-slate-700">
                          {c.title || "Source"}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {!loading && !error && (answer == null || answer === "") ? (
          <p className="py-6 text-center text-sm text-slate-500">
            Ask anything — we&apos;ll search the web and summarize what&apos;s relevant.
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Small screens: search icon opens a modal. Large (lg+): same UI as a fixed right sidebar (no icon).
 */
export default function ExaSearchPanel({ open, onClose }) {
  const exa = useExaSearch();
  const { loading, reset, setQuery } = exa;

  const handleMobileClose = useCallback(() => {
    if (loading) return;
    reset();
    setQuery("");
    onClose();
  }, [loading, reset, setQuery, onClose]);

  return (
    <>
      {/* Mobile / tablet: modal (unchanged behavior; hidden from lg upward) */}
      <div
        className={
          open
            ? "fixed inset-0 z-[2100] flex items-end justify-center bg-slate-950/65 p-3 backdrop-blur-sm sm:items-center sm:p-4 lg:hidden"
            : "hidden"
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby="exa-search-title-modal"
        onClick={() => handleMobileClose()}
      >
        <ExaSearchCard
          variant="modal"
          onClose={handleMobileClose}
          formId="mobile"
          titleId="exa-search-title-modal"
          {...exa}
        />
      </div>

      {/* Large screens: inline right column — full panel, no overlay */}
      <aside
        className="hidden h-full min-h-0 w-[min(100%,420px)] shrink-0 flex-col border-l border-slate-200/90 bg-white shadow-[inset_1px_0_0_rgba(15,23,42,0.04)] lg:flex"
        aria-labelledby="exa-search-title-desktop"
      >
        <ExaSearchCard variant="inline" formId="desktop" titleId="exa-search-title-desktop" {...exa} />
      </aside>
    </>
  );
}
