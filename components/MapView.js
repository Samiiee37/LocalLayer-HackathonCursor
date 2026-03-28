"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import PostMapPopup from "./PostMapPopup";
import { kmBoxBounds, MAP_RADIUS_KM, MAP_RADIUS_METERS } from "@/lib/utils";

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

/** Pin SVG — fill is category theme; stroke keeps yellow/green/red readable on light tiles. */
function categoryPinHtml(fill, stroke = "rgba(15, 23, 42, 0.45)") {
  return `<svg width="30" height="38" viewBox="0 0 30 38" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path fill="${fill}" stroke="${stroke}" stroke-width="1.35" stroke-linejoin="round"
      d="M15 1.75c6.77 0 12.25 5.35 12.25 11.95 0 9.2-12.25 20.55-12.25 20.55S2.75 22.9 2.75 13.7C2.75 7.1 8.23 1.75 15 1.75z"/>
    <circle cx="15" cy="14" r="4.25" fill="white" opacity="0.95"/>
  </svg>`;
}

const CATEGORY_PIN = {
  emergency: { fill: "#dc2626", stroke: "#7f1d1d" },
  update: { fill: "#eab308", stroke: "#713f12" },
  event: { fill: "#16a34a", stroke: "#14532d" },
};

function nearSame(a, b) {
  return Math.abs(a - b) < 1e-5;
}

/** One Leaflet divIcon per category — stable instances avoid marker flicker on re-render. */
function useCategoryPostIcons() {
  return useMemo(() => {
    const size = [30, 38];
    const anchor = [15, 38];
    const popupAnchor = [0, -34];
    const mk = (key) =>
      L.divIcon({
        className: "ll-post-pin",
        html: categoryPinHtml(CATEGORY_PIN[key].fill, CATEGORY_PIN[key].stroke),
        iconSize: size,
        iconAnchor: anchor,
        popupAnchor,
      });
    return {
      emergency: mk("emergency"),
      update: mk("update"),
      event: mk("event"),
    };
  }, []);
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
  const postIcons = useCategoryPostIcons();

  const accuracyRadius =
    typeof pickLatLng?.accuracyMeters === "number" ? pickLatLng.accuracyMeters : 75;

  const rLat = pickLatLng?.lat;
  const rLng = pickLatLng?.lng;

  const limitBounds = useMemo(() => {
    if (rLat == null || rLng == null) return null;
    const b = kmBoxBounds(rLat, rLng, MAP_RADIUS_KM);
    return L.latLngBounds(b.southWest, b.northEast);
  }, [rLat, rLng]);

  /** OSRM path + destination; line color follows post category. */
  const [activeRoute, setActiveRoute] = useState(null);
  const [directionsLoadingId, setDirectionsLoadingId] = useState(null);

  const handleDirections = useCallback(
    async (post, catKey) => {
      if (!pickLatLng) return;
      if (
        activeRoute &&
        nearSame(activeRoute.destLat, post.lat) &&
        nearSame(activeRoute.destLng, post.lng)
      ) {
        setActiveRoute(null);
        return;
      }
      setDirectionsLoadingId(post._id);
      try {
        const q = new URLSearchParams({
          lat1: String(pickLatLng.lat),
          lng1: String(pickLatLng.lng),
          lat2: String(post.lat),
          lng2: String(post.lng),
        });
        const res = await fetch(`/api/directions?${q}`);
        const data = res.ok ? await res.json() : null;
        let positions;
        if (data?.code === "Ok" && data.routes?.[0]?.geometry?.coordinates?.length) {
          positions = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        } else {
          positions = [
            [pickLatLng.lat, pickLatLng.lng],
            [post.lat, post.lng],
          ];
        }
        setActiveRoute({
          positions,
          categoryKey: catKey,
          destLat: post.lat,
          destLng: post.lng,
        });
      } catch {
        setActiveRoute({
          positions: [
            [pickLatLng.lat, pickLatLng.lng],
            [post.lat, post.lng],
          ],
          categoryKey: catKey,
          destLat: post.lat,
          destLng: post.lng,
        });
      } finally {
        setDirectionsLoadingId(null);
      }
    },
    [pickLatLng, activeRoute],
  );

  const routeColor =
    activeRoute && CATEGORY_PIN[activeRoute.categoryKey]
      ? CATEGORY_PIN[activeRoute.categoryKey].fill
      : "#64748b";

  useEffect(() => {
    if (!pickLatLng) setActiveRoute(null);
  }, [pickLatLng]);

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
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <RecenterMap lat={rLat} lng={rLng} zoom={recenterZoom} recenterTick={recenterTick} />

      {activeRoute?.positions?.length ? (
        <>
          <Polyline
            interactive={false}
            positions={activeRoute.positions}
            pathOptions={{
              color: routeColor,
              weight: 12,
              opacity: 0.2,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
          <Polyline
            interactive={false}
            positions={activeRoute.positions}
            pathOptions={{
              color: routeColor,
              weight: 5,
              opacity: 0.92,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        </>
      ) : null}

      {posts.map((p) => {
        const catKey = postIcons[p.category] ? p.category : "update";
        const pinIcon = postIcons[catKey];
        const routeToThis =
          activeRoute &&
          nearSame(activeRoute.destLat, p.lat) &&
          nearSame(activeRoute.destLng, p.lng);
        const loadingThis = directionsLoadingId === p._id;
        return (
          <Marker key={p._id} position={[p.lat, p.lng]} icon={pinIcon}>
            <Popup className={`ll-popup ll-popup--${catKey}`} maxWidth={280} minWidth={210}>
              <PostMapPopup
                post={p}
                catKey={catKey}
                pickLatLng={pickLatLng}
                onDirections={() => void handleDirections(p, catKey)}
                directionsLoading={loadingThis}
                routeToThis={routeToThis}
              />
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
              color: "#475569",
              weight: 1.25,
              opacity: 0.5,
              fillColor: "#64748b",
              fillOpacity: 0.05,
              dashArray: "10 14",
            }}
          />
          <Circle
            center={[pickLatLng.lat, pickLatLng.lng]}
            radius={accuracyRadius}
            pathOptions={{
              color: "#059669",
              weight: 1.5,
              opacity: 0.55,
              fillColor: "#10b981",
              fillOpacity: 0.12,
            }}
          />
          <Marker
            key="user-pin"
            position={[pickLatLng.lat, pickLatLng.lng]}
            icon={userIcon}
            zIndexOffset={2000}
          >
            <Popup className="ll-popup ll-popup--location" maxWidth={200}>
              <div className="ll-popup-inner ll-popup-inner--location">
                <p className="ll-popup-title ll-popup-title--location">Your position</p>
                <p className="ll-popup-body ll-popup-body--subtle">
                  Map shows posts within {MAP_RADIUS_KM} km. Pins outside that radius stay hidden.
                </p>
              </div>
            </Popup>
          </Marker>
        </>
      ) : null}
    </MapContainer>
  );
}
