import { useMemo } from 'react';
import {
  ArcElement,
  Chart as ChartJS,
  type ChartData,
  type ChartOptions,
  Tooltip,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import type { LearningCardStudentFinishedType } from '@/data/entity/learning-card-backend';

ChartJS.register(ArcElement, Tooltip);

export type StudentFinishedFeedbackCounts = Record<LearningCardStudentFinishedType, number>;

type Props = {
  counts: StudentFinishedFeedbackCounts;
  labels: Record<LearningCardStudentFinishedType, string>;
  chartAriaLabel: string;
};

/** Aligns with Knowledge finish menu: easy (green), think (blue), challenge (red). */
const TYPE_BG: Record<LearningCardStudentFinishedType, string> = {
  pretty_easy: 'rgba(21, 128, 61, 0.22)',
  think_get_it: 'rgba(11, 87, 208, 0.18)',
  challenge: 'rgba(185, 28, 28, 0.2)',
};

const TYPE_BORDER: Record<LearningCardStudentFinishedType, string> = {
  pretty_easy: 'rgba(21, 128, 61, 0.55)',
  think_get_it: 'rgba(11, 87, 208, 0.42)',
  challenge: 'rgba(185, 28, 28, 0.5)',
};

const ORDER: LearningCardStudentFinishedType[] = ['pretty_easy', 'think_get_it', 'challenge'];

const EMPTY_RING = 'rgba(229, 231, 235, 0.95)';

export function StudentFinishedFeedbackPieChart({ counts, labels, chartAriaLabel }: Props) {
  const { pretty_easy, think_get_it, challenge } = counts;
  const total = pretty_easy + think_get_it + challenge;

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
          backgroundColor: ORDER.map((k) => TYPE_BG[k]),
          borderWidth: 2,
          borderColor: ORDER.map((k) => TYPE_BORDER[k]),
        },
      ],
    };
  }, [counts, labels, total]);

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
    return `${chartAriaLabel}: ${labels.pretty_easy} ${pretty_easy}, ${labels.think_get_it} ${think_get_it}, ${labels.challenge} ${challenge}`;
  }, [chartAriaLabel, labels, pretty_easy, think_get_it, challenge, total]);

  return (
    <div className="student-finished-pie" role="img" aria-label={summary}>
      <div className="student-finished-pie__chart-wrap">
        <Doughnut data={data} options={options} className="student-finished-pie__chart" />
      </div>
      <ul className="student-finished-pie__legend">
        {ORDER.map((key) => (
          <li
            key={key}
            className={`student-finished-pie__legend-item student-finished-pie__legend-item--${key.replace(/_/g, '-')}`}
          >
            <span className="student-finished-pie__swatch" aria-hidden />
            <span className="student-finished-pie__legend-label">{labels[key]}</span>
            <span className="student-finished-pie__legend-count">{counts[key]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
