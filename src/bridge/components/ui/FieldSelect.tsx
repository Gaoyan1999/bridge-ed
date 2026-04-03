import * as Select from '@radix-ui/react-select';
import { ChevronDown } from 'lucide-react';
import { cx } from '@/bridge/cx';

export type FieldSelectOption = { value: string; label: string };

export type FieldSelectProps = {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  /** String array uses the same text for value and label. */
  options: readonly string[] | readonly FieldSelectOption[];
  placeholder?: string;
};

function toOptions(options: FieldSelectProps['options']): FieldSelectOption[] {
  if (options.length === 0) return [];
  const first = options[0];
  if (typeof first === 'string') {
    return (options as string[]).map((v) => ({ value: v, label: v }));
  }
  return options as FieldSelectOption[];
}

export function FieldSelect({ id, label, value, onValueChange, options, placeholder }: FieldSelectProps) {
  const items = toOptions(options);

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <Select.Root value={value} onValueChange={onValueChange}>
        <Select.Trigger id={id} type="button" className={cx('field-select__trigger', 'field__input', 'field__input--pill')}>
          <Select.Value placeholder={placeholder} />
          <Select.Icon className="field-select__icon" aria-hidden>
            <ChevronDown className="field-select__chevron" strokeWidth={2} size={16} aria-hidden />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            className="field-select__content"
            position="popper"
            sideOffset={4}
            collisionPadding={12}
          >
            <Select.Viewport className="field-select__viewport">
              {items.map((o) => (
                <Select.Item key={o.value} value={o.value} className="field-select__item">
                  <Select.ItemText>{o.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}
