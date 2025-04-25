import React from 'react';

type SpinnerSize = 'small' | 'medium' | 'large';

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  color?: string;
  className?: string;
}

export default function LoadingSpinner({ 
  size = 'medium', 
  color = 'border-primary-600',
  className = ''
}: LoadingSpinnerProps) {
  // Determine size class
  const sizeClasses = {
    small: 'h-4 w-4 border-2',
    medium: 'h-8 w-8 border-2',
    large: 'h-12 w-12 border-4'
  };

  const sizeClass = sizeClasses[size];

  return (
    <div 
      className={`animate-spin rounded-full ${sizeClass} border-t-transparent ${color} ${className}`}
      aria-label="Loading"
    />
  );
} 