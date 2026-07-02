"use client";

import type { DialogueLine, ParsedScript } from "../lib/types";

export default function ScriptReview({
  script,
  onUpdateLine,
  onRemoveLine,
}: {
  script: ParsedScript;
  onUpdateLine: (id: string, field: "speaker" | "text", value: string) => void;
  onRemoveLine: (id: string) => void;
}) {
  const { lines, unmatchedLines = [] } = script;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Check speaker names and text below — you can edit or remove lines before generating.
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-100">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">#</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Speaker</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Text</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => (
              <tr
                key={line.id}
                className={`border-b border-slate-100 transition-colors last:border-b-0 hover:bg-indigo-50/40 ${
                  line.is_malformed ? "bg-amber-50" : idx % 2 === 1 ? "bg-slate-50/50" : ""
                }`}
              >
                <td className="px-4 py-2.5 tabular-nums text-slate-400">{idx + 1}</td>
                <td className="px-4 py-2.5">
                  <input
                    type="text"
                    value={line.speaker}
                    onChange={(e) => onUpdateLine(line.id, "speaker", e.target.value)}
                    className="w-32 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm transition hover:border-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </td>
                <td className="px-4 py-2.5">
                  <input
                    type="text"
                    value={line.text}
                    onChange={(e) => onUpdateLine(line.id, "text", e.target.value)}
                    className="min-w-[200px] w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm transition hover:border-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </td>
                <td className="px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => onRemoveLine(line.id)}
                    className="rounded-md px-1.5 py-0.5 text-sm font-medium text-red-600 transition hover:bg-red-50 hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {unmatchedLines.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="mb-2 font-medium text-amber-800">Lines that didn’t match "Speaker: text"</p>
          <ul className="list-inside list-disc text-sm text-amber-900">
            {unmatchedLines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-amber-800">
            Fix these in your script and re-parse, or add them manually by editing the table above.
          </p>
        </div>
      )}
    </div>
  );
}
