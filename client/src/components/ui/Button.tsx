import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variantStyles = {
  primary: 'bg-[#2563eb] text-white hover:bg-[#1d4ed8] border border-transparent shadow-sm active:scale-[0.98]',
  secondary: 'bg-[#f1f5f9] text-[#1a2654] border border-[#e2e8f0] hover:bg-[#e2e8f0] shadow-sm active:scale-[0.98]',
  danger: 'bg-[#dc2626] text-white hover:bg-[#b91c1c] border border-transparent shadow-sm active:scale-[0.98]',
  ghost: 'bg-transparent text-[#64748b] hover:text-[#1a3a6b] hover:bg-[#f1f5f9] active:scale-[0.98]',
  outline: 'bg-transparent text-[#2563eb] border border-[#2563eb] hover:bg-[#2563eb]/10 active:scale-[0.98]',
};

const sizeStyles = {
  sm: 'h-9 px-3.5 text-xs',
  md: 'h-11 px-5 text-sm',
  lg: 'h-13 px-7 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'primary',
      size = 'md',
      isLoading,
      disabled,
      children,
      leftIcon,
      rightIcon,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`
          inline-flex items-center justify-center gap-2 
          rounded-xl font-semibold
          transition-all duration-150 cursor-pointer
          focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2
          disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed
          ${variantStyles[variant]} 
          ${sizeStyles[size]} 
          ${className}
        `}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {!isLoading && leftIcon}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
