# BUILD FOR THE NEXT BILLION

Billions of people are still waiting for technology that actually works for them—in their language, in their context, for their problems.

**Our mission:** Build something that matters at scale.

## What problems it solves

- **Trust and speed where it counts:** Neighbors need to see **emergencies**, **updates**, and **events** near them without wading through global noise. LocalLayer keeps the lens **hyperlocal** (e.g. a fixed radius) so signal stays relevant.
- **Barriers to participation:** Not everyone types long posts. **Voice notes**, **photos**, and automatic **transcription / summaries** lower the friction to share what matters.
- **Language:** Information should be readable in the language people prefer. Popup **translation** and multi-language display options help bridge English-centric defaults and local needs.
- **Situational awareness:** **Directions** to a pin and a visible **emergency flash** for others nearby make time-sensitive information actionable, not just a feed item.
- **Grounded facts:** **Web search (Exa)** answers questions with **cited sources**, so people can verify against the open web—not only model guesses.

## Why this is scalable

- **Same pattern, many places:** Any community with a map + radius can reuse the model; **Convex** handles real-time data and storage so you are not rebuilding sync and uploads per city.
- **Server-side AI:** **Groq** and **Exa** run behind **Next.js API routes**—keys stay safe, and you can swap models or providers without rewriting the client.
- **Lightweight map stack:** **Leaflet** runs on modest devices and networks—important where “the next billion” actually lives.
- **Operational simplicity:** Scheduled cleanup and a clear **landing vs app** split keep the system maintainable as usage grows.

## How it can impact a large number of people

- **Many local layers, one architecture:** Rolling out new areas is primarily a **deployment and configuration** problem, not a rewrite—so reach can grow faster than team size.
- **Inclusive input:** Voice-first and visual posts include users who are less comfortable with keyboards or formal writing—widening who can participate.
- **Faster collective response:** When emergencies surface **only to people in range**, communities can coordinate sooner; **cited web answers** reduce rumor and confusion on factual questions.
- **Open web as backstop:** Pairing local posts with **Exa**-grounded answers connects hyperlocal reality to broader knowledge when people need both.

---

# LocalLayer

Hyperlocal community layer on a live map: post **emergencies**, **updates**, and **events** within a fixed radius, with voice and photos, real-time sync, and optional web-grounded answers.

The whole project was built using **[Cursor](https://cursor.com)** for prototyping—map UI, Convex backend, Next.js routes, and integrations were iterated in the editor with AI-assisted development.

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
