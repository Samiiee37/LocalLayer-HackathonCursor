import { NextResponse } from "next/server";
import { translatePostText } from "@/lib/openai";

/**
 * POST /api/process — translates caption text to English (category is set in the app, not here).
 * WHY: OpenAI keys never reach the browser.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text : "";
  if (!text.trim()) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }

  try {
    const result = await translatePostText(text);
    return NextResponse.json(result);
  } catch (e) {
    console.error("Translation failed:", e);
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}
