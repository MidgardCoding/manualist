# Manualist — your friendly manual helper

You buy a new oven. It has a digital clock, oh wow! But the time it shows is wrong. You open the manual and spend minutes going through languages you don't speak, tech jargon that doesn't matter to you, all printed in small, unreadable font.

**Here comes Manualist.** You upload:

- Pictures of your manual pages
- An official PDF file for the product
- Or plain text from the manufacturer's website

**And the service handles the rest.** It reads the content, asks AI to make sense of it, and gives you back:

1. **Quick Summary** — what is inside the manual, shortened so you don't have to read all the pages.
2. **Table of Contents** — every section listed with a short description, so you can jump to what you need.
3. **To-Do List** — helpful things to do after purchase or while using the product, with checkboxes you can tick off.
4. **Chat Dock** — talk with AI about your manual in plain words ("how do I clean the filter?"), with markdown answers.

Everything is written in large print and calm, plain language — no strange technical words. Your manuals stay private in your own archive.

## How it works

1. **Upload.** Pick photos (JPG/PNG/WebP), a PDF, or paste text. Photos are read with OCR right in your browser, PDFs are read page by page.
2. **Pay 1 credit.** Every new account gets **10 free credits**. Saving a manual costs 1 credit, and each chat message costs 1 credit. The credit is taken *before* the AI runs, and given back automatically if something fails — you never pay for an error.
3. **AI reads it.** The text is sent to the AI in pieces (long manuals don't fit in one request). Mistral is tried first, OpenRouter models are the fallback if Mistral fails.
4. **You get results.** A summary, a table of contents, and a to-do list appear. Your files, the extracted text, and the chat history are saved per manual, so you can come back later.
5. **Chat.** Ask follow-up questions. The assistant answers from the summary first and pulls exact quotes from your manual when it needs more detail.

Out of credits? A friendly modal pops up on any page and points you to `/pricing`, where you can top up (the shop is still manual during beta — you contact us on Discord).

## Current state: beta

Manualist started as a fully AI-driven assistant, but the plan grew. The goal is a **hub for your devices**: save each device, track its warranty, and note every failure and repair in one place. The AI summary and chat are step one; the device hub is where this is going.

## Tech stack

| Area | What we use |
|---|---|
| App | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS 4 + daisyUI, framer-motion for animation, lucide-react icons |
| Routing | react-router-dom (landing, login, register, app, settings, pricing, terms) |
| State | zustand (persisted wizard/manual state) |
| Backend | Supabase: Auth, Postgres with Row Level Security, Storage buckets, Edge Functions |
| Text extraction | Tesseract.js (OCR for photos, in-browser), unpdf (PDF text) |
| AI | Mistral first (`ministral-8b-2512`), OpenRouter models as fallback |
| Safety | DOMPurify for chat markdown, security headers on Netlify |
| Feedback | react-hot-toast for small messages |

Database tables: `manuals` (your saved manuals), `user_files` (uploaded files per manual), `user_credits` (your balance, changed only through secure server functions), plus Supabase Auth users. Storage buckets: `user-manuals` (private, one folder per user) and `avatars` (public profile pictures).

## Run it locally

You need **Node.js 18 or newer** and a **free Supabase account**.

```bash
# 1. Install everything
npm install

# 2. Start the app
npm run dev
```

### 1. Create the `.env` file

Copy these names into a file called `.env` in the project root and fill in your own keys (never share this file — it is git-ignored):

```ini
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
VITE_OPENROUTER_API_KEY=sk-or-v1-your-key
MISTRAL_API_KEY=mstrl-your-key
```

Where the keys come from:

- Supabase URL + publishable key: Supabase Dashboard → Project Settings → API.
- OpenRouter key: [openrouter.ai](https://openrouter.ai) → Keys.
- Mistral key: [console.mistral.ai](https://console.mistral.ai) → API keys.

The app tries Mistral first and falls back to OpenRouter, so for local testing one of the two AI keys is enough.

### 2. Set up the database

In Supabase Dashboard → SQL Editor, run the files in `supabase/migrations/` **in order**, from `001` to `007`:

- `001_storage_rls.sql` — file buckets and access rules
- `002_manuals.sql` — the manuals table
- `003_manual_packs_and_todo.sql` — per-manual files and to-do checkboxes
- `004_avatars_and_profile.sql` — avatars and account deletion
- `005_credits.sql` — the credit system (10 free credits per new user)
- `006_manuals_composite_index.sql` — speed index
- `007_hardening.sql` — blocks self-giving credits, cleans storage on account delete

### 3. (Optional) Deploy the Edge Functions

`supabase/functions/generate` and `supabase/functions/chat` are the server-side way to call the AI (keys stay secret there instead of living in the browser). For local development you can skip this — the app calls the AI directly. To use them in production:

```bash
supabase secrets set MISTRAL_API_KEY=... OPENROUTER_API_KEY=...
supabase functions deploy generate chat
```

### 4. Build and check

```bash
npm run build    # type-check + production build (output goes to dist/)
npm run preview  # serve the production build locally
npm run lint     # code checks
```

The live site deploys on Netlify — `netlify.toml` already handles the single-page-app redirects and security headers.

## How to collaborate

This is a beginner-friendly project — small, careful pull requests beat big rewrites. Here is how to help:

1. **Pick an issue** (or open one). Good first tasks: clearer wording, better empty states, accessibility fixes, tests.
2. **Fork and branch.** Create a branch with a plain name, e.g. `fix-chat-scroll` or `device-warranty-note`.
3. **Keep the tone.** The whole point of Manualist is plain, calm language. If you add words the user sees, write them like you would explain to a grandparent: short sentences, no jargon.
4. **Don't restyle.** The design is settled — fix bugs and logic, but don't change how things look unless we agreed on it in the issue first.
5. **Charging rules.** Anything that spends a credit must take it *before* the AI call and refund it on failure (see `useCredits()` and `supabase/migrations/007_hardening.sql`). Never give the AI away for free, never charge for an error.
6. **Check before you push.** Run `npx tsc -b` and `npm run build` — both must pass with no errors.
7. **Open a pull request** against `main` with a short description: what you changed, why, and how you tested it.

### Ideas waiting for you (roadmap)

- Device hub: one page per device with warranty dates and a repair/failure log.
- Real payments instead of manual Discord top-ups.
- More input types (video chapters, manufacturer links).
- Reminders: "your warranty ends in 30 days", "time to clean the filter".
- Translations of the plain-language answers.

Thanks for stopping by — whether you fix a typo or build the device hub, every bit helps make manuals human.
