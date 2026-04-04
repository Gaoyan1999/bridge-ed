import ReactMarkdown from 'react-markdown';
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
};

/**
 * Renders GitHub-flavored Markdown safely (no raw HTML unless you add `rehype-raw`).
 * Styles: `.markdown-content` in `bridge-app.css`.
 */
export function Markdown({ children, className, as: Tag = 'div' }: MarkdownProps) {
  return (
    <Tag className={cx('markdown-content', className)}>
      <ReactMarkdown remarkPlugins={[...REMARK_PLUGINS]}>{children}</ReactMarkdown>
    </Tag>
  );
}
