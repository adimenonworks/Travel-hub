import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import s from './Button.module.css';

export type ButtonVariant = 'filled' | 'tinted' | 'gray' | 'plain' | 'destructive';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: 'small' | 'regular' | 'large';
  block?: boolean;
  icon?: IconName;
  children?: ReactNode;
};

export function Button({ variant = 'filled', size = 'regular', block, icon, children, className, type = 'button', ...rest }: Props) {
  const cls = [s.button, s[variant], size !== 'regular' && s[size], block && s.block, className].filter(Boolean).join(' ');
  return (
    <button type={type} className={cls} {...rest}>
      {icon && <Icon name={icon} size={size === 'small' ? 18 : 20} />}
      {children}
    </button>
  );
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconName;
  label: string;
  variant?: ButtonVariant;
  size?: 'small' | 'regular';
};

/** Icon-only button. `label` is required so screen readers can announce it. */
export function IconButton({ icon, label, variant = 'plain', size = 'regular', className, type = 'button', ...rest }: IconButtonProps) {
  const cls = [s.button, s.icon, s[variant], size === 'small' && s.small, className].filter(Boolean).join(' ');
  return (
    <button type={type} className={cls} aria-label={label} title={label} {...rest}>
      <Icon name={icon} size={size === 'small' ? 18 : 22} />
    </button>
  );
}
