import { Inter } from "next/font/google";
import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "LocalLayer",
  description: "Real-time map-based local updates for emergencies, events, and community news.",
};

/**
 * Root layout — Inter for marketing + app UI; map view uses its own full-viewport overflow.
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} flex min-h-full flex-col overflow-x-hidden antialiased`}>{children}</body>
    </html>
  );
}
