"use client";

import { useCallback, useEffect, useState } from "react";
import { getAppStats, type AppActivityStats } from "../app/lib/api";
import Link from "next/link";

export default function MetricsPage() {
  const [data, setData] = useState<AppActivityStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const { data, error: err } = await getAppStats();
      if (err) {
        setError(err);
        setData(null);
      } else {
        setError(null);
        setData(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="mx-auto max-w-lg px-4 py-10 text-slate-800">
      <h1 className="text-xl font-bold">ESOL Scripts — usage</h1>
      <p className="mt-2 text-sm text-slate-600">
        Counters are for the current server process only and reset when the host restarts (e.g. idle spin-down on free tiers).
      </p>

      {loading && <p className="mt-6 text-slate-500">Loading…</p>}
      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      {!loading && data && (
        <dl className="mt-6 space-y-3 rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-600">Page loads (counted)</dt>
            <dd className="font-mono font-medium">{data.page_views_total}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-600">Unique visitors today (by IP)</dt>
            <dd className="font-mono font-medium">{data.unique_visitors_today}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-600">Audio generations completed</dt>
            <dd className="font-mono font-medium">{data.audio_generations_completed}</dd>
          </div>
          <div className="border-t border-slate-100 pt-3">
            <dt className="text-xs text-slate-500">Server process started (UTC)</dt>
            <dd className="mt-1 font-mono text-xs">{data.server_started_at_utc}</dd>
          </div>
        </dl>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium hover:bg-slate-100"
        >
          Refresh
        </button>
        <Link href="/" className="rounded-lg text-sm text-indigo-600 underline">
          Back to app
        </Link>
      </div>
    </main>
  );
}
