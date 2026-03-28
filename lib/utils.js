/**
 * Shared presentation helpers — kept tiny to reduce JS shipped to low-bandwidth clients.
 */

/** Compact relative time to avoid heavy date libraries. */
export function formatTime(ts) {
  const d = new Date(ts);
  const now = Date.now();
  const diff = Math.max(0, now - ts);
  const s = Math.floor(diff / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (s < 60) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Local layer radius: posts and map view are limited to this distance from the user (meters). */
export const MAP_RADIUS_METERS = 5000;
export const MAP_RADIUS_KM = MAP_RADIUS_METERS / 1000;

/** Haversine distance in meters (WGS84). */
export function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Axis-aligned bounding box (square) that fully contains a circle of radiusKm around (lat,lng).
 * WHY: Leaflet `maxBounds` uses a rectangle; this box fits the 5km service circle.
 */
export function kmBoxBounds(lat, lng, radiusKm) {
  const r = radiusKm;
  const latDelta = r / 111.32;
  const lngDelta = r / (111.32 * Math.max(0.1, Math.cos((lat * Math.PI) / 180)));
  return {
    southWest: [lat - latDelta, lng - lngDelta],
    northEast: [lat + latDelta, lng + lngDelta],
  };
}

/** Clamp map coordinates to valid WGS84 ranges so Leaflet never receives NaN. */
export function clampLatLng(lat, lng) {
  return {
    lat: Math.max(-85, Math.min(85, lat)),
    lng: Math.max(-180, Math.min(180, lng)),
  };
}

/**
 * Normalizes a browser GeolocationPosition for our map + Convex.
 * WHY: Shared by one-shot reads and continuous `watchPosition` callbacks.
 * Note: We keep the reported accuracy (no artificial 25m floor) so the ring matches the browser.
 */
export function geolocationPositionToPin(pos) {
  const { latitude, longitude, accuracy } = pos.coords;
  const { lat, lng } = clampLatLng(latitude, longitude);
  const raw =
    typeof accuracy === "number" && accuracy > 0 && !Number.isNaN(accuracy)
      ? accuracy
      : 100;
  // Cap only extreme outliers; do not inflate small values (e.g. 8m GPS stays 8m on the circle).
  const accuracyMeters = Math.min(12000, Math.max(1, raw));
  return { lat, lng, accuracyMeters, fromGps: true };
}

/**
 * Options tuned for real GNSS: long timeout lets the radio get a cold fix (especially outdoors).
 * WHY: Short timeouts often return Wi‑Fi/cell guesses (~100–500m); GPS needs several seconds.
 */
export const HIGH_ACCURACY_GEO_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 90000,
};

/** Shorten long text in list cards to limit DOM size on slow devices. */
export function truncate(str, max = 160) {
  if (!str || str.length <= max) return str;
  return `${str.slice(0, max).trim()}…`;
}

/**
 * One-shot GPS read (e.g. warmup or “refresh” flows).
 * @returns {Promise<{ lat: number, lng: number, accuracyMeters: number }>}
 */
export async function getBrowserPosition() {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new Error("Geolocation not available");
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const pin = geolocationPositionToPin(pos);
        const { fromGps: _f, ...rest } = pin;
        resolve(rest);
      },
      reject,
      HIGH_ACCURACY_GEO_OPTIONS,
    );
  });
}
