import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getMockTeacherCardEngagement } from '@/bridge/mockData';
import type { LearningCardItem } from '@/bridge/types';
import { StudentFinishedFeedbackPieChart, type StudentFinishedFeedbackCounts } from '@/bridge/components/StudentFinishedFeedbackPieChart';
import { StudentStatusPieChart } from '@/bridge/components/StudentStatusPieChart';
import { Button } from '@/bridge/components/ui/Button';
import type { LearningCardStudentFinishedType } from '@/data/entity/learning-card-backend';

export function TeacherCardPreviewTodoModal({
  card,
  onClose,
}: {
  card: LearningCardItem;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const engagement = useMemo(() => getMockTeacherCardEngagement(card.id), [card.id]);

  const needHelpCount = useMemo(
    () => engagement.parents.filter((p) => p.needHelp).length,
    [engagement.parents],
  );

  const studentStatusCounts = useMemo(() => {
    const c = { todo: 0, doing: 0, done: 0 };
    for (const s of engagement.students) c[s.status]++;
    return c;
  }, [engagement.students]);

  const finishedFeedbackCounts = useMemo((): StudentFinishedFeedbackCounts => {
    const c: StudentFinishedFeedbackCounts = { pretty_easy: 0, think_get_it: 0, challenge: 0 };
    for (const s of engagement.students) {
      if (s.status === 'done' && s.finishedType) c[s.finishedType]++;
    }
    return c;
  }, [engagement.students]);

  const finishedFeedbackTotal = useMemo(
    () =>
      (Object.keys(finishedFeedbackCounts) as LearningCardStudentFinishedType[]).reduce(
        (acc, k) => acc + finishedFeedbackCounts[k],
        0,
      ),
    [finishedFeedbackCounts],
  );

  const finishedLabels = useMemo(
    () =>
      ({
        pretty_easy: t('knowledge.studentFinishedType.pretty_easy'),
        think_get_it: t('knowledge.studentFinishedType.think_get_it'),
        challenge: t('knowledge.studentFinishedType.challenge'),
      }) satisfies Record<LearningCardStudentFinishedType, string>,
    [t],
  );

  const { quizFamilyCount, practiceFamilyCount, teachBackFamilyCount } = engagement.tonightActionUptake;

  return (
    <>
      <div className="modal__header">
        <h3 id="modal-teacher-card-preview-title" className="modal__title">
          {card.title}
        </h3>
        <p className="teacher-card-preview__meta">
          {[card.grade, card.subject].filter(Boolean).join(' · ')}
        </p>
      </div>
      <div className="modal__scroll teacher-card-preview__scroll">
        <p className="teacher-card-preview__hint">{t('dashboard.teacher.cardPreview.demoHint')}</p>

        <section className="teacher-card-preview__module" aria-labelledby="teacher-card-preview-mod-progress">
          <div className="teacher-card-preview__module-head">
            <span className="teacher-card-preview__module-badge" aria-hidden>
              1
            </span>
            <div className="teacher-card-preview__module-head-text">
              <h4 id="teacher-card-preview-mod-progress" className="teacher-card-preview__module-title">
                {t('dashboard.teacher.cardPreview.moduleProgressTitle')}
              </h4>
              <p className="teacher-card-preview__module-lede">{t('dashboard.teacher.cardPreview.moduleProgressLede')}</p>
            </div>
          </div>
          <div className="teacher-card-preview__progress-dashboard">
            <StudentStatusPieChart
              counts={studentStatusCounts}
              labels={{
                todo: t('knowledge.lcProgressShort.todo'),
                doing: t('knowledge.lcProgressShort.doing'),
                done: t('knowledge.lcProgressShort.done'),
              }}
              chartAriaLabel={t('dashboard.teacher.cardPreview.studentStatusChartAria')}
            />
          </div>
        </section>

        <section className="teacher-card-preview__module" aria-labelledby="teacher-card-preview-mod-feedback">
          <div className="teacher-card-preview__module-head">
            <span className="teacher-card-preview__module-badge" aria-hidden>
              2
            </span>
            <div className="teacher-card-preview__module-head-text">
              <h4 id="teacher-card-preview-mod-feedback" className="teacher-card-preview__module-title">
                {t('dashboard.teacher.cardPreview.moduleFeedbackTitle')}
              </h4>
              <p className="teacher-card-preview__module-lede">{t('dashboard.teacher.cardPreview.moduleFeedbackLede')}</p>
            </div>
          </div>

          <div className="teacher-card-preview__feedback-layout">
            <div
              className="teacher-card-preview__feedback-panel teacher-card-preview__feedback-panel--students"
              aria-labelledby="teacher-card-preview-student-feedback"
            >
              <h5 id="teacher-card-preview-student-feedback" className="teacher-card-preview__feedback-panel-title">
                {t('dashboard.teacher.cardPreview.studentFeedbackPanelTitle')}
              </h5>
              <p className="teacher-card-preview__feedback-panel-lede">
                {t('dashboard.teacher.cardPreview.studentFeedbackPanelLede', { count: studentStatusCounts.done })}
              </p>
              {finishedFeedbackTotal > 0 ? (
                <StudentFinishedFeedbackPieChart
                  counts={finishedFeedbackCounts}
                  labels={finishedLabels}
                  chartAriaLabel={t('dashboard.teacher.cardPreview.finishedFeedbackChartAria')}
                />
              ) : (
                <p className="teacher-card-preview__feedback-empty">{t('dashboard.teacher.cardPreview.studentFeedbackEmpty')}</p>
              )}
            </div>

            <div className="teacher-card-preview__stats" role="list">
              <div className="teacher-card-preview__stat" role="listitem">
                <div className="teacher-card-preview__stat-value teacher-card-preview__stat-value--need-help">
                  {needHelpCount}
                </div>
                <div className="teacher-card-preview__stat-label">
                  {t('dashboard.teacher.cardPreview.parentNeedHelpStatLabel')}
                </div>
              </div>
              <div className="teacher-card-preview__stat" role="listitem">
                <div className="teacher-card-preview__stat-value">{quizFamilyCount}</div>
                <div className="teacher-card-preview__stat-label">{t('dashboard.teacher.cardPreview.tonightActionUptakeQuiz')}</div>
              </div>
              <div className="teacher-card-preview__stat" role="listitem">
                <div className="teacher-card-preview__stat-value">{practiceFamilyCount}</div>
                <div className="teacher-card-preview__stat-label">
                  {t('dashboard.teacher.cardPreview.tonightActionUptakePractice')}
                </div>
              </div>
              <div className="teacher-card-preview__stat" role="listitem">
                <div className="teacher-card-preview__stat-value">{teachBackFamilyCount}</div>
                <div className="teacher-card-preview__stat-label">
                  {t('dashboard.teacher.cardPreview.tonightActionUptakeTeachBack')}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      <div className="modal__footer">
        <div className="modal__actions">
          <Button variant="text" type="button" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
      </div>
    </>
  );
}
