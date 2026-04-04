import type { ThreadMessageAttachment } from '@/bridge/types';
import { cx } from '@/bridge/cx';

export function MessageAttachmentGrid({
  attachments,
  className,
}: {
  attachments?: ThreadMessageAttachment[];
  className?: string;
}) {
  const imgs = attachments?.filter((a) => a.kind === 'image') ?? [];
  if (!imgs.length) return null;
  return (
    <div className={cx('msg__attachments', className)} role="group" aria-label="Images">
      {imgs.map((a, i) => (
        <a
          key={`${a.url.slice(0, 48)}-${i}`}
          href={a.url}
          target="_blank"
          rel="noopener noreferrer"
          className="msg__attachment-link"
        >
          <img src={a.url} alt={a.name || 'Image'} className="msg__attachment-img" loading="lazy" />
        </a>
      ))}
    </div>
  );
}
