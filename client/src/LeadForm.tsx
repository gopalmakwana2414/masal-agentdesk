import { useState, type FormEvent } from "react";
import { api, ApiError } from "./api";
import { buttonPrimary, buttonSecondary, Spinner } from "./ui";
import type { Lead, LeadInput } from "./types";

const timelines = ["Immediately", "Within 1 month", "1-3 months", "3-6 months", "More than 6 months", "Just exploring"];

const empty: LeadInput = { name: "", location: "", requirement: "", budget: "", timeline: "", message: "" };

const example: LeadInput = {
  name: "Rohan Mehta",
  location: "Vesu, Surat",
  requirement: "3 BHK apartment, ready to move, good society with a garden",
  budget: "Around 1 crore, can stretch a little",
  timeline: "Within 1 month",
  message:
    "Hello, we are looking for a 3BHK in Vesu or Adajan. Budget is around 1 crore, can stretch a little for the right place. We need to shift before school reopens. My wife wants a society with a garden. Is possession ready? I am also worried about maintenance charges. Can we visit this Saturday?",
};

const inputClass = (invalid: boolean) =>
  `mt-1 block w-full rounded-md border px-3 py-2 text-sm focus:outline-2 focus:outline-teal-700 ${
    invalid ? "border-red-500" : "border-slate-300"
  }`;

function validate(v: LeadInput) {
  const errors: Partial<Record<keyof LeadInput, string>> = {};
  if (v.name.trim().length < 2) errors.name = "Enter the customer's name.";
  if (v.location.trim().length < 2) errors.location = "Enter a location.";
  if (v.requirement.trim().length < 3) errors.requirement = "Describe what they are looking for.";
  if (!v.budget.trim()) errors.budget = "Enter a budget, even a rough one.";
  if (!v.timeline) errors.timeline = "Choose a buying timeline.";
  if (v.message.trim().length < 10) errors.message = "Paste the customer's message (at least 10 characters).";
  else if (v.message.length > 4000) errors.message = "Message is too long. Keep it under 4000 characters.";
  return errors;
}

export default function LeadForm({ onCreated, onClose }: { onCreated: (lead: Lead) => void; onClose: () => void }) {
  const [values, setValues] = useState<LeadInput>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof LeadInput) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    setFormError("");
    if (Object.keys(found).length) return;
    setSubmitting(true);
    try {
      onCreated(await api.create(values));
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      setFormError(err instanceof Error ? err.message : "Could not save the lead.");
      setSubmitting(false);
    }
  }

  const field = (key: keyof LeadInput, label: string, input: React.ReactNode) => (
    <div>
      <label htmlFor={key} className="text-sm font-medium">
        {label}
      </label>
      {input}
      {errors[key] && (
        <p id={`${key}-error`} className="mt-1 text-sm text-red-700">
          {errors[key]}
        </p>
      )}
    </div>
  );

  const common = (key: keyof LeadInput) => ({
    id: key,
    value: values[key],
    onChange: set(key),
    disabled: submitting,
    "aria-invalid": !!errors[key],
    "aria-describedby": errors[key] ? `${key}-error` : undefined,
    className: inputClass(!!errors[key]),
  });

  return (
    <div className="fixed inset-0 z-20 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-labelledby="form-title">
      <form onSubmit={submit} noValidate className="my-6 w-full max-w-xl rounded-lg bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="form-title" className="text-lg font-semibold">
            Add lead
          </h2>
          <button type="button" className="text-sm text-teal-700 hover:underline disabled:opacity-50" onClick={() => { setValues(example); setErrors({}); }} disabled={submitting}>
            Fill with example
          </button>
        </div>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {field("name", "Name", <input {...common("name")} autoComplete="off" />)}
            {field("location", "Location", <input {...common("location")} placeholder="Area, city" />)}
          </div>
          {field("requirement", "Property requirement", <input {...common("requirement")} placeholder="e.g. 2 BHK flat, under construction is fine" />)}
          <div className="grid gap-3 sm:grid-cols-2">
            {field("budget", "Budget", <input {...common("budget")} placeholder="e.g. 75-90 lakh" />)}
            {field(
              "timeline",
              "Buying timeline",
              <select {...common("timeline")}>
                <option value="">Select…</option>
                {timelines.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            )}
          </div>
          {field("message", "Customer message", <textarea {...common("message")} rows={6} placeholder="Paste the inquiry or chat transcript" />)}
          <p className="text-right text-xs text-slate-500">{values.message.length} / 4000</p>
        </div>
        {formError && (
          <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-800">
            {formError}
          </p>
        )}
        <div className="mt-4 flex items-center justify-end gap-2">
          {submitting && <span className="mr-auto text-sm text-slate-600">Saving and analyzing. This can take 10-20 seconds.</span>}
          <button type="button" className={buttonSecondary} onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className={buttonPrimary} disabled={submitting}>
            {submitting && <Spinner />}
            {submitting ? "Analyzing…" : "Save and analyze"}
          </button>
        </div>
      </form>
    </div>
  );
}
