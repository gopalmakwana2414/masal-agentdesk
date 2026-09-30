import { useState } from "react";
import { api } from "./api";
import Chat from "./Chat";
import { Bullets, buttonPrimary, buttonSecondary, Card, PriorityBadge, Spinner, timeAgo } from "./ui";
import type { Lead } from "./types";

type Tab = "analysis" | "brief" | "chat";
const tabs: { id: Tab; label: string }[] = [
  { id: "analysis", label: "Analysis" },
  { id: "brief", label: "Call brief" },
  { id: "chat", label: "Ask AI" },
];

export default function LeadDetail({
  lead,
  onChange,
  onDelete,
  notify,
}: {
  lead: Lead;
  onChange: (lead: Lead) => void;
  onDelete: (id: string) => void;
  notify: (kind: "ok" | "error", text: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("analysis");
  const [busy, setBusy] = useState<"analyze" | "brief" | null>(null);
  const a = lead.analysis;

  async function run(kind: "analyze" | "brief") {
    setBusy(kind);
    try {
      const updated = kind === "analyze" ? await api.analyze(lead.id) : await api.callBrief(lead.id);
      onChange(updated);
      notify("ok", kind === "analyze" ? "Analysis updated." : "Call brief ready.");
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  async function copyReply() {
    try {
      await navigator.clipboard.writeText(a!.suggestedResponse);
      notify("ok", "Reply copied.");
    } catch {
      notify("error", "Couldn't copy. Select the text and copy it manually.");
    }
  }

  function confirmDelete() {
    if (window.confirm(`Delete ${lead.name}? This removes the analysis and conversation too.`)) onDelete(lead.id);
  }

  return (
    <div className="space-y-4">
      <header className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{lead.name}</h2>
            <p className="text-sm text-slate-600">
              {lead.location} · added {timeAgo(lead.createdAt)}
            </p>
          </div>
          <PriorityBadge priority={a?.priority} large />
        </div>
        {a && <p className="mt-2 text-sm text-slate-800">{a.priorityReason}</p>}
        <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-slate-500">Looking for</dt>
            <dd>{lead.requirement}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Budget</dt>
            <dd>{lead.budget}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Timeline</dt>
            <dd>{lead.timeline}</dd>
          </div>
        </dl>
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-teal-700">Customer message</summary>
          <p className="mt-2 max-h-60 overflow-y-auto whitespace-pre-wrap break-words rounded-md bg-slate-50 p-3">{lead.message}</p>
        </details>
      </header>

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 rounded-lg bg-slate-200 p-1" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === t.id ? "bg-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {a && (
            <button className={buttonSecondary} onClick={() => run("analyze")} disabled={busy !== null}>
              {busy === "analyze" && <Spinner />}Re-run analysis
            </button>
          )}
          <button className="rounded-md px-3 py-2 text-sm text-red-700 hover:bg-red-50" onClick={confirmDelete}>
            Delete
          </button>
        </div>
      </div>

      {tab === "analysis" &&
        (a ? (
          <div className="space-y-3">
            <Card title="Recommended next action" className="border-l-4 border-l-teal-700">
              <p className="font-medium leading-relaxed">{a.recommendedNextAction}</p>
            </Card>
            <div className="grid gap-3 md:grid-cols-2">
              <Card title="Summary">
                <p className="text-sm leading-relaxed">{a.summary}</p>
              </Card>
              <Card title="Customer intent">
                <p className="text-sm leading-relaxed">{a.intent}</p>
              </Card>
              <Card title="Key requirements">
                <Bullets items={a.keyRequirements} empty="None stated." />
              </Card>
              <Card title="Concerns">
                <Bullets items={a.concerns} empty="No concerns raised." />
              </Card>
            </div>
            <Card title="Suggested response">
              <p className="whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm leading-relaxed">{a.suggestedResponse}</p>
              <button className={`${buttonSecondary} mt-3`} onClick={copyReply}>
                Copy reply
              </button>
            </Card>
          </div>
        ) : (
          <div className="rounded-lg border border-red-200 bg-white p-4">
            <p className="font-medium">Analysis isn't available yet.</p>
            <p className="mt-1 text-sm text-slate-700">{lead.analysisError ?? "It hasn't been run for this lead."}</p>
            <button className={`${buttonPrimary} mt-3`} onClick={() => run("analyze")} disabled={busy !== null}>
              {busy === "analyze" && <Spinner />}Retry analysis
            </button>
          </div>
        ))}

      {tab === "brief" &&
        (lead.callBrief ? (
          <div className="space-y-3">
            <Card title="Goal for the call" className="border-l-4 border-l-teal-700">
              <p className="font-medium leading-relaxed">{lead.callBrief.callGoal}</p>
            </Card>
            <div className="grid gap-3 md:grid-cols-2">
              <Card title="Emphasize">
                <Bullets items={lead.callBrief.emphasize} empty="Nothing suggested." />
              </Card>
              <Card title="Avoid">
                <Bullets items={lead.callBrief.avoid} empty="Nothing suggested." />
              </Card>
            </div>
            <Card title="Questions to ask">
              <Bullets items={lead.callBrief.questionsToAsk} empty="Nothing suggested." />
            </Card>
            <div className="flex items-center gap-3">
              <button className={buttonSecondary} onClick={() => run("brief")} disabled={busy !== null}>
                {busy === "brief" && <Spinner />}Regenerate brief
              </button>
              <span className="text-xs text-slate-500">Generated {timeAgo(lead.callBrief.generatedAt)}</span>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center">
            <p className="font-medium">Prepare for the call</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">Get points to emphasize, things to avoid, questions to ask, and one goal for the conversation.</p>
            <button className={`${buttonPrimary} mt-4`} onClick={() => run("brief")} disabled={busy !== null}>
              {busy === "brief" && <Spinner />}
              {busy === "brief" ? "Generating…" : "Generate call brief"}
            </button>
          </div>
        ))}

      {tab === "chat" && <Chat lead={lead} onChange={onChange} />}
    </div>
  );
}
