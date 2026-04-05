import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  LearningCardStudentFeedback,
  LearningCardStudentFinishedType,
} from '@/data/entity/learning-card-backend';
import { Button } from '@/bridge/components/ui/Button';
import { FieldTextArea } from '@/bridge/components/ui/FieldTextArea';

const FINISHED_TYPES: LearningCardStudentFinishedType[] = ['pretty_easy', 'think_get_it', 'challenge'];

export function StudentLearningReflectionModal({
  onClose,
  studentFeedback,
  onSave,
  onMarkIncomplete,
}: {
  onClose: () => void;
  studentFeedback: LearningCardStudentFeedback;
  onSave: (payload: { finishedType: LearningCardStudentFinishedType; feeling: string }) => void;
  onMarkIncomplete: () => void;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const [finishedType, setFinishedType] = useState<LearningCardStudentFinishedType>(
    () => studentFeedback.finishedType ?? 'think_get_it',
  );
  const [feeling, setFeeling] = useState(() => studentFeedback.feeling ?? '');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isFinished = studentFeedback.status === 'finished';

  return (
    <div
      className="modal"
      id="modal-student-learning-reflection"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="modal__backdrop" onClick={onClose} aria-hidden="true" />
      <div className="modal__box modal__box--rounded modal__box--fit">
        <div className="modal__header">
          <h3 id={titleId} className="modal__title">
            {t('knowledge.studentReflectionTitle')}
          </h3>
          <p className="modal__body knowledge-reflection-modal__subtitle">{t('knowledge.studentReflectionSubtitle')}</p>
        </div>
        <div className="modal__scroll knowledge-reflection-modal__body">
          <fieldset className="knowledge-reflection-modal__fieldset">
            <legend className="knowledge-reflection-modal__legend">
              {t('knowledge.studentReflectionDifficulty')}
            </legend>
            <div className="knowledge-reflection-modal__radios" role="radiogroup" aria-label={t('knowledge.studentReflectionDifficulty')}>
              {FINISHED_TYPES.map((ft) => (
                <label key={ft} className="knowledge-reflection-modal__radio">
                  <input
                    type="radio"
                    name="knowledge-student-reflection-difficulty"
                    checked={finishedType === ft}
                    onChange={() => setFinishedType(ft)}
                  />
                  <span>{t(`knowledge.studentFinishedType.${ft}`)}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <FieldTextArea
            id="knowledge-student-reflection-feeling"
            label={t('knowledge.studentReflectionFeelingLabel')}
            value={feeling}
            onChange={setFeeling}
            placeholder={t('knowledge.studentReflectionFeelingPlaceholder')}
            rows={4}
          />
        </div>
        <div className="modal__footer">
          <div className="modal__actions knowledge-reflection-modal__actions">
            {isFinished ? (
              <Button type="button" variant="text" className="btn--sm" onClick={onMarkIncomplete}>
                {t('knowledge.studentReflectionMarkIncomplete')}
              </Button>
            ) : (
              <span className="knowledge-reflection-modal__actions-spacer" aria-hidden />
            )}
            <div className="knowledge-reflection-modal__actions-trailing">
              <Button type="button" variant="secondary" pill className="btn--sm" onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                variant="primary"
                pill
                className="btn--sm"
                onClick={() => onSave({ finishedType, feeling })}
              >
                {t('knowledge.studentReflectionSave')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
