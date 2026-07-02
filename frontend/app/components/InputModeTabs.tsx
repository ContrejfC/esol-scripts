"use client";

type Mode = "pdf" | "paste";

const TABS: { value: Mode; label: string }[] = [
  { value: "pdf", label: "Upload PDF" },
  { value: "paste", label: "Paste Script Text" },
];

export default function InputModeTabs({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  return (
    <div className="inline-flex rounded-xl bg-slate-100 p-1" role="tablist">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={mode === tab.value}
          onClick={() => onChange(tab.value)}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
            mode === tab.value
              ? "bg-white text-indigo-700 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
