# LocalLayer

Hyperlocal community layer on a live map: post **emergencies**, **updates**, and **events** within a fixed radius, with voice and photos, real-time sync, and optional web-grounded answers.

---

## Features

| Area | What it does |
|------|----------------|
| **Map** | Leaflet map centered on GPS; posts as color-coded pins (red / amber / green by type). |
| **Radius** | Posts are scoped to a **5 km** service area; map panning stays inside that bounds. |
| **Posts** | Text, images, and voice notes; Groq **Whisper** transcribes audio and the stack can produce titles, English summaries, and **source language** hints. |
| **Categories** | **Emergency**, **Update**, **Event** — filters on the map and in the nearby list; list rows are visually themed by type. |
| **Nearby list** | Bottom sheet with a featured card and scrollable posts matching the map. |
| **Directions** | Walking-style routes via an **OSRM**-backed API proxy. |
| **Languages** | Map popups: pick among several Indian languages (+ English); choice is **remembered per post** in `localStorage`. |
| **Exa search** | **Web search** panel (modal on small screens, fixed sidebar on large): questions answered with **Exa**’s answer API and cited sources. |
| **Emergency alert** | When someone else posts a new **emergency** within 5 km, other clients get a brief **red full-screen flash** (not shown to the author). |
| **Landing** | Marketing page at `/`; the live app lives at **`/map`**. |
| **Retention** | Scheduled cleanup removes old posts (and storage blobs) after a TTL — see Convex crons. |

---

## Tech stack

| Layer | Choice |
|--------|--------|
| **Frontend** | [v0](https://v0.app/) [Next.js](https://nextjs.org) (App Router), React 19, Tailwind CSS v4 | V0 to generate landing page
| **Maps** | [mobbin](https://mobbin.com/discover/apps/ios/latest) [Leaflet](https://leafletjs.com/) + `react-leaflet` | mobbin for map page UI motivation |
| **Backend / data** | [Convex](https://convex.dev) — queries, mutations, file storage, scheduled jobs |
| **AI (server-only)** | [Groq](https://groq.com) — Whisper + chat models for processing posts (`/api/process`) |
| **Web Q&A** | [Exa](https://exa.ai) — `/answer`-style responses (`/api/exa/answer`) |
| **Routing** | OSRM demo server via `/api/directions` |

Environment variables (see `.env.local`):

- `NEXT_PUBLIC_CONVEX_URL` — Convex deployment URL  
- `GROQ_API_KEY` — Groq API key for `/api/process`  
- `EXA_API_KEY` — Exa API key for web search answers  

---

## Why this stack (advantages)

- **Convex** gives **live subscriptions**: new and updated posts appear on the map and list without manual polling; uploads use Convex **storage** with signed URLs.  
- **Next.js API routes** keep **Groq** and **Exa** keys on the server — nothing sensitive is exposed to the browser.  
- **Leaflet** is lightweight and works well for a hackathon-scale map MVP.  
- **Groq** keeps latency low for transcription and lightweight JSON extraction from captions and images.  
- **Exa** grounds answers in retrieved web sources instead of only model parametric knowledge.  
- **Clear separation**: landing (`/`) vs app (`/map`) keeps marketing and product easy to evolve independently.

---

## How it works

1. **Open the app** at `/map` and **allow location**. The client subscribes to Convex **`listNearby`** for posts within **5 km**.  
2. **Create a post** with the **+** control: choose category, optional text, photo, and/or voice. Media uploads go to Convex storage; the client calls **`/api/process`** with signed URLs so Groq can transcribe and enrich metadata.  
3. **Convex `posts.create`** inserts (or merges nearby similar posts) and returns an id; the UI updates from the live query.  
4. **Map** shows pins; **popups** support language selection and **directions** when GPS is available.  
5. **Web search**: user opens **search** (or uses the sidebar on desktop), submits a question; **`/api/exa/answer`** calls Exa and returns an answer plus **citations**.  
6. **New emergency** (from another user, within range): client compares emergency post ids; if a new id appears and it isn’t your own submission, it triggers the **red flash** overlay.  
7. **Landing** at `/` describes the product; **Get started / Open map** routes users into the map experience.

---

## Getting started

```bash
npm install
```

Configure `.env.local` with Convex URL, `GROQ_API_KEY`, and `EXA_API_KEY` as needed.

Run the Next app:

```bash
npm run dev
```

Run Convex (in another terminal, from project root):

```bash
npx convex dev
```

- Site: [http://localhost:3000](http://localhost:3000) — landing  
- Map app: [http://localhost:3000/map](http://localhost:3000/map)

Production build:

```bash
npm run build
npm start
```

---

## Project layout (short)

- `app/` — routes (`page.js` landing, `map/page.js` app), API routes under `app/api/`  
- `components/` — map, posts, forms, Exa panel, landing  
- `convex/` — schema, posts, crons  
- `hooks/` — e.g. `usePosts`  
- `lib/` — Convex client, Groq helpers, utilities  

---

## License

Private / hackathon use unless you add a license.
