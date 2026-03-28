import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

const categoryValidator = v.union(
  v.literal("emergency"),
  v.literal("update"),
  v.literal("event"),
);

/** Max distance (m) to treat as the “same spot” for merging another user’s photo. */
const MERGE_RADIUS_M = 55;

/** Haversine distance in meters (same formula as the client). */
function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

function collectImageIds(p) {
  if (Array.isArray(p.imageIds) && p.imageIds.length > 0) return p.imageIds;
  if (p.imageId) return [p.imageId];
  return [];
}

function combinedTextBlob(p) {
  return [p.title, p.body, p.translatedEn, p.transcribedText]
    .filter((s) => typeof s === "string" && s.trim())
    .join(" ");
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

/** Same rough topic at the same place — not exact match (low-quality text ok). */
function textsSimilarForMerge(existingStr, incomingStr) {
  const a = tokenize(existingStr);
  const b = tokenize(incomingStr);
  if (a.length === 0 || b.length === 0) return true;
  const setB = new Set(b);
  let shared = 0;
  for (const w of a) {
    if (setB.has(w)) shared += 1;
  }
  if (shared >= 2) return true;
  if (shared === 1 && Math.min(a.length, b.length) <= 4) return true;
  const ea = existingStr.trim().toLowerCase();
  const ib = incomingStr.trim().toLowerCase();
  if (ea.length >= 10 && ib.length >= 10 && (ea.includes(ib.slice(0, 14)) || ib.includes(ea.slice(0, 14)))) {
    return true;
  }
  return false;
}

function findMergeTarget(posts, args) {
  const incomingBlob = combinedTextBlob({
    title: args.title,
    body: args.body,
    translatedEn: args.translatedEn,
    transcribedText: args.transcribedText,
  });

  let best = null;
  let bestD = Infinity;
  for (const p of posts) {
    if (p.category !== args.category) continue;
    const d = distanceMeters(p.lat, p.lng, args.lat, args.lng);
    if (d > MERGE_RADIUS_M) continue;
    const existingBlob = combinedTextBlob(p);
    if (!textsSimilarForMerge(existingBlob, incomingBlob)) continue;
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

async function enrichPostUrls(ctx, p) {
  const ids = collectImageIds(p);
  const imageUrls = (
    await Promise.all(ids.map((id) => (id ? ctx.storage.getUrl(id) : null)))
  ).filter(Boolean);
  return {
    ...p,
    imageUrls,
    imageUrl: imageUrls[0] ?? null,
    audioUrl: p.audioId ? await ctx.storage.getUrl(p.audioId) : null,
  };
}

/**
 * Real-time list with signed URLs for images/audio so the client can render media.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db.query("posts").collect();
    const sorted = posts.sort((a, b) => b.createdAt - a.createdAt);
    return Promise.all(sorted.map((p) => enrichPostUrls(ctx, p)));
  },
});

/**
 * Posts within radiusMeters of (lat, lng) — metadata in Convex, media still in `_storage`.
 */
export const listNearby = query({
  args: {
    lat: v.number(),
    lng: v.number(),
    radiusMeters: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const r = args.radiusMeters ?? 5000;
    const posts = await ctx.db.query("posts").collect();
    const nearby = posts.filter(
      (p) => distanceMeters(args.lat, args.lng, p.lat, p.lng) <= r,
    );
    const sorted = nearby.sort((a, b) => b.createdAt - a.createdAt);
    return Promise.all(sorted.map((p) => enrichPostUrls(ctx, p)));
  },
});

/** Signed read URL for a blob right after upload (for server-side Groq calls). */
export const getStorageUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId);
  },
});

/**
 * Browser uploads files to this URL, then passes returned storageId into `create`.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Create a post — at least one of body (non-empty after trim), image, or audio should exist (enforced in handler).
 * If another user adds a photo very close by with similar wording, the image is merged onto that post.
 */
export const create = mutation({
  args: {
    title: v.optional(v.string()),
    body: v.string(),
    transcribedText: v.optional(v.string()),
    category: categoryValidator,
    lat: v.number(),
    lng: v.number(),
    translatedEn: v.optional(v.string()),
    sourceLang: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
    audioId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const hasText = args.body.trim().length > 0;
    const hasTranscript =
      typeof args.transcribedText === "string" && args.transcribedText.trim().length > 0;
    if (!hasText && !hasTranscript && !args.imageId && !args.audioId) {
      throw new Error("Add text, a photo, or a voice note.");
    }

    if (args.imageId && !args.audioId) {
      const all = await ctx.db.query("posts").collect();
      const target = findMergeTarget(all, args);
      if (target) {
        const ids = collectImageIds(target);
        if (ids.includes(args.imageId)) {
          return target._id;
        }
        const nextIds = [...ids, args.imageId];
        const patch = {
          imageIds: nextIds,
          imageId: nextIds[0],
        };
        const addBody = args.body.trim();
        if (addBody) {
          const prev = (target.body || "").trim();
          const combined = prev
            ? `${prev}\n\n—\n\n${addBody}`
            : addBody;
          patch.body = combined;
        }
        if (args.translatedEn?.trim()) {
          const prevT = (target.translatedEn || "").trim();
          patch.translatedEn = prevT
            ? `${prevT}\n\n—\n\n${args.translatedEn.trim()}`
            : args.translatedEn.trim();
        }
        await ctx.db.patch(target._id, patch);
        return target._id;
      }
    }

    const imageIds = args.imageId ? [args.imageId] : undefined;
    const id = await ctx.db.insert("posts", {
      ...args,
      imageIds,
      imageId: args.imageId,
      createdAt: Date.now(),
    });
    return id;
  },
});

/** All posts expire after this many ms (server clock). */
const POST_TTL_MS = 2 * 60 * 60 * 1000;

async function deletePostBlobs(ctx, p) {
  const seen = new Set();
  for (const id of collectImageIds(p)) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    try {
      await ctx.storage.delete(id);
    } catch (e) {
      console.error("posts.purge: image delete failed", e);
    }
  }
  if (p.audioId) {
    try {
      await ctx.storage.delete(p.audioId);
    } catch (e) {
      console.error("posts.purge: audio delete failed", e);
    }
  }
}

/**
 * Called on a schedule — removes every post older than 2h and its blobs.
 */
export const purgeExpiredPosts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - POST_TTL_MS;
    const posts = await ctx.db.query("posts").collect();
    for (const p of posts) {
      if (p.createdAt >= cutoff) continue;
      await deletePostBlobs(ctx, p);
      await ctx.db.delete(p._id);
    }
  },
});
