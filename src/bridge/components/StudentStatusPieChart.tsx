import { useMemo } from 'react';
import {
  ArcElement,
  Chart as ChartJS,
  type ChartData,
  type ChartOptions,
  Tooltip,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip);

export type StudentStatusPieCounts = {
  todo: number;
  doing: number;
  done: number;
};

type Props = {
  counts: StudentStatusPieCounts;
  labels: { todo: string; doing: string; done: string };
  /** Accessible name for the chart (e.g. “Student progress on this card”). */
  chartAriaLabel: string;
};

/**
 * Fills/borders match Knowledge inbox chips (`.knowledge-inbox__label--student-*`)
 * and `:root` `--knowledge-student-status-*` in `bridge-app.css`.
 */
const STATUS_BG = {
  todo: 'rgba(243, 244, 246, 0.96)',
  doing: 'rgba(11, 87, 208, 0.1)',
  done: 'rgba(220, 252, 231, 0.95)',
} as const;

const STATUS_BORDER = {
  todo: 'rgba(107, 114, 128, 0.42)',
  doing: 'rgba(11, 87, 208, 0.32)',
  done: 'rgba(22, 163, 74, 0.38)',
} as const;

const EMPTY_RING = 'rgba(229, 231, 235, 0.95)';

/**
 * Doughnut chart (Chart.js) for student status counts.
 */
export function StudentStatusPieChart({ counts, labels, chartAriaLabel }: Props) {
  const { todo, doing, done } = counts;
  const total = todo + doing + done;

  const data: ChartData<'doughnut'> = useMemo(() => {
    if (total <= 0) {
      return {
        labels: [''],
        datasets: [
          {
            data: [1],
            backgroundColor: [EMPTY_RING],
            borderWidth: 0,
          },
        ],
      };
    }
    return {
      labels: [labels.todo, labels.doing, labels.done],
      datasets: [
        {
          data: [todo, doing, done],
          backgroundColor: [STATUS_BG.todo, STATUS_BG.doing, STATUS_BG.done],
          borderWidth: 2,
          borderColor: [STATUS_BORDER.todo, STATUS_BORDER.doing, STATUS_BORDER.done],
        },
      ],
    };
  }, [todo, doing, done, total, labels.todo, labels.doing, labels.done]);

  const options: ChartOptions<'doughnut'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
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
    return `${chartAriaLabel}: ${labels.todo} ${todo}, ${labels.doing} ${doing}, ${labels.done} ${done}`;
  }, [chartAriaLabel, labels, todo, doing, done, total]);

  return (
    <div className="student-status-pie" role="img" aria-label={summary}>
      <div className="student-status-pie__chart-wrap">
        <Doughnut data={data} options={options} className="student-status-pie__chart" />
      </div>
      <ul className="student-status-pie__legend">
        <li className="student-status-pie__legend-item student-status-pie__legend-item--todo">
          <span className="student-status-pie__swatch" aria-hidden />
          <span className="student-status-pie__legend-label">{labels.todo}</span>
          <span className="student-status-pie__legend-count">{todo}</span>
        </li>
        <li className="student-status-pie__legend-item student-status-pie__legend-item--doing">
          <span className="student-status-pie__swatch" aria-hidden />
          <span className="student-status-pie__legend-label">{labels.doing}</span>
          <span className="student-status-pie__legend-count">{doing}</span>
        </li>
        <li className="student-status-pie__legend-item student-status-pie__legend-item--done">
          <span className="student-status-pie__swatch" aria-hidden />
          <span className="student-status-pie__legend-label">{labels.done}</span>
          <span className="student-status-pie__legend-count">{done}</span>
        </li>
      </ul>
    </div>
  );
}
