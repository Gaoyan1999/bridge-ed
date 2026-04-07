import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cx } from '@/bridge/cx';

export interface LanguageMenuOption {
  code: string;
  label: string;
}

export interface LanguageMenuProps {
  options: LanguageMenuOption[];
  value: string;
  onChange: (code: string) => void;
  collapsed: boolean;
  /** Section heading id for the listbox, e.g. `language-label` */
  listAriaLabelledBy: string;
  /** Short name for the trigger control (e.g. “Select interface language”) */
  triggerAriaLabel: string;
}

export function LanguageMenu({
  options,
  value,
  onChange,
  collapsed,
  listAriaLabelledBy,
  triggerAriaLabel,
}: LanguageMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const triggerId = `${menuId}-trigger`;
  const listboxId = `${menuId}-listbox`;

  const current = options.find((o) => o.code === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="relative w-full min-w-0" ref={rootRef}>
      <button
        type="button"
        id={triggerId}
        className={cx(
          'flex w-full min-w-0 cursor-pointer items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border-light)] bg-[var(--pill-bg)] px-2 py-1.5 text-left text-[0.75rem] font-semibold leading-tight text-[var(--text)] transition-colors hover:bg-[#e8edf3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-blue)] focus-visible:ring-offset-1',
          collapsed && 'justify-center px-1.5 py-1.5 text-[0.65rem]',
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-label={triggerAriaLabel}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        <span className={cx('min-w-0 flex-1 truncate', collapsed ? 'text-center' : 'text-left')}>
          {current?.label ?? value}
        </span>
        <span
          className={cx(
            'inline-flex shrink-0 leading-none transition-transform duration-200 ease-in-out',
            open && 'rotate-180',
            collapsed && 'sr-only',
          )}
          aria-hidden={true}
        >
          <ChevronDown className="block shrink-0 text-[var(--text-muted)] opacity-85" strokeWidth={2} size={14} />
        </span>
      </button>

      <div
        id={listboxId}
        role="listbox"
        tabIndex={-1}
        aria-labelledby={listAriaLabelledBy}
        hidden={!open}
        className={cx(
          'absolute left-0 right-0 bottom-[calc(100%+0.35rem)] top-auto z-[60] m-0 max-h-[min(16rem,70vh)] list-none overflow-y-auto rounded-[var(--radius)] border border-[var(--border-light)] bg-[var(--surface)] p-[0.35rem] shadow-[0_4px_24px_rgba(60,64,67,0.18),0_1px_2px_rgba(60,64,67,0.08)]',
          collapsed && open && 'left-full right-auto ml-[0.35rem] min-w-[10rem]',
        )}
      >
        {options.map((opt) => {
          const active = opt.code === value;
          return (
            <button
              key={opt.code}
              type="button"
              role="option"
              aria-selected={active}
              className={cx(
                'flex w-full cursor-pointer items-center rounded-[var(--radius-sm)] border-none bg-transparent px-[0.65rem] py-[0.5rem] text-left text-[0.8125rem] font-medium text-[var(--text)] hover:bg-[var(--pill-bg)]',
                active && 'bg-[var(--info-banner)] font-semibold text-[var(--link-blue)]',
              )}
              onClick={(e) => {
                e.stopPropagation();
                onChange(opt.code);
                setOpen(false);
              }}
            >
              <span className="truncate">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
