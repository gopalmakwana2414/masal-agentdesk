import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import LeadDetail from "./LeadDetail";
import LeadForm from "./LeadForm";
import LeadList, { type Filter } from "./LeadList";
import Overview from "./Overview";
import { buttonPrimary, buttonSecondary, Spinner } from "./ui";
import type { Lead, Priority } from "./types";

const rank: Record<Priority, number> = { HOT: 0, WARM: 1, COLD: 2 };

export default function App() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [view, setView] = useState<"overview" | "leads">("overview");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      setLeads(await api.list());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load leads.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  const notify = (kind: "ok" | "error", text: string) => setToast({ kind, text });

  const sorted = useMemo(
    () =>
      [...leads].sort((a, b) => {
        const byPriority = (a.analysis ? rank[a.analysis.priority] : 3) - (b.analysis ? rank[b.analysis.priority] : 3);
        return byPriority || b.createdAt.localeCompare(a.createdAt);
      }),
    [leads]
  );
  const visible = filter === "ALL" ? sorted : sorted.filter((l) => l.analysis?.priority === filter);
  const counts: Record<Filter, number> = {
    ALL: leads.length,
    HOT: leads.filter((l) => l.analysis?.priority === "HOT").length,
    WARM: leads.filter((l) => l.analysis?.priority === "WARM").length,
    COLD: leads.filter((l) => l.analysis?.priority === "COLD").length,
  };
  const selected = leads.find((l) => l.id === selectedId) ?? null;

  const upsert = (lead: Lead) => setLeads((prev) => (prev.some((l) => l.id === lead.id) ? prev.map((l) => (l.id === lead.id ? lead : l)) : [lead, ...prev]));

  function openLead(id: string) {
    setSelectedId(id);
    setView("leads");
  }

  function handleCreated(lead: Lead) {
    upsert(lead);
    setShowForm(false);
    setFilter("ALL");
    openLead(lead.id);
    if (lead.analysis) notify("ok", "Lead saved and analyzed.");
    else notify("error", "Lead saved, but the analysis failed. You can retry from the lead page.");
  }

  async function handleDelete(id: string) {
    try {
      await api.remove(id);
      setLeads((prev) => prev.filter((l) => l.id !== id));
      setSelectedId(null);
      notify("ok", "Lead deleted.");
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Could not delete the lead.");
    }
  }

  const navClass = (active: boolean) => `rounded-md px-3 py-1.5 text-sm font-medium ${active ? "bg-teal-50 text-teal-800" : "text-slate-600 hover:bg-slate-100"}`;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2.5">
          <span className="font-semibold">Masal AgentDesk</span>
          <nav className="flex gap-1" aria-label="Main">
            <button className={navClass(view === "overview")} onClick={() => setView("overview")}>
              Overview
            </button>
            <button className={navClass(view === "leads")} onClick={() => setView("leads")}>
              Leads
            </button>
          </nav>
          <button className={`${buttonPrimary} ml-auto`} onClick={() => setShowForm(true)}>
            Add lead
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5">
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-slate-600">
            <Spinner /> Loading leads…
          </p>
        ) : loadError ? (
          <div role="alert" className="mx-auto mt-10 max-w-md rounded-lg border border-red-200 bg-white p-5 text-center">
            <p className="font-medium">Couldn't load your leads</p>
            <p className="mt-1 text-sm text-slate-700">{loadError}</p>
            <button className={`${buttonSecondary} mt-3`} onClick={load}>
              Try again
            </button>
          </div>
        ) : view === "overview" ? (
          <Overview
            leads={leads}
            onOpenLead={openLead}
            onAdd={() => setShowForm(true)}
            onFilter={(p) => {
              setFilter(p);
              setView("leads");
            }}
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-[320px_1fr]">
            <div className={selected ? "hidden md:block" : ""}>
              <LeadList leads={visible} total={leads.length} filter={filter} counts={counts} selectedId={selectedId} onFilter={setFilter} onSelect={setSelectedId} />
            </div>
            <div className={selected ? "" : "hidden md:block"}>
              {selected ? (
                <>
                  <button className="mb-3 text-sm text-teal-700 hover:underline md:hidden" onClick={() => setSelectedId(null)}>
                    Back to leads
                  </button>
                  <LeadDetail key={selected.id} lead={selected} onChange={upsert} onDelete={handleDelete} notify={notify} />
                </>
              ) : (
                <p className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">Select a lead to see its analysis, call brief, and conversation.</p>
              )}
            </div>
          </div>
        )}
      </main>

      {showForm && <LeadForm onCreated={handleCreated} onClose={() => setShowForm(false)} />}

      {toast && (
        <div
          role={toast.kind === "error" ? "alert" : "status"}
          className={`fixed bottom-4 left-1/2 z-30 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-md px-4 py-3 text-sm shadow-lg ${
            toast.kind === "error" ? "bg-red-700 text-white" : "bg-slate-900 text-white"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
