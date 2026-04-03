import { useEffect, useId, useState } from 'react';
import { useBridge } from '@/bridge/BridgeContext';
import { REPORT_DRAFT_BODY, REPORT_DRAFT_TITLE } from '@/bridge/mockData';
import { Button } from '@/bridge/components/ui/Button';

function BookModal({ onClose }: { onClose: () => void }) {
  const [success, setSuccess] = useState(false);
  return (
    <>
      <h3 id="modal-book-title" className="modal__title">
        Book a 1:1
      </h3>
      {!success ? (
        <form
          className="book-form"
          id="form-book"
          onSubmit={(e) => {
            e.preventDefault();
            setSuccess(true);
          }}
        >
          <label className="field">
            <span className="field__label">Preferred date</span>
            <input type="date" className="field__input field__input--pill" id="book-date" required />
          </label>
          <label className="field">
            <span className="field__label">Time slot</span>
            <select className="field__input field__input--pill" id="book-slot" required defaultValue="">
              <option value="">Choose a slot</option>
              <option>Mon 18:00–18:20</option>
              <option>Wed 17:30–17:50</option>
              <option>Fri 16:00–16:20</option>
            </select>
          </label>
          <label className="field">
            <span className="field__label">Topic (optional)</span>
            <input
              type="text"
              className="field__input field__input--pill"
              id="book-topic"
              placeholder="e.g. factoring homework"
            />
          </label>
          <div className="modal__actions">
            <Button variant="text" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" pill type="submit">
              Send request
            </Button>
          </div>
        </form>
      ) : null}
      <p className="form-success" id="book-success" role="status" hidden={!success}>
        Request sent (demo). Your teacher will confirm the slot.
      </p>
    </>
  );
}

function BroadcastModal({ onClose }: { onClose: () => void }) {
  const [success, setSuccess] = useState(false);
  return (
    <>
      <h3 id="modal-broadcast-title" className="modal__title">
        Broadcast
      </h3>
      {!success ? (
        <form
          className="book-form"
          id="form-broadcast"
          onSubmit={(e) => {
            e.preventDefault();
            setSuccess(true);
          }}
        >
          <label className="field">
            <span className="field__label">Title</span>
            <input
              type="text"
              className="field__input field__input--pill"
              id="bc-title"
              required
              placeholder="e.g. This week’s practice set"
            />
          </label>
          <label className="field">
            <span className="field__label">Message</span>
            <textarea
              className="field__input field__input--pill"
              id="bc-body"
              rows={4}
              required
              placeholder="Your message to the class…"
            />
          </label>
          <div className="modal__actions">
            <Button variant="text" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" pill type="submit">
              Send to class
            </Button>
          </div>
        </form>
      ) : null}
      <p className="form-success" id="bc-success" role="status" hidden={!success}>
        Sent (demo).
      </p>
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
      <h3 id="modal-report-title" className="modal__title">
        Create &amp; push report
      </h3>
      <p className="modal__lede">
        Recipients get a copy in <strong>Messages</strong>. (Demo: stored in this browser session only.)
      </p>
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
          <label className="field">
            <span className="field__label">Report title</span>
            <input
              type="text"
              className="field__input field__input--pill"
              id="report-title"
              required
              placeholder="e.g. Week 14 — class progress"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field__label">Report body</span>
            <textarea
              className="field__input field__input--pill"
              id="report-body"
              rows={7}
              required
              placeholder="Highlights, reminders, and optional next steps…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          <fieldset className="field field--audience">
            <legend className="field__label">Push to</legend>
            <div className="audience-chips">
              <label className="audience-chip">
                <input
                  type="checkbox"
                  id="report-to-students"
                  checked={toStudents}
                  onChange={(e) => setToStudents(e.target.checked)}
                />
                <span>👨‍🎓 Students</span>
              </label>
              <label className="audience-chip">
                <input
                  type="checkbox"
                  id="report-to-parents"
                  checked={toParents}
                  onChange={(e) => setToParents(e.target.checked)}
                />
                <span>👪 Parents</span>
              </label>
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
          <div className="modal__actions">
            <Button variant="text" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" pill type="submit">
              Push report
            </Button>
          </div>
        </form>
      ) : null}
      <p className="form-success" id="report-success" role="status" hidden={!success}>
        Report pushed. Students and/or parents will see it under Messages.
      </p>
    </>
  );
}

export function BridgeModals() {
  const { modal, closeModal, pushTeacherReport } = useBridge();

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
          <h3 id="modal-generic-title" className="modal__title">
            {modal.title}
          </h3>
          <p className="modal__body">{modal.body}</p>
          <Button variant="text" primaryColor onClick={onBackdropClose}>
            Got it
          </Button>
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
