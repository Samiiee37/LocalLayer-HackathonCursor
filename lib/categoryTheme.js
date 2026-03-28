/**
 * Tailwind class bundles for post category — aligns list / sheet UI with map pin colors.
 */

export const CATEGORY_LABEL = {
  emergency: "Emergency",
  update: "Update",
  event: "Event",
};

const cat = (post) =>
  post.category === "emergency" || post.category === "update" || post.category === "event"
    ? post.category
    : "update";

/** PostCard `sheet` variant — left accent + soft tint. */
export function postCardSheetClasses(post) {
  switch (cat(post)) {
    case "emergency":
      return "rounded-2xl border border-red-100/90 border-l-4 border-l-red-600 bg-gradient-to-br from-red-50/95 via-white to-white p-4 shadow-[0_2px_14px_rgba(220,38,38,0.08)] ring-1 ring-red-200/35";
    case "event":
      return "rounded-2xl border border-green-100/90 border-l-4 border-l-green-600 bg-gradient-to-br from-green-50/95 via-white to-white p-4 shadow-[0_2px_14px_rgba(22,163,74,0.07)] ring-1 ring-green-200/35";
    default:
      return "rounded-2xl border border-amber-100/90 border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50/95 via-white to-white p-4 shadow-[0_2px_14px_rgba(234,179,8,0.1)] ring-1 ring-amber-200/40";
  }
}

/** Featured hero card in the bottom sheet (first post in list). */
export function featuredCardClasses(post) {
  switch (cat(post)) {
    case "emergency":
      return "relative mb-4 overflow-hidden rounded-2xl border border-red-100/80 border-l-[5px] border-l-red-600 bg-gradient-to-br from-red-100/90 via-red-50/50 to-white p-5 shadow-[0_4px_24px_rgba(220,38,38,0.12)] ring-1 ring-red-200/40";
    case "event":
      return "relative mb-4 overflow-hidden rounded-2xl border border-green-100/80 border-l-[5px] border-l-green-600 bg-gradient-to-br from-green-100/90 via-green-50/50 to-white p-5 shadow-[0_4px_24px_rgba(22,163,74,0.1)] ring-1 ring-green-200/40";
    default:
      return "relative mb-4 overflow-hidden rounded-2xl border border-amber-100/80 border-l-[5px] border-l-amber-500 bg-gradient-to-br from-amber-100/90 via-amber-50/50 to-white p-5 shadow-[0_4px_24px_rgba(234,179,8,0.12)] ring-1 ring-amber-200/45";
  }
}

/** Small label above featured title — matches category. */
export function featuredLabelClasses(post) {
  switch (cat(post)) {
    case "emergency":
      return "text-[10px] font-semibold uppercase tracking-[0.15em] text-red-700";
    case "event":
      return "text-[10px] font-semibold uppercase tracking-[0.15em] text-green-800";
    default:
      return "text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-800";
  }
}
