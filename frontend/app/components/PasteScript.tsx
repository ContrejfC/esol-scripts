"use client";

const SAMPLE_SCRIPT = `Maria: Hi John, how are you?
John: I am good, thank you. How about you?
Maria: I am fine.`;

export default function PasteScript({
  value,
  title,
  onChange,
  onTitleChange,
  onParse,
  onLoadSample,
  disabled,
  error,
}: {
  value: string;
  title: string;
  onChange: (v: string) => void;
  onTitleChange: (v: string) => void;
  onParse: () => void;
  onLoadSample: () => void;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Script title (optional)
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="e.g. Greetings"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
          disabled={disabled}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Paste your dialogue (one line per speaker: <code className="rounded bg-slate-200 px-1">Speaker: text</code>)
        </label>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Maria: Hello!&#10;John: Hi there."
          rows={10}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900"
          disabled={disabled}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onParse}
          disabled={disabled || !value.trim()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          Parse script
        </button>
        <button
          type="button"
          onClick={onLoadSample}
          disabled={disabled}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Load sample
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

export { SAMPLE_SCRIPT };
