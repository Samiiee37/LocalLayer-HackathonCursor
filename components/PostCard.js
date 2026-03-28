import CategoryBadge from "./CategoryBadge";
import { postCardSheetClasses } from "@/lib/categoryTheme";
import { formatTime, truncate } from "@/lib/utils";

/**
 * Sidebar row for one post — text and voice; photos only appear on the map popup.
 */
const shell = {
  default: "rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3 shadow-sm",
  glass:
    "rounded-xl border border-white/10 bg-white/[0.04] p-4 shadow-lg shadow-black/20 backdrop-blur-md",
};

export default function PostCard({ post, variant = "default" }) {
  const display = post.translatedEn || post.body || post.transcribedText;
  const hasText = typeof display === "string" && display.trim().length > 0;
  const titleText = typeof post.title === "string" ? post.title.trim() : "";
  const hasImage =
    (Array.isArray(post.imageUrls) && post.imageUrls.length > 0) || !!post.imageUrl;
  const muted = variant === "glass" || variant === "sheet" ? "text-slate-500" : "text-slate-500 dark:text-slate-400";
  const bodyCls =
    variant === "glass"
      ? "text-slate-200"
      : variant === "sheet"
        ? "text-slate-800"
        : "text-slate-800 dark:text-slate-100";

  const surfaceClass =
    variant === "sheet" ? postCardSheetClasses(post) : shell[variant] ?? shell.default;

  return (
    <article
      className={surfaceClass}
      aria-labelledby={`post-${post._id}`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <CategoryBadge category={post.category} />
        <time
          className={`text-xs ${muted}`}
          dateTime={new Date(post.createdAt).toISOString()}
        >
          {formatTime(post.createdAt)}
        </time>
      </div>
      {titleText ? (
        <p
          id={!hasText ? `post-${post._id}` : undefined}
          className={`mb-1 text-base font-semibold leading-tight ${bodyCls}`}
        >
          {truncate(titleText, 100)}
        </p>
      ) : null}
      {hasText ? (
        <p
          id={titleText ? undefined : `post-${post._id}`}
          className={`text-sm leading-snug ${bodyCls}`}
        >
          {truncate(display, 220)}
        </p>
      ) : !titleText ? (
        <p id={`post-${post._id}`} className={`text-sm italic ${muted}`}>
          {hasImage && post.audioUrl
            ? "Photo and voice note"
            : hasImage
              ? "Photo"
              : post.audioUrl
                ? "Voice note"
                : "Post"}
        </p>
      ) : null}
      {post.audioUrl ? (
        <audio src={post.audioUrl} controls className="mt-2 h-9 w-full max-w-full" />
      ) : null}
      {post.sourceLang && post.sourceLang !== "und" && (
        <p className="mt-1 text-xs text-slate-500">Lang: {post.sourceLang}</p>
      )}
    </article>
  );
}
