import { useTranslation } from 'react-i18next';
import type { LearningCardChildKnowledge } from '@/bridge/types';
import { cx } from '@/bridge/cx';

export function KnowledgeChildDiscovery({
  data,
  className,
}: {
  data: LearningCardChildKnowledge;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className={cx('knowledge-child-discovery', className)}>
      <img
        className="knowledge-child-discovery__hero"
        src={data.heroImageUrl}
        alt={data.heroImageAlt ?? ''}
        loading="lazy"
        decoding="async"
      />
      <div className="knowledge-child-discovery__source">{t('common.bridgedAi')}</div>
      <div className="knowledge-child-discovery__intro">{data.intro}</div>
      <ol className="knowledge-child-discovery__picks">
        {data.picks.map((pick, i) => (
          <li key={`${pick.url}-${i}`} className="knowledge-child-discovery__pick">
            <div className="knowledge-child-discovery__pick-headline">
              {i + 1}. {pick.headline}
            </div>
            <div className="knowledge-child-discovery__field">
              <span className="knowledge-child-discovery__label">{t('knowledge.childDiscovery.videoTitle')}</span>
              {pick.videoTitle}
            </div>
            <div className="knowledge-child-discovery__field">
              <span className="knowledge-child-discovery__label">{t('knowledge.childDiscovery.link')}</span>
              <a
                href={pick.url}
                target="_blank"
                rel="noopener noreferrer"
                className="knowledge-child-discovery__link"
              >
                {pick.url}
              </a>
            </div>
            <div className="knowledge-child-discovery__field">
              <span className="knowledge-child-discovery__label">{t('knowledge.childDiscovery.reason')}</span>
              {pick.reason}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
