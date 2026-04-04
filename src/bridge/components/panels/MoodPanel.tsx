import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBridge } from '@/bridge/BridgeContext';
import { formatLocalYmd } from '@/bridge/moodWeek';
import { moodSpectrumLabel } from '@/bridge/moodUtils';
import { DEMO_STUDENT_MOOD_PROFILE, PARENT_REPORT, TEACHER_MOOD_ROWS } from '@/bridge/mockData';
import { getDataLayer } from '@/data';
import { buildStudentMoodFromCheckIn, studentMoodStableId } from '@/data/student-mood-mappers';
import { PanelHeader } from '@/bridge/components/ui/PanelHeader';
import { cx } from '@/bridge/cx';

export function MoodPanel({ active }: { active: boolean }) {
  const { t } = useTranslation();
  const { role, currentUser, getHints, setModule, bumpStudentMoods } = useBridge();
  const hints = getHints();
  const [slider, setSlider] = useState(50);
  const [note, setNote] = useState('');
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const pleasant = slider / 100;
  const label = moodSpectrumLabel(slider);

  async function submitStudentMood() {
    setSaving(true);
    try {
      const layer = getDataLayer();
      const profile =
        currentUser?.role === 'student'
          ? { studentId: currentUser.id, displayName: currentUser.name }
          : DEMO_STUDENT_MOOD_PROFILE;
      const localDate = formatLocalYmd(new Date());
      const id = studentMoodStableId(profile.studentId, localDate);
      const existing = await layer.studentMoods.get(id);
      const built = buildStudentMoodFromCheckIn({
        studentId: profile.studentId,
        pleasant: slider,
        note,
        localDate,
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
        <div
          className="emotion-screen"
          id="emotion-screen"
          style={{ ['--pleasant' as string]: String(pleasant) }}
        >
          <header className="emotion-screen__top">
            <button type="button" className="emotion-screen__icon-btn" id="mood-emotion-back" aria-label={t('mood.back')} onClick={() => setModule('chat')}>
              <span aria-hidden="true">‹</span>
            </button>
            <h2 className="emotion-screen__heading">{t('mood.emotion')}</h2>
            <button type="button" className="emotion-screen__icon-btn" id="mood-emotion-close" aria-label={t('mood.close')} onClick={() => setModule('chat')}>
              <span aria-hidden="true">×</span>
            </button>
          </header>

          <p className="emotion-screen__prompt">{t('mood.prompt')}</p>

          <div
            className="emotion-ripple"
            id="emotion-ripple"
            aria-hidden="true"
            style={{ ['--pleasant' as string]: String(pleasant) }}
          >
            <div className="emotion-ripple__glow"></div>
            <div className="emotion-ripple__ring emotion-ripple__ring--1"></div>
            <div className="emotion-ripple__ring emotion-ripple__ring--2"></div>
            <div className="emotion-ripple__ring emotion-ripple__ring--3"></div>
          </div>

          <p className="emotion-screen__label" id="emotion-label">
            {label}
          </p>

          <div className="emotion-slider-wrap">
            <label className="visually-hidden" htmlFor="mood-slider">
              {t('mood.sliderHelp')}
            </label>
            <input
              type="range"
              className="emotion-slider"
              id="mood-slider"
              min={0}
              max={100}
              value={slider}
              step={1}
              aria-valuetext={label}
              onChange={(e) => setSlider(Number(e.target.value))}
            />
            <div className="emotion-slider__ends">
              <span>{t('mood.veryUnpleasant')}</span>
              <span>{t('mood.veryPleasant')}</span>
            </div>
          </div>

          <label className="emotion-screen__note-field">
            <span className="emotion-screen__note-label">{t('mood.noteOptional')}</span>
            <input
              type="text"
              className="emotion-screen__note-input"
              id="mood-note"
              maxLength={200}
              placeholder={t('mood.notePlaceholder')}
              autoComplete="off"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>

          <button
            type="button"
            className="btn emotion-screen__next"
            id="mood-submit"
            disabled={saving}
            onClick={() => void submitStudentMood()}
          >
            {saving ? t('mood.saving') : t('mood.next')}
          </button>
          <p className="emotion-screen__success" id="mood-success" role="status" hidden={!success}>
            {t('mood.savedSuccess')}
          </p>
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
