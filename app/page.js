"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConvexProvider } from "convex/react";
import { convex } from "@/lib/convexClient";
import { usePosts } from "@/hooks/usePosts";
import PostForm from "@/components/PostForm";
import PostCard from "@/components/PostCard";
import {
  geolocationPositionToPin,
  HIGH_ACCURACY_GEO_OPTIONS,
  distanceMeters,
  MAP_RADIUS_METERS,
  MAP_RADIUS_KM,
  truncate,
} from "@/lib/utils";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-200 text-sm text-slate-500" role="status">
      Loading map…
    </div>
  ),
});

const DEFAULT_CENTER = [20, 0];
const DEFAULT_ZOOM = 2;
/** Closer street-level view when flying to GPS (was 14 + fit-to-5km-box, which felt too far out). */
const LOC_ZOOM = 17;

function IconSearch(props) {
  return (
    <svg className={props.className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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

function IconUser(props) {
  return (
    <svg className={props.className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function FloatingIconButton({ children, label, onClick, className = "", disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-slate-900 shadow-[0_4px_20px_rgba(15,23,42,0.12)] ring-1 ring-black/5 transition hover:bg-slate-50 active:scale-95 disabled:pointer-events-none disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

function Main() {
  const { posts, isLoading, createPost, generateUploadUrl } = usePosts();
  const [pickLatLng, setPickLatLng] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [hint, setHint] = useState(null);
  const [busy, setBusy] = useState(false);
  const [recenterTick, setRecenterTick] = useState(0);
  const [composerOpen, setComposerOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const hasReceivedFixRef = useRef(false);

  const visiblePosts = useMemo(() => {
    if (!pickLatLng) return posts;
    return posts.filter(
      (p) =>
        distanceMeters(pickLatLng.lat, pickLatLng.lng, p.lat, p.lng) <= MAP_RADIUS_METERS,
    );
  }, [posts, pickLatLng]);

  const filteredPosts = useMemo(() => {
    if (categoryFilter === "all") return visiblePosts;
    return visiblePosts.filter((p) => p.category === categoryFilter);
  }, [visiblePosts, categoryFilter]);

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
        body: payload.body ?? "",
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
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-slate-100 text-slate-900">
      {/* Full-bleed map (reference: street map fills the upper area) */}
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

        {/* Top overlay: search · filter pills · new post */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 grid grid-cols-[auto_1fr_auto] items-start gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <FloatingIconButton label="Search posts" onClick={() => {}} className="pointer-events-auto">
            <IconSearch className="h-5 w-5" />
          </FloatingIconButton>

          <div className="pointer-events-auto flex min-w-0 flex-wrap items-center justify-center gap-2 pt-0.5">
            {pills.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setCategoryFilter(p.id)}
                className={`rounded-full px-4 py-2 text-sm font-medium shadow-[0_2px_12px_rgba(15,23,42,0.08)] ring-1 transition ${
                  categoryFilter === p.id
                    ? "bg-slate-900 text-white ring-slate-900"
                    : "bg-white text-slate-800 ring-black/5 hover:bg-slate-50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <FloatingIconButton label="New post" onClick={() => setComposerOpen(true)} className="pointer-events-auto">
            <span className="text-2xl font-light leading-none">+</span>
          </FloatingIconButton>
        </div>

        {/* Locate / recenter — white circle, bottom-right of map area (reference) */}
        <div className="pointer-events-none absolute bottom-4 right-4 z-10">
          <FloatingIconButton
            label="Recenter on my location"
            onClick={recenterMapOnly}
            disabled={!pickLatLng}
            className="pointer-events-auto h-12 w-12"
          >
            <IconLocate className="h-6 w-6" />
          </FloatingIconButton>
        </div>

        {locationLoading && !pickLatLng ? (
          <p className="pointer-events-none absolute bottom-16 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white/95 px-4 py-2 text-xs font-medium text-slate-600 shadow-md ring-1 ring-black/5">
            Getting your location…
          </p>
        ) : null}
      </div>

      {/* Bottom sheet — white, rounded top, drag handle (reference) */}
      <aside className="relative z-20 flex max-h-[min(42vh,380px)] min-h-[200px] shrink-0 flex-col rounded-t-[28px] bg-white shadow-[0_-8px_40px_rgba(15,23,42,0.1)] ring-1 ring-black/5">
        <div className="flex justify-center pt-2 pb-1" aria-hidden>
          <div className="h-1 w-10 rounded-full bg-slate-200" />
        </div>

        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 pb-3 pt-1">
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 ring-1 ring-black/5"
            aria-label="Profile"
          >
            <IconUser className="h-5 w-5" />
          </button>
          <p className="font-semibold lowercase tracking-tight text-slate-900">local layer</p>
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 ring-1 ring-black/5"
            aria-label="Reset filters"
          >
            <IconFilter className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Nearby · {MAP_RADIUS_KM} km</p>

          {isLoading ? (
            <p className="py-6 text-center text-sm text-slate-500">Loading…</p>
          ) : filteredPosts.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Nothing in range yet. Tap + to post.</p>
          ) : (
            <>
              {featured ? (
                <div className="relative mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 p-5 ring-1 ring-black/5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">Featured</p>
                  <p className="mt-2 line-clamp-3 text-base font-semibold leading-snug text-slate-900">
                    {truncate(
                      featured.translatedEn ||
                        featured.body ||
                        (featured.imageUrl && featured.audioUrl
                          ? "Photo and voice note"
                          : featured.imageUrl
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
          className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/35 p-4 backdrop-blur-[2px] sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="composer-title"
          onClick={() => !busy && setComposerOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-black/5"
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

export default function Home() {
  return (
    <ConvexProvider client={convex}>
      <Main />
    </ConvexProvider>
  );
}
