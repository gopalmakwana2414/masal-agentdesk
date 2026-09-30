import { GoogleGenAI } from "@google/genai";
import type { Analysis, CallBrief, ChatMessage, Lead, Priority } from "./store.js";

export class AiError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}

let client: GoogleGenAI | null = null;
let currentKey: string | null = null;

function getClient(): GoogleGenAI {
  const rawKey = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY || "";
  const apiKey = rawKey.trim().replace(/^["']|["']$/g, "");
  if (!apiKey) {
    console.error("[Config Error] process.cwd():", process.cwd());
    console.error("[AI Service Error] GEMINI_API_KEY is not set or is empty in server/.env.");
    throw new AiError("The AI service is not configured. Set GEMINI_API_KEY on the server.", 503);
  }
  if (!client || currentKey !== apiKey) {
    client = new GoogleGenAI({ apiKey });
    currentKey = apiKey;
  }
  return client;
}

type Turn = { role: "user" | "model"; parts: { text: string }[] };

async function generate(system: string, contents: Turn[], json: boolean): Promise<string> {
  const modelName = process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";
  let lastErr: any = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await getClient().models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction: system,
          temperature: json ? 0.3 : 0.6,
          ...(json ? { responseMimeType: "application/json" } : {}),
        },
      });
      const text = res.text?.trim();
      if (!text) throw new AiError("The AI returned an empty response. Please try again.");
      return text;
    } catch (err: any) {
      if (err instanceof AiError) throw err;
      lastErr = err;
      const status = err?.status || err?.statusCode;
      if ((status === 503 || status === 429) && attempt < 3) {
        console.warn(`[Gemini Retry] Attempt ${attempt} failed with ${status}. Retrying in ${attempt}s...`);
        await new Promise((r) => setTimeout(r, 1000 * attempt));
        continue;
      }
      break;
    }
  }

  console.error("[Gemini Raw Error]:", lastErr?.status || lastErr?.statusCode || lastErr?.code, lastErr?.message || lastErr);
  const status = lastErr?.status || lastErr?.statusCode;
  if (status === 429 || status === 503) {
    throw new AiError("The AI service is currently busy or rate limited. Wait a few seconds and try again.", 429);
  }
  if (status === 400 || status === 401 || status === 403 || status === 404) {
    throw new AiError(`The AI service rejected the request (${status}: ${lastErr?.message || "Invalid request"}). Check the API key and model name on the server.`);
  }
  throw new AiError("The AI service is unavailable. Please try again shortly.");
}

// ---------- prompts ----------

const baseRules = `You assist a real-estate salesperson who is working a single inbound lead.
Use only the lead details provided. Never invent budgets, family details, property names, prices, availability or promises.
If something is not stated, say it is unknown or suggest asking about it.
Be concrete and brief. Reply in English unless a field says otherwise.`;

const priorityRubric = `Priority rubric:
- HOT: specific requirement, budget that plausibly fits it, buying within about a month or urgent wording, and asks for a visit, price or availability.
- WARM: genuine interest, but the timeline is 1-6 months, or important details are missing, or they are comparing options.
- COLD: vague or just exploring, timeline beyond 6 months, budget clearly far below the requirement, or very little engagement.`;

function leadContext(lead: Lead): string {
  const lines = [
    `Name: ${lead.name}`,
    `Location: ${lead.location}`,
    `Property requirement: ${lead.requirement}`,
    `Budget: ${lead.budget}`,
    `Buying timeline: ${lead.timeline}`,
    `Customer message:\n"""\n${lead.message}\n"""`,
  ];
  if (lead.analysis) {
    lines.push(
      `Earlier AI analysis: priority ${lead.analysis.priority} (${lead.analysis.priorityReason}). Summary: ${lead.analysis.summary}`,
      `Concerns noted: ${lead.analysis.concerns.join("; ") || "none"}`,
      `Draft reply prepared for the customer:\n"""\n${lead.analysis.suggestedResponse}\n"""`
    );
  }
  return lines.join("\n");
}

// ---------- parsing ----------

function parseJson(text: string): unknown {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("no JSON object found");
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

function str(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`missing ${field}`);
  return value.trim();
}

function list(value: unknown, field: string, max = 6): string[] {
  if (!Array.isArray(value)) throw new Error(`missing ${field}`);
  return value
    .filter((v): v is string => typeof v === "string" && v.trim() !== "")
    .map((v) => v.trim())
    .slice(0, max);
}

export function normalizeAnalysis(raw: unknown): Analysis {
  const r = raw as Record<string, unknown>;
  const priority = String(r?.priority ?? "").trim().toUpperCase();
  if (!["HOT", "WARM", "COLD"].includes(priority)) throw new Error("bad priority");
  return {
    priority: priority as Priority,
    priorityReason: str(r.priorityReason, "priorityReason"),
    summary: str(r.summary, "summary"),
    intent: str(r.intent, "intent"),
    keyRequirements: list(r.keyRequirements, "keyRequirements"),
    concerns: list(r.concerns, "concerns"),
    recommendedNextAction: str(r.recommendedNextAction, "recommendedNextAction"),
    suggestedResponse: str(r.suggestedResponse, "suggestedResponse"),
    generatedAt: new Date().toISOString(),
  };
}

export function normalizeCallBrief(raw: unknown): CallBrief {
  const r = raw as Record<string, unknown>;
  return {
    emphasize: list(r?.emphasize, "emphasize"),
    avoid: list(r.avoid, "avoid"),
    questionsToAsk: list(r.questionsToAsk, "questionsToAsk"),
    callGoal: str(r.callGoal, "callGoal"),
    generatedAt: new Date().toISOString(),
  };
}

// The model occasionally returns broken JSON; one retry is usually enough.
async function generateJson<T>(system: string, prompt: string, normalize: (raw: unknown) => T): Promise<T> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const text = await generate(system, [{ role: "user", parts: [{ text: prompt }] }], true);
    try {
      return normalize(parseJson(text));
    } catch (err) {
      console.warn(`Unusable model output (attempt ${attempt}):`, (err as Error).message);
    }
  }
  throw new AiError("The AI response could not be read. Please try again.");
}

// ---------- public functions ----------

export function analyzeLead(lead: Lead) {
  const system = `${baseRules}\n\n${priorityRubric}`;
  const prompt = `Analyze this lead.

${leadContext(lead).split("Earlier AI analysis")[0]}
Return a JSON object with exactly these keys:
{
  "priority": "HOT" | "WARM" | "COLD",
  "priorityReason": one sentence that cites facts from the lead,
  "summary": 2-3 sentences,
  "intent": what the customer is trying to do, one or two sentences,
  "keyRequirements": array of short strings, only things the lead states,
  "concerns": array of short strings, objections or worries stated or clearly implied (empty array if none),
  "recommendedNextAction": one specific action the salesperson should take next,
  "suggestedResponse": a ready-to-send reply from the salesperson, under 90 words, matching the language and tone of the customer's message, without invented facts
}`;
  return generateJson(system, prompt, normalizeAnalysis);
}

export function generateCallBrief(lead: Lead) {
  const prompt = `Prepare the salesperson for a phone call with this lead.

${leadContext(lead)}

Return a JSON object with exactly these keys:
{
  "emphasize": 3-4 short points to stress on the call,
  "avoid": 2-3 short things to avoid saying or doing,
  "questionsToAsk": 3-5 questions that fill gaps in what we know,
  "callGoal": one sentence describing the single outcome to aim for
}`;
  return generateJson(baseRules, prompt, normalizeCallBrief);
}

export async function answerQuestion(lead: Lead, history: ChatMessage[], question: string): Promise<string> {
  const system = `${baseRules}
You are answering the salesperson's questions about this specific lead. Stay on this lead; if asked something unrelated, briefly steer back.
Write plain text only: no markdown, no asterisks. Use "- " for lists. Keep answers short unless asked for more.

LEAD
${leadContext(lead)}`;
  const turns: Turn[] = [
    ...history.slice(-12).map((m): Turn => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.content }] })),
    { role: "user", parts: [{ text: question }] },
  ];
  return generate(system, turns, false);
}
