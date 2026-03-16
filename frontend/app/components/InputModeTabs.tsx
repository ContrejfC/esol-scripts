"use client";

type Mode = "pdf" | "paste";

export default function InputModeTabs({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  return (
    <div className="flex rounded-lg border border-slate-200 bg-white p-1">
      <button
        type="button"
        onClick={() => onChange("pdf")}
        className={`rounded-md px-4 py-2 text-sm font-medium transition ${
          mode === "pdf"
            ? "bg-indigo-600 text-white shadow"
            : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        Upload PDF
      </button>
      <button
        type="button"
        onClick={() => onChange("paste")}
        className={`rounded-md px-4 py-2 text-sm font-medium transition ${
          mode === "paste"
            ? "bg-indigo-600 text-white shadow"
            : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        Paste Script Text
      </button>
    </div>
  );
}
