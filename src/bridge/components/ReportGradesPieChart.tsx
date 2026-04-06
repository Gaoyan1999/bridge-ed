import { useMemo } from 'react';
import { ArcElement, Chart as ChartJS, type ChartData, type ChartOptions, Tooltip } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip);

export type ReportGradeCounts = {
  hd: number;
  d: number;
  c: number;
  p: number;
};

type GradeKey = keyof ReportGradeCounts;

type Props = {
  counts: ReportGradeCounts;
  labels: Record<GradeKey, string>;
  chartAriaLabel: string;
};

/** Blue theme: deep → medium → light → sky (HD … P). */
const GRADE_COLORS: Record<GradeKey, { bg: string; border: string }> = {
  hd: { bg: 'rgba(30, 58, 138, 0.95)', border: 'rgba(23, 37, 84, 0.98)' },
  d: { bg: 'rgba(37, 99, 235, 0.92)', border: 'rgba(29, 78, 216, 0.98)' },
  c: { bg: 'rgba(96, 165, 250, 0.92)', border: 'rgba(59, 130, 246, 0.95)' },
  p: { bg: 'rgba(125, 211, 252, 0.95)', border: 'rgba(56, 189, 248, 0.98)' },
};

const EMPTY_RING = 'rgba(219, 234, 254, 0.95)';

const ORDER: GradeKey[] = ['hd', 'd', 'c', 'p'];

export function ReportGradesPieChart({ counts, labels, chartAriaLabel }: Props) {
  const total = ORDER.reduce((acc, k) => acc + counts[k], 0);

  const data: ChartData<'doughnut'> = useMemo(() => {
    if (total <= 0) {
      return {
        labels: [''],
        datasets: [{ data: [1], backgroundColor: [EMPTY_RING], borderWidth: 0 }],
      };
    }
    return {
      labels: ORDER.map((k) => labels[k]),
      datasets: [
        {
          data: ORDER.map((k) => counts[k]),
          backgroundColor: ORDER.map((k) => GRADE_COLORS[k].bg),
          borderWidth: 2,
          borderColor: ORDER.map((k) => GRADE_COLORS[k].border),
        },
      ],
    };
  }, [counts, labels, total]);

  const options: ChartOptions<'doughnut'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '58%',
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: total > 0,
          callbacks: {
            label: (ctx) => {
              const v = typeof ctx.raw === 'number' ? ctx.raw : 0;
              const label = ctx.label ?? '';
              return `${label}: ${v}`;
            },
          },
        },
      },
    }),
    [total],
  );

  const summary = useMemo(() => {
    if (total <= 0) return chartAriaLabel;
    const parts = ORDER.map((k) => `${labels[k]} ${counts[k]}`).join(', ');
    return `${chartAriaLabel}: ${parts}`;
  }, [chartAriaLabel, counts, labels, total]);

  return (
    <div className="report-grades-pie" role="img" aria-label={summary}>
      <div className="report-grades-pie__chart-wrap">
        <Doughnut data={data} options={options} className="report-grades-pie__chart" />
      </div>
      <ul className="report-grades-pie__legend">
        {ORDER.map((k) => (
          <li key={k} className={`report-grades-pie__legend-item report-grades-pie__legend-item--${k}`}>
            <span className="report-grades-pie__swatch" aria-hidden />
            <span className="report-grades-pie__legend-label">{labels[k]}</span>
            <span className="report-grades-pie__legend-count">{counts[k]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
