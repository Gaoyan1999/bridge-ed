import type { ReactNode } from 'react';
import { cx } from '@/bridge/cx';

export type KnowledgeInboxStatusLabelType = 'info' | 'success' | 'warning';

export function KnowledgeInboxStatusLabel({
  content,
  type,
  title,
  screenReaderPrefix,
  className,
}: {
  content: ReactNode;
  type: KnowledgeInboxStatusLabelType;
  title?: string;
  screenReaderPrefix?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        'knowledge-inbox__label',
        'knowledge-inbox__label--status',
        'knowledge-inbox__label--rect',
        type === 'info' && 'knowledge-inbox__label--type-info',
        type === 'success' && 'knowledge-inbox__label--type-success',
        type === 'warning' && 'knowledge-inbox__label--type-warning',
        className,
      )}
      title={title}
    >
      {screenReaderPrefix != null ? (
        <span className="visually-hidden">{screenReaderPrefix}</span>
      ) : null}
      {content}
    </span>
  );
}
