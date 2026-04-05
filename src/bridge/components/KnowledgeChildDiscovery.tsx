import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import type { LearningCardChildKnowledge } from '@/bridge/types';
import { cx } from '@/bridge/cx';

const URL_IN_TEXT = /(https?:\/\/\S+)/g;

function ContentWithLinks({ text }: { text: string }) {
  const parts = text.split(URL_IN_TEXT);
  return (
    <>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="knowledge-child-discovery__link"
          >
            {part}
          </a>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

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
        <ContentWithLinks text={data.content} />
      </div>
    </div>
  );
}
