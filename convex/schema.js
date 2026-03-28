import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * WHY: Strict schema keeps map pins and media references valid.
 */
export default defineSchema({
  posts: defineTable({
    /** Short headline from Groq (text / image / voice context). */
    title: v.optional(v.string()),
    /** Caption / description; may be empty if the post is image- or voice-only. */
    body: v.string(),
    /** Raw speech-to-text when a voice note was attached (Groq Whisper). */
    transcribedText: v.optional(v.string()),
    /** User-selected type — drives badges and filters (not AI). */
    category: v.union(v.literal("emergency"), v.literal("update"), v.literal("event")),
    lat: v.number(),
    lng: v.number(),
    /** Optional English line from /api/process when text was provided. */
    translatedEn: v.optional(v.string()),
    sourceLang: v.optional(v.string()),
    /** Convex `_storage` blob IDs — files are served via signed URLs from the media layer. */
    imageId: v.optional(v.id("_storage")),
    /** Extra photos merged from nearby “similar” posts (same pin story). */
    imageIds: v.optional(v.array(v.id("_storage"))),
    audioId: v.optional(v.id("_storage")),
    createdAt: v.number(),
  }),
});
