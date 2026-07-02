"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import {
  getAppDailyStats,
  getAppStats,
  type AppActivityStats,
  type DailyStatsPayload,
} from "../app/lib/api";
import Link from "next/link";

/** Chart.js needs the DOM; static prerender/SSR would throw and hit the global error boundary. */
const UsageChart = dynamic(() => import("../components/UsageChart").then((m) => m.UsageChart), {
  ssr: false,
  loading: () => <p className="mt-6 text-sm text-slate-500">Loading chart…</p>,
});

const RANGE_OPTIONS = [7, 30, 90] as const;

export default function MetricsPage() {
  const [data, setData] = useState<AppActivityStats | null>(null);
  const [daily, setDaily] = useState<DailyStatsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dailyError, setDailyError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartDays, setChartDays] = useState<number>(30);

  const load = useCallback(async () => {
    setError(null);
    setDailyError(null);
    setLoading(true);
    try {
      const [statsRes, dailyRes] = await Promise.all([
        getAppStats(),
        getAppDailyStats(chartDays),
      ]);
      if (statsRes.error) {
        setError(statsRes.error);
        setData(null);
      } else {
        setError(null);
        setData(statsRes.data);
      }
      if (dailyRes.error) {
        setDailyError(dailyRes.error);
        setDaily(null);
      } else {
        setDailyError(null);
        setDaily(dailyRes.data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }, [chartDays]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="mx-auto max-w-lg px-4 py-10 text-slate-800">
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
        ESOL{" "}
        <span className="bg-gradient-to-r from-indigo-600 to-teal-600 bg-clip-text text-transparent">
          Scripts
        </span>{" "}
        — usage
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Summary numbers below are for the <strong>current server process</strong> only and reset when the process restarts.
        The chart uses persisted daily totals (UTC dates) when the server disk is available—on some hosts storage is wiped on
        redeploy or cold start, so history may be shorter than the selected range.
      </p>

      {loading && <p className="mt-6 text-slate-500">Loading…</p>}
      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      {!loading && daily && !dailyError && (
        <section className="mt-8 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/60">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-800">Activity by day</h2>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <span>Range</span>
              <select
                value={chartDays}
                onChange={(e) => setChartDays(Number(e.target.value))}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-medium text-slate-800 shadow-sm transition hover:border-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {RANGE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    Last {n} days
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Line: counted app loads (same as summary). Bars: completed MP3 generations ({daily.timezone} midnight boundaries).
          </p>
          <UsageChart series={daily.series} />
        </section>
      )}
      {!loading && dailyError && (
        <p className="mt-6 text-sm text-amber-700">Daily chart: {dailyError}</p>
      )}

      {!loading && data && (
        <dl className="mt-6 space-y-3 rounded-2xl border border-slate-200/80 bg-white p-5 text-sm shadow-sm shadow-slate-200/60">
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
          className="btn-secondary"
        >
          Refresh
        </button>
        <Link
          href="/"
          className="inline-flex items-center rounded-lg px-2 py-2 text-sm font-medium text-indigo-600 transition hover:text-indigo-800 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Back to app
        </Link>
      </div>
    </main>
  );
}
