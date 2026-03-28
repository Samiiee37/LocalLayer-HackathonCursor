import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * Subscribes to Convex `posts.list` and exposes create + file upload for media posts.
 */
export function usePosts() {
  const posts = useQuery(api.posts.list);
  const createPost = useMutation(api.posts.create);
  const generateUploadUrl = useMutation(api.posts.generateUploadUrl);

  return {
    posts: posts ?? [],
    isLoading: posts === undefined,
    createPost,
    generateUploadUrl,
  };
}
