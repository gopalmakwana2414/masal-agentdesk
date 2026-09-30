# Masal AgentDesk

A small workspace for real-estate salespeople. Paste in an inbound lead and AgentDesk summarizes it, ranks it Hot / Warm / Cold, drafts a reply, prepares a call brief, and lets you ask follow-up questions about that specific lead.

## Problem

Salespeople get inquiries as messy free text and have to decide quickly who to call first and what to say. AgentDesk turns each inquiry into a scannable analysis and keeps everything about a lead in one place.

## Features

- Lead intake form (name, location, requirement, budget, timeline, customer message) with client- and server-side validation
- AI analysis: priority and reason, summary, intent, key requirements, concerns, recommended next action, suggested reply
- Multiple saved leads, sorted by priority, filterable by Hot / Warm / Cold
- Per-lead conversation, grounded in that lead's details and analysis
- **AI Call Brief**: what to emphasize, what to avoid, questions to ask, and a goal for the call; can be regenerated
- Overview page: counts by priority, hot leads with their next action, leads whose analysis failed
- Retry, delete, and copy-reply actions

## Architecture

```
client/   React + Vite + Tailwind (talks to /api)
server/   Express + TypeScript
  src/index.ts   routes and validation
  src/ai.ts      Gemini calls, prompts, response parsing
  src/store.ts   lead storage (JSON file)
```

In production the Express server also serves the built client, so there is one deployable and no CORS setup. In development Vite proxies `/api` to the server.

## Tech stack

React 18, TypeScript, Vite, Tailwind CSS 4, Node 20+, Express 5, `@google/genai` SDK.

## AI model and how it is called

Model: `gemini-2.5-flash` by default, overridable with `GEMINI_MODEL`. Google's docs list newer models and a newer Interactions API; this project uses the SDK's `generateContent`, which Google still supports. If your key has quota for a different model, change the env var.

All calls happen on the server (`server/src/ai.ts`); the key is never sent to the browser.

- Analysis and call brief use `responseMimeType: "application/json"` with the exact JSON shape spelled out in the prompt, at temperature 0.3.
- Responses are parsed (code fences stripped if present), then validated and normalized: priority must be HOT/WARM/COLD, required strings must be non-empty, lists are trimmed to strings and capped. If parsing or validation fails, the call is retried once; after that the user sees a readable error.
- Chat sends a system instruction containing the lead's details plus its analysis, followed by the last 12 messages and the new question, at temperature 0.6.
- Prompts tell the model to use only the lead's information and to say when something is unknown.

## Data flow

1. The form posts to `POST /api/leads`. The server validates and **saves the lead first**.
2. It then calls Gemini for the analysis and stores the result on the lead. If the AI fails, the lead is kept with an error message and can be retried.
3. The client shows the lead. Call brief and chat use `POST /api/leads/:id/call-brief` and `/chat`, each returning the updated lead.

Other routes: `GET /api/leads`, `GET /api/leads/:id`, `POST /api/leads/:id/analyze`, `DELETE /api/leads/:id`.

## Run locally

Requires Node 20 or newer.

```bash
npm run install:all
cp server/.env.example server/.env    # then put your key in GEMINI_API_KEY
npm run dev
```

Open http://localhost:5173. The API runs on port 3001.

## Environment variables (`server/.env`)

| Name | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Required. Get one from Google AI Studio. |
| `GEMINI_MODEL` | Optional. Defaults to `gemini-2.5-flash`. |
| `PORT` | Optional. Defaults to 3001. |
| `DATA_FILE` | Optional. Path of the leads JSON file. Defaults to `server/data/leads.json`. |

## Production build

```bash
npm run install:all
npm run build
npm start        # serves API and client on PORT
```

## Deploying

The server stores leads in a file, so it needs a host with a normal process and filesystem. Vercel serverless functions do not fit this design.

Render (free web service), as an example:

- Build command: `npm run install:all && npm run build`
- Start command: `npm start`
- Environment: `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`)

On Render's free tier the disk is not persistent, so leads reset when the service redeploys or restarts. Fine for a demo; for real use, attach a persistent disk and set `DATA_FILE` to a path on it, or replace `store.ts` with a database.

## Key technical decisions

- **JSON file instead of a database.** One user, a handful of leads, no extra service to set up. `store.ts` is the only file that touches storage, so swapping it out is contained.
- **Save the lead before calling the AI.** A slow or failed model call should never lose what the salesperson typed.
- **Single origin in production.** Avoids CORS configuration and a second deployment.
- **No validation or state libraries.** Validation is a small table of limits on the server and a matching check on the client; state is `useState` in `App.tsx`.
- **Server owns the prompts and normalization.** The frontend only ever receives data in the expected shape.

## Lead prioritization

The priority is the model's judgment, guided by a rubric in the prompt (`priorityRubric` in `server/src/ai.ts`):

- **Hot**: specific requirement, budget that plausibly fits, buying within about a month or urgent wording, and asks for a visit, price or availability.
- **Warm**: real interest, but a 1-6 month timeline, missing details, or comparing options.
- **Cold**: vague or exploring, timeline beyond 6 months, budget far below the requirement, or little engagement.

The model also gives a one-sentence reason citing the lead's facts. This is a practical triage signal, not a calibrated score. Re-running the analysis can change the result, and the salesperson should override it when they know better. The lead list sorts Hot, then Warm, then Cold, then newest first; leads without an analysis go last.

## AI Call Brief

On the lead page, the Call brief tab generates four things from that lead's details and analysis: points to emphasize, things to avoid, questions to ask (aimed at what is still unknown), and one goal for the call. "Regenerate brief" produces a fresh version. It is stored with the lead, so it is there the next time you open it.

## Known limitations

- No authentication; anyone with the URL can see all leads.
- File storage: not suitable for multiple server instances, and not persistent on free hosts without a disk (see Deploying).
- Model output can be wrong or generic. The prompts reduce invented details but cannot rule them out.
- Free-tier Gemini quotas can be low; a 429 from Google shows up as a "rate limited" message.
- Chat history is capped at the last 12 messages when sent to the model.
- No automated tests. Checks done during development are listed below.

### What was and wasn't tested

Tested: server and client type-check and build; validation errors; lead creation; persistence across a server restart; delete; 404s; behavior when the API key is missing (lead is saved, analysis error is stored, retry endpoints return a clear 503); the JSON normalizers against good and bad model output.

**Not tested**: live Gemini responses (no API key was available when this was built), so prompt quality and the exact JSON the model returns need a run with your key. Layout in a real browser, including mobile widths, was not checked visually.

## AI usage disclosure

AI coding tools were used to build this project: for scaffolding, for drafting the prompts and parts of the code, and for review. Edit this section to reflect exactly which tools you used and how.
