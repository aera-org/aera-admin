import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import s from './Input.module.scss';

type InputSize = 'sm' | 'md' | 'lg';

type InputProps = {
  size?: InputSize;
  invalid?: boolean;
  fullWidth?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  wrapperClassName?: string;
} & Omit<ComponentPropsWithoutRef<'input'>, 'size'>;

const sizeClassMap: Record<InputSize, string> = {
  sm: s.sizeSm,
  md: s.sizeMd,
  lg: s.sizeLg,
};

export function Input({
  size = 'md',
  invalid = false,
  fullWidth = false,
  iconLeft,
  iconRight,
  wrapperClassName,
  className,
  disabled,
  autoComplete = 'off',
  ...props
}: InputProps) {
  const wrapperClasses = [
    s.wrapper,
    sizeClassMap[size],
    invalid && s.invalid,
    disabled && s.disabled,
    fullWidth && s.fullWidth,
    wrapperClassName,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClasses}>
      {iconLeft ? <span className={s.icon}>{iconLeft}</span> : null}
      <input
        {...props}
        autoComplete={autoComplete}
        className={[s.input, className].filter(Boolean).join(' ')}
        disabled={disabled}
        aria-invalid={invalid || undefined}
      />
      {iconRight ? <span className={s.icon}>{iconRight}</span> : null}
    </div>
  );
}
