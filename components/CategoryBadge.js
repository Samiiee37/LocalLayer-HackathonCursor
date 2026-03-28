/**
 * User-chosen post type — color coding for quick scanning.
 */
const STYLES = {
  emergency: "bg-red-600 text-white",
  update: "bg-yellow-400 text-slate-900 ring-1 ring-yellow-600/30",
  event: "bg-green-600 text-white",
};

const LABELS = {
  emergency: "Emergency",
  update: "Update",
  event: "Event",
};

export default function CategoryBadge({ category, compact = false }) {
  const cls = STYLES[category] || STYLES.update;
  const label = LABELS[category] || "Update";
  const sizeCls = compact
    ? "max-w-full rounded-full px-1.5 py-px text-[10px] leading-tight"
    : "rounded-full px-2.5 py-0.5 text-xs";
  return (
    <span className={`inline-flex items-center font-medium ${sizeCls} ${cls}`}>
      {label}
    </span>
  );
}
