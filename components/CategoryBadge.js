/**
 * User-chosen post type — color coding for quick scanning.
 */
const STYLES = {
  emergency: "bg-red-600 text-white",
  update: "bg-amber-500 text-slate-900",
  event: "bg-violet-600 text-white",
};

const LABELS = {
  emergency: "Emergency",
  update: "Update",
  event: "Event",
};

export default function CategoryBadge({ category }) {
  const cls = STYLES[category] || STYLES.update;
  const label = LABELS[category] || "Update";
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {label}
    </span>
  );
}
