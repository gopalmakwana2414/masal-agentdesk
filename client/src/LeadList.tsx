import type { Lead, Priority } from "./types";
import { PriorityBadge, timeAgo } from "./ui";

export type Filter = "ALL" | Priority;

const filters: Filter[] = ["ALL", "HOT", "WARM", "COLD"];

export default function LeadList({
  leads,
  total,
  filter,
  counts,
  selectedId,
  onFilter,
  onSelect,
}: {
  leads: Lead[];
  total: number;
  filter: Filter;
  counts: Record<Filter, number>;
  selectedId: string | null;
  onFilter: (f: Filter) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter by priority">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => onFilter(f)}
            aria-pressed={filter === f}
            className={`rounded-full border px-3 py-1 text-sm ${
              filter === f ? "border-teal-700 bg-teal-700 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {f === "ALL" ? "All" : f[0] + f.slice(1).toLowerCase()} ({counts[f]})
          </button>
        ))}
      </div>
      {leads.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          {total === 0 ? "No leads yet. Use Add lead to create the first one." : "No leads with this priority."}
        </p>
      ) : (
        <ul className="space-y-2">
          {leads.map((lead) => (
            <li key={lead.id}>
              <button
                onClick={() => onSelect(lead.id)}
                aria-current={lead.id === selectedId}
                className={`block w-full rounded-lg border bg-white p-3 text-left hover:border-teal-600 ${
                  lead.id === selectedId ? "border-teal-700 ring-1 ring-teal-700" : "border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium">{lead.name}</span>
                  <PriorityBadge priority={lead.analysis?.priority} />
                </div>
                <p className="mt-0.5 truncate text-sm text-slate-600">{lead.requirement}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {lead.budget} · {lead.timeline}
                </p>
                <p className="text-xs text-slate-500">
                  {lead.location} · {timeAgo(lead.createdAt)}
                </p>
                {lead.analysisError && !lead.analysis && <p className="mt-1 text-xs text-red-700">Analysis failed. Open to retry.</p>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
