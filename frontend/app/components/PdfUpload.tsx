"use client";

import { useRef } from "react";

export default function PdfUpload({
  onUpload,
  disabled,
  error,
}: {
  onUpload: (file: File) => void;
  disabled?: boolean;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      onUpload(file);
    }
    e.target.value = "";
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        onChange={handleChange}
        className="hidden"
        disabled={disabled}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-4 text-slate-600 transition hover:border-indigo-400 hover:bg-indigo-50 disabled:opacity-50"
      >
        Choose PDF file
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
