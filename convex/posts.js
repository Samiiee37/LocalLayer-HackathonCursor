import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const categoryValidator = v.union(
  v.literal("emergency"),
  v.literal("update"),
  v.literal("event"),
);

/**
 * Real-time list with signed URLs for images/audio so the client can render media.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db.query("posts").collect();
    const sorted = posts.sort((a, b) => b.createdAt - a.createdAt);
    return Promise.all(
      sorted.map(async (p) => ({
        ...p,
        imageUrl: p.imageId ? await ctx.storage.getUrl(p.imageId) : null,
        audioUrl: p.audioId ? await ctx.storage.getUrl(p.audioId) : null,
      })),
    );
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
 */
export const create = mutation({
  args: {
    body: v.string(),
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
    if (!hasText && !args.imageId && !args.audioId) {
      throw new Error("Add text, a photo, or a voice note.");
    }
    const id = await ctx.db.insert("posts", {
      ...args,
      createdAt: Date.now(),
    });
    return id;
  },
});
