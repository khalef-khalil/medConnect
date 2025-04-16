'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  isLoading?: boolean;
  fullWidth?: boolean;
}

export default function FormButton({
  children,
  variant = 'primary',
  isLoading = false,
  fullWidth = false,
  ...props
}: ButtonProps) {
  const buttonClasses = {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white',
    secondary: 'bg-secondary-600 hover:bg-secondary-700 text-white',
    outline: 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700',
    danger: 'bg-danger-600 hover:bg-danger-700 text-white',
  };

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      whileHover={{ 
        scale: 1.01,
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' 
      }}
      disabled={isLoading || props.disabled}
      className={`
        ${buttonClasses[variant]} 
        ${fullWidth ? 'w-full' : ''}
        py-3 px-6 rounded-lg font-medium transition-all duration-200
        disabled:opacity-60 disabled:cursor-not-allowed
        flex justify-center items-center
      `}
      onClick={(e) => {
        console.log("Button clicked", props.type);
        // Don't call onClick for submit buttons - let the form handle it
        if (props.onClick && props.type !== 'submit') {
          props.onClick(e);
        }
      }}
      {...props}
    >
      {isLoading ? (
        <>
          <svg 
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            ></circle>
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Processing...
        </>
      ) : (
        children
      )}
    </motion.button>
  );
} 