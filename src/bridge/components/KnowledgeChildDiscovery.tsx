import { useTranslation } from 'react-i18next';
import type { LearningCardChildKnowledge } from '@/bridge/types';
import { cx } from '@/bridge/cx';
import { Markdown } from '@/bridge/components/Markdown';
import { discoveryPlainTextToMarkdown } from '@/bridge/discoveryPlainTextToMarkdown';

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
      <div className="knowledge-child-discovery__content">
        <Markdown className="knowledge-child-discovery-md">{discoveryPlainTextToMarkdown(data.content)}</Markdown>
      </div>
    </div>
  );
}
