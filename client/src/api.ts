import type { Lead, LeadInput } from "./types";

export class ApiError extends Error {
  constructor(message: string, public status: number, public fields?: Record<string, string>) {
    super(message);
  }
}

const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

function getEndpoint(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (!API_BASE_URL) {
    return cleanPath.startsWith("/api") ? cleanPath : `/api${cleanPath}`;
  }
  const rootUrl = API_BASE_URL.endsWith("/api") ? API_BASE_URL.slice(0, -4) : API_BASE_URL;
  const fullPath = cleanPath.startsWith("/api") ? cleanPath : `/api${cleanPath}`;
  return `${rootUrl}${fullPath}`;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(getEndpoint(path), {
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
