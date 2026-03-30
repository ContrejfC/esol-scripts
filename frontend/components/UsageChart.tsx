"use client";

import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import type { DailyStatPoint } from "../app/lib/api";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler
);

function UsageChart({ series }: { series: DailyStatPoint[] }) {
  const labels = series.map((p) => {
    const [y, m, d] = p.date.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  });

  return (
    <div className="h-80 w-full">
      <Chart
        type="bar"
        data={{
          labels,
          datasets: [
            {
              type: "line",
              label: "Page visits",
              data: series.map((p) => p.page_views),
              borderColor: "rgb(79, 70, 229)",
              backgroundColor: "rgba(79, 70, 229, 0.12)",
              fill: true,
              tension: 0.25,
              yAxisID: "y",
              order: 1,
            },
            {
              type: "bar",
              label: "Audio generated",
              data: series.map((p) => p.audio_generations),
              backgroundColor: "rgba(14, 165, 233, 0.55)",
              borderRadius: 4,
              yAxisID: "y",
              order: 2,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: { position: "top" },
          },
          scales: {
            x: {
              ticks: { maxRotation: 45, minRotation: 0 },
            },
            y: {
              beginAtZero: true,
              ticks: { precision: 0 },
            },
          },
        }}
      />
    </div>
  );
}

export { UsageChart };
