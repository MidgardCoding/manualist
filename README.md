<div align="center">
  <h1>Manualist - your friendly manual helper</h1>
  <img width="959" height="476" alt="Manualist Landing Page" src="https://github.com/user-attachments/assets/b22c63d4-1016-47cb-8a9a-e3d6c2f1ff7a" />
  <h4><a href="https://manualist.onrender.com" target="_blank">Check the live beta here</a></h4>
</div>

You buy a new oven. It has a digital clock, oh wow! But the time it shows is wrong. You open the manual and spend minutes going through languages you don't speak, tech jargon that doesn't matter to you, all printed in small, unreadable font.

**Here comes Manualist!** You upload:

- Pictures of your manual pages
- An official PDF file for the product
- Or plain text from the manufacturer's website

**And the service handles the rest.** It reads the content, asks AI to make sense of it, and gives you back:

1. **Quick Summary** - what is inside the manual, shortened so you don't have to read all the pages.
2. **Table of Contents** - every section listed with a short description, so you can jump to what you need.
3. **To-Do List** - helpful things to do after purchase or while using the product, with checkboxes you can tick off.
4. **Chat Dock** - talk with AI about your manual in plain words ("how do I clean the filter?").

## How it works

1. **Upload.** Pick photos (JPG/PNG/WebP), a PDF, or paste text. Photos are read with OCR right in your browser, PDFs are read page by page.
2. **Pay 1 credit.** Every new account gets **10 free credits**. Saving a manual costs 1 credit, and each chat message costs 1 credit.
3. **AI reads it.** The text is sent to the AI in pieces (long manuals don't fit in one request). Mistral is tried first, OpenRouter models are the fallback if Mistral fails.
4. **You get results.** A summary, a table of contents, and a to-do list appear. Your files, the extracted text, and the chat history are saved per manual, so you can come back later.
5. **Chat.** Ask follow-up questions. The assistant answers from the summary first and pulls exact quotes from your manual when it needs more detail.

Out of credits? A friendly modal pops up on any page and points you to `/pricing`, where you can top up (the shop is still manual during beta - you can contact me on [Discord](https://discord.gg/cnXFReJNRZ)).

<img width="952" height="476" alt="Chat Dock" src="https://github.com/user-attachments/assets/f781e097-2bf9-42ad-ad76-478cbea058f9" />

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

Copy these names into a file called `.env` in the project root and fill in your own keys (never share this file - it is git-ignored):

```ini
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
VITE_OPENROUTER_API_KEY=sk-or-v1-your-key
MISTRAL_API_KEY=mstrl-your-key
```

### 2. Set up the database

In Supabase Dashboard → SQL Editor, run the files in `supabase/migrations/` **in order**, from `001` to `007`.

### 3. Build and check

```bash
npm run build
npm run preview
npm run lint
```

### Ideas waiting for you (roadmap)

- Device hub: one page per device with warranty dates and a repair/failure log.
- Real payments instead of manual Discord top-ups.
- More input types (video chapters, manufacturer links).
- Reminders: "your warranty ends in 30 days", "time to clean the filter".
- Translations of the plain-language answers.
More details on the Discord server:
https://discord.gg/cnXFReJNRZ

Thanks for stopping by - whether you fix a typo or build the device hub, every bit helps make manuals human.
