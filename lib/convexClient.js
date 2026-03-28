import { ConvexReactClient } from "convex/react";

/**
 * Single browser client for Convex queries/mutations.
 * WHY: Reusing one instance avoids duplicate WebSocket subscriptions (better on slow networks).
 */
const url = process.env.NEXT_PUBLIC_CONVEX_URL;

if (typeof window !== "undefined" && !url) {
  console.warn(
    "NEXT_PUBLIC_CONVEX_URL is missing. Run `npx convex dev` and copy the deployment URL into .env.local.",
  );
}

export const convex = new ConvexReactClient(url || "https://placeholder.convex.cloud");
