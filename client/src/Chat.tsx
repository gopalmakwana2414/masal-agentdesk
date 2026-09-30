import { useEffect, useRef, useState } from "react";
import { api } from "./api";
import { buttonPrimary, Spinner } from "./ui";
import type { Lead } from "./types";

const quickPrompts = [
  "What should I emphasize on the call?",
  "What are the customer's main concerns?",
  "Give me three questions I should ask this customer.",
  "Make my reply more assertive.",
];

export default function Chat({ lead, onChange }: { lead: Lead; onChange: (lead: Lead) => void }) {
  const [input, setInput] = useState("");
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [lead.chat.length, pending]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || pending) return;
    setPending(message);
    setInput("");
    setError("");
    try {
      onChange(await api.chat(lead.id, message));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not get an answer.");
      setInput(message);
    } finally {
      setPending("");
    }
  }

  const bubble = (role: "user" | "assistant") =>
    `max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm leading-relaxed ${
      role === "user" ? "ml-auto bg-teal-700 text-white" : "bg-slate-100 text-slate-900"
    }`;

  return (
    <section className="rounded-lg border border-slate-200 bg-white" aria-label={`Conversation about ${lead.name}`}>
      <header className="border-b border-slate-200 px-4 py-3">
        <h3 className="font-semibold">Conversation about {lead.name}</h3>
        <p className="text-xs text-slate-500">Answers use this lead's details and analysis only.</p>
      </header>

      <div className="max-h-[26rem] min-h-40 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {lead.chat.length === 0 && !pending && <p className="text-sm text-slate-500">Ask anything about this lead, or start with a suggestion below.</p>}
        {lead.chat.map((m, i) => (
          <div key={i} className={bubble(m.role)}>
            {m.content}
          </div>
        ))}
        {pending && <div className={bubble("user")}>{pending}</div>}
        {pending && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Spinner /> Thinking…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-slate-200 p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {quickPrompts.map((p) => (
            <button key={p} onClick={() => send(p)} disabled={!!pending} className="rounded-full border border-slate-300 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              {p}
            </button>
          ))}
        </div>
        {error && (
          <p role="alert" className="mb-2 rounded-md bg-red-50 p-2 text-sm text-red-800">
            {error}
          </p>
        )}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={2}
            maxLength={2000}
            aria-label="Ask about this lead"
            placeholder="Ask about this lead…"
            className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-2 focus:outline-teal-700"
          />
          <button type="submit" className={buttonPrimary} disabled={!input.trim() || !!pending}>
            Send
          </button>
        </form>
      </div>
    </section>
  );
}
