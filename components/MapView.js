"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import CategoryBadge from "./CategoryBadge";
import { truncate, kmBoxBounds, MAP_RADIUS_KM, MAP_RADIUS_METERS } from "@/lib/utils";

/**
 * Fix default marker assets in bundler environments (Next/Webpack).
 * WHY: Without this, markers render as broken images on many SPAs.
 */
function useDefaultIcons() {
  useEffect(() => {
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      iconUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    });
  }, []);
}

/**
 * Smoothly flies to the user at a fixed zoom. First fix uses a longer “intro” duration.
 * WHY: `flyToBounds` on the 5km box zooms out to fit the whole ring; `flyTo` keeps a tight street-level view.
 */
function RecenterMap({ lat, lng, zoom, recenterTick }) {
  const map = useMap();
  useEffect(() => {
    if (recenterTick <= 0 || lat == null || lng == null) return;

    const intro = recenterTick === 1;
    const duration = intro ? 2.75 : 1.05;
    const targetZoom = intro ? Math.min(zoom + 1, 19) : zoom;

    map.flyTo([lat, lng], targetZoom, { duration });
  }, [recenterTick, lat, lng, zoom, map]);
  return null;
}

/** Distinct from post markers — reads as “current / my position” on the basemap. */
function useUserLocationIcon() {
  return useMemo(
    () =>
      L.divIcon({
        className: "ll-user-marker",
        html:
          '<div class="ll-user-pulse"></div><div class="ll-user-dot" title="Your GPS position"></div>',
        iconSize: [48, 48],
        iconAnchor: [24, 24],
        popupAnchor: [0, -12],
      }),
    [],
  );
}

export default function MapView({
  initialCenter,
  initialZoom,
  posts,
  pickLatLng,
  recenterTick,
  recenterZoom,
}) {
  useDefaultIcons();
  const userIcon = useUserLocationIcon();

  const accuracyRadius =
    typeof pickLatLng?.accuracyMeters === "number" ? pickLatLng.accuracyMeters : 75;

  const rLat = pickLatLng?.lat;
  const rLng = pickLatLng?.lng;

  const limitBounds = useMemo(() => {
    if (rLat == null || rLng == null) return null;
    const b = kmBoxBounds(rLat, rLng, MAP_RADIUS_KM);
    return L.latLngBounds(b.southWest, b.northEast);
  }, [rLat, rLng]);

  return (
    <MapContainer
      center={initialCenter}
      zoom={initialZoom}
      className="ll-map-full h-full w-full min-h-0"
      scrollWheelZoom
      maxBounds={limitBounds ?? undefined}
      maxBoundsViscosity={limitBounds ? 1 : undefined}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RecenterMap lat={rLat} lng={rLng} zoom={recenterZoom} recenterTick={recenterTick} />

      {posts.map((p) => {
        const text = p.translatedEn || p.body;
        const hasText = typeof text === "string" && text.trim().length > 0;
        return (
          <Marker key={p._id} position={[p.lat, p.lng]}>
            <Popup>
              <div className="max-w-[220px]">
                <CategoryBadge category={p.category} />
                {hasText ? (
                  <p className="mt-1 text-sm">{truncate(text, 280)}</p>
                ) : (
                  <p className="mt-1 text-sm text-slate-500">
                    {p.imageUrl && p.audioUrl
                      ? "Photo and voice"
                      : p.imageUrl
                        ? "Photo"
                        : p.audioUrl
                          ? "Voice note"
                          : "Post"}
                  </p>
                )}
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt="" className="mt-2 max-h-28 w-full rounded object-cover" />
                ) : null}
                {p.audioUrl ? (
                  <audio src={p.audioUrl} controls className="mt-2 h-8 w-full" />
                ) : null}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {pickLatLng ? (
        <>
          {/* 5km service limit — dashed ring matches the pan restriction */}
          <Circle
            center={[pickLatLng.lat, pickLatLng.lng]}
            radius={MAP_RADIUS_METERS}
            pathOptions={{
              color: "#0f172a",
              weight: 1.5,
              opacity: 0.45,
              fillColor: "#64748b",
              fillOpacity: 0.06,
              dashArray: "10 12",
            }}
          />
          <Circle
            center={[pickLatLng.lat, pickLatLng.lng]}
            radius={accuracyRadius}
            pathOptions={{
              color: "#3b82f6",
              weight: 1.5,
              opacity: 0.45,
              fillColor: "#3b82f6",
              fillOpacity: 0.1,
            }}
          />
          <Marker
            key="user-pin"
            position={[pickLatLng.lat, pickLatLng.lng]}
            icon={userIcon}
            zIndexOffset={2000}
          >
            <Popup>
              <strong className="text-slate-800">Your GPS position</strong>
              <p className="mt-1 text-sm text-slate-600">
                Map is limited to {MAP_RADIUS_KM} km from here. Posts outside this radius are hidden.
              </p>
            </Popup>
          </Marker>
        </>
      ) : null}
    </MapContainer>
  );
}
