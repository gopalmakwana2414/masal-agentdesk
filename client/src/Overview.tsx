import type { Lead, Priority } from "./types";
import { buttonPrimary, PriorityBadge } from "./ui";

export default function Overview({
  leads,
  onOpenLead,
  onFilter,
  onAdd,
}: {
  leads: Lead[];
  onOpenLead: (id: string) => void;
  onFilter: (p: Priority) => void;
  onAdd: () => void;
}) {
  if (leads.length === 0) {
    return (
      <div className="mx-auto mt-16 max-w-md text-center">
        <h2 className="text-lg font-semibold">No leads yet</h2>
        <p className="mt-1 text-sm text-slate-600">Add an inbound lead and AgentDesk will summarize it, rank it, and draft a reply.</p>
        <button className={`${buttonPrimary} mt-4`} onClick={onAdd}>
          Add your first lead
        </button>
      </div>
    );
  }

  const hot = leads.filter((l) => l.analysis?.priority === "HOT");
  const failed = leads.filter((l) => !l.analysis);
  const count = (p: Priority) => leads.filter((l) => l.analysis?.priority === p).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        {(["HOT", "WARM", "COLD"] as Priority[]).map((p) => (
          <button key={p} onClick={() => onFilter(p)} className="rounded-lg border border-slate-200 bg-white p-4 text-left hover:border-teal-600">
            <PriorityBadge priority={p} />
            <p className="mt-2 text-2xl font-semibold">{count(p)}</p>
            <p className="text-xs text-slate-500">{count(p) === 1 ? "lead" : "leads"}</p>
          </button>
        ))}
      </div>

      <section>
        <h2 className="mb-2 font-semibold">Hot leads to act on</h2>
        {hot.length === 0 ? (
          <p className="text-sm text-slate-500">No hot leads right now.</p>
        ) : (
          <ul className="space-y-2">
            {hot.map((l) => (
              <li key={l.id}>
                <button onClick={() => onOpenLead(l.id)} className="block w-full rounded-lg border border-slate-200 bg-white p-3 text-left hover:border-teal-600">
                  <span className="font-medium">{l.name}</span>
                  <span className="text-sm text-slate-500"> · {l.location}</span>
                  <p className="mt-1 text-sm text-slate-700">{l.analysis?.recommendedNextAction}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {failed.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">Waiting for analysis</h2>
          <ul className="space-y-2">
            {failed.map((l) => (
              <li key={l.id}>
                <button onClick={() => onOpenLead(l.id)} className="block w-full rounded-lg border border-red-200 bg-white p-3 text-left text-sm hover:border-red-400">
                  <span className="font-medium">{l.name}</span> · analysis didn't finish. Open to retry.
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
