import CategoryBadge from "./CategoryBadge";
import { formatTime, truncate } from "@/lib/utils";

/**
 * Sidebar row for one post — text, optional image, optional voice.
 */
const shell = {
  default: "rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3 shadow-sm",
  glass:
    "rounded-xl border border-white/10 bg-white/[0.04] p-4 shadow-lg shadow-black/20 backdrop-blur-md",
  sheet:
    "rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_12px_rgba(15,23,42,0.06)]",
};

export default function PostCard({ post, variant = "default" }) {
  const display = post.translatedEn || post.body;
  const hasText = typeof display === "string" && display.trim().length > 0;
  const muted = variant === "glass" || variant === "sheet" ? "text-slate-500" : "text-slate-500 dark:text-slate-400";
  const bodyCls =
    variant === "glass"
      ? "text-slate-200"
      : variant === "sheet"
        ? "text-slate-800"
        : "text-slate-800 dark:text-slate-100";

  return (
    <article
      className={shell[variant] ?? shell.default}
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
      {hasText ? (
        <p id={`post-${post._id}`} className={`text-sm leading-snug ${bodyCls}`}>
          {truncate(display, 220)}
        </p>
      ) : (
        <p id={`post-${post._id}`} className={`text-sm italic ${muted}`}>
          {post.imageUrl && post.audioUrl
            ? "Photo and voice note"
            : post.imageUrl
              ? "Photo"
              : post.audioUrl
                ? "Voice note"
                : "Post"}
        </p>
      )}
      {post.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.imageUrl}
          alt=""
          className="mt-2 max-h-48 w-full rounded-lg object-cover"
        />
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
