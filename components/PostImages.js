"use client";

/**
 * Map popup only — merged event photos in a fixed-height scroll area (does not grow the popup).
 */
export default function PostImages({ urls }) {
  const list = Array.isArray(urls) && urls.length > 0 ? urls : [];
  if (list.length === 0) return null;

  return (
    <div className="ll-popup-images-scroll">
      {list.map((url, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={`${url}-${i}`} src={url} alt="" className="ll-popup-gallery-img" />
      ))}
    </div>
  );
}
