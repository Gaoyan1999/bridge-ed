import { useTranslation } from 'react-i18next';

export function SkipLink() {
  const { t } = useTranslation();
  return (
    <a className="skip-link" href="#main-content">
      {t('skipLink.main')}
    </a>
  );
}
