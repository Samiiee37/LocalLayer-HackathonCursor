import { NextResponse } from "next/server";
import { translateDisplayStrings } from "@/lib/groq";
import { POPUP_LANG_CODES, getLanguageByCode } from "@/lib/popupLanguages";

export const maxDuration = 30;

/**
 * POST /api/translate — map popup display: English source → chosen Indian language.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const targetLang =
    typeof body.targetLang === "string" ? body.targetLang.trim() : "";
  if (!POPUP_LANG_CODES.has(targetLang)) {
    return NextResponse.json({ error: "Invalid targetLang" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title : "";
  const text = typeof body.text === "string" ? body.text : "";

  const lang = getLanguageByCode(targetLang);
  const result = await translateDisplayStrings({
    title,
    text,
    targetLang,
    languageLabel: lang.label,
  });

  return NextResponse.json({
    title: result.title,
    text: result.text,
  });
}
