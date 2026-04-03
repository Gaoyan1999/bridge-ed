import type { InputHTMLAttributes } from 'react';
import { Input, Label, TextField } from 'react-aria-components';
import { cx } from '@/bridge/cx';

export type FieldTextInputProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isRequired?: boolean;
  type?: InputHTMLAttributes<HTMLInputElement>['type'];
  inputClassName?: string;
};

export function FieldTextInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  isRequired,
  type = 'text',
  inputClassName,
}: FieldTextInputProps) {
  return (
    <TextField id={id} value={value} onChange={onChange} isRequired={isRequired} className="field field--rac">
      <Label className="field__label">{label}</Label>
      <Input
        type={type}
        placeholder={placeholder}
        className={cx('field__input', 'field__input--pill', inputClassName)}
      />
    </TextField>
  );
}
