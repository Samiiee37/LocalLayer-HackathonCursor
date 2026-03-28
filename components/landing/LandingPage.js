import Link from "next/link";

function LogoMark({ className = "h-8 w-8" }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M6 22 L16 26 L26 22 L26 18 L16 22 L6 18 Z" fill="#22c55e" opacity="0.95" />
      <path d="M6 16 L16 20 L26 16 L26 12 L16 16 L6 12 Z" fill="#22c55e" opacity="0.75" />
      <path d="M6 10 L16 14 L26 10 L26 6 L16 10 L6 6 Z" fill="#22c55e" opacity="0.55" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <span className="inline-block translate-y-px" aria-hidden>
      →
    </span>
  );
}

const nav = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
];

const features = [
  {
    title: "Hyperlocal map",
    body: "Posts appear as pins within a fixed radius of your position so you only see what’s relevant nearby.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    ),
  },
  {
    title: "Emergency, update & event",
    body: "Each post has a type — color-coded on the map and in the list — so you can scan quickly.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    ),
  },
  {
    title: "Text, photo & voice",
    body: "Add a caption, image, or voice note. Content can be processed for titles and English summaries.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    ),
  },
  {
    title: "Directions & language",
    body: "Get walking-style routes to a pin when location is on. Popups support multiple display languages.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    ),
  },
];

const steps = [
  {
    n: "01",
    title: "Allow location",
    body: "The map recenters on you and loads posts in range. You can filter by category and open pin details.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    ),
  },
  {
    n: "02",
    title: "Browse & post",
    body: "Use the + control to compose a post with type, text, media, and optional AI-assisted title and summary.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    ),
  },
  {
    n: "03",
    title: "Stay synced",
    body: "Updates stream in real time via Convex — new and edited posts refresh the map and the sheet below it.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    ),
  },
  {
    n: "04",
    title: "Use the list",
    body: "The bottom sheet mirrors nearby posts with category styling. Tap through to explore on the map.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
    ),
  },
];

export default function LandingPage() {
  return (
    <div className="ll-landing min-h-screen bg-black text-zinc-100">
      <header className="sticky top-0 z-50 border-b border-zinc-900/80 bg-black/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark />
            <span className="text-lg font-bold tracking-tight text-white">LocalLayer</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-zinc-400 md:flex">
            {nav.map((item) => (
              <a key={item.href} href={item.href} className="transition hover:text-white">
                {item.label}
              </a>
            ))}
          </nav>
          <Link
            href="/map"
            className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            Open map
          </Link>
        </div>
        <div className="border-t border-zinc-900/80 md:hidden">
          <nav className="flex gap-4 overflow-x-auto px-4 py-2.5 text-xs font-medium text-zinc-400">
            {nav.map((item) => (
              <a key={item.href} href={item.href} className="shrink-0 whitespace-nowrap hover:text-white">
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main>
        <section className="ll-landing-grid relative overflow-hidden px-4 pb-20 pt-12 sm:px-6 sm:pb-28 sm:pt-16">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl">
              Your neighborhood, <span className="text-green-500">connected</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
              A live map of nearby posts: emergencies, updates, and events — with text, photos, and voice, synced in real
              time.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link
                href="/map"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition hover:bg-zinc-200 sm:w-auto"
              >
                Open map <ArrowRight />
              </Link>
              <a
                href="#features"
                className="inline-flex w-full items-center justify-center rounded-full border border-zinc-600 bg-transparent px-8 py-3.5 text-sm font-semibold text-white transition hover:border-zinc-500 hover:bg-zinc-900/50 sm:w-auto"
              >
                What it does
              </a>
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-20 border-t border-zinc-900 bg-black px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-green-500">Features</p>
            <h2 className="mt-3 text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">What’s in the MVP</h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-zinc-400">
              LocalLayer is a small, focused tool: one map, one radius, posts that match how your hackathon build works
              today.
            </p>
            <div className="mt-14 grid gap-5 sm:grid-cols-2">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="rounded-2xl border border-zinc-800/90 bg-zinc-950/50 p-6 ring-1 ring-zinc-800/50 transition hover:border-zinc-700"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-zinc-900 ring-1 ring-zinc-800">
                    <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      {f.icon}
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-20 border-t border-zinc-900 bg-zinc-950/40 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-green-500">How it works</p>
            <h2 className="mt-3 text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">Using the app</h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-zinc-400">
              No separate signup on this MVP — go straight to the map and try it with location enabled.
            </p>

            <div className="relative mt-16">
              <div className="absolute left-0 right-0 top-[2.75rem] hidden h-px bg-zinc-800 md:block" aria-hidden />
              <div className="grid gap-12 md:grid-cols-4 md:gap-6">
                {steps.map((s) => (
                  <div key={s.n} className="relative text-center md:text-left">
                    <div className="relative mx-auto flex w-fit md:mx-0">
                      <div className="flex h-[5.5rem] w-[5.5rem] shrink-0 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/90 ring-4 ring-black">
                        <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          {s.icon}
                        </svg>
                      </div>
                      <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-black ring-2 ring-black">
                        {s.n}
                      </span>
                    </div>
                    <h3 className="mt-6 text-lg font-semibold text-white">{s.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-400">{s.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-zinc-900 px-4 py-16 sm:px-6">
          <div className="ll-landing-cta mx-auto max-w-2xl rounded-3xl border border-zinc-800 bg-zinc-950/80 px-6 py-12 text-center ring-1 ring-zinc-800/80 sm:px-10">
            <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Try the map</h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-zinc-400">
              Opens the live LocalLayer experience: Leaflet map, Convex-backed posts, and the nearby list.
            </p>
            <Link
              href="/map"
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
            >
              Open map <ArrowRight />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-900 bg-black px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5">
              <LogoMark className="h-7 w-7" />
              <span className="font-bold text-white">LocalLayer</span>
            </Link>
            <p className="mt-2 max-w-sm text-sm text-zinc-500">Hyperlocal posts on a map — MVP demo.</p>
          </div>
          <p className="text-xs text-zinc-600">© {new Date().getFullYear()} LocalLayer</p>
        </div>
      </footer>
    </div>
  );
}
