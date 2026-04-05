import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/bridge/components/ui/Button';
import { FieldTextArea } from '@/bridge/components/ui/FieldTextArea';

export function StudentChallengeFeedbackModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (feeling: string) => void;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const [note, setNote] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = () => {
    const v = note.trim();
    if (!v) {
      setError(true);
      return;
    }
    setError(false);
    onSubmit(v);
  };

  return (
    <div
      className="modal"
      id="modal-student-challenge-feedback"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="modal__backdrop" onClick={onClose} aria-hidden="true" />
      <div className="modal__box modal__box--rounded modal__box--fit">
        <div className="modal__header">
          <h3 id={titleId} className="modal__title">
            {t('knowledge.challengeFeedbackTitle')}
          </h3>
          <p className="modal__body knowledge-challenge-feedback-modal__subtitle">
            {t('knowledge.challengeFeedbackSubtitle')}
          </p>
        </div>
        <div className="modal__scroll knowledge-challenge-feedback-modal__body">
          <FieldTextArea
            id="knowledge-challenge-feedback-note"
            label={t('knowledge.challengeFeedbackLabel')}
            value={note}
            onChange={(v) => {
              setNote(v);
              if (error && v.trim()) setError(false);
            }}
            placeholder={t('knowledge.challengeFeedbackPlaceholder')}
            rows={4}
          />
          {error ? (
            <p className="knowledge-challenge-feedback-modal__error" role="alert">
              {t('knowledge.challengeFeedbackRequired')}
            </p>
          ) : null}
        </div>
        <div className="modal__footer">
          <div className="modal__actions knowledge-challenge-feedback-modal__actions">
            <Button type="button" variant="secondary" pill className="btn--sm" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="button" variant="primary" pill className="btn--sm" onClick={submit}>
              {t('knowledge.challengeFeedbackSubmit')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
