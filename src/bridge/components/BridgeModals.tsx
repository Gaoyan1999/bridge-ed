import { useEffect, useId, useState } from 'react';
import { Checkbox } from 'react-aria-components';
import { useBridge } from '@/bridge/BridgeContext';
import { REPORT_DRAFT_BODY, REPORT_DRAFT_TITLE } from '@/bridge/mockData';
import { LearningCardModal } from '@/bridge/components/LearningCardModal';
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
          Recipients get a copy in <strong>Chat</strong>.
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
  const { modal, closeModal, pushTeacherReport, bumpLearningCards } = useBridge();

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

  return null;
}
