import { NextResponse } from "next/server";

/**
 * GET /api/directions — proxies OSRM foot routing (no browser CORS issues).
 * Query: lat1, lng1 (user) → lat2, lng2 (event).
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat1 = Number(searchParams.get("lat1"));
  const lng1 = Number(searchParams.get("lng1"));
  const lat2 = Number(searchParams.get("lat2"));
  const lng2 = Number(searchParams.get("lng2"));

  const okLat = (n) => Number.isFinite(n) && n >= -90 && n <= 90;
  const okLng = (n) => Number.isFinite(n) && n >= -180 && n <= 180;
  if (!okLat(lat1) || !okLat(lat2) || !okLng(lng1) || !okLng(lng2)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const osrm = `https://router.project-osrm.org/route/v1/foot/${lng1},${lat1};${lng2},${lat2}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(osrm, { headers: { Accept: "application/json" } });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    console.error("Directions proxy failed:", e);
    return NextResponse.json({ error: "Routing failed" }, { status: 502 });
  }
}
