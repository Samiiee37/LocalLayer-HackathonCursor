"use client";

import { useEffect, useMemo, useState } from "react";
import CategoryBadge from "./CategoryBadge";
import PostImages from "./PostImages";
import { truncate } from "@/lib/utils";
import {
  POPUP_LANGUAGES,
  getCachedTranslation,
  getStoredPopupLang,
  postContentFingerprint,
  setCachedTranslation,
  setStoredPopupLang,
} from "@/lib/popupLanguages";

export default function PostMapPopup({
  post,
  catKey,
  pickLatLng,
  onDirections,
  directionsLoading,
  routeToThis,
}) {
  const [lang, setLang] = useState(() => getStoredPopupLang(post._id));
  const [resolved, setResolved] = useState(null);
  const [loading, setLoading] = useState(false);

  const fp = useMemo(() => postContentFingerprint(post), [post]);

  const baseTitle = typeof post.title === "string" ? post.title.trim() : "";
  const baseBody =
    post.translatedEn || post.body || post.transcribedText || "";
  const baseBodyStr = typeof baseBody === "string" ? baseBody : "";

  useEffect(() => {
    setLang(getStoredPopupLang(post._id));
  }, [post._id]);

  useEffect(() => {
    if (lang === "en") {
      setResolved(null);
      setLoading(false);
      return;
    }

    const cached = getCachedTranslation(post._id, lang, fp);
    if (cached) {
      setResolved(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setResolved(null);

    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: baseTitle,
        text: baseBodyStr,
        targetLang: lang,
      }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("translate"))))
      .then((data) => {
        if (cancelled) return;
        const next = {
          title: typeof data.title === "string" ? data.title : baseTitle,
          text: typeof data.text === "string" ? data.text : baseBodyStr,
        };
        setCachedTranslation(post._id, lang, fp, next);
        setResolved(next);
      })
      .catch(() => {
        if (!cancelled) {
          setResolved({ title: baseTitle, text: baseBodyStr });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [post._id, lang, fp, baseTitle, baseBodyStr]);

  const displayTitle =
    lang === "en" ? baseTitle : resolved?.title ?? baseTitle;
  const displayBody =
    lang === "en" ? baseBodyStr : resolved?.text ?? baseBodyStr;

  const hasText = displayBody.trim().length > 0;
  const hasTitle = displayTitle.length > 0;

  const imageUrls =
    Array.isArray(post.imageUrls) && post.imageUrls.length > 0
      ? post.imageUrls
      : post.imageUrl
        ? [post.imageUrl]
        : [];

  return (
    <div className={`ll-popup-inner ll-popup-inner--${catKey}`}>
      <div className="ll-popup-head">
        <CategoryBadge category={post.category} compact />
      </div>

      <div className="ll-popup-lang-row">
        <label htmlFor={`ll-lang-${post._id}`} className="ll-popup-lang-label">
          Language
        </label>
        <select
          id={`ll-lang-${post._id}`}
          className="ll-popup-lang-select"
          value={lang}
          onChange={(e) => {
            const next = e.target.value;
            setStoredPopupLang(post._id, next);
            setLang(next);
          }}
        >
          {POPUP_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.native} ({l.label})
            </option>
          ))}
        </select>
      </div>

      {loading && lang !== "en" ? (
        <p className="ll-popup-translating" aria-live="polite">
          Translating…
        </p>
      ) : null}

      {hasTitle ? (
        <h3 className="ll-popup-title">{truncate(displayTitle, 90)}</h3>
      ) : null}
      {hasText ? (
        <p className="ll-popup-body">{truncate(displayBody, 200)}</p>
      ) : (
        <p className="ll-popup-muted">
          {imageUrls.length > 0 && post.audioUrl
            ? "Photo and voice"
            : imageUrls.length > 0
              ? "Photo"
              : post.audioUrl
                ? "Voice note"
                : "Post"}
        </p>
      )}
      <PostImages urls={imageUrls} />
      {post.audioUrl ? (
        <audio src={post.audioUrl} controls className="ll-popup-audio" />
      ) : null}
      <div className="ll-popup-actions">
        <button
          type="button"
          className={`ll-popup-directions ll-popup-directions--${catKey}`}
          disabled={!pickLatLng || directionsLoading}
          title={!pickLatLng ? "Turn on location to get directions" : undefined}
          onClick={(e) => {
            e.stopPropagation();
            onDirections();
          }}
        >
          {directionsLoading ? "…" : routeToThis ? "Clear path" : "Directions"}
        </button>
      </div>
    </div>
  );
}
