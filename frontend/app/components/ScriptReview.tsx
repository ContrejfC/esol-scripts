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
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-2 font-medium text-slate-700">#</th>
              <th className="px-4 py-2 font-medium text-slate-700">Speaker</th>
              <th className="px-4 py-2 font-medium text-slate-700">Text</th>
              <th className="px-4 py-2 font-medium text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => (
              <tr
                key={line.id}
                className={`border-b border-slate-100 ${line.is_malformed ? "bg-amber-50" : ""}`}
              >
                <td className="px-4 py-2 text-slate-500">{idx + 1}</td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={line.speaker}
                    onChange={(e) => onUpdateLine(line.id, "speaker", e.target.value)}
                    className="w-32 rounded border border-slate-200 px-2 py-1"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={line.text}
                    onChange={(e) => onUpdateLine(line.id, "text", e.target.value)}
                    className="min-w-[200px] flex-1 rounded border border-slate-200 px-2 py-1"
                  />
                </td>
                <td className="px-4 py-2">
                  <button
                    type="button"
                    onClick={() => onRemoveLine(line.id)}
                    className="text-red-600 hover:underline"
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
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
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
