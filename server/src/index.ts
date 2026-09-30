import "./env.js";
import express, { type NextFunction, type Request, type Response } from "express";
import fs from "node:fs";
import path from "node:path";
import { AiError, analyzeLead, answerQuestion, generateCallBrief } from "./ai.js";
import { createLead, deleteLead, getLead, listLeads, saveLeads, type Lead, type LeadInput } from "./store.js";

const app = express();
app.use(express.json({ limit: "100kb" }));

const limits: Record<keyof LeadInput, [min: number, max: number, label: string]> = {
  name: [2, 100, "Name"],
  location: [2, 100, "Location"],
  requirement: [3, 300, "Property requirement"],
  budget: [1, 100, "Budget"],
  timeline: [1, 100, "Buying timeline"],
  message: [10, 4000, "Customer message"],
};

function validateLead(body: unknown): { input?: LeadInput; fields?: Record<string, string> } {
  const data = (body ?? {}) as Record<string, unknown>;
  const fields: Record<string, string> = {};
  const input = {} as LeadInput;
  for (const key of Object.keys(limits) as (keyof LeadInput)[]) {
    const [min, max, label] = limits[key];
    const value = typeof data[key] === "string" ? (data[key] as string).trim() : "";
    if (!value) fields[key] = `${label} is required.`;
    else if (value.length < min) fields[key] = `${label} needs at least ${min} characters.`;
    else if (value.length > max) fields[key] = `${label} must be ${max} characters or fewer.`;
    else input[key] = value;
  }
  return Object.keys(fields).length ? { fields } : { input };
}

async function findLead(req: Request, res: Response): Promise<Lead | undefined> {
  const lead = await getLead(String(req.params.id));
  if (!lead) res.status(404).json({ error: "Lead not found." });
  return lead;
}

app.get("/api/leads", async (_req, res) => {
  res.json(await listLeads());
});

app.get("/api/leads/:id", async (req, res) => {
  const lead = await findLead(req, res);
  if (lead) res.json(lead);
});

// The lead is saved before the AI runs, so an AI failure never loses what the salesperson typed.
app.post("/api/leads", async (req, res) => {
  const { input, fields } = validateLead(req.body);
  if (!input) return res.status(400).json({ error: "Please fix the highlighted fields.", fields });

  const lead = await createLead(input);
  try {
    lead.analysis = await analyzeLead(lead);
  } catch (err) {
    lead.analysisError = err instanceof AiError ? err.message : "Analysis failed. Please retry.";
    if (!(err instanceof AiError)) console.error(err);
  }
  await saveLeads();
  res.status(201).json(lead);
});

app.post("/api/leads/:id/analyze", async (req, res) => {
  const lead = await findLead(req, res);
  if (!lead) return;
  try {
    lead.analysis = await analyzeLead(lead);
    lead.analysisError = null;
    await saveLeads();
    res.json(lead);
  } catch (err) {
    const message = err instanceof AiError ? err.message : "Analysis failed. Please retry.";
    lead.analysisError = message;
    await saveLeads();
    res.status(err instanceof AiError ? err.status : 500).json({ error: message });
  }
});

app.post("/api/leads/:id/call-brief", async (req, res) => {
  const lead = await findLead(req, res);
  if (!lead) return;
  lead.callBrief = await generateCallBrief(lead);
  await saveLeads();
  res.json(lead);
});

app.post("/api/leads/:id/chat", async (req, res) => {
  const lead = await findLead(req, res);
  if (!lead) return;
  const question = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!question) return res.status(400).json({ error: "Type a question first." });
  if (question.length > 2000) return res.status(400).json({ error: "Questions are limited to 2000 characters." });

  const reply = await answerQuestion(lead, lead.chat, question);
  const now = new Date().toISOString();
  lead.chat.push({ role: "user", content: question, at: now }, { role: "assistant", content: reply, at: now });
  await saveLeads();
  res.json(lead);
});

app.delete("/api/leads/:id", async (req, res) => {
  const removed = await deleteLead(String(req.params.id));
  if (!removed) return res.status(404).json({ error: "Lead not found." });
  res.status(204).end();
});

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found." });
});

// In production the built client is served from this same process.
const clientDist = path.resolve(process.cwd(), "../client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((_req, res) => res.sendFile(path.join(clientDist, "index.html")));
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AiError) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => console.log(`AgentDesk API on http://localhost:${port}`));
