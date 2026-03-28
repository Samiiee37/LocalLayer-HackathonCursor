import { NextResponse } from "next/server";
import Exa from "exa-js";

export const maxDuration = 60;

/**
 * POST /api/exa/answer — Exa web-grounded answer (API key server-only).
 * Body: { query: string }
 */
export async function POST(request) {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey?.trim()) {
    return NextResponse.json(
      { error: "EXA_API_KEY is not set. Add it to .env.local." },
      { status: 503 },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query.length) {
    return NextResponse.json({ error: "Enter a question." }, { status: 400 });
  }
  if (query.length > 4000) {
    return NextResponse.json({ error: "Question is too long." }, { status: 400 });
  }

  try {
    const exa = new Exa(apiKey);
    const result = await exa.answer(query, { text: true });

    const answer =
      typeof result.answer === "string" ? result.answer : JSON.stringify(result.answer);

    const citations = (result.citations ?? []).map((c) => ({
      url: c.url,
      title: typeof c.title === "string" ? c.title : null,
      publishedDate: c.publishedDate ?? null,
      author: c.author ?? null,
      text:
        typeof c.text === "string" ? c.text.slice(0, 1200) : undefined,
    }));

    return NextResponse.json({
      answer,
      citations,
      requestId: result.requestId,
    });
  } catch (e) {
    console.error("Exa answer failed:", e);
    const msg = e?.message || "Exa request failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
