import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Components } from 'react-markdown';
import type { LearningCardChildKnowledge } from '@/bridge/types';
import { cx } from '@/bridge/cx';
import { Markdown } from '@/bridge/components/Markdown';
import { discoveryPlainTextToMarkdown } from '@/bridge/discoveryPlainTextToMarkdown';

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

  const markdownComponents = useMemo<Components>(
    () => ({
      a: ({ href, children, className: linkClass, onClick, ...props }) => (
        <a
          {...props}
          href={href}
          className={cx('knowledge-child-discovery__link', linkClass)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            onClick?.(e);
            if (href && onVideoLinkClick && isVideoUrl(href)) onVideoLinkClick();
          }}
        >
          {children}
        </a>
      ),
    }),
    [onVideoLinkClick],
  );

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
        <Markdown className="knowledge-child-discovery-md" components={markdownComponents}>
          {discoveryPlainTextToMarkdown(data.content)}
        </Markdown>
      </div>
    </div>
  );
}
