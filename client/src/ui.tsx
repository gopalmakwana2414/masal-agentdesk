import type { ReactNode } from "react";
import type { Priority } from "./types";

const badgeStyles: Record<Priority, string> = {
  HOT: "bg-red-100 text-red-800 ring-red-200",
  WARM: "bg-amber-100 text-amber-900 ring-amber-200",
  COLD: "bg-sky-100 text-sky-900 ring-sky-200",
};

export function PriorityBadge({ priority, large }: { priority?: Priority; large?: boolean }) {
  const size = large ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs";
  if (!priority) {
    return <span className={`rounded-full bg-slate-100 font-medium text-slate-600 ring-1 ring-slate-200 ${size}`}>Not analyzed</span>;
  }
  return <span className={`rounded-full font-semibold ring-1 ${badgeStyles[priority]} ${size}`}>{priority}</span>;
}

export function Spinner() {
  return <span className="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />;
}

export function Card({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white p-4 ${className}`}>
      <h3 className="mb-2 text-sm font-semibold text-slate-500">{title}</h3>
      {children}
    </section>
  );
}

export function Bullets({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) return <p className="text-sm text-slate-500">{empty}</p>;
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export const buttonPrimary =
  "inline-flex items-center justify-center gap-2 rounded-md bg-teal-700 px-3.5 py-2 text-sm font-medium text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:opacity-60";
export const buttonSecondary =
  "inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:opacity-60";

export function timeAgo(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
