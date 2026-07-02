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
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Script title (optional)
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="e.g. Greetings"
          className="input-field"
          disabled={disabled}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Paste your dialogue (one line per speaker: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">Speaker: text</code>)
        </label>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Maria: Hello!&#10;John: Hi there."
          rows={10}
          className="input-field font-mono leading-relaxed"
          disabled={disabled}
        />
      </div>
      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={onParse}
          disabled={disabled || !value.trim()}
          className="btn-primary"
        >
          Parse script
        </button>
        <button
          type="button"
          onClick={onLoadSample}
          disabled={disabled}
          className="btn-secondary"
        >
          Load sample
        </button>
      </div>
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
      )}
    </div>
  );
}

export { SAMPLE_SCRIPT };
