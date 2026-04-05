import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import type { LearningCardChildKnowledge } from '@/bridge/types';
import { cx } from '@/bridge/cx';

const URL_IN_TEXT = /(https?:\/\/\S+)/g;

/** Treat common video hosts as “video” taps for student progress (learning). */
function isVideoUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const h = u.hostname.replace(/^www\./, '').toLowerCase();
    return /(?:^|\.)youtube\.com$|^youtu\.be$|^m\.youtube\.com$|(?:^|\.)vimeo\.com$|(?:^|\.)bilibili\.com$|^b23\.tv$/i.test(
      h,
    );
  } catch {
    return false;
  }
}

function ContentWithLinks({
  text,
  onVideoLinkClick,
}: {
  text: string;
  onVideoLinkClick?: () => void;
}) {
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
            onClick={() => {
              if (onVideoLinkClick && isVideoUrl(part)) onVideoLinkClick();
            }}
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
  onVideoLinkClick,
}: {
  data: LearningCardChildKnowledge;
  className?: string;
  /** Student: call when user opens a video link (marks card as in progress). */
  onVideoLinkClick?: () => void;
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
        <ContentWithLinks text={data.content} onVideoLinkClick={onVideoLinkClick} />
      </div>
    </div>
  );
}
