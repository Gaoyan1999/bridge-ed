import type { ButtonHTMLAttributes } from 'react';
import { cx } from '@/bridge/cx';

type BtnVariant = 'primary' | 'secondary' | 'text' | 'link';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  pill?: boolean;
  sm?: boolean;
  primaryColor?: boolean;
}

export function Button({
  variant = 'primary',
  pill,
  sm,
  primaryColor,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'btn',
        variant === 'primary' && 'btn--primary',
        variant === 'secondary' && 'btn--secondary',
        variant === 'text' && 'btn--text',
        variant === 'link' && 'btn--link',
        pill && 'btn--pill',
        sm && 'btn--sm',
        primaryColor && 'btn--primary-color',
        className,
      )}
      {...rest}
    />
  );
}
