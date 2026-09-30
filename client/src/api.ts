import type { Lead, LeadInput } from "./types";

export class ApiError extends Error {
  constructor(message: string, public status: number, public fields?: Record<string, string>) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and that the backend is running.", 0);
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(data?.error ?? `The server returned an error (${res.status}).`, res.status, data?.fields);
  }
  return data as T;
}

const post = (path: string, body?: unknown) =>
  request<Lead>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });

export const api = {
  list: () => request<Lead[]>("/leads"),
  create: (input: LeadInput) => post("/leads", input),
  analyze: (id: string) => post(`/leads/${id}/analyze`),
  callBrief: (id: string) => post(`/leads/${id}/call-brief`),
  chat: (id: string, message: string) => post(`/leads/${id}/chat`, { message }),
  remove: (id: string) => request<void>(`/leads/${id}`, { method: "DELETE" }),
};
