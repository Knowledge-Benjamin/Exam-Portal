import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, id, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-2">
        {label && (
          <label htmlFor={id} className="text-sm font-semibold text-gray-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`
            w-full h-12 px-4 rounded-xl border bg-white
            text-[15px] text-gray-900 placeholder:text-gray-400
            transition-all duration-200 ease-in-out
            focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:ring-offset-0
            disabled:opacity-50 disabled:bg-gray-50 disabled:cursor-not-allowed
            ${error 
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
              : 'border-gray-200 hover:border-gray-300'
            }
            ${className}
          `}
          {...props}
        />
        {error && <p className="text-sm text-red-500 font-medium mt-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
