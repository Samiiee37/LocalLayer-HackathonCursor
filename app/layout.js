import "@/styles/globals.css";

export const metadata = {
  title: "Live Local Layer",
  description: "Real-time map-based local updates for emergencies, traffic, weather, and announcements.",
};

/**
 * Root layout: no heavy webfonts — system stack loads fast on low bandwidth.
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col overflow-hidden antialiased">{children}</body>
    </html>
  );
}
