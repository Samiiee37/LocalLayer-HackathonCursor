"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConvexProvider } from "convex/react";
import { convex } from "@/lib/convexClient";
import { usePosts } from "@/hooks/usePosts";
import PostForm from "@/components/PostForm";
import PostCard from "@/components/PostCard";
import {
  CATEGORY_LABEL,
  featuredCardClasses,
  featuredLabelClasses,
} from "@/lib/categoryTheme";
import {
  geolocationPositionToPin,
  HIGH_ACCURACY_GEO_OPTIONS,
  MAP_RADIUS_KM,
  truncate,
} from "@/lib/utils";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-3 bg-slate-200/90"
      role="status"
      aria-live="polite"
    >
      <span className="h-9 w-9 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-500" />
      <span className="text-sm font-medium text-slate-600">Loading map…</span>
    </div>
  ),
});

const DEFAULT_CENTER = [20, 0];
const DEFAULT_ZOOM = 2;
const LOC_ZOOM = 17;

function IconHome(props) {
  return (
    <svg className={props.className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function IconLocate(props) {
  return (
    <svg className={props.className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function IconFilter(props) {
  return (
    <svg className={props.className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  );
}

function filterChipClass(id, active) {
  const base =
    "rounded-xl px-3.5 py-2 text-xs font-semibold tracking-wide transition sm:px-4 sm:text-[13px]";
  if (!active) {
    return `${base} bg-white/10 text-zinc-300 hover:bg-white/[0.14]`;
  }
  if (id === "all") return `${base} bg-white text-slate-900 shadow-sm`;
  if (id === "emergency") return `${base} bg-red-500 text-white shadow-md shadow-red-900/30`;
  if (id === "update") return `${base} bg-amber-400 text-slate-900 shadow-md shadow-amber-900/20`;
  if (id === "event") return `${base} bg-emerald-500 text-white shadow-md shadow-emerald-950/30`;
  return `${base} bg-white text-slate-900`;
}

function MapShell() {
  const [pickLatLng, setPickLatLng] = useState(null);
  const { posts, isLoading, createPost, generateUploadUrl, getStorageReadUrl } = usePosts(pickLatLng);
  const [locationLoading, setLocationLoading] = useState(true);
  const [hint, setHint] = useState(null);
  const [busy, setBusy] = useState(false);
  const [recenterTick, setRecenterTick] = useState(0);
  const [composerOpen, setComposerOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const hasReceivedFixRef = useRef(false);

  const filteredPosts = useMemo(() => {
    if (categoryFilter === "all") return posts;
    return posts.filter((p) => p.category === categoryFilter);
  }, [posts, categoryFilter]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationLoading(false);
      setHint("Geolocation is not available in this browser.");
      return;
    }

    let cancelled = false;

    function markFirstFix() {
      if (!hasReceivedFixRef.current) {
        hasReceivedFixRef.current = true;
        setRecenterTick((t) => t + 1);
      }
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (cancelled) return;
        const pin = geolocationPositionToPin(pos);
        setPickLatLng(pin);
        setLocationLoading(false);
        setHint(null);
        markFirstFix();
      },
      (err) => {
        if (cancelled) return;
        setLocationLoading(false);
        if (err.code === 1) {
          setHint("Location blocked — allow Location in the browser bar, then reload.");
        } else {
          setHint("Could not read GPS. Check permissions.");
        }
      },
      HIGH_ACCURACY_GEO_OPTIONS,
    );

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        const pin = geolocationPositionToPin(pos);
        setPickLatLng((prev) => {
          if (!prev) return pin;
          return pin.accuracyMeters < prev.accuracyMeters ? pin : prev;
        });
        setLocationLoading(false);
        setHint(null);
        markFirstFix();
      },
      undefined,
      HIGH_ACCURACY_GEO_OPTIONS,
    );

    return () => {
      cancelled = true;
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const recenterMapOnly = useCallback(() => {
    if (pickLatLng) setRecenterTick((t) => t + 1);
  }, [pickLatLng]);

  async function handleComposerSubmit(payload) {
    if (!pickLatLng) {
      setHint("Waiting for GPS — allow location.");
      return;
    }
    setBusy(true);
    setHint(null);
    try {
      await createPost({
        title: payload.title,
        body: payload.body ?? "",
        transcribedText: payload.transcribedText,
        category: payload.category,
        translatedEn: payload.translatedEn,
        sourceLang: payload.sourceLang,
        imageId: payload.imageId,
        audioId: payload.audioId,
        lat: pickLatLng.lat,
        lng: pickLatLng.lng,
      });
      setComposerOpen(false);
    } catch (e) {
      const msg = e?.message || "Something went wrong";
      setHint(msg);
      throw e;
    } finally {
      setBusy(false);
    }
  }

  const pills = [
    { id: "all", label: "All" },
    { id: "emergency", label: "Emergency" },
    { id: "update", label: "Update" },
    { id: "event", label: "Event" },
  ];

  const featured = filteredPosts[0];
  const listPosts = filteredPosts.slice(1);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-slate-950 text-slate-900">
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0 z-0">
          <MapView
            initialCenter={DEFAULT_CENTER}
            initialZoom={DEFAULT_ZOOM}
            posts={filteredPosts}
            pickLatLng={pickLatLng}
            recenterTick={recenterTick}
            recenterZoom={LOC_ZOOM}
          />
        </div>

        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-24 bg-gradient-to-b from-black/35 to-transparent"
          aria-hidden
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-4">
          {hint && !composerOpen ? (
            <div className="pointer-events-auto mx-auto max-w-lg rounded-2xl border border-amber-500/30 bg-amber-950/90 px-4 py-2.5 text-center text-xs font-medium text-amber-100 shadow-lg backdrop-blur-md sm:text-sm">
              {hint}
            </div>
          ) : null}

          <div className="flex items-start justify-between gap-2">
            <Link
              href="/"
              className="pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900/90 text-zinc-100 shadow-lg shadow-black/25 ring-1 ring-white/10 backdrop-blur-md transition hover:bg-slate-800 active:scale-[0.97]"
              aria-label="Back to home"
            >
              <IconHome className="h-5 w-5" />
            </Link>

            <div className="pointer-events-auto flex min-w-0 flex-1 justify-center">
              <div
                className="flex max-w-full flex-wrap items-center justify-center gap-1 rounded-2xl bg-slate-900/90 p-1.5 shadow-lg shadow-black/30 ring-1 ring-white/10 backdrop-blur-md"
                role="group"
                aria-label="Filter by post type"
              >
                {pills.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setCategoryFilter(p.id)}
                    className={filterChipClass(p.id, categoryFilter === p.id)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="pointer-events-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-lg font-light leading-none text-white shadow-lg shadow-emerald-950/50 ring-2 ring-white/25 transition hover:bg-emerald-400 active:scale-[0.97]"
              aria-label="New post"
            >
              +
            </button>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-[min(44vh,400px)] right-3 z-10 sm:bottom-6 sm:right-5">
          <button
            type="button"
            onClick={recenterMapOnly}
            disabled={!pickLatLng}
            aria-label="Recenter on my location"
            className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-800 shadow-xl shadow-black/15 ring-1 ring-slate-200/80 transition hover:bg-slate-50 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-35"
          >
            <IconLocate className="h-6 w-6 text-emerald-600" />
          </button>
        </div>

        {locationLoading && !pickLatLng ? (
          <div className="pointer-events-none absolute bottom-[min(48vh,420px)] left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/20 bg-slate-900/90 px-4 py-2 text-xs font-medium text-zinc-200 shadow-lg backdrop-blur-md sm:bottom-[min(44vh,400px)]">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-500 border-t-emerald-400" />
            Finding your location…
          </div>
        ) : null}
      </div>

      <aside className="relative z-20 flex max-h-[min(44vh,400px)] min-h-[220px] shrink-0 flex-col rounded-t-[1.75rem] border border-slate-200/80 border-b-0 bg-gradient-to-b from-slate-50 to-white shadow-[0_-12px_48px_rgba(15,23,42,0.12)]">
        <div className="flex justify-center pt-2.5 pb-1" aria-hidden>
          <div className="h-1 w-12 rounded-full bg-slate-300/80" />
        </div>

        <div className="flex items-center justify-between gap-3 border-b border-slate-200/90 px-4 pb-3 pt-1 sm:px-5">
          <Link
            href="/"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 ring-1 ring-slate-200/80 transition hover:bg-slate-200/80"
            aria-label="Home"
          >
            <IconHome className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-[15px] font-semibold tracking-tight text-slate-900">Nearby</p>
            <p className="text-[11px] font-medium text-slate-500">
              {MAP_RADIUS_KM} km radius · {filteredPosts.length} {filteredPosts.length === 1 ? "post" : "posts"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 ring-1 ring-slate-200/80 transition hover:bg-slate-200/80"
            aria-label="Reset filters to all"
          >
            <IconFilter className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1 sm:px-5">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500" />
              <p className="text-sm font-medium text-slate-500">Loading posts…</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 ring-1 ring-slate-200/80">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-base font-semibold text-slate-800">Nothing nearby yet</p>
              <p className="max-w-xs text-sm leading-relaxed text-slate-500">
                Be the first to share an update, event, or alert within {MAP_RADIUS_KM} km.
              </p>
              <button
                type="button"
                onClick={() => setComposerOpen(true)}
                className="mt-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-900/20 transition hover:bg-emerald-500"
              >
                Create a post
              </button>
            </div>
          ) : (
            <>
              {featured ? (
                <div className={featuredCardClasses(featured)}>
                  <p className={featuredLabelClasses(featured)}>
                    Featured · {CATEGORY_LABEL[featured.category] ?? "Update"}
                  </p>
                  <p className="mt-2 line-clamp-3 text-base font-semibold leading-snug text-slate-900">
                    {truncate(
                      featured.title ||
                        featured.translatedEn ||
                        featured.body ||
                        (((featured.imageUrls?.length ?? 0) > 0 || featured.imageUrl) && featured.audioUrl
                          ? "Photo and voice note"
                          : (featured.imageUrls?.length ?? 0) > 0 || featured.imageUrl
                            ? "Photo post"
                            : featured.audioUrl
                              ? "Voice note"
                              : "Post"),
                      140,
                    )}
                  </p>
                  <p className="mt-2 text-xs text-slate-600">{MAP_RADIUS_KM} km radius · live updates</p>
                </div>
              ) : null}
              <ul className="flex flex-col gap-3">
                {listPosts.map((p) => (
                  <li key={p._id}>
                    <PostCard post={p} variant="sheet" />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </aside>

      {composerOpen ? (
        <div
          className="fixed inset-0 z-[2000] flex items-end justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="composer-title"
          onClick={() => !busy && setComposerOpen(false)}
        >
          <div
            className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-2xl shadow-black/25 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="composer-title" className="sr-only">
              New local update
            </p>
            <PostForm
              lat={pickLatLng?.lat ?? null}
              lng={pickLatLng?.lng ?? null}
              onSubmit={handleComposerSubmit}
              generateUploadUrl={generateUploadUrl}
              getStorageReadUrl={getStorageReadUrl}
              onError={(msg) => setHint(msg)}
              disabled={busy}
              hint={hint}
              onClose={() => !busy && setComposerOpen(false)}
              variant="light"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function MapPage() {
  return (
    <ConvexProvider client={convex}>
      <MapShell />
    </ConvexProvider>
  );
}
