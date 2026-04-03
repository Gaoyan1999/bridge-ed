import { cx } from '@/bridge/cx';

interface PanelHeaderProps {
  titleId: string;
  title: string;
  hint?: string;
  hintId?: string;
  className?: string;
  split?: boolean;
  end?: React.ReactNode;
  hidden?: boolean;
}

export function PanelHeader({
  titleId,
  title,
  hint,
  hintId,
  className,
  split,
  end,
  hidden,
}: PanelHeaderProps) {
  return (
    <header className={cx('panel__header', split && 'panel__header--split', className)} hidden={hidden}>
      <div>
        <h2 className="panel__title" id={titleId}>
          {title}
        </h2>
        {hint != null && hintId != null && (
          <p className="panel__hint" id={hintId}>
            {hint}
          </p>
        )}
        {hint != null && hintId == null && <p className="panel__hint">{hint}</p>}
      </div>
      {end}
    </header>
  );
}
