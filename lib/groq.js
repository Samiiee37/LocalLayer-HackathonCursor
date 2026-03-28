import Groq from "groq-sdk";

/**
 * Lazy client so importing this module in Edge doesn't require a key at build time.
 * WHY: Keys stay server-only via the API route; we never bundle GROQ_API_KEY for the browser.
 */
function getClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  return new Groq({ apiKey });
}

const TEXT_MODEL = "llama-3.3-70b-versatile";
const VISION_MODEL = "llama-3.2-11b-vision-preview";
const WHISPER_MODEL = "whisper-large-v3-turbo";

const SYSTEM_JSON = `Reply with JSON only: {"title":string,"translatedEn":string,"sourceLang":string}. title is a short headline (max 12 words) for this local post. translatedEn must be entirely in English: if the caption or voice transcript is in any language (including Hindi, Punjabi, Tamil, etc.), translate it fully into clear English and merge caption + transcript meaning concisely. sourceLang is ISO 639-1 for the main language of the user's caption and/or voice transcript (use "en" if English; use "und" only if truly unknown).`;

const SYSTEM_IMAGE_TITLE = `Reply with JSON only: {"title":string,"translatedEn":string,"sourceLang":string}. title is a short headline (max 12 words). translatedEn must be entirely in English: translate any non-English caption or voice transcript; if no text, briefly describe the image in English. sourceLang is ISO 639-1 for the caption/voice language or "und" if unknown.`;

function fallbackResult({ text, transcribedText, hasImage, hasAudio }) {
  const combined = [text, transcribedText].filter(Boolean).join("\n\n").trim();
  let title = "";
  if (combined) {
    const words = combined.split(/\s+/).slice(0, 10);
    title = words.join(" ");
    if (title.length > 100) title = `${title.slice(0, 97)}…`;
  } else if (hasImage && hasAudio) title = "Photo and voice";
  else if (hasImage) title = "Photo post";
  else if (hasAudio) title = "Voice note";
  else title = "Local update";

  return {
    title,
    translatedEn: combined || (hasImage ? "Image post" : "") || (hasAudio ? "Voice note" : ""),
    sourceLang: "und",
    transcribedText: transcribedText || "",
  };
}

function parseTitleJson(raw, text, transcribedText, hasImage, hasAudio) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }
  const titleRaw = typeof parsed.title === "string" ? parsed.title.trim() : "";
  const title = titleRaw ? titleRaw.slice(0, 120) : "";

  let translatedEn =
    typeof parsed.translatedEn === "string" && parsed.translatedEn.trim()
      ? parsed.translatedEn.trim()
      : "";
  if (!translatedEn) {
    const combined = [text, transcribedText].filter(Boolean).join("\n\n").trim();
    translatedEn = combined || text || transcribedText || "";
  }

  const sourceLang =
    typeof parsed.sourceLang === "string" && parsed.sourceLang.trim()
      ? parsed.sourceLang.trim()
      : "und";

  const fb = fallbackResult({ text, transcribedText, hasImage, hasAudio });

  return {
    title: title || fb.title,
    translatedEn,
    sourceLang,
    transcribedText: transcribedText || "",
  };
}

/**
 * Whisper (audio) + optional chat for title / English summary. No image rejection.
 *
 * @param {{ text?: string, imageUrl?: string | null, audioUrl?: string | null }} input
 */
export async function processPostContent(input) {
  const text = typeof input.text === "string" ? input.text.trim() : "";
  const imageUrl = input.imageUrl || null;
  const audioUrl = input.audioUrl || null;

  let transcribedText = "";
  const client = getClient();
  const hasImage = !!imageUrl;
  const hasAudio = !!audioUrl;

  if (audioUrl && client) {
    try {
      const tr = await client.audio.transcriptions.create({
        model: WHISPER_MODEL,
        url: audioUrl,
      });
      transcribedText = (tr.text || "").trim();
    } catch (e) {
      console.error("Whisper failed:", e);
    }
  }

  const combinedForEn = [text, transcribedText].filter(Boolean).join("\n\n");

  if (!client) {
    return fallbackResult({ text, transcribedText, hasImage, hasAudio });
  }

  if (!combinedForEn && !hasImage) {
    return fallbackResult({ text, transcribedText, hasImage, hasAudio });
  }

  try {
    if (hasImage) {
      const contextBlock = combinedForEn
        ? `Caption/voice context:\n${combinedForEn}`
        : "No caption or voice note — describe the image for title and translatedEn.";

      const completion = await client.chat.completions.create({
        model: VISION_MODEL,
        messages: [
          { role: "system", content: SYSTEM_IMAGE_TITLE },
          {
            role: "user",
            content: [
              { type: "text", text: contextBlock },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      });

      const raw = completion.choices[0]?.message?.content || "{}";
      return parseTitleJson(raw, text, transcribedText, true, hasAudio);
    }

    const completion = await client.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: SYSTEM_JSON },
        { role: "user", content: combinedForEn },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });
    const raw = completion.choices[0]?.message?.content || "{}";
    return parseTitleJson(raw, text, transcribedText, false, hasAudio);
  } catch (e) {
    console.error("Groq chat failed:", e);
    return fallbackResult({ text, transcribedText, hasImage, hasAudio });
  }
}

/**
 * Translate title + body from English (display source) into targetLang for map popups.
 * @param {{ title: string, text: string, targetLang: string, languageLabel: string }} args
 */
export async function translateDisplayStrings({ title, text, targetLang, languageLabel }) {
  const t = typeof title === "string" ? title.trim() : "";
  const body = typeof text === "string" ? text.trim() : "";
  if (targetLang === "en") {
    return { title: t, text: body };
  }
  const client = getClient();
  if (!client || (!t && !body)) {
    return { title: t, text: body };
  }

  const payload = JSON.stringify({ title: t, text: body });
  const system = `Reply with JSON only: {"title":string,"text":string}. Translate the given title and body into ${languageLabel} (ISO 639-1: ${targetLang}). Preserve all meaning; keep title short if the input title is short. Use native script for ${languageLabel} where appropriate.`;

  try {
    const completion = await client.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: payload },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });
    const raw = completion.choices[0]?.message?.content || "{}";
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }
    const outTitle = typeof parsed.title === "string" ? parsed.title.trim() : t;
    const outText = typeof parsed.text === "string" ? parsed.text.trim() : body;
    return {
      title: outTitle || t,
      text: outText || body,
    };
  } catch (e) {
    console.error("translateDisplayStrings failed:", e);
    return { title: t, text: body };
  }
}
