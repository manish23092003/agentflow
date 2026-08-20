import React from 'react';
import clsx from 'clsx';
import './ui.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(
          'ui-btn',
          `ui-btn-${variant}`,
          `ui-btn-${size}`,
          className
        )}
        {...props}
      >
        {isLoading && (
          <span className="ui-spinner" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
