import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useBridge } from '@/bridge/BridgeContext';
import type { TeacherBroadcastPayload } from '@/bridge/types';
import { LearningCardModal } from '@/bridge/components/LearningCardModal';
import { ReportModal } from '@/bridge/components/ReportModal';
import { TeacherCardPreviewTodoModal } from '@/bridge/components/TeacherCardPreviewTodoModal';
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

function BroadcastModal({
  onClose,
  pushBroadcast,
  onSent,
}: {
  onClose: () => void;
  pushBroadcast: (payload: TeacherBroadcastPayload) => void;
  onSent?: () => void;
}) {
  const [bcTitle, setBcTitle] = useState('');
  const [bcBody, setBcBody] = useState('');
  const send = () => {
    const title = bcTitle.trim();
    const body = bcBody.trim();
    if (!title || !body) return;
    pushBroadcast({
      title,
      body,
      toStudents: true,
      toParents: true,
    });
    onSent?.();
    onClose();
  };
  return (
    <>
      <div className="modal__header">
        <h3 id="modal-broadcast-title" className="modal__title">
          Broadcast
        </h3>
      </div>
      <form
        className="book-form"
        id="form-broadcast"
        onSubmit={(e) => {
          e.preventDefault();
          send();
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
    </>
  );
}

export function BridgeModals() {
  const { t } = useTranslation();
  const { modal, closeModal, pushTeacherReport, pushBroadcast, bumpLearningCards } = useBridge();
  const [bridgeToast, setBridgeToast] = useState<string | null>(null);

  useEffect(() => {
    if (!bridgeToast) return;
    const id = window.setTimeout(() => setBridgeToast(null), 4500);
    return () => clearTimeout(id);
  }, [bridgeToast]);

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

  const withToast = (node: ReactNode) => (
    <>
      {node}
      {bridgeToast ? (
        <div className="bridge-toast" role="status" aria-live="polite">
          {bridgeToast}
        </div>
      ) : null}
    </>
  );

  if (modal.type === 'generic') {
    return withToast(
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
      </div>,
    );
  }

  if (modal.type === 'book') {
    return withToast(
      <div className="modal" id="modal-book" role="dialog" aria-modal="true" aria-labelledby="modal-book-title">
        <div className="modal__backdrop" onClick={onBackdropClose} aria-hidden="true" />
        <div className="modal__box modal__box--rounded">
          <BookModal onClose={onBackdropClose} />
        </div>
      </div>,
    );
  }

  if (modal.type === 'broadcast') {
    return withToast(
      <div className="modal" id="modal-broadcast" role="dialog" aria-modal="true" aria-labelledby="modal-broadcast-title">
        <div className="modal__backdrop" onClick={onBackdropClose} aria-hidden="true" />
        <div className="modal__box modal__box--rounded">
          <BroadcastModal
            onClose={onBackdropClose}
            pushBroadcast={pushBroadcast}
            onSent={() => setBridgeToast(t('chat.broadcastSent'))}
          />
        </div>
      </div>,
    );
  }

  if (modal.type === 'learningCard') {
    return withToast(
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
      </div>,
    );
  }

  if (modal.type === 'report') {
    return withToast(
      <div className="modal" id="modal-report" role="dialog" aria-modal="true" aria-labelledby="modal-report-title">
        <div className="modal__backdrop" onClick={onBackdropClose} aria-hidden="true" />
        <div className="modal__box modal__box--rounded modal__box--report">
          <ReportModal
            onClose={onBackdropClose}
            pushTeacherReport={pushTeacherReport}
            onSent={() => setBridgeToast(t('dashboard.teacher.reportModal.previewSuccess'))}
          />
        </div>
      </div>,
    );
  }

  if (modal.type === 'teacherCardPreviewTodo') {
    const { card } = modal;
    return withToast(
      <div
        className="modal"
        id="modal-teacher-card-preview"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-teacher-card-preview-title"
      >
        <div className="modal__backdrop" onClick={onBackdropClose} aria-hidden="true" />
        <div className="modal__box modal__box--rounded modal__box--xlarge modal__box--teacher-card-preview">
          <TeacherCardPreviewTodoModal card={card} onClose={onBackdropClose} />
        </div>
      </div>,
    );
  }

  return withToast(null);
}
