import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { useBridge } from '@/bridge/BridgeContext';
import { panelHintsForRole } from '@/bridge/panelHints';
import { formatLocalYmd } from '@/bridge/moodWeek';
import { MOOD_LEVEL_PLEASANT, moodLevelFromPleasant } from '@/bridge/moodUtils';
import { DEMO_STUDENT_MOOD_PROFILE, PARENT_REPORT, TEACHER_MOOD_ROWS } from '@/bridge/mockData';
import { getDataLayer } from '@/data';
import { buildStudentMoodFromCheckIn, studentMoodStableId } from '@/data/student-mood-mappers';
import { PanelHeader } from '@/bridge/components/ui/PanelHeader';
import { cx } from '@/bridge/cx';

const MOOD_FACE: { level: number; emoji: string }[] = [
  { level: 0, emoji: '😫' },
  { level: 1, emoji: '😕' },
  { level: 2, emoji: '😐' },
  { level: 3, emoji: '🙂' },
  { level: 4, emoji: '😄' },
];

const REASON_TAG_IDS = ['exam_results', 'teacher', 'classmates', 'knowledge', 'efficiency'] as const;

export function MoodPanel({ active }: { active: boolean }) {
  const { t } = useTranslation();
  const { role, currentUser, setModule, bumpStudentMoods } = useBridge();
  const hints = panelHintsForRole(t, role);
  const [moodLevel, setMoodLevel] = useState(2);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(() => new Set());
  const [note, setNote] = useState('');
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const profile = useMemo(
    () =>
      currentUser?.role === 'student'
        ? { studentId: currentUser.id, displayName: currentUser.name }
        : DEMO_STUDENT_MOOD_PROFILE,
    [currentUser],
  );

  useEffect(() => {
    if (role !== 'student' || !active) return;
    let cancelled = false;
    void (async () => {
      try {
        const layer = getDataLayer();
        const localDate = formatLocalYmd(new Date());
        const id = studentMoodStableId(profile.studentId, localDate);
        const existing = await layer.studentMoods.get(id);
        if (cancelled) return;
        if (existing) {
          setMoodLevel(moodLevelFromPleasant(existing.pleasant));
          setSelectedTags(
            new Set((existing.reasonTags ?? []).filter((id) => id !== 'other')),
          );
          setNote(existing.note ?? '');
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role, active, profile.studentId]);

  async function submitStudentMood() {
    setSaving(true);
    try {
      const layer = getDataLayer();
      const localDate = formatLocalYmd(new Date());
      const id = studentMoodStableId(profile.studentId, localDate);
      const existing = await layer.studentMoods.get(id);
      const pleasant = MOOD_LEVEL_PLEASANT[moodLevel] ?? 50;
      const tagsArr = [...selectedTags];
      const built = buildStudentMoodFromCheckIn({
        studentId: profile.studentId,
        pleasant,
        note,
        localDate,
        reasonTags: tagsArr,
      });
      await layer.studentMoods.put({
        ...built,
        createdAt: existing?.createdAt ?? built.createdAt,
      });
      bumpStudentMoods();
      setSuccess(true);
    } catch (e) {
      console.error('[Mood] persist failed', e);
    } finally {
      setSaving(false);
    }
  }

  function toggleTag(id: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSuccess(false);
  }

  return (
    <section
      className={cx('panel', 'panel--mood', active && 'is-visible', role === 'student' && 'panel--student-fill')}
      id="panel-mood"
      data-panel="mood"
      role="region"
      aria-labelledby="panel-mood-title"
      hidden={!active}
    >
      <PanelHeader
        titleId="panel-mood-title"
        title={t('panels.mood')}
        hint={hints.mood}
        hintId="mood-role-hint"
        hidden={role === 'student'}
      />

      <div id="mood-student" className="mood-student-screen" hidden={role !== 'student'}>
        <div className="mood-checkin mood-checkin--blue mood-checkin--page" id="mood-checkin-root">
          <header className="mood-checkin__toolbar">
            <button
              type="button"
              className="mood-checkin__icon-btn"
              id="mood-emotion-back"
              aria-label={t('mood.back')}
              onClick={() => setModule('chat')}
            >
              <span aria-hidden="true">‹</span>
            </button>
            <span className="mood-checkin__toolbar-title">{t('mood.checkin.toolbarTitle')}</span>
            <button
              type="button"
              className="mood-checkin__icon-btn"
              id="mood-emotion-close"
              aria-label={t('mood.close')}
              onClick={() => setModule('chat')}
            >
              <span aria-hidden="true">×</span>
            </button>
          </header>

          <div className="mood-checkin__sheet">
            <div className="mood-checkin__intro">
              <h2 className="mood-checkin__title">{t('mood.checkin.title')}</h2>
              <p className="mood-checkin__subtitle mood-checkin__subtitle-line">{t('mood.checkin.subtitleLine1')}</p>
              <p className="mood-checkin__subtitle mood-checkin__subtitle-line">{t('mood.checkin.subtitleLine2')}</p>
            </div>

            <div className="mood-checkin__spectrum" role="radiogroup" aria-label={t('mood.checkin.pleasantAria')}>
              {MOOD_FACE.map((step) => {
                const selected = moodLevel === step.level;
                const caps = t(`mood.checkin.level${step.level}` as const);
                return (
                  <div key={step.level} className="mood-checkin__step">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={caps}
                      title={caps}
                      className={cx('mood-checkin__face-btn', selected && 'is-selected')}
                      onClick={() => {
                        setMoodLevel(step.level);
                        setSuccess(false);
                      }}
                    >
                      <span className="mood-checkin__face" aria-hidden="true">
                        <span className="mood-checkin__emoji">{step.emoji}</span>
                      </span>
                    </button>
                    <span className="mood-checkin__step-label">{caps}</span>
                  </div>
                );
              })}
            </div>

            <div className="mood-checkin__section">
              <h3 className="mood-checkin__section-title">{t('mood.checkin.whatsOnMind')}</h3>
              <div className="mood-checkin__pills" role="group" aria-label={t('mood.checkin.influencedAria')}>
                {REASON_TAG_IDS.map((id) => {
                  const on = selectedTags.has(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      className={cx('mood-checkin__pill', on && 'is-selected')}
                      aria-pressed={on}
                      onClick={() => toggleTag(id)}
                    >
                      {t(`mood.checkin.reasonTags.${id}` as const)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mood-checkin__section">
              <h3 className="mood-checkin__section-title">{t('mood.checkin.anythingToAdd')}</h3>
              <label className="mood-checkin__note-wrap">
                <span className="visually-hidden">{t('mood.noteOptional')}</span>
                <textarea
                  className="mood-checkin__textarea"
                  id="mood-note"
                  rows={3}
                  maxLength={2000}
                  placeholder={t('mood.checkin.notePlaceholder')}
                  value={note}
                  onChange={(e) => {
                    setNote(e.target.value);
                    setSuccess(false);
                  }}
                />
              </label>
            </div>

            <div className="mood-checkin__actions">
              <button
                type="button"
                className="mood-checkin__submit"
                id="mood-submit"
                disabled={saving || !hydrated}
                onClick={() => void submitStudentMood()}
              >
                {saving ? t('mood.checkin.submitSaving') : t('mood.checkin.submit')}
                {!saving && <ChevronRight className="mood-checkin__submit-icon" strokeWidth={2.5} size={18} aria-hidden />}
              </button>
            </div>

            <p className="mood-checkin__success" id="mood-success" role="status" hidden={!success}>
              {t('mood.savedSuccess')}
            </p>
          </div>
        </div>
      </div>

      <div id="mood-parent" className="mood-block" hidden={role !== 'parent'}>
        <h3 className="mood-block__title dash-card__title--sky">{t('mood.weekAtGlance')}</h3>
        <div className="report-cards" id="parent-mood-report">
          {PARENT_REPORT.map((r) => (
            <div key={r.label} className="report-card">
              <div className="report-card__label">{r.label}</div>
              <div className="report-card__value">{r.value}</div>
              <p className="report-card__note">{r.note}</p>
            </div>
          ))}
        </div>
      </div>

      <div id="mood-teacher" className="mood-block" hidden={role !== 'teacher'}>
        <h3 className="mood-block__title dash-card__title--lavender">{t('mood.classOverview')}</h3>
        <div className="table-wrap">
          <table className="data-table" id="teacher-mood-table">
            <thead>
              <tr>
                <th>{t('mood.colStudent')}</th>
                <th>{t('mood.colDominant')}</th>
                <th>{t('mood.colNote')}</th>
              </tr>
            </thead>
            <tbody>
              {TEACHER_MOOD_ROWS.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, i) => (
                    <td key={`${row[0]}-${i}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
