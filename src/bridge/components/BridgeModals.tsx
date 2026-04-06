import { useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox } from 'react-aria-components';
import { useBridge } from '@/bridge/BridgeContext';
import { getMockTeacherCardEngagement, REPORT_DRAFT_BODY, REPORT_DRAFT_TITLE } from '@/bridge/mockData';
import type { LearningCardItem } from '@/bridge/types';
import { LearningCardModal } from '@/bridge/components/LearningCardModal';
import { StudentStatusPieChart } from '@/bridge/components/StudentStatusPieChart';
import { Button } from '@/bridge/components/ui/Button';
import { FieldSelect } from '@/bridge/components/ui/FieldSelect';
import { FieldTextArea } from '@/bridge/components/ui/FieldTextArea';
import { FieldTextInput } from '@/bridge/components/ui/FieldTextInput';

const BOOK_SLOT_OPTIONS = [
  { value: '__none__', label: 'Choose a slot' },
  { value: 'mon', label: 'Mon 18:00–18:20' },
  { value: 'wed', label: 'Wed 17:30–17:50' },
  { value: 'fri', label: 'Fri 16:00–16:20' },
] as const;

function BookModal({ onClose }: { onClose: () => void }) {
  const [success, setSuccess] = useState(false);
  const [bookDate, setBookDate] = useState('');
  const [bookSlot, setBookSlot] = useState<string>(BOOK_SLOT_OPTIONS[0]!.value);
  const [bookTopic, setBookTopic] = useState('');
  return (
    <>
      <div className="modal__header">
        <h3 id="modal-book-title" className="modal__title">
          Book a 1:1
        </h3>
      </div>
      {!success ? (
        <form
          className="book-form"
          id="form-book"
          onSubmit={(e) => {
            e.preventDefault();
            if (bookSlot === '__none__') return;
            setSuccess(true);
          }}
        >
          <div className="modal__scroll">
            <FieldTextInput
              id="book-date"
              label="Preferred date"
              type="date"
              value={bookDate}
              onChange={setBookDate}
              isRequired
            />
            <FieldSelect
              id="book-slot"
              label="Time slot"
              value={bookSlot}
              onValueChange={setBookSlot}
              options={[...BOOK_SLOT_OPTIONS]}
            />
            <FieldTextInput
              id="book-topic"
              label="Topic (optional)"
              value={bookTopic}
              onChange={setBookTopic}
              placeholder="e.g. factoring homework"
            />
          </div>
          <div className="modal__footer">
            <div className="modal__actions">
              <Button variant="text" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" pill type="submit">
                Send request
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <div className="modal__scroll">
          <p className="form-success" id="book-success" role="status" hidden={!success}>
            Request sent (demo). Your teacher will confirm the slot.
          </p>
        </div>
      )}
    </>
  );
}

function TeacherCardPreviewTodoModal({
  card,
  onClose,
  onContinue,
}: {
  card: LearningCardItem;
  onClose: () => void;
  onContinue: () => void;
}) {
  const { t } = useTranslation();
  const engagement = useMemo(() => getMockTeacherCardEngagement(card.id), [card.id]);
  const totalVideoOpens = useMemo(
    () => engagement.students.reduce((acc, row) => acc + row.watchedVideos, 0),
    [engagement.students],
  );
  const needHelpCount = useMemo(
    () => engagement.parents.filter((p) => p.needHelp).length,
    [engagement.parents],
  );

  const studentStatusCounts = useMemo(() => {
    const c = { todo: 0, doing: 0, done: 0 };
    for (const s of engagement.students) c[s.status]++;
    return c;
  }, [engagement.students]);

  const statusLabel = (s: 'todo' | 'doing' | 'done') =>
    s === 'todo' ? t('knowledge.lcProgressShort.todo') : s === 'doing' ? t('knowledge.lcProgressShort.doing') : t('knowledge.lcProgressShort.done');

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
      <div className="modal__scroll">
        <p className="teacher-card-preview__hint">{t('dashboard.teacher.cardPreview.demoHint')}</p>

        <div className="teacher-card-preview__stats" role="group" aria-label={t('dashboard.teacher.cardPreview.feedbackTitle')}>
          <div className="teacher-card-preview__stat">
            <div className="teacher-card-preview__stat-value">{totalVideoOpens}</div>
            <div className="teacher-card-preview__stat-label">{t('dashboard.teacher.cardPreview.studentVideos')}</div>
          </div>
          <div className="teacher-card-preview__stat">
            <div className="teacher-card-preview__stat-value">{needHelpCount}</div>
            <div className="teacher-card-preview__stat-label">{t('dashboard.teacher.cardPreview.parentNeedHelp')}</div>
          </div>
        </div>

        <section className="teacher-card-preview__section" aria-labelledby="teacher-card-preview-students">
          <h4 id="teacher-card-preview-students" className="teacher-card-preview__section-title">
            {t('dashboard.teacher.cardPreview.studentsTitle')}
          </h4>
          <p className="teacher-card-preview__subsection-lede">{t('dashboard.teacher.cardPreview.studentStatusDistribution')}</p>
          <div className="teacher-card-preview__students-dashboard">
            <StudentStatusPieChart
              counts={studentStatusCounts}
              labels={{
                todo: t('knowledge.lcProgressShort.todo'),
                doing: t('knowledge.lcProgressShort.doing'),
                done: t('knowledge.lcProgressShort.done'),
              }}
              chartAriaLabel={t('dashboard.teacher.cardPreview.studentStatusChartAria')}
            />
            <div className="table-wrap table-wrap--flush">
              <table className="data-table data-table--compact teacher-card-preview__table">
                <thead>
                  <tr>
                    <th>{t('dashboard.teacher.cardPreview.colName')}</th>
                    <th>{t('dashboard.teacher.cardPreview.colVideos')}</th>
                  </tr>
                </thead>
                <tbody>
                  {engagement.students.map((row) => (
                    <tr key={row.id}>
                      <td>{row.name}</td>
                      <td>{row.watchedVideos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="teacher-card-preview__section" aria-labelledby="teacher-card-preview-parents">
          <h4 id="teacher-card-preview-parents" className="teacher-card-preview__section-title">
            {t('dashboard.teacher.cardPreview.parentsTitle')}
          </h4>
          <div className="table-wrap table-wrap--flush">
            <table className="data-table data-table--compact teacher-card-preview__table">
              <thead>
                <tr>
                  <th>{t('dashboard.teacher.cardPreview.colName')}</th>
                  <th>{t('dashboard.teacher.cardPreview.colStatus')}</th>
                  <th>{t('dashboard.teacher.cardPreview.colNeedHelp')}</th>
                </tr>
              </thead>
              <tbody>
                {engagement.parents.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>
                      <span className={`teacher-lc-status teacher-lc-status--${row.status}`}>{statusLabel(row.status)}</span>
                    </td>
                    <td>{row.needHelp ? t('dashboard.teacher.cardPreview.needHelpYes') : t('dashboard.teacher.cardPreview.needHelpNo')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <div className="modal__footer">
        <div className="modal__actions">
          <Button variant="text" type="button" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" pill type="button" onClick={onContinue}>
            {t('dashboard.teacher.cardPreview.openKnowledge')}
          </Button>
        </div>
      </div>
    </>
  );
}

function BroadcastModal({ onClose }: { onClose: () => void }) {
  const [success, setSuccess] = useState(false);
  const [bcTitle, setBcTitle] = useState('');
  const [bcBody, setBcBody] = useState('');
  return (
    <>
      <div className="modal__header">
        <h3 id="modal-broadcast-title" className="modal__title">
          Broadcast
        </h3>
      </div>
      {!success ? (
        <form
          className="book-form"
          id="form-broadcast"
          onSubmit={(e) => {
            e.preventDefault();
            setSuccess(true);
          }}
        >
          <div className="modal__scroll">
            <FieldTextInput
              id="bc-title"
              label="Title"
              value={bcTitle}
              onChange={setBcTitle}
              isRequired
              placeholder="e.g. This week’s practice set"
            />
            <FieldTextArea
              id="bc-body"
              label="Message"
              value={bcBody}
              onChange={setBcBody}
              rows={4}
              isRequired
              placeholder="Your message to the class…"
            />
          </div>
          <div className="modal__footer">
            <div className="modal__actions">
              <Button variant="text" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" pill type="submit">
                Send to class
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <div className="modal__scroll">
          <p className="form-success" id="bc-success" role="status" hidden={!success}>
            Sent (demo).
          </p>
        </div>
      )}
    </>
  );
}

function ReportModal({
  onClose,
  pushTeacherReport,
}: {
  onClose: () => void;
  pushTeacherReport: (title: string, body: string, toStudents: boolean, toParents: boolean) => void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [toStudents, setToStudents] = useState(true);
  const [toParents, setToParents] = useState(true);
  const [success, setSuccess] = useState(false);
  const [audienceHint, setAudienceHint] = useState(false);
  const audienceHintId = useId();

  return (
    <>
      <div className="modal__header">
        <h3 id="modal-report-title" className="modal__title">
          Create &amp; push report
        </h3>
        <p className="modal__lede">
          Recipients get a copy in <strong>Messages</strong>.
        </p>
      </div>
      {!success ? (
        <form
          className="book-form"
          id="form-report"
          onSubmit={(e) => {
            e.preventDefault();
            if (!toStudents && !toParents) {
              setAudienceHint(true);
              return;
            }
            setAudienceHint(false);
            const t = title.trim() || 'Untitled report';
            const b = body.trim() || '';
            pushTeacherReport(t, b, toStudents, toParents);
            setSuccess(true);
          }}
        >
          <div className="modal__scroll">
            <FieldTextInput
              id="report-title"
              label="Report title"
              value={title}
              onChange={setTitle}
              isRequired
              placeholder="e.g. Week 14 — class progress"
            />
            <FieldTextArea
              id="report-body"
              label="Report body"
              value={body}
              onChange={setBody}
              rows={7}
              isRequired
              placeholder="Highlights, reminders, and optional next steps…"
            />
            <fieldset className="field field--audience">
              <legend className="field__label">Push to</legend>
              <div className="audience-chips">
                <Checkbox isSelected={toStudents} onChange={setToStudents} className="audience-chip audience-chip--rac">
                  <span>👨‍🎓 Students</span>
                </Checkbox>
                <Checkbox isSelected={toParents} onChange={setToParents} className="audience-chip audience-chip--rac">
                  <span>👪 Parents</span>
                </Checkbox>
              </div>
              <p className="field__hint" id={audienceHintId} role="alert" hidden={!audienceHint}>
                Select at least one audience.
              </p>
            </fieldset>
            <div className="report-actions">
              <Button
                variant="text"
                type="button"
                id="btn-report-draft"
                onClick={() => {
                  setTitle(REPORT_DRAFT_TITLE);
                  setBody(REPORT_DRAFT_BODY);
                }}
              >
                Generate draft (demo)
              </Button>
            </div>
          </div>
          <div className="modal__footer">
            <div className="modal__actions">
              <Button variant="text" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" pill type="submit">
                Push report
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <div className="modal__scroll">
          <p className="form-success" id="report-success" role="status" hidden={!success}>
            Report pushed. Students and/or parents will see it under Chat.
          </p>
        </div>
      )}
    </>
  );
}

export function BridgeModals() {
  const { modal, closeModal, pushTeacherReport, bumpLearningCards, openKnowledgeFromCard } = useBridge();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (modal.type === 'none') return;
      closeModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal, closeModal]);

  const onBackdropClose = () => {
    closeModal();
  };

  if (modal.type === 'generic') {
    return (
      <div className="modal" id="modal-generic" role="dialog" aria-modal="true" aria-labelledby="modal-generic-title">
        <div className="modal__backdrop" onClick={onBackdropClose} aria-hidden="true" />
        <div className="modal__box modal__box--rounded">
          <div className="modal__header">
            <h3 id="modal-generic-title" className="modal__title">
              {modal.title}
            </h3>
          </div>
          <div className="modal__scroll">
            <p className="modal__body">{modal.body}</p>
          </div>
          <div className="modal__footer">
            <div className="modal__actions">
              <Button variant="text" primaryColor onClick={onBackdropClose}>
                Got it
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (modal.type === 'book') {
    return (
      <div className="modal" id="modal-book" role="dialog" aria-modal="true" aria-labelledby="modal-book-title">
        <div className="modal__backdrop" onClick={onBackdropClose} aria-hidden="true" />
        <div className="modal__box modal__box--rounded">
          <BookModal onClose={onBackdropClose} />
        </div>
      </div>
    );
  }

  if (modal.type === 'broadcast') {
    return (
      <div className="modal" id="modal-broadcast" role="dialog" aria-modal="true" aria-labelledby="modal-broadcast-title">
        <div className="modal__backdrop" onClick={onBackdropClose} aria-hidden="true" />
        <div className="modal__box modal__box--rounded">
          <BroadcastModal onClose={onBackdropClose} />
        </div>
      </div>
    );
  }

  if (modal.type === 'learningCard') {
    return (
      <div
        className="modal"
        id="modal-learning-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-learning-card-title"
      >
        <div className="modal__backdrop" onClick={onBackdropClose} aria-hidden="true" />
        <div className="modal__box modal__box--rounded modal__box--xlarge">
          <LearningCardModal onClose={onBackdropClose} onSaved={bumpLearningCards} />
        </div>
      </div>
    );
  }

  if (modal.type === 'report') {
    return (
      <div className="modal" id="modal-report" role="dialog" aria-modal="true" aria-labelledby="modal-report-title">
        <div className="modal__backdrop" onClick={onBackdropClose} aria-hidden="true" />
        <div className="modal__box modal__box--rounded modal__box--wide">
          <ReportModal onClose={onBackdropClose} pushTeacherReport={pushTeacherReport} />
        </div>
      </div>
    );
  }

  if (modal.type === 'teacherCardPreviewTodo') {
    const { card } = modal;
    return (
      <div
        className="modal"
        id="modal-teacher-card-preview"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-teacher-card-preview-title"
      >
        <div className="modal__backdrop" onClick={onBackdropClose} aria-hidden="true" />
        <div className="modal__box modal__box--rounded modal__box--xlarge modal__box--teacher-card-preview">
          <TeacherCardPreviewTodoModal
            card={card}
            onClose={onBackdropClose}
            onContinue={() => {
              onBackdropClose();
              openKnowledgeFromCard(card);
            }}
          />
        </div>
      </div>
    );
  }

  return null;
}
