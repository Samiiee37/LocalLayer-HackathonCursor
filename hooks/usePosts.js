import { useCallback, useMemo } from "react";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MAP_RADIUS_METERS } from "@/lib/utils";

/**
 * Subscribes to Convex posts (nearby when GPS is known), create, upload, and signed read URLs for Groq.
 */
export function usePosts(pickLatLng) {
  const convex = useConvex();
  const allPosts = useQuery(api.posts.list);
  const nearbyPosts = useQuery(
    api.posts.listNearby,
    pickLatLng != null
      ? { lat: pickLatLng.lat, lng: pickLatLng.lng, radiusMeters: MAP_RADIUS_METERS }
      : "skip",
  );

  const posts = useMemo(() => {
    if (pickLatLng != null) return nearbyPosts ?? [];
    return allPosts ?? [];
  }, [pickLatLng, nearbyPosts, allPosts]);

  const isLoading =
    pickLatLng != null ? nearbyPosts === undefined : allPosts === undefined;

  const createPost = useMutation(api.posts.create);
  const generateUploadUrl = useMutation(api.posts.generateUploadUrl);

  const getStorageReadUrl = useCallback(
    async (storageId) => convex.query(api.posts.getStorageUrl, { storageId }),
    [convex],
  );

  return {
    posts,
    isLoading,
    createPost,
    generateUploadUrl,
    getStorageReadUrl,
  };
}
