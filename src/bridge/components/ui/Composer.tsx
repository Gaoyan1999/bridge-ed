import type { ReactNode, TextareaHTMLAttributes } from 'react';
import { cx } from '@/bridge/cx';

interface ComposerProps {
  inputId: string;
  className?: string;
  textareaClassName?: string;
  rows?: number;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
  enterToSubmit?: boolean;
  /** Shown between the textarea and the action row (e.g. image previews). */
  previewSlot?: ReactNode;
  actions: ReactNode;
  label?: string;
}

export function Composer({
  inputId,
  className,
  textareaClassName,
  rows = 2,
  placeholder,
  value,
  onChange,
  onSubmit,
  enterToSubmit = false,
  previewSlot,
  actions,
  label = 'Message',
}: ComposerProps) {
  const taProps: TextareaHTMLAttributes<HTMLTextAreaElement> = {
    id: inputId,
    className: cx('composer__input', textareaClassName),
    rows,
    placeholder,
    value,
    onChange: (e) => onChange(e.target.value),
    onKeyDown: (e) => {
      if (!enterToSubmit) return;
      if (e.key !== 'Enter') return;
      if (e.shiftKey) return;
      if ((e.nativeEvent as KeyboardEvent).isComposing) return;
      e.preventDefault();
      onSubmit?.();
    },
  };

  return (
    <div className={cx('composer composer--bard', className)}>
      <label htmlFor={inputId} className="visually-hidden">
        {label}
      </label>
      <textarea {...taProps} />
      {previewSlot ? <div className="composer__preview">{previewSlot}</div> : null}
      <div className="composer__actions">{actions}</div>
    </div>
  );
}
