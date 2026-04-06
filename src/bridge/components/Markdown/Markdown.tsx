import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cx } from '@/bridge/cx';

const REMARK_PLUGINS = [remarkGfm] as const;

export type MarkdownProps = {
  /** Markdown source (GFM: lists, tables, strikethrough, etc.). */
  children: string;
  /** Extra class on the wrapper (base class is always `markdown-content`). */
  className?: string;
  /** Wrapper for semantics / layout. Default `div`. */
  as?: 'div' | 'article' | 'section';
  /** Optional element overrides (e.g. custom links). */
  components?: Components;
};

/**
 * Renders GitHub-flavored Markdown safely (no raw HTML unless you add `rehype-raw`).
 * Styles: `.markdown-content` in `bridge-app.css`.
 */
export function Markdown({ children, className, as: Tag = 'div', components }: MarkdownProps) {
  return (
    <Tag className={cx('markdown-content', className)}>
      <ReactMarkdown remarkPlugins={[...REMARK_PLUGINS]} components={components}>
        {children}
      </ReactMarkdown>
    </Tag>
  );
}
