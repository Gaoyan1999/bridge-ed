import type { TextareaHTMLAttributes } from 'react';
import { cx } from '@/bridge/cx';

interface ComposerProps {
  inputId: string;
  className?: string;
  textareaClassName?: string;
  rows?: number;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  actions: React.ReactNode;
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
  };

  return (
    <div className={cx('composer composer--bard', className)}>
      <label htmlFor={inputId} className="visually-hidden">
        {label}
      </label>
      <textarea {...taProps} />
      <div className="composer__actions">{actions}</div>
    </div>
  );
}
