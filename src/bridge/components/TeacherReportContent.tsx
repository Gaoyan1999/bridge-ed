import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, BookOpen, Medal, PieChart } from 'lucide-react';
import {
  REPORT_DEMO_CLASS_SIZE,
  REPORT_DEMO_EXAM_LABEL,
  REPORT_DEMO_GRADE_COUNTS,
  REPORT_DEMO_LEARNING_CARD_OPENED,
  REPORT_DEMO_TOP_LEARNERS,
} from '@/bridge/mockData';
import { ReportGradesPieChart } from '@/bridge/components/ReportGradesPieChart';
import { cx } from '@/bridge/cx';
import type { TeacherReportPayload } from '@/bridge/types';

type TeacherReportContentProps = {
  report: TeacherReportPayload;
  variant: 'modal' | 'thread';
  /** Modal only: id for the visually hidden preview heading */
  previewHeadingId?: string;
};

/**
 * Full class-report preview: message card, class insights, and audience — same in the modal and in Messages.
 */
export function TeacherReportContent({ report, variant, previewHeadingId }: TeacherReportContentProps) {
  const { t } = useTranslation();
  const insightsSectionId = useId();
  const { title, summary, body, toStudents, toParents } = report;

  const displayTitle = title.trim() || t('dashboard.teacher.reportModal.untitled');

  const gradeLabels = {
    hd: t('dashboard.teacher.reportModal.gradeHd'),
    d: t('dashboard.teacher.reportModal.gradeD'),
    c: t('dashboard.teacher.reportModal.gradeC'),
    p: t('dashboard.teacher.reportModal.gradeP'),
  };

  return (
    <article
      className={cx(variant === 'modal' && 'report-modal__preview', variant === 'thread' && 'teacher-report-msg')}
      aria-labelledby={variant === 'modal' && previewHeadingId ? previewHeadingId : undefined}
    >
      {variant === 'modal' && previewHeadingId ? (
        <h4 id={previewHeadingId} className="visually-hidden">
          {t('dashboard.teacher.reportModal.previewPanelTitle')}
        </h4>
      ) : null}

      <div className="report-modal__preview-card">
        <p className="report-modal__preview-kicker">{t('dashboard.teacher.reportModal.previewDocLabel')}</p>
        <h5 className="report-modal__preview-title">{displayTitle}</h5>
        {summary.trim() ? <p className="report-modal__preview-summary">{summary.trim()}</p> : null}
        <div className="report-modal__preview-body">
          {body.trim() ? (
            body
              .trim()
              .split('\n')
              .map((line, i) => <p key={i}>{line || '\u00a0'}</p>)
          ) : (
            <p className="report-modal__preview-empty">{t('dashboard.teacher.reportModal.previewEmptyBody')}</p>
          )}
        </div>
      </div>

      <section className="report-modal__preview-insights" aria-labelledby={insightsSectionId}>
        <h4 id={insightsSectionId} className="report-modal__preview-section-title">
          <BarChart3 className="report-modal__preview-section-icon" size={18} strokeWidth={2} aria-hidden />
          {t('dashboard.teacher.reportModal.detailsTitle')}
        </h4>
        <p className="report-modal__exam-label">{REPORT_DEMO_EXAM_LABEL}</p>
        <p className="report-modal__details-hint">{t('dashboard.teacher.reportModal.detailsHint')}</p>

        <div className="report-modal__viz-grid">
          <div className="report-modal__viz-card">
            <p className="report-modal__viz-kicker report-modal__viz-kicker--with-icon">
              <PieChart className="report-modal__viz-kicker-icon" size={14} strokeWidth={2} aria-hidden />
              {t('dashboard.teacher.reportModal.gradeChartTitle')}
            </p>
            <ReportGradesPieChart
              counts={{ ...REPORT_DEMO_GRADE_COUNTS }}
              labels={gradeLabels}
              chartAriaLabel={t('dashboard.teacher.reportModal.gradeChartAria')}
            />
          </div>
          <div className="report-modal__viz-card report-modal__viz-card--stat">
            <p className="report-modal__viz-kicker report-modal__viz-kicker--with-icon">
              <BookOpen className="report-modal__viz-kicker-icon" size={14} strokeWidth={2} aria-hidden />
              {t('dashboard.teacher.reportModal.learningCardsTitle')}
            </p>
            <p className="report-modal__big-stat">
              {REPORT_DEMO_LEARNING_CARD_OPENED}
              <span className="report-modal__big-stat-den">/{REPORT_DEMO_CLASS_SIZE}</span>
            </p>
            <p className="report-modal__stat-caption">
              {t('dashboard.teacher.reportModal.learningCardsStat', {
                opened: REPORT_DEMO_LEARNING_CARD_OPENED,
                total: REPORT_DEMO_CLASS_SIZE,
              })}
            </p>
          </div>
        </div>

        <div className="report-modal__top-learners">
          <p className="report-modal__viz-kicker report-modal__viz-kicker--with-icon">
            <Medal className="report-modal__viz-kicker-icon" size={14} strokeWidth={2} aria-hidden />
            {t('dashboard.teacher.reportModal.topLearnersTitle')}
          </p>
          <p className="report-modal__top-hint">{t('dashboard.teacher.reportModal.topLearnersHint')}</p>
          <ol className="report-modal__top-list">
            {REPORT_DEMO_TOP_LEARNERS.map((row, idx) => (
              <li key={row.name} className="report-modal__top-item">
                <span className="report-modal__top-rank" aria-hidden>
                  {idx + 1}
                </span>
                <span className="report-modal__top-name">{row.name}</span>
                <span className="report-modal__top-metric">
                  {row.cardsOpened} {t('dashboard.teacher.reportModal.cardsOpened')}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="report-modal__preview-audience">
        <span className="report-modal__preview-audience-label">{t('dashboard.teacher.reportModal.previewAudience')}</span>
        <span className="report-modal__preview-audience-tags">
          {toStudents ? <span className="report-modal__preview-tag">{t('dashboard.teacher.reportModal.audienceStudents')}</span> : null}
          {toStudents && toParents ? <span aria-hidden> · </span> : null}
          {toParents ? <span className="report-modal__preview-tag">{t('dashboard.teacher.reportModal.audienceParents')}</span> : null}
          {!toStudents && !toParents ? (
            <span className="report-modal__preview-tag report-modal__preview-tag--none">
              {t('dashboard.teacher.reportModal.previewAudienceNone')}
            </span>
          ) : null}
        </span>
      </div>
    </article>
  );
}
