import { NextResponse } from "next/server";
import { processPostContent } from "@/lib/groq";

export const maxDuration = 60;

/**
 * POST /api/process — Groq Whisper (audio) + optional vision/text for title + English summary.
 * Pass Convex signed read URLs for media. Keys stay server-only.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text : "";
  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
  const audioUrl = typeof body.audioUrl === "string" ? body.audioUrl.trim() : "";

  const hasContent = text.trim().length > 0 || imageUrl.length > 0 || audioUrl.length > 0;
  if (!hasContent) {
    return NextResponse.json(
      { error: "Provide text, imageUrl, or audioUrl (Convex signed URLs for media)." },
      { status: 400 },
    );
  }

  try {
    const result = await processPostContent({
      text,
      imageUrl: imageUrl || null,
      audioUrl: audioUrl || null,
    });
    return NextResponse.json({
      title: result.title,
      translatedEn: result.translatedEn,
      sourceLang: result.sourceLang,
      transcribedText: result.transcribedText,
    });
  } catch (e) {
    console.error("Processing failed:", e);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
