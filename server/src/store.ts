import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type Priority = "HOT" | "WARM" | "COLD";

export interface Analysis {
  priority: Priority;
  priorityReason: string;
  summary: string;
  intent: string;
  keyRequirements: string[];
  concerns: string[];
  recommendedNextAction: string;
  suggestedResponse: string;
  generatedAt: string;
}

export interface CallBrief {
  emphasize: string[];
  avoid: string[];
  questionsToAsk: string[];
  callGoal: string;
  generatedAt: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  at: string;
}

export interface LeadInput {
  name: string;
  location: string;
  requirement: string;
  budget: string;
  timeline: string;
  message: string;
}

export interface Lead extends LeadInput {
  id: string;
  createdAt: string;
  analysis: Analysis | null;
  analysisError: string | null;
  callBrief: CallBrief | null;
  chat: ChatMessage[];
}

// Leads live in memory and are written through to a JSON file on every change.
const file = process.env.DATA_FILE ?? path.resolve(process.cwd(), "data/leads.json");
let leads: Lead[] | null = null;
let pendingWrite: Promise<void> = Promise.resolve();

async function load(): Promise<Lead[]> {
  if (leads) return leads;
  try {
    leads = JSON.parse(await fs.readFile(file, "utf8")) as Lead[];
  } catch {
    leads = [];
  }
  return leads;
}

function persist(): Promise<void> {
  pendingWrite = pendingWrite.then(async () => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(leads, null, 2));
  });
  return pendingWrite;
}

export async function listLeads() {
  return load();
}

export async function getLead(id: string) {
  return (await load()).find((l) => l.id === id);
}

export async function createLead(input: LeadInput): Promise<Lead> {
  const all = await load();
  const lead: Lead = {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    analysis: null,
    analysisError: null,
    callBrief: null,
    chat: [],
  };
  all.unshift(lead);
  await persist();
  return lead;
}

// Callers mutate the lead object they got from getLead, then call this.
export async function saveLeads() {
  await persist();
}

export async function deleteLead(id: string) {
  const all = await load();
  const index = all.findIndex((l) => l.id === id);
  if (index === -1) return false;
  all.splice(index, 1);
  await persist();
  return true;
}
