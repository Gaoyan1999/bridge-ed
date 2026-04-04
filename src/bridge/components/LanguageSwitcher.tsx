import { useTranslation } from 'react-i18next';
import { cx } from '@/bridge/cx';

const LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
  { code: 'fr', label: 'Français' },
] as const;

type LanguageSwitcherProps = {
  /** When sidebar is collapsed, hide the visible label. */
  collapsed?: boolean;
};

export function LanguageSwitcher({ collapsed }: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation();
  const lng = i18n.resolvedLanguage?.startsWith('zh')
    ? 'zh'
    : i18n.resolvedLanguage?.startsWith('fr')
      ? 'fr'
      : 'en';

  return (
    <div
      className={cx(
        'flex min-w-0 items-center gap-2 px-2 py-1',
        collapsed && 'justify-center px-1',
      )}
    >
      <label htmlFor="bridge-locale" className="sr-only">
        {t('sidebar.language')}
      </label>
      <span
        className={cx(
          'shrink-0 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]',
          collapsed && 'sr-only',
        )}
        aria-hidden={collapsed}
      >
        {t('sidebar.language')}
      </span>
      <select
        id="bridge-locale"
        className="max-w-full cursor-pointer rounded-[var(--radius-sm)] border border-[var(--border-light)] bg-[var(--surface)] px-2 py-1.5 text-[0.8125rem] font-medium text-[var(--text)]"
        value={lng}
        onChange={(e) => void i18n.changeLanguage(e.target.value)}
      >
        {LOCALES.map((opt) => (
          <option key={opt.code} value={opt.code}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
