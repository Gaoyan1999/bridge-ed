import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useBridge } from '@/bridge/BridgeContext';
import type { TeacherBroadcastPayload } from '@/bridge/types';
import type { UserBackend } from '@/data/entity/user-backend';
import { LearningCardModal } from '@/bridge/components/LearningCardModal';
import { ReportModal } from '@/bridge/components/ReportModal';
import { TeacherCardPreviewTodoModal } from '@/bridge/components/TeacherCardPreviewTodoModal';
import { Button } from '@/bridge/components/ui/Button';
import { FieldSelect } from '@/bridge/components/ui/FieldSelect';
import { FieldTextArea } from '@/bridge/components/ui/FieldTextArea';
import { FieldTextInput } from '@/bridge/components/ui/FieldTextInput';

const BOOK_SLOT_VALUES = ['__none__', '1600', '1730', '1800'] as const;

type BookModalSelectFieldProps = {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
  placeholder?: string;
  hint?: string;
};

function BookModalSelectField({
  id,
  label,
  value,
  onValueChange,
  options,
  placeholder,
  hint,
}: BookModalSelectFieldProps) {
  return (
    <>
      <FieldSelect
        id={id}
        label={label}
        value={value}
        onValueChange={onValueChange}
        options={options}
        placeholder={placeholder}
      />
      {hint ? <p className="field__hint book-form__hint">{hint}</p> : null}
    </>
  );
}

function BookModal({
  onClose,
  teachers,
  onSubmit,
  onSent,
}: {
  onClose: () => void;
  teachers: UserBackend[];
  onSubmit?: (payload: { teacherId: string; date: string; bookSlot: string; topic: string }) => void;
  onSent?: () => void;
}) {
  const { t } = useTranslation();
  const [bookTeacher, setBookTeacher] = useState<string>('');
  const [bookDate, setBookDate] = useState('');
  const [bookSlot, setBookSlot] = useState<string>(BOOK_SLOT_VALUES[0]);
  const [bookTopic, setBookTopic] = useState('');
  const teacherOptions = teachers.map((u) => ({ value: u.id, label: u.name }));
  const allSlotOptions = useMemo(
    () =>
      [
        { value: '1600', label: '16:00-16:20', hour: 16, minute: 0 },
        { value: '1730', label: '17:30-17:50', hour: 17, minute: 30 },
        { value: '1800', label: '18:00-18:20', hour: 18, minute: 0 },
      ] as const,
    [],
  );
  const slotOptions = useMemo(() => {
    if (!bookDate) {
      return [{ value: '__none__', label: t('chat.bookModal.pickSlot') }, ...allSlotOptions];
    }
    const now = new Date();
    const today = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-${`${now.getDate()}`.padStart(2, '0')}`;
    if (bookDate > today) return [{ value: '__none__', label: t('chat.bookModal.pickSlot') }, ...allSlotOptions];
    if (bookDate < today) return [{ value: '__none__', label: t('chat.bookModal.pickSlot') }];
    const curMinutes = now.getHours() * 60 + now.getMinutes();
    const future = allSlotOptions.filter((s) => s.hour * 60 + s.minute > curMinutes);
    return [{ value: '__none__', label: t('chat.bookModal.pickSlot') }, ...future];
  }, [allSlotOptions, bookDate, t]);
  useEffect(() => {
    if (bookSlot === '__none__') return;
    if (!slotOptions.some((s) => s.value === bookSlot)) setBookSlot('__none__');
  }, [bookSlot, slotOptions]);
  const submit = () => {
    if (!bookTeacher || bookSlot === '__none__' || !bookDate.trim()) return;
    onSubmit?.({
      teacherId: bookTeacher,
      date: bookDate,
      bookSlot: bookSlot,
      topic: bookTopic,
    });
    onSent?.();
    onClose();
  };
  return (
    <>
      <div className="modal__header">
        <h3 id="modal-book-title" className="modal__title modal__title--xs">
          {t('chat.bookModal.title')}
        </h3>
      </div>
      <form
        className="book-form"
        id="form-book"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="modal__scroll">
          <BookModalSelectField
            id="book-teacher"
            label={t('chat.bookModal.pickTeacher')}
            value={bookTeacher}
            onValueChange={setBookTeacher}
            options={teacherOptions}
            placeholder={t('chat.bookModal.pickTeacher')}
          />
          <FieldTextInput
            id="book-date"
            label={t('chat.bookModal.preferredDate')}
            type="date"
            value={bookDate}
            onChange={setBookDate}
            inputClassName="book-form__date-input"
            isRequired
          />
          <BookModalSelectField
            id="book-slot"
            label={t('chat.bookModal.timeSlot')}
            value={bookSlot}
            onValueChange={setBookSlot}
            options={slotOptions}            
          />
          <FieldTextInput
            id="book-topic"
            label={t('chat.bookModal.topicOptional')}
            value={bookTopic}
            onChange={setBookTopic}
            placeholder={t('chat.bookModal.topicPlaceholder')}
          />
        </div>
        <div className="modal__footer">
          <div className="modal__actions">
            <Button variant="text" type="button" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" pill type="submit">
              {t('chat.bookModal.sendRequest')}
            </Button>
          </div>
        </div>
      </form>
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
  const { modal, closeModal, pushTeacherReport, pushBroadcast, bumpLearningCards, users, submitParentBooking } =
    useBridge();
  const teacherUsers = users.filter((u) => u.role === 'teacher');
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
        <div className="modal__box modal__box--rounded modal__box--book">
          <BookModal
            onClose={onBackdropClose}
            teachers={teacherUsers}
            onSubmit={submitParentBooking}
            onSent={() => setBridgeToast(t('chat.bookModal.success'))}
          />
        </div>
      </div>,
    );
  }

  if (modal.type === 'broadcast') {
    return withToast(
      <div className="modal" id="modal-broadcast" role="dialog" aria-modal="true" aria-labelledby="modal-broadcast-title">
        <div className="modal__backdrop" onClick={onBackdropClose} aria-hidden="true" />
        <div className="modal__box modal__box--rounded modal__box--medium">
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
