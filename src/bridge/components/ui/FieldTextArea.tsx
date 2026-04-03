import { Label, TextArea, TextField } from 'react-aria-components';
import { cx } from '@/bridge/cx';

export type FieldTextAreaProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isRequired?: boolean;
  rows?: number;
  /** Hide the visible label (still exposed to assistive tech). */
  labelHidden?: boolean;
  inputClassName?: string;
};

export function FieldTextArea({
  id,
  label,
  value,
  onChange,
  placeholder,
  isRequired,
  rows = 3,
  labelHidden,
  inputClassName,
}: FieldTextAreaProps) {
  return (
    <TextField id={id} value={value} onChange={onChange} isRequired={isRequired} className="field field--rac">
      <Label className={cx('field__label', labelHidden && 'sr-only')}>{label}</Label>
      <TextArea
        rows={rows}
        placeholder={placeholder}
        className={cx('field__input', 'field__input--pill', inputClassName)}
      />
    </TextField>
  );
}
