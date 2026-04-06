import { useId, useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Upload, X } from 'lucide-react';
import { Checkbox } from 'react-aria-components';
import {
  REPORT_DEMO_CLASS_SIZE,
  REPORT_DEMO_EXAM_LABEL,
  REPORT_DEMO_GRADE_COUNTS,
  REPORT_DEMO_LEARNING_CARD_OPENED,
  REPORT_DEMO_TOP_LEARNERS,
  REPORT_DRAFT_BODY,
  REPORT_DRAFT_SUMMARY,
  REPORT_DRAFT_TITLE,
} from '@/bridge/mockData';
import { ReportGradesPieChart } from '@/bridge/components/ReportGradesPieChart';
import { TeacherReportContent } from '@/bridge/components/TeacherReportContent';
import type { TeacherReportPayload } from '@/bridge/types';
import { Button } from '@/bridge/components/ui/Button';
import { FieldTextArea } from '@/bridge/components/ui/FieldTextArea';
import { FieldTextInput } from '@/bridge/components/ui/FieldTextInput';

export function ReportModal({
  onClose,
  pushTeacherReport,
  onSent,
}: {
  onClose: () => void;
  pushTeacherReport: (payload: TeacherReportPayload) => void;
  /** Shown after a successful send; modal closes immediately after. */
  onSent?: () => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(REPORT_DRAFT_TITLE);
  const [summary, setSummary] = useState(REPORT_DRAFT_SUMMARY);
  const [body, setBody] = useState(REPORT_DRAFT_BODY);
  const [toStudents, setToStudents] = useState(true);
  const [toParents, setToParents] = useState(true);
  const [phase, setPhase] = useState<'edit' | 'preview'>('edit');
  const [audienceHint, setAudienceHint] = useState(false);
  const [importedNames, setImportedNames] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audienceHintId = useId();
  const importInputId = useId();

  const gradeLabels = {
    hd: t('dashboard.teacher.reportModal.gradeHd'),
    d: t('dashboard.teacher.reportModal.gradeD'),
    c: t('dashboard.teacher.reportModal.gradeC'),
    p: t('dashboard.teacher.reportModal.gradeP'),
  };

  const onImportChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setImportedNames((prev) => [...prev, ...Array.from(files).map((f) => f.name)]);
    e.target.value = '';
  };

  const sendReport = () => {
    pushTeacherReport({
      title: title.trim() || t('dashboard.teacher.reportModal.untitled'),
      summary: summary.trim(),
      body: body.trim(),
      toStudents,
      toParents,
    });
    onSent?.();
    onClose();
  };

  return (
    <>
      <div className="modal__header report-modal__header">
        <div className="report-modal__header-main">
          <h3 id="modal-report-title" className="modal__title">
            {phase === 'preview'
              ? t('dashboard.teacher.reportModal.previewPanelTitle')
              : t('dashboard.teacher.reportModal.title')}
          </h3>
          <p className="modal__lede">
            {phase === 'preview' ? t('dashboard.teacher.reportModal.previewLede') : t('dashboard.teacher.reportModal.lede')}
          </p>
        </div>
        <div className="report-modal__header-trailing">
          {phase === 'edit' ? (
            <div className="report-modal__header-actions">
              <input
                id={importInputId}
                ref={fileInputRef}
                type="file"
                className="visually-hidden"
                multiple
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,application/pdf"
                onChange={onImportChange}
              />
              <Button
                type="button"
                variant="secondary"
                pill
                id="btn-report-import"
                className="report-modal__import-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={16} strokeWidth={2} aria-hidden />
                {t('dashboard.teacher.reportModal.import')}
              </Button>
            </div>
          ) : null}
          <button
            type="button"
            className="report-modal__dismiss"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            <X size={20} strokeWidth={2} aria-hidden />
          </button>
        </div>
      </div>
      {phase === 'edit' ? (
        <form
          className="book-form report-modal__form"
          id="form-report"
          onSubmit={(e) => {
            e.preventDefault();
            if (!toStudents && !toParents) {
              setAudienceHint(true);
              return;
            }
            setAudienceHint(false);
            setPhase('preview');
          }}
        >
          <div className="modal__scroll report-modal__scroll">
            <div className="report-modal__ai-callout" role="note">
              <span className="report-modal__ai-callout-icon" aria-hidden>
                <Sparkles size={17} strokeWidth={2} />
              </span>
              <p className="report-modal__ai-callout-text">{t('dashboard.teacher.reportModal.aiUploadCallout')}</p>
            </div>
            {importedNames.length > 0 && (
              <p className="report-modal__imported" role="status">
                <span className="report-modal__imported-label">{t('dashboard.teacher.reportModal.importedFiles')}:</span>{' '}
                {importedNames.join(', ')}
              </p>
            )}

            <FieldTextInput
              id="report-title"
              label={t('dashboard.teacher.reportModal.fieldTitle')}
              value={title}
              onChange={setTitle}
              isRequired
              placeholder={t('dashboard.teacher.reportModal.fieldTitlePh')}
            />
            <FieldTextArea
              id="report-summary"
              label={t('dashboard.teacher.reportModal.fieldSummary')}
              value={summary}
              onChange={setSummary}
              rows={3}
              placeholder={t('dashboard.teacher.reportModal.fieldSummaryPh')}
            />
            <FieldTextArea
              id="report-body"
              label={t('dashboard.teacher.reportModal.fieldBody')}
              value={body}
              onChange={setBody}
              rows={5}
              placeholder={t('dashboard.teacher.reportModal.fieldBodyPh')}
            />

            <section className="report-modal__details" aria-labelledby="report-details-heading">
              <h4 id="report-details-heading" className="report-modal__details-title">
                {t('dashboard.teacher.reportModal.detailsTitle')}
              </h4>
              <p className="report-modal__exam-label">{REPORT_DEMO_EXAM_LABEL}</p>
              <p className="report-modal__details-hint">{t('dashboard.teacher.reportModal.detailsHint')}</p>

              <div className="report-modal__viz-grid">
                <div className="report-modal__viz-card">
                  <p className="report-modal__viz-kicker">{t('dashboard.teacher.reportModal.gradeChartTitle')}</p>
                  <ReportGradesPieChart
                    counts={{ ...REPORT_DEMO_GRADE_COUNTS }}
                    labels={gradeLabels}
                    chartAriaLabel={t('dashboard.teacher.reportModal.gradeChartAria')}
                  />
                </div>
                <div className="report-modal__viz-card report-modal__viz-card--stat">
                  <p className="report-modal__viz-kicker">{t('dashboard.teacher.reportModal.learningCardsTitle')}</p>
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
                <p className="report-modal__viz-kicker">{t('dashboard.teacher.reportModal.topLearnersTitle')}</p>
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

            <fieldset className="field field--audience">
              <legend className="field__label">{t('dashboard.teacher.reportModal.pushTo')}</legend>
              <div className="audience-chips">
                <Checkbox isSelected={toStudents} onChange={setToStudents} className="audience-chip audience-chip--rac">
                  <span>👨‍🎓 Students</span>
                </Checkbox>
                <Checkbox isSelected={toParents} onChange={setToParents} className="audience-chip audience-chip--rac">
                  <span>👪 Parents</span>
                </Checkbox>
              </div>
              <p className="field__hint" id={audienceHintId} role="alert" hidden={!audienceHint}>
                {t('dashboard.teacher.reportModal.selectAudience')}
              </p>
            </fieldset>
            <div className="report-actions">
              <Button
                variant="text"
                type="button"
                id="btn-report-draft"
                onClick={() => {
                  setTitle(REPORT_DRAFT_TITLE);
                  setSummary(REPORT_DRAFT_SUMMARY);
                  setBody(REPORT_DRAFT_BODY);
                }}
              >
                {t('dashboard.teacher.reportModal.generateDraft')}
              </Button>
            </div>
          </div>
          <div className="modal__footer">
            <div className="modal__actions">
              <Button variant="text" type="button" onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button variant="primary" pill type="submit">
                {t('dashboard.teacher.reportModal.preview')}
              </Button>
            </div>
          </div>
        </form>
      ) : phase === 'preview' ? (
        <>
          <div className="modal__scroll report-modal__scroll">
            <TeacherReportContent
              report={{
                title,
                summary,
                body,
                toStudents,
                toParents,
              }}
              variant="modal"
              previewHeadingId="report-preview-heading"
            />
          </div>
          <div className="modal__footer">
            <div className="modal__actions">
              <Button variant="text" type="button" onClick={() => setPhase('edit')}>
                {t('dashboard.teacher.reportModal.previewBack')}
              </Button>
              <Button variant="primary" pill type="button" onClick={sendReport}>
                {t('dashboard.teacher.reportModal.previewSend')}
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
