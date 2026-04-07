import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getDataLayer } from '@/data';
import type { QuizBackend } from '@/data/entity/quiz-backend';
import { Button } from '@/bridge/components/ui/Button';
import { cx } from '@/bridge/cx';

function normalizeWorksheetText(raw: string): string {
  let out = String(raw ?? '');
  out = out.replace(/\\\(/g, '(').replace(/\\\)/g, ')');
  out = out.replace(/\\\[/g, '[').replace(/\\\]/g, ']');
  out = out.replace(/\\\{/g, '{').replace(/\\\}/g, '}');
  out = out.replace(/\\\*/g, '*');
  out = out.replace(/\s+/g, ' ').trim();
  return out;
}

function normalizeQuestionText(raw: string): string {
  let out = normalizeWorksheetText(raw);
  out = out.replace(
    /^\[(multiple_choice|multiple choice|true_false|true false|short_answer|short answer|选择题|判断题|简答题|qcm|vrai_faux|vrai faux|reponse_courte|reponse courte)\]\s*/i,
    '',
  );
  let prev = '';
  while (out !== prev) {
    prev = out;
    out = out
      .replace(/^\s*\d+\s*[.)、:：-]\s*/i, '')
      .replace(/^\s*第\s*\d+\s*题\s*[:：.\-]?\s*/i, '')
      .replace(/^\s*q\s*\d+\s*[:：.\-]?\s*/i, '')
      .trim();
  }
  return out;
}

function quizIsFullyAnswered(q: QuizBackend): boolean {
  if (q.questions.length === 0) return false;
  return q.questions.every((x) => (x.studentAnswer ?? '').trim().length > 0);
}

type Props = {
  studentUserId: string;
  learningCardId: string;
  learningCardsEpoch: number;
  /** After answers are saved: posts `/eval-quiz` and calls `evalQuiz` in background. */
  onSubmittedForEval?: (saved: QuizBackend) => void | Promise<void>;
  /** Align with composer tonight actions (thread busy / no thread). */
  actionDisabled?: boolean;
};

/** Composer action + modal: only renders when at least one worksheet exists for this card. */
export function KnowledgeStudentQuizBlock({
  studentUserId,
  learningCardId,
  learningCardsEpoch,
  onSubmittedForEval,
  actionDisabled,
}: Props) {
  const { t } = useTranslation();
  const sid = studentUserId.trim();
  const cid = learningCardId.trim();

  const [rows, setRows] = useState<QuizBackend[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalQuiz, setModalQuiz] = useState<QuizBackend | null>(null);
  const [draftAnswers, setDraftAnswers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!sid || !cid) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const dl = getDataLayer();
      const list = await dl.quizzes.listForStudentAndLearningCard(sid, cid);
      setRows(list);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [sid, cid]);

  useEffect(() => {
    void load();
  }, [load, learningCardsEpoch]);

  useEffect(() => {
    if (!modalQuiz) {
      setDraftAnswers([]);
      return;
    }
    setDraftAnswers(modalQuiz.questions.map((q) => q.studentAnswer ?? ''));
  }, [modalQuiz]);

  const selected = useMemo(
    () => (modalQuiz ? rows.find((r) => r.id === modalQuiz.id) ?? modalQuiz : null),
    [rows, modalQuiz],
  );

  useEffect(() => {
    if (modalQuiz && !rows.some((r) => r.id === modalQuiz.id)) {
      setModalQuiz(null);
    }
  }, [rows, modalQuiz]);

  const allDraftAnswered =
    selected != null &&
    selected.questions.length > 0 &&
    selected.questions.every((_, i) => (draftAnswers[i] ?? '').trim().length > 0);

  const nextIncomplete = rows.find((q) => !quizIsFullyAnswered(q));

  const onSubmit = async () => {
    if (!selected || !sid || !allDraftAnswered || actionDisabled) return;
    setSaving(true);
    try {
      const dl = getDataLayer();
      const next: QuizBackend = {
        ...selected,
        questions: selected.questions.map((q, i) => ({
          ...q,
          studentAnswer: draftAnswers[i]!.trim(),
        })),
      };
      await dl.quizzes.put(next);
      await load();
      setModalQuiz(null);
      void onSubmittedForEval?.(next);
    } finally {
      setSaving(false);
    }
  };

  const openTakeQuiz = () => {
    const q = nextIncomplete ?? rows[0];
    if (q) setModalQuiz(q);
  };

  if (!sid || !cid || loading || rows.length === 0) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        pill
        sm
        className={cx('btn--sm', 'knowledge-tonight-actions__btn', 'knowledge-student-quiz-take')}
        disabled={Boolean(actionDisabled)}
        onClick={openTakeQuiz}
      >
        {t('knowledge.studentQuizTake')}
      </Button>

      {selected ? (
        <div
          className="modal"
          id="modal-student-quiz"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-student-quiz-title"
        >
          <div className="modal__backdrop" aria-hidden="true" onClick={() => setModalQuiz(null)} />
          <div
            className="modal__box modal__box--rounded modal__box--xlarge"
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              if (e.shiftKey) return;
              const target = e.target as HTMLElement | null;
              if (target?.tagName === 'BUTTON') return;
              if (saving || !allDraftAnswered || Boolean(actionDisabled)) return;
              e.preventDefault();
              void onSubmit();
            }}
          >
            <div className="modal__header">
              <h3 id="modal-student-quiz-title" className="modal__title">
                {t('knowledge.studentQuizModalTitle')}
              </h3>
            </div>
            <div className="modal__scroll">
              <ol className="quiz-panel__questions knowledge-student-quiz-modal__questions">
                {selected.questions.map((q, qi) => (
                  <li key={qi} className="quiz-panel__question">
                    <p className="quiz-panel__qtext">
                      {normalizeQuestionText(q.question)}
                    </p>
                    {(q.questionType ?? 'multiple_choice') === 'short_answer' ? (
                      <div className="quiz-panel__options">
                        <input
                          type="text"
                          className="field__input field__input--pill quiz-panel__short-answer"
                          value={draftAnswers[qi] ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDraftAnswers((prev) => {
                              const next = [...prev];
                              next[qi] = val;
                              return next;
                            });
                          }}
                          placeholder="Type your answer..."
                          aria-label={t('quiz.student.questionAria', { n: qi + 1 })}
                        />
                      </div>
                    ) : (
                      <div
                        className="quiz-panel__options"
                        role="radiogroup"
                        aria-label={t('quiz.student.questionAria', { n: qi + 1 })}
                      >
                        {(((q.questionType ?? 'multiple_choice') === 'true_false' &&
                        (!q.options || q.options.length < 2))
                          ? ['True', 'False']
                          : q.options ?? []
                        ).map((opt) => {
                          const picked = draftAnswers[qi] === opt;
                          const optText = normalizeWorksheetText(opt);
                          return (
                            <label key={opt} className={cx('quiz-panel__opt', picked && 'is-selected')}>
                              <input
                                type="radio"
                                name={`knowledge-quiz-${selected.id}-${qi}`}
                                value={opt}
                                checked={picked}
                                onChange={() => {
                                  setDraftAnswers((prev) => {
                                    const next = [...prev];
                                    next[qi] = opt;
                                    return next;
                                  });
                                }}
                              />
                              <span>{optText}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </div>
            <div className="modal__footer">
              <div className="modal__actions">
                <Button type="button" variant="text" onClick={() => setModalQuiz(null)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  disabled={saving || !allDraftAnswered || Boolean(actionDisabled)}
                  onClick={() => void onSubmit()}
                >
                  {saving ? t('quiz.student.saving') : t('knowledge.studentQuizRequestEval')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
