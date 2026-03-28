import OpenAI from "openai";

/**
 * Lazy client so importing this module in Edge doesn't require a key at build time.
 * WHY: Keys stay server-only via the API route; we never bundle OPENAI_API_KEY for the browser.
 */
function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

/**
 * Translate optional caption to English for a shared baseline; category is chosen by the user in the UI.
 * WHY: OpenAI only normalizes language — post type is explicit (emergency / update / event).
 *
 * @param {string} text - User caption (any language); empty string skips the model.
 * @returns {Promise<{ translatedEn: string, sourceLang: string }>}
 */
export async function translatePostText(text) {
  const t = typeof text === "string" ? text.trim() : "";
  if (!t) {
    return { translatedEn: "", sourceLang: "und" };
  }

  const client = getClient();
  if (!client) {
    return { translatedEn: text, sourceLang: "und" };
  }

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          'Reply with JSON only: {"translatedEn":string,"sourceLang":string}. translatedEn is concise English. sourceLang is ISO 639-1 or "und".',
      },
      { role: "user", content: t },
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

  const translatedEn =
    typeof parsed.translatedEn === "string" && parsed.translatedEn.trim()
      ? parsed.translatedEn.trim()
      : t;

  const sourceLang =
    typeof parsed.sourceLang === "string" && parsed.sourceLang.trim()
      ? parsed.sourceLang.trim()
      : "und";

  return { translatedEn, sourceLang };
}
