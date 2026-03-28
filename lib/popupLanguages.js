/**
 * Map popup display languages — top Indian languages by reach; includes English, Hindi, Punjabi.
 * Codes are ISO 639-1 for API / storage.
 */
export const POPUP_LANGUAGES = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "bn", label: "Bengali", native: "বাংলা" },
  { code: "te", label: "Telugu", native: "తెలుగు" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "pa", label: "Punjabi", native: "ਪੰਜਾਬੀ" },
];

export const POPUP_LANG_CODES = new Set(POPUP_LANGUAGES.map((l) => l.code));

const STORAGE_LANG = "ll.popupLang.v1";
const STORAGE_CACHE = "ll.popupTranslate.v1";

export function getLanguageByCode(code) {
  return POPUP_LANGUAGES.find((l) => l.code === code) ?? POPUP_LANGUAGES[0];
}

/** Stable string so we invalidate cached translations when post text changes (e.g. merge). */
export function postContentFingerprint(post) {
  return [
    post.translatedEn ?? "",
    post.title ?? "",
    post.body ?? "",
    post.transcribedText ?? "",
  ].join("\u001f");
}

export function getStoredPopupLang(postId) {
  if (typeof window === "undefined") return "en";
  try {
    const raw = localStorage.getItem(STORAGE_LANG);
    const map = raw ? JSON.parse(raw) : {};
    const code = map[postId];
    return POPUP_LANG_CODES.has(code) ? code : "en";
  } catch {
    return "en";
  }
}

export function setStoredPopupLang(postId, code) {
  if (typeof window === "undefined") return;
  if (!POPUP_LANG_CODES.has(code)) return;
  try {
    const raw = localStorage.getItem(STORAGE_LANG);
    const map = raw ? JSON.parse(raw) : {};
    map[postId] = code;
    localStorage.setItem(STORAGE_LANG, JSON.stringify(map));
  } catch {
    /* ignore quota */
  }
}

export function getCachedTranslation(postId, lang, fingerprint) {
  if (typeof window === "undefined") return null;
  if (lang === "en") return null;
  try {
    const raw = localStorage.getItem(STORAGE_CACHE);
    const outer = raw ? JSON.parse(raw) : {};
    const byPost = outer[postId];
    if (!byPost || !byPost[lang]) return null;
    const entry = byPost[lang];
    if (entry.fp !== fingerprint) return null;
    return { title: entry.title, text: entry.text };
  } catch {
    return null;
  }
}

export function setCachedTranslation(postId, lang, fingerprint, { title, text }) {
  if (typeof window === "undefined") return;
  if (lang === "en") return;
  try {
    const raw = localStorage.getItem(STORAGE_CACHE);
    const outer = raw ? JSON.parse(raw) : {};
    if (!outer[postId]) outer[postId] = {};
    outer[postId][lang] = { fp: fingerprint, title, text };
    localStorage.setItem(STORAGE_CACHE, JSON.stringify(outer));
  } catch {
    /* ignore quota */
  }
}
